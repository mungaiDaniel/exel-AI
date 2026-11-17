import uuid

from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.security import decode_token
from app.models.user import User

bearer_scheme = HTTPBearer(auto_error=False)

_UNAUTHORIZED = HTTPException(
    status_code=status.HTTP_401_UNAUTHORIZED,
    detail="Invalid or expired token",
    headers={"WWW-Authenticate": "Bearer"},
)


async def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    db: AsyncSession = Depends(get_db),
) -> User:
    """Resolve the authenticated user from a Bearer access token (401 otherwise)."""
    if credentials is None:
        raise _UNAUTHORIZED
    payload = decode_token(credentials.credentials, expected_type="access")
    if payload is None:
        raise _UNAUTHORIZED
    try:
        user_id = uuid.UUID(payload["sub"])
    except ValueError:
        raise _UNAUTHORIZED from None
    user = await db.get(User, user_id)
    if not user or not user.is_active:
        raise _UNAUTHORIZED
    return user
