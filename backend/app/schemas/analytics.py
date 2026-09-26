from pydantic import BaseModel
from typing import List, Dict, Any, Optional
from datetime import datetime

class ReactionTimeBucket(BaseModel):
    bucket: str
    count: int

class ConditionMetric(BaseModel):
    condition: str
    trials_count: int
    avg_reaction_time: float
    accuracy_percent: float

class SessionSummary(BaseModel):
    session_id: str
    participant_id: str
    status: str
    trials_completed: int
    avg_rt: Optional[float] = None
    accuracy: Optional[float] = None
    started_at: datetime
    completed_at: Optional[datetime] = None

class ExperimentAnalyticsOut(BaseModel):
    experiment_id: str
    experiment_name: str
    total_participants: int
    completed_participants: int
    completion_rate_percent: float
    overall_avg_rt: float
    overall_accuracy_percent: float
    rt_histogram: List[ReactionTimeBucket]
    condition_breakdown: List[ConditionMetric]
    timing_quality_breakdown: Dict[str, int]
    recent_sessions: List[SessionSummary]

class AuditLogOut(BaseModel):
    id: str
    actor_id: Optional[str]
    actor_email: Optional[str]
    action: str
    experiment_id: Optional[str]
    metadata_json: Dict[str, Any]
    timestamp: datetime

    class Config:
        from_attributes = True
