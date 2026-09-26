import random
from datetime import datetime, timedelta
from app.database import SessionLocal, Base, engine
from app.models.user import User
from app.models.organization import Organization, OrganizationMember
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession, ConsentRecord, TrialResult
from app.security.auth import get_password_hash

def seed_database():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()

    try:
        # Check if already seeded
        existing_user = db.query(User).filter(User.email == "researcher@cognilab.edu").first()
        if existing_user:
            print("Database already contains seed data.")
            return

        # 1. Organization
        org = Organization(
            name="Center for Cognitive & Neural Science",
            slug="ccns-lab",
            description="Interdisciplinary research laboratory exploring visual perception, memory, and cognitive control."
        )
        db.add(org)
        db.flush()

        # 2. Researcher & Admin Users
        researcher = User(
            email="researcher@cognilab.edu",
            hashed_password=get_password_hash("CogniLab2026!"),
            full_name="Dr. Elena Vance",
            role="researcher",
            organization_id=org.id
        )
        admin = User(
            email="admin@cognilab.edu",
            hashed_password=get_password_hash("CogniLabAdmin2026!"),
            full_name="Prof. David Chen",
            role="org_admin",
            organization_id=org.id
        )
        db.add_all([researcher, admin])
        db.flush()

        db.add_all([
            OrganizationMember(organization_id=org.id, user_id=researcher.id, role="member"),
            OrganizationMember(organization_id=org.id, user_id=admin.id, role="admin")
        ])

        # 3. Hackathon Demo Experiment: "Visual Reaction Time & Stroop Interference Task"
        demo_nodes = [
            {"id": "node_start", "type": "start", "label": "Start", "props": {}, "position": {"x": 250, "y": 0}},
            {
                "id": "node_instructions",
                "type": "instructions",
                "label": "Instructions",
                "props": {
                    "title": "Visual Reaction Time & Interference Study",
                    "instructions": "In this experiment, you will see a fixation cross (+) followed by color words. Press LEFT ARROW for RED and RIGHT ARROW for BLUE as quickly and accurately as possible. Keep your fingers resting on the arrow keys."
                },
                "position": {"x": 250, "y": 80}
            }
        ]

        # Generate 10 trials (congruent vs incongruent visual trials)
        trial_configs = [
            ("RED", "#ef4444", "ArrowLeft", "congruent"),
            ("BLUE", "#3b82f6", "ArrowRight", "congruent"),
            ("RED", "#3b82f6", "ArrowRight", "incongruent"), # Word RED printed in Blue ink
            ("BLUE", "#ef4444", "ArrowLeft", "incongruent"), # Word BLUE printed in Red ink
            ("RED", "#ef4444", "ArrowLeft", "congruent"),
            ("BLUE", "#3b82f6", "ArrowRight", "congruent"),
            ("BLUE", "#ef4444", "ArrowLeft", "incongruent"),
            ("RED", "#3b82f6", "ArrowRight", "incongruent"),
            ("RED", "#ef4444", "ArrowLeft", "congruent"),
            ("BLUE", "#3b82f6", "ArrowRight", "congruent")
        ]

        edges = [
            {"id": "e_start_instr", "from": "node_start", "to": "node_instructions"}
        ]

        last_node_id = "node_instructions"
        y_offset = 160

        for i, (word, color, correct_key, condition) in enumerate(trial_configs, 1):
            fix_id = f"fix_{i}"
            stim_id = f"stim_{i}"
            resp_id = f"resp_{i}"
            fb_id = f"fb_{i}"

            demo_nodes.extend([
                {
                    "id": fix_id,
                    "type": "fixation",
                    "label": f"Fixation {i}",
                    "props": {"duration_ms": 500},
                    "position": {"x": 250, "y": y_offset}
                },
                {
                    "id": stim_id,
                    "type": "stimulus",
                    "label": f"Target {i} ({condition})",
                    "props": {
                        "stimulus_type": "text",
                        "stimulus_content": word,
                        "custom": {"color": color, "condition": condition},
                        "duration_ms": 1000
                    },
                    "position": {"x": 250, "y": y_offset + 70}
                },
                {
                    "id": resp_id,
                    "type": "response",
                    "label": f"Response {i}",
                    "props": {
                        "response_type": "keyboard",
                        "allowed_keys": ["ArrowLeft", "ArrowRight"],
                        "correct_response": correct_key,
                        "timeout_ms": 2500,
                        "condition": condition
                    },
                    "position": {"x": 250, "y": y_offset + 140}
                },
                {
                    "id": fb_id,
                    "type": "feedback",
                    "label": f"Feedback {i}",
                    "props": {
                        "feedback_text_correct": "Correct (+1)",
                        "feedback_text_incorrect": "Incorrect",
                        "feedback_duration_ms": 400
                    },
                    "position": {"x": 250, "y": y_offset + 210}
                }
            ])

            edges.extend([
                {"id": f"e_{last_node_id}_{fix_id}", "from": last_node_id, "to": fix_id},
                {"id": f"e_{fix_id}_{stim_id}", "from": fix_id, "to": stim_id},
                {"id": f"e_{stim_id}_{resp_id}", "from": stim_id, "to": resp_id},
                {"id": f"e_{resp_id}_{fb_id}", "from": resp_id, "to": fb_id},
            ])

            last_node_id = fb_id
            y_offset += 280

        # Completion node
        comp_node_id = "node_completion"
        demo_nodes.append({
            "id": comp_node_id,
            "type": "completion",
            "label": "Completion & Debrief",
            "props": {
                "title": "Experiment Complete!",
                "instructions": "Thank you for contributing to cognitive science research! Your reaction times and accuracy have been recorded pseudonymously."
            },
            "position": {"x": 250, "y": y_offset}
        })
        edges.append({"id": f"e_{last_node_id}_{comp_node_id}", "from": last_node_id, "to": comp_node_id})

        demo_definition = {
            "name": "Visual Reaction Time & Interference Task",
            "version": 1,
            "settings": {
                "fullscreen": True,
                "allow_mobile": False,
                "timeout_warning_seconds": 60,
                "record_timing_diagnostics": True,
                "theme": "dark"
            },
            "consent": {
                "study_title": "Visual Processing & Cognitive Interference Protocol #2026-44B",
                "purpose": "To evaluate selective attention mechanisms and motor reaction latencies in visual conflict tasks.",
                "duration_minutes": 5,
                "procedures": "You will observe brief color words and press ArrowLeft or ArrowRight. Response precision and latency are logged in your browser with high-resolution performance timers.",
                "risks": "Minimal risk. Mild visual engagement on screen.",
                "benefits": "Advances scientific understanding of human cognitive architecture and neural response inhibition.",
                "data_collected": "Pseudonymous keypresses, browser-side reaction times, and demographic survey inputs (age, handedness, sleep hours). No personal names, emails, or IP addresses are stored.",
                "data_retention_policy": "Retained under secure pseudonymous identifiers for 90 days, after which data is purged.",
                "researcher_contact": "vance.lab@cognilab.edu",
                "withdrawal_statement": "Participation is completely voluntary. You can withdraw at any point without penalty by closing your browser tab or clicking the Withdraw button."
            },
            "participant_schema": [
                {"id": "age", "label": "Age", "type": "number", "required": True},
                {"id": "handedness", "label": "Handedness", "type": "select", "options": ["Right", "Left", "Ambidextrous"], "required": True},
                {"id": "sleep_hours", "label": "Hours of sleep last night", "type": "number", "required": False}
            ],
            "nodes": demo_nodes,
            "edges": edges,
            "randomization_groups": [
                {
                    "id": "rg_1",
                    "name": "Trial Randomizer",
                    "shuffle": True,
                    "stimulus_pool": ["RED", "BLUE"],
                    "counterbalance_groups": ["Group_A_LeftDominant", "Group_B_RightDominant"]
                }
            ]
        }

        demo_exp = Experiment(
            owner_id=researcher.id,
            organization_id=org.id,
            public_id="vis-rt-demo",
            name="Visual Reaction Time & Interference Task",
            description="Standard 10-trial visual reaction time and Stroop interference protocol with high-resolution millisecond timing.",
            status="published",
            retention_days=90,
            current_version_number=1,
            consent_config=demo_definition["consent"]
        )
        db.add(demo_exp)
        db.flush()

        demo_version = ExperimentVersion(
            experiment_id=demo_exp.id,
            version_number=1,
            definition=demo_definition,
            changelog="Initial publication of 10-trial visual interference paradigm",
            published_at=datetime.utcnow() - timedelta(days=2)
        )
        db.add(demo_version)
        db.flush()

        # 4. Generate 12 sample completed participant sessions with realistic cognitive data
        print("Generating mock participant sessions for demo visualization...")
        hand_choices = ["Right", "Right", "Right", "Left", "Ambidextrous"]
        qualities = ["Good", "Good", "Normal", "Normal", "Good"]

        for p_idx in range(1, 13):
            p_code = f"P-{1000 + p_idx}"
            session = ParticipantSession(
                experiment_id=demo_exp.id,
                experiment_version_id=demo_version.id,
                participant_id=p_code,
                status="completed",
                participant_data={
                    "age": random.randint(19, 36),
                    "handedness": random.choice(hand_choices),
                    "sleep_hours": round(random.uniform(5.5, 8.5), 1)
                },
                browser_metadata={
                    "user_agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) Chrome/122.0.0.0",
                    "screen_width": 1920,
                    "screen_height": 1080,
                    "device_pixel_ratio": 1.0,
                    "estimated_refresh_rate": 60.0,
                    "timing_api_supported": True,
                    "timing_quality": random.choice(qualities)
                },
                started_at=datetime.utcnow() - timedelta(hours=random.randint(2, 48)),
                completed_at=datetime.utcnow() - timedelta(hours=random.randint(1, 47))
            )
            db.add(session)
            db.flush()

            # Consent record
            consent_rec = ConsentRecord(
                session_id=session.id,
                consent_version="1.0",
                accepted=True,
                accepted_at=session.started_at
            )
            db.add(consent_rec)

            # Generate 10 trials
            base_time = 1000.0
            for seq, (word, color, correct_key, condition) in enumerate(trial_configs, 1):
                # Congruent RT is typically faster (320-440ms), Incongruent RT is slower (420-620ms) - Stroop effect!
                if condition == "congruent":
                    rt = round(random.normalvariate(375, 45), 2)
                    is_correct = random.random() > 0.05
                else:
                    rt = round(random.normalvariate(485, 60), 2)
                    is_correct = random.random() > 0.12

                rt = max(180.0, rt) # Physiologically realistic clamp
                resp_key = correct_key if is_correct else ("ArrowRight" if correct_key == "ArrowLeft" else "ArrowLeft")

                stim_req = base_time + (seq * 2000)
                stim_pres = stim_req + random.uniform(8.0, 16.6) # Display refresh sync
                resp_rec = stim_pres + rt

                tr = TrialResult(
                    session_id=session.id,
                    trial_id=f"trial_{seq}",
                    sequence_number=seq,
                    condition=condition,
                    stimulus_id=f"stim_{word.lower()}",
                    response_data={
                        "key": resp_key,
                        "button": resp_key,
                        "is_correct": is_correct,
                        "accuracy": 1 if is_correct else 0,
                        "confidence": random.randint(4, 5)
                    },
                    timing_data={
                        "stimulus_requested_at": round(stim_req, 2),
                        "stimulus_presented_at": round(stim_pres, 2),
                        "response_received_at": round(resp_rec, 2),
                        "reaction_time": rt,
                        "frame_interval_ms": 16.67
                    },
                    created_at=session.started_at + timedelta(seconds=seq * 3)
                )
                db.add(tr)

        db.commit()
        print("Database seeding completed successfully with demo experiment and sample sessions!")

    except Exception as e:
        db.rollback()
        print(f"Error seeding database: {e}")
        raise e
    finally:
        db.close()

if __name__ == "__main__":
    seed_database()
