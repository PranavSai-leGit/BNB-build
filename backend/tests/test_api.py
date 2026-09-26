import pytest
from fastapi.testclient import TestClient
from app.main import app

client = TestClient(app)

def test_health_check():
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json()["status"] == "healthy"

def test_login_and_auth_profile():
    # Login as seeded researcher
    resp = client.post("/api/v1/auth/login", json={
        "email": "researcher@cognilab.edu",
        "password": "CogniLab2026!"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    assert data["user"]["email"] == "researcher@cognilab.edu"
    token = data["access_token"]

    # Profile me
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["full_name"] == "Dr. Elena Vance"

def test_list_and_create_experiment():
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "researcher@cognilab.edu",
        "password": "CogniLab2026!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    # List experiments
    list_resp = client.get("/api/v1/experiments", headers=headers)
    assert list_resp.status_code == 200
    exps = list_resp.json()
    assert len(exps) >= 1

    # Create new experiment
    create_resp = client.post("/api/v1/experiments", headers=headers, json={
        "name": "Spatial Working Memory Task",
        "description": "N-back spatial memory evaluation",
        "retention_days": 30
    })
    assert create_resp.status_code == 200
    new_exp = create_resp.json()
    assert new_exp["name"] == "Spatial Working Memory Task"
    assert new_exp["status"] == "draft"

def test_validation_service():
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "researcher@cognilab.edu",
        "password": "CogniLab2026!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    exps = client.get("/api/v1/experiments", headers=headers).json()
    exp_id = exps[0]["id"]

    val_resp = client.post(f"/api/v1/experiments/{exp_id}/validate", headers=headers)
    assert val_resp.status_code == 200
    report = val_resp.json()
    assert "valid" in report
    assert "can_publish" in report

def test_participant_flow_and_high_res_timing():
    # 1. Fetch public experiment info
    info_resp = client.get("/api/v1/public/experiments/vis-rt-demo/info")
    assert info_resp.status_code == 200
    info = info_resp.json()
    assert info["public_id"] == "vis-rt-demo"
    assert "consent" in info

    # 2. Init participant session
    init_resp = client.post("/api/v1/public/experiments/vis-rt-demo/session", json={
        "participant_data": {"age": 28, "handedness": "Right", "sleep_hours": 7.5},
        "browser_metadata": {
            "user_agent": "TestBrowser/1.0",
            "screen_width": 1920,
            "screen_height": 1080,
            "estimated_refresh_rate": 60.0,
            "timing_quality": "Good"
        }
    })
    assert init_resp.status_code == 200
    sess_data = init_resp.json()
    session_id = sess_data["session_id"]
    assert session_id.startswith("")

    # 3. Submit consent
    consent_resp = client.post(f"/api/v1/public/sessions/{session_id}/consent", json={
        "accepted": True,
        "consent_version": "1.0"
    })
    assert consent_resp.status_code == 200
    assert consent_resp.json()["accepted"] is True

    # 4. Submit high-resolution trial events
    events_resp = client.post(f"/api/v1/public/sessions/{session_id}/events", json={
        "events": [
            {
                "trial_id": "trial_1",
                "sequence_number": 1,
                "condition": "congruent",
                "stimulus_id": "stim_red",
                "response_data": {"key": "ArrowLeft", "is_correct": True, "accuracy": 1},
                "timing_data": {
                    "stimulus_requested_at": 1000.0,
                    "stimulus_presented_at": 1016.7,
                    "response_received_at": 1398.2,
                    "reaction_time": 381.5
                }
            }
        ]
    })
    assert events_resp.status_code == 200
    assert events_resp.json()["recorded_count"] == 1

    # 5. Complete session
    complete_resp = client.post(f"/api/v1/public/sessions/{session_id}/complete", json={
        "withdrawal_requested": False,
        "browser_timing_summary": {"avg_frame_duration_ms": 16.66}
    })
    assert complete_resp.status_code == 200
    assert complete_resp.json()["status"] == "completed"

def test_analytics_and_export():
    login_resp = client.post("/api/v1/auth/login", json={
        "email": "researcher@cognilab.edu",
        "password": "CogniLab2026!"
    })
    token = login_resp.json()["access_token"]
    headers = {"Authorization": f"Bearer {token}"}

    exps = client.get("/api/v1/experiments", headers=headers).json()
    demo_exp = next((e for e in exps if e["name"] == "Visual Reaction Time & Interference Task"), exps[0])
    exp_id = demo_exp["id"]

    # Analytics
    analytics_resp = client.get(f"/api/v1/experiments/{exp_id}/analytics", headers=headers)
    assert analytics_resp.status_code == 200
    analytics = analytics_resp.json()
    assert analytics["total_participants"] >= 1
    assert "rt_histogram" in analytics
    assert "condition_breakdown" in analytics

    # Export CSV
    csv_resp = client.get(f"/api/v1/experiments/{exp_id}/export/csv", headers=headers)
    assert csv_resp.status_code == 200
    assert "text/csv" in csv_resp.headers["content-type"]
    assert "participant_id" in csv_resp.text

    # Export JSON
    json_resp = client.get(f"/api/v1/experiments/{exp_id}/export/json", headers=headers)
    assert json_resp.status_code == 200
    assert json_resp.json()["experiment_id"] == exp_id
