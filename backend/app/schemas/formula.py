import uuid
from datetime import datetime

from pydantic import BaseModel, Field


class FormulaEvaluateRequest(BaseModel):
    expression: str = Field(min_length=1, max_length=2000)
    sheet_id: uuid.UUID | None = None
    context: dict = Field(default_factory=dict)


class FormulaResult(BaseModel):
    expression: str
    success: bool
    result: str | float | int | bool | None = None
    error: str | None = None
    type: str | None = None


class FormulaExplainRequest(BaseModel):
    expression: str = Field(min_length=1, max_length=2000)


class FormulaExplainResult(BaseModel):
    expression: str
    explanation: str


class FormulaOut(BaseModel):
    id: uuid.UUID
    expression: str
    result: dict | None
    explanation: str | None
    created_at: datetime

    model_config = {"from_attributes": True}
