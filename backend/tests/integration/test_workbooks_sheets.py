API = "/api/v1"


async def test_health(client):
    resp = await client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "ok"


async def test_endpoints_require_auth(client):
    for path in ["/workbooks", "/dashboards", "/formulas/history"]:
        assert (await client.get(f"{API}{path}")).status_code == 401


async def test_upload_parses_sheets(client, workbook):
    assert workbook["name"] == "sales"
    assert workbook["sheet_count"] == 1
    assert workbook["row_count"] == 4


async def test_upload_csv(client, auth):
    csv = b"name,score\nalpha,1\nbeta,2\n"
    resp = await client.post(
        f"{API}/workbooks/upload", headers=auth["headers"], files={"file": ("data.csv", csv, "text/csv")}
    )
    assert resp.status_code == 201
    assert resp.json()["row_count"] == 2


async def test_upload_rejects_unsupported_extension(client, auth):
    resp = await client.post(
        f"{API}/workbooks/upload",
        headers=auth["headers"],
        files={"file": ("evil.exe", b"MZ", "application/octet-stream")},
    )
    assert resp.status_code == 400


async def test_list_and_get_workbook(client, auth, workbook):
    listing = await client.get(f"{API}/workbooks", headers=auth["headers"])
    assert listing.status_code == 200
    assert listing.json()["total"] == 1
    one = await client.get(f"{API}/workbooks/{workbook['id']}", headers=auth["headers"])
    assert one.status_code == 200


async def test_workbook_is_private_to_owner(client, workbook, other_auth):
    assert (await client.get(f"{API}/workbooks/{workbook['id']}", headers=other_auth)).status_code == 404
    assert (await client.delete(f"{API}/workbooks/{workbook['id']}", headers=other_auth)).status_code == 404
    assert (await client.get(f"{API}/workbooks", headers=other_auth)).json()["total"] == 0


async def test_get_unknown_workbook_is_404(client, auth):
    resp = await client.get(f"{API}/workbooks/00000000-0000-0000-0000-000000000000", headers=auth["headers"])
    assert resp.status_code == 404


async def test_invalid_uuid_is_422(client, auth):
    assert (await client.get(f"{API}/workbooks/not-a-uuid", headers=auth["headers"])).status_code == 422


async def test_delete_workbook(client, auth, workbook):
    assert (await client.delete(f"{API}/workbooks/{workbook['id']}", headers=auth["headers"])).status_code == 204
    assert (await client.get(f"{API}/workbooks/{workbook['id']}", headers=auth["headers"])).status_code == 404


async def test_sheet_data_pagination(client, auth, sheet_id):
    resp = await client.get(f"{API}/sheets/{sheet_id}/data?page=1&page_size=3", headers=auth["headers"])
    body = resp.json()
    assert resp.status_code == 200
    assert body["total"] == 4 and len(body["data"]) == 3 and body["has_more"] is True
    last = await client.get(f"{API}/sheets/{sheet_id}/data?page=2&page_size=3", headers=auth["headers"])
    assert len(last.json()["data"]) == 1


async def test_sheet_page_size_is_bounded(client, auth, sheet_id):
    resp = await client.get(f"{API}/sheets/{sheet_id}/data?page_size=100000", headers=auth["headers"])
    assert resp.status_code == 422


async def test_sheet_query_filters_and_sorts(client, auth, sheet_id):
    resp = await client.get(
        f"{API}/sheets/{sheet_id}/query?Units_gte=7&sort_by=Revenue&sort_dir=desc", headers=auth["headers"]
    )
    body = resp.json()
    assert resp.status_code == 200
    assert [r["Region"] for r in body["data"]] == ["East", "North", "South"]


async def test_sheet_query_text_search(client, auth, sheet_id):
    resp = await client.get(f"{API}/sheets/{sheet_id}/query?q=west", headers=auth["headers"])
    assert resp.json()["total"] == 1


async def test_sheet_is_private_to_owner(client, sheet_id, other_auth):
    assert (await client.get(f"{API}/sheets/{sheet_id}", headers=other_auth)).status_code == 404
    assert (await client.get(f"{API}/sheets/{sheet_id}/data", headers=other_auth)).status_code == 404


async def test_search(client, auth, workbook):
    resp = await client.get(f"{API}/search?q=north", headers=auth["headers"])
    assert resp.status_code == 200


async def test_search_requires_query(client, auth):
    assert (await client.get(f"{API}/search", headers=auth["headers"])).status_code == 422


async def test_chart_suggestions(client, auth, sheet_id):
    resp = await client.post(f"{API}/charts/suggest", headers=auth["headers"], json={"sheet_id": sheet_id})
    assert resp.status_code == 200
    assert isinstance(resp.json(), list)


async def test_chart_suggestions_are_private(client, sheet_id, other_auth):
    resp = await client.post(f"{API}/charts/suggest", headers=other_auth, json={"sheet_id": sheet_id})
    assert resp.status_code == 404


async def test_anomalies(client, auth, sheet_id):
    resp = await client.get(f"{API}/anomalies/{sheet_id}?explain=false", headers=auth["headers"])
    assert resp.status_code == 200
    assert "anomaly_count" in resp.json()


async def test_anomalies_are_private(client, sheet_id, other_auth):
    assert (await client.get(f"{API}/anomalies/{sheet_id}", headers=other_auth)).status_code == 404


async def test_export_csv(client, auth, sheet_id):
    resp = await client.post(f"{API}/export/csv/{sheet_id}", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.headers["content-type"].startswith("text/csv")
    assert b"Region" in resp.content


async def test_export_pdf(client, auth, sheet_id):
    resp = await client.post(f"{API}/export/pdf/{sheet_id}", headers=auth["headers"])
    assert resp.status_code == 200
    assert resp.content.startswith(b"%PDF")


async def test_export_is_private(client, sheet_id, other_auth):
    assert (await client.post(f"{API}/export/csv/{sheet_id}", headers=other_auth)).status_code == 404
