from sqlalchemy import JSON
from sqlalchemy.dialects.postgresql import JSONB as PG_JSONB
from sqlalchemy.orm import DeclarativeBase

# JSONB on PostgreSQL, plain JSON elsewhere (lets the test-suite run on SQLite).
JSONB = JSON().with_variant(PG_JSONB(), "postgresql")


class Base(DeclarativeBase):
    pass
