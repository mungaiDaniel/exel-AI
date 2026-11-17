import uuid
from datetime import datetime

from sqlalchemy import ForeignKey, String, func
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import JSONB, Base


class Chart(Base):
    __tablename__ = "charts"

    id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    dashboard_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("dashboards.id", ondelete="CASCADE"), nullable=False, index=True
    )
    sheet_id: Mapped[uuid.UUID] = mapped_column(UUID(as_uuid=True), ForeignKey("sheets.id"), nullable=True)
    title: Mapped[str] = mapped_column(String(255), nullable=True)
    chart_type: Mapped[str] = mapped_column(String(50), nullable=False)
    config: Mapped[dict] = mapped_column(JSONB, nullable=False)
    position: Mapped[dict] = mapped_column(JSONB, default=dict)
    created_at: Mapped[datetime] = mapped_column(server_default=func.now())
    updated_at: Mapped[datetime] = mapped_column(server_default=func.now(), onupdate=func.now())

    dashboard: Mapped["Dashboard"] = relationship("Dashboard", back_populates="charts")
    sheet: Mapped["Sheet"] = relationship("Sheet", back_populates="charts")
