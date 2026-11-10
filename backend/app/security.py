"""Cross-cutting security helpers: client IP resolution, rate limiting, headers."""

import ipaddress
import math
import threading
import time
from collections import deque

from fastapi import HTTPException, Request, status
from starlette.middleware.base import BaseHTTPMiddleware

from app.config import settings


def _is_internal(address: str) -> bool:
    try:
        ip = ipaddress.ip_address(address)
    except ValueError:
        return False
    return ip.is_private or ip.is_loopback


def get_client_ip(request: Request) -> str:
    """Resolve the real client IP without trusting spoofable headers.

    ``X-Forwarded-For`` is only honoured when the direct peer is an internal
    address (our own reverse proxy, e.g. the Next.js container). Each proxy
    appends the address it saw, so the trustworthy entry is the one
    ``TRUSTED_PROXY_HOPS`` positions from the right; anything to its left was
    written by the client and is ignored.
    """
    peer = request.client.host if request.client else "unknown"
    hops = settings.trusted_proxy_hops
    forwarded = request.headers.get("x-forwarded-for")
    if hops <= 0 or not forwarded or not _is_internal(peer):
        return peer

    chain = [part.strip() for part in forwarded.split(",") if part.strip()]
    if not chain:
        return peer
    candidate = chain[-hops] if len(chain) >= hops else chain[0]
    try:
        return str(ipaddress.ip_address(candidate))
    except ValueError:
        return peer


class RateLimiter:
    """Thread-safe sliding-window limiter kept in process memory.

    Suitable for the single-worker deployment of this project. With several
    workers or replicas, move the counters to a shared store such as Redis.
    """

    def __init__(self, max_events: int, window_seconds: int, max_keys: int = 50_000):
        self.max_events = max_events
        self.window = window_seconds
        self.max_keys = max_keys
        self._events: dict[str, deque[float]] = {}
        self._lock = threading.Lock()

    def _prune(self, key: str, now: float) -> deque[float]:
        events = self._events.get(key)
        if events is None:
            return deque()
        while events and now - events[0] >= self.window:
            events.popleft()
        if not events:
            del self._events[key]
        return events

    def retry_after(self, key: str) -> int:
        """Seconds until ``key`` may act again; 0 when it is not limited."""
        now = time.monotonic()
        with self._lock:
            events = self._prune(key, now)
            if len(events) < self.max_events:
                return 0
            return max(1, math.ceil(self.window - (now - events[0])))

    def hit(self, key: str) -> None:
        now = time.monotonic()
        with self._lock:
            if key not in self._events and len(self._events) >= self.max_keys:
                for stale in list(self._events):
                    self._prune(stale, now)
                if len(self._events) >= self.max_keys:
                    self._events.pop(next(iter(self._events)))
            self._events.setdefault(key, deque()).append(now)

    def reset(self, key: str | None = None) -> None:
        with self._lock:
            if key is None:
                self._events.clear()
            else:
                self._events.pop(key, None)


def too_many_requests(retry_after: int, detail: str) -> HTTPException:
    return HTTPException(
        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
        detail=detail,
        headers={"Retry-After": str(retry_after)},
    )


def enforce_rate_limit(limiter: RateLimiter, key: str, detail: str) -> None:
    """Count one event for ``key`` and reject it when over the limit."""
    wait = limiter.retry_after(key)
    if wait:
        raise too_many_requests(wait, detail)
    limiter.hit(key)


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request, call_next):
        response = await call_next(request)
        response.headers.setdefault("X-Content-Type-Options", "nosniff")
        response.headers.setdefault("X-Frame-Options", "DENY")
        response.headers.setdefault("Referrer-Policy", "no-referrer")
        response.headers.setdefault("Cross-Origin-Resource-Policy", "same-origin")
        if request.url.path.startswith("/api/admin"):
            response.headers["Cache-Control"] = "no-store"
        return response
