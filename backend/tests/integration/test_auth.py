import jwt
import pytest

from app.core.config import settings
from tests.conftest import register

API = "/api/v1"


async def test_register_returns_tokens_and_user(client):
    data = await register(client)
    assert data["token_type"] == "bearer"
    assert data["user"]["email"] == "alice@example.com"
    assert "password" not in data["user"]


async def test_register_duplicate_email_is_409(client):
    await register(client)
    resp = await client.post(
        f"{API}/auth/register",
        json={"email": "ALICE@example.com", "name": "Alice", "password": "Passw0rd!x"},
    )
    assert resp.status_code == 409


@pytest.mark.parametrize(
    "payload",
    [
        {"email": "not-an-email", "name": "A", "password": "Passw0rd!x"},
        {"email": "a@example.com", "name": "A", "password": "short1"},
        {"email": "a@example.com", "name": "A", "password": "onlyletters"},
        {"email": "a@example.com", "name": "  ", "password": "Passw0rd!x"},
    ],
)
async def test_register_validation_errors_are_422(client, payload):
    resp = await client.post(f"{API}/auth/register", json=payload)
    assert resp.status_code == 422
    assert resp.json()["detail"] == "Validation failed"
    assert resp.json()["errors"]


async def test_login_success(client):
    await register(client)
    resp = await client.post(f"{API}/auth/login", json={"email": "alice@example.com", "password": "Passw0rd!x"})
    assert resp.status_code == 200
    assert resp.json()["access_token"]


async def test_login_wrong_password_is_401(client):
    await register(client)
    resp = await client.post(f"{API}/auth/login", json={"email": "alice@example.com", "password": "wrong-pass1"})
    assert resp.status_code == 401


async def test_login_unknown_user_is_401(client):
    resp = await client.post(f"{API}/auth/login", json={"email": "nobody@example.com", "password": "Passw0rd!x"})
    assert resp.status_code == 401


async def test_me_requires_token(client):
    assert (await client.get(f"{API}/auth/me")).status_code == 401


async def test_me_with_token(client, auth):
    resp = await client.get(f"{API}/auth/me", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.json()["email"] == "alice@example.com"


async def test_garbage_token_is_401(client):
    resp = await client.get(f"{API}/auth/me", headers={"Authorization": "Bearer not.a.jwt"})
    assert resp.status_code == 401


async def test_refresh_token_cannot_be_used_as_access_token(client, auth):
    refresh = auth["tokens"]["refresh_token"]
    resp = await client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {refresh}"})
    assert resp.status_code == 401


async def test_refresh_issues_new_pair(client, auth):
    resp = await client.post(f"{API}/auth/refresh", json={"refresh_token": auth["tokens"]["refresh_token"]})
    assert resp.status_code == 200
    new_access = resp.json()["access_token"]
    me = await client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {new_access}"})
    assert me.status_code == 200


async def test_access_token_cannot_be_used_to_refresh(client, auth):
    resp = await client.post(f"{API}/auth/refresh", json={"refresh_token": auth["tokens"]["access_token"]})
    assert resp.status_code == 401


async def test_expired_token_is_rejected(client, auth):
    expired = jwt.encode(
        {"sub": auth["tokens"]["user"]["id"], "type": "access", "exp": 1},
        settings.JWT_SECRET_KEY,
        algorithm=settings.JWT_ALGORITHM,
    )
    resp = await client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {expired}"})
    assert resp.status_code == 401


async def test_token_signed_with_other_key_is_rejected(client, auth):
    forged = jwt.encode(
        {"sub": auth["tokens"]["user"]["id"], "type": "access", "exp": 9999999999},
        "x" * 40,
        algorithm="HS256",
    )
    resp = await client.get(f"{API}/auth/me", headers={"Authorization": f"Bearer {forged}"})
    assert resp.status_code == 401
