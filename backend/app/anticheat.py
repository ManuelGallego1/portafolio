"""Server-side verification for the Snake easter egg.

The client and server share a deterministic food generator seeded by the
server, so the server can replay the exact game from the recorded moves and
compute the real score. Nothing the client claims is trusted.
"""

import hashlib
import hmac
import secrets
import time
from collections import deque
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Protocol

from app.config import settings

GRID_SIZE = 20
POINTS_PER_FOOD = 10
TICK_MS = 105
MAX_TOTAL_TICKS = 100_000

# Lower bound for real time per tick. Browsers can only run the game loop
# slower than TICK_MS, never faster, so this leaves room for network jitter.
MIN_MS_PER_TICK = 90
CLOCK_TOLERANCE_MS = 1_500
SESSION_MAX_AGE_MS = 3 * 60 * 60 * 1000

_INITIAL_SNAKE = ((9, 10), (8, 10), (7, 10))
_INITIAL_FOOD = (14, 10)
_DIRECTIONS = {"U": (0, -1), "D": (0, 1), "L": (-1, 0), "R": (1, 0)}


class Move(Protocol):
    t: int
    d: str


@dataclass(frozen=True)
class ReplayResult:
    valid: bool
    score: int
    reason: str


# ------------------------------------------------------------- sessions


def sign_session(session_id: str, seed: int, issued_at_ms: int) -> str:
    payload = f"{session_id}:{seed}:{issued_at_ms}".encode()
    return hmac.new(settings.secret_key.encode(), payload, hashlib.sha256).hexdigest()


def verify_session_signature(
    session_id: str, seed: int, issued_at_ms: int, signature: str
) -> bool:
    return hmac.compare_digest(sign_session(session_id, seed, issued_at_ms), signature)


def new_session() -> tuple[str, int, int, str]:
    """Return ``(session_id, seed, issued_at_ms, signature)``."""
    session_id = secrets.token_hex(16)
    seed = secrets.randbits(32)
    issued_at_ms = now_ms()
    return session_id, seed, issued_at_ms, sign_session(session_id, seed, issued_at_ms)


def now_ms() -> int:
    return int(time.time() * 1000)


def min_plausible_duration_ms(total_ticks: int) -> int:
    return max(0, total_ticks * MIN_MS_PER_TICK - CLOCK_TOLERANCE_MS)


# ------------------------------------------------------------- replay


def next_rng(state: int) -> int:
    """32-bit LCG, identical to the client's ``Math.imul`` implementation."""
    return (state * 1664525 + 1013904223) & 0xFFFFFFFF


def place_food(rng_state: int, occupied: set[tuple[int, int]]) -> tuple[tuple[int, int], int]:
    state = rng_state & 0xFFFFFFFF
    while True:
        state = next_rng(state)
        fx = (state >> 16) % GRID_SIZE
        state = next_rng(state)
        fy = (state >> 16) % GRID_SIZE
        if (fx, fy) not in occupied:
            return (fx, fy), state


def replay_hash(session_id: str, total_ticks: int, moves: Sequence[Move]) -> str:
    moves_str = ";".join(f"{m.t}:{m.d}" for m in moves)
    return hashlib.sha256(f"{session_id}|{total_ticks}|{moves_str}".encode()).hexdigest()


def simulate_replay(seed: int, total_ticks: int, moves: Sequence[Move]) -> ReplayResult:
    """Replay a game tick by tick; it must end in a collision on the last tick."""
    if not 0 < total_ticks <= MAX_TOTAL_TICKS:
        return ReplayResult(False, 0, "total_ticks out of range")

    turns: dict[int, str] = {}
    last_tick = -1
    for move in moves:
        if move.t <= last_tick:
            return ReplayResult(False, 0, f"moves out of order at tick {move.t}")
        if move.t >= total_ticks:
            return ReplayResult(False, 0, f"move at tick {move.t} beyond total_ticks")
        if move.d not in _DIRECTIONS:
            return ReplayResult(False, 0, f"invalid direction at tick {move.t}")
        turns[move.t] = move.d
        last_tick = move.t

    snake = deque(_INITIAL_SNAKE)
    occupied = set(_INITIAL_SNAKE)
    dx, dy = 1, 0
    food = _INITIAL_FOOD
    rng_state = seed & 0xFFFFFFFF
    score = 0

    for tick in range(total_ticks):
        turn = turns.get(tick)
        if turn is not None:
            ndx, ndy = _DIRECTIONS[turn]
            if (ndx, ndy) != (-dx, -dy):  # a 180° turn is ignored, like on the client
                dx, dy = ndx, ndy

        hx, hy = snake[0][0] + dx, snake[0][1] + dy
        head = (hx, hy)
        # Same rule as the client: the whole current body (tail included) is solid.
        if not (0 <= hx < GRID_SIZE and 0 <= hy < GRID_SIZE) or head in occupied:
            if tick != total_ticks - 1:
                return ReplayResult(False, score, f"collision at tick {tick} before the end")
            return ReplayResult(True, score, "verified")

        snake.appendleft(head)
        occupied.add(head)
        if head == food:
            score += POINTS_PER_FOOD
            food, rng_state = place_food(rng_state, occupied)
        else:
            occupied.discard(snake.pop())

    return ReplayResult(False, score, "game did not end in a collision")
