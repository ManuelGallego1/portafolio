"""Application settings loaded from environment variables.

Secrets have no defaults on purpose: the app refuses to start if they are
missing or weak, so a misconfigured deployment never runs with known keys.
"""

import os
from dataclasses import dataclass, field

try:
    from dotenv import load_dotenv

    load_dotenv()
except ImportError:  # python-dotenv is optional outside local development
    pass


class ConfigError(RuntimeError):
    """Raised when required configuration is missing or insecure."""


def _env(name: str, default: str | None = None) -> str | None:
    value = os.getenv(name)
    if value is None or value.strip() == "":
        return default
    return value.strip()


def _env_bool(name: str, default: bool) -> bool:
    value = _env(name)
    if value is None:
        return default
    return value.lower() in {"1", "true", "yes", "on"}


def _env_int(name: str, default: int) -> int:
    value = _env(name)
    if value is None:
        return default
    try:
        return int(value)
    except ValueError as exc:
        raise ConfigError(f"{name} must be an integer") from exc


def _env_list(name: str, default: str) -> list[str]:
    raw = _env(name, default) or ""
    return [item.strip() for item in raw.split(",") if item.strip()]


MIN_SECRET_LENGTH = 32
MIN_ADMIN_PASSWORD_LENGTH = 12


@dataclass(frozen=True)
class Settings:
    database_url: str
    secret_key: str
    admin_username: str
    admin_password_hash: str | None
    admin_password: str | None
    jwt_expire_minutes: int
    cors_origins: list[str] = field(default_factory=list)
    cookie_secure: bool = True
    trusted_proxy_hops: int = 1
    enable_docs: bool = False

    project_name: str = "Manuel Gallego Portfolio API"
    version: str = "4.1.0"
    jwt_algorithm: str = "HS256"
    jwt_issuer: str = "alejandrogallego.dev"
    jwt_audience: str = "alejandrogallego.dev/admin"
    admin_cookie_name: str = "mg_admin_session"


def load_settings() -> Settings:
    secret_key = _env("SECRET_KEY")
    if not secret_key or len(secret_key) < MIN_SECRET_LENGTH:
        raise ConfigError(
            f"SECRET_KEY is required and must be at least {MIN_SECRET_LENGTH} characters. "
            'Generate one with: python -c "import secrets; print(secrets.token_urlsafe(48))"'
        )

    admin_username = _env("ADMIN_USERNAME")
    if not admin_username:
        raise ConfigError("ADMIN_USERNAME is required")

    admin_password_hash = _env("ADMIN_PASSWORD_HASH")
    admin_password = _env("ADMIN_PASSWORD")
    if not admin_password_hash and not admin_password:
        raise ConfigError("Set ADMIN_PASSWORD_HASH (recommended, bcrypt) or ADMIN_PASSWORD")
    if not admin_password_hash and len(admin_password or "") < MIN_ADMIN_PASSWORD_LENGTH:
        raise ConfigError(
            f"ADMIN_PASSWORD must be at least {MIN_ADMIN_PASSWORD_LENGTH} characters"
        )

    return Settings(
        database_url=_env("DATABASE_URL", "sqlite:///./portfolio.db") or "",
        secret_key=secret_key,
        admin_username=admin_username,
        admin_password_hash=admin_password_hash,
        admin_password=admin_password,
        jwt_expire_minutes=max(5, _env_int("JWT_EXPIRE_MINUTES", 120)),
        cors_origins=_env_list("CORS_ORIGINS", "http://localhost:3000"),
        cookie_secure=_env_bool("COOKIE_SECURE", True),
        trusted_proxy_hops=max(0, _env_int("TRUSTED_PROXY_HOPS", 1)),
        enable_docs=_env_bool("ENABLE_DOCS", False),
    )


settings = load_settings()
