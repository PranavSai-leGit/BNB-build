import { apiRequest } from './client';
import { InitSessionResponse, BrowserMetadata, TrialEvent } from '../types/session';

export const participantApi = {
  getPublicInfo: (publicId: string) =>
    apiRequest(`/public/experiments/${publicId}/info`),

  initSession: (
    publicId: string,
    participantData: Record<string, any> = {},
    browserMetadata?: BrowserMetadata
  ): Promise<InitSessionResponse> =>
    apiRequest(`/public/experiments/${publicId}/session`, {
      method: 'POST',
      body: JSON.stringify({
        participant_data: participantData,
        browser_metadata: browserMetadata,
      }),
    }),

  submitConsent: (
    sessionId: string,
    accepted: boolean,
    consentVersion: string = '1.0'
  ) =>
    apiRequest(`/public/sessions/${sessionId}/consent`, {
      method: 'POST',
      body: JSON.stringify({ accepted, consent_version: consentVersion }),
    }),

  submitTrialEvents: (sessionId: string, events: TrialEvent[]) =>
    apiRequest(`/public/sessions/${sessionId}/events`, {
      method: 'POST',
      body: JSON.stringify({ events }),
    }),

  completeSession: (
    sessionId: string,
    withdrawalRequested: boolean = false,
    timingSummary?: any
  ) =>
    apiRequest(`/public/sessions/${sessionId}/complete`, {
      method: 'POST',
      body: JSON.stringify({
        withdrawal_requested: withdrawalRequested,
        browser_timing_summary: timingSummary,
      }),
    }),
};
