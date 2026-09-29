import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.security.auth import create_access_token
from app.database import SessionLocal
from app.models.user import User
from app.models.experiment import Experiment, ExperimentVersion

@pytest.fixture
def auth_client():
    client = TestClient(app)
    db = SessionLocal()
    researcher = db.query(User).filter(User.email == "researcher@cognilab.edu").first()
    token = create_access_token({"sub": researcher.id, "email": researcher.email, "role": researcher.role})
    client.headers = {"Authorization": f"Bearer {token}"}
    db.close()
    return client

def test_research_contract_flow(auth_client):
    # 1. Fetch default contract
    exp_res = auth_client.get("/api/v1/experiments")
    assert exp_res.status_code == 200
    experiments = exp_res.json()
    assert len(experiments) > 0
    exp_id = experiments[0]["id"]

    contract_res = auth_client.get(f"/api/v1/experiments/{exp_id}/contract")
    assert contract_res.status_code == 200
    data = contract_res.json()
    assert "contract" in data
    assert "alignment" in data
    assert "research_question" in data["contract"]
    assert "independent_variables" in data["contract"]
    assert "dependent_variables" in data["contract"]

    # 2. Update contract and verify alignment
    updated_contract = dict(data["contract"])
    updated_contract["research_question"] = "Does perceptual conflict delay motor response latency?"
    save_res = auth_client.post(f"/api/v1/experiments/{exp_id}/contract", json=updated_contract)
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["contract"]["research_question"] == "Does perceptual conflict delay motor response latency?"
    assert "alignment" in save_data

def test_analysis_readiness_checker(auth_client):
    exp_res = auth_client.get("/api/v1/experiments")
    exp_id = exp_res.json()[0]["id"]

    res = auth_client.get(f"/api/v1/experiments/{exp_id}/readiness?include_pilot=false")
    assert res.status_code == 200
    data = res.json()
    assert "overall_status" in data
    assert "summary" in data
    assert "checks" in data
    assert isinstance(data["checks"], list)
    assert len(data["checks"]) > 0
    # Verify non-fabrication of statistics
    assert "missing_data_summary" in data
    assert "missing_rt_pct" in data["missing_data_summary"]

def test_root_cause_explorer(auth_client):
    exp_res = auth_client.get("/api/v1/experiments")
    exp_id = exp_res.json()[0]["id"]

    res = auth_client.get(f"/api/v1/experiments/{exp_id}/quality/root-causes")
    assert res.status_code == 200
    data = res.json()
    assert "identified_issues" in data
    assert "breakdowns" in data
    assert "device" in data["breakdowns"]
    assert "dropouts" in data["breakdowns"]

def test_pilot_mode_and_simulation(auth_client):
    exp_res = auth_client.get("/api/v1/experiments")
    exp_id = exp_res.json()[0]["id"]

    # Get pilot report
    res = auth_client.get(f"/api/v1/experiments/{exp_id}/pilot")
    assert res.status_code == 200
    report = res.json()
    assert "metrics" in report
    assert "findings" in report
    assert "branch_coverage_pct" in report["metrics"]

    # Run pilot simulation with 3 simulated participants
    sim_res = auth_client.post(f"/api/v1/experiments/{exp_id}/pilot/simulate?participants=3")
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["metrics"]["total_sessions"] >= 3

def test_automatic_data_dictionary(auth_client):
    exp_res = auth_client.get("/api/v1/experiments")
    exp_id = exp_res.json()[0]["id"]

    # JSON dictionary
    res = auth_client.get(f"/api/v1/experiments/{exp_id}/dictionary")
    assert res.status_code == 200
    data = res.json()
    assert "variables" in data
    assert len(data["variables"]) > 0

    var_names = [v["name"] for v in data["variables"]]
    assert "participant_id" in var_names
    assert "reaction_time_ms" in var_names or "reaction_time" in var_names or "is_correct" in var_names

    # CSV download
    csv_res = auth_client.get(f"/api/v1/experiments/{exp_id}/dictionary/csv")
    assert csv_res.status_code == 200
    assert "text/csv" in csv_res.headers.get("content-type", "")
    assert "variable_name,label,data_type,unit,description" in csv_res.text.lower()

    # Markdown download
    md_res = auth_client.get(f"/api/v1/experiments/{exp_id}/dictionary/markdown")
    assert md_res.status_code == 200
    assert "text/markdown" in md_res.headers.get("content-type", "")
    assert "# Research Data Dictionary" in md_res.text
