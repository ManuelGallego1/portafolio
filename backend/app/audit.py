from enum import StrEnum

from sqlalchemy.orm import Session

from app.models import SecurityAuditLog


class Severity(StrEnum):
    INFO = "INFO"
    WARNING = "WARNING"
    CRITICAL = "CRITICAL"


def log_security_event(
    db: Session,
    event_type: str,
    details: str,
    severity: Severity = Severity.WARNING,
    username: str | None = None,
    client_ip: str | None = None,
) -> None:
    """Persist an audit event in its own commit.

    Values coming from the request are truncated to the column sizes so an
    oversized input can never make the audit write fail.
    """
    db.add(
        SecurityAuditLog(
            event_type=event_type[:64],
            severity=str(severity),
            username=username[:64] if username else None,
            client_ip=client_ip[:64] if client_ip else None,
            details=details[:2000],
        )
    )
    db.commit()
