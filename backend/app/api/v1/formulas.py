import uuid
from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.formula import Formula
from app.schemas.formula import (
    FormulaEvaluateRequest, FormulaResult,
    FormulaExplainRequest, FormulaExplainResult,
    FormulaOut,
)
from app.services.excel.formula_engine import FormulaEngine
from app.services.ai.claude_service import ClaudeService

router = APIRouter()


@router.post("/evaluate", response_model=FormulaResult)
async def evaluate_formula(
    data: FormulaEvaluateRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    engine = FormulaEngine()
    result = engine.evaluate(data.expression, data.context)
    formula = Formula(
        user_id=current_user.id,
        sheet_id=data.sheet_id,
        expression=data.expression,
        result=result,
    )
    db.add(formula)
    return {
        "expression": data.expression,
        "success": result["success"],
        "result": result.get("result"),
        "error": result.get("error"),
        "type": result.get("type"),
    }


@router.post("/explain", response_model=FormulaExplainResult)
async def explain_formula(
    data: FormulaExplainRequest,
    current_user: User = Depends(get_current_user),
):
    svc = ClaudeService()
    explanation = await svc.explain_formula(data.expression)
    return {"expression": data.expression, "explanation": explanation}


@router.get("/history", response_model=list[FormulaOut])
async def formula_history(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Formula)
        .where(Formula.user_id == current_user.id)
        .order_by(Formula.created_at.desc())
        .limit(50)
    )
    return result.scalars().all()
