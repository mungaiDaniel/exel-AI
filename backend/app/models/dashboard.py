import uuid
from datetime import datetime

from sqlalchemy import Boolean, ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import JSONB, Base


class Dashboard(Base):
    __tablename__ = "dashboards"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    workbook_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("workbooks.id", ondelete="CASCADE"), nullable=False, index=True
    )
    user_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    layout: Mapped[list] = mapped_column(JSONB, default=list)
    is_public: Mapped[bool] = mapped_column(Boolean, default=False)
    share_token: Mapped[str] = mapped_column(String(64), nullable=True, unique=True)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    workbook: Mapped["Workbook"] = relationship("Workbook", back_populates="dashboards")
    charts: Mapped[list["Chart"]] = relationship("Chart", back_populates="dashboard", cascade="all, delete-orphan")
