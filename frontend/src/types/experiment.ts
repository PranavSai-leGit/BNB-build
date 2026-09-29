export type NodeType =
  | 'start'
  | 'instructions'
  | 'fixation'
  | 'stimulus'
  | 'response'
  | 'condition'
  | 'feedback'
  | 'completion';

export type ResponseType = 'keyboard' | 'mouse' | 'button' | 'multi_choice';
export type StimulusType = 'text' | 'image' | 'fixation' | 'blank';

export interface ParticipantField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'boolean';
  required: boolean;
  options?: string[];
  default_value?: any;
}

export interface ExperimentSettings {
  fullscreen: boolean;
  allow_mobile: boolean;
  timeout_warning_seconds: number;
  record_timing_diagnostics: boolean;
  theme: 'dark' | 'light' | 'high-contrast';
}

export interface ConsentConfig {
  study_title: string;
  purpose: string;
  duration_minutes: number;
  procedures: string;
  risks: string;
  benefits: string;
  data_collected: string;
  data_retention_policy: string;
  researcher_contact: string;
  withdrawal_statement: string;
}

export interface NodeProps {
  title?: string;
  instructions?: string;
  stimulus_type?: StimulusType;
  stimulus_content?: string;
  stimulus_url?: string;
  duration_ms?: number;
  response_type?: ResponseType;
  allowed_keys?: string[];
  options?: string[];
  correct_response?: string;
  timeout_ms?: number;
  condition_variable?: string;
  condition_operator?: '==' | '!=' | '>' | '<' | 'in';
  condition_value?: any;
  feedback_text_correct?: string;
  feedback_text_incorrect?: string;
  feedback_duration_ms?: number;
  randomize_trials?: boolean;
  counterbalance_group?: string;
  custom?: Record<string, any>;
}

export interface ExperimentNode {
  id: string;
  type: NodeType;
  label: string;
  props: NodeProps;
  position?: { x: number; y: number };
}

export interface ExperimentEdge {
  id: string;
  from: string;
  to: string;
  branch?: string;
}

export interface RandomizationGroup {
  id: string;
  name: string;
  shuffle: boolean;
  stimulus_pool: string[];
  counterbalance_groups: string[];
}

export interface ExperimentDefinition {
  name: string;
  version: number;
  settings: ExperimentSettings;
  consent: ConsentConfig;
  participant_schema: ParticipantField[];
  nodes: ExperimentNode[];
  edges: ExperimentEdge[];
  randomization_groups: RandomizationGroup[];
  preflight_config?: {
    require_fullscreen?: boolean;
    desktop_only?: boolean;
    require_timing_api?: boolean;
    require_keyboard?: boolean;
    min_screen_width?: number;
    min_screen_height?: number;
  };
  research_contract?: any;
  quality_rules?: any[];
}

export interface ExperimentVersion {
  id: string;
  experiment_id: string;
  version_number: number;
  definition: ExperimentDefinition;
  changelog?: string;
  created_at: string;
  published_at?: string;
}

export interface Experiment {
  id: string;
  organization_id?: string;
  owner_id: string;
  public_id: string;
  name: string;
  description?: string;
  status: 'draft' | 'published' | 'archived';
  retention_days: number;
  current_version_number: number;
  consent_config?: ConsentConfig;
  created_at: string;
  updated_at: string;
  latest_version?: ExperimentVersion;
}

export interface ValidationIssue {
  severity: 'error' | 'warning' | 'info';
  node_id?: string;
  field?: string;
  message: string;
}

export interface ValidationReport {
  valid: boolean;
  can_publish: boolean;
  errors: ValidationIssue[];
  warnings: ValidationIssue[];
}
