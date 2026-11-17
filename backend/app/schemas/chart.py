import uuid
from datetime import datetime
from pydantic import BaseModel


class ChartSuggestRequest(BaseModel):
    sheet_id: uuid.UUID
    x_column: str | None = None
    y_column: str | None = None


class ChartSuggestion(BaseModel):
    chart_type: str
    x: str
    y: str
    title: str
    reasoning: str
    transform: str | None = None
    column: str | None = None


class ChartCreate(BaseModel):
    dashboard_id: uuid.UUID
    sheet_id: uuid.UUID | None = None
    title: str | None = None
    chart_type: str
    config: dict
    position: dict = {}


class ChartOut(BaseModel):
    id: uuid.UUID
    dashboard_id: uuid.UUID
    sheet_id: uuid.UUID | None
    title: str | None
    chart_type: str
    config: dict
    position: dict
    created_at: datetime

    model_config = {"from_attributes": True}
