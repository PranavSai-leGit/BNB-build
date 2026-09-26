import { apiRequest } from './client';
import { ExperimentAnalytics, AuditLog } from '../types/analytics';

export const analyticsApi = {
  getExperimentAnalytics: (experimentId: string): Promise<ExperimentAnalytics> =>
    apiRequest(`/experiments/${experimentId}/analytics`),

  getExperimentParticipants: (experimentId: string): Promise<any[]> =>
    apiRequest(`/experiments/${experimentId}/participants`),

  getAuditLogs: (experimentId?: string): Promise<AuditLog[]> =>
    apiRequest(`/audit/logs${experimentId ? `?experiment_id=${experimentId}` : ''}`),
};
