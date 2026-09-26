import statistics
from typing import Dict, Any, List, Optional
from datetime import datetime
from collections import defaultdict
from sqlalchemy.orm import Session
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession, TrialResult

def analyze_quality_root_causes(
    experiment: Experiment,
    db: Session,
    include_pilot: bool = False
) -> Dict[str, Any]:
    """
    Data Quality Root-Cause Explorer.
    Analyzes quality signals across:
    - Trial / Block
    - Condition
    - Device / Browser (ethically, privacy-preserving)
    - Timing Quality
    - Stimulus
    - Session Stage & Dropout Points
    - Response Patterns

    Uses 'possible cause' and 'evidence' language.
    Does NOT claim causal certainty and does NOT automatically exclude participants.
    Provides hierarchical drill-down:
    Overall Quality -> Identified Issues -> Supporting Signals -> Affected Trials/Conditions/Sessions.
    """
    sessions_query = db.query(ParticipantSession).filter(
        ParticipantSession.experiment_id == experiment.id
    )
    if not include_pilot:
        sessions_query = sessions_query.filter(ParticipantSession.is_pilot == False)

    sessions = sessions_query.all()
    total_sessions = len(sessions)

    if total_sessions == 0:
        return {
            "total_sessions": 0,
            "identified_issues": [],
            "issues_count": 0,
            "breakdowns": {
                "device": {"desktop": {"total": 0, "completed": 0, "dropouts": 0, "fast_rts": 0, "frame_drops": 0, "sessions": []}, "mobile": {"total": 0, "completed": 0, "dropouts": 0, "fast_rts": 0, "frame_drops": 0, "sessions": []}},
                "condition": [],
                "block": [],
                "dropouts": [],
                "repetitive_sessions": []
            },
            "evaluated_at": datetime.utcnow().isoformat()
        }

    session_ids = [s.id for s in sessions]
    trials = db.query(TrialResult).filter(
        TrialResult.session_id.in_(session_ids)
    ).order_by(TrialResult.sequence_number).all()

    # Data structures for dimensional indexing
    trials_by_session = defaultdict(list)
    for t in trials:
        trials_by_session[t.session_id].append(t)

    # 1. Dimension: Device & Browser Analysis
    device_metrics = {
        "desktop": {"total": 0, "completed": 0, "dropouts": 0, "fast_rts": 0, "frame_drops": 0, "sessions": []},
        "mobile": {"total": 0, "completed": 0, "dropouts": 0, "fast_rts": 0, "frame_drops": 0, "sessions": []}
    }

    # 2. Dimension: Condition Analysis
    condition_metrics = defaultdict(lambda: {
        "total_trials": 0, "fast_rts": 0, "slow_rts": 0, "timeouts": 0, "errors": 0, "rts": [], "affected_sessions": set()
    })

    # 3. Dimension: Trial / Block Analysis (Split by blocks of 5 trials)
    block_metrics = defaultdict(lambda: {
        "total_trials": 0, "fast_rts": 0, "slow_rts": 0, "timeouts": 0, "errors": 0, "rts": [], "affected_sessions": set()
    })

    # 4. Dimension: Stimulus Analysis
    stimulus_metrics = defaultdict(lambda: {
        "total_trials": 0, "timeouts": 0, "errors": 0, "rts": [], "affected_sessions": set()
    })

    # 5. Dimension: Dropout Points
    dropout_points = defaultdict(int)

    # 6. Dimension: Response Patterns (Repetitive runs)
    repetitive_sessions = []

    for s in sessions:
        b_meta = s.browser_metadata or {}
        is_mobile = b_meta.get("is_mobile", False) or "mobile" in str(b_meta.get("user_agent", "")).lower()
        dev_key = "mobile" if is_mobile else "desktop"

        device_metrics[dev_key]["total"] += 1
        device_metrics[dev_key]["sessions"].append(s.id)

        if s.status == "completed":
            device_metrics[dev_key]["completed"] += 1
        else:
            device_metrics[dev_key]["dropouts"] += 1

        frame_drops = b_meta.get("frame_drops", 0)
        device_metrics[dev_key]["frame_drops"] += frame_drops

        s_trials = trials_by_session[s.id]
        if s.status != "completed":
            last_seq = s_trials[-1].sequence_number if s_trials else 0
            dropout_points[f"Trial {last_seq + 1}"] += 1

        # Check response repetition
        responses = [str((t.response_data or {}).get("key") or (t.response_data or {}).get("button") or "") for t in s_trials]
        responses = [r for r in responses if r]
        max_rep = 1
        curr_rep = 1
        for i in range(1, len(responses)):
            if responses[i] == responses[i-1]:
                curr_rep += 1
                if curr_rep > max_rep:
                    max_rep = curr_rep
            else:
                curr_rep = 1
        if max_rep >= 6:
            repetitive_sessions.append({"session_id": s.id, "participant_id": s.participant_id, "max_consecutive": max_rep})

        for t in s_trials:
            seq = t.sequence_number
            block_idx = (seq // 5) + 1
            block_name = f"Block {block_idx}"

            cond = str(t.condition or "default").strip()
            stim = str(t.stimulus_id or "unnamed_stimulus")

            t_resp = t.response_data or {}
            t_timing = t.timing_data or {}
            rt = t_timing.get("reaction_time_ms") or t_resp.get("reaction_time")

            is_fast = False
            is_slow = False
            is_timeout = t_resp.get("timed_out", False) or (rt is None and not t_resp.get("key"))
            is_error = t_resp.get("is_correct") is False

            if rt is not None and isinstance(rt, (int, float)):
                rt_val = float(rt)
                if rt_val < 150.0:
                    is_fast = True
                    device_metrics[dev_key]["fast_rts"] += 1
                elif rt_val > 2500.0:
                    is_slow = True

                condition_metrics[cond]["rts"].append(rt_val)
                block_metrics[block_name]["rts"].append(rt_val)
                stimulus_metrics[stim]["rts"].append(rt_val)

            condition_metrics[cond]["total_trials"] += 1
            block_metrics[block_name]["total_trials"] += 1
            stimulus_metrics[stim]["total_trials"] += 1

            if is_fast:
                condition_metrics[cond]["fast_rts"] += 1
                condition_metrics[cond]["affected_sessions"].add(s.id)
                block_metrics[block_name]["fast_rts"] += 1
                block_metrics[block_name]["affected_sessions"].add(s.id)

            if is_slow:
                condition_metrics[cond]["slow_rts"] += 1
                condition_metrics[cond]["affected_sessions"].add(s.id)
                block_metrics[block_name]["slow_rts"] += 1
                block_metrics[block_name]["affected_sessions"].add(s.id)

            if is_timeout:
                condition_metrics[cond]["timeouts"] += 1
                condition_metrics[cond]["affected_sessions"].add(s.id)
                block_metrics[block_name]["timeouts"] += 1
                block_metrics[block_name]["affected_sessions"].add(s.id)
                stimulus_metrics[stim]["timeouts"] += 1
                stimulus_metrics[stim]["affected_sessions"].add(s.id)

            if is_error:
                condition_metrics[cond]["errors"] += 1
                condition_metrics[cond]["affected_sessions"].add(s.id)
                block_metrics[block_name]["errors"] += 1
                block_metrics[block_name]["affected_sessions"].add(s.id)
                stimulus_metrics[stim]["errors"] += 1
                stimulus_metrics[stim]["affected_sessions"].add(s.id)

    # Compile Identified Quality Issues with Supporting Signals & Possible Causes
    identified_issues: List[Dict[str, Any]] = []

    # 1. Device Disparity Check
    mob_total = device_metrics["mobile"]["total"]
    desk_total = device_metrics["desktop"]["total"]
    if mob_total > 0:
        mob_dropout_rate = round((device_metrics["mobile"]["dropouts"] / mob_total * 100), 1)
        desk_dropout_rate = round((device_metrics["desktop"]["dropouts"] / desk_total * 100), 1) if desk_total > 0 else 0
        mob_frame_drops = device_metrics["mobile"]["frame_drops"]

        if mob_dropout_rate > desk_dropout_rate + 20 or mob_frame_drops > 3:
            identified_issues.append({
                "id": "issue_mobile_disparity",
                "scope": "device",
                "target": "Mobile / Touchscreen Sessions",
                "severity": "high" if mob_dropout_rate > 40 else "medium",
                "title": "Possible device-specific attrition & timing degradation",
                "evidence_signals": [
                    f"Mobile session dropout rate ({mob_dropout_rate}%) substantially higher than desktop ({desk_dropout_rate}%).",
                    f"Recorded {mob_frame_drops} display frame drops across {mob_total} mobile sessions.",
                    f"Mobile sessions represent {round(mob_total / total_sessions * 100, 1)}% of total study intake."
                ],
                "possible_cause": "Evidence suggests touchscreen capacitive input latency, mobile browser tab backgrounding, or responsive viewport scaling issues may be disproportionately impacting mobile participants.",
                "affected_sessions_count": mob_total,
                "affected_sessions": device_metrics["mobile"]["sessions"],
                "recommendation": "Review mobile participant eligibility. If sub-millisecond keyboard precision is required, restrict study to desktop computers in Experiment Settings."
            })

    # 2. Block-Specific Attrition / Fatigue
    sorted_blocks = sorted(block_metrics.keys())
    for b_name in sorted_blocks:
        b_data = block_metrics[b_name]
        b_total = b_data["total_trials"]
        if b_total > 0:
            timeout_rate = (b_data["timeouts"] / b_total) * 100
            error_rate = (b_data["errors"] / b_total) * 100
            fast_rate = (b_data["fast_rts"] / b_total) * 100

            if timeout_rate > 15 or fast_rate > 20:
                signals = []
                if timeout_rate > 15:
                    signals.append(f"Omission/timeout rate spiked to {round(timeout_rate, 1)}% in {b_name}.")
                if fast_rate > 20:
                    signals.append(f"Anticipatory/rapid keypresses (<150ms) elevated at {round(fast_rate, 1)}%.")
                if len(b_data["affected_sessions"]) > 0:
                    signals.append(f"Impacted {len(b_data['affected_sessions'])} distinct participant sessions.")

                identified_issues.append({
                    "id": f"issue_block_deterioration_{b_name.lower().replace(' ', '_')}",
                    "scope": "block",
                    "target": b_name,
                    "severity": "medium",
                    "title": f"Possible quality issue detected in {b_name}",
                    "evidence_signals": signals,
                    "possible_cause": f"Supporting signals indicate participant fatigue, attention lapse, or instruction confusion emerging around {b_name}.",
                    "affected_sessions_count": len(b_data["affected_sessions"]),
                    "affected_sessions": list(b_data["affected_sessions"]),
                    "recommendation": f"Consider introducing a brief self-paced rest pause or reminder prompt prior to {b_name}."
                })

    # 3. Stimulus-Specific Bottlenecks
    for stim_id, s_data in stimulus_metrics.items():
        s_total = s_data["total_trials"]
        if s_total >= 5:
            err_rate = (s_data["errors"] / s_total) * 100
            tout_rate = (s_data["timeouts"] / s_total) * 100
            if err_rate > 40 or tout_rate > 25:
                identified_issues.append({
                    "id": f"issue_stimulus_{stim_id.lower().replace(' ', '_')}",
                    "scope": "stimulus",
                    "target": f"Stimulus: '{stim_id}'",
                    "severity": "medium",
                    "title": f"Anomalous error/timeout concentration on stimulus '{stim_id}'",
                    "evidence_signals": [
                        f"{round(err_rate, 1)}% error rate observed across {s_total} trial presentations.",
                        f"{s_data['timeouts']} timeouts recorded for this stimulus asset.",
                        f"Average response time: {round(statistics.mean(s_data['rts']), 1) if s_data['rts'] else 'N/A'}ms."
                    ],
                    "possible_cause": "Evidence suggests potential perceptual ambiguity, counterintuitive response mapping, or asset loading delay on this specific item.",
                    "affected_sessions_count": len(s_data["affected_sessions"]),
                    "affected_sessions": list(s_data["affected_sessions"]),
                    "recommendation": "Inspect stimulus asset rendering clarity and confirm expected response mapping in Builder."
                })

    # 4. Response Pattern (Perseveration / Bot-like repetition)
    if len(repetitive_sessions) > 0:
        rep_ids = [r["session_id"] for r in repetitive_sessions]
        identified_issues.append({
            "id": "issue_response_perseveration",
            "scope": "pattern",
            "target": "Repetitive Keypress Runs",
            "severity": "low",
            "title": f"Repetitive response patterns detected across {len(repetitive_sessions)} session(s)",
            "evidence_signals": [
                f"{len(repetitive_sessions)} participant session(s) submitted identical key/button selections >= 6 consecutive trials.",
                f"Peak consecutive run: {max(r['max_consecutive'] for r in repetitive_sessions)} identical trials."
            ],
            "possible_cause": "Possible participant disengagement, lack of task adherence, or blind key tapping without stimulus attendance.",
            "affected_sessions_count": len(repetitive_sessions),
            "affected_sessions": rep_ids,
            "recommendation": "Use sensitivity filtering to evaluate whether excluding perseverative runs alters your condition effect size."
        })

    # Prepare formatted breakdowns for drill-down UI
    condition_breakdown = []
    for cond_name, c_data in condition_metrics.items():
        mean_rt = round(statistics.mean(c_data["rts"]), 1) if c_data["rts"] else 0.0
        condition_breakdown.append({
            "condition": cond_name,
            "total_trials": c_data["total_trials"],
            "mean_rt_ms": mean_rt,
            "fast_rts": c_data["fast_rts"],
            "slow_rts": c_data["slow_rts"],
            "timeouts": c_data["timeouts"],
            "errors": c_data["errors"],
            "affected_sessions_count": len(c_data["affected_sessions"])
        })

    block_breakdown = []
    for b_name in sorted_blocks:
        b_data = block_metrics[b_name]
        mean_rt = round(statistics.mean(b_data["rts"]), 1) if b_data["rts"] else 0.0
        block_breakdown.append({
            "block": b_name,
            "total_trials": b_data["total_trials"],
            "mean_rt_ms": mean_rt,
            "fast_rts": b_data["fast_rts"],
            "slow_rts": b_data["slow_rts"],
            "timeouts": b_data["timeouts"],
            "errors": b_data["errors"],
            "affected_sessions_count": len(b_data["affected_sessions"])
        })

    dropout_breakdown = [{"stage": k, "count": v} for k, v in sorted(dropout_points.items(), key=lambda x: x[1], reverse=True)]

    return {
        "total_sessions": total_sessions,
        "identified_issues": identified_issues,
        "issues_count": len(identified_issues),
        "breakdowns": {
            "device": device_metrics,
            "condition": condition_breakdown,
            "block": block_breakdown,
            "dropouts": dropout_breakdown,
            "repetitive_sessions": repetitive_sessions
        },
        "evaluated_at": datetime.utcnow().isoformat()
    }
