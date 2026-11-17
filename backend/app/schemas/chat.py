import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class ChatMessageRequest(BaseModel):
    content: str = Field(min_length=1, max_length=8000)
    workbook_id: uuid.UUID | None = None


class ChatMessageOut(BaseModel):
    id: uuid.UUID
    role: str
    content: str
    metadata_: dict = {}
    created_at: datetime

    model_config = {"from_attributes": True}


class ChatHistoryOut(BaseModel):
    messages: list[ChatMessageOut]
    workbook_id: uuid.UUID | None
