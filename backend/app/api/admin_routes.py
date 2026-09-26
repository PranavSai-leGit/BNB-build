from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List, Dict, Any
from app.database import get_db
from app.models.user import User
from app.models.organization import Organization, OrganizationMember
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession
from app.models.audit import AuditLog
from app.security.dependencies import get_current_user

router = APIRouter(prefix="/admin", tags=["Admin"])

def require_admin_role(current_user: User = Depends(get_current_user)) -> User:
    if current_user.role not in ["org_admin", "platform_admin"]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Access restricted to Organization and Platform Administrators."
        )
    return current_user

@router.get("/overview")
def get_admin_overview(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role)
):
    total_users = db.query(User).count()
    total_experiments = db.query(Experiment).count()
    total_sessions = db.query(ParticipantSession).count()
    total_orgs = db.query(Organization).count()

    recent_audits = db.query(AuditLog).order_by(AuditLog.timestamp.desc()).limit(10).all()

    return {
        "stats": {
            "total_users": total_users,
            "total_experiments": total_experiments,
            "total_sessions": total_sessions,
            "total_organizations": total_orgs,
            "platform_status": "Operational",
            "retention_policy_active": True,
            "timing_engine": "VSYNC High-Precision v2.4"
        },
        "recent_audit_logs": [
            {
                "id": a.id,
                "action": a.action,
                "user_id": a.actor_id or a.actor_email,
                "created_at": a.timestamp.isoformat() if a.timestamp else None,
                "metadata": a.metadata_json
            }
            for a in recent_audits
        ]
    }

@router.get("/users")
def get_admin_users(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role)
):
    users = db.query(User).all()
    return [
        {
            "id": u.id,
            "email": u.email,
            "full_name": u.full_name,
            "role": u.role,
            "is_active": u.is_active,
            "created_at": u.created_at.isoformat() if u.created_at else None
        }
        for u in users
    ]

@router.get("/organizations")
def get_admin_organizations(
    db: Session = Depends(get_db),
    admin: User = Depends(require_admin_role)
):
    orgs = db.query(Organization).all()
    results = []
    for org in orgs:
        member_count = db.query(OrganizationMember).filter(OrganizationMember.organization_id == org.id).count()
        exp_count = db.query(Experiment).filter(Experiment.organization_id == org.id).count()
        results.append({
            "id": org.id,
            "name": org.name,
            "slug": org.slug,
            "member_count": member_count,
            "experiment_count": exp_count,
            "created_at": org.created_at.isoformat() if org.created_at else None
        })
    return results

@router.get("/system-settings")
def get_system_settings(
    admin: User = Depends(require_admin_role)
):
    return {
        "retention_policy_default_days": 90,
        "timing_engine_version": "Cognera High-Res VSYNC Engine v2.4",
        "supported_browsers": ["Chrome 90+", "Firefox 88+", "Safari 14+", "Edge 90+"],
        "max_stimulus_upload_mb": 50,
        "pseudonymization_active": True,
        "data_quality_engine_active": True
    }
