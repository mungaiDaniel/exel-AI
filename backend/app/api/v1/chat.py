import json
import logging
import uuid

import anthropic
from fastapi import APIRouter, Depends, HTTPException, Query, WebSocket, WebSocketDisconnect
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import AsyncSessionLocal, get_db
from app.core.security import decode_token
from app.models.chat_message import ChatMessage
from app.models.sheet import Sheet
from app.models.user import User
from app.models.workbook import Workbook
from app.schemas.chat import ChatHistoryOut, ChatMessageOut, ChatMessageRequest
from app.services.ai.context_builder import AI_SYSTEM_PROMPT, build_workbook_context

router = APIRouter()
log = logging.getLogger(__name__)


# ── Provider-agnostic AI helpers ───────────────────────────────────────────────


async def _ai_stream(system: str, messages: list[dict], ws: WebSocket) -> str:
    """Stream tokens to the WebSocket, return the full reply."""
    full_reply = ""

    if settings.AI_PROVIDER == "groq":
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        all_msgs = [{"role": "system", "content": system}] + messages
        stream = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=all_msgs,
            stream=True,
            max_tokens=1500,
        )
        async for chunk in stream:
            text = chunk.choices[0].delta.content or ""
            if text:
                full_reply += text
                await ws.send_json({"type": "token", "data": text})
    else:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        async with client.messages.stream(
            model=settings.AI_MODEL,
            max_tokens=1500,
            system=system,
            messages=messages,
        ) as stream:
            async for text_chunk in stream.text_stream:
                full_reply += text_chunk
                await ws.send_json({"type": "token", "data": text_chunk})

    return full_reply


async def _ai_call(system: str, messages: list[dict]) -> str:
    """Non-streaming AI call, return the full reply text."""
    if settings.AI_PROVIDER == "groq":
        from groq import AsyncGroq

        client = AsyncGroq(api_key=settings.GROQ_API_KEY)
        all_msgs = [{"role": "system", "content": system}] + messages
        response = await client.chat.completions.create(
            model=settings.GROQ_MODEL,
            messages=all_msgs,
            max_tokens=1500,
        )
        return response.choices[0].message.content or ""
    else:
        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model=settings.AI_MODEL,
            max_tokens=1500,
            system=system,
            messages=messages,
        )
        return response.content[0].text


# ── DB helpers ─────────────────────────────────────────────────────────────────


async def _owned_workbook(workbook_id: uuid.UUID, user_id: uuid.UUID, db: AsyncSession) -> Workbook:
    """Return the workbook if it belongs to ``user_id``; otherwise raise 404."""
    wb = await db.get(Workbook, workbook_id)
    if not wb or wb.user_id != user_id:
        raise HTTPException(404, "Workbook not found")
    return wb


async def _build_context(workbook_id: uuid.UUID | None, db: AsyncSession) -> str:
    """Summarise a workbook's sheets for the LLM. Callers must verify ownership first."""
    if not workbook_id:
        return ""
    result = await db.execute(select(Sheet).where(Sheet.workbook_id == workbook_id).order_by(Sheet.index))
    sheets = result.scalars().all()
    return build_workbook_context(list(sheets)) if sheets else ""


async def _history_messages(workbook_id: uuid.UUID | None, user_id: uuid.UUID, db: AsyncSession) -> list[dict]:
    filters = [ChatMessage.user_id == user_id]
    if workbook_id:
        filters.append(ChatMessage.workbook_id == workbook_id)
    result = await db.execute(select(ChatMessage).where(*filters).order_by(ChatMessage.created_at).limit(30))
    msgs = result.scalars().all()
    return [{"role": m.role, "content": m.content} for m in msgs]


# ── REST endpoint ──────────────────────────────────────────────────────────────


@router.post("/message", response_model=ChatMessageOut)
async def send_message(
    data: ChatMessageRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if data.workbook_id:
        await _owned_workbook(data.workbook_id, current_user.id, db)
    context = await _build_context(data.workbook_id, db)
    history = await _history_messages(data.workbook_id, current_user.id, db)

    system = AI_SYSTEM_PROMPT + ("\n\nDATA CONTEXT:\n" + context if context else "")
    messages = history + [{"role": "user", "content": data.content}]

    try:
        reply_text = await _ai_call(system, messages)
    except Exception:
        log.exception("AI provider call failed")
        raise HTTPException(502, "AI provider is unavailable") from None

    user_msg = ChatMessage(
        user_id=current_user.id,
        workbook_id=data.workbook_id,
        role="user",
        content=data.content,
    )
    ai_msg = ChatMessage(
        user_id=current_user.id,
        workbook_id=data.workbook_id,
        role="assistant",
        content=reply_text,
    )
    db.add_all([user_msg, ai_msg])
    await db.flush()
    await db.refresh(ai_msg)
    return ai_msg


@router.get("/history/{workbook_id}", response_model=ChatHistoryOut)
async def chat_history(
    workbook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(ChatMessage)
        .where(ChatMessage.user_id == current_user.id, ChatMessage.workbook_id == workbook_id)
        .order_by(ChatMessage.created_at)
        .limit(100)
    )
    msgs = result.scalars().all()
    return {"messages": msgs, "workbook_id": workbook_id}


# ── WebSocket streaming endpoint ───────────────────────────────────────────────


@router.websocket("/ws/{workbook_id}")
async def chat_websocket(
    ws: WebSocket,
    workbook_id: str,
    token: str = Query(...),
):
    """
    Protocol:
      Client sends: {"content": "user message text"}
      Server sends: {"type": "token",  "data": "partial text"}
                    {"type": "done",   "data": "full reply"}
                    {"type": "error",  "data": "error message"}
    """
    await ws.accept()

    payload = decode_token(token, expected_type="access")
    if payload is None:
        await ws.send_json({"type": "error", "data": "Unauthorized"})
        await ws.close(code=1008)
        return

    try:
        user_uuid = uuid.UUID(payload["sub"])
        wb_uuid = uuid.UUID(workbook_id)
    except ValueError:
        await ws.send_json({"type": "error", "data": "Invalid identifier"})
        await ws.close(code=1008)
        return
    user_id = str(user_uuid)

    async with AsyncSessionLocal() as db:
        wb = await db.get(Workbook, wb_uuid)
        if not wb or wb.user_id != user_uuid:
            await ws.send_json({"type": "error", "data": "Workbook not found"})
            await ws.close(code=1008)
            return

    try:
        while True:
            raw = await ws.receive_text()
            try:
                user_text = str(json.loads(raw).get("content", "")).strip()
            except (ValueError, AttributeError):
                await ws.send_json({"type": "error", "data": "Malformed message"})
                continue
            if not user_text:
                continue

            # Per-message error handling so one failure doesn't kill the session
            try:
                async with AsyncSessionLocal() as db:
                    context = await _build_context(wb_uuid, db)
                    history = await _history_messages(wb_uuid, uuid.UUID(user_id), db)

                    db.add(
                        ChatMessage(
                            user_id=uuid.UUID(user_id),
                            workbook_id=wb_uuid,
                            role="user",
                            content=user_text,
                        )
                    )
                    await db.commit()

                system = AI_SYSTEM_PROMPT + ("\n\nDATA CONTEXT:\n" + context if context else "")
                messages = history + [{"role": "user", "content": user_text}]

                full_reply = await _ai_stream(system, messages, ws)
                await ws.send_json({"type": "done", "data": full_reply})

                if full_reply:
                    async with AsyncSessionLocal() as db:
                        db.add(
                            ChatMessage(
                                user_id=uuid.UUID(user_id),
                                workbook_id=wb_uuid,
                                role="assistant",
                                content=full_reply,
                            )
                        )
                        await db.commit()

            except Exception:
                log.exception("WS chat error")
                await ws.send_json({"type": "error", "data": "Something went wrong generating a reply."})

    except WebSocketDisconnect:
        pass
    except Exception:
        log.exception("WS session crashed")
