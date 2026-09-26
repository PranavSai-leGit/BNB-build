from typing import Dict, Any, List
from datetime import datetime

def analyze_experiment_doctor(definition: Dict[str, Any], experiment_meta: Dict[str, Any] = None) -> List[Dict[str, Any]]:
    """
    AI/Methodological Experiment Doctor review.
    Provides consultative scientific & design review considerations.
    DOES NOT claim IRB approval, ethical certification, or definitive statistical advice.
    Uses 'Potential issue', 'Consider', 'Review recommended' phrasing.
    """
    findings: List[Dict[str, Any]] = []
    nodes = definition.get("nodes", [])
    settings = definition.get("settings", {})
    participant_schema = definition.get("participant_schema", [])

    # 1. Condition Imbalance Check
    # Analyze trial distribution across conditions
    condition_counts: Dict[str, int] = {}
    response_nodes = [n for n in nodes if n.get("type") == "response"]
    stimulus_nodes = [n for n in nodes if n.get("type") == "stimulus"]

    for n in stimulus_nodes:
        props = n.get("props", {})
        cond = props.get("condition") or props.get("condition_name") or "default"
        condition_counts[cond] = condition_counts.get(cond, 0) + 1

    if len(condition_counts) >= 2:
        counts = list(condition_counts.values())
        max_c = max(counts)
        min_c = min(counts)
        if max_c > min_c * 1.5 and min_c > 0:
            cond_summary = ", ".join([f"'{k}': {v} trials" for k, v in condition_counts.items()])
            findings.append({
                "id": "doc_trial_imbalance",
                "category": "Methodology",
                "severity": "consideration",
                "title": "Potential trial imbalance detected",
                "finding": f"Unequal trial distribution detected across conditions ({cond_summary}).",
                "explanation": "Significant disparities in trial counts between experimental conditions can reduce statistical power or introduce unequal error variances in repeated-measures analyses.",
                "suggestion": "Review whether this asymmetry is intentional (e.g. rare target paradigm or oddball design) or whether trial counts should be balanced across conditions.",
                "status": "active"
            })

    # 2. Timing Precision & Mobile Device Compatibility
    # If measuring reaction time but mobile devices are not restricted
    has_rt_measurement = any(n.get("type") == "response" for n in nodes)
    device_restrictions = settings.get("allowed_devices", ["desktop", "laptop", "mobile", "tablet"])
    mobile_allowed = "mobile" in device_restrictions or "tablet" in device_restrictions

    if has_rt_measurement and mobile_allowed:
        findings.append({
            "id": "doc_mobile_timing",
            "category": "Timing",
            "severity": "caution",
            "title": "Potential timing precision concern on mobile devices",
            "finding": "This experiment measures reaction times while mobile or touchscreen devices are permitted.",
            "explanation": "Touchscreen capacitive latencies, varying operating system display pipelines, and variable mobile refresh rates add 30-70ms of variable input jitter compared to desktop keyboards.",
            "suggestion": "Consider restricting permitted devices to desktop and laptop computers if your research protocol requires sub-frame millisecond reaction time precision.",
            "status": "active"
        })

    # 3. Privacy & Identifiability Granularity
    # Check participant schema for date of birth or direct identifiers
    sensitive_keywords = ["dob", "birth", "date_of_birth", "birthday", "ssn", "name", "phone", "email"]
    for field in participant_schema:
        fid = str(field.get("id", "")).lower()
        flabel = str(field.get("label", "")).lower()
        if any(kw in fid or kw in flabel for kw in ["dob", "birth", "date_of_birth"]):
            findings.append({
                "id": f"doc_privacy_{field.get('id')}",
                "category": "Privacy",
                "severity": "recommendation",
                "title": "Potential privacy & identifiability consideration",
                "finding": f"Participant form requests exact date of birth ('{field.get('label', field.get('id'))}').",
                "explanation": "Exact dates of birth combined with pseudonymous experimental response timestamps significantly increase participant re-identifiability risk under modern privacy standards.",
                "suggestion": "Consider whether an age integer or age range selection (e.g. 18-24, 25-34) would satisfy your study's scientific purpose while minimizing identifiable data collection.",
                "status": "active"
            })
            break

    # 4. Methodological Order Effects & Counterbalancing
    # Check if stimulus trials of condition A appear in a block strictly before condition B without randomization
    if len(condition_counts) >= 2:
        condition_order = []
        for n in stimulus_nodes:
            props = n.get("props", {})
            c = props.get("condition") or props.get("condition_name")
            if c and (not condition_order or condition_order[-1] != c):
                condition_order.append(c)

        # If conditions appear strictly sequential (e.g. [A, B] without interleaving or random blocks)
        if len(condition_order) == len(condition_counts) and len(condition_order) > 1:
            findings.append({
                "id": "doc_order_effects",
                "category": "Methodology",
                "severity": "consideration",
                "title": "Potential order effect consideration",
                "finding": f"Experimental conditions appear in fixed sequential order ({' -> '.join(condition_order)}).",
                "explanation": "Fixed condition ordering can confound experimental treatments with progressive fatigue, practice, or sensory adaptation effects.",
                "suggestion": "Consider trial randomization or between-participant counterbalancing if sequential order effects could influence participant performance.",
                "status": "active"
            })

    # 5. Participant Fatigue & Attention Spans
    total_trials = len(stimulus_nodes) + len(response_nodes)
    if total_trials > 50:
        has_break_node = any("break" in n.get("label", "").lower() or "pause" in n.get("label", "").lower() for n in nodes)
        if not has_break_node:
            findings.append({
                "id": "doc_fatigue_risk",
                "category": "Participant Experience",
                "severity": "consideration",
                "title": "Potential participant fatigue across extended sequence",
                "finding": f"Protocol contains {total_trials} consecutive task nodes without an explicit rest break.",
                "explanation": "Unbroken cognitive trial runs exceeding 8-10 minutes can induce task disengagement, lapsing vigilance, and elevated response time variance.",
                "suggestion": "Consider inserting a self-paced rest pause or block debrief midway through the experiment to sustain data quality.",
                "status": "active"
            })

    # 6. Practice / Warmup Trials
    instruction_nodes = [n for n in nodes if n.get("type") == "instructions"]
    if instruction_nodes and len(response_nodes) >= 10:
        has_practice = any("practice" in n.get("label", "").lower() or "warmup" in n.get("label", "").lower() for n in nodes)
        if not has_practice:
            findings.append({
                "id": "doc_practice_trials",
                "category": "Methodology",
                "severity": "recommendation",
                "title": "Review recommended: Practice trials omitted",
                "finding": "Experiment transitions directly from instructions into experimental data collection without a practice block.",
                "explanation": "Participants typically experience an initial 3-5 trial calibration curve as they familiarize themselves with stimulus presentation and key mappings.",
                "suggestion": "Consider adding 3-5 warmup or practice trials with corrective feedback so initial exploration does not contaminate your primary analysis.",
                "status": "active"
            })

    # 7. Research Contract Alignment Review
    contract = definition.get("research_contract")
    if contract:
        from app.services.contract_service import validate_research_contract_alignment
        contract_res = validate_research_contract_alignment(contract, definition)
        cov = contract_res.get("summary", {}).get("coverage_pct", 100)
        
        if cov < 100:
            unmatched = [k for k, v in contract_res.get("condition_coverage", {}).items() if not v.get("matched")]
            findings.append({
                "id": "doc_contract_coverage_gap",
                "category": "Methodology",
                "severity": "recommendation",
                "title": "Review recommended: Study design coverage gap",
                "finding": f"Research contract specifies {len(unmatched)} conditions ({', '.join(unmatched)}) that are not yet manifested in the builder trials.",
                "explanation": "Hypothesis testing requires empirical observations from each operationalized condition to evaluate the intended contrast.",
                "suggestion": "Review whether pending trial blocks remain to be built or whether the research contract should be refined to match the current protocol.",
                "status": "active"
            })
        
        # Check power / trial count consideration for primary reaction time outcome
        for dv in contract.get("dependent_variables", []):
            if dv.get("measurement_type") == "reaction_time" and dv.get("role") == "primary":
                min_cond_trials = min(condition_counts.values()) if condition_counts else 0
                if 0 < min_cond_trials < 10:
                    findings.append({
                        "id": "doc_statistical_power_rt",
                        "category": "Methodology",
                        "severity": "consideration",
                        "title": "Statistical power consideration for reaction time outcome",
                        "finding": f"Primary outcome '{dv.get('name')}' has conditions with as few as {min_cond_trials} trials per session.",
                        "explanation": "Within-subject reaction time distributions have inherent biological trial-to-trial variance. Designs with fewer than 15-20 trials per cell can yield noisy participant-level mean estimates.",
                        "suggestion": "Consider increasing trial repetitions per condition or planning a higher participant sample size to achieve target statistical power.",
                        "status": "active"
                    })

    # If no issues found, offer a positive research-readiness finding
    if not findings:
        findings.append({
            "id": "doc_all_clear",
            "category": "Methodology",
            "severity": "consideration",
            "title": "Methodological structure is well-formed",
            "finding": "No obvious condition imbalances, high-risk privacy fields, or timing bottlenecks detected.",
            "explanation": "The experiment configuration aligns well with standard behavioral testing protocols.",
            "suggestion": "Proceed with pilot testing with 2-3 participants to verify participant comprehension and timing consistency before full deployment.",
            "status": "active"
        })

    return findings
