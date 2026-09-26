# CogniLab Architecture & System Design

CogniLab is a production-quality SaaS web platform engineered specifically for cognitive, behavioral, neuroscience, and HCI researchers to visually construct, publish, execute, and analyze browser-based behavioral experiments.

---

## 1. High-Level System Architecture

```mermaid
graph TD
    subgraph Researcher Workspace
        RD[Researcher Dashboard] --> VB[Visual Experiment Builder]
        VB -->|Toggle| TLV[Timeline View]
        VB -->|Toggle| FLV[React Flow Canvas]
        VB --> VAL[Validation Engine]
        VB --> PV[Live Preview HUD]
    end

    subgraph Backend Service [FastAPI + SQLAlchemy]
        API[REST API Gateway]
        AUTH[JWT & Role Auth]
        EXP_SVC[Experiment & Version Service]
        VAL_SVC[Experiment Validator]
        SESS_SVC[Participant Session Service]
        ANL_SVC[Statistical Analytics Service]
        EXP_EXP[CSV / JSON Research Exporter]
        AUDIT[Audit Logging Engine]
    end

    subgraph Data Layer [PostgreSQL]
        REL[Relational Entities: Users, Orgs, Experiments, Sessions]
        JSONB_DEF[JSONB: Immutable Experiment Definitions]
        JSONB_RESP[JSONB: Dynamic Participant Fields & Trial Responses]
        JSONB_TIME[JSONB: High-Resolution Browser Timing Metrics]
    end

    subgraph Participant Runtime [Browser Engine]
        URL[Participant Public URL] --> CONSENT[Informed Consent & Ethics]
        CONSENT --> DEMO[Demographic Questions]
        DEMO --> ENG[Experiment Runner Engine]
        ENG --> TE[Timing Engine: performance.now + requestAnimationFrame]
        ENG --> SR[Stimulus Renderer: Fixation, Text, Image, Blank]
        ENG --> RC[Response Collector: Keyboard, Mouse, Button]
        ENG --> CE[Condition Evaluator: IF / ELSE Branching]
        ENG --> RE[Randomization Engine: Fisher-Yates, Counterbalancing]
        ENG --> EL[Event Logger: Local Buffer & Batch Syncer]
    end

    VB -->|Saves Experiment Definition| API
    API --> AUTH
    API --> EXP_SVC
    EXP_SVC --> REL
    EXP_SVC --> JSONB_DEF

    ENG -->|Batch Trial Events| API
    API --> SESS_SVC
    SESS_SVC --> JSONB_RESP
    SESS_SVC --> JSONB_TIME
    SESS_SVC --> REL

    RD -->|Fetches Metrics| API
    API --> ANL_SVC
    API --> EXP_EXP
```

---

## 2. Core Architectural Pillars

### A. Browser-Side Timing Independence
In behavioral cognitive science, reaction times (RT) must reflect cognitive processing latencies rather than internet network round-trips.
- **Client-Side High-Resolution Clocks**: Uses `window.performance.now()` with sub-millisecond precision.
- **VSYNC Synchronization**: Utilizes double `requestAnimationFrame()` to guarantee that visual stimuli are committed to the screen before starting the reaction-time clock.
- **No Server-Side Latency Dependency**: The FastAPI backend is never in the critical path of reaction-time measurement.

### B. Relational Foundation + PostgreSQL JSONB
Researchers frequently modify participant fields (e.g. age, handedness, sleep hours, native language) and trial response formats without requiring schema migrations.
- Stable entities (`users`, `organizations`, `experiments`, `experiment_versions`, `participant_sessions`, `consent_records`, `trial_results`, `audit_logs`) use standard relational columns with foreign keys and indexes.
- Experiment graph definitions, participant schemas, and trial responses are stored in **PostgreSQL JSONB** columns.
- On SQLite (local development fallback), SQLAlchemy maps JSONB dynamically to JSON.

### C. Immutable Versioning for Scientific Reproducibility
- Every published experiment is permanently stamped with an immutable `ExperimentVersion`.
- When a researcher updates an experiment, a new version is created.
- Participant sessions store the exact `experiment_version_id` used during the trial run.

### D. Privacy-by-Design and Participant Data Separation
- **No Participant Accounts**: Participants access studies via pseudonymous URLs without providing email or registering.
- **Cryptographic Pseudonyms**: Each session receives a cryptographically generated identifier (e.g., `P-8A9F1C02`).
- **Separation of Concerns**: Researcher demographic schemas are isolated from researcher dashboard metadata.
