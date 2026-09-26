import { ExperimentDefinition, ExperimentSettings, ConsentConfig } from './experiment';

export interface BrowserMetadata {
  user_agent?: string;
  screen_width?: number;
  screen_height?: number;
  device_pixel_ratio?: number;
  estimated_refresh_rate?: number;
  timing_api_supported: boolean;
  timing_quality: 'Good' | 'Normal' | 'Review recommended';
  hardware_concurrency?: number;
}

export interface InitSessionResponse {
  session_id: string;
  participant_id: string;
  experiment_id: string;
  experiment_version_id: string;
  experiment_version_number: number;
  definition: ExperimentDefinition;
  settings: ExperimentSettings;
  consent: ConsentConfig;
}

export interface TrialTimingData {
  stimulus_requested_at: number;
  stimulus_presented_at: number;
  response_received_at?: number;
  reaction_time?: number;
  frame_interval_ms?: number;
  frame_drops?: number;
}

export interface TrialResponseData {
  key?: string;
  button?: string;
  choice?: string;
  value?: any;
  is_correct?: boolean;
  accuracy?: number;
  confidence?: number;
  [key: string]: any;
}

export interface TrialEvent {
  trial_id: string;
  sequence_number: number;
  condition?: string;
  stimulus_id?: string;
  response_data: TrialResponseData;
  timing_data: TrialTimingData;
}
