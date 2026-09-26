import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, Boolean, DateTime, ForeignKey
from sqlalchemy.orm import relationship
from app.database import Base, JSON_TYPE

def generate_uuid():
    return str(uuid.uuid4())

def generate_pseudonym():
    return "P-" + uuid.uuid4().hex[:8].upper()

class ParticipantSession(Base):
    __tablename__ = "participant_sessions"

    id = Column(String, primary_key=True, default=generate_uuid)
    experiment_id = Column(String, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False, index=True)
    experiment_version_id = Column(String, ForeignKey("experiment_versions.id", ondelete="CASCADE"), nullable=False, index=True)
    participant_id = Column(String, default=generate_pseudonym, index=True, nullable=False)
    status = Column(String, default="started", index=True) # started, consented, in_progress, completed, withdrawn, timed_out
    participant_data = Column(JSON_TYPE, default=dict) # Dynamic researcher participant schema fields
    browser_metadata = Column(JSON_TYPE, default=dict) # High-res timing diagnostics, viewport, refresh rate
    is_pilot = Column(Boolean, default=False, index=True) # Separates pilot sessions from real study data
    started_at = Column(DateTime, default=datetime.utcnow)
    completed_at = Column(DateTime, nullable=True)

    experiment = relationship("Experiment", back_populates="sessions")
    experiment_version = relationship("ExperimentVersion", back_populates="sessions")
    consent_record = relationship("ConsentRecord", uselist=False, back_populates="session", cascade="all, delete-orphan")
    trial_results = relationship("TrialResult", back_populates="session", cascade="all, delete-orphan", order_by="TrialResult.sequence_number")

class ConsentRecord(Base):
    __tablename__ = "consent_records"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("participant_sessions.id", ondelete="CASCADE"), unique=True, nullable=False)
    consent_version = Column(String, default="1.0")
    accepted = Column(Boolean, default=False, nullable=False)
    accepted_at = Column(DateTime, default=datetime.utcnow)
    withdrawal_requested = Column(Boolean, default=False)
    withdrawal_at = Column(DateTime, nullable=True)

    session = relationship("ParticipantSession", back_populates="consent_record")

class TrialResult(Base):
    __tablename__ = "trial_results"

    id = Column(String, primary_key=True, default=generate_uuid)
    session_id = Column(String, ForeignKey("participant_sessions.id", ondelete="CASCADE"), nullable=False, index=True)
    trial_id = Column(String, nullable=False)
    sequence_number = Column(Integer, nullable=False)
    condition = Column(String, nullable=True)
    stimulus_id = Column(String, nullable=True)
    response_data = Column(JSON_TYPE, default=dict) # Dynamic response JSON (button, key, accuracy, etc.)
    timing_data = Column(JSON_TYPE, default=dict)   # High-resolution timing metrics (stimulus_presented_at, reaction_time, etc.)
    created_at = Column(DateTime, default=datetime.utcnow)

    session = relationship("ParticipantSession", back_populates="trial_results")
