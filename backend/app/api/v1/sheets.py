import uuid
from fastapi import APIRouter, Depends, HTTPException, Query, Request
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.sheet import Sheet
from app.schemas.sheet import SheetOut, SheetDataOut

router = APIRouter()


def _to_float(v) -> float | None:
    try:
        return float(v)
    except (TypeError, ValueError):
        return None


async def _get_sheet_for_user(sheet_id: uuid.UUID, user: User, db: AsyncSession) -> Sheet:
    sheet = await db.get(Sheet, sheet_id)
    if not sheet:
        raise HTTPException(404, "Sheet not found")
    from app.models.workbook import Workbook
    wb = await db.get(Workbook, sheet.workbook_id)
    if not wb or wb.user_id != user.id:
        raise HTTPException(404, "Sheet not found")
    return sheet


@router.get("/{sheet_id}", response_model=SheetOut)
async def get_sheet(
    sheet_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _get_sheet_for_user(sheet_id, current_user, db)


@router.get("/{sheet_id}/data", response_model=SheetDataOut)
async def get_sheet_data(
    sheet_id: uuid.UUID,
    page: int = Query(1, ge=1),
    page_size: int = Query(100, ge=1, le=1000),
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    sheet = await _get_sheet_for_user(sheet_id, current_user, db)
    all_data: list = sheet.data or []
    total = len(all_data)
    start = (page - 1) * page_size
    end = start + page_size
    return {
        "sheet_id": sheet.id,
        "data": all_data[start:end],
        "total": total,
        "page": page,
        "page_size": page_size,
        "has_more": end < total,
    }


@router.get("/{sheet_id}/query")
async def query_sheet_data(
    sheet_id: uuid.UUID,
    request: Request,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    """
    APINESS-style filterable data query.

    Reserved params: q, limit, offset, sort_by, sort_dir
    Column filters:
      {col}        exact match (case-insensitive)
      {col}_like   substring match
      {col}_in     comma-separated values (OR)
      {col}_gt/gte/lt/lte  numeric range
    """
    sheet = await _get_sheet_for_user(sheet_id, current_user, db)
    columns = sheet.columns or []
    col_types = {c["name"]: c["type"] for c in columns}

    # Pull reserved params first
    params = dict(request.query_params)
    try:
        limit = min(int(params.pop("limit", 500)), 5000)
        offset = max(int(params.pop("offset", 0)), 0)
    except ValueError:
        limit, offset = 500, 0
    sort_by  = params.pop("sort_by", None)
    sort_dir = params.pop("sort_dir", "asc").lower()
    q        = params.pop("q", "").strip().lower()

    filtered: list[dict] = list(sheet.data or [])

    # Full-text search across all cell values
    if q:
        filtered = [r for r in filtered if any(q in str(v).lower() for v in r.values())]

    # Column-specific filters
    for param, value in params.items():
        if not value:
            continue
        if param.endswith("_like"):
            col = param[:-5]; v = value.lower()
            filtered = [r for r in filtered if v in str(r.get(col, "")).lower()]
        elif param.endswith("_gte"):
            col = param[:-4]
            try:
                f = float(value)
                filtered = [r for r in filtered if (_f := _to_float(r.get(col))) is not None and _f >= f]
            except ValueError: pass
        elif param.endswith("_lte"):
            col = param[:-4]
            try:
                f = float(value)
                filtered = [r for r in filtered if (_f := _to_float(r.get(col))) is not None and _f <= f]
            except ValueError: pass
        elif param.endswith("_gt"):
            col = param[:-3]
            try:
                f = float(value)
                filtered = [r for r in filtered if (_f := _to_float(r.get(col))) is not None and _f > f]
            except ValueError: pass
        elif param.endswith("_lt"):
            col = param[:-3]
            try:
                f = float(value)
                filtered = [r for r in filtered if (_f := _to_float(r.get(col))) is not None and _f < f]
            except ValueError: pass
        elif param.endswith("_in"):
            col = param[:-3]
            vals = {v.strip() for v in value.split(",")}
            filtered = [r for r in filtered if str(r.get(col, "")) in vals]
        else:
            # Exact match (case-insensitive)
            v = value.lower()
            filtered = [r for r in filtered if str(r.get(param, "")).lower() == v]

    # Sort
    if sort_by and sort_by in col_types:
        reverse = sort_dir == "desc"
        is_numeric = col_types[sort_by] in ("number", "currency")
        def _sort_key(r):
            val = r.get(sort_by)
            if is_numeric:
                f = _to_float(val)
                return (0, f if f is not None else float("-inf"))
            return (1, str(val or "").lower())
        try:
            filtered.sort(key=_sort_key, reverse=reverse)
        except Exception:
            pass

    total = len(filtered)
    page_data = filtered[offset : offset + limit]

    return {
        "data": page_data,
        "total": total,
        "limit": limit,
        "offset": offset,
        "has_more": (offset + limit) < total,
        "columns": columns,
        "sheet_name": sheet.name,
    }
