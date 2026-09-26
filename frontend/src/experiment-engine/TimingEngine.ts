/**
 * TimingEngine.ts
 *
 * Dedicated browser-side high-resolution timing engine for cognitive science experiments.
 * Uses window.performance.now() and requestAnimationFrame() for VSYNC synchronization.
 *
 * Important scientific principle:
 * Browser timing optimizes reaction-time measurement but cannot guarantee zero-latency
 * hardware display pipeline equivalence. Timing quality diagnostics are logged for transparency.
 */

export interface TimingSample {
  stimulusRequestedAt: number;
  stimulusPresentedAt: number;
  responseReceivedAt?: number;
  reactionTime?: number;
  frameIntervalMs?: number;
  frameDrops: number;
}

export interface DisplayDiagnostics {
  estimatedHz: number;
  avgFrameIntervalMs: number;
  jitterMs: number;
  timingApiSupported: boolean;
  timingQuality: 'Good' | 'Normal' | 'Review recommended';
  hardwareConcurrency: number;
  screenResolution: string;
  notes: string[];
}

export class TimingEngine {
  private static instance: TimingEngine;

  public static getInstance(): TimingEngine {
    if (!TimingEngine.instance) {
      TimingEngine.instance = new TimingEngine();
    }
    return TimingEngine.instance;
  }

  /**
   * Return high-resolution timestamp in milliseconds
   */
  public now(): number {
    if (typeof performance !== 'undefined' && performance.now) {
      return performance.now();
    }
    // Fallback if performance API is disabled
    return Date.now();
  }

  /**
   * Synchronize visual stimulus presentation with the next browser display refresh frame (VSYNC).
   * Double-rAF ensures DOM painting has been committed to the compositor before timestamp is recorded.
   */
  public waitForNextFrame(): Promise<number> {
    return new Promise((resolve) => {
      requestAnimationFrame(() => {
        requestAnimationFrame((timestamp) => {
          resolve(timestamp);
        });
      });
    });
  }

  /**
   * Run display timing diagnostics (benchmarking 30 consecutive animation frames)
   * to estimate refresh rate (60Hz, 120Hz, 144Hz, 240Hz), frame stability, and jitter.
   */
  public async estimateDisplayPerformance(sampleFrames: number = 30): Promise<DisplayDiagnostics> {
    const notes: string[] = [];
    const timingApiSupported = typeof performance !== 'undefined' && typeof performance.now === 'function';

    if (!timingApiSupported) {
      notes.push('High-resolution performance.now() is unavailable in this environment.');
      return {
        estimatedHz: 60,
        avgFrameIntervalMs: 16.67,
        jitterMs: 0,
        timingApiSupported: false,
        timingQuality: 'Review recommended',
        hardwareConcurrency: navigator.hardwareConcurrency || 2,
        screenResolution: `${window.screen.width}x${window.screen.height}`,
        notes,
      };
    }

    const frameTimes: number[] = [];
    let lastTime = performance.now();

    await new Promise<void>((resolve) => {
      let count = 0;
      const measure = () => {
        const current = performance.now();
        const delta = current - lastTime;
        lastTime = current;
        if (count > 0) {
          frameTimes.push(delta);
        }
        count++;
        if (count < sampleFrames) {
          requestAnimationFrame(measure);
        } else {
          resolve();
        }
      };
      requestAnimationFrame(measure);
    });

    const avgInterval = frameTimes.reduce((a, b) => a + b, 0) / frameTimes.length;
    const variance = frameTimes.reduce((acc, val) => acc + Math.pow(val - avgInterval, 2), 0) / frameTimes.length;
    const jitter = Math.sqrt(variance);

    let estimatedHz = 60;
    if (avgInterval <= 5.0) estimatedHz = 240;
    else if (avgInterval <= 7.5) estimatedHz = 144;
    else if (avgInterval <= 9.0) estimatedHz = 120;
    else if (avgInterval <= 12.0) estimatedHz = 90;
    else if (avgInterval <= 18.0) estimatedHz = 60;
    else estimatedHz = Math.round(1000 / avgInterval);

    let timingQuality: 'Good' | 'Normal' | 'Review recommended' = 'Good';

    if (jitter > 6.0 || avgInterval > 25.0) {
      timingQuality = 'Review recommended';
      notes.push('High frame interval variance or dropped frames detected. Device load may affect millisecond precision.');
    } else if (jitter > 2.5) {
      timingQuality = 'Normal';
      notes.push('Acceptable timing variance standard for consumer browsers.');
    } else {
      timingQuality = 'Good';
      notes.push('Stable display refresh rate synchronized with VSYNC.');
    }

    return {
      estimatedHz,
      avgFrameIntervalMs: Math.round(avgInterval * 100) / 100,
      jitterMs: Math.round(jitter * 100) / 100,
      timingApiSupported: true,
      timingQuality,
      hardwareConcurrency: navigator.hardwareConcurrency || 4,
      screenResolution: `${window.screen.width}x${window.screen.height} (${window.devicePixelRatio}x)`,
      notes,
    };
  }
}
