from typing import List, Optional, Dict, Any
from datetime import datetime
from sqlalchemy.orm import Session
from fastapi import HTTPException, status
from app.models.experiment import Experiment, ExperimentVersion
from app.models.user import User
from app.schemas.experiment import ExperimentCreate, ExperimentUpdate, ExperimentDefinitionSchema
from app.services.validation_service import validate_experiment_definition
from app.services.audit_service import record_audit_log

def get_experiment_by_id(db: Session, experiment_id: str, user: Optional[User] = None) -> Experiment:
    query = db.query(Experiment).filter(Experiment.id == experiment_id)
    exp = query.first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found")
    
    # Organization isolation & ownership check
    if user and user.role != "platform_admin":
        if user.organization_id and exp.organization_id:
            if exp.organization_id != user.organization_id and exp.owner_id != user.id:
                raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this experiment")
        elif exp.owner_id != user.id:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Access denied to this experiment")
            
    return exp

def get_experiment_by_public_id(db: Session, public_id: str) -> Experiment:
    exp = db.query(Experiment).filter(Experiment.public_id == public_id).first()
    if not exp:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Experiment not found or link is invalid")
    return exp

def list_experiments(db: Session, user: User) -> List[Experiment]:
    query = db.query(Experiment)
    if user.role != "platform_admin":
        if user.organization_id:
            query = query.filter(
                (Experiment.organization_id == user.organization_id) | (Experiment.owner_id == user.id)
            )
        else:
            query = query.filter(Experiment.owner_id == user.id)
    return query.order_by(Experiment.updated_at.desc()).all()

def create_experiment(db: Session, exp_in: ExperimentCreate, user: User) -> Experiment:
    exp = Experiment(
        owner_id=user.id,
        organization_id=user.organization_id,
        name=exp_in.name,
        description=exp_in.description,
        retention_days=exp_in.retention_days,
        status="draft",
        current_version_number=1
    )
    db.add(exp)
    db.flush()

    # Initial version definition
    initial_def = exp_in.definition.model_dump(by_alias=True) if exp_in.definition else {
        "name": exp_in.name,
        "version": 1,
        "settings": {"fullscreen": True, "allow_mobile": False, "record_timing_diagnostics": True},
        "consent": {
            "study_title": f"{exp_in.name} - Cognitive Study",
            "purpose": "Academic behavioral experiment to measure response times and perceptual decisions.",
            "duration_minutes": 5,
            "procedures": "Respond as accurately and quickly as possible to visual targets.",
            "risks": "Minimal risk.",
            "benefits": "Advancing cognitive science research.",
            "data_collected": "Pseudonymous reaction times and accuracy.",
            "data_retention_policy": f"Stored securely under pseudonyms for {exp_in.retention_days} days.",
            "researcher_contact": user.email,
            "withdrawal_statement": "You may close your browser at any time to stop."
        },
        "participant_schema": [
            {"id": "age", "label": "Age", "type": "number", "required": False},
            {"id": "handedness", "label": "Handedness", "type": "select", "options": ["Right", "Left", "Ambidextrous"], "required": False}
        ],
        "nodes": [
            {"id": "start_1", "type": "start", "label": "Start Experiment", "props": {}},
            {"id": "instr_1", "type": "instructions", "label": "Task Instructions", "props": {
                "title": "Welcome to the Study",
                "instructions": "In this experiment, you will see a central fixation cross (+), followed by visual stimuli. Press the appropriate key as quickly and accurately as possible."
            }},
            {"id": "fix_1", "type": "fixation", "label": "Fixation Cross", "props": {"duration_ms": 500}},
            {"id": "stim_1", "type": "stimulus", "label": "Visual Target", "props": {
                "stimulus_type": "text",
                "stimulus_content": "BLUE",
                "duration_ms": 1000
            }},
            {"id": "resp_1", "type": "response", "label": "Response Capture", "props": {
                "response_type": "keyboard",
                "allowed_keys": ["ArrowLeft", "ArrowRight"],
                "correct_response": "ArrowLeft",
                "timeout_ms": 2500
            }},
            {"id": "comp_1", "type": "completion", "label": "Experiment Complete", "props": {
                "title": "Thank You!",
                "instructions": "Your responses have been recorded successfully. You may now close this window."
            }}
        ],
        "edges": [
            {"id": "e1", "from": "start_1", "to": "instr_1"},
            {"id": "e2", "from": "instr_1", "to": "fix_1"},
            {"id": "e3", "from": "fix_1", "to": "stim_1"},
            {"id": "e4", "from": "stim_1", "to": "resp_1"},
            {"id": "e5", "from": "resp_1", "to": "comp_1"}
        ]
    }

    version = ExperimentVersion(
        experiment_id=exp.id,
        version_number=1,
        definition=initial_def,
        changelog="Initial draft version"
    )
    db.add(version)
    db.commit()
    db.refresh(exp)

    record_audit_log(
        db,
        action="EXPERIMENT_CREATED",
        actor=user,
        experiment_id=exp.id,
        metadata={"name": exp.name, "public_id": exp.public_id}
    )

    return exp

def update_experiment(db: Session, exp: Experiment, update_data: ExperimentUpdate, user: User) -> Experiment:
    if update_data.name is not None:
        exp.name = update_data.name
    if update_data.description is not None:
        exp.description = update_data.description
    if update_data.retention_days is not None:
        exp.retention_days = update_data.retention_days
    if update_data.status is not None:
        exp.status = update_data.status
    if update_data.consent_config is not None:
        exp.consent_config = update_data.consent_config
        record_audit_log(db, action="CONSENT_CONFIG_CHANGED", actor=user, experiment_id=exp.id)

    db.commit()
    db.refresh(exp)
    return exp

def save_experiment_version(
    db: Session,
    exp: Experiment,
    definition: Dict[str, Any],
    user: User,
    changelog: Optional[str] = None,
    bump_version: bool = False
) -> ExperimentVersion:
    if bump_version:
        new_version_num = exp.current_version_number + 1
        exp.current_version_number = new_version_num
        version = ExperimentVersion(
            experiment_id=exp.id,
            version_number=new_version_num,
            definition=definition,
            changelog=changelog or f"Version {new_version_num}"
        )
        db.add(version)
    else:
        # Update current latest version in-place if draft
        latest_version = db.query(ExperimentVersion).filter(
            ExperimentVersion.experiment_id == exp.id,
            ExperimentVersion.version_number == exp.current_version_number
        ).first()

        if latest_version and exp.status == "draft":
            latest_version.definition = definition
            if changelog:
                latest_version.changelog = changelog
            version = latest_version
        else:
            new_version_num = exp.current_version_number + 1
            exp.current_version_number = new_version_num
            version = ExperimentVersion(
                experiment_id=exp.id,
                version_number=new_version_num,
                definition=definition,
                changelog=changelog or f"Update version {new_version_num}"
            )
            db.add(version)

    exp.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(version)
    db.refresh(exp)

    record_audit_log(
        db,
        action="EXPERIMENT_VERSION_SAVED",
        actor=user,
        experiment_id=exp.id,
        metadata={"version_number": version.version_number}
    )

    return version

def publish_experiment(db: Session, exp: Experiment, user: User) -> ExperimentVersion:
    latest_version = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()

    if not latest_version:
        raise HTTPException(status_code=400, detail="Cannot publish experiment without a valid version")

    # Run comprehensive validation
    report = validate_experiment_definition(latest_version.definition)
    if not report.can_publish:
        error_msgs = "; ".join([e.message for e in report.errors])
        raise HTTPException(
            status_code=400,
            detail=f"Experiment validation failed: {error_msgs}"
        )

    # Mark as published and stamp publication time
    latest_version.published_at = datetime.utcnow()
    exp.status = "published"
    exp.updated_at = datetime.utcnow()

    db.commit()
    db.refresh(exp)
    db.refresh(latest_version)

    record_audit_log(
        db,
        action="EXPERIMENT_PUBLISHED",
        actor=user,
        experiment_id=exp.id,
        metadata={"version_number": latest_version.version_number, "public_id": exp.public_id}
    )

    return latest_version
