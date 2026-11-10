from conftest import start_session, submit
from sqlalchemy import text

from app.database import SessionLocal, engine
from app.db_init import init_db


def _seed_legacy_table(rows):
    with engine.begin() as conn:
        conn.execute(
            text(
                "CREATE TABLE leaderboard_entries (id INTEGER PRIMARY KEY, username TEXT, "
                "score INTEGER, total_ticks INTEGER, duration_ms INTEGER, seed INTEGER, "
                "replay_hash TEXT, session_id TEXT, created_at TIMESTAMP)"
            )
        )
        for i, (username, score) in enumerate(rows):
            conn.execute(
                text(
                    "INSERT INTO leaderboard_entries VALUES "
                    "(:id, :u, :s, 50, 5250, 1, 'abc', :sid, '2026-01-01 10:00:00')"
                ),
                {"id": i, "u": username, "s": score, "sid": f"s{i}"},
            )


def test_legacy_duplicates_are_collapsed_to_best_score(client):
    with SessionLocal() as db:
        db.execute(text("DELETE FROM leaderboard_players"))
        db.commit()
    _seed_legacy_table([("Neo", 30), ("neo", 90), ("N.E.O", 10), ("bad name!", 999), ("tank", 20)])

    init_db()

    board = client.get("/api/game/leaderboard").json()
    assert [(row["username"], row["score"]) for row in board] == [("neo", 90), ("tank", 20)]

    # Imported names have no owner yet: the first verified game claims them.
    claim = submit(client, start_session(client), "tank")
    assert claim.status_code == 200
    assert claim.json()["player_token"]
    assert submit(client, start_session(client), "tank").status_code == 409

    with engine.begin() as conn:
        conn.execute(text("DROP TABLE leaderboard_entries"))
