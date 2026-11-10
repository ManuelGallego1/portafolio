import pytest
from conftest import start_session, submit

from app.usernames import UsernameError, normalize_username_key, validate_username


@pytest.mark.parametrize(
    "variant", ["ManuelDev", "manuel.dev", "MANUEL_DEV", "manuel-dev", "m.a.n.u.e.l.d.e.v"]
)
def test_lookalike_names_share_the_same_key(variant):
    assert normalize_username_key(variant) == "manueldev"


@pytest.mark.parametrize(
    "name",
    [
        "ab",  # too short
        "a" * 21,  # too long
        "bad name",  # spaces
        "émilie",  # non-ASCII (homoglyph risk)
        "_lead",  # leading separator
        "trail.",  # trailing separator
        "two..dots",  # repeated separator
        "<script>",  # markup
        "Admin",  # reserved
        "a.d.m.i.n",  # reserved after normalization
        "Manuel_Gallego",  # reserved (site owner)
        "xxFuckxx",  # offensive
    ],
)
def test_invalid_names_are_rejected(name):
    with pytest.raises(UsernameError):
        validate_username(name)


@pytest.mark.parametrize("name", ["neo", "Player_1", "dev.ops-42", "Computador"])
def test_valid_names_are_accepted(name):
    assert validate_username(name) == name


def test_invalid_name_returns_422(client):
    res = submit(client, start_session(client), "Admin")
    assert res.status_code == 422


def test_name_cannot_be_taken_by_someone_else(client):
    owner = submit(client, start_session(client), "neo_player")
    assert owner.status_code == 200

    session = start_session(client)
    for variant in ("neo_player", "NEO.PLAYER", "neoplayer"):
        res = submit(client, session, variant)
        assert res.status_code == 409, variant
        assert "en uso" in res.json()["detail"]

    # The rejected session was not consumed: the same game can be saved under a free name.
    retry = submit(client, session, "trinity")
    assert retry.status_code == 200


def test_owner_keeps_name_and_only_best_score_is_kept(client):
    first = submit(client, start_session(client), "morpheus")
    token = first.json()["player_token"]

    again = submit(client, start_session(client), "Morpheus", token=token)
    assert again.status_code == 200
    body = again.json()
    assert body["improved"] is False  # same score, same duration: not an improvement
    assert body["player_token"] is None  # token is only issued once
    assert body["username"] == "Morpheus"  # owner may change capitalization

    board = client.get("/api/game/leaderboard").json()
    assert [row["username"] for row in board] == ["Morpheus"]


def test_wrong_token_cannot_use_the_name(client):
    submit(client, start_session(client), "oracle")
    res = submit(client, start_session(client), "oracle", token="x" * 43)
    assert res.status_code == 409


def test_leaderboard_has_one_row_per_name(client):
    for name in ("alpha", "beta", "gamma"):
        assert submit(client, start_session(client), name).status_code == 200

    board = client.get("/api/game/leaderboard?limit=10").json()
    names = [row["username"] for row in board]
    assert sorted(names) == ["alpha", "beta", "gamma"]
    assert [row["rank"] for row in board] == [1, 2, 3]
    assert all("player_token" not in row for row in board)


def test_leaderboard_limit_is_validated(client):
    assert client.get("/api/game/leaderboard?limit=1000").status_code == 422
