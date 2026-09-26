from pydantic import BaseModel, Field
from typing import List, Dict, Any, Optional
from datetime import datetime

class ParticipantFieldSchema(BaseModel):
    id: str
    label: str
    type: str = "text" # text, number, select, boolean
    required: bool = False
    options: Optional[List[str]] = None
    default_value: Optional[Any] = None

class ExperimentSettingsSchema(BaseModel):
    fullscreen: bool = True
    allow_mobile: bool = False
    timeout_warning_seconds: int = 120
    record_timing_diagnostics: bool = True
    theme: str = "dark" # dark, light, high-contrast

class ConsentConfigSchema(BaseModel):
    study_title: str = "Visual Cognition and Reaction Time Study"
    purpose: str = "Investigating perceptual processing and response latencies in visual cognitive tasks."
    duration_minutes: int = 10
    procedures: str = "You will be presented with a sequence of visual stimuli and asked to respond quickly using your keyboard."
    risks: str = "Minimal risk. Some visual stimuli may appear rapidly. You may experience slight eye fatigue."
    benefits: str = "This research contributes to understanding human visual perception and cognitive processing."
    data_collected: str = "Pseudonymous reaction times, response accuracy, and basic demographic responses. No directly identifying personal data."
    data_retention_policy: str = "Responses are stored securely under pseudonymous identifiers for 90 days."
    researcher_contact: str = "lead-researcher@cognilab.edu"
    withdrawal_statement: str = "Participation is voluntary. You may withdraw at any time by closing the window or clicking Withdraw."

class NodeProps(BaseModel):
    title: Optional[str] = None
    instructions: Optional[str] = None
    stimulus_type: Optional[str] = None # text, image, fixation, blank
    stimulus_content: Optional[str] = None
    stimulus_url: Optional[str] = None
    duration_ms: Optional[int] = None # millisecond duration
    response_type: Optional[str] = None # keyboard, mouse, button, multi_choice
    allowed_keys: Optional[List[str]] = None
    options: Optional[List[str]] = None
    correct_response: Optional[str] = None
    timeout_ms: Optional[int] = None
    condition_variable: Optional[str] = None
    condition_operator: Optional[str] = "==" # ==, !=, >, <, in
    condition_value: Optional[Any] = None
    feedback_text_correct: Optional[str] = "Correct!"
    feedback_text_incorrect: Optional[str] = "Incorrect"
    feedback_duration_ms: Optional[int] = 1000
    randomize_trials: Optional[bool] = False
    counterbalance_group: Optional[str] = None
    custom: Optional[Dict[str, Any]] = None

class ExperimentNodeSchema(BaseModel):
    id: str
    type: str # start, instructions, fixation, stimulus, response, condition, feedback, completion
    label: str
    props: NodeProps = Field(default_factory=NodeProps)
    position: Optional[Dict[str, float]] = None # {x: 100, y: 100} for React Flow

class ExperimentEdgeSchema(BaseModel):
    id: str
    from_node: str = Field(..., alias="from")
    to_node: str = Field(..., alias="to")
    branch: Optional[str] = "default" # default, true, false, or custom branch name

    class Config:
        populate_by_name = True

class RandomizationGroupSchema(BaseModel):
    id: str
    name: str
    shuffle: bool = True
    stimulus_pool: List[str] = []
    counterbalance_groups: List[str] = []

class ExperimentDefinitionSchema(BaseModel):
    name: str
    version: int = 1
    settings: ExperimentSettingsSchema = Field(default_factory=ExperimentSettingsSchema)
    consent: ConsentConfigSchema = Field(default_factory=ConsentConfigSchema)
    participant_schema: List[ParticipantFieldSchema] = []
    nodes: List[ExperimentNodeSchema] = []
    edges: List[ExperimentEdgeSchema] = []
    randomization_groups: List[RandomizationGroupSchema] = []

class ExperimentCreate(BaseModel):
    name: str
    description: Optional[str] = None
    retention_days: int = 90
    definition: Optional[ExperimentDefinitionSchema] = None

class ExperimentUpdate(BaseModel):
    name: Optional[str] = None
    description: Optional[str] = None
    status: Optional[str] = None
    retention_days: Optional[int] = None
    consent_config: Optional[Dict[str, Any]] = None

class ExperimentVersionCreate(BaseModel):
    definition: ExperimentDefinitionSchema
    changelog: Optional[str] = None

class ExperimentVersionOut(BaseModel):
    id: str
    experiment_id: str
    version_number: int
    definition: Dict[str, Any]
    changelog: Optional[str] = None
    created_at: datetime
    published_at: Optional[datetime] = None

    class Config:
        from_attributes = True

class ExperimentOut(BaseModel):
    id: str
    organization_id: Optional[str]
    owner_id: str
    public_id: str
    name: str
    description: Optional[str]
    status: str
    retention_days: int
    current_version_number: int
    consent_config: Optional[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    latest_version: Optional[ExperimentVersionOut] = None

    class Config:
        from_attributes = True

class ValidationIssue(BaseModel):
    severity: str # error, warning, info
    node_id: Optional[str] = None
    field: Optional[str] = None
    message: str

class ValidationReport(BaseModel):
    valid: bool
    can_publish: bool
    errors: List[ValidationIssue]
    warnings: List[ValidationIssue]
