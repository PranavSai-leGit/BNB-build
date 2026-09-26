from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import Dict, Any, List
from app.database import get_db
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession
from app.schemas.participant import (
    InitSessionRequest, InitSessionResponse, ConsentSubmissionRequest,
    ConsentResponse, TrialEventSubmissionRequest, BatchTrialEventRequest,
    SessionCompleteRequest
)
from app.services.session_service import (
    initialize_participant_session, record_participant_consent,
    record_trial_results, complete_session
)

router = APIRouter(prefix="/public", tags=["Participant Runtime"])

@router.get("/experiments/{public_id}/info")
def get_public_experiment_info(
    public_id: str,
    mode: Optional[str] = None,
    db: Session = Depends(get_db)
):
    exp = db.query(Experiment).filter(Experiment.public_id == public_id).first()
    is_pilot = (mode == "pilot")
    if not exp or (not is_pilot and exp.status != "published"):
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Experiment not found or is currently not open to participants"
        )

    version = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()

    if not version:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    defn = version.definition
    consent = defn.get("consent", {})
    settings = defn.get("settings", {})
    preflight = defn.get("preflight_config", {})
    participant_schema = defn.get("participant_schema", [])

    return {
        "public_id": exp.public_id,
        "name": exp.name,
        "description": exp.description,
        "version_number": exp.current_version_number,
        "consent": consent,
        "settings": settings,
        "preflight_config": preflight,
        "participant_schema": participant_schema,
        "retention_days": exp.retention_days,
        "is_pilot": is_pilot
    }

@router.post("/experiments/{public_id}/session", response_model=InitSessionResponse)
def create_session(
    public_id: str,
    req: InitSessionRequest,
    mode: Optional[str] = None,
    db: Session = Depends(get_db)
):
    is_pilot = bool(req.is_pilot or mode == "pilot")
    session = initialize_participant_session(db, public_id, req, is_pilot=is_pilot)
    exp = session.experiment
    version = session.experiment_version

    defn = version.definition
    return InitSessionResponse(
        session_id=session.id,
        participant_id=session.participant_id,
        experiment_id=exp.id,
        experiment_version_id=version.id,
        experiment_version_number=version.version_number,
        definition=defn,
        settings=defn.get("settings", {}),
        consent=defn.get("consent", {}),
        is_pilot=session.is_pilot
    )

@router.post("/sessions/{session_id}/consent", response_model=ConsentResponse)
def submit_consent(
    session_id: str,
    req: ConsentSubmissionRequest,
    db: Session = Depends(get_db)
):
    consent = record_participant_consent(db, session_id, req.accepted, req.consent_version)
    session = db.query(ParticipantSession).filter(ParticipantSession.id == session_id).first()
    return ConsentResponse(
        session_id=session_id,
        accepted=consent.accepted,
        accepted_at=consent.accepted_at,
        status=session.status if session else "consented"
    )

@router.post("/sessions/{session_id}/events")
def submit_trial_events(
    session_id: str,
    req: BatchTrialEventRequest,
    db: Session = Depends(get_db)
):
    results = record_trial_results(db, session_id, req.events)
    return {"status": "success", "recorded_count": len(results)}

@router.post("/sessions/{session_id}/complete")
def finalize_session(
    session_id: str,
    req: SessionCompleteRequest,
    db: Session = Depends(get_db)
):
    session = complete_session(
        db,
        session_id,
        withdrawal_requested=req.withdrawal_requested,
        browser_timing_summary=req.browser_timing_summary
    )
    return {
        "status": session.status,
        "session_id": session.id,
        "completed_at": session.completed_at
    }
