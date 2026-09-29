import io
import csv
import json
from typing import Dict, Any, List, Optional
from datetime import datetime
from sqlalchemy.orm import Session
from app.models.experiment import Experiment, ExperimentVersion
from app.models.participant import ParticipantSession, TrialResult

def generate_automatic_data_dictionary(
    experiment: Experiment,
    version: ExperimentVersion,
    db: Optional[Session] = None
) -> Dict[str, Any]:
    """
    Automatically compiles an exhaustive, researcher-grade Data Dictionary
    from the experiment definition graph, Research Contract, and empirical trial data.
    Every variable documents:
    - name
    - label
    - type (string, integer, float, boolean, categorical)
    - unit (ms, boolean, years, count, —)
    - description
    - allowed_values
    - source (Trial Node, Participant Demographics, Timing Engine, Session Metadata)
    - missing_value_meaning
    - outcome_role (primary_outcome, secondary_outcome, independent_variable, covariate, diagnostic)
    - condition_role (condition name or N/A)
    """
    definition = version.definition or {}
    contract = definition.get("research_contract") or {}
    participant_schema = definition.get("participant_schema", [])
    nodes = definition.get("nodes", [])

    # Extract contract mappings
    iv_names = set()
    condition_names = set()
    for iv in contract.get("independent_variables", []):
        iv_names.add(iv.get("name", ""))
        for c in iv.get("conditions", []):
            if isinstance(c, dict):
                condition_names.add(c.get("name", ""))
            elif isinstance(c, str):
                condition_names.add(c)

    dv_map = {}
    for dv in contract.get("dependent_variables", []):
        dv_map[dv.get("required_measurement", "").lower()] = dv
        dv_map[dv.get("name", "").lower()] = dv

    # Infer condition values from nodes
    for n in nodes:
        props = n.get("props", {})
        cond = props.get("condition") or props.get("condition_name")
        if cond:
            condition_names.add(cond)

    variables: List[Dict[str, Any]] = []

    # 1. Core Identification & Protocol Provenance
    variables.append({
        "name": "participant_id",
        "label": "Participant Identifier",
        "type": "string",
        "unit": "—",
        "description": "Pseudonymous identifier generated per participant session conforming to GDPR privacy-by-design standards.",
        "allowed_values": "P- followed by 8 alphanumeric characters (e.g. P-A81B2C4D)",
        "source": "Session Metadata",
        "missing_value_meaning": "Mandatory; never missing",
        "outcome_role": "session_metadata",
        "condition_role": "N/A"
    })

    variables.append({
        "name": "experiment_version",
        "label": "Experiment Version Snapshot",
        "type": "integer",
        "unit": "count",
        "description": "Exact immutable published version number of the study protocol used during session execution.",
        "allowed_values": f"Integer >= 1 (Current: {version.version_number})",
        "source": "Experiment Registry",
        "missing_value_meaning": "Mandatory; never missing",
        "outcome_role": "session_metadata",
        "condition_role": "N/A"
    })

    variables.append({
        "name": "sequence_number",
        "label": "Trial Sequence Position",
        "type": "integer",
        "unit": "count",
        "description": "Sequential presentation index of the trial within the participant's experimental session (0-indexed).",
        "allowed_values": "Non-negative integer (0, 1, 2, ...)",
        "source": "Trial Engine",
        "missing_value_meaning": "Mandatory; never missing",
        "outcome_role": "session_metadata",
        "condition_role": "N/A"
    })

    variables.append({
        "name": "trial_id",
        "label": "Builder Node Identifier",
        "type": "string",
        "unit": "—",
        "description": "Unique identifier of the builder canvas node responsible for presenting this trial event.",
        "allowed_values": "Node ID string (e.g. stimulus_170129, response_node_4)",
        "source": "Builder Definition",
        "missing_value_meaning": "Mandatory; never missing",
        "outcome_role": "session_metadata",
        "condition_role": "N/A"
    })

    # 2. Independent Variables & Experimental Conditions
    allowed_conds = sorted(list(condition_names)) if condition_names else ["congruent", "incongruent"]
    variables.append({
        "name": "condition",
        "label": "Experimental Condition",
        "type": "categorical",
        "unit": "—",
        "description": "Experimental condition or treatment arm assigned to this trial for hypothesis testing.",
        "allowed_values": ", ".join(allowed_conds),
        "source": "Trial Configuration / Randomization Engine",
        "missing_value_meaning": "'default' if non-conditioned baseline trial",
        "outcome_role": "independent_variable",
        "condition_role": "Primary IV"
    })

    # 3. Behavioral Response Variables
    variables.append({
        "name": "response_key_or_value",
        "label": "Participant Response Selection",
        "type": "string",
        "unit": "—",
        "description": "Raw behavioral response input captured from keyboard keypress or on-screen button selection.",
        "allowed_values": "Keyboard key name (e.g. 'ArrowLeft', 'ArrowRight', 'f', 'j') or button option label",
        "source": "ResponseCollector",
        "missing_value_meaning": "Null indicates trial timeout or omitted participant response",
        "outcome_role": "behavioral_response",
        "condition_role": "N/A"
    })

    variables.append({
        "name": "reaction_time_ms",
        "label": "Reaction Time Latency",
        "type": "float",
        "unit": "ms",
        "description": "High-resolution latency from visual stimulus display onset to participant response registration measured via window.performance.now().",
        "allowed_values": "Positive float in milliseconds (typically 150.0 to 3000.0 ms)",
        "source": "TimingEngine (performance.now)",
        "missing_value_meaning": "Null if participant timed out without responding",
        "outcome_role": "primary_outcome" if ("reaction_time" in dv_map or "reaction_time_ms" in dv_map) else "secondary_outcome",
        "condition_role": "Dependent Variable"
    })

    variables.append({
        "name": "is_correct",
        "label": "Response Accuracy Classification",
        "type": "boolean",
        "unit": "boolean",
        "description": "Binary scoring of participant response against the pre-configured correct answer or instruction rule.",
        "allowed_values": "True (correct), False (incorrect)",
        "source": "ConditionEvaluator / ResponseScorer",
        "missing_value_meaning": "Null if no target correct response was configured for this trial",
        "outcome_role": "primary_outcome" if ("accuracy" in dv_map or "is_correct" in dv_map) else "secondary_outcome",
        "condition_role": "Dependent Variable"
    })

    # 4. Display & Timing Fidelity Telemetry
    variables.append({
        "name": "stimulus_presented_at",
        "label": "Stimulus Onset Performance Timestamp",
        "type": "float",
        "unit": "ms",
        "description": "High-resolution DOMHighResTimeStamp recorded at the moment of requestAnimationFrame VSYNC screen refresh.",
        "allowed_values": "Relative sub-millisecond timestamp from document navigation start",
        "source": "TimingEngine (requestAnimationFrame)",
        "missing_value_meaning": "Null on non-visual or non-timed transition screens",
        "outcome_role": "timing_diagnostic",
        "condition_role": "N/A"
    })

    variables.append({
        "name": "frame_drops",
        "label": "Display Frame Drops Count",
        "type": "integer",
        "unit": "count",
        "description": "Number of dropped or skipped VSYNC refresh cycles detected between requestAnimationFrame cycles.",
        "allowed_values": "Integer >= 0 (0 indicates smooth presentation)",
        "source": "Hardware Diagnostics Engine",
        "missing_value_meaning": "0 (zero dropped frames)",
        "outcome_role": "timing_diagnostic",
        "condition_role": "N/A"
    })

    # 5. Dynamic Researcher Demographics (from participant_schema)
    for f in participant_schema:
        fid = f.get("id")
        flabel = f.get("label", fid)
        ftype = f.get("type", "text")

        type_map = {
            "number": "integer",
            "select": "categorical",
            "boolean": "boolean",
            "text": "string"
        }
        unit_map = {
            "number": "count",
            "boolean": "boolean",
            "select": "—",
            "text": "—"
        }

        variables.append({
            "name": f"participant_{fid}",
            "label": f"Demographic: {flabel}",
            "type": type_map.get(ftype, "string"),
            "unit": unit_map.get(ftype, "—"),
            "description": f"Researcher-configured participant intake attribute: {flabel}.",
            "allowed_values": ", ".join(f.get("options", [])) if f.get("options") else f"Free {ftype} input",
            "source": "Participant Intake Form",
            "missing_value_meaning": "Null if optional and skipped by participant",
            "outcome_role": "demographic_covariate",
            "condition_role": "N/A"
        })

    return {
        "study_name": experiment.name,
        "study_id": experiment.id,
        "version_number": version.version_number,
        "variables_count": len(variables),
        "variables": variables,
        "generated_at": datetime.utcnow().isoformat()
    }


def export_data_dictionary_csv(dictionary_data: Dict[str, Any]) -> str:
    """Exports data dictionary as standardized tabular CSV."""
    output = io.StringIO()
    writer = csv.writer(output)

    headers = [
        "Variable Name",
        "Label",
        "Type",
        "Unit",
        "Description",
        "Allowed Values",
        "Source",
        "Outcome Role",
        "Missing Value Meaning"
    ]
    writer.writerow(headers)

    for var in dictionary_data.get("variables", []):
        writer.writerow([
            var.get("name"),
            var.get("label"),
            var.get("type"),
            var.get("unit"),
            var.get("description"),
            var.get("allowed_values"),
            var.get("source"),
            var.get("outcome_role"),
            var.get("missing_value_meaning")
        ])

    return output.getvalue()


def export_data_dictionary_markdown(dictionary_data: Dict[str, Any]) -> str:
    """Exports data dictionary formatted as readable GitHub-flavored Markdown."""
    lines = []
    lines.append(f"# Research Data Dictionary — {dictionary_data.get('study_name', 'Experiment')}")
    lines.append(f"**Experiment Version:** v{dictionary_data.get('version_number', 1)}  ")
    lines.append(f"**Generated:** {dictionary_data.get('generated_at', '')}  ")
    lines.append(f"**Variables Documented:** {dictionary_data.get('variables_count', 0)}\n")
    lines.append("| Variable Name | Label | Type | Unit | Description | Allowed Values | Source |")
    lines.append("| :--- | :--- | :--- | :--- | :--- | :--- | :--- |")

    for var in dictionary_data.get("variables", []):
        desc = str(var.get("description", "")).replace("|", "\\|")
        allowed = str(var.get("allowed_values", "")).replace("|", "\\|")
        lines.append(f"| `{var.get('name')}` | {var.get('label')} | {var.get('type')} | {var.get('unit')} | {desc} | {allowed} | {var.get('source')} |")

    lines.append("\n---\n*Preserved under Cognera Research Passport reproducibility specifications.*")
    return "\n".join(lines)
