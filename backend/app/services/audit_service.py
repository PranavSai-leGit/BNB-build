from typing import Optional, Dict, Any
from sqlalchemy.orm import Session
from app.models.audit import AuditLog
from app.models.user import User

def record_audit_log(
    db: Session,
    action: str,
    actor: Optional[User] = None,
    experiment_id: Optional[str] = None,
    metadata: Optional[Dict[str, Any]] = None
):
    log = AuditLog(
        actor_id=actor.id if actor else "SYSTEM/PARTICIPANT",
        actor_email=actor.email if actor else None,
        action=action,
        experiment_id=experiment_id,
        metadata_json=metadata or {}
    )
    db.add(log)
    db.commit()
