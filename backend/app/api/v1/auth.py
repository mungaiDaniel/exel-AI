import uuid

from fastapi import APIRouter, Depends
from sqlalchemy.ext.asyncio import AsyncSession

from app.api.deps import get_current_user
from app.core.database import get_db
from app.core.exceptions import UnauthorizedError
from app.core.security import decode_token
from app.models.user import User
from app.schemas.user import TokenOut, TokenRefresh, UserCreate, UserLogin, UserOut
from app.services.auth_service import AuthService

router = APIRouter()


@router.post("/register", response_model=TokenOut, status_code=201)
async def register(data: UserCreate, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.register(data)
    return result


@router.post("/login", response_model=TokenOut)
async def login(data: UserLogin, db: AsyncSession = Depends(get_db)):
    svc = AuthService(db)
    result = await svc.login(data.email, data.password)
    return result


@router.post("/refresh", response_model=TokenOut)
async def refresh(data: TokenRefresh, db: AsyncSession = Depends(get_db)):
    """Exchange a valid refresh token for a new access/refresh pair."""
    payload = decode_token(data.refresh_token, expected_type="refresh")
    if payload is None:
        raise UnauthorizedError("Invalid refresh token")
    try:
        user = await AuthService(db).get_by_id(uuid.UUID(payload["sub"]))
    except ValueError:
        raise UnauthorizedError("Invalid refresh token") from None
    if not user or not user.is_active:
        raise UnauthorizedError("User not found or inactive")
    return AuthService.tokens_for(user)


@router.get("/me", response_model=UserOut)
async def me(current_user: User = Depends(get_current_user)):
    return current_user
