"""Admin authentication.

- Credentials are checked in constant time (bcrypt always runs, usernames are
  compared with ``hmac.compare_digest``) so responses do not reveal whether a
  username exists.
- The JWT lives in an ``HttpOnly`` + ``SameSite=Strict`` cookie, out of reach of
  page scripts. State-changing requests also require a custom header, which a
  cross-site form cannot send.
"""

import hmac
import secrets
from datetime import datetime, timedelta, timezone

import bcrypt
import jwt
from fastapi import Depends, HTTPException, Request, Response, status

from app.config import settings
from app.security import RateLimiter

BCRYPT_MAX_BYTES = 72
CSRF_HEADER = "x-requested-with"
CSRF_HEADER_VALUE = "mg-admin"

# 5 failed logins per IP every 15 minutes...
login_limiter = RateLimiter(max_events=5, window_seconds=15 * 60)
# ...and at most 20 across all IPs, so rotating (or spoofing) the client IP
# cannot turn the login into an unlimited brute-force oracle.
global_login_limiter = RateLimiter(max_events=20, window_seconds=15 * 60)
GLOBAL_LOGIN_KEY = "all"


def _load_admin_hash() -> bytes:
    if settings.admin_password_hash:
        candidate = settings.admin_password_hash.encode()
        try:
            bcrypt.checkpw(b"probe", candidate)  # validates the hash format
        except ValueError as exc:
            raise RuntimeError("ADMIN_PASSWORD_HASH is not a valid bcrypt hash") from exc
        return candidate
    return bcrypt.hashpw((settings.admin_password or "").encode(), bcrypt.gensalt(rounds=12))


_ADMIN_HASH = _load_admin_hash()


def verify_admin_credentials(username: str, password: str) -> bool:
    password_bytes = password.encode()
    # bcrypt ignores bytes after 72: reject instead of silently truncating.
    too_long = len(password_bytes) > BCRYPT_MAX_BYTES
    password_ok = bcrypt.checkpw(password_bytes[:BCRYPT_MAX_BYTES], _ADMIN_HASH)
    username_ok = hmac.compare_digest(username.encode(), settings.admin_username.encode())
    return username_ok and password_ok and not too_long


def create_admin_token(username: str) -> tuple[str, int]:
    now = datetime.now(timezone.utc)
    expires_delta = timedelta(minutes=settings.jwt_expire_minutes)
    payload = {
        "sub": username,
        "role": "admin",
        "iss": settings.jwt_issuer,
        "aud": settings.jwt_audience,
        "iat": now,
        "nbf": now,
        "exp": now + expires_delta,
        "jti": secrets.token_hex(16),
    }
    token = jwt.encode(payload, settings.secret_key, algorithm=settings.jwt_algorithm)
    return token, int(expires_delta.total_seconds())


def set_session_cookie(response: Response, token: str, max_age: int) -> None:
    response.set_cookie(
        key=settings.admin_cookie_name,
        value=token,
        max_age=max_age,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/api",
    )


def clear_session_cookie(response: Response) -> None:
    response.delete_cookie(
        key=settings.admin_cookie_name,
        httponly=True,
        secure=settings.cookie_secure,
        samesite="strict",
        path="/api",
    )


def _unauthorized(detail: str) -> HTTPException:
    return HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=detail)


def get_current_admin(request: Request) -> str:
    token = request.cookies.get(settings.admin_cookie_name)
    if not token:
        raise _unauthorized("No autenticado.")
    try:
        payload = jwt.decode(
            token,
            settings.secret_key,
            algorithms=[settings.jwt_algorithm],
            audience=settings.jwt_audience,
            issuer=settings.jwt_issuer,
            options={"require": ["exp", "iat", "sub", "aud", "iss"]},
        )
    except jwt.ExpiredSignatureError:
        raise _unauthorized("La sesión expiró, inicia sesión de nuevo.") from None
    except jwt.InvalidTokenError:
        raise _unauthorized("Sesión inválida.") from None

    username = payload.get("sub")
    if payload.get("role") != "admin" or username != settings.admin_username:
        raise _unauthorized("Sesión inválida.")
    return username


def require_csrf_header(request: Request) -> None:
    if request.headers.get(CSRF_HEADER) != CSRF_HEADER_VALUE:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Solicitud rechazada.")


def get_admin_for_write(
    _: None = Depends(require_csrf_header),
    admin: str = Depends(get_current_admin),
) -> str:
    return admin
