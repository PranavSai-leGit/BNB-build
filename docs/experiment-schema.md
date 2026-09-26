# CogniLab Experiment JSON Specification

The CogniLab experiment definition is stored as a validated JSONB object within each `experiment_versions` row. It defines all display stimuli, timing, response mechanisms, conditional branching, and randomization rules.

---

## 1. Top-Level Experiment Definition Schema

```json
{
  "name": "Visual Reaction Time & Stroop Interference Task",
  "version": 1,
  "settings": {
    "fullscreen": true,
    "allow_mobile": false,
    "timeout_warning_seconds": 60,
    "record_timing_diagnostics": true,
    "theme": "dark"
  },
  "consent": {
    "study_title": "Visual Processing & Cognitive Interference Protocol #2026-44B",
    "purpose": "To evaluate selective attention mechanisms and motor reaction latencies in visual conflict tasks.",
    "duration_minutes": 5,
    "procedures": "Respond as accurately and quickly as possible to color targets using keyboard arrow keys.",
    "risks": "Minimal risk. Mild visual engagement on screen.",
    "benefits": "Advances scientific understanding of human cognitive architecture.",
    "data_collected": "Pseudonymous keypresses, reaction times, and demographic survey answers.",
    "data_retention_policy": "Retained under secure pseudonymous identifiers for 90 days.",
    "researcher_contact": "vance.lab@cognilab.edu",
    "withdrawal_statement": "Participation is completely voluntary. You may withdraw at any time by closing your browser tab or clicking Withdraw."
  },
  "participant_schema": [
    {
      "id": "age",
      "label": "Age",
      "type": "number",
      "required": true
    },
    {
      "id": "handedness",
      "label": "Handedness",
      "type": "select",
      "options": ["Right", "Left", "Ambidextrous"],
      "required": true
    }
  ],
  "nodes": [],
  "edges": [],
  "randomization_groups": []
}
```

---

## 2. Node Types & Properties

### 1. `start`
The entry point of the experiment graph. Exactly one `start` node must exist.
```json
{
  "id": "node_start",
  "type": "start",
  "label": "Start Experiment",
  "props": {},
  "position": { "x": 250, "y": 0 }
}
```

### 2. `instructions`
Displays directions before trials begin.
```json
{
  "id": "node_instructions",
  "type": "instructions",
  "label": "Task Instructions",
  "props": {
    "title": "Task Directions",
    "instructions": "Press LEFT ARROW for RED and RIGHT ARROW for BLUE."
  }
}
```

### 3. `fixation`
Renders a high-contrast center fixation cross for a specific duration in milliseconds.
```json
{
  "id": "fix_1",
  "type": "fixation",
  "label": "Fixation Cross",
  "props": {
    "duration_ms": 500
  }
}
```

### 4. `stimulus`
Presents a visual stimulus (text, image, or blank ISI).
```json
{
  "id": "stim_1",
  "type": "stimulus",
  "label": "Target Stimulus",
  "props": {
    "stimulus_type": "text",
    "stimulus_content": "BLUE",
    "duration_ms": 1000,
    "custom": {
      "color": "#3b82f6",
      "condition": "congruent"
    }
  }
}
```

### 5. `response`
Activates response listeners (keyboard or on-screen choice buttons) and records reaction time.
```json
{
  "id": "resp_1",
  "type": "response",
  "label": "Response Capture",
  "props": {
    "response_type": "keyboard",
    "allowed_keys": ["ArrowLeft", "ArrowRight"],
    "correct_response": "ArrowRight",
    "timeout_ms": 2500
  }
}
```

### 6. `condition`
Branches execution dynamically based on trial accuracy, reaction time, or custom variables.
```json
{
  "id": "cond_1",
  "type": "condition",
  "label": "Check Accuracy",
  "props": {
    "condition_variable": "is_correct",
    "condition_operator": "==",
    "condition_value": true
  }
}
```

### 7. `feedback`
Brief feedback badge showing correct or incorrect indicator.
```json
{
  "id": "fb_1",
  "type": "feedback",
  "label": "Feedback",
  "props": {
    "feedback_text_correct": "Correct (+1)",
    "feedback_text_incorrect": "Incorrect",
    "feedback_duration_ms": 500
  }
}
```

### 8. `completion`
Debriefing and thank-you screen that triggers participant session completion and confetti.
```json
{
  "id": "node_comp",
  "type": "completion",
  "label": "Completion Screen",
  "props": {
    "title": "Study Completed",
    "instructions": "Thank you for contributing to cognitive science research!"
  }
}
```

---

## 3. Edges Schema

Edges connect nodes and define flow routing:
```json
[
  {
    "id": "e_fix_stim",
    "from": "fix_1",
    "to": "stim_1",
    "branch": "default"
  },
  {
    "id": "e_cond_correct",
    "from": "cond_1",
    "to": "feedback_correct",
    "branch": "true"
  },
  {
    "id": "e_cond_incorrect",
    "from": "cond_1",
    "to": "feedback_incorrect",
    "branch": "false"
  }
]
```
