from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select, or_, cast, String

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.workbook import Workbook
from app.models.sheet import Sheet

router = APIRouter()


@router.get("")
async def search(
    q: str = Query(..., min_length=1),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    Full-text search across workbook names, sheet names, column names, and data rows.
    Returns matched workbooks, sheets, and sample data rows with context.
    """
    term = q.strip().lower()

    # ── Workbooks by name ────────────────────────────────────────────────────
    wb_result = await db.execute(
        select(Workbook).where(
            Workbook.user_id == current_user.id,
            Workbook.name.ilike(f"%{term}%"),
        ).limit(5)
    )
    workbooks = wb_result.scalars().all()

    # ── Sheets by name or column names ───────────────────────────────────────
    sh_result = await db.execute(
        select(Sheet)
        .join(Workbook, Sheet.workbook_id == Workbook.id)
        .where(
            Workbook.user_id == current_user.id,
            or_(
                Sheet.name.ilike(f"%{term}%"),
                cast(Sheet.columns, String).ilike(f"%{term}%"),
            ),
        ).limit(10)
    )
    meta_sheets = sh_result.scalars().all()
    meta_sheet_ids = {str(s.id) for s in meta_sheets}

    # ── Sheets whose data rows contain the term (Postgres JSON cast) ─────────
    data_sh_result = await db.execute(
        select(Sheet)
        .join(Workbook, Sheet.workbook_id == Workbook.id)
        .where(
            Workbook.user_id == current_user.id,
            cast(Sheet.data, String).ilike(f"%{term}%"),
        ).limit(8)
    )
    data_sheets = [s for s in data_sh_result.scalars().all() if str(s.id) not in meta_sheet_ids]

    # Build data row hits: first 3 matching rows per sheet + matching cell snippet
    data_hits = []
    for sheet in data_sheets:
        matching_rows = []
        for row in (sheet.data or []):
            if any(term in str(v).lower() for v in row.values()):
                # Return only the columns that actually contain the term
                snippet = {k: v for k, v in row.items() if term in str(v).lower()}
                matching_rows.append(snippet)
                if len(matching_rows) >= 3:
                    break
        if matching_rows:
            data_hits.append({
                "sheet_id": str(sheet.id),
                "sheet_name": sheet.name,
                "workbook_id": str(sheet.workbook_id),
                "match_count": sum(
                    1 for r in (sheet.data or [])
                    if any(term in str(v).lower() for v in r.values())
                ),
                "sample_rows": matching_rows,
            })

    return {
        "query": q,
        "workbooks": [
            {
                "id": str(wb.id),
                "name": wb.name,
                "file_name": wb.file_name,
                "sheet_count": wb.sheet_count,
                "row_count": wb.row_count,
                "match": "name",
            }
            for wb in workbooks
        ],
        "sheets": [
            {
                "id": str(s.id),
                "workbook_id": str(s.workbook_id),
                "name": s.name,
                "row_count": s.row_count,
                "matching_columns": [
                    c["name"] for c in (s.columns or [])
                    if term in c["name"].lower()
                ],
                "match": "sheet" if term in s.name.lower() else "column",
            }
            for s in meta_sheets
        ],
        "data_hits": data_hits,
        "total": len(workbooks) + len(meta_sheets) + len(data_hits),
    }
