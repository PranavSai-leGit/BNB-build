# Cognera — Web-Based Cognitive Science Experiment Platform

[![FastAPI](https://img.shields.io/badge/Backend-FastAPI-009688.svg?logo=fastapi)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/Frontend-React%20%2B%20TypeScript-61DAFB.svg?logo=react)](https://react.dev)
[![React Flow](https://img.shields.io/badge/Canvas-React%20Flow-FF0072.svg)](https://reactflow.dev)
[![PostgreSQL](https://img.shields.io/badge/Database-PostgreSQL%20%2B%20JSONB-336791.svg?logo=postgresql)](https://www.postgresql.org)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)

**Cognera** is a production-grade SaaS web platform engineered specifically for psychology, cognitive neuroscience, behavioral economics, and Human-Computer Interaction (HCI) researchers. It empowers researchers with little or no coding experience to visually design, configure consent for, publish, execute, and analyze browser-based behavioral experiments with browser-side high-resolution timing.

---

## 1. Key Highlights & Features

- **Dual-Mode Visual Experiment Builder**:
  - **Block / Timeline View**: Sequential step-by-step trial ordering with duration badges and response tags.
  - **Flow / Logic View (React Flow)**: Interactive canvas for complex branching graphs and condition routing.
- **Dedicated Browser-Side Timing Engine**:
  - Reaction times (RT) measured using `window.performance.now()` with sub-millisecond precision.
  - Double `requestAnimationFrame()` synchronization aligns visual stimulus onset with physical display refresh cycles (VSYNC).
  - Diagnostic hardware benchmarking assesses frame jitter and display refresh rate (60Hz, 120Hz, 144Hz, 240Hz).
- **Relational Schema + PostgreSQL JSONB Dynamic Architecture**:
  - Dynamic researcher demographic fields (e.g., age, handedness, sleep hours) and trial responses are stored in JSONB without requiring database schema migrations.
  - Stable relational entities (`experiments`, `experiment_versions`, `participant_sessions`, `trial_results`, `audit_logs`).
- **Strict Immutable Versioning**:
  - Every publication snapshot is immutably archived (`ExperimentVersion`). Participant sessions reference the exact version ID used for reproducibility.
- **Privacy-by-Design & GDPR Compliance**:
  - Zero participant accounts; anonymous/pseudonymous cryptographic IDs (`P-XXXXXX`).
  - Separation of participant demographic fields from experimental reaction times.
  - Explicit informed consent logging, withdrawal button, and configurable data retention policies (30d, 90d, 1y).
- **Researcher Analytics & Export**:
  - Live reaction time distribution histograms, condition comparison charts (e.g. Congruent vs. Incongruent Stroop interference effect), and one-click flattened **CSV** and **JSON** data exports.
- **Researcher Preview Sandbox**:
  - Run the experiment in an interactive sandbox with a real-time timing HUD and node tracer without contaminating participant data.

---

## 2. Technology Stack

| Layer | Technologies |
|---|---|
| **Frontend** | React 19, TypeScript, Vite, Tailwind CSS, `@xyflow/react` (React Flow), TanStack Query, Recharts, Lucide Icons |
| **Experiment Engine** | `TimingEngine.ts`, `StimulusRenderer.tsx`, `ResponseCollector.ts`, `ConditionEvaluator.ts`, `RandomizationEngine.ts`, `EventLogger.ts` |
| **Backend** | Python 3.11+, FastAPI, Pydantic v2, SQLAlchemy 2.0, Alembic, Uvicorn |
| **Database** | PostgreSQL (Production JSONB) with transparent SQLite fallback (Local Dev) |
| **Security & Auth** | JWT (`python-jose`), bcrypt password hashing, CORS protection, role-based authorization |

---

## 3. Quickstart & Local Setup

### Prerequisites
- **Python 3.11+**
- **Node.js v18+** & **npm**
- *(Optional)* Docker & Docker Compose

### Option A: Running Directly (Fastest)

#### 1. Start the FastAPI Backend
```bash
cd backend
python -m venv venv

# Windows PowerShell:
.\venv\Scripts\Activate.ps1
# macOS/Linux:
source venv/bin/activate

pip install -r requirements.txt email-validator
uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload
```
*The database automatically creates all tables and seeds the demo experiment on first run!*

#### 2. Start the Frontend
In a new terminal:
```bash
cd frontend
npm install
npm run dev
```

Visit **`http://localhost:5173`** in your browser.

---

### Option B: Running with Docker Compose (PostgreSQL)

```bash
docker compose up --build
```
- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- PostgreSQL: `localhost:5432`

---

## 4. Default Seed Accounts for Testing

The platform is pre-seeded with research credentials:

| Role | Email | Password |
|---|---|---|
| **Lead Researcher** | `researcher@cognilab.edu` | `CogniLab2026!` |
| **Organization Admin** | `admin@cognilab.edu` | `CogniLabAdmin2026!` |

*(One-click quick-login buttons are also available on the `/login` page for fast evaluation)*

---

## 5. Ready-Made Hackathon Demo Experiment

**"Visual Reaction Time & Stroop Interference Task"**
- Public URL: `http://localhost:5173/participate/vis-rt-demo`
- **Paradigm**:
  1. Informed Consent Protocol #2026-44B
  2. Demographic inputs (Age, Handedness, Sleep Hours)
  3. Fullscreen check
  4. Task Directions
  5. 10 Congruent & Incongruent Stroop trials (500ms Fixation cross -> 1000ms Target Word -> ArrowLeft/ArrowRight Response -> Immediate accuracy feedback)
  6. Completion screen with confetti
- **12 Realistic Participant Sessions Pre-loaded**:
  - Visit the **Analytics** tab (`/analytics`) to inspect the resulting reaction-time distribution histogram, mean RTs across congruent vs. incongruent conditions, and click **Export CSV** to download the clean research dataset.

---

## 6. Environment Variables

Create `.env` in `backend/` (optional, defaults provided):
```ini
PROJECT_NAME="CogniLab SaaS"
DATABASE_URL=sqlite:///./cognilab.db
# Or for PostgreSQL:
# DATABASE_URL=postgresql+psycopg2://postgres:postgrespassword@localhost:5432/cognilab
JWT_SECRET=super-secret-key-cognilab-dev-change-in-prod-89241f9b
ACCESS_TOKEN_EXPIRE_MINUTES=1440
UPLOAD_DIR=./uploads
```

---

## 7. Database Migrations (Alembic)

To generate or run database schema migrations:
```bash
cd backend
.\venv\Scripts\alembic upgrade head
```

---

## 8. Running Automated Tests

A comprehensive pytest test suite is included:
```bash
cd backend
.\venv\Scripts\python -m pytest -v tests/test_api.py
```
Validates:
- Health checks
- Authentication & JWT profile access
- Experiment creation & version persistence
- Structural validation service
- Participant session flow, consent, and microsecond timing ingestion
- Analytics calculations & CSV/JSON export

---

## 9. Scientific Timing & Hardware Transparency

CogniLab takes an honest, scientifically grounded approach to browser timing:
- **No False Claims**: The platform does **not** claim to provide laboratory tachistoscope zero-latency guarantees.
- **Hardware & VSYNC Diagnostics**: The Timing Diagnostics page (`/diagnostics`) assesses display refresh rate, hardware concurrency, and standard-deviation jitter.
- **Timing Warnings**: Flagged if participant display variance exceeds thresholds, ensuring researchers can filter out noisy data.

---

## 10. Implemented MVP Features Checklist

- [x] Researcher registration, authentication & JWT sessions
- [x] Dual-view Visual Experiment Builder (Timeline & React Flow)
- [x] Display components (Text, Image, Fixation cross, Blank screen, Instructions)
- [x] Response mechanisms (Keyboard, Mouse click, Multiple choice buttons)
- [x] Timing mechanisms (Duration ms, Timeouts, requestAnimationFrame VSYNC)
- [x] Conditional branching (IF/ELSE, Comparison operators)
- [x] Randomization (Fisher-Yates trial shuffle, Counterbalancing groups)
- [x] Pre-publish experiment validation service with diagnostic warnings
- [x] Immutable versioning on publish
- [x] Live Researcher Preview mode with execution HUD
- [x] Fullscreen participant runtime without account requirement
- [x] Informed consent system with explicit acceptance/withdrawal tracking
- [x] Dynamic researcher-defined demographic fields in PostgreSQL JSONB
- [x] GDPR privacy warnings on sensitive demographic fields
- [x] Researcher Analytics (KPIs, RT histograms, condition breakdowns)
- [x] Research dataset export in CSV and JSON formats
- [x] Audit trail recording administrative and data-export events
- [x] 10-trial Visual Reaction Time & Stroop Interference demo experiment

### Deferred for Future Expansion (Post-MVP):
- WebCam / Eye-tracking gaze estimation
- Microphone audio stimulus capture
- Multi-participant simultaneous multiplayer sync
- Federated multi-institution IRB repository sharing

---

## 11. Documentation Links

- [Architecture & System Design](file:///docs/architecture.md)
- [Experiment JSON Schema Specification](file:///docs/experiment-schema.md)
- [Privacy, GDPR & Ethics Framework](file:///docs/privacy.md)
- [REST API Reference](file:///docs/api.md)
