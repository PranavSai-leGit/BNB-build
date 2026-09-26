from pydantic import BaseModel, Field
from typing import Dict, Any, List, Optional
from datetime import datetime

class BrowserMetadata(BaseModel):
    user_agent: Optional[str] = None
    screen_width: Optional[int] = None
    screen_height: Optional[int] = None
    device_pixel_ratio: Optional[float] = None
    estimated_refresh_rate: Optional[float] = None
    timing_api_supported: bool = True
    timing_quality: Optional[str] = "Normal" # "Good", "Normal", "Review recommended"
    hardware_concurrency: Optional[int] = None

class InitSessionRequest(BaseModel):
    participant_data: Optional[Dict[str, Any]] = Field(default_factory=dict)
    browser_metadata: Optional[BrowserMetadata] = None

class InitSessionResponse(BaseModel):
    session_id: str
    participant_id: str
    experiment_id: str
    experiment_version_id: str
    experiment_version_number: int
    definition: Dict[str, Any]
    settings: Dict[str, Any]
    consent: Dict[str, Any]

class ConsentSubmissionRequest(BaseModel):
    accepted: bool
    consent_version: str = "1.0"

class ConsentResponse(BaseModel):
    session_id: str
    accepted: bool
    accepted_at: datetime
    status: str

class TrialEventSubmissionRequest(BaseModel):
    trial_id: str
    sequence_number: int
    condition: Optional[str] = None
    stimulus_id: Optional[str] = None
    response_data: Dict[str, Any] = Field(default_factory=dict)
    timing_data: Dict[str, Any] = Field(default_factory=dict)

class BatchTrialEventRequest(BaseModel):
    events: List[TrialEventSubmissionRequest]

class SessionCompleteRequest(BaseModel):
    withdrawal_requested: bool = False
    browser_timing_summary: Optional[Dict[str, Any]] = None

class ParticipantSessionOut(BaseModel):
    id: str
    experiment_id: str
    experiment_version_id: str
    participant_id: str
    status: str
    participant_data: Dict[str, Any]
    browser_metadata: Dict[str, Any]
    started_at: datetime
    completed_at: Optional[datetime] = None
    trial_count: Optional[int] = 0

    class Config:
        from_attributes = True
