"""Snake easter egg: signed sessions, verified submissions and world leaderboard."""

import hashlib
import hmac
import secrets
import threading

from fastapi import APIRouter, Depends, HTTPException, Query, Request, status
from sqlalchemy import and_, delete, func, or_, select, update
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from app.anticheat import (
    SESSION_MAX_AGE_MS,
    TICK_MS,
    min_plausible_duration_ms,
    new_session,
    now_ms,
    replay_hash,
    simulate_replay,
    verify_session_signature,
)
from app.audit import Severity, log_security_event
from app.database import get_db
from app.models import GameSession, Player, utcnow
from app.schemas import (
    GameStartResponse,
    GameSubmitRequest,
    GameSubmitResponse,
    LeaderboardItem,
)
from app.security import RateLimiter, enforce_rate_limit, get_client_ip
from app.usernames import normalize_username_key

router = APIRouter(prefix="/api/game", tags=["game"])

start_limiter = RateLimiter(max_events=30, window_seconds=60)
submit_limiter = RateLimiter(max_events=10, window_seconds=60)

USERNAME_TAKEN = "Ese nombre ya está en uso. Elige otro."
VERIFICATION_FAILED = "Anti-Cheat: la partida no pudo verificarse."
SESSION_REJECTED = "Anti-Cheat: sesión de juego inválida o ya utilizada."

_CLEANUP_INTERVAL_MS = 10 * 60 * 1000
_cleanup_lock = threading.Lock()
_last_cleanup_ms = 0


def _hash_token(token: str) -> str:
    return hashlib.sha256(token.encode()).hexdigest()


def _owns_name(player: Player, token: str | None) -> bool:
    if player.token_hash is None:  # legacy name without owner: first verified player claims it
        return True
    return bool(token) and hmac.compare_digest(_hash_token(token), player.token_hash)


def _purge_expired_sessions(db: Session) -> None:
    """Delete abandoned, expired sessions at most every few minutes."""
    global _last_cleanup_ms
    current = now_ms()
    with _cleanup_lock:
        if current - _last_cleanup_ms < _CLEANUP_INTERVAL_MS:
            return
        _last_cleanup_ms = current
    db.execute(
        delete(GameSession).where(
            GameSession.is_used.is_(False),
            GameSession.issued_at_ms < current - SESSION_MAX_AGE_MS,
        )
    )


def _consume_session(db: Session, session_id: str) -> bool:
    """Atomically mark the session as used; False if it was already consumed."""
    result = db.execute(
        update(GameSession)
        .where(GameSession.session_id == session_id, GameSession.is_used.is_(False))
        .values(is_used=True)
    )
    return result.rowcount == 1


def _leaderboard_order():
    return (Player.score.desc(), Player.duration_ms.asc(), Player.achieved_at.asc(), Player.id.asc())


def _rank_of(db: Session, player: Player) -> int:
    ahead = db.scalar(
        select(func.count(Player.id)).where(
            or_(
                Player.score > player.score,
                and_(Player.score == player.score, Player.duration_ms < player.duration_ms),
                and_(
                    Player.score == player.score,
                    Player.duration_ms == player.duration_ms,
                    Player.achieved_at < player.achieved_at,
                ),
            )
        )
    )
    return (ahead or 0) + 1


def ranked_leaderboard(db: Session, limit: int) -> list[LeaderboardItem]:
    rows = db.scalars(select(Player).order_by(*_leaderboard_order()).limit(limit)).all()
    return [
        LeaderboardItem.model_validate(row).model_copy(update={"rank": rank})
        for rank, row in enumerate(rows, start=1)
    ]


def _verification_error(session_row: GameSession, payload: GameSubmitRequest) -> tuple[str, str] | None:
    """Return ``(event_type, details)`` when the game cannot be trusted."""
    elapsed = now_ms() - session_row.issued_at_ms
    if elapsed > SESSION_MAX_AGE_MS:
        return "SESSION_EXPIRED", f"Session age {elapsed} ms exceeds the maximum"

    minimum = min_plausible_duration_ms(payload.total_ticks)
    if elapsed < minimum:
        return (
            "SPEEDHACK_OR_BOT_DETECTED",
            f"Elapsed {elapsed} ms < minimum {minimum} ms for {payload.total_ticks} ticks "
            f"(claimed_score={payload.claimed_score})",
        )

    result = simulate_replay(session_row.seed, payload.total_ticks, payload.moves)
    if not result.valid or result.score != payload.claimed_score:
        return (
            "REPLAY_VERIFICATION_FAILED",
            f"reason='{result.reason}', simulated_score={result.score}, "
            f"claimed_score={payload.claimed_score}, ticks={payload.total_ticks}",
        )
    return None


@router.post("/start", response_model=GameStartResponse)
def start_game(request: Request, db: Session = Depends(get_db)) -> GameStartResponse:
    client_ip = get_client_ip(request)
    enforce_rate_limit(start_limiter, client_ip, "Demasiadas partidas seguidas. Espera un momento.")

    _purge_expired_sessions(db)
    session_id, seed, issued_at_ms, signature = new_session()
    db.add(
        GameSession(
            session_id=session_id,
            seed=seed,
            issued_at_ms=issued_at_ms,
            signature=signature,
            client_ip=client_ip,
        )
    )
    db.commit()
    return GameStartResponse(
        session_id=session_id, seed=seed, issued_at_ms=issued_at_ms, signature=signature
    )


@router.get("/leaderboard", response_model=list[LeaderboardItem])
def get_leaderboard(
    limit: int = Query(default=25, ge=1, le=100), db: Session = Depends(get_db)
) -> list[LeaderboardItem]:
    return ranked_leaderboard(db, limit)


@router.post("/submit", response_model=GameSubmitResponse)
def submit_score(
    payload: GameSubmitRequest, request: Request, db: Session = Depends(get_db)
) -> GameSubmitResponse:
    client_ip = get_client_ip(request)
    enforce_rate_limit(submit_limiter, client_ip, "Demasiados envíos. Espera un momento.")

    def reject(event_type: str, details: str, detail: str = VERIFICATION_FAILED) -> HTTPException:
        log_security_event(
            db,
            event_type=event_type,
            severity=Severity.CRITICAL,
            username=payload.username,
            client_ip=client_ip,
            details=details,
        )
        return HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail=detail)

    # 1. The session must exist, carry our HMAC and be unused.
    session_row = db.get(GameSession, payload.session_id)
    if session_row is None or not verify_session_signature(
        session_row.session_id, session_row.seed, session_row.issued_at_ms, payload.signature
    ):
        raise reject("INVALID_SESSION", "Unknown session or HMAC mismatch", SESSION_REJECTED)
    if session_row.is_used:
        raise reject(
            "REPLAY_ATTACK_BLOCKED",
            f"Reuse of consumed session_id={payload.session_id}",
            SESSION_REJECTED,
        )

    # 2. Name ownership is checked before consuming the session, so a player
    #    who picked a taken name can retry the same game with another one.
    username_key = normalize_username_key(payload.username)
    player = db.scalar(select(Player).where(Player.username_key == username_key))
    if player is not None and not _owns_name(player, payload.player_token):
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=USERNAME_TAKEN)

    # 3. Timing and deterministic replay. A failed check burns the session.
    error = _verification_error(session_row, payload)
    if error is not None:
        _consume_session(db, payload.session_id)
        db.commit()
        raise reject(*error)

    # 4. Consume the session and store the result in a single transaction.
    if not _consume_session(db, payload.session_id):
        db.rollback()
        raise reject(
            "REPLAY_ATTACK_BLOCKED",
            f"Concurrent reuse of session_id={payload.session_id}",
            SESSION_REJECTED,
        )

    score = payload.claimed_score
    duration_ms = payload.total_ticks * TICK_MS
    result_fields = {
        "score": score,
        "total_ticks": payload.total_ticks,
        "duration_ms": duration_ms,
        "replay_hash": replay_hash(payload.session_id, payload.total_ticks, payload.moves),
        "session_id": payload.session_id,
    }

    new_token: str | None = None
    if player is None:
        new_token = secrets.token_urlsafe(32)
        player = Player(
            username=payload.username,
            username_key=username_key,
            token_hash=_hash_token(new_token),
            **result_fields,
        )
        db.add(player)
        improved = True
    else:
        if player.token_hash is None:
            new_token = secrets.token_urlsafe(32)
            player.token_hash = _hash_token(new_token)
        player.username = payload.username
        improved = (score, -duration_ms) > (player.score, -player.duration_ms)
        if improved:
            for field, value in result_fields.items():
                setattr(player, field, value)
            player.achieved_at = utcnow()

    try:
        db.commit()
    except IntegrityError:
        # Someone claimed the same name concurrently; the rollback also
        # releases the session so the player can retry with another name.
        db.rollback()
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail=USERNAME_TAKEN) from None

    db.refresh(player)
    item = LeaderboardItem.model_validate(player)
    return GameSubmitResponse(
        **item.model_dump(exclude={"rank"}),
        rank=_rank_of(db, player),
        improved=improved,
        player_token=new_token,
    )
