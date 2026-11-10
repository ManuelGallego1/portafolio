import os
import tempfile
from pathlib import Path

# Configuration must exist before the app modules are imported.
_DB_FILE = Path(tempfile.mkdtemp()) / "test.db"
os.environ.update(
    {
        "DATABASE_URL": f"sqlite:///{_DB_FILE.as_posix()}",
        "SECRET_KEY": "test-secret-key-that-is-long-enough-for-hmac-and-jwt",
        "ADMIN_USERNAME": "admin.test",
        "ADMIN_PASSWORD": "correct-horse-battery-staple",
        "COOKIE_SECURE": "false",
        "CORS_ORIGINS": "http://localhost:3000",
    }
)

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402

from app.anticheat import sign_session  # noqa: E402
from app.auth import (  # noqa: E402
    CSRF_HEADER,
    CSRF_HEADER_VALUE,
    global_login_limiter,
    login_limiter,
)
from app.database import Base, SessionLocal, engine  # noqa: E402
from app.db_init import init_db  # noqa: E402
from app.main import app  # noqa: E402
from app.models import GameSession  # noqa: E402
from app.routers.game import start_limiter, submit_limiter  # noqa: E402
from app.routers.public import contact_global_limiter, contact_limiter  # noqa: E402

ADMIN_USER = os.environ["ADMIN_USERNAME"]
ADMIN_PASSWORD = os.environ["ADMIN_PASSWORD"]
CSRF = {CSRF_HEADER: CSRF_HEADER_VALUE}

# A game that goes right from the start: eats the food at (14,10) on tick 4
# and hits the right wall on tick 10 -> 11 ticks, 10 points.
LEGIT_MOVES = [{"t": 0, "d": "R"}]
LEGIT_TICKS = 11
LEGIT_SCORE = 10


@pytest.fixture(autouse=True)
def fresh_state():
    Base.metadata.drop_all(bind=engine)
    init_db()
    for limiter in (
        login_limiter,
        global_login_limiter,
        start_limiter,
        submit_limiter,
        contact_limiter,
        contact_global_limiter,
    ):
        limiter.reset()
    yield


@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client


def start_session(client: TestClient, backdate_ms: int = 5_000) -> dict:
    """Start a game and pretend it began ``backdate_ms`` ago."""
    res = client.post("/api/game/start")
    assert res.status_code == 200, res.text
    data = res.json()
    with SessionLocal() as db:
        row = db.get(GameSession, data["session_id"])
        row.issued_at_ms -= backdate_ms
        row.signature = sign_session(row.session_id, row.seed, row.issued_at_ms)
        db.commit()
        data["issued_at_ms"], data["signature"] = row.issued_at_ms, row.signature
    return data


def submit(
    client: TestClient,
    session: dict,
    username: str,
    *,
    score: int = LEGIT_SCORE,
    ticks: int = LEGIT_TICKS,
    moves: list | None = None,
    token: str | None = None,
):
    body = {
        "session_id": session["session_id"],
        "signature": session["signature"],
        "username": username,
        "claimed_score": score,
        "total_ticks": ticks,
        "moves": LEGIT_MOVES if moves is None else moves,
    }
    if token:
        body["player_token"] = token
    return client.post("/api/game/submit", json=body)


def login(client: TestClient, password: str = ADMIN_PASSWORD, headers: dict | None = None):
    return client.post(
        "/api/admin/login",
        json={"username": ADMIN_USER, "password": password},
        headers=CSRF if headers is None else headers,
    )
