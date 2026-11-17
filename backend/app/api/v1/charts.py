from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.sheet import Sheet
from app.models.user import User
from app.models.workbook import Workbook
from app.schemas.chart import ChartSuggestion, ChartSuggestRequest
from app.services.excel.chart_advisor import ChartAdvisor

router = APIRouter()


@router.post("/suggest", response_model=list[ChartSuggestion])
async def suggest_charts(
    data: ChartSuggestRequest,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sheet = await db.get(Sheet, data.sheet_id)
    workbook = await db.get(Workbook, sheet.workbook_id) if sheet else None
    if not sheet or not workbook or workbook.user_id != current_user.id:
        raise HTTPException(404, "Sheet not found")
    advisor = ChartAdvisor()
    suggestions = advisor.suggest(sheet.columns or [])
    return suggestions
