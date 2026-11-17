import uuid

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.exceptions import AppError, UnauthorizedError
from app.core.security import create_access_token, create_refresh_token, hash_password, verify_password
from app.models.user import User
from app.schemas.user import UserCreate


class AuthService:
    def __init__(self, db: AsyncSession):
        self.db = db

    async def register(self, data: UserCreate) -> dict:
        existing = await self.db.scalar(select(User).where(User.email == data.email.lower()))
        if existing:
            raise AppError("Email already registered", status_code=409)
        user = User(
            email=data.email.lower(),
            name=data.name,
            password=hash_password(data.password),
        )
        self.db.add(user)
        await self.db.flush()
        await self.db.refresh(user)
        return self.tokens_for(user)

    async def login(self, email: str, password: str) -> dict:
        user = await self.db.scalar(select(User).where(User.email == email.lower()))
        if not user or not user.password or not verify_password(password, user.password):
            raise UnauthorizedError("Invalid credentials")
        if not user.is_active:
            raise UnauthorizedError("Account is disabled")
        return self.tokens_for(user)

    async def get_by_id(self, user_id: uuid.UUID) -> User | None:
        return await self.db.get(User, user_id)

    @staticmethod
    def tokens_for(user: User) -> dict:
        return {
            "access_token": create_access_token(str(user.id)),
            "refresh_token": create_refresh_token(str(user.id)),
            "user": user,
        }
