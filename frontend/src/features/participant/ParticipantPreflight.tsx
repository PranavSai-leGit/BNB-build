import React, { useState, useEffect } from 'react';
import {
  Laptop,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Clock,
  Maximize2,
  Keyboard,
  MousePointer,
  RefreshCw,
  ArrowRight,
  ShieldCheck,
  Eye,
} from 'lucide-react';
import { Card } from '../../components/Card';
import { TimingEngine } from '../../experiment-engine/TimingEngine';

interface PreflightProps {
  studyName: string;
  preflightConfig?: {
    require_fullscreen?: boolean;
    require_keyboard?: boolean;
    require_mouse?: boolean;
    require_timing_api?: boolean;
    min_screen_width?: number;
    min_screen_height?: number;
    desktop_only?: boolean;
  };
  onProceed: () => void;
}

interface DiagnosticItem {
  id: string;
  name: string;
  status: 'passed' | 'warning' | 'failed';
  message: string;
  isMandatory: boolean;
  icon: React.ReactNode;
}

export const ParticipantPreflight: React.FC<PreflightProps> = ({
  studyName,
  preflightConfig = {},
  onProceed,
}) => {
  const [diagnostics, setDiagnostics] = useState<DiagnosticItem[]>([]);
  const [running, setRunning] = useState(true);
  const [canProceed, setCanProceed] = useState(false);

  const runDiagnostics = async () => {
    setRunning(true);
    const results: DiagnosticItem[] = [];

    // 1. Browser Compatibility
    const hasPerformance = typeof window !== 'undefined' && 'performance' in window && 'now' in window.performance;
    const hasFetch = typeof window !== 'undefined' && 'fetch' in window;
    const hasAudio = typeof window !== 'undefined' && ('AudioContext' in window || 'webkitAudioContext' in window);

    results.push({
      id: 'browser_support',
      name: 'Browser Compatibility',
      status: hasPerformance && hasFetch ? 'passed' : 'failed',
      message: hasPerformance ? 'Modern standards-compliant web browser detected' : 'Incompatible browser runtime',
      isMandatory: true,
      icon: <Laptop className="w-4 h-4 text-cyan-400" />,
    });

    // 2. High-Precision Timing API
    try {
      const timingEngine = TimingEngine.getInstance();
      const perf = await timingEngine.estimateDisplayPerformance(15);
      const isTimingSupported = perf.timingApiSupported;
      const isGoodQuality = perf.timingQuality === 'Good' || perf.timingQuality === 'Normal';

      results.push({
        id: 'timing_api',
        name: 'High-Resolution Timing API',
        status: isTimingSupported ? (isGoodQuality ? 'passed' : 'warning') : 'warning',
        message: isTimingSupported
          ? `Sub-millisecond timer active (~${perf.estimatedHz}Hz refresh estimated)`
          : 'Standard timer active; millisecond jitter may occur',
        isMandatory: preflightConfig.require_timing_api || false,
        icon: <Clock className="w-4 h-4 text-emerald-400" />,
      });
    } catch {
      results.push({
        id: 'timing_api',
        name: 'High-Resolution Timing API',
        status: 'warning',
        message: 'Timing engine initialization completed with standard timer fallback',
        isMandatory: false,
        icon: <Clock className="w-4 h-4 text-amber-400" />,
      });
    }

    // 3. Screen Dimensions
    const minW = preflightConfig.min_screen_width || 1024;
    const minH = preflightConfig.min_screen_height || 600;
    const curW = window.screen.width;
    const curH = window.screen.height;
    const screenPassed = curW >= minW && curH >= minH;

    results.push({
      id: 'screen_dimensions',
      name: 'Display Resolution',
      status: screenPassed ? 'passed' : 'warning',
      message: `${curW}×${curH} px (recommended min: ${minW}×${minH} px)`,
      isMandatory: false,
      icon: <Eye className="w-4 h-4 text-brand-400" />,
    });

    // 4. Fullscreen Capability
    const hasFullscreen = !!(
      document.fullscreenEnabled ||
      (document as any).webkitFullscreenEnabled ||
      (document as any).mozFullScreenEnabled
    );
    results.push({
      id: 'fullscreen',
      name: 'Fullscreen Presentation Capability',
      status: hasFullscreen ? 'passed' : preflightConfig.require_fullscreen ? 'failed' : 'warning',
      message: hasFullscreen ? 'Fullscreen presentation supported' : 'Browser fullscreen mode unavailable',
      isMandatory: preflightConfig.require_fullscreen || false,
      icon: <Maximize2 className="w-4 h-4 text-purple-400" />,
    });

    // 5. Input Device Suitability (Keyboard / Touch)
    const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
    const isMobileUserAgent = /Mobi|Android|iPhone|iPad/i.test(navigator.userAgent);
    const isDesktop = !isMobileUserAgent && !isTouchDevice;

    if (preflightConfig.desktop_only || preflightConfig.require_keyboard) {
      results.push({
        id: 'input_device',
        name: 'Physical Keyboard & Input Device',
        status: isDesktop ? 'passed' : 'warning',
        message: isDesktop
          ? 'Physical keyboard and mouse interface detected'
          : 'Touchscreen device detected; a physical keyboard is strongly recommended for this study',
        isMandatory: preflightConfig.desktop_only || false,
        icon: <Keyboard className="w-4 h-4 text-indigo-400" />,
      });
    } else {
      results.push({
        id: 'input_device',
        name: 'Input Device Modality',
        status: 'passed',
        message: isDesktop ? 'Desktop input detected' : 'Touchscreen interface detected',
        isMandatory: false,
        icon: <MousePointer className="w-4 h-4 text-indigo-400" />,
      });
    }

    setDiagnostics(results);
    const hasFailedMandatory = results.some((r) => r.isMandatory && r.status === 'failed');
    setCanProceed(!hasFailedMandatory);
    setRunning(false);
  };

  useEffect(() => {
    runDiagnostics();
  }, []);

  return (
    <div className="max-w-xl mx-auto p-6 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-brand-500/10 border border-brand-500/20 text-brand-400 flex items-center justify-center mx-auto">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <h2 className="text-lg font-bold text-slate-100">Participant Environment Check</h2>
        <p className="text-xs text-slate-400 max-w-sm mx-auto">
          Verifying display suitability and input timing capabilities before beginning{' '}
          <strong className="text-slate-200">{studyName}</strong>.
        </p>
      </div>

      <div className="space-y-3">
        {diagnostics.map((diag) => {
          const isPassed = diag.status === 'passed';
          const isWarning = diag.status === 'warning';

          return (
            <Card
              key={diag.id}
              className={`p-3.5 border-l-4 transition-all ${
                isPassed
                  ? 'border-l-emerald-500 bg-emerald-500/5'
                  : isWarning
                  ? 'border-l-amber-500 bg-amber-500/5'
                  : 'border-l-rose-500 bg-rose-500/5'
              }`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-slate-900 border border-slate-800">
                    {diag.icon}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-200">{diag.name}</span>
                      {diag.isMandatory && (
                        <span className="text-[9px] px-1.5 py-0.2 rounded font-bold uppercase bg-slate-800 text-slate-400">
                          Required
                        </span>
                      )}
                    </div>
                    <p className="text-[11px] text-slate-400 mt-0.5">{diag.message}</p>
                  </div>
                </div>

                {isPassed ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                ) : isWarning ? (
                  <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
                ) : (
                  <XCircle className="w-4 h-4 text-rose-400 shrink-0" />
                )}
              </div>
            </Card>
          );
        })}
      </div>

      <div className="p-3 bg-slate-900/60 rounded-xl border border-slate-800 text-[11px] text-slate-400 text-center">
        Preflight measurements evaluate device compatibility and are used solely for diagnostic timing calibration.
      </div>

      <div className="flex items-center justify-between gap-3 pt-2">
        <button
          onClick={runDiagnostics}
          disabled={running}
          className="flex items-center gap-1.5 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${running ? 'animate-spin' : ''}`} /> Re-test
        </button>

        <button
          onClick={onProceed}
          disabled={!canProceed || running}
          className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Continue to Experiment</span>
          <ArrowRight className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
