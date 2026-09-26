import uuid
from datetime import datetime
from sqlalchemy import Column, String, DateTime
from app.database import Base, JSON_TYPE

def generate_uuid():
    return str(uuid.uuid4())

class AuditLog(Base):
    __tablename__ = "audit_logs"

    id = Column(String, primary_key=True, default=generate_uuid)
    actor_id = Column(String, nullable=True) # User ID or SYSTEM
    actor_email = Column(String, nullable=True)
    action = Column(String, nullable=False, index=True)
    experiment_id = Column(String, nullable=True, index=True)
    metadata_json = Column(JSON_TYPE, default=dict)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
