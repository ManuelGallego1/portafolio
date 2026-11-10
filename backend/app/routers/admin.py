from fastapi import APIRouter, Depends, HTTPException, Request, Response, status
from sqlalchemy import delete, func, select
from sqlalchemy.orm import Session

from app.audit import Severity, log_security_event
from app.auth import (
    GLOBAL_LOGIN_KEY,
    clear_session_cookie,
    global_login_limiter,
    create_admin_token,
    get_admin_for_write,
    get_current_admin,
    login_limiter,
    require_csrf_header,
    set_session_cookie,
    verify_admin_credentials,
)
from app.config import settings
from app.database import get_db
from app.models import ContactMessage, GameSession, Player, SecurityAuditLog
from app.routers.game import ranked_leaderboard
from app.routers.public import get_or_create_site_config
from app.schemas import (
    AdminLoginRequest,
    AdminSessionResponse,
    ContactItem,
    DashboardResponse,
    DashboardStats,
    SecurityAuditItem,
    SiteConfigSchema,
)
from app.security import get_client_ip, too_many_requests

router = APIRouter(prefix="/api/admin", tags=["admin"])

INVALID_CREDENTIALS = "Usuario o contraseña incorrectos."
TOO_MANY_ATTEMPTS = "Demasiados intentos fallidos. Intenta de nuevo más tarde."
DASHBOARD_LIMIT = 100


@router.post(
    "/login",
    response_model=AdminSessionResponse,
    dependencies=[Depends(require_csrf_header)],
)
def admin_login(
    payload: AdminLoginRequest,
    request: Request,
    response: Response,
    db: Session = Depends(get_db),
) -> AdminSessionResponse:
    client_ip = get_client_ip(request)
    wait = max(
        login_limiter.retry_after(client_ip),
        global_login_limiter.retry_after(GLOBAL_LOGIN_KEY),
    )
    if wait:
        raise too_many_requests(wait, TOO_MANY_ATTEMPTS)

    if not verify_admin_credentials(payload.username, payload.password):
        login_limiter.hit(client_ip)
        global_login_limiter.hit(GLOBAL_LOGIN_KEY)
        locked = (
            login_limiter.retry_after(client_ip) > 0
            or global_login_limiter.retry_after(GLOBAL_LOGIN_KEY) > 0
        )
        log_security_event(
            db,
            event_type="ADMIN_RATE_LIMIT" if locked else "ADMIN_LOGIN_FAILED",
            severity=Severity.CRITICAL if locked else Severity.WARNING,
            username=payload.username,
            client_ip=client_ip,
            details="IP blocked after repeated failed logins" if locked else "Invalid credentials",
        )
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail=INVALID_CREDENTIALS)

    login_limiter.reset(client_ip)
    token, expires_in = create_admin_token(settings.admin_username)
    set_session_cookie(response, token, expires_in)
    log_security_event(
        db,
        event_type="ADMIN_LOGIN_SUCCESS",
        severity=Severity.INFO,
        username=settings.admin_username,
        client_ip=client_ip,
        details="Admin authenticated",
    )
    return AdminSessionResponse(username=settings.admin_username, expires_in=expires_in)


@router.post(
    "/logout",
    status_code=status.HTTP_204_NO_CONTENT,
    dependencies=[Depends(require_csrf_header)],
)
def admin_logout(response: Response) -> Response:
    clear_session_cookie(response)
    response.status_code = status.HTTP_204_NO_CONTENT
    return response


@router.get("/me", response_model=AdminSessionResponse)
def admin_me(admin: str = Depends(get_current_admin)) -> AdminSessionResponse:
    return AdminSessionResponse(username=admin, expires_in=0)


@router.get("/dashboard", response_model=DashboardResponse)
def admin_dashboard(
    admin: str = Depends(get_current_admin), db: Session = Depends(get_db)
) -> DashboardResponse:
    stats = DashboardStats(
        total_sessions=db.scalar(select(func.count()).select_from(GameSession)) or 0,
        total_scores=db.scalar(select(func.count()).select_from(Player)) or 0,
        highest_score=db.scalar(select(func.max(Player.score))) or 0,
        blocked_cheats=db.scalar(
            select(func.count())
            .select_from(SecurityAuditLog)
            .where(SecurityAuditLog.severity == Severity.CRITICAL.value)
        )
        or 0,
        unread_messages=db.scalar(
            select(func.count())
            .select_from(ContactMessage)
            .where(ContactMessage.is_read.is_(False))
        )
        or 0,
    )
    audit_logs = db.scalars(
        select(SecurityAuditLog).order_by(SecurityAuditLog.created_at.desc()).limit(DASHBOARD_LIMIT)
    ).all()
    messages = db.scalars(
        select(ContactMessage).order_by(ContactMessage.created_at.desc()).limit(DASHBOARD_LIMIT)
    ).all()

    return DashboardResponse(
        admin=admin,
        stats=stats,
        leaderboard=ranked_leaderboard(db, DASHBOARD_LIMIT),
        security_logs=[SecurityAuditItem.model_validate(row) for row in audit_logs],
        messages=[ContactItem.model_validate(row) for row in messages],
        config=SiteConfigSchema.model_validate(get_or_create_site_config(db)),
    )


@router.delete("/leaderboard/{entry_id}")
def delete_leaderboard_entry(
    entry_id: int,
    request: Request,
    admin: str = Depends(get_admin_for_write),
    db: Session = Depends(get_db),
) -> dict[str, int | bool]:
    player = db.get(Player, entry_id)
    if player is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Registro no encontrado.")
    summary = f"{player.username}: {player.score} pts"
    db.delete(player)
    db.commit()
    log_security_event(
        db,
        event_type="ADMIN_DELETED_SCORE",
        severity=Severity.INFO,
        username=admin,
        client_ip=get_client_ip(request),
        details=f"Deleted leaderboard entry id={entry_id} ({summary}); the name is free again",
    )
    return {"deleted": True, "id": entry_id}


@router.patch("/messages/{msg_id}/read", response_model=ContactItem)
def toggle_message_read(
    msg_id: int,
    _: str = Depends(get_admin_for_write),
    db: Session = Depends(get_db),
) -> ContactMessage:
    msg = db.get(ContactMessage, msg_id)
    if msg is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mensaje no encontrado.")
    msg.is_read = not msg.is_read
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/messages/{msg_id}")
def delete_message(
    msg_id: int,
    _: str = Depends(get_admin_for_write),
    db: Session = Depends(get_db),
) -> dict[str, int | bool]:
    result = db.execute(delete(ContactMessage).where(ContactMessage.id == msg_id))
    if result.rowcount == 0:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Mensaje no encontrado.")
    db.commit()
    return {"deleted": True, "id": msg_id}


@router.put("/config", response_model=SiteConfigSchema)
def update_site_config(
    payload: SiteConfigSchema,
    request: Request,
    admin: str = Depends(get_admin_for_write),
    db: Session = Depends(get_db),
) -> SiteConfigSchema:
    cfg = get_or_create_site_config(db)
    for field, value in payload.model_dump().items():
        setattr(cfg, field, value)
    db.commit()
    db.refresh(cfg)
    log_security_event(
        db,
        event_type="ADMIN_CONFIG_UPDATED",
        severity=Severity.INFO,
        username=admin,
        client_ip=get_client_ip(request),
        details=f"Updated config: {payload.model_dump()}",
    )
    return SiteConfigSchema.model_validate(cfg)
