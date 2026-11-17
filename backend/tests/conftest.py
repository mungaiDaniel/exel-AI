"""Shared fixtures.

The suite runs against an in-memory SQLite database (JSONB falls back to JSON) and a
temporary local upload directory, so it needs no Postgres, Redis or MinIO.
"""

import io
import os
import tempfile

# Must be set before ``app`` is imported: settings are read at import time.
_UPLOAD_DIR = tempfile.mkdtemp(prefix="excelai-test-uploads-")
os.environ.update(
    {
        "DEBUG": "false",
        "JWT_SECRET_KEY": "test-only-secret-key-with-more-than-32-characters!",
        "ASYNC_DATABASE_URL": "sqlite+aiosqlite:///:memory:",
        "STORAGE_BACKEND": "local",
        "LOCAL_STORAGE_DIR": _UPLOAD_DIR,
        "ANTHROPIC_API_KEY": "",
        "GROQ_API_KEY": "",
    }
)

import openpyxl  # noqa: E402
import pytest  # noqa: E402
import pytest_asyncio  # noqa: E402
from httpx import ASGITransport, AsyncClient  # noqa: E402
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

import app.models  # noqa: E402,F401  (register all tables)
from app.core.database import get_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models.base import Base  # noqa: E402


@pytest_asyncio.fixture
async def client():
    engine = create_async_engine(
        "sqlite+aiosqlite:///:memory:", poolclass=StaticPool, connect_args={"check_same_thread": False}
    )
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async def override_get_db():
        async with session_factory() as session:
            try:
                yield session
                await session.commit()
            except Exception:
                await session.rollback()
                raise

    app.dependency_overrides[get_db] = override_get_db
    async with AsyncClient(transport=ASGITransport(app=app), base_url="http://test") as c:
        yield c
    app.dependency_overrides.clear()
    await engine.dispose()


async def register(client: AsyncClient, email: str = "alice@example.com", password: str = "Passw0rd!x"):
    resp = await client.post(
        "/api/v1/auth/register", json={"email": email, "name": "Alice Example", "password": password}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest_asyncio.fixture
async def auth(client):
    """Registered user + ready-made Authorization headers."""
    tokens = await register(client)
    return {"headers": {"Authorization": f"Bearer {tokens['access_token']}"}, "tokens": tokens}


@pytest_asyncio.fixture
async def other_auth(client):
    """A second, unrelated user (used to prove tenant isolation)."""
    tokens = await register(client, email="mallory@example.com")
    return {"Authorization": f"Bearer {tokens['access_token']}"}


@pytest.fixture
def xlsx_bytes() -> bytes:
    wb = openpyxl.Workbook()
    ws = wb.active
    ws.title = "Sales"
    ws.append(["Region", "Units", "Revenue"])
    for row in [("North", 10, 1200.5), ("South", 7, 800.0), ("East", 15, 2100.25), ("West", 3, 150.0)]:
        ws.append(list(row))
    buf = io.BytesIO()
    wb.save(buf)
    return buf.getvalue()


XLSX_MIME = "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"


@pytest_asyncio.fixture
async def workbook(client, auth, xlsx_bytes):
    resp = await client.post(
        "/api/v1/workbooks/upload",
        headers=auth["headers"],
        files={"file": ("sales.xlsx", xlsx_bytes, XLSX_MIME)},
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


@pytest_asyncio.fixture
async def sheet_id(client, auth, workbook):
    resp = await client.get(f"/api/v1/workbooks/{workbook['id']}/sheets", headers=auth["headers"])
    assert resp.status_code == 200
    return resp.json()[0]["id"]
