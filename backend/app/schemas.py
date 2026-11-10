import re
from datetime import datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, Field, field_validator

from app.anticheat import MAX_TOTAL_TICKS
from app.usernames import USERNAME_MAX_LENGTH, validate_username

_EMAIL_RE = re.compile(r"^[^@\s]+@[^@\s]+\.[^@\s]{2,}$")

Direction = Literal["U", "D", "L", "R"]


# --------------------------------------------------------------------- game


class MoveEvent(BaseModel):
    t: int = Field(..., ge=0, lt=MAX_TOTAL_TICKS, description="Game tick index (0-based)")
    d: Direction


class GameStartResponse(BaseModel):
    session_id: str
    seed: int
    issued_at_ms: int
    signature: str


class GameSubmitRequest(BaseModel):
    model_config = ConfigDict(extra="ignore")

    session_id: str = Field(..., min_length=32, max_length=64, pattern=r"^[0-9a-f]+$")
    signature: str = Field(..., min_length=64, max_length=64, pattern=r"^[0-9a-f]+$")
    username: str = Field(..., max_length=USERNAME_MAX_LENGTH + 10)
    claimed_score: int = Field(..., gt=0, le=4000)
    total_ticks: int = Field(..., gt=0, le=MAX_TOTAL_TICKS)
    moves: list[MoveEvent] = Field(default_factory=list, max_length=20_000)
    player_token: str | None = Field(default=None, min_length=32, max_length=64)

    @field_validator("username")
    @classmethod
    def _check_username(cls, value: str) -> str:
        return validate_username(value)


class LeaderboardItem(BaseModel):
    model_config = ConfigDict(from_attributes=True, populate_by_name=True)

    id: int
    rank: int = 0
    username: str
    score: int
    total_ticks: int
    duration_ms: int
    replay_hash: str
    created_at: datetime = Field(validation_alias="achieved_at")


class GameSubmitResponse(LeaderboardItem):
    improved: bool
    player_token: str | None = None


# ------------------------------------------------------------------ contact


class ContactCreateRequest(BaseModel):
    name: str = Field(..., min_length=2, max_length=120)
    email: str = Field(..., min_length=5, max_length=160)
    message: str = Field(..., min_length=3, max_length=4000)

    @field_validator("name", "message")
    @classmethod
    def _strip(cls, value: str) -> str:
        value = value.strip()
        if len(value) < 2:
            raise ValueError("Campo demasiado corto.")
        return value

    @field_validator("email")
    @classmethod
    def _check_email(cls, value: str) -> str:
        value = value.strip()
        if not _EMAIL_RE.fullmatch(value):
            raise ValueError("Correo electrónico inválido.")
        return value


class ContactItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    name: str
    email: str
    message: str
    is_read: bool
    created_at: datetime


# ------------------------------------------------------------------- config


class SiteConfigSchema(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    accent: Literal["Lima", "Cian", "Magenta", "Naranja"] = "Lima"
    photo_style: Literal["ASCII", "Duotono"] = "ASCII"
    show_buddy: bool = True
    custom_cursor: bool = True
    show_grid: bool = True
    show_glow: bool = False


# -------------------------------------------------------------------- admin


class AdminLoginRequest(BaseModel):
    username: str = Field(..., min_length=1, max_length=64)
    password: str = Field(..., min_length=1, max_length=128)


class AdminSessionResponse(BaseModel):
    username: str
    expires_in: int


class SecurityAuditItem(BaseModel):
    model_config = ConfigDict(from_attributes=True)

    id: int
    event_type: str
    severity: str
    username: str | None
    client_ip: str | None
    details: str
    created_at: datetime


class DashboardStats(BaseModel):
    total_sessions: int
    total_scores: int
    highest_score: int
    blocked_cheats: int
    unread_messages: int


class DashboardResponse(BaseModel):
    admin: str
    stats: DashboardStats
    leaderboard: list[LeaderboardItem]
    security_logs: list[SecurityAuditItem]
    messages: list[ContactItem]
    config: SiteConfigSchema
