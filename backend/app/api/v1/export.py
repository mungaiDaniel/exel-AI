import re
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.models.sheet import Sheet
from app.models.user import User
from app.models.workbook import Workbook
from app.services.export.csv_exporter import export_to_csv
from app.services.export.pdf_exporter import export_sheet_pdf

router = APIRouter()


def _safe_filename(name: str, ext: str) -> str:
    """Strip anything that could break out of the Content-Disposition header."""
    stem = re.sub(r"[^\w.\- ]", "_", name).strip() or "sheet"
    return f"{stem}.{ext}"


async def _get_sheet(sheet_id: uuid.UUID, user: User, db: AsyncSession) -> Sheet:
    sheet = await db.get(Sheet, sheet_id)
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    wb = await db.get(Workbook, sheet.workbook_id)
    if not wb or wb.user_id != user.id:
        raise HTTPException(404, "Sheet not found")
    return sheet


@router.post("/csv/{sheet_id}")
async def export_csv(
    sheet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sheet = await _get_sheet(sheet_id, current_user, db)
    csv_bytes = export_to_csv(sheet.columns or [], sheet.data or [])
    filename = _safe_filename(sheet.name, "csv")
    return Response(
        content=csv_bytes,
        media_type="text/csv",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )


@router.post("/pdf/{sheet_id}")
async def export_pdf(
    sheet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sheet = await _get_sheet(sheet_id, current_user, db)
    pdf_bytes = export_sheet_pdf(
        sheet_name=sheet.name,
        columns=sheet.columns or [],
        data=sheet.data or [],
    )
    filename = _safe_filename(sheet.name, "pdf")
    return Response(
        content=pdf_bytes,
        media_type="application/pdf",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
