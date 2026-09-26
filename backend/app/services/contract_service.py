from typing import Dict, Any, List, Optional
from datetime import datetime

def get_default_research_contract(definition: Dict[str, Any] = None) -> Dict[str, Any]:
    """Generates a default research contract, inferring conditions from definition if available."""
    defn = definition or {}
    nodes = defn.get("nodes", [])

    # Infer conditions from stimulus/condition nodes
    found_conditions = set()
    for n in nodes:
        props = n.get("props", {})
        cond = props.get("condition") or props.get("condition_name")
        if cond:
            found_conditions.add(cond)

    conditions_list = []
    if found_conditions:
        for c in sorted(list(found_conditions)):
            conditions_list.append({
                "id": f"cond_{c.lower().replace(' ', '_')}",
                "name": c,
                "description": f"Experimental presentation condition: {c}",
                "expected_trial_count": sum(1 for n in nodes if (n.get("props", {}).get("condition") == c or n.get("props", {}).get("condition_name") == c))
            })
    else:
        conditions_list = [
            {"id": "cond_congruent", "name": "congruent", "description": "Stimulus color matches word text", "expected_trial_count": 5},
            {"id": "cond_incongruent", "name": "incongruent", "description": "Stimulus color conflicts with word text", "expected_trial_count": 5}
        ]

    return {
        "version": "1.0",
        "research_question": "Does semantic interference modulate behavioral response latency and accuracy in perceptual decision-making?",
        "hypothesis": "Participants will exhibit significantly slower reaction times and higher error rates under conflicting or incongruent conditions compared to congruent conditions.",
        "independent_variables": [
            {
                "id": "iv_interference",
                "name": "Cognitive Interference Condition",
                "type": "within_subject",
                "description": "Manipulation of perceptual and semantic congruence during target presentation.",
                "conditions": conditions_list
            }
        ],
        "dependent_variables": [
            {
                "id": "dv_reaction_time",
                "name": "Reaction Time",
                "measurement_type": "reaction_time",
                "unit": "ms",
                "role": "primary",
                "required_measurement": "reaction_time_ms",
                "description": "Time elapsed between visual stimulus onset and participant response keypress."
            },
            {
                "id": "dv_accuracy",
                "name": "Response Accuracy",
                "measurement_type": "accuracy",
                "unit": "boolean",
                "role": "secondary",
                "required_measurement": "is_correct",
                "description": "Correct classification of the stimulus attribute based on experimental instructions."
            }
        ],
        "created_at": datetime.utcnow().isoformat(),
        "updated_at": datetime.utcnow().isoformat()
    }


def validate_research_contract_alignment(
    contract: Optional[Dict[str, Any]],
    definition: Dict[str, Any]
) -> Dict[str, Any]:
    """
    Evaluates alignment between Research Contract and actual experiment implementation.
    Identifies measurement gaps, missing conditions, orphan experimental conditions, and IV mismatches.
    Returns clear, non-judgmental warnings and diagnostic coverage metrics.
    """
    mismatches: List[Dict[str, Any]] = []
    nodes = definition.get("nodes", [])

    if not contract:
        return {
            "valid": True,
            "has_contract": False,
            "mismatches": [{
                "id": "contract_missing",
                "category": "Contract Missing",
                "severity": "info",
                "title": "Research Contract Not Initialized",
                "message": "No formal research contract defined. Establish your research question, hypothesis, variables, and measurements for end-to-end traceability.",
                "recommendation": "Configure a Research Contract in the Research Contract tab to link your study design to trial configuration."
            }],
            "summary": {"errors": 0, "warnings": 0, "info": 1, "coverage_pct": 0},
            "condition_coverage": {},
            "measurement_coverage": {}
        }

    research_q = contract.get("research_question", "").strip()
    hypothesis = contract.get("hypothesis", "").strip()
    ivs = contract.get("independent_variables", [])
    dvs = contract.get("dependent_variables", [])

    # 1. Hypothesis & Question Clarity
    if not research_q:
        mismatches.append({
            "id": "warn_empty_research_question",
            "category": "Design Specification",
            "severity": "warning",
            "title": "Missing Research Question",
            "message": "The research contract does not specify an explicit research question.",
            "recommendation": "Define the primary scientific question this experiment investigates."
        })

    if not hypothesis:
        mismatches.append({
            "id": "warn_empty_hypothesis",
            "category": "Design Specification",
            "severity": "warning",
            "title": "Missing Hypothesis",
            "message": "The research contract does not specify an operational hypothesis.",
            "recommendation": "Articulate the expected directional or non-directional outcome between conditions."
        })

    # Collect experiment graph properties
    experiment_conditions: Dict[str, List[str]] = {} # condition_name -> list of node_ids
    trial_types_without_rt: List[str] = []
    trial_types_without_accuracy: List[str] = []
    has_timing_measurement_nodes = False
    has_response_nodes = False

    for n in nodes:
        ntype = n.get("type")
        nid = n.get("id")
        props = n.get("props", {})

        cond = props.get("condition") or props.get("condition_name")
        if cond:
            cond_key = str(cond).strip().lower()
            if cond_key not in experiment_conditions:
                experiment_conditions[cond_key] = []
            experiment_conditions[cond_key].append(nid)

        if ntype == "response":
            has_response_nodes = True
            # Check if this response node collects RT
            # Keyboard and button responses collect RT by default in runtime,
            # but if duration or timeout is missing or custom non-timed
            if props.get("response_type") == "none":
                trial_types_without_rt.append(n.get("label", nid))
            else:
                has_timing_measurement_nodes = True

            # Check if correct response is defined for accuracy evaluation
            if not props.get("correct_response") and not props.get("expected_key"):
                trial_types_without_accuracy.append(n.get("label", nid))

        elif ntype == "stimulus":
            # Stimulus nodes with no subsequent response node
            stim_cond = props.get("condition") or props.get("condition_name")
            if stim_cond:
                cond_key = str(stim_cond).strip().lower()
                if cond_key not in experiment_conditions:
                    experiment_conditions[cond_key] = []
                experiment_conditions[cond_key].append(nid)

    # 2. Independent Variable & Condition Alignment
    total_contract_conditions = 0
    matched_conditions = 0
    condition_coverage_map = {}

    for iv in ivs:
        iv_name = iv.get("name", "Unnamed IV")
        conditions = iv.get("conditions", [])
        iv_matched_count = 0

        for cond in conditions:
            total_contract_conditions += 1
            if isinstance(cond, dict):
                cond_name = cond.get("name", "").strip()
                cond_id = cond.get("id", cond_name)
            else:
                cond_name = str(cond).strip()
                cond_id = cond_name
            cond_key = cond_name.lower()

            matching_nodes = experiment_conditions.get(cond_key, [])
            if matching_nodes:
                matched_conditions += 1
                iv_matched_count += 1
                condition_coverage_map[cond_name] = {
                    "matched": True,
                    "trial_count": len(matching_nodes),
                    "node_ids": matching_nodes
                }
            else:
                condition_coverage_map[cond_name] = {
                    "matched": False,
                    "trial_count": 0,
                    "node_ids": []
                }
                mismatches.append({
                    "id": f"mismatch_condition_missing_{cond_id or cond_key}",
                    "category": "Condition Representation",
                    "severity": "warning",
                    "title": f"Condition Unrepresented: '{cond_name}'",
                    "message": f"Condition '{cond_name}' is defined under independent variable '{iv_name}' in the Research Contract, but has no corresponding trials in the experiment graph.",
                    "recommendation": f"Add trial nodes assigned to condition '{cond_name}' or update the Research Contract if this condition was removed."
                })

        if len(conditions) > 0 and iv_matched_count == 0:
            mismatches.append({
                "id": f"mismatch_iv_absent_{iv.get('id')}",
                "category": "Independent Variable",
                "severity": "warning",
                "title": f"Independent Variable Absent: '{iv_name}'",
                "message": f"Independent variable '{iv_name}' exists in the contract, but none of its {len(conditions)} defined conditions are present in the experiment.",
                "recommendation": f"Ensure experiment trials implement the operational conditions for '{iv_name}'."
            })

    # Check for orphan conditions in the experiment that are NOT in the contract
    contract_condition_names = set()
    for iv in ivs:
        for c in iv.get("conditions", []):
            c_name = c.get("name", "") if isinstance(c, dict) else str(c)
            contract_condition_names.add(str(c_name).strip().lower())

    for exp_cond, node_list in experiment_conditions.items():
        if exp_cond and exp_cond not in contract_condition_names and exp_cond != "default":
            mismatches.append({
                "id": f"mismatch_orphan_condition_{exp_cond}",
                "category": "Unmapped Condition",
                "severity": "info",
                "title": f"Unmapped Experiment Condition: '{exp_cond}'",
                "message": f"Trial configuration assigns condition tag '{exp_cond}' to {len(node_list)} nodes, but this condition is not registered in the Research Contract.",
                "recommendation": f"Add condition '{exp_cond}' to the relevant independent variable in your Research Contract."
            })

    # 3. Dependent Variable & Measurement Gaps
    measurement_coverage_map = {}
    for dv in dvs:
        dv_name = dv.get("name", "Unnamed Outcome")
        m_type = dv.get("measurement_type", "custom")
        req_measurement = dv.get("required_measurement", "")
        role = dv.get("role", "primary")

        if m_type == "reaction_time" or "rt" in req_measurement.lower():
            if not has_response_nodes or not has_timing_measurement_nodes:
                mismatches.append({
                    "id": f"gap_rt_no_timing_{dv.get('id')}",
                    "category": "Measurement Gap",
                    "severity": "error" if role == "primary" else "warning",
                    "title": "Measurement gap: Reaction Time",
                    "message": f"'{dv_name}' is defined as a {role} outcome, but the experiment does not contain active response nodes collecting high-resolution timestamps.",
                    "recommendation": "Add a response node (keyboard or button choice) with high-precision timing enabled."
                })
                measurement_coverage_map[dv_name] = {"status": "missing", "details": "No timing response nodes found"}
            elif len(trial_types_without_rt) > 0:
                count_unmeasured = len(trial_types_without_rt)
                mismatches.append({
                    "id": f"gap_rt_partial_{dv.get('id')}",
                    "category": "Measurement Gap",
                    "severity": "warning",
                    "title": "Measurement gap: Response Timestamps",
                    "message": f"Reaction Time is defined as a {role} outcome, but {count_unmeasured} trial types do not collect response timestamps.",
                    "recommendation": "Review trial node response configurations to ensure all analytical trials produce reaction time metrics."
                })
                measurement_coverage_map[dv_name] = {"status": "partial", "details": f"{count_unmeasured} trial nodes without RT"}
            else:
                measurement_coverage_map[dv_name] = {"status": "verified", "details": "High-res performance.now() timing active on all response nodes"}

        elif m_type == "accuracy" or "accuracy" in req_measurement.lower() or "correct" in req_measurement.lower():
            if not has_response_nodes:
                mismatches.append({
                    "id": f"gap_acc_no_nodes_{dv.get('id')}",
                    "category": "Measurement Gap",
                    "severity": "error" if role == "primary" else "warning",
                    "title": f"Measurement gap: {dv_name}",
                    "message": f"'{dv_name}' is defined as a {role} outcome, but no participant response nodes exist in the study graph.",
                    "recommendation": "Add interactive response nodes to record participant answers."
                })
                measurement_coverage_map[dv_name] = {"status": "missing", "details": "No response nodes"}
            elif len(trial_types_without_accuracy) == sum(1 for n in nodes if n.get("type") == "response"):
                mismatches.append({
                    "id": f"gap_acc_no_criteria_{dv.get('id')}",
                    "category": "Measurement Gap",
                    "severity": "warning",
                    "title": "Measurement gap: Accuracy Evaluation Criteria",
                    "message": f"'{dv_name}' is defined as a {role} outcome, but trial response nodes do not define correct responses or target keys for accuracy scoring.",
                    "recommendation": "Configure 'Correct Response' in the response node inspector for automatic accuracy computation."
                })
                measurement_coverage_map[dv_name] = {"status": "unscored", "details": "No correct answer scoring criteria configured"}
            else:
                measurement_coverage_map[dv_name] = {"status": "verified", "details": "Correct response criteria configured on response trials"}
        else:
            # Custom measurement
            measurement_coverage_map[dv_name] = {"status": "verified", "details": f"Configured for variable '{req_measurement or dv_name}'"}

    # Calculate overall alignment coverage
    coverage_pct = 100.0
    if total_contract_conditions > 0:
        coverage_pct = round((matched_conditions / total_contract_conditions) * 100, 1)

    errors_count = sum(1 for m in mismatches if m["severity"] == "error")
    warnings_count = sum(1 for m in mismatches if m["severity"] == "warning")
    info_count = sum(1 for m in mismatches if m["severity"] == "info")

    return {
        "valid": errors_count == 0,
        "has_contract": True,
        "contract_version": contract.get("version", "1.0"),
        "mismatches": mismatches,
        "summary": {
            "errors": errors_count,
            "warnings": warnings_count,
            "info": info_count,
            "coverage_pct": coverage_pct,
            "total_conditions": total_contract_conditions,
            "matched_conditions": matched_conditions
        },
        "condition_coverage": condition_coverage_map,
        "measurement_coverage": measurement_coverage_map,
        "evaluated_at": datetime.utcnow().isoformat()
    }
