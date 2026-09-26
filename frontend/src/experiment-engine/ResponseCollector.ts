/**
 * ResponseCollector.ts
 *
 * Captures user responses (keyboard, mouse clicks, on-screen buttons, multi-choice)
 * using high-resolution performance.now() timestamps relative to stimulus presentation time.
 */

import { TimingEngine } from './TimingEngine';

export interface ResponseCaptureResult {
  responseKeyOrValue: string;
  responseTimestamp: number;
  reactionTimeMs: number;
  timedOut: boolean;
  rawData?: any;
}

export class ResponseCollector {
  private timing = TimingEngine.getInstance();
  private cleanupFn: (() => void) | null = null;

  /**
   * Listen for keyboard response from allowed keys.
   */
  public captureKeyboard(
    stimulusPresentedAt: number,
    allowedKeys: string[] = [],
    timeoutMs?: number
  ): Promise<ResponseCaptureResult> {
    this.cleanup();

    return new Promise((resolve) => {
      let timeoutHandle: any = null;
      let resolved = false;

      const handleKeyDown = (event: KeyboardEvent) => {
        if (resolved) return;

        // Normalize key representations
        const key = event.key;
        const code = event.code;
        const matchesKey = allowedKeys.length === 0 || allowedKeys.includes(key) || allowedKeys.includes(code);

        if (matchesKey) {
          event.preventDefault();
          resolved = true;
          const responseTime = this.timing.now();
          const reactionTime = Math.max(0, responseTime - stimulusPresentedAt);

          cleanup();
          resolve({
            responseKeyOrValue: key,
            responseTimestamp: responseTime,
            reactionTimeMs: Math.round(reactionTime * 100) / 100,
            timedOut: false,
            rawData: { code, key, shiftKey: event.shiftKey },
          });
        }
      };

      const cleanup = () => {
        window.removeEventListener('keydown', handleKeyDown, true);
        if (timeoutHandle) clearTimeout(timeoutHandle);
        this.cleanupFn = null;
      };

      this.cleanupFn = cleanup;
      window.addEventListener('keydown', handleKeyDown, true);

      if (timeoutMs && timeoutMs > 0) {
        timeoutHandle = setTimeout(() => {
          if (!resolved) {
            resolved = true;
            const now = this.timing.now();
            cleanup();
            resolve({
              responseKeyOrValue: 'TIMEOUT',
              responseTimestamp: now,
              reactionTimeMs: timeoutMs,
              timedOut: true,
            });
          }
        }, timeoutMs);
      }
    });
  }

  /**
   * Handle on-screen button click response with high-resolution reaction time.
   */
  public recordButtonClick(
    buttonValue: string,
    stimulusPresentedAt: number
  ): ResponseCaptureResult {
    const responseTime = this.timing.now();
    const reactionTime = Math.max(0, responseTime - stimulusPresentedAt);
    return {
      responseKeyOrValue: buttonValue,
      responseTimestamp: responseTime,
      reactionTimeMs: Math.round(reactionTime * 100) / 100,
      timedOut: false,
    };
  }

  public cleanup(): void {
    if (this.cleanupFn) {
      this.cleanupFn();
      this.cleanupFn = null;
    }
  }
}
