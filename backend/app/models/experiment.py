import uuid
from datetime import datetime
from sqlalchemy import Column, String, Integer, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from app.database import Base, JSON_TYPE

def generate_uuid():
    return str(uuid.uuid4())

def generate_public_id():
    return "exp-" + uuid.uuid4().hex[:8]

class Experiment(Base):
    __tablename__ = "experiments"

    id = Column(String, primary_key=True, default=generate_uuid)
    organization_id = Column(String, ForeignKey("organizations.id", ondelete="SET NULL"), nullable=True)
    owner_id = Column(String, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    public_id = Column(String, unique=True, index=True, default=generate_public_id, nullable=False)
    name = Column(String, nullable=False)
    description = Column(Text, nullable=True)
    status = Column(String, default="draft", index=True) # draft, published, archived
    retention_days = Column(Integer, default=90) # Data retention policy
    current_version_number = Column(Integer, default=1)
    consent_config = Column(JSON_TYPE, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    owner = relationship("User", back_populates="experiments")
    organization = relationship("Organization", back_populates="experiments")
    versions = relationship("ExperimentVersion", back_populates="experiment", cascade="all, delete-orphan", order_by="ExperimentVersion.version_number.desc()")
    stimuli = relationship("Stimulus", back_populates="experiment", cascade="all, delete-orphan")
    sessions = relationship("ParticipantSession", back_populates="experiment", cascade="all, delete-orphan")

class ExperimentVersion(Base):
    __tablename__ = "experiment_versions"

    id = Column(String, primary_key=True, default=generate_uuid)
    experiment_id = Column(String, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False)
    version_number = Column(Integer, nullable=False)
    definition = Column(JSON_TYPE, nullable=False) # Full JSONB Experiment Definition
    changelog = Column(String, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    published_at = Column(DateTime, nullable=True)

    experiment = relationship("Experiment", back_populates="versions")
    sessions = relationship("ParticipantSession", back_populates="experiment_version")

class Stimulus(Base):
    __tablename__ = "stimuli"

    id = Column(String, primary_key=True, default=generate_uuid)
    experiment_id = Column(String, ForeignKey("experiments.id", ondelete="CASCADE"), nullable=False)
    name = Column(String, nullable=False)
    stimulus_type = Column(String, default="image") # image, text, audio
    file_path = Column(String, nullable=True)
    file_url = Column(String, nullable=True)
    file_size = Column(Integer, default=0)
    mime_type = Column(String, nullable=True)
    metadata_json = Column(JSON_TYPE, default=dict)
    created_at = Column(DateTime, default=datetime.utcnow)

    experiment = relationship("Experiment", back_populates="stimuli")
