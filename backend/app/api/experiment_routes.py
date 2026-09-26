from fastapi import APIRouter, Depends, HTTPException, Response, Query
from sqlalchemy.orm import Session
from typing import List, Optional
from app.database import get_db
from app.models.user import User
from app.models.experiment import Experiment, ExperimentVersion
from app.schemas.experiment import (
    ExperimentCreate, ExperimentUpdate, ExperimentOut,
    ExperimentVersionCreate, ExperimentVersionOut, ValidationReport
)
from app.security.dependencies import get_current_user
from app.services.experiment_service import (
    get_experiment_by_id, list_experiments, create_experiment,
    update_experiment, save_experiment_version, publish_experiment
)
from app.services.validation_service import validate_experiment_definition
from app.services.linter_service import lint_experiment_definition
from app.services.doctor_service import analyze_experiment_doctor
from app.services.data_quality_service import evaluate_experiment_quality_overview
from app.services.passport_service import generate_research_passport, generate_reproducibility_package
from app.services.export_service import export_experiment_csv, export_experiment_json
from app.services.audit_service import record_audit_log

router = APIRouter(prefix="/experiments", tags=["Experiments"])

@router.get("", response_model=List[ExperimentOut])
def get_all_experiments(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exps = list_experiments(db, current_user)
    results = []
    for exp in exps:
        latest_ver = db.query(ExperimentVersion).filter(
            ExperimentVersion.experiment_id == exp.id,
            ExperimentVersion.version_number == exp.current_version_number
        ).first()
        exp_out = ExperimentOut.model_validate(exp)
        if latest_ver:
            exp_out.latest_version = ExperimentVersionOut.model_validate(latest_ver)
        results.append(exp_out)
    return results

@router.post("", response_model=ExperimentOut)
def create_new_experiment(
    exp_in: ExperimentCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = create_experiment(db, exp_in, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    exp_out = ExperimentOut.model_validate(exp)
    if latest_ver:
        exp_out.latest_version = ExperimentVersionOut.model_validate(latest_ver)
    return exp_out

@router.get("/{experiment_id}", response_model=ExperimentOut)
def get_single_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    exp_out = ExperimentOut.model_validate(exp)
    if latest_ver:
        exp_out.latest_version = ExperimentVersionOut.model_validate(latest_ver)
    return exp_out

@router.put("/{experiment_id}", response_model=ExperimentOut)
def update_existing_experiment(
    experiment_id: str,
    update_data: ExperimentUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    exp = update_experiment(db, exp, update_data, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    exp_out = ExperimentOut.model_validate(exp)
    if latest_ver:
        exp_out.latest_version = ExperimentVersionOut.model_validate(latest_ver)
    return exp_out

@router.delete("/{experiment_id}")
def delete_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    exp_name = exp.name
    db.delete(exp)
    db.commit()
    record_audit_log(db, action="EXPERIMENT_DELETED", actor=current_user, experiment_id=experiment_id, metadata={"name": exp_name})
    return {"message": "Experiment deleted successfully"}

@router.get("/{experiment_id}/versions", response_model=List[ExperimentVersionOut])
def get_versions(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    versions = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id
    ).order_by(ExperimentVersion.version_number.desc()).all()
    return [ExperimentVersionOut.model_validate(v) for v in versions]

@router.post("/{experiment_id}/versions", response_model=ExperimentVersionOut)
def save_version(
    experiment_id: str,
    version_in: ExperimentVersionCreate,
    bump: bool = Query(False, description="Explicitly bump to next version number"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    version = save_experiment_version(
        db=db,
        exp=exp,
        definition=version_in.definition.model_dump(by_alias=True),
        user=current_user,
        changelog=version_in.changelog,
        bump_version=bump
    )
    return ExperimentVersionOut.model_validate(version)

@router.post("/{experiment_id}/validate", response_model=ValidationReport)
def validate_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")
    return validate_experiment_definition(latest_ver.definition)

@router.post("/{experiment_id}/publish", response_model=ExperimentVersionOut)
def publish(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    pub_ver = publish_experiment(db, exp, current_user)
    return ExperimentVersionOut.model_validate(pub_ver)

@router.get("/{experiment_id}/export/csv")
def export_csv(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    csv_content = export_experiment_csv(db, exp, current_user)
    filename = f"{exp.name.lower().replace(' ', '_')}_results.csv"
    return Response(
        content=csv_content,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

@router.get("/{experiment_id}/export/json")
def export_json(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    exp = get_experiment_by_id(db, experiment_id, current_user)
    json_data = export_experiment_json(db, exp, current_user)
    return json_data

# ==================== RESEARCH INTELLIGENCE SUITE ====================

@router.get("/{experiment_id}/lint")
@router.post("/{experiment_id}/lint")
def lint_experiment(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Deterministic Experiment Linter (ESLint for behavioral protocols)."""
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")
    return lint_experiment_definition(latest_ver.definition)

@router.get("/{experiment_id}/doctor")
def get_doctor_review(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """AI/Methodological Experiment Doctor consultation review."""
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")
    findings = analyze_experiment_doctor(latest_ver.definition)
    return {
        "experiment_id": exp.id,
        "version_number": latest_ver.version_number,
        "findings": findings,
        "count": len(findings)
    }

@router.get("/{experiment_id}/quality")
def get_data_quality_report(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Data Quality Engine: Reliability signal analysis across participant sessions."""
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    custom_rules = (latest_ver.definition or {}).get("quality_rules", []) if latest_ver else []
    return evaluate_experiment_quality_overview(exp, db, custom_rules)

@router.post("/{experiment_id}/quality-rules")
def update_quality_rules(
    experiment_id: str,
    rules: List[dict],
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Configure researcher-defined data quality rules versioned with experiment."""
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    defn = dict(latest_ver.definition or {})
    defn["quality_rules"] = rules
    latest_ver.definition = defn
    db.commit()
    record_audit_log(db, action="QUALITY_RULES_UPDATED", actor=current_user, experiment_id=exp.id, metadata={"rule_count": len(rules)})
    return {"message": "Quality rules updated successfully", "rules": rules}

@router.get("/{experiment_id}/passport")
def get_passport(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Official Research Passport reproducibility record."""
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")
    return generate_research_passport(exp, latest_ver)

@router.get("/{experiment_id}/passport/package")
def download_reproducibility_package(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Downloadable reproducibility bundle (.json package)."""
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")
    return generate_reproducibility_package(exp, latest_ver)


# ==================== 1. RESEARCH CONTRACT ====================

@router.get("/{experiment_id}/contract")
def get_research_contract_endpoint(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Fetch the Research Contract and intended-vs-actual alignment report."""
    from app.services.contract_service import get_default_research_contract, validate_research_contract_alignment
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    defn = latest_ver.definition or {}
    contract = defn.get("research_contract")
    if not contract:
        contract = get_default_research_contract(defn)

    alignment = validate_research_contract_alignment(contract, defn)
    return {
        "experiment_id": exp.id,
        "version_number": latest_ver.version_number,
        "contract": contract,
        "alignment": alignment
    }


@router.post("/{experiment_id}/contract")
def save_research_contract_endpoint(
    experiment_id: str,
    contract_data: dict,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Save or update the Research Contract for the active experiment version."""
    from datetime import datetime
    from app.services.contract_service import validate_research_contract_alignment
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    defn = dict(latest_ver.definition or {})
    contract_data["updated_at"] = datetime.utcnow().isoformat()
    defn["research_contract"] = contract_data
    latest_ver.definition = defn
    db.commit()

    alignment = validate_research_contract_alignment(contract_data, defn)
    record_audit_log(
        db,
        action="RESEARCH_CONTRACT_UPDATED",
        actor=current_user,
        experiment_id=exp.id,
        metadata={"contract_version": contract_data.get("version", "1.0")}
    )
    return {
        "message": "Research contract updated successfully",
        "version_number": latest_ver.version_number,
        "contract": contract_data,
        "alignment": alignment
    }


# ==================== 2. ANALYSIS READINESS CHECKER ====================

@router.get("/{experiment_id}/readiness")
def get_analysis_readiness_endpoint(
    experiment_id: str,
    include_pilot: bool = Query(False, description="Include pilot sessions in check"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Check whether collected research data is ready for statistical analysis."""
    from app.services.readiness_service import evaluate_analysis_readiness
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    return evaluate_analysis_readiness(exp, latest_ver, db, include_pilot=include_pilot)


# ==================== 3. DATA QUALITY ROOT-CAUSE EXPLORER ====================

@router.get("/{experiment_id}/quality/root-causes")
def get_quality_root_causes_endpoint(
    experiment_id: str,
    include_pilot: bool = Query(False, description="Include pilot sessions in analysis"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Data Quality Root-Cause Explorer: Multi-dimensional signal investigation."""
    from app.services.root_cause_service import analyze_quality_root_causes
    exp = get_experiment_by_id(db, experiment_id, current_user)
    return analyze_quality_root_causes(exp, db, include_pilot=include_pilot)


# ==================== 4. PILOT MODE ====================

@router.get("/{experiment_id}/pilot")
def get_pilot_report_endpoint(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Get dedicated Pilot Mode report and telemetry for experiment version."""
    from app.services.pilot_service import generate_pilot_report
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    return generate_pilot_report(exp, latest_ver, db)


@router.post("/{experiment_id}/pilot/simulate")
def simulate_pilot_sessions_endpoint(
    experiment_id: str,
    participants: int = Query(5, ge=1, le=20),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate simulated pilot sessions to test branch coverage, timing, and conditions."""
    from app.services.pilot_service import create_simulated_pilot_run
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    report = create_simulated_pilot_run(exp, latest_ver, db, participant_count=participants)
    record_audit_log(
        db,
        action="PILOT_SIMULATION_EXECUTED",
        actor=current_user,
        experiment_id=exp.id,
        metadata={"simulated_sessions": participants}
    )
    return report


# ==================== 6. AUTOMATIC DATA DICTIONARY ====================

@router.get("/{experiment_id}/dictionary")
def get_data_dictionary_endpoint(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Generate automatic data dictionary linked to experiment version."""
    from app.services.dictionary_service import generate_automatic_data_dictionary
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    return generate_automatic_data_dictionary(exp, latest_ver, db)


@router.get("/{experiment_id}/dictionary/csv")
def download_data_dictionary_csv(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export data dictionary as downloadable CSV."""
    from app.services.dictionary_service import generate_automatic_data_dictionary, export_data_dictionary_csv
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    dict_data = generate_automatic_data_dictionary(exp, latest_ver, db)
    csv_str = export_data_dictionary_csv(dict_data)
    filename = f"{exp.name.lower().replace(' ', '_')}_data_dictionary_v{latest_ver.version_number}.csv"
    return Response(
        content=csv_str,
        media_type="text/csv",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )


@router.get("/{experiment_id}/dictionary/markdown")
def download_data_dictionary_markdown(
    experiment_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """Export data dictionary as Markdown document."""
    from app.services.dictionary_service import generate_automatic_data_dictionary, export_data_dictionary_markdown
    exp = get_experiment_by_id(db, experiment_id, current_user)
    latest_ver = db.query(ExperimentVersion).filter(
        ExperimentVersion.experiment_id == exp.id,
        ExperimentVersion.version_number == exp.current_version_number
    ).first()
    if not latest_ver:
        raise HTTPException(status_code=400, detail="Experiment version definition not found")

    dict_data = generate_automatic_data_dictionary(exp, latest_ver, db)
    md_str = export_data_dictionary_markdown(dict_data)
    filename = f"{exp.name.lower().replace(' ', '_')}_data_dictionary_v{latest_ver.version_number}.md"
    return Response(
        content=md_str,
        media_type="text/markdown",
        headers={"Content-Disposition": f"attachment; filename={filename}"}
    )

