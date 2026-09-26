from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession, ConsentRecord, TrialResult
from app.schemas.participant import InitSessionRequest, TrialEventSubmissionRequest
from app.services.audit_service import record_audit_log

def initialize_participant_session(
    db: Session,
    public_id: str,
    req: InitSessionRequest
) -> ParticipantSession:
    exp = db.query(Experiment).filter(Experiment.public_id == public_id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")

    if exp.status != "published":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Experiment is not currently accepting participants (status is not published)"
        )

    # Fetch published version
    version = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()

    if not version:
        raise HTTPException(status_code=400, detail="Experiment version definition unavailable")

    browser_dict = req.browser_metadata.model_dump() if req.browser_metadata else {}

    session = ParticipantSession(
        experiment_id=exp.id,
        experiment_version_id=version.id,
        participant_data=req.participant_data or {},
        browser_metadata=browser_dict,
        status="started"
    )
    db.add(session)
    db.commit()
    db.refresh(session)

    return session

def record_participant_consent(
    db: Session,
    session_id: str,
    accepted: bool,
    consent_version: str = "1.0"
) -> ConsentRecord:
    session = db.query(ParticipantSession).filter(ParticipantSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session_id).first()
    if consent:
        consent.accepted = accepted
        consent.accepted_at = datetime.utcnow()
    else:
        consent = ConsentRecord(
            session_id=session.id,
            consent_version=consent_version,
            accepted=accepted,
            accepted_at=datetime.utcnow()
        )
        db.add(consent)

    if accepted:
        session.status = "consented"
    else:
        session.status = "withdrawn"
        session.completed_at = datetime.utcnow()

    db.commit()
    db.refresh(consent)
    db.refresh(session)
    return consent

def record_trial_results(
    db: Session,
    session_id: str,
    events: List[TrialEventSubmissionRequest]
) -> List[TrialResult]:
    session = db.query(ParticipantSession).filter(ParticipantSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status in ["withdrawn", "completed"]:
        raise HTTPException(status_code=400, detail="Session is already closed or withdrawn")

    session.status = "in_progress"
    results = []

    for event in events:
        tr = TrialResult(
            session_id=session.id,
            trial_id=event.trial_id,
            sequence_number=event.sequence_number,
            condition=event.condition,
            stimulus_id=event.stimulus_id,
            response_data=event.response_data,
            timing_data=event.timing_data
        )
        db.add(tr)
        results.append(tr)

    db.commit()
    return results

def complete_session(
    db: Session,
    session_id: str,
    withdrawal_requested: bool = False,
    browser_timing_summary: Optional[Dict[str, Any]] = None
) -> ParticipantSession:
    session = db.query(ParticipantSession).filter(ParticipantSession.id == session_id).first()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    session.completed_at = datetime.utcnow()
    if withdrawal_requested:
        session.status = "withdrawn"
        consent = db.query(ConsentRecord).filter(ConsentRecord.session_id == session.id).first()
        if consent:
            consent.withdrawal_requested = True
            consent.withdrawal_at = datetime.utcnow()
        record_audit_log(
            db,
            action="PARTICIPANT_WITHDRAWAL",
            experiment_id=session.experiment_id,
            metadata={"session_id": session.id, "participant_id": session.participant_id}
        )
    else:
        session.status = "completed"

    if browser_timing_summary:
        current_meta = session.browser_metadata or {}
        current_meta["final_timing_summary"] = browser_timing_summary
        session.browser_metadata = current_meta

    db.commit()
    db.refresh(session)
    return session
