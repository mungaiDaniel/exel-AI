import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class DashboardCreate(BaseModel):
    workbook_id: uuid.UUID
    name: str = Field(min_length=1, max_length=255)
    layout: list = Field(default_factory=list)


class DashboardUpdate(BaseModel):
    name: str | None = Field(default=None, min_length=1, max_length=255)
    layout: list | None = None
    is_public: bool | None = None


class DashboardOut(BaseModel):
    id: uuid.UUID
    workbook_id: uuid.UUID
    user_id: uuid.UUID
    name: str
    layout: list
    is_public: bool
    share_token: str | None
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}
