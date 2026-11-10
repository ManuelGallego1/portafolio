"""Schema creation and one-off data migrations run at startup."""

import logging
from datetime import datetime

from sqlalchemy import inspect, select, text

from app.database import Base, SessionLocal, engine
from app.models import Player, SiteConfig, utcnow
from app.usernames import UsernameError, normalize_username_key, validate_username

logger = logging.getLogger(__name__)

_LEGACY_TABLE = "leaderboard_entries"


def _as_datetime(value: object) -> datetime:
    """Raw SQL returns text on SQLite and datetime on PostgreSQL."""
    if isinstance(value, datetime):
        return value
    try:
        return datetime.fromisoformat(str(value))
    except ValueError:
        return utcnow()


def _migrate_legacy_leaderboard() -> None:
    """Import the old per-game leaderboard into the one-name-per-player table.

    Only the best game per normalized name is kept. Imported names have no
    owner token yet: the first verified game submitted with that name claims it.
    Names that break the current rules are skipped.
    """
    if not inspect(engine).has_table(_LEGACY_TABLE):
        return
    with SessionLocal() as db:
        if db.scalar(select(Player.id).limit(1)) is not None:
            return
        rows = db.execute(
            text(
                f"SELECT username, score, total_ticks, duration_ms, replay_hash, created_at "
                f"FROM {_LEGACY_TABLE} ORDER BY score DESC, duration_ms ASC, created_at ASC"
            )
        ).all()
        seen: set[str] = set()
        for row in rows:
            try:
                username = validate_username(row.username)
            except UsernameError:
                continue
            key = normalize_username_key(username)
            if key in seen:
                continue
            seen.add(key)
            achieved_at = _as_datetime(row.created_at)
            db.add(
                Player(
                    username=username,
                    username_key=key,
                    token_hash=None,
                    score=row.score,
                    total_ticks=row.total_ticks,
                    duration_ms=row.duration_ms,
                    replay_hash=row.replay_hash[:64],
                    achieved_at=achieved_at,
                    created_at=achieved_at,
                )
            )
        db.commit()
        if seen:
            logger.info("Migrated %d legacy leaderboard names", len(seen))


def init_db() -> None:
    Base.metadata.create_all(bind=engine)
    _migrate_legacy_leaderboard()
    with SessionLocal() as db:
        if db.get(SiteConfig, 1) is None:
            db.add(SiteConfig(id=1))
            db.commit()
