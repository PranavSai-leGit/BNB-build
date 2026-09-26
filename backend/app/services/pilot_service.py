import random
from typing import Dict, Any, List, Optional
from datetime import datetime, timedelta
from sqlalchemy.orm import Session
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession, TrialResult, ConsentRecord

def format_duration(seconds: float) -> str:
    """Formats duration seconds into human-readable string (e.g. '11m 24s')."""
    if seconds <= 0:
        return "0s"
    mins = int(seconds // 60)
    secs = int(seconds % 60)
    if mins > 0:
        return f"{mins}m {secs}s"
    return f"{secs}s"

def generate_pilot_report(
    experiment: Experiment,
    version: ExperimentVersion,
    db: Session
) -> Dict[str, Any]:
    """
    Produces comprehensive, actionable Pilot Mode diagnostic report.
    Assesses completion time, dropouts, branch coverage, condition balance,
    timing warnings, device issues, and participant burden.
    """
    definition = version.definition or {}
    nodes = definition.get("nodes", [])
    edges = definition.get("edges", [])
    total_nodes_count = len(nodes)
    node_ids = set(n.get("id") for n in nodes if n.get("id"))

    # Fetch pilot sessions for this version
    pilot_sessions = db.query(ParticipantSession).filter(
        ParticipantSession.experiment_id == experiment.id,
        ParticipantSession.experiment_version_id == version.id,
        ParticipantSession.is_pilot == True
    ).all()

    total_sessions = len(pilot_sessions)
    completed_sessions = [s for s in pilot_sessions if s.status == "completed"]
    dropout_sessions = [s for s in pilot_sessions if s.status != "completed"]

    completed_count = len(completed_sessions)
    dropout_count = len(dropout_sessions)
    dropout_rate_pct = round((dropout_count / total_sessions * 100), 1) if total_sessions > 0 else 0.0

    # Calculate completion times
    durations: List[float] = []
    for s in completed_sessions:
        if s.started_at and s.completed_at:
            dur = (s.completed_at - s.started_at).total_seconds()
            if dur > 0:
                durations.append(dur)

    avg_duration_sec = round(sum(durations) / len(durations), 1) if durations else 0.0
    avg_duration_formatted = format_duration(avg_duration_sec)

    # Fetch trial results from pilot sessions
    session_ids = [s.id for s in pilot_sessions]
    trials = db.query(TrialResult).filter(
        TrialResult.session_id.in_(session_ids)
    ).all() if session_ids else []

    # Node & branch coverage
    nodes_reached = set()
    condition_counts: Dict[str, int] = {}
    missing_responses_count = 0
    total_trials_count = len(trials)
    early_rts: List[float] = []
    late_rts: List[float] = []

    for t in trials:
        if t.trial_id:
            nodes_reached.add(t.trial_id)
        cond = t.condition or "default"
        condition_counts[cond] = condition_counts.get(cond, 0) + 1

        t_resp = t.response_data or {}
        t_timing = t.timing_data or {}
        rt = t_timing.get("reaction_time_ms") or t_resp.get("reaction_time")

        if rt is not None and isinstance(rt, (int, float)):
            if t.sequence_number <= 3:
                early_rts.append(float(rt))
            else:
                late_rts.append(float(rt))
        else:
            missing_responses_count += 1

    # Unreachable nodes
    unreachable_nodes = [n.get("id") for n in nodes if n.get("id") and n.get("id") not in nodes_reached and n.get("type") not in ["start"]]
    branch_coverage_pct = round((len(nodes_reached) / total_nodes_count * 100), 1) if total_nodes_count > 0 else 100.0

    # Timing and Device diagnostics
    timing_warnings_count = 0
    mobile_sessions_count = 0
    mobile_dropouts_count = 0
    desktop_sessions_count = 0

    for s in pilot_sessions:
        b_meta = s.browser_metadata or {}
        frame_drops = b_meta.get("frame_drops", 0)
        jitter = b_meta.get("frame_jitter_std", 0)
        is_mobile = b_meta.get("is_mobile", False) or "mobile" in str(b_meta.get("user_agent", "")).lower()

        if frame_drops > 0 or jitter > 10.0:
            timing_warnings_count += 1

        if is_mobile:
            mobile_sessions_count += 1
            if s.status != "completed":
                mobile_dropouts_count += 1
        else:
            desktop_sessions_count += 1

    mobile_dropout_rate = round((mobile_dropouts_count / mobile_sessions_count * 100), 1) if mobile_sessions_count > 0 else 0.0

    # Missing stimuli check
    missing_stimuli = []
    for n in nodes:
        if n.get("type") == "stimulus":
            props = n.get("props", {})
            stype = props.get("stimulus_type", "text")
            if stype == "image" and not props.get("stimulus_url"):
                missing_stimuli.append(n.get("label", n.get("id")))
            elif stype == "text" and not props.get("stimulus_content"):
                missing_stimuli.append(n.get("label", n.get("id")))

    # Participant burden estimation
    # Burden based on session duration, trial count, and RT fatigue
    burden_score = 2.0
    if avg_duration_sec > 900: # >15 min
        burden_score += 4.0
    elif avg_duration_sec > 600: # >10 min
        burden_score += 2.5
    elif avg_duration_sec > 300: # >5 min
        burden_score += 1.0

    if total_nodes_count > 40:
        burden_score += 2.0
    elif total_nodes_count > 20:
        burden_score += 1.0

    rt_slowing_ms = 0.0
    if early_rts and late_rts:
        rt_slowing_ms = round(sum(late_rts) / len(late_rts) - sum(early_rts) / len(early_rts), 1)
        if rt_slowing_ms > 80:
            burden_score += 1.5

    burden_score = min(10.0, round(burden_score, 1))
    burden_level = "High" if burden_score >= 7.0 else "Moderate" if burden_score >= 4.0 else "Low"

    # Actionable Findings
    findings: List[Dict[str, Any]] = []

    # 1. Reachability
    if len(unreachable_nodes) == 0 and total_sessions > 0:
        findings.append({
            "status": "success",
            "icon": "check",
            "title": "All nodes reachable",
            "message": f"100% of study nodes and conditional branches were traversed during pilot test runs."
        })
    elif len(unreachable_nodes) > 0 and total_sessions > 0:
        findings.append({
            "status": "warning",
            "icon": "alert",
            "title": f"Unreached paths detected ({len(unreachable_nodes)} nodes)",
            "message": f"{len(unreachable_nodes)} node(s) were never visited during pilot runs ({', '.join(unreachable_nodes[:3])}). Verify condition branch connections."
        })

    # 2. Timing warnings
    if timing_warnings_count == 0 and total_sessions > 0:
        findings.append({
            "status": "success",
            "icon": "check",
            "title": "Timing fidelity verified",
            "message": "Zero display frame drops or refresh jitter warnings recorded across pilot sessions."
        })
    elif timing_warnings_count > 0:
        findings.append({
            "status": "warning",
            "icon": "alert",
            "title": f"{timing_warnings_count} timing warning(s) detected",
            "message": f"{timing_warnings_count} pilot participant session(s) recorded display jitter or dropped frames during stimulus onset."
        })

    # 3. Mobile dropouts
    if mobile_sessions_count > 0 and mobile_dropout_rate > 30.0:
        findings.append({
            "status": "warning",
            "icon": "alert",
            "title": "Mobile dropout rate high",
            "message": f"Mobile participants had a {mobile_dropout_rate}% dropout rate. Consider restricting to desktop/laptop devices in experiment settings."
        })

    # 4. Average completion time
    if avg_duration_sec > 0:
        time_status = "warning" if avg_duration_sec > 720 else "info"
        findings.append({
            "status": time_status,
            "icon": "clock",
            "title": f"Average completion time: {avg_duration_formatted}",
            "message": f"Tested across {completed_count} completed pilot session(s). Estimated participant burden: {burden_level} ({burden_score}/10)."
        })

    # 5. Missing response data
    if missing_responses_count > 0:
        pct_miss = round((missing_responses_count / total_trials_count * 100), 1) if total_trials_count > 0 else 0
        findings.append({
            "status": "warning",
            "icon": "alert",
            "title": f"Missing response data: {missing_responses_count} trials ({pct_miss}%)",
            "message": f"Participants timed out or omitted inputs on {missing_responses_count} trial(s)."
        })

    # 6. Condition Balance
    if len(condition_counts) >= 2:
        counts = list(condition_counts.values())
        if max(counts) > min(counts) * 2 and min(counts) > 0:
            findings.append({
                "status": "warning",
                "icon": "alert",
                "title": "Condition observation imbalance in pilot",
                "message": f"Significant disparity in observations across conditions ({', '.join([f'{k}: {v}' for k, v in condition_counts.items()])})."
            })

    # If no pilot sessions yet
    if total_sessions == 0:
        findings.append({
            "status": "info",
            "icon": "info",
            "title": "No pilot sessions recorded yet",
            "message": "Launch a pilot run with the test link below or run a simulated dry-run to verify runtime execution."
        })

    return {
        "experiment_id": experiment.id,
        "version_number": version.version_number,
        "total_pilot_sessions": total_sessions,
        "completed_sessions": completed_count,
        "dropout_sessions": dropout_count,
        "dropout_rate_pct": dropout_rate_pct,
        "average_duration_seconds": avg_duration_sec,
        "average_duration_formatted": avg_duration_formatted,
        "branch_coverage_pct": branch_coverage_pct,
        "nodes_reached_count": len(nodes_reached),
        "total_nodes_count": total_nodes_count,
        "unreachable_nodes": unreachable_nodes,
        "condition_balance": condition_counts,
        "missing_stimuli": missing_stimuli,
        "timing_warnings_count": timing_warnings_count,
        "device_breakdown": {
            "desktop_count": desktop_sessions_count,
            "mobile_count": mobile_sessions_count,
            "mobile_dropout_rate_pct": mobile_dropout_rate
        },
        "missing_responses_count": missing_responses_count,
        "participant_burden": {
            "score": burden_score,
            "level": burden_level,
            "rt_fatigue_slowing_ms": rt_slowing_ms
        },
        "actionable_findings": findings,
        "generated_at": datetime.utcnow().isoformat()
    }


def create_simulated_pilot_run(
    experiment: Experiment,
    version: ExperimentVersion,
    db: Session,
    participant_count: int = 5
) -> Dict[str, Any]:
    """
    Creates realistic simulated pilot runs to validate branch coverage,
    timing telemetry, and trial logging before real-world testing.
    Marked explicitly with is_pilot=True.
    """
    definition = version.definition or {}
    nodes = definition.get("nodes", [])

    created_sessions = []
    for i in range(participant_count):
        # 1. Session
        is_mobile = (i == 0) # Simulate 1 mobile user
        session = ParticipantSession(
            experiment_id=experiment.id,
            experiment_version_id=version.id,
            status="completed" if i < participant_count - 1 else "withdrawn", # 1 dropout
            participant_data={"age": 22 + i, "handedness": "Right", "sleep_hours": 7},
            browser_metadata={
                "is_mobile": is_mobile,
                "user_agent": "Mobile Safari" if is_mobile else "Chrome 122 on Windows",
                "screen_width": 390 if is_mobile else 1920,
                "screen_height": 844 if is_mobile else 1080,
                "frame_drops": 2 if is_mobile else 0,
                "frame_jitter_std": 8.4 if is_mobile else 1.2,
                "timing_quality": "Review recommended" if is_mobile else "Good"
            },
            is_pilot=True,
            started_at=datetime.utcnow() - timedelta(minutes=12 - i),
            completed_at=datetime.utcnow() - timedelta(minutes=1) if i < participant_count - 1 else None
        )
        db.add(session)
        db.flush()

        # 2. Consent
        consent = ConsentRecord(
            session_id=session.id,
            consent_version="1.0",
            accepted=True,
            accepted_at=session.started_at,
            withdrawal_requested=(session.status == "withdrawn")
        )
        db.add(consent)

        # 3. Trial results
        seq = 0
        for n in nodes:
            if n.get("type") in ["stimulus", "response"]:
                props = n.get("props", {})
                cond = props.get("condition") or props.get("condition_name") or "congruent"
                is_congruent = "congruent" in cond.lower() and "incongruent" not in cond.lower()
                base_rt = 420.0 if is_congruent else 580.0
                rt = round(random.gauss(base_rt, 45.0), 1)

                tr = TrialResult(
                    session_id=session.id,
                    trial_id=n.get("id"),
                    sequence_number=seq,
                    condition=cond,
                    stimulus_id=props.get("stimulus_content", "trial_stim"),
                    response_data={"key": "ArrowLeft", "is_correct": True, "timed_out": False},
                    timing_data={"reaction_time_ms": rt, "stimulus_onset_perf": seq * 1500.0}
                )
                db.add(tr)
                seq += 1

        created_sessions.append(session.id)

    db.commit()
    return generate_pilot_report(experiment, version, db)
