import uuid
from datetime import datetime
from pydantic import BaseModel


class FormulaEvaluateRequest(BaseModel):
    expression: str
    sheet_id: uuid.UUID | None = None
    context: dict = {}


class FormulaResult(BaseModel):
    expression: str
    success: bool
    result: str | float | int | bool | None = None
    error: str | None = None
    type: str | None = None


class FormulaExplainRequest(BaseModel):
    expression: str


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
