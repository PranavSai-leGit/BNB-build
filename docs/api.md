# CogniLab REST API Reference

Base API Path: `/api/v1`

---

## 1. Authentication

### `POST /auth/register`
Register a new researcher account and optional research organization.
- **Request Body**:
  ```json
  {
    "email": "researcher@university.edu",
    "password": "SecurePassword123!",
    "full_name": "Dr. Jane Doe",
    "organization_name": "Vision Lab"
  }
  ```
- **Response `200 OK`**:
  ```json
  {
    "access_token": "eyJhbGciOi...",
    "token_type": "bearer",
    "user": {
      "id": "u-1234",
      "email": "researcher@university.edu",
      "full_name": "Dr. Jane Doe",
      "role": "researcher"
    }
  }
  ```

### `POST /auth/login`
Authenticate existing researcher credentials.
- **Request Body**:
  ```json
  {
    "email": "researcher@cognilab.edu",
    "password": "CogniLab2026!"
  }
  ```
- **Response `200 OK`**: Returns access token and user profile.

### `GET /auth/me`
Retrieve currently authenticated researcher profile (requires `Bearer` token).

---

## 2. Experiments Management

### `GET /experiments`
List all experiments accessible to the authenticated researcher.

### `POST /experiments`
Create a new experiment with an initial draft definition.
- **Request Body**:
  ```json
  {
    "name": "Spatial Working Memory Task",
    "description": "N-back memory task",
    "retention_days": 90
  }
  ```

### `GET /experiments/{id}`
Retrieve a single experiment and its latest version definition.

### `PUT /experiments/{id}`
Update experiment metadata (name, description, retention days, status).

### `DELETE /experiments/{id}`
Delete or archive an experiment and record an audit log entry.

### `POST /experiments/{id}/versions`
Save changes to an experiment version or bump to a new version.
- **Query Parameter**: `bump=true|false`
- **Request Body**:
  ```json
  {
    "definition": { ... },
    "changelog": "Added feedback node"
  }
  ```

### `POST /experiments/{id}/validate`
Run the validation service against the experiment graph.
- **Response `200 OK`**:
  ```json
  {
    "valid": true,
    "can_publish": true,
    "errors": [],
    "warnings": []
  }
  ```

### `POST /experiments/{id}/publish`
Validate and publish the experiment version. Bumps status to `published` and generates the public participant link.

### `GET /experiments/{id}/export/csv`
Download research trial dataset as CSV file with flattened dynamic fields.

### `GET /experiments/{id}/export/json`
Download research trial dataset as structured JSON.

---

## 3. Public Participant Runtime

*(No researcher authentication required)*

### `GET /public/experiments/{public_id}/info`
Fetch public study information and informed consent configuration. Does not expose researcher dashboard data.

### `POST /public/experiments/{public_id}/session`
Initialize a pseudonymous participant session and log browser hardware timing diagnostics.
- **Request Body**:
  ```json
  {
    "participant_data": { "age": 24, "handedness": "Right" },
    "browser_metadata": {
      "user_agent": "Mozilla/5.0 ...",
      "screen_width": 1920,
      "screen_height": 1080,
      "estimated_refresh_rate": 60.0,
      "timing_quality": "Good"
    }
  }
  ```

### `POST /public/sessions/{session_id}/consent`
Record participant consent decision.
- **Request Body**:
  ```json
  {
    "accepted": true,
    "consent_version": "1.0"
  }
  ```

### `POST /public/sessions/{session_id}/events`
Submit batch of high-resolution trial events from browser.
- **Request Body**:
  ```json
  {
    "events": [
      {
        "trial_id": "trial_1",
        "sequence_number": 1,
        "condition": "congruent",
        "stimulus_id": "stim_red",
        "response_data": { "key": "ArrowLeft", "is_correct": true },
        "timing_data": {
          "stimulus_requested_at": 1000.0,
          "stimulus_presented_at": 1016.7,
          "response_received_at": 1398.2,
          "reaction_time": 381.5
        }
      }
    ]
  }
  ```

### `POST /public/sessions/{session_id}/complete`
Mark session complete or process participant withdrawal request.

---

## 4. Analytics & Compliance

### `GET /experiments/{id}/analytics`
Fetch aggregated statistics, reaction-time histograms, condition comparisons, and recent sessions.

### `GET /audit/logs`
Retrieve compliance audit trail logs.
