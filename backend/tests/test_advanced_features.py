import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def get_auth_token():
    resp = client.post("/api/v1/auth/login", json={
        "email": "researcher@cognilab.edu",
        "password": "CogniLab2026!"
    })
    assert resp.status_code == 200
    return resp.json()["access_token"]

def get_demo_experiment_id(token: str):
    headers = {"Authorization": f"Bearer {token}"}
    resp = client.get("/api/v1/experiments", headers=headers)
    assert resp.status_code == 200
    exps = resp.json()
    assert len(exps) > 0
    for e in exps:
        if "Stroop" in e["name"] or "Reaction Time" in e["name"]:
            return e["id"]
    return exps[0]["id"]

def test_research_contract_lifecycle():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    exp_id = get_demo_experiment_id(token)

    # 1. Fetch default research contract
    get_res = client.get(f"/api/v1/experiments/{exp_id}/contract", headers=headers)
    assert get_res.status_code == 200
    data = get_res.json()
    assert "contract" in data
    assert "alignment" in data
    assert data["contract"]["version"] == "1.0"
    assert len(data["contract"]["independent_variables"]) >= 1
    assert len(data["contract"]["dependent_variables"]) >= 1
    assert data["alignment"]["summary"]["coverage_pct"] >= 0

    # 2. Update research contract with intentional mismatch (missing condition)
    contract = data["contract"]
    contract["independent_variables"][0]["conditions"].append({
        "id": "cond_rare_oddball",
        "name": "rare_oddball",
        "description": "Non-existent condition",
        "expected_trial_count": 5
    })

    save_res = client.post(f"/api/v1/experiments/{exp_id}/contract", headers=headers, json=contract)
    assert save_res.status_code == 200
    save_data = save_res.json()
    assert save_data["alignment"]["summary"]["warnings"] >= 1
    # Verify the mismatch warning about rare_oddball
    mismatch_titles = [m["title"] for m in save_data["alignment"]["mismatches"]]
    assert any("rare_oddball" in title for title in mismatch_titles)

def test_linter_and_doctor_contract_integration():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    exp_id = get_demo_experiment_id(token)

    # Run linter - should incorporate Research Contract findings
    lint_res = client.get(f"/api/v1/experiments/{exp_id}/lint", headers=headers)
    assert lint_res.status_code == 200
    lint_data = lint_res.json()
    assert "warnings" in lint_data
    # Check if category Research Contract is present in findings
    contract_findings = [w for w in lint_data["warnings"] if w.get("category") == "Research Contract"]
    assert len(contract_findings) >= 1

    # Run Doctor review
    doc_res = client.get(f"/api/v1/experiments/{exp_id}/doctor", headers=headers)
    assert doc_res.status_code == 200
    doc_data = doc_res.json()
    assert "findings" in doc_data
    assert len(doc_data["findings"]) >= 1

def test_pilot_mode_and_simulation():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    exp_id = get_demo_experiment_id(token)

    # 1. Fetch initial pilot report
    pilot_res = client.get(f"/api/v1/experiments/{exp_id}/pilot", headers=headers)
    assert pilot_res.status_code == 200
    pilot_data = pilot_res.json()
    assert "total_pilot_sessions" in pilot_data
    assert "branch_coverage_pct" in pilot_data
    assert "actionable_findings" in pilot_data
    assert "participant_burden" in pilot_data

    # 2. Run simulated pilot sessions
    sim_res = client.post(f"/api/v1/experiments/{exp_id}/pilot/simulate?participants=3", headers=headers)
    assert sim_res.status_code == 200
    sim_data = sim_res.json()
    assert sim_data["total_pilot_sessions"] >= 3
    assert sim_data["completed_sessions"] >= 1
    assert "average_duration_formatted" in sim_data
    assert len(sim_data["actionable_findings"]) >= 1

def test_root_cause_explorer():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    exp_id = get_demo_experiment_id(token)

    rc_res = client.get(f"/api/v1/experiments/{exp_id}/quality/root-causes", headers=headers)
    assert rc_res.status_code == 200
    rc_data = rc_res.json()
    assert "total_sessions" in rc_data
    assert "identified_issues" in rc_data
    assert "breakdowns" in rc_data
    assert "device" in rc_data["breakdowns"]
    assert "condition" in rc_data["breakdowns"]
    assert "block" in rc_data["breakdowns"]

def test_analysis_readiness():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    exp_id = get_demo_experiment_id(token)

    ready_res = client.get(f"/api/v1/experiments/{exp_id}/readiness", headers=headers)
    assert ready_res.status_code == 200
    ready_data = ready_res.json()
    assert "overall_status" in ready_data
    assert "checks" in ready_data
    assert "missing_stats" in ready_data
    assert len(ready_data["checks"]) >= 5

def test_data_dictionary_and_exports():
    token = get_auth_token()
    headers = {"Authorization": f"Bearer {token}"}
    exp_id = get_demo_experiment_id(token)

    # 1. JSON Data Dictionary
    dict_res = client.get(f"/api/v1/experiments/{exp_id}/dictionary", headers=headers)
    assert dict_res.status_code == 200
    dict_data = dict_res.json()
    assert "variables" in dict_data
    assert len(dict_data["variables"]) >= 6

    # Verify standard variable properties
    var_names = [v["name"] for v in dict_data["variables"]]
    assert "reaction_time_ms" in var_names
    assert "condition" in var_names
    assert "participant_id" in var_names

    # 2. CSV Export
    csv_res = client.get(f"/api/v1/experiments/{exp_id}/dictionary/csv", headers=headers)
    assert csv_res.status_code == 200
    assert "variable_name,label,data_type" in csv_res.text
    assert "reaction_time_ms" in csv_res.text

    # 3. Markdown Export
    md_res = client.get(f"/api/v1/experiments/{exp_id}/dictionary/markdown", headers=headers)
    assert md_res.status_code == 200
    assert "# Research Data Dictionary" in md_res.text
    assert "| `reaction_time_ms` |" in md_res.text
