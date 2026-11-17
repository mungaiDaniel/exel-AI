import uuid
from datetime import datetime

from pydantic import BaseModel


class WorkbookOut(BaseModel):
    id: uuid.UUID
    name: str
    file_name: str
    file_size: int
    status: str
    sheet_count: int
    row_count: int
    meta: dict
    created_at: datetime
    updated_at: datetime

    model_config = {"from_attributes": True}


class WorkbookList(BaseModel):
    items: list[WorkbookOut]
    total: int
