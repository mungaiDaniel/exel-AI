import logging
import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.sheet import Sheet
from app.models.user import User
from app.models.workbook import Workbook
from app.services.ai.anomaly_detector import detect_statistical_anomalies, explain_anomalies

router = APIRouter()
log = logging.getLogger(__name__)


@router.get("/{sheet_id}")
async def get_anomalies(
    sheet_id: uuid.UUID,
    explain: bool = True,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sheet = await db.get(Sheet, sheet_id)
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    wb = await db.get(Workbook, sheet.workbook_id)
    if not wb or wb.user_id != current_user.id:
        raise HTTPException(404, "Sheet not found")

    anomalies = detect_statistical_anomalies(sheet.columns or [], sheet.data or [])
    explanation = ""
    if explain and anomalies:
        try:
            explanation = await explain_anomalies(sheet.name, anomalies)
        except Exception:
            log.warning("Anomaly explanation failed", exc_info=True)
            explanation = f"Found {len(anomalies)} statistical outlier(s). Check values with z-score > 2.5."

    return {
        "sheet_id": str(sheet_id),
        "sheet_name": sheet.name,
        "anomaly_count": len(anomalies),
        "anomalies": anomalies,
        "explanation": explanation,
    }
