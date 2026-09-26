import React from 'react';
import {
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCircle2,
  X,
  ArrowRight,
  RefreshCw,
  ShieldAlert,
} from 'lucide-react';

interface LinterIssue {
  id: string;
  category: string;
  severity: 'ERROR' | 'WARNING' | 'INFO';
  title: string;
  message: string;
  node_id?: string | null;
}

interface LinterReport {
  valid: boolean;
  can_publish: boolean;
  errors: LinterIssue[];
  warnings: LinterIssue[];
  info: LinterIssue[];
  summary: {
    errors: number;
    warnings: number;
    info: number;
  };
}

interface ExperimentLinterPanelProps {
  isOpen: boolean;
  onClose: () => void;
  report: LinterReport | null;
  loading: boolean;
  onRevalidate: () => void;
  onSelectNode: (nodeId: string) => void;
  onPublishClick?: () => void;
}

export const ExperimentLinterPanel: React.FC<ExperimentLinterPanelProps> = ({
  isOpen,
  onClose,
  report,
  loading,
  onRevalidate,
  onSelectNode,
  onPublishClick,
}) => {
  if (!isOpen) return null;

  const errorCount = report?.summary?.errors ?? 0;
  const warningCount = report?.summary?.warnings ?? 0;
  const infoCount = report?.summary?.info ?? 0;
  const canPublish = report?.can_publish ?? false;

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[480px] bg-cogni-panel/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-slide-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100">Experiment Linter</h3>
            <p className="text-[11px] text-slate-400">Deterministic protocol verification</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRevalidate}
            disabled={loading}
            title="Re-run deterministic linter"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Summary Scoreboard */}
      <div className="p-4 bg-slate-900/60 border-b border-slate-800 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <span
            className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${
              errorCount > 0
                ? 'bg-rose-500/10 text-rose-400 border-rose-500/30'
                : 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30'
            }`}
          >
            {errorCount > 0 ? (
              <>
                <AlertCircle className="w-3.5 h-3.5" />
                {errorCount} {errorCount === 1 ? 'Error' : 'Errors'}
              </>
            ) : (
              <>
                <CheckCircle2 className="w-3.5 h-3.5" />
                0 Errors
              </>
            )}
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-500/10 text-amber-400 border border-amber-500/30">
            <AlertTriangle className="w-3.5 h-3.5" />
            {warningCount} {warningCount === 1 ? 'Warning' : 'Warnings'}
          </span>

          <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-500/10 text-blue-400 border border-blue-500/30">
            <Info className="w-3.5 h-3.5" />
            {infoCount} Info
          </span>
        </div>

        {errorCount > 0 && (
          <span className="text-[10px] text-rose-400 font-mono font-semibold uppercase tracking-wider">
            Blocks Publish
          </span>
        )}
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-3">
        {loading ? (
          <div className="py-12 text-center text-slate-400 text-xs">
            <div className="w-6 h-6 border-2 border-cyan-400 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Executing deterministic experiment linter...
          </div>
        ) : !report ? (
          <div className="py-12 text-center text-slate-500 text-xs">
            Run validation to inspect experiment graph, timing, stimuli, and consent.
          </div>
        ) : (
          <>
            {/* ERRORS */}
            {report.errors.map((err) => (
              <div
                key={err.id}
                onClick={() => err.node_id && onSelectNode(err.node_id)}
                className={`p-3.5 rounded-xl border bg-rose-950/20 border-rose-500/30 text-rose-200 transition-all ${
                  err.node_id ? 'cursor-pointer hover:border-rose-400 hover:bg-rose-950/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-rose-200">{err.title}</h4>
                      <span className="text-[10px] text-rose-400/80 font-mono uppercase">
                        [{err.category}]
                      </span>
                    </div>
                  </div>
                  {err.node_id && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-rose-500/20 text-rose-300 flex items-center gap-1">
                      Locate <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-rose-300/90 mt-2 leading-relaxed">{err.message}</p>
              </div>
            ))}

            {/* WARNINGS */}
            {report.warnings.map((warn) => (
              <div
                key={warn.id}
                onClick={() => warn.node_id && onSelectNode(warn.node_id)}
                className={`p-3.5 rounded-xl border bg-amber-950/20 border-amber-500/30 text-amber-200 transition-all ${
                  warn.node_id ? 'cursor-pointer hover:border-amber-400 hover:bg-amber-950/40' : ''
                }`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />
                    <div>
                      <h4 className="text-xs font-bold text-amber-200">{warn.title}</h4>
                      <span className="text-[10px] text-amber-400/80 font-mono uppercase">
                        [{warn.category}]
                      </span>
                    </div>
                  </div>
                  {warn.node_id && (
                    <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-amber-500/20 text-amber-300 flex items-center gap-1">
                      Locate <ArrowRight className="w-2.5 h-2.5" />
                    </span>
                  )}
                </div>
                <p className="text-xs text-amber-300/90 mt-2 leading-relaxed">{warn.message}</p>
              </div>
            ))}

            {/* INFO */}
            {report.info.map((inf) => (
              <div
                key={inf.id}
                className="p-3.5 rounded-xl border bg-slate-900/60 border-slate-800 text-slate-300"
              >
                <div className="flex items-center gap-2">
                  <Info className="w-4 h-4 text-blue-400 shrink-0" />
                  <div className="flex-1">
                    <h4 className="text-xs font-bold text-slate-200">{inf.title}</h4>
                    <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">{inf.message}</p>
                  </div>
                </div>
              </div>
            ))}

            {report.errors.length === 0 && report.warnings.length === 0 && (
              <div className="p-6 text-center bg-emerald-500/10 border border-emerald-500/30 rounded-2xl text-emerald-300 space-y-2">
                <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto" />
                <h4 className="text-sm font-bold text-emerald-200">Protocol Structure Clean</h4>
                <p className="text-xs text-emerald-300/80">
                  No structural, timing, or logical contradictions found. Ready for pilot testing or publishing.
                </p>
              </div>
            )}
          </>
        )}
      </div>

      {/* Footer Actions */}
      <div className="p-4 border-t border-slate-800 bg-cogni-panel flex items-center justify-between">
        <button
          onClick={onClose}
          className="px-4 py-2 text-xs font-semibold text-slate-300 hover:text-slate-100 transition-colors"
        >
          Close
        </button>

        {onPublishClick && canPublish && (
          <button
            onClick={onPublishClick}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg transition-all"
          >
            Ready to Publish
          </button>
        )}
      </div>
    </div>
  );
};
