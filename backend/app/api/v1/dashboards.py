import uuid
import secrets
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import select

from app.core.database import get_db
from app.api.deps import get_current_user
from app.models.user import User
from app.models.dashboard import Dashboard
from app.models.workbook import Workbook
from app.schemas.dashboard import DashboardCreate, DashboardUpdate, DashboardOut

router = APIRouter()


async def _own_dashboard(dashboard_id: uuid.UUID, user: User, db: AsyncSession) -> Dashboard:
    d = await db.get(Dashboard, dashboard_id)
    if not d or d.user_id != user.id:
        raise HTTPException(404, "Dashboard not found")
    return d


@router.get("", response_model=list[DashboardOut])
async def list_dashboards(
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    result = await db.execute(
        select(Dashboard)
        .where(Dashboard.user_id == current_user.id)
        .order_by(Dashboard.updated_at.desc())
    )
    return result.scalars().all()


@router.post("", response_model=DashboardOut, status_code=201)
async def create_dashboard(
    data: DashboardCreate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    wb = await db.get(Workbook, data.workbook_id)
    if not wb or wb.user_id != current_user.id:
        raise HTTPException(404, "Workbook not found")
    d = Dashboard(
        workbook_id=data.workbook_id,
        user_id=current_user.id,
        name=data.name,
        layout=data.layout,
    )
    db.add(d)
    await db.flush()
    await db.refresh(d)
    return d


@router.get("/{dashboard_id}", response_model=DashboardOut)
async def get_dashboard(
    dashboard_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return await _own_dashboard(dashboard_id, current_user, db)


@router.put("/{dashboard_id}", response_model=DashboardOut)
async def update_dashboard(
    dashboard_id: uuid.UUID,
    data: DashboardUpdate,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = await _own_dashboard(dashboard_id, current_user, db)
    if data.name is not None:      d.name = data.name
    if data.layout is not None:    d.layout = data.layout
    if data.is_public is not None: d.is_public = data.is_public
    await db.flush()
    await db.refresh(d)
    return d


@router.delete("/{dashboard_id}", status_code=204)
async def delete_dashboard(
    dashboard_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = await _own_dashboard(dashboard_id, current_user, db)
    await db.delete(d)


@router.post("/{dashboard_id}/share", response_model=dict)
async def share_dashboard(
    dashboard_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = await _own_dashboard(dashboard_id, current_user, db)
    if not d.share_token:
        d.share_token = secrets.token_urlsafe(32)
        d.is_public = True
        await db.flush()
    return {"share_token": d.share_token, "url": f"/shared/{d.share_token}"}


@router.delete("/{dashboard_id}/share", status_code=204)
async def unshare_dashboard(
    dashboard_id: uuid.UUID,
    db: AsyncSession = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    d = await _own_dashboard(dashboard_id, current_user, db)
    d.share_token = None
    d.is_public = False


# Public endpoint — no auth required
@router.get("/shared/{token}", response_model=DashboardOut)
async def get_shared_dashboard(
    token: str,
    db: AsyncSession = Depends(get_db),
):
    result = await db.execute(
        select(Dashboard).where(Dashboard.share_token == token, Dashboard.is_public == True)
    )
    d = result.scalar_one_or_none()
    if not d:
        raise HTTPException(404, "Shared dashboard not found or access revoked")
    return d
