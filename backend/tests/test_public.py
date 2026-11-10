def test_health(client):
    res = client.get("/api/health")
    assert res.status_code == 200
    assert res.json()["status"] == "ok"
    assert res.headers["x-content-type-options"] == "nosniff"


def test_api_docs_are_disabled_by_default(client):
    assert client.get("/api/docs").status_code == 404
    assert client.get("/api/openapi.json").status_code == 404


def test_cors_only_allows_configured_origins(client):
    allowed = client.options(
        "/api/health",
        headers={"Origin": "http://localhost:3000", "Access-Control-Request-Method": "GET"},
    )
    assert allowed.headers.get("access-control-allow-origin") == "http://localhost:3000"

    denied = client.options(
        "/api/health",
        headers={"Origin": "https://evil.example", "Access-Control-Request-Method": "GET"},
    )
    assert "access-control-allow-origin" not in denied.headers


def test_contact_message_is_stored(client):
    res = client.post(
        "/api/contact",
        json={"name": "Ana", "email": "ana@example.com", "message": "Hola, me interesa."},
    )
    assert res.status_code == 201
    assert res.json() == {"ok": True}


def test_contact_rejects_invalid_email(client):
    res = client.post(
        "/api/contact", json={"name": "Ana", "email": "no-es-correo", "message": "Hola"}
    )
    assert res.status_code == 422


def test_contact_is_rate_limited(client):
    body = {"name": "Spam", "email": "spam@example.com", "message": "compra ya"}
    for _ in range(5):
        assert client.post("/api/contact", json=body).status_code == 201
    assert client.post("/api/contact", json=body).status_code == 429
