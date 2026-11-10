from types import SimpleNamespace

from conftest import LEGIT_MOVES, LEGIT_SCORE, LEGIT_TICKS, start_session, submit

from app.anticheat import simulate_replay


def moves(*pairs):
    return [SimpleNamespace(t=t, d=d) for t, d in pairs]


# ------------------------------------------------------------ replay engine


def test_replay_scores_a_straight_game():
    result = simulate_replay(seed=123, total_ticks=LEGIT_TICKS, moves=moves((0, "R")))
    assert result.valid
    assert result.score == LEGIT_SCORE


def test_replay_rejects_collision_before_last_tick():
    result = simulate_replay(seed=123, total_ticks=LEGIT_TICKS + 5, moves=moves((0, "R")))
    assert not result.valid


def test_replay_rejects_game_without_collision():
    result = simulate_replay(seed=123, total_ticks=5, moves=moves((0, "R")))
    assert not result.valid


def test_replay_rejects_out_of_order_moves():
    result = simulate_replay(seed=1, total_ticks=20, moves=moves((3, "U"), (2, "R")))
    assert not result.valid


def test_replay_ignores_180_degree_turn_like_the_client():
    # Turning left while moving right is ignored, so the game is identical.
    result = simulate_replay(seed=7, total_ticks=LEGIT_TICKS, moves=moves((0, "L")))
    assert result.valid
    assert result.score == LEGIT_SCORE


# ------------------------------------------------------------ submit endpoint


def test_legitimate_score_is_saved_with_rank_and_token(client):
    res = submit(client, start_session(client), "manuel_dev")
    assert res.status_code == 200, res.text
    data = res.json()
    assert data["username"] == "manuel_dev"
    assert data["score"] == LEGIT_SCORE
    assert data["rank"] == 1
    assert data["improved"] is True
    assert len(data["player_token"]) >= 32
    assert len(data["replay_hash"]) == 64


def test_reusing_a_session_is_blocked(client):
    session = start_session(client)
    first = submit(client, session, "player_one")
    assert first.status_code == 200
    token = first.json()["player_token"]

    replay = submit(client, session, "player_one", token=token)
    assert replay.status_code == 403


def test_tampered_score_is_rejected_and_burns_the_session(client):
    session = start_session(client)
    res = submit(client, session, "hacker99", score=990)
    assert res.status_code == 403
    assert "Anti-Cheat" in res.json()["detail"]

    honest_retry = submit(client, session, "hacker99")
    assert honest_retry.status_code == 403


def test_impossibly_fast_game_is_rejected(client):
    session = start_session(client, backdate_ms=0)
    res = submit(client, session, "speedy", ticks=200, score=10, moves=LEGIT_MOVES)
    assert res.status_code == 403


def test_forged_signature_is_rejected(client):
    session = start_session(client)
    session["signature"] = "0" * 64
    assert submit(client, session, "forger").status_code == 403


def test_unknown_session_is_rejected(client):
    fake = {"session_id": "a" * 32, "signature": "b" * 64}
    assert submit(client, fake, "ghost").status_code == 403
