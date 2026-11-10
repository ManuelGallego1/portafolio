from conftest import ADMIN_PASSWORD, ADMIN_USER, CSRF, login, start_session, submit

from app.config import settings


def test_dashboard_requires_authentication(client):
    assert client.get("/api/admin/dashboard").status_code == 401
    assert client.get("/api/admin/me").status_code == 401


def test_login_sets_httponly_cookie_and_returns_no_token(client):
    res = login(client)
    assert res.status_code == 200
    assert "access_token" not in res.json()
    cookie_header = res.headers["set-cookie"].lower()
    assert settings.admin_cookie_name in cookie_header
    assert "httponly" in cookie_header
    assert "samesite=strict" in cookie_header

    assert client.get("/api/admin/me").json()["username"] == ADMIN_USER
    dash = client.get("/api/admin/dashboard")
    assert dash.status_code == 200
    assert dash.headers["cache-control"] == "no-store"


def test_wrong_username_and_wrong_password_get_the_same_answer(client):
    bad_password = login(client, password="not-the-password")
    bad_user = client.post(
        "/api/admin/login",
        json={"username": "someone", "password": ADMIN_PASSWORD},
        headers=CSRF,
    )
    assert bad_password.status_code == bad_user.status_code == 401
    assert bad_password.json() == bad_user.json()


def test_login_without_csrf_header_is_rejected(client):
    assert login(client, headers={}).status_code == 403


def test_login_is_rate_limited_after_five_failures(client):
    for _ in range(5):
        assert login(client, password="wrong-password").status_code == 401
    blocked = login(client)  # even the right password is refused while blocked
    assert blocked.status_code == 429
    assert int(blocked.headers["retry-after"]) > 0


def test_spoofed_forwarded_for_does_not_bypass_rate_limit(client):
    for i in range(5):
        res = client.post(
            "/api/admin/login",
            json={"username": ADMIN_USER, "password": "wrong-password"},
            headers={**CSRF, "X-Forwarded-For": f"203.0.113.{i}"},
        )
        assert res.status_code == 401
    res = client.post(
        "/api/admin/login",
        json={"username": ADMIN_USER, "password": ADMIN_PASSWORD},
        headers={**CSRF, "X-Forwarded-For": "198.51.100.77"},
    )
    assert res.status_code == 429


def test_overlong_password_is_rejected_not_truncated(client):
    assert login(client, password=ADMIN_PASSWORD + "x" * 200).status_code == 422


def test_forged_token_is_rejected(client):
    client.cookies.set(settings.admin_cookie_name, "eyJhbGciOiJub25lIn0.e30.", path="/api")
    assert client.get("/api/admin/dashboard").status_code == 401


def test_admin_writes_require_csrf_header(client):
    login(client)
    payload = {
        "accent": "Cian",
        "photo_style": "ASCII",
        "show_buddy": True,
        "custom_cursor": True,
        "show_grid": True,
        "show_glow": False,
    }
    assert client.put("/api/admin/config", json=payload).status_code == 403
    ok = client.put("/api/admin/config", json=payload, headers=CSRF)
    assert ok.status_code == 200
    assert client.get("/api/config").json()["accent"] == "Cian"


def test_deleting_an_entry_frees_the_name(client):
    entry = submit(client, start_session(client), "cypher").json()
    login(client)
    res = client.delete(f"/api/admin/leaderboard/{entry['id']}", headers=CSRF)
    assert res.status_code == 200

    reclaimed = submit(client, start_session(client), "cypher")
    assert reclaimed.status_code == 200


def test_logout_clears_the_session(client):
    login(client)
    assert client.post("/api/admin/logout", headers=CSRF).status_code == 204
    assert client.get("/api/admin/dashboard").status_code == 401


def test_dashboard_reports_blocked_cheats(client):
    submit(client, start_session(client), "tamper", score=500)
    login(client)
    data = client.get("/api/admin/dashboard").json()
    assert data["stats"]["blocked_cheats"] >= 1
    assert any(log["event_type"] == "REPLAY_VERIFICATION_FAILED" for log in data["security_logs"])


def test_global_login_limit_stops_brute_force_with_rotating_ips(client):
    from app.auth import login_limiter

    for _ in range(20):
        assert login(client, password="wrong-password").status_code == 401
        login_limiter.reset()  # simulate a fresh IP for every attempt
    assert login(client).status_code == 429
