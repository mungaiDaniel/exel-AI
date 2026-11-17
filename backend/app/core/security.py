"""Password hashing and JWT helpers.

Access and refresh tokens are signed JWTs carrying a ``type`` claim so a refresh
token can never be used as an access token (and vice versa).
"""

import uuid
from datetime import UTC, datetime, timedelta
from typing import Any, Literal

import bcrypt
import jwt

from app.core.config import settings

TokenType = Literal["access", "refresh"]

# bcrypt only looks at the first 72 bytes of input.
_BCRYPT_MAX_BYTES = 72


def hash_password(password: str) -> str:
    return bcrypt.hashpw(password.encode()[:_BCRYPT_MAX_BYTES], bcrypt.gensalt()).decode()


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode()[:_BCRYPT_MAX_BYTES], hashed.encode())
    except ValueError:
        return False


def _create_token(subject: str | Any, token_type: TokenType, expires_delta: timedelta) -> str:
    now = datetime.now(UTC)
    payload = {
        "sub": str(subject),
        "type": token_type,
        "iat": now,
        "exp": now + expires_delta,
        "jti": uuid.uuid4().hex,
    }
    return jwt.encode(payload, settings.JWT_SECRET_KEY, algorithm=settings.JWT_ALGORITHM)


def create_access_token(subject: str | Any, expires_delta: timedelta | None = None) -> str:
    return _create_token(subject, "access", expires_delta or timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES))


def create_refresh_token(subject: str | Any) -> str:
    return _create_token(subject, "refresh", timedelta(days=settings.REFRESH_TOKEN_EXPIRE_DAYS))


def decode_token(token: str, expected_type: TokenType | None = None) -> dict | None:
    """Return the verified payload, or ``None`` if the token is invalid, expired,
    or not of ``expected_type``."""
    try:
        payload = jwt.decode(
            token,
            settings.JWT_SECRET_KEY,
            algorithms=[settings.JWT_ALGORITHM],
            options={"require": ["exp", "sub", "type"]},
        )
    except jwt.PyJWTError:
        return None
    if expected_type and payload.get("type") != expected_type:
        return None
    return payload
