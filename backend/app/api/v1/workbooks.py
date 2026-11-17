import logging
import re
import uuid

from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.config import settings
from app.core.database import get_db
from app.models.sheet import Sheet
from app.models.user import User
from app.models.workbook import Workbook
from app.schemas.sheet import SheetOut
from app.schemas.workbook import WorkbookList, WorkbookOut
from app.services.ai.claude_service import ClaudeService
from app.services.excel.parser import ExcelParser
from app.services.storage_service import StorageService

router = APIRouter()
log = logging.getLogger(__name__)

ALLOWED_EXTENSIONS = {".xlsx", ".xls", ".xlsm", ".csv"}
MAX_FILE_SIZE = 50 * 1024 * 1024  # 50 MB


@router.get("", response_model=WorkbookList)
async def list_workbooks(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Workbook).where(Workbook.user_id == current_user.id).order_by(Workbook.created_at.desc())
    )
    items = result.scalars().all()
    return {"items": items, "total": len(items)}


@router.post("/upload", response_model=WorkbookOut, status_code=201)
async def upload_workbook(
    file: UploadFile = File(...),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ext = "." + (file.filename or "").rsplit(".", 1)[-1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(400, f"File type {ext} not supported. Use .xlsx, .xls, .xlsm or .csv")

    content = await file.read()
    if len(content) > MAX_FILE_SIZE:
        raise HTTPException(413, "File too large (max 50 MB)")

    # Store file in MinIO
    storage = StorageService()
    object_name = f"workbooks/{current_user.id}/{uuid.uuid4()}{ext}"
    file_url = storage.upload(object_name, content, file.content_type or "application/octet-stream")

    # Parse workbook
    parser = ExcelParser()
    parsed = parser.parse_workbook(content, file.filename or "upload")

    workbook = Workbook(
        user_id=current_user.id,
        name=re.sub(r"\.[^.]+$", "", file.filename or "Workbook"),
        file_name=file.filename or "upload",
        file_size=len(content),
        file_url=file_url,
        status="ready",
        sheet_count=parsed["sheet_count"],
        row_count=parsed["total_rows"],
        meta={"object_name": object_name},
    )
    db.add(workbook)
    await db.flush()

    # Persist sheets
    for sheet_data in parsed["sheets"]:
        sheet = Sheet(
            workbook_id=workbook.id,
            name=sheet_data["name"],
            index=sheet_data["index"],
            row_count=sheet_data["row_count"],
            col_count=sheet_data["col_count"],
            columns=sheet_data["columns"],
            data=sheet_data["data"],
        )
        db.add(sheet)

    await db.flush()

    # Auto-generate insights for the first sheet (non-blocking best-effort)
    if parsed["sheets"] and settings.ANTHROPIC_API_KEY:
        try:
            ai = ClaudeService()
            first_sheet = parsed["sheets"][0]
            insights = await ai.generate_insights(first_sheet)
            workbook.meta = {**workbook.meta, "insights": insights}
            await db.flush()
        except Exception:
            log.warning("Insight generation failed; continuing without insights", exc_info=True)

    await db.refresh(workbook)
    return workbook


@router.get("/{workbook_id}", response_model=WorkbookOut)
async def get_workbook(
    workbook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wb = await db.get(Workbook, workbook_id)
    if not wb or wb.user_id != current_user.id:
        raise HTTPException(404, "Workbook not found")
    return wb


@router.delete("/{workbook_id}", status_code=204)
async def delete_workbook(
    workbook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wb = await db.get(Workbook, workbook_id)
    if not wb or wb.user_id != current_user.id:
        raise HTTPException(404, "Workbook not found")
    storage = StorageService()
    storage.delete(wb.meta.get("object_name", ""))
    await db.delete(wb)


@router.get("/{workbook_id}/sheets", response_model=list[SheetOut])
async def list_sheets(
    workbook_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wb = await db.get(Workbook, workbook_id)
    if not wb or wb.user_id != current_user.id:
        raise HTTPException(404, "Workbook not found")
    result = await db.execute(select(Sheet).where(Sheet.workbook_id == workbook_id).order_by(Sheet.index))
    return result.scalars().all()
