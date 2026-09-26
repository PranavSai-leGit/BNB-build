export interface ReactionTimeBucket {
  bucket: string;
  count: number;
}

export interface ConditionMetric {
  condition: string;
  trials_count: number;
  avg_reaction_time: number;
  accuracy_percent: number;
}

export interface SessionSummary {
  session_id: string;
  participant_id: string;
  status: string;
  trials_completed: number;
  avg_rt?: number;
  accuracy?: number;
  started_at: string;
  completed_at?: string;
}

export interface ExperimentAnalytics {
  experiment_id: string;
  experiment_name: string;
  total_participants: number;
  completed_participants: number;
  completion_rate_percent: number;
  overall_avg_rt: number;
  overall_accuracy_percent: number;
  rt_histogram: ReactionTimeBucket[];
  condition_breakdown: ConditionMetric[];
  timing_quality_breakdown: Record<string, number>;
  recent_sessions: SessionSummary[];
}

export interface AuditLog {
  id: string;
  actor_id?: string;
  actor_email?: string;
  action: string;
  experiment_id?: string;
  metadata_json: Record<string, any>;
  timestamp: string;
}
