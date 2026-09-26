from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.participant import ParticipantSession
from app.models.audit import AuditLog
from app.schemas.analytics import ExperimentAnalyticsOut, AuditLogOut
from app.schemas.participant import ParticipantSessionOut
from app.security.dependencies import get_current_user
from app.services.experiment_service import get_experiment_by_id
from app.services.analytics_service import get_experiment_analytics

router = APIRouter(tags=["Analytics & Audit"])

@router.get("/experiments/{experiment_id}/analytics", response_model=ExperimentAnalyticsOut)
def get_analytics(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    return get_experiment_analytics(db, exp)

@router.get("/experiments/{experiment_id}/participants", response_model=List[ParticipantSessionOut])
def get_experiment_participants(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    sessions = db.query(ParticipantSession).filter(
        ParticipantSession.experiment_id == exp.id
    ).order_by(ParticipantSession.started_at.desc()).all()

    results = []
    for s in sessions:
        out = ParticipantSessionOut.model_validate(s)
        out.trial_count = len(s.trial_results)
        results.append(out)
    return results

@router.get("/audit/logs", response_model=List[AuditLogOut])
def get_audit_trail(
    experiment_id: Optional[str] = Query(None),
    limit: int = Query(50, le=200),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    query = db.query(AuditLog)
    if experiment_id:
        # Check permissions for this experiment
        get_experiment_by_id(db, experiment_id, current_user)
        query = query.filter(AuditLog.experiment_id == experiment_id)
    elif current_user.role != "platform_admin":
        query = query.filter(AuditLog.actor_id == current_user.id)

    logs = query.order_by(AuditLog.timestamp.desc()).limit(limit).all()
    return [AuditLogOut.model_validate(l) for l in logs]
