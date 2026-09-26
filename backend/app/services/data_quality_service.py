import statistics
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.participant import ParticipantSession, TrialResult
from app.models.experiment import Experiment

def evaluate_session_quality(
    session: ParticipantSession,
    custom_rules: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Evaluates participant session for data quality signals.
    Does NOT permanently exclude or delete any participant.
    Flags reliability concerns for researcher review.
    """
    signals: List[Dict[str, Any]] = []
    trials = session.trial_results or []
    browser_meta = session.browser_metadata or {}
    
    # Extract trial metrics
    reaction_times: List[float] = []
    responses: List[str] = []
    attention_check_fails = 0
    attention_check_total = 0
    fast_responses = 0
    slow_responses = 0
    missing_responses = 0

    for t in trials:
        t_data = t.response_data or {}
        t_timing = t.timing_data or {}
        condition = str(t.condition or "").lower()

        # Check attention / catch trials
        is_attention_check = "catch" in condition or "attention" in condition or t_data.get("is_catch_trial", False)
        if is_attention_check:
            attention_check_total += 1
            if not t_data.get("is_correct", False):
                attention_check_fails += 1

        rt = t_timing.get("reaction_time_ms") or t_data.get("reaction_time")
        if rt is not None and isinstance(rt, (int, float)):
            reaction_times.append(float(rt))
            if rt < 150.0:
                fast_responses += 1
            elif rt > 2500.0:
                slow_responses += 1
        elif t_data.get("timed_out", False) or not t_data.get("key") and not t_data.get("button"):
            missing_responses += 1

        key_pressed = t_data.get("key") or t_data.get("button")
        if key_pressed:
            responses.append(str(key_pressed))

    # 1. Attention Check Failure Signal
    if attention_check_fails > 0:
        severity = "critical" if attention_check_fails >= 2 else "warning"
        signals.append({
            "type": "attention_check_failure",
            "severity": severity,
            "count": attention_check_fails,
            "message": f"Participant failed {attention_check_fails} of {attention_check_total} attention checks."
        })

    # 2. Extremely Fast Responses (Anticipatory RT < 150ms)
    if fast_responses > 0:
        pct_fast = (fast_responses / len(reaction_times) * 100) if reaction_times else 0
        severity = "critical" if fast_responses >= 5 or pct_fast > 25 else "warning"
        signals.append({
            "type": "extremely_fast_responses",
            "severity": severity,
            "count": fast_responses,
            "message": f"{fast_responses} trials with anticipatory reaction time (< 150ms)."
        })

    # 3. Extremely Slow Responses (> 2500ms)
    if slow_responses >= 3:
        signals.append({
            "type": "extremely_slow_responses",
            "severity": "warning",
            "count": slow_responses,
            "message": f"{slow_responses} trials with unusually delayed responses (> 2500ms)."
        })

    # 4. Missing / Omitted Responses
    if missing_responses > 0:
        signals.append({
            "type": "missing_responses",
            "severity": "warning",
            "count": missing_responses,
            "message": f"Participant omitted or timed out on {missing_responses} trials."
        })

    # 5. High Response Variability / Jitter
    mean_rt = 0.0
    rt_std = 0.0
    if len(reaction_times) >= 4:
        mean_rt = statistics.mean(reaction_times)
        rt_std = statistics.stdev(reaction_times)
        cv = rt_std / mean_rt if mean_rt > 0 else 0
        if cv > 0.75 or rt_std > 450:
            signals.append({
                "type": "high_response_variability",
                "severity": "warning",
                "count": 1,
                "message": f"Elevated RT variability detected (SD: {round(rt_std, 1)}ms, CV: {round(cv, 2)})."
            })

    # 6. Suspiciously Repetitive Response Patterns (Same key repeatedly)
    if len(responses) >= 8:
        max_consecutive = 1
        curr_consecutive = 1
        for i in range(1, len(responses)):
            if responses[i] == responses[i - 1]:
                curr_consecutive += 1
                if curr_consecutive > max_consecutive:
                    max_consecutive = curr_consecutive
            else:
                curr_consecutive = 1
        if max_consecutive >= 8:
            signals.append({
                "type": "repetitive_response_pattern",
                "severity": "warning",
                "count": max_consecutive,
                "message": f"Suspicious response repetition: identical response entered {max_consecutive} consecutive trials."
            })

    # 7. Incomplete Sessions
    if session.status != "completed":
        signals.append({
            "type": "incomplete_session",
            "severity": "warning",
            "count": 1,
            "message": f"Session status is '{session.status}' rather than 'completed'."
        })

    # 8. Timing Diagnostics / Frame Drops from Browser Metadata
    frame_drops = browser_meta.get("frame_drops", 0)
    tab_switches = browser_meta.get("tab_hidden_count", 0)
    if frame_drops > 3:
        signals.append({
            "type": "timing_anomaly",
            "severity": "warning",
            "count": frame_drops,
            "message": f"Timing diagnostics recorded {frame_drops} display frame drops during stimulus presentation."
        })
    if tab_switches > 0:
        signals.append({
            "type": "tab_switch_anomaly",
            "severity": "warning",
            "count": tab_switches,
            "message": f"Participant switched browser tabs or minimized window {tab_switches} times during study."
        })

    # 9. Researcher-Defined Quality Rules
    if custom_rules:
        for rule in custom_rules:
            rtype = rule.get("rule_type", "")
            thresh = rule.get("threshold", 0)
            if rtype == "fast_rt_trials" and fast_responses >= thresh:
                signals.append({
                    "type": "custom_rule_triggered",
                    "severity": "warning",
                    "count": fast_responses,
                    "message": f"Custom rule matched: Fast RT (<150ms) exceeded threshold of {thresh} trials."
                })
            elif rtype == "attention_fails" and attention_check_fails >= thresh:
                signals.append({
                    "type": "custom_rule_triggered",
                    "severity": "critical",
                    "count": attention_check_fails,
                    "message": f"Custom rule matched: Attention check failures >= {thresh}."
                })

    # Calculate overall research quality status: 'good' | 'review' | 'poor'
    critical_count = sum(1 for s in signals if s.get("severity") == "critical")
    warning_count = sum(1 for s in signals if s.get("severity") == "warning")

    if critical_count >= 2 or (critical_count >= 1 and warning_count >= 2):
        status = "poor"
    elif critical_count >= 1 or warning_count >= 1:
        status = "review"
    else:
        status = "good"

    return {
        "session_id": session.id,
        "participant_id": session.participant_id,
        "status": status,
        "signals": signals,
        "metrics": {
            "total_trials": len(trials),
            "mean_rt_ms": round(mean_rt, 1),
            "rt_std_ms": round(rt_std, 1),
            "fast_responses_count": fast_responses,
            "slow_responses_count": slow_responses,
            "missing_responses_count": missing_responses,
            "attention_fails_count": attention_check_fails
        },
        "evaluated_at": datetime.utcnow().isoformat()
    }


def evaluate_experiment_quality_overview(
    experiment: Experiment,
    db: Session,
    custom_rules: Optional[List[Dict[str, Any]]] = None
) -> Dict[str, Any]:
    """
    Computes aggregated Data Quality Engine dashboard metrics across all sessions.
    """
    sessions = experiment.sessions or []
    evaluated_sessions = []
    status_counts = {"good": 0, "review": 0, "poor": 0}
    signal_histogram: Dict[str, int] = {}

    for s in sessions:
        res = evaluate_session_quality(s, custom_rules)
        evaluated_sessions.append(res)
        status_counts[res["status"]] = status_counts.get(res["status"], 0) + 1

        for sig in res.get("signals", []):
            stype = sig.get("type", "unknown")
            signal_histogram[stype] = signal_histogram.get(stype, 0) + 1

    total_sessions = len(sessions)
    quality_score = 100
    if total_sessions > 0:
        quality_score = round(
            ((status_counts["good"] * 1.0 + status_counts["review"] * 0.5) / total_sessions) * 100, 1
        )

    return {
        "total_sessions": total_sessions,
        "good": status_counts["good"],
        "review": status_counts["review"],
        "poor": status_counts["poor"],
        "quality_score_pct": quality_score,
        "common_signals": [
            {"signal": k, "count": v, "label": k.replace("_", " ").title()}
            for k, v in sorted(signal_histogram.items(), key=lambda x: x[1], reverse=True)
        ],
        "sessions": evaluated_sessions,
        "evaluated_at": datetime.utcnow().isoformat()
    }
