import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.services.linter_service import lint_experiment_definition
from app.services.doctor_service import analyze_experiment_doctor

client = TestClient(app)

@pytest.fixture
def auth_headers():
    resp = client.post("/api/v1/auth/login", json={
        "email": "researcher@cognilab.edu",
        "password": "CogniLab2026!"
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

@pytest.fixture
def admin_headers():
    resp = client.post("/api/v1/auth/login", json={
        "email": "admin@cognilab.edu",
        "password": "CogniLabAdmin2026!"
    })
    token = resp.json()["access_token"]
    return {"Authorization": f"Bearer {token}"}

def test_linter_deterministic_checks():
    # 1. Broken experiment: missing start node and negative duration
    broken_def = {
        "nodes": [
            {"id": "stim_1", "type": "stimulus", "label": "Target", "props": {"duration_ms": -200, "stimulus_content": ""}},
            {"id": "comp_1", "type": "completion", "label": "End"}
        ],
        "edges": [
            {"from": "stim_1", "to": "comp_1"}
        ]
    }
    lint_res = lint_experiment_definition(broken_def)
    assert lint_res["valid"] is False
    assert lint_res["can_publish"] is False
    assert any("start" in err["message"].lower() for err in lint_res["errors"])
    assert any("duration" in err["message"].lower() for err in lint_res["errors"])

    # 2. Valid experiment
    valid_def = {
        "nodes": [
            {"id": "start_1", "type": "start", "label": "Start"},
            {"id": "stim_1", "type": "stimulus", "label": "Target", "props": {"duration_ms": 1000, "stimulus_content": "A"}},
            {"id": "resp_1", "type": "response", "label": "Response", "props": {"response_type": "keyboard", "allowed_keys": ["f", "j"]}},
            {"id": "comp_1", "type": "completion", "label": "End"}
        ],
        "edges": [
            {"from": "start_1", "to": "stim_1"},
            {"from": "stim_1", "to": "resp_1"},
            {"from": "resp_1", "to": "comp_1"}
        ],
        "consent": {"study_title": "Visual Perception Test"}
    }
    valid_res = lint_experiment_definition(valid_def)
    assert valid_res["valid"] is True
    assert valid_res["can_publish"] is True
    assert len(valid_res["errors"]) == 0

def test_doctor_heuristics_and_tone():
    imbalanced_def = {
        "nodes": [
            {"id": "start_1", "type": "start"},
            # 5 Condition A trials
            {"id": "s_a1", "type": "stimulus", "props": {"condition": "Condition A"}},
            {"id": "s_a2", "type": "stimulus", "props": {"condition": "Condition A"}},
            # 20 Condition B trials
            {"id": "s_b1", "type": "stimulus", "props": {"condition": "Condition B"}},
            {"id": "s_b2", "type": "stimulus", "props": {"condition": "Condition B"}},
            {"id": "s_b3", "type": "stimulus", "props": {"condition": "Condition B"}},
            {"id": "s_b4", "type": "stimulus", "props": {"condition": "Condition B"}},
            {"id": "s_b5", "type": "stimulus", "props": {"condition": "Condition B"}},
            {"id": "resp_1", "type": "response", "props": {"allowed_keys": ["Space"]}},
            {"id": "end_1", "type": "completion"}
        ],
        "settings": {"allowed_devices": ["desktop", "mobile"]},
        "participant_schema": [{"id": "date_of_birth", "label": "Date of Birth", "type": "text"}]
    }

    findings = analyze_experiment_doctor(imbalanced_def)
    assert len(findings) >= 3

    # Check advisory tone: Must use "potential", "consider", "review recommended"
    for f in findings:
        text = f"{f['title']} {f['finding']} {f['explanation']} {f['suggestion']}".lower()
        assert any(phrase in text for phrase in ["potential", "consider", "review recommended"])
        assert "invalid experiment" not in text

def test_linter_and_doctor_endpoints(auth_headers):
    # Fetch first experiment
    exps = client.get("/api/v1/experiments", headers=auth_headers).json()
    exp_id = exps[0]["id"]

    # 1. Lint endpoint
    lint_resp = client.get(f"/api/v1/experiments/{exp_id}/lint", headers=auth_headers)
    assert lint_resp.status_code == 200
    report = lint_resp.json()
    assert "can_publish" in report
    assert "summary" in report

    # 2. Doctor endpoint
    doc_resp = client.get(f"/api/v1/experiments/{exp_id}/doctor", headers=auth_headers)
    assert doc_resp.status_code == 200
    doc_data = doc_resp.json()
    assert "findings" in doc_data
    assert isinstance(doc_data["findings"], list)

def test_data_quality_endpoint(auth_headers):
    exps = client.get("/api/v1/experiments", headers=auth_headers).json()
    exp_id = exps[0]["id"]

    # Quality overview
    qual_resp = client.get(f"/api/v1/experiments/{exp_id}/quality", headers=auth_headers)
    assert qual_resp.status_code == 200
    qual_data = qual_resp.json()
    assert "total_sessions" in qual_data
    assert "good" in qual_data
    assert "review" in qual_data
    assert "poor" in qual_data
    assert "common_signals" in qual_data

    # Update quality rules
    rules_resp = client.post(f"/api/v1/experiments/{exp_id}/quality-rules", headers=auth_headers, json=[
        {"rule_type": "fast_rt_trials", "threshold": 4, "action": "flag_review"}
    ])
    assert rules_resp.status_code == 200

def test_research_passport_endpoint(auth_headers):
    exps = client.get("/api/v1/experiments", headers=auth_headers).json()
    exp_id = exps[0]["id"]

    # Get passport
    pass_resp = client.get(f"/api/v1/experiments/{exp_id}/passport", headers=auth_headers)
    assert pass_resp.status_code == 200
    passport = pass_resp.json()
    assert "fingerprint" in passport
    assert len(passport["fingerprint"]) == 64  # SHA-256 hex string
    assert "protocol_checklist" in passport
    assert "data_dictionary" in passport
    assert len(passport["data_dictionary"]) > 0

    # Download package
    pkg_resp = client.get(f"/api/v1/experiments/{exp_id}/passport/package", headers=auth_headers)
    assert pkg_resp.status_code == 200
    pkg = pkg_resp.json()
    assert pkg["schema_version"] == "cognera_reproducibility_package_v1"
    assert "checksum" in pkg

def test_admin_role_protection(auth_headers, admin_headers):
    # Researcher should be forbidden from admin overview
    forbidden_resp = client.get("/api/v1/admin/overview", headers=auth_headers)
    assert forbidden_resp.status_code == 403

    # Admin should succeed
    admin_resp = client.get("/api/v1/admin/overview", headers=admin_headers)
    assert admin_resp.status_code == 200
    data = admin_resp.json()
    assert "stats" in data
    assert data["stats"]["total_users"] >= 2
