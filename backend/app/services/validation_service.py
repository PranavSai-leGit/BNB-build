from typing import Dict, Any, List
from app.schemas.experiment import ValidationReport, ValidationIssue

def validate_experiment_definition(definition: Dict[str, Any]) -> ValidationReport:
    errors: List[ValidationIssue] = []
    warnings: List[ValidationIssue] = []

    nodes = definition.get("nodes", [])
    edges = definition.get("edges", [])
    consent = definition.get("consent", {})
    settings = definition.get("settings", {})

    # Rule 1: Check empty experiment
    if not nodes:
        errors.append(ValidationIssue(
            severity="error",
            message="Experiment cannot be empty. Add at least a start node, a stimulus/task, and a completion screen."
        ))
        return ValidationReport(valid=False, can_publish=False, errors=errors, warnings=warnings)

    node_ids = {n.get("id") for n in nodes}
    start_nodes = [n for n in nodes if n.get("type") == "start"]
    completion_nodes = [n for n in nodes if n.get("type") == "completion"]

    # Rule 2: Start node presence
    if len(start_nodes) == 0:
        errors.append(ValidationIssue(
            severity="error",
            field="nodes",
            message="Experiment is missing a 'start' node. Every experiment must have exactly one start point."
        ))
    elif len(start_nodes) > 1:
        errors.append(ValidationIssue(
            severity="error",
            field="nodes",
            message=f"Experiment contains multiple start nodes ({len(start_nodes)}). Only one start node is permitted."
        ))

    # Rule 3: Completion node check
    if len(completion_nodes) == 0:
        warnings.append(ValidationIssue(
            severity="warning",
            field="nodes",
            message="Experiment has no 'completion' node. Participants will end after the final trial without a debrief screen."
        ))

    # Build adjacency
    from_nodes = set()
    to_nodes = set()
    adjacency: Dict[str, List[str]] = {nid: [] for nid in node_ids}

    for edge in edges:
        from_id = edge.get("from") or edge.get("from_node")
        to_id = edge.get("to") or edge.get("to_node")

        if from_id not in node_ids:
            errors.append(ValidationIssue(
                severity="error",
                field="edges",
                message=f"Edge references unknown source node '{from_id}'."
            ))
        if to_id not in node_ids:
            errors.append(ValidationIssue(
                severity="error",
                field="edges",
                message=f"Edge references unknown destination node '{to_id}'."
            ))

        if from_id in adjacency and to_id:
            adjacency[from_id].append(to_id)
        if from_id:
            from_nodes.add(from_id)
        if to_id:
            to_nodes.add(to_id)

    # Check unreachable nodes (nodes with no incoming edge except start)
    for n in nodes:
        nid = n.get("id")
        ntype = n.get("type")
        props = n.get("props", {})

        if ntype != "start" and nid not in to_nodes:
            warnings.append(ValidationIssue(
                severity="warning",
                node_id=nid,
                message=f"Node '{nid}' ({ntype}) has no incoming connections and may be unreachable."
            ))

        if ntype != "completion" and nid not in from_nodes:
            warnings.append(ValidationIssue(
                severity="warning",
                node_id=nid,
                message=f"Node '{nid}' ({ntype}) has no outgoing connection and execution will stop here."
            ))

        # Check durations
        if ntype in ["fixation", "blank", "stimulus"]:
            duration = props.get("duration_ms")
            if duration is not None and duration <= 0:
                errors.append(ValidationIssue(
                    severity="error",
                    node_id=nid,
                    field="duration_ms",
                    message=f"Node '{nid}' has an invalid duration ({duration}ms). Duration must be a positive integer."
                ))

        # Check response node configuration
        if ntype == "response":
            resp_type = props.get("response_type", "keyboard")
            if resp_type == "keyboard":
                keys = props.get("allowed_keys", [])
                if not keys:
                    errors.append(ValidationIssue(
                        severity="error",
                        node_id=nid,
                        field="allowed_keys",
                        message=f"Keyboard response node '{nid}' must define at least one allowed key (e.g. 'ArrowLeft', 'ArrowRight', 'Space')."
                    ))
            elif resp_type in ["button", "multi_choice"]:
                options = props.get("options", [])
                if not options:
                    errors.append(ValidationIssue(
                        severity="error",
                        node_id=nid,
                        field="options",
                        message=f"Choice response node '{nid}' must specify selectable options."
                    ))

        # Check condition node
        if ntype == "condition":
            var_name = props.get("condition_variable")
            if not var_name:
                errors.append(ValidationIssue(
                    severity="error",
                    node_id=nid,
                    field="condition_variable",
                    message=f"Condition node '{nid}' does not specify a variable name to evaluate."
                ))

    # Check consent configuration
    if not consent or not consent.get("study_title"):
        warnings.append(ValidationIssue(
            severity="warning",
            field="consent",
            message="Study title is empty in the consent settings. Participants will see default research information."
        ))

    can_publish = len(errors) == 0

    return ValidationReport(
        valid=can_publish,
        can_publish=can_publish,
        errors=errors,
        warnings=warnings
    )
