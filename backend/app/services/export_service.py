import io
import csv
import json
from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession, TrialResult
from app.models.user import User
from app.services.audit_service import record_audit_log

def export_experiment_csv(db: Session, exp: Experiment, user: User) -> str:
    sessions = db.query(ParticipantSession).filter(ParticipantSession.experiment_id == exp.id).all()
    session_map = {s.id: s for s in sessions}
    session_ids = list(session_map.keys())

    versions = db.query(ExperimentVersion).filter(ExperimentVersion.experiment_id == exp.id).all()
    version_map = {v.id: v.version_number for v in versions}

    trials = db.query(TrialResult).filter(TrialResult.session_id.in_(session_ids)).order_by(
        TrialResult.session_id, TrialResult.sequence_number
    ).all() if session_ids else []

    output = io.StringIO()
    writer = csv.writer(output)

    # Base headers
    headers = [
        "participant_id",
        "session_status",
        "experiment_name",
        "experiment_version",
        "sequence_number",
        "trial_id",
        "condition",
        "stimulus_id",
        "response_key_or_value",
        "reaction_time_ms",
        "is_correct",
        "stimulus_presented_at",
        "response_received_at",
        "timestamp_utc"
    ]

    # Collect dynamic participant and response field names
    participant_extra_keys = set()
    response_extra_keys = set()
    for s in sessions:
        if s.participant_data:
            participant_extra_keys.update(s.participant_data.keys())

    for t in trials:
        if t.response_data:
            response_extra_keys.update([k for k in t.response_data.keys() if k not in ["key", "button", "is_correct", "accuracy"]])

    part_keys_sorted = sorted(list(participant_extra_keys))
    resp_keys_sorted = sorted(list(response_extra_keys))

    all_headers = headers + [f"participant_{k}" for k in part_keys_sorted] + [f"response_{k}" for k in resp_keys_sorted]
    writer.writerow(all_headers)

    for t in trials:
        s = session_map.get(t.session_id)
        if not s:
            continue

        ver_num = version_map.get(s.experiment_version_id, 1)
        resp_data = t.response_data or {}
        timing_data = t.timing_data or {}

        primary_resp = resp_data.get("key") or resp_data.get("button") or resp_data.get("choice") or resp_data.get("value") or ""
        rt = timing_data.get("reaction_time", "")
        is_corr = resp_data.get("is_correct", "")
        stim_presented = timing_data.get("stimulus_presented_at", "")
        resp_received = timing_data.get("response_received_at", "")

        row = [
            s.participant_id,
            s.status,
            exp.name,
            ver_num,
            t.sequence_number,
            t.trial_id,
            t.condition or "standard",
            t.stimulus_id or "",
            primary_resp,
            rt,
            is_corr,
            stim_presented,
            resp_received,
            t.created_at.isoformat() if t.created_at else ""
        ]

        # Dynamic participant fields
        s_part_data = s.participant_data or {}
        for pk in part_keys_sorted:
            row.append(s_part_data.get(pk, ""))

        # Dynamic response fields
        for rk in resp_keys_sorted:
            row.append(resp_data.get(rk, ""))

        writer.writerow(row)

    record_audit_log(
        db,
        action="DATA_EXPORT",
        actor=user,
        experiment_id=exp.id,
        metadata={"format": "CSV", "trials_count": len(trials), "sessions_count": len(sessions)}
    )

    return output.getvalue()

def export_experiment_json(db: Session, exp: Experiment, user: User) -> Dict[str, Any]:
    sessions = db.query(ParticipantSession).filter(ParticipantSession.experiment_id == exp.id).all()
    session_ids = [s.id for s in sessions]

    versions = db.query(ExperimentVersion).filter(ExperimentVersion.experiment_id == exp.id).all()
    version_map = {v.id: v.version_number for v in versions}

    trials = db.query(TrialResult).filter(TrialResult.session_id.in_(session_ids)).order_by(
        TrialResult.session_id, TrialResult.sequence_number
    ).all() if session_ids else []

    trials_by_session: Dict[str, List[Dict[str, Any]]] = {}
    for t in trials:
        if t.session_id not in trials_by_session:
            trials_by_session[t.session_id] = []
        trials_by_session[t.session_id].append({
            "trial_id": t.trial_id,
            "sequence_number": t.sequence_number,
            "condition": t.condition,
            "stimulus_id": t.stimulus_id,
            "response_data": t.response_data,
            "timing_data": t.timing_data,
            "recorded_at": t.created_at.isoformat() if t.created_at else None
        })

    session_list = []
    for s in sessions:
        session_list.append({
            "participant_id": s.participant_id,
            "experiment_version": version_map.get(s.experiment_version_id, 1),
            "status": s.status,
            "started_at": s.started_at.isoformat() if s.started_at else None,
            "completed_at": s.completed_at.isoformat() if s.completed_at else None,
            "participant_data": s.participant_data,
            "browser_metadata": s.browser_metadata,
            "trials": trials_by_session.get(s.id, [])
        })

    export_obj = {
        "experiment_id": exp.id,
        "name": exp.name,
        "public_id": exp.public_id,
        "current_version": exp.current_version_number,
        "retention_policy_days": exp.retention_days,
        "exported_at": exp.updated_at.isoformat() if exp.updated_at else None,
        "sessions": session_list
    }

    record_audit_log(
        db,
        action="DATA_EXPORT",
        actor=user,
        experiment_id=exp.id,
        metadata={"format": "JSON", "trials_count": len(trials), "sessions_count": len(sessions)}
    )

    return export_obj
