/**
 * EventLogger.ts
 *
 * Secure local event buffer and network transmitter.
 * Temporarily stores trial responses locally to prevent data loss in case of intermittent connection,
 * then dispatches batches to FastAPI backend.
 */

import { TrialEvent } from '../types/session';
import { participantApi } from '../api/participantApi';

export class EventLogger {
  private sessionId: string;
  private buffer: TrialEvent[] = [];
  private storageKey: string;

  constructor(sessionId: string) {
    this.sessionId = sessionId;
    this.storageKey = `cognilab_events_${sessionId}`;
    this.restoreFromStorage();
  }

  public logEvent(event: TrialEvent): void {
    this.buffer.push(event);
    this.saveToStorage();
  }

  public getEvents(): TrialEvent[] {
    return [...this.buffer];
  }

  public async flush(): Promise<boolean> {
    if (this.buffer.length === 0) return true;

    try {
      await participantApi.submitTrialEvents(this.sessionId, this.buffer);
      this.clearStorage();
      return true;
    } catch (err) {
      console.error('Failed to flush trial events to backend:', err);
      // Retain buffer in local storage for retry
      return false;
    }
  }

  private saveToStorage(): void {
    try {
      sessionStorage.setItem(this.storageKey, JSON.stringify(this.buffer));
    } catch {
      // Storage might be restricted in private browsing mode
    }
  }

  private restoreFromStorage(): void {
    try {
      const data = sessionStorage.getItem(this.storageKey);
      if (data) {
        this.buffer = JSON.parse(data);
      }
    } catch {
      this.buffer = [];
    }
  }

  private clearStorage(): void {
    try {
      sessionStorage.removeItem(this.storageKey);
    } catch {
      // Ignore
    }
  }
}
