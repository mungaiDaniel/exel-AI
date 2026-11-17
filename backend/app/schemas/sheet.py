import uuid
from datetime import datetime

from pydantic import BaseModel


class ColumnInfo(BaseModel):
    name: str
    type: str
    nullable: bool
    unique_count: int
    sample_values: list


class SheetOut(BaseModel):
    id: uuid.UUID
    workbook_id: uuid.UUID
    name: str
    index: int
    row_count: int
    col_count: int
    columns: list[ColumnInfo]
    summary: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


class SheetDataOut(BaseModel):
    sheet_id: uuid.UUID
    data: list[dict]
    total: int
    page: int
    page_size: int
    has_more: bool
