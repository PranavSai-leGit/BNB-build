import os
import uuid
import shutil
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File, Form
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.config import settings
from app.models.user import User
from app.models.experiment import Stimulus
from app.security.dependencies import get_current_user
from app.services.experiment_service import get_experiment_by_id

router = APIRouter(prefix="/experiments", tags=["Stimuli Management"])

ALLOWED_EXTENSIONS = {".png", ".jpg", ".jpeg", ".gif", ".webp", ".svg", ".mp3", ".wav"}

@router.post("/{experiment_id}/stimuli/upload")
async def upload_stimulus(
    experiment_id: str,
    file: UploadFile = File(...),
    name: Optional[str] = Form(None),
    stimulus_type: Optional[str] = Form("image"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)

    filename = file.filename or "stimulus"
    ext = os.path.splitext(filename)[1].lower()
    if ext not in ALLOWED_EXTENSIONS:
        raise HTTPException(
            status_code=400,
            detail=f"Unsupported file format '{ext}'. Allowed: {', '.join(ALLOWED_EXTENSIONS)}"
        )

    # Secure random filename to avoid directory traversal
    stored_name = f"{uuid.uuid4().hex}{ext}"
    exp_upload_dir = os.path.join(settings.UPLOAD_DIR, exp.id)
    os.makedirs(exp_upload_dir, exist_ok=True)
    destination_path = os.path.join(exp_upload_dir, stored_name)

    file_size = 0
    with open(destination_path, "wb") as buffer:
        content = await file.read()
        file_size = len(content)
        buffer.write(content)

    file_url = f"/api/v1/uploads/{exp.id}/{stored_name}"

    stimulus = Stimulus(
        experiment_id=exp.id,
        name=name or filename,
        stimulus_type=stimulus_type,
        file_path=destination_path,
        file_url=file_url,
        file_size=file_size,
        mime_type=file.content_type,
        metadata_json={"original_filename": filename}
    )
    db.add(stimulus)
    db.commit()
    db.refresh(stimulus)

    return {
        "id": stimulus.id,
        "name": stimulus.name,
        "stimulus_type": stimulus.stimulus_type,
        "file_url": stimulus.file_url,
        "file_size": stimulus.file_size
    }

@router.get("/{experiment_id}/stimuli")
def list_stimuli(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    stimuli = db.query(Stimulus).filter(Stimulus.experiment_id == exp.id).all()
    return [
        {
            "id": s.id,
            "name": s.name,
            "stimulus_type": s.stimulus_type,
            "file_url": s.file_url,
            "file_size": s.file_size,
            "created_at": s.created_at
        }
        for s in stimuli
    ]
