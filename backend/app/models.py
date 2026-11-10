from datetime import datetime, timezone

from sqlalchemy import BigInteger, Boolean, DateTime, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from app.database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class GameSession(Base):
    """Single-use signed session issued when a Snake game starts."""

    __tablename__ = "game_sessions"

    session_id: Mapped[str] = mapped_column(String(64), primary_key=True)
    seed: Mapped[int] = mapped_column(BigInteger, nullable=False)
    issued_at_ms: Mapped[int] = mapped_column(BigInteger, nullable=False, index=True)
    signature: Mapped[str] = mapped_column(String(128), nullable=False)
    is_used: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    client_ip: Mapped[str | None] = mapped_column(String(64))
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class Player(Base):
    """One row per leaderboard name; only the best verified game is kept.

    ``username_key`` is the normalized form of the name (case and separators
    removed) and is unique, so "Manuel.Dev" and "manueldev" cannot coexist.
    The name belongs to whoever holds the secret token issued on first claim;
    only the SHA-256 of that token is stored.
    """

    __tablename__ = "leaderboard_players"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    username: Mapped[str] = mapped_column(String(32), nullable=False)
    username_key: Mapped[str] = mapped_column(String(32), nullable=False, unique=True)
    token_hash: Mapped[str | None] = mapped_column(String(64))
    score: Mapped[int] = mapped_column(Integer, nullable=False, index=True)
    total_ticks: Mapped[int] = mapped_column(Integer, nullable=False)
    duration_ms: Mapped[int] = mapped_column(Integer, nullable=False)
    replay_hash: Mapped[str] = mapped_column(String(64), nullable=False)
    session_id: Mapped[str | None] = mapped_column(String(64), unique=True)
    achieved_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class SecurityAuditLog(Base):
    __tablename__ = "security_audit_logs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    event_type: Mapped[str] = mapped_column(String(64), nullable=False, index=True)
    severity: Mapped[str] = mapped_column(String(16), nullable=False, default="WARNING")
    username: Mapped[str | None] = mapped_column(String(64))
    client_ip: Mapped[str | None] = mapped_column(String(64))
    details: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False, index=True
    )


class ContactMessage(Base):
    __tablename__ = "contact_messages"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, autoincrement=True)
    name: Mapped[str] = mapped_column(String(120), nullable=False)
    email: Mapped[str] = mapped_column(String(160), nullable=False)
    message: Mapped[str] = mapped_column(Text, nullable=False)
    is_read: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, nullable=False
    )


class SiteConfig(Base):
    __tablename__ = "site_config"

    id: Mapped[int] = mapped_column(Integer, primary_key=True, default=1)
    accent: Mapped[str] = mapped_column(String(32), default="Lima", nullable=False)
    photo_style: Mapped[str] = mapped_column(String(32), default="ASCII", nullable=False)
    show_buddy: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    custom_cursor: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_grid: Mapped[bool] = mapped_column(Boolean, default=True, nullable=False)
    show_glow: Mapped[bool] = mapped_column(Boolean, default=False, nullable=False)
    updated_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), default=utcnow, onupdate=utcnow, nullable=False
    )
