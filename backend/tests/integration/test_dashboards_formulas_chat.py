import pytest

import app.api.v1.chat as chat_module

API = "/api/v1"


# ── Dashboards ────────────────────────────────────────────────────────────────


@pytest.fixture
async def dashboard(client, auth, workbook):
    resp = await client.post(
        f"{API}/dashboards", headers=auth["headers"], json={"workbook_id": workbook["id"], "name": "Quarterly"}
    )
    assert resp.status_code == 201, resp.text
    return resp.json()


async def test_dashboard_crud(client, auth, dashboard):
    h = auth["headers"]
    assert (await client.get(f"{API}/dashboards", headers=h)).json()[0]["name"] == "Quarterly"
    upd = await client.put(f"{API}/dashboards/{dashboard['id']}", headers=h, json={"name": "Renamed"})
    assert upd.status_code == 200 and upd.json()["name"] == "Renamed"
    assert (await client.delete(f"{API}/dashboards/{dashboard['id']}", headers=h)).status_code == 204
    assert (await client.get(f"{API}/dashboards/{dashboard['id']}", headers=h)).status_code == 404


async def test_dashboard_validation(client, auth, workbook):
    resp = await client.post(
        f"{API}/dashboards", headers=auth["headers"], json={"workbook_id": workbook["id"], "name": ""}
    )
    assert resp.status_code == 422


async def test_dashboard_requires_owned_workbook(client, workbook, other_auth):
    resp = await client.post(
        f"{API}/dashboards", headers=other_auth, json={"workbook_id": workbook["id"], "name": "Sneaky"}
    )
    assert resp.status_code == 404


async def test_dashboard_is_private(client, dashboard, other_auth):
    assert (await client.get(f"{API}/dashboards/{dashboard['id']}", headers=other_auth)).status_code == 404
    assert (await client.delete(f"{API}/dashboards/{dashboard['id']}", headers=other_auth)).status_code == 404


async def test_share_and_unshare_dashboard(client, auth, dashboard):
    h = auth["headers"]
    shared = await client.post(f"{API}/dashboards/{dashboard['id']}/share", headers=h)
    token = shared.json()["share_token"]
    public = await client.get(f"{API}/dashboards/shared/{token}")  # no auth header
    assert public.status_code == 200 and public.json()["name"] == "Quarterly"
    assert (await client.delete(f"{API}/dashboards/{dashboard['id']}/share", headers=h)).status_code == 204
    assert (await client.get(f"{API}/dashboards/shared/{token}")).status_code == 404


async def test_unknown_share_token_is_404(client):
    assert (await client.get(f"{API}/dashboards/shared/nope")).status_code == 404


# ── Formulas ──────────────────────────────────────────────────────────────────


async def test_evaluate_formula(client, auth):
    resp = await client.post(f"{API}/formulas/evaluate", headers=auth["headers"], json={"expression": "=SUM(1,2,3)"})
    assert resp.status_code == 200
    assert resp.json()["success"] is True and resp.json()["result"] == 6


async def test_evaluate_formula_reports_errors_without_500(client, auth):
    resp = await client.post(f"{API}/formulas/evaluate", headers=auth["headers"], json={"expression": "=NOPE("})
    assert resp.status_code == 200
    assert resp.json()["success"] is False and resp.json()["error"]


async def test_evaluate_formula_validation(client, auth):
    resp = await client.post(f"{API}/formulas/evaluate", headers=auth["headers"], json={"expression": ""})
    assert resp.status_code == 422


async def test_formula_history_is_recorded(client, auth):
    await client.post(f"{API}/formulas/evaluate", headers=auth["headers"], json={"expression": "=1+1"})
    resp = await client.get(f"{API}/formulas/history", headers=auth["headers"])
    assert resp.status_code == 200 and len(resp.json()) == 1


async def test_explain_formula_without_ai_key_is_503(client, auth):
    resp = await client.post(f"{API}/formulas/explain", headers=auth["headers"], json={"expression": "=SUM(A1:A3)"})
    assert resp.status_code == 503


# ── Chat ──────────────────────────────────────────────────────────────────────


async def test_chat_message_and_history(client, auth, workbook, monkeypatch):
    async def fake_ai(system, messages):
        assert "DATA CONTEXT" in system  # workbook context was injected
        return "Revenue is highest in the East region."

    monkeypatch.setattr(chat_module, "_ai_call", fake_ai)
    resp = await client.post(
        f"{API}/chat/message",
        headers=auth["headers"],
        json={"content": "Which region leads?", "workbook_id": workbook["id"]},
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "assistant"
    hist = await client.get(f"{API}/chat/history/{workbook['id']}", headers=auth["headers"])
    assert [m["role"] for m in hist.json()["messages"]] == ["user", "assistant"]


async def test_chat_cannot_read_other_users_workbook(client, workbook, other_auth, monkeypatch):
    async def fake_ai(system, messages):  # pragma: no cover - must never be reached
        raise AssertionError("AI was called for a workbook the user does not own")

    monkeypatch.setattr(chat_module, "_ai_call", fake_ai)
    resp = await client.post(
        f"{API}/chat/message", headers=other_auth, json={"content": "Show me the data", "workbook_id": workbook["id"]}
    )
    assert resp.status_code == 404


async def test_chat_provider_failure_is_502(client, auth, monkeypatch):
    async def boom(system, messages):
        raise RuntimeError("provider down: secret-internal-detail")

    monkeypatch.setattr(chat_module, "_ai_call", boom)
    resp = await client.post(f"{API}/chat/message", headers=auth["headers"], json={"content": "hi"})
    assert resp.status_code == 502
    assert "secret-internal-detail" not in resp.text


async def test_chat_rejects_empty_message(client, auth):
    resp = await client.post(f"{API}/chat/message", headers=auth["headers"], json={"content": ""})
    assert resp.status_code == 422
