from typing import Dict, Any, List, Set
from collections import defaultdict, deque

def lint_experiment_definition(definition: Dict[str, Any]) -> Dict[str, Any]:
    """
    Deterministic validation engine ("ESLint for behavioral experiments").
    Identifies structural, timing, stimulus, branching, and privacy issues.
    Returns categorized findings: errors (block publishing), warnings, and info.
    """
    errors: List[Dict[str, Any]] = []
    warnings: List[Dict[str, Any]] = []
    info: List[Dict[str, Any]] = []

    nodes = definition.get("nodes", [])
    edges = definition.get("edges", [])
    consent = definition.get("consent", {})
    participant_schema = definition.get("participant_schema", [])
    settings = definition.get("settings", {})

    # 1. Structural / Graph Checks
    if not nodes:
        errors.append({
            "id": "err_empty_experiment",
            "category": "Graph/Logic",
            "severity": "ERROR",
            "title": "Empty Experiment",
            "message": "Experiment contains no nodes. Add at least a start node, stimulus/task, and completion node.",
            "node_id": None
        })
        return {
            "valid": False,
            "can_publish": False,
            "errors": errors,
            "warnings": warnings,
            "info": info,
            "summary": {"errors": len(errors), "warnings": len(warnings), "info": len(info)}
        }

    node_ids: Set[str] = set()
    node_map = {}
    for n in nodes:
        nid = n.get("id")
        if nid:
            node_ids.add(nid)
            node_map[nid] = n

    start_nodes = [n for n in nodes if n.get("type") == "start"]
    completion_nodes = [n for n in nodes if n.get("type") == "completion"]

    if len(start_nodes) == 0:
        errors.append({
            "id": "err_missing_start",
            "category": "Graph/Logic",
            "severity": "ERROR",
            "title": "Missing Start Node",
            "message": "Experiment is missing a start node. Every experiment must have exactly one start point.",
            "node_id": None
        })
    elif len(start_nodes) > 1:
        errors.append({
            "id": "err_multiple_starts",
            "category": "Graph/Logic",
            "severity": "ERROR",
            "title": "Multiple Start Nodes",
            "message": f"Experiment contains {len(start_nodes)} start nodes. Only one entry point is permitted.",
            "node_id": start_nodes[1].get("id")
        })

    if len(completion_nodes) == 0:
        warnings.append({
            "id": "warn_missing_completion",
            "category": "Graph/Logic",
            "severity": "WARNING",
            "title": "Missing Completion Screen",
            "message": "No completion or debrief node found. Participants will conclude abruptly without a completion message.",
            "node_id": None
        })

    # Adjacency and Edge Integrity
    adjacency = defaultdict(list)
    incoming = defaultdict(list)
    from_nodes: Set[str] = set()
    to_nodes: Set[str] = set()

    for idx, edge in enumerate(edges):
        from_id = edge.get("from") or edge.get("from_node")
        to_id = edge.get("to") or edge.get("to_node")

        if not from_id or from_id not in node_ids:
            errors.append({
                "id": f"err_broken_edge_source_{idx}",
                "category": "Graph/Logic",
                "severity": "ERROR",
                "title": "Broken Edge Source",
                "message": f"Connection references unknown source node '{from_id}'.",
                "node_id": from_id
            })
        if not to_id or to_id not in node_ids:
            errors.append({
                "id": f"err_broken_edge_target_{idx}",
                "category": "Graph/Logic",
                "severity": "ERROR",
                "title": "Broken Edge Target",
                "message": f"Connection references unknown destination node '{to_id}'.",
                "node_id": to_id
            })

        if from_id and to_id:
            adjacency[from_id].append((to_id, edge.get("branch", "default")))
            incoming[to_id].append((from_id, edge.get("branch", "default")))
            from_nodes.add(from_id)
            to_nodes.add(to_id)

    # Reachability from start node
    if start_nodes:
        visited = set()
        queue = deque([start_nodes[0].get("id")])
        while queue:
            curr = queue.popleft()
            if curr not in visited:
                visited.add(curr)
                for neighbor, _ in adjacency.get(curr, []):
                    if neighbor not in visited and neighbor in node_ids:
                        queue.append(neighbor)

        for n in nodes:
            nid = n.get("id")
            if nid and nid not in visited and n.get("type") != "start":
                warnings.append({
                    "id": f"warn_unreachable_{nid}",
                    "category": "Graph/Logic",
                    "severity": "WARNING",
                    "title": "Unreachable Node",
                    "message": f"Node '{n.get('label', nid)}' is not reachable from the start node.",
                    "node_id": nid
                })

    # Individual Node Inspection
    available_variables = {"is_correct", "reaction_time", "response_key", "timeout"}
    for n in nodes:
        nid = n.get("id")
        ntype = n.get("type", "")
        props = n.get("props", {})
        label = n.get("label", nid)

        # 2. Timing Checks
        if ntype in ["fixation", "blank", "stimulus", "delay"]:
            duration = props.get("duration_ms")
            if duration is None:
                warnings.append({
                    "id": f"warn_missing_duration_{nid}",
                    "category": "Timing",
                    "severity": "WARNING",
                    "title": "Missing Duration",
                    "message": f"Node '{label}' has no duration configured. Will rely on default 1000ms display.",
                    "node_id": nid
                })
            elif duration <= 0:
                errors.append({
                    "id": f"err_negative_duration_{nid}",
                    "category": "Timing",
                    "severity": "ERROR",
                    "title": "Invalid Duration",
                    "message": f"Node '{label}' has duration of {duration}ms. Duration must be a positive integer.",
                    "node_id": nid
                })

        # 3. Response Node Checks
        if ntype == "response":
            resp_type = props.get("response_type", "keyboard")
            timeout = props.get("timeout_ms")
            if timeout is not None and timeout <= 0:
                errors.append({
                    "id": f"err_invalid_timeout_{nid}",
                    "category": "Timing",
                    "severity": "ERROR",
                    "title": "Invalid Timeout",
                    "message": f"Response node '{label}' has invalid timeout ({timeout}ms).",
                    "node_id": nid
                })

            if resp_type == "keyboard":
                keys = props.get("allowed_keys", [])
                if not keys:
                    errors.append({
                        "id": f"err_missing_keys_{nid}",
                        "category": "Input",
                        "severity": "ERROR",
                        "title": "No Allowed Keys",
                        "message": f"Keyboard response '{label}' requires at least one allowed key (e.g. 'Space', 'f', 'j').",
                        "node_id": nid
                    })
            elif resp_type in ["button", "multi_choice"]:
                options = props.get("options", [])
                if not options:
                    errors.append({
                        "id": f"err_missing_options_{nid}",
                        "category": "Input",
                        "severity": "ERROR",
                        "title": "Missing Button Options",
                        "message": f"Choice response '{label}' requires selectable options.",
                        "node_id": nid
                    })

        # 4. Stimulus Node Checks
        if ntype == "stimulus":
            content = props.get("stimulus_content")
            stim_type = props.get("stimulus_type", "text")
            if not content:
                warnings.append({
                    "id": f"warn_empty_stimulus_{nid}",
                    "category": "Stimuli",
                    "severity": "WARNING",
                    "title": "Empty Stimulus Content",
                    "message": f"Stimulus node '{label}' has no text or asset reference specified.",
                    "node_id": nid
                })

        # 5. Condition Node Checks
        if ntype == "condition":
            var_name = props.get("condition_variable")
            if not var_name:
                errors.append({
                    "id": f"err_missing_condition_var_{nid}",
                    "category": "Graph/Logic",
                    "severity": "ERROR",
                    "title": "Missing Condition Variable",
                    "message": f"Condition node '{label}' has no target variable to evaluate.",
                    "node_id": nid
                })
            elif var_name not in available_variables:
                warnings.append({
                    "id": f"warn_custom_var_{nid}",
                    "category": "Graph/Logic",
                    "severity": "WARNING",
                    "title": "Unverified Condition Variable",
                    "message": f"Condition node '{label}' references custom variable '{var_name}'. Verify participant response sets this variable.",
                    "node_id": nid
                })

            # Check if condition has branches
            outgoing_edges = adjacency.get(nid, [])
            has_true = any(b in ["true", "YES"] for _, b in outgoing_edges)
            has_false = any(b in ["false", "NO"] for _, b in outgoing_edges)
            if not outgoing_edges:
                errors.append({
                    "id": f"err_unconnected_condition_{nid}",
                    "category": "Graph/Logic",
                    "severity": "ERROR",
                    "title": "Unconnected Condition Branches",
                    "message": f"Condition node '{label}' has no outgoing branches connected.",
                    "node_id": nid
                })

        # 6. Dead ends
        if ntype not in ["completion"] and nid not in from_nodes:
            warnings.append({
                "id": f"warn_dead_end_{nid}",
                "category": "Graph/Logic",
                "severity": "WARNING",
                "title": "Dead End Node",
                "message": f"Node '{label}' has no outgoing connection. Participant flow will stop here.",
                "node_id": nid
            })

    # 7. Participant Schema Verification
    seen_field_ids = set()
    for field in participant_schema:
        fid = field.get("id")
        ftype = field.get("type", "text")
        if not fid:
            errors.append({
                "id": "err_unnamed_field",
                "category": "Participant Config",
                "severity": "ERROR",
                "title": "Unnamed Participant Field",
                "message": "Participant field missing ID identifier.",
                "node_id": None
            })
        elif fid in seen_field_ids:
            errors.append({
                "id": f"err_dup_field_{fid}",
                "category": "Participant Config",
                "severity": "ERROR",
                "title": "Duplicate Field ID",
                "message": f"Duplicate participant field ID '{fid}'. Field identifiers must be unique.",
                "node_id": None
            })
        else:
            seen_field_ids.add(fid)

        if ftype not in ["text", "number", "select", "radio", "boolean"]:
            warnings.append({
                "id": f"warn_field_type_{fid}",
                "category": "Participant Config",
                "severity": "WARNING",
                "title": "Uncommon Field Type",
                "message": f"Field '{fid}' uses type '{ftype}' which may require custom parsing.",
                "node_id": None
            })

    # 8. Consent & Privacy Protocol
    if not consent or not consent.get("study_title"):
        warnings.append({
            "id": "warn_empty_consent_title",
            "category": "Consent/Privacy",
            "severity": "WARNING",
            "title": "Study Title Empty in Consent",
            "message": "Consent form does not have an explicit study title. Default platform title will be displayed to participants.",
            "node_id": None
        })

    # 9. Research Contract Alignment Verification
    contract = definition.get("research_contract")
    if contract:
        from app.services.contract_service import validate_research_contract_alignment
        contract_res = validate_research_contract_alignment(contract, definition)
        for m in contract_res.get("mismatches", []):
            sev = str(m.get("severity", "warning")).upper()
            lint_finding = {
                "id": m.get("id"),
                "category": "Research Contract",
                "severity": "ERROR" if sev == "ERROR" else "WARNING" if sev == "WARNING" else "INFO",
                "title": m.get("title"),
                "message": m.get("message"),
                "recommendation": m.get("recommendation"),
                "node_id": None
            }
            if sev == "ERROR":
                errors.append(lint_finding)
            elif sev == "WARNING":
                warnings.append(lint_finding)
            else:
                info.append(lint_finding)

    # 10. Informational Notes
    info.append({
        "id": "info_nodes_count",
        "category": "Summary",
        "severity": "INFO",
        "title": "Experiment Structure",
        "message": f"Experiment contains {len(nodes)} nodes and {len(edges)} connections.",
        "node_id": None
    })

    if len(participant_schema) > 0:
        info.append({
            "id": "info_fields_count",
            "category": "Participant Config",
            "severity": "INFO",
            "title": "Participant Metadata",
            "message": f"{len(participant_schema)} demographic/participant fields configured.",
            "node_id": None
        })

    can_publish = len(errors) == 0

    return {
        "valid": can_publish,
        "is_valid": can_publish,
        "can_publish": can_publish,
        "errors": errors,
        "warnings": warnings,
        "info": info,
        "findings": errors + warnings + info,
        "summary": {
            "errors": len(errors),
            "warnings": len(warnings),
            "info": len(info)
        }
    }
