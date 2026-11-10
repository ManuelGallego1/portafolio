from fastapi import APIRouter, Depends, Request, status
from sqlalchemy.orm import Session

from app.config import settings
from app.database import get_db
from app.models import ContactMessage, SiteConfig
from app.schemas import ContactCreateRequest, SiteConfigSchema
from app.security import RateLimiter, enforce_rate_limit, get_client_ip

router = APIRouter(prefix="/api", tags=["public"])

contact_limiter = RateLimiter(max_events=5, window_seconds=10 * 60)
# Global cap: spam with rotating IPs still cannot flood the inbox.
contact_global_limiter = RateLimiter(max_events=60, window_seconds=60 * 60)


def get_or_create_site_config(db: Session) -> SiteConfig:
    cfg = db.get(SiteConfig, 1)
    if cfg is None:
        cfg = SiteConfig(id=1)
        db.add(cfg)
        db.commit()
        db.refresh(cfg)
    return cfg


@router.get("/health")
def health_check() -> dict[str, str]:
    return {"status": "ok", "version": settings.version}


@router.get("/config", response_model=SiteConfigSchema)
def get_site_config(db: Session = Depends(get_db)) -> SiteConfig:
    return get_or_create_site_config(db)


@router.post("/contact", status_code=status.HTTP_201_CREATED)
def submit_contact_message(
    payload: ContactCreateRequest, request: Request, db: Session = Depends(get_db)
) -> dict[str, bool]:
    detail = "Has enviado varios mensajes seguidos. Intenta más tarde."
    enforce_rate_limit(contact_limiter, get_client_ip(request), detail)
    enforce_rate_limit(contact_global_limiter, "all", detail)
    db.add(ContactMessage(name=payload.name, email=payload.email, message=payload.message))
    db.commit()
    return {"ok": True}
