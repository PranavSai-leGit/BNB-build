import React, { useState, useEffect } from 'react';
import { TimingEngine, DisplayDiagnostics } from '../../experiment-engine/TimingEngine';
import {
  Gauge,
  Activity,
  CheckCircle2,
  AlertTriangle,
  RotateCw,
  Cpu,
  Monitor,
  ShieldAlert,
  Info,
} from 'lucide-react';

export const TimingDiagnosticsPage: React.FC = () => {
  const [diagnostics, setDiagnostics] = useState<DisplayDiagnostics | null>(null);
  const [running, setRunning] = useState(false);

  const runBenchmark = async () => {
    setRunning(true);
    const engine = TimingEngine.getInstance();
    const result = await engine.estimateDisplayPerformance(60);
    setDiagnostics(result);
    setRunning(false);
  };

  useEffect(() => {
    runBenchmark();
  }, []);

  return (
    <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      <div>
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-cyan-500/10 text-cogni-cyan border border-cyan-500/20 text-xs font-semibold uppercase font-mono tracking-wider mb-2">
          <Gauge className="w-3.5 h-3.5" /> Hardware & Browser Verification
        </div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
          Timing Engine Diagnostics
        </h1>
        <p className="text-sm text-slate-400 mt-1 max-w-2xl leading-relaxed">
          Evaluates high-resolution performance timers, display refresh rate synchronization
          (requestAnimationFrame), and frame interval jitter on this machine.
        </p>
      </div>

      {/* Scientific Notice Banner */}
      <div className="p-4 rounded-2xl bg-brand-500/10 border border-brand-500/20 flex items-start gap-3.5 text-xs text-brand-300">
        <Info className="w-5 h-5 text-brand-400 mt-0.5 shrink-0" />
        <div>
          <strong className="font-semibold text-slate-200">
            Scientific Timing Transparency Principles:
          </strong>
          <p className="mt-1 text-slate-300 leading-relaxed">
            Cognera employs <code className="text-cyan-300">window.performance.now()</code> and double-RAF
            VSYNC synchronization. While web browsers optimize reaction time logging to sub-millisecond precision,
            consumer operating systems and monitor display pipelines introduce variable input lag.
            Cognera records browser metadata and flags questionable timing conditions to ensure rigorous research reproducibility.
          </p>
        </div>
      </div>

      {/* Diagnostics Cards */}
      {diagnostics && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Status Card */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                Timing Quality
              </span>
              <div className="my-2">
                <span
                  className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-sm font-bold ${
                    diagnostics.timingQuality === 'Good'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                      : diagnostics.timingQuality === 'Normal'
                      ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                  }`}
                >
                  {diagnostics.timingQuality === 'Good' ? (
                    <CheckCircle2 className="w-4 h-4" />
                  ) : (
                    <AlertTriangle className="w-4 h-4" />
                  )}
                  {diagnostics.timingQuality}
                </span>
              </div>
              <span className="text-[11px] text-slate-400">Based on frame interval stability</span>
            </div>

            {/* Estimated Refresh Rate */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                Display Refresh Rate
              </span>
              <div className="text-3xl font-extrabold text-slate-100 my-1">
                ~{diagnostics.estimatedHz}{' '}
                <span className="text-sm font-normal text-slate-400 font-mono">Hz</span>
              </div>
              <span className="text-[11px] text-slate-400">
                Frame interval: {diagnostics.avgFrameIntervalMs}ms
              </span>
            </div>

            {/* Jitter */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                VSYNC Frame Jitter
              </span>
              <div className="text-3xl font-extrabold text-brand-300 my-1 font-mono">
                ±{diagnostics.jitterMs}{' '}
                <span className="text-sm font-normal text-slate-400">ms</span>
              </div>
              <span className="text-[11px] text-slate-400">Standard deviation over 60 frames</span>
            </div>

            {/* Hardware Concurrency */}
            <div className="glass-panel p-5 rounded-2xl border border-slate-800 flex flex-col justify-between">
              <span className="text-xs uppercase font-mono tracking-wider text-slate-400 font-semibold">
                CPU Threads
              </span>
              <div className="text-3xl font-extrabold text-slate-100 my-1">
                {diagnostics.hardwareConcurrency}{' '}
                <span className="text-sm font-normal text-slate-400 font-mono">cores</span>
              </div>
              <span className="text-[11px] text-slate-400">hardwareConcurrency API</span>
            </div>
          </div>

          {/* Technical Details Panel */}
          <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
            <div className="flex items-center justify-between border-b border-slate-800 pb-4">
              <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                <Monitor className="w-4 h-4 text-cyan-400" /> Device & Browser Environment
              </h3>
              <button
                onClick={runBenchmark}
                disabled={running}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-all"
              >
                <RotateCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} />
                {running ? 'Benchmarking...' : 'Re-run Benchmark'}
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
              <div className="p-3 bg-cogni-card rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">High-Resolution Timing API</span>
                <span className="font-mono font-semibold text-emerald-400">
                  {diagnostics.timingApiSupported
                    ? 'Supported (window.performance.now)'
                    : 'Unsupported'}
                </span>
              </div>

              <div className="p-3 bg-cogni-card rounded-xl border border-slate-800">
                <span className="text-slate-400 block mb-1">Screen Viewport</span>
                <span className="font-mono font-semibold text-slate-200">
                  {diagnostics.screenResolution}
                </span>
              </div>

              <div className="p-3 bg-cogni-card rounded-xl border border-slate-800 col-span-1 sm:col-span-2">
                <span className="text-slate-400 block mb-1">User Agent</span>
                <span className="font-mono text-[11px] text-slate-300 break-all">
                  {navigator.userAgent}
                </span>
              </div>
            </div>

            {/* Diagnostic Notes */}
            <div className="pt-2">
              <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider mb-2">
                Diagnostics Observations
              </h4>
              <ul className="space-y-1.5 text-xs text-slate-400">
                {diagnostics.notes.map((note, i) => (
                  <li key={i} className="flex items-start gap-2">
                    <span className="text-brand-400 font-bold">•</span>
                    <span>{note}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
