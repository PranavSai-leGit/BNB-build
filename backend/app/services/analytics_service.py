from typing import Dict, Any, List
from sqlalchemy.orm import Session
from app.models.experiment import Experiment
from app.models.participant import ParticipantSession, TrialResult
from app.schemas.analytics import ExperimentAnalyticsOut, ReactionTimeBucket, ConditionMetric, SessionSummary

def get_experiment_analytics(db: Session, exp: Experiment) -> ExperimentAnalyticsOut:
    sessions = db.query(ParticipantSession).filter(
        ParticipantSession.experiment_id == exp.id,
        ParticipantSession.is_pilot == False
    ).all()
    session_ids = [s.id for s in sessions]

    total_participants = len(sessions)
    completed_sessions = [s for s in sessions if s.status == "completed"]
    completed_count = len(completed_sessions)
    completion_rate = (completed_count / total_participants * 100.0) if total_participants > 0 else 0.0

    trial_results = db.query(TrialResult).filter(TrialResult.session_id.in_(session_ids)).all() if session_ids else []

    reaction_times: List[float] = []
    correct_count = 0
    accuracy_evaluable_count = 0

    condition_data: Dict[str, Dict[str, Any]] = {}
    timing_quality_counts: Dict[str, int] = {"Good": 0, "Normal": 0, "Review recommended": 0}

    # Browser timing diagnostics count
    for s in sessions:
        meta = s.browser_metadata or {}
        quality = meta.get("timing_quality", "Normal")
        timing_quality_counts[quality] = timing_quality_counts.get(quality, 0) + 1

    # Reaction time and accuracy processing
    for tr in trial_results:
        timing = tr.timing_data or {}
        resp = tr.response_data or {}
        cond = tr.condition or "standard"

        if cond not in condition_data:
            condition_data[cond] = {"rts": [], "correct": 0, "total": 0}
        condition_data[cond]["total"] += 1

        rt = timing.get("reaction_time")
        if rt is not None and isinstance(rt, (int, float)) and rt > 0:
            reaction_times.append(float(rt))
            condition_data[cond]["rts"].append(float(rt))

        if "is_correct" in resp:
            accuracy_evaluable_count += 1
            if resp["is_correct"] is True:
                correct_count += 1
                condition_data[cond]["correct"] += 1
        elif "accuracy" in resp:
            accuracy_evaluable_count += 1
            acc_val = resp["accuracy"]
            if acc_val == 1 or acc_val is True:
                correct_count += 1
                condition_data[cond]["correct"] += 1

    avg_rt = round(sum(reaction_times) / len(reaction_times), 2) if reaction_times else 0.0
    overall_acc = round(correct_count / accuracy_evaluable_count * 100.0, 1) if accuracy_evaluable_count > 0 else 100.0

    # RT Histogram
    bins = [
        ("< 250ms", lambda x: x < 250),
        ("250-400ms", lambda x: 250 <= x < 400),
        ("400-600ms", lambda x: 400 <= x < 600),
        ("600-800ms", lambda x: 600 <= x < 800),
        ("800-1100ms", lambda x: 800 <= x < 1100),
        ("> 1100ms", lambda x: x >= 1100)
    ]
    histogram: List[ReactionTimeBucket] = []
    for label, pred in bins:
        count = sum(1 for x in reaction_times if pred(x))
        histogram.append(ReactionTimeBucket(bucket=label, count=count))

    # Condition breakdown
    conditions_list: List[ConditionMetric] = []
    for cond_name, stats in condition_data.items():
        cond_rts = stats["rts"]
        c_avg_rt = round(sum(cond_rts) / len(cond_rts), 2) if cond_rts else 0.0
        c_acc = round(stats["correct"] / stats["total"] * 100.0, 1) if stats["total"] > 0 else 0.0
        conditions_list.append(ConditionMetric(
            condition=cond_name,
            trials_count=stats["total"],
            avg_reaction_time=c_avg_rt,
            accuracy_percent=c_acc
        ))

    # Recent session summaries (latest 10)
    recent_sessions: List[SessionSummary] = []
    for s in sorted(sessions, key=lambda x: x.started_at, reverse=True)[:10]:
        s_trials = [t for t in trial_results if t.session_id == s.id]
        s_rts = [float(t.timing_data["reaction_time"]) for t in s_trials if t.timing_data and t.timing_data.get("reaction_time")]
        s_avg_rt = round(sum(s_rts) / len(s_rts), 1) if s_rts else None
        
        s_evaluable = [t for t in s_trials if t.response_data and ("is_correct" in t.response_data or "accuracy" in t.response_data)]
        s_correct = sum(1 for t in s_evaluable if t.response_data.get("is_correct") is True or t.response_data.get("accuracy") == 1)
        s_acc = round(s_correct / len(s_evaluable) * 100.0, 1) if s_evaluable else None

        recent_sessions.append(SessionSummary(
            session_id=s.id,
            participant_id=s.participant_id,
            status=s.status,
            trials_completed=len(s_trials),
            avg_rt=s_avg_rt,
            accuracy=s_acc,
            started_at=s.started_at,
            completed_at=s.completed_at
        ))

    return ExperimentAnalyticsOut(
        experiment_id=exp.id,
        experiment_name=exp.name,
        total_participants=total_participants,
        completed_participants=completed_count,
        completion_rate_percent=round(completion_rate, 1),
        overall_avg_rt=avg_rt,
        overall_accuracy_percent=overall_acc,
        rt_histogram=histogram,
        condition_breakdown=conditions_list,
        timing_quality_breakdown=timing_quality_counts,
        recent_sessions=recent_sessions
    )
