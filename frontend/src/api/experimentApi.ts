import { apiRequest } from './client';
import {
  Experiment,
  ExperimentDefinition,
  ExperimentVersion,
  ValidationReport,
} from '../types/experiment';

export interface CreateExperimentPayload {
  name: string;
  description?: string;
  retention_days?: number;
  definition?: ExperimentDefinition;
}

export interface UpdateExperimentPayload {
  name?: string;
  description?: string;
  retention_days?: number;
  status?: 'draft' | 'published' | 'archived';
  consent_config?: any;
}

export const experimentApi = {
  list: (): Promise<Experiment[]> =>
    apiRequest('/experiments'),

  get: (id: string): Promise<Experiment> =>
    apiRequest(`/experiments/${id}`),

  create: (data: CreateExperimentPayload): Promise<Experiment> =>
    apiRequest('/experiments', {
      method: 'POST',
      body: JSON.stringify(data),
    }),

  update: (id: string, data: UpdateExperimentPayload): Promise<Experiment> =>
    apiRequest(`/experiments/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    }),

  delete: (id: string): Promise<{ message: string }> =>
    apiRequest(`/experiments/${id}`, {
      method: 'DELETE',
    }),

  getVersions: (id: string): Promise<ExperimentVersion[]> =>
    apiRequest(`/experiments/${id}/versions`),

  saveVersion: (
    id: string,
    definition: ExperimentDefinition,
    changelog?: string,
    bump: boolean = false
  ): Promise<ExperimentVersion> =>
    apiRequest(`/experiments/${id}/versions?bump=${bump}`, {
      method: 'POST',
      body: JSON.stringify({ definition, changelog }),
    }),

  validate: (id: string): Promise<ValidationReport> =>
    apiRequest(`/experiments/${id}/validate`, {
      method: 'POST',
    }),

  publish: (id: string): Promise<ExperimentVersion> =>
    apiRequest(`/experiments/${id}/publish`, {
      method: 'POST',
    }),

  exportCsv: (id: string): Promise<string> =>
    apiRequest(`/experiments/${id}/export/csv`),

  exportJson: (id: string): Promise<any> =>
    apiRequest(`/experiments/${id}/export/json`),

  // Intelligence Features
  lint: (id: string): Promise<any> =>
    apiRequest(`/experiments/${id}/lint`),

  getDoctorReview: (id: string): Promise<any> =>
    apiRequest(`/experiments/${id}/doctor`),

  getDataQualityReport: (id: string): Promise<any> =>
    apiRequest(`/experiments/${id}/quality`),

  updateQualityRules: (id: string, rules: any[]): Promise<any> =>
    apiRequest(`/experiments/${id}/quality-rules`, {
      method: 'POST',
      body: JSON.stringify(rules),
    }),

  getPassport: (id: string): Promise<any> =>
    apiRequest(`/experiments/${id}/passport`),

  downloadReproducibilityPackage: (id: string): Promise<any> =>
    apiRequest(`/experiments/${id}/passport/package`),
};

