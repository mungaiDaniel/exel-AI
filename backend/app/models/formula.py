import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, Text, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import JSONB, Base


class Formula(Base):
    __tablename__ = "formulas"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False, index=True)
    sheet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sheets.id"), nullable=True)
    expression: Mapped[str] = mapped_column(Text, nullable=False)
    result: Mapped[dict] = mapped_column(JSONB, nullable=True)
    explanation: Mapped[str] = mapped_column(Text, nullable=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())

    user: Mapped["User"] = relationship("User", back_populates="formulas")
    sheet: Mapped["Sheet"] = relationship("Sheet", back_populates="formulas")
