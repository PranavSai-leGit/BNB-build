import React, { useState, useEffect } from 'react';
import {
  FileCheck,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  HelpCircle,
  RefreshCw,
  Sparkles,
  Database,
  Layers,
  Clock,
  ArrowRight,
  ShieldCheck,
  Lightbulb,
  ExternalLink,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import { Card } from '../../components/Card';

interface AnalysisReadinessProps {
  experimentId: string;
  versionNumber: number;
}

export const AnalysisReadinessTab: React.FC<AnalysisReadinessProps> = ({
  experimentId,
  versionNumber,
}) => {
  const [readiness, setReadiness] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [includePilot, setIncludePilot] = useState(false);

  const fetchReadiness = async (pilot: boolean = includePilot) => {
    setLoading(true);
    try {
      const data = await experimentApi.getReadiness(experimentId, pilot);
      setReadiness(data);
    } catch (err) {
      console.error('Failed to load analysis readiness:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchReadiness(includePilot);
  }, [experimentId, versionNumber, includePilot]);

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-400 mr-3" />
        Evaluating Analysis Readiness...
      </div>
    );
  }

  const overallStatus = readiness?.overall_status || 'review';
  const isReady = overallStatus === 'ready';
  const summary = readiness?.summary || {};

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div
            className={`w-10 h-10 rounded-xl flex items-center justify-center border ${
              isReady
                ? 'bg-emerald-500/10 border-emerald-500/20 text-emerald-400'
                : 'bg-amber-500/10 border-amber-500/20 text-amber-400'
            }`}
          >
            <FileCheck className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">Analysis Readiness Checker</h2>
              <span
                className={`text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider border ${
                  isReady
                    ? 'bg-emerald-500/10 text-emerald-300 border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-300 border-amber-500/30'
                }`}
              >
                {isReady ? 'Analysis Ready' : 'Review Recommended'}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Deterministic verification of data integrity, condition representation, missing values, and metadata provenance before running statistical models.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Include Pilot Data Toggle */}
          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-900 border border-slate-800 px-3 py-1.5 rounded-xl cursor-pointer hover:border-slate-700 transition-colors">
            <input
              type="checkbox"
              checked={includePilot}
              onChange={(e) => {
                setIncludePilot(e.target.checked);
              }}
              className="rounded bg-slate-950 border-slate-700 text-brand-500 focus:ring-brand-500"
            />
            <span>Include Pilot Sessions</span>
          </label>

          <button
            onClick={() => fetchReadiness()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-evaluate
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-400">Total Sessions</div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-1">
            {readiness?.total_sessions ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {readiness?.completed_sessions ?? 0} completed
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Recorded Trials</div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-1">
            {readiness?.total_trials ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Across all valid blocks</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Checks Passed</div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {summary.passed ?? 0} / {summary.total_checks ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {summary.warnings ?? 0} warnings, {summary.errors ?? 0} errors
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Missing RT %</div>
          <div className="text-xl font-mono font-bold text-slate-200 mt-1">
            {readiness?.missing_data_summary?.missing_rt_pct ?? 0}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {readiness?.missing_data_summary?.missing_rt_count ?? 0} response trials missing RT
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Version Locking</div>
          <div className="text-xs font-semibold text-brand-300 mt-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Version v{versionNumber}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {readiness?.data_dictionary_ready ? '✓ Dictionary verified' : '⚠ Missing dictionary'}
          </div>
        </Card>
      </div>

      {/* Main Checklist */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <Database className="w-4 h-4 text-brand-400" />
          Research Dataset Readiness Checks ({readiness?.checks?.length || 0})
        </h3>

        <div className="space-y-3">
          {readiness?.checks?.map((check: any, idx: number) => {
            const isPassed = check.status === 'passed';
            const isWarning = check.status === 'warning';
            const isError = check.status === 'error';

            return (
              <Card
                key={check.id || idx}
                className={`p-4 border-l-4 transition-all ${
                  isPassed
                    ? 'border-l-emerald-500 bg-emerald-500/5'
                    : isWarning
                    ? 'border-l-amber-500 bg-amber-500/5'
                    : 'border-l-rose-500 bg-rose-500/5'
                }`}
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-3">
                    {isPassed ? (
                      <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0 mt-0.5" />
                    ) : isWarning ? (
                      <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                    ) : (
                      <XCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                    )}

                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-200">{check.name}</span>
                        <span
                          className={`text-[9px] px-2 py-0.2 rounded font-bold uppercase tracking-wider ${
                            isPassed
                              ? 'bg-emerald-500/20 text-emerald-300'
                              : isWarning
                              ? 'bg-amber-500/20 text-amber-300'
                              : 'bg-rose-500/20 text-rose-300'
                          }`}
                        >
                          {check.status}
                        </span>
                      </div>
                      <p className="text-xs text-slate-300 leading-relaxed">{check.message}</p>

                      {check.recommendation && (
                        <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                          <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                          <span>{check.recommendation}</span>
                        </div>
                      )}
                    </div>
                  </div>

                  {check.metrics && (
                    <div className="text-right shrink-0">
                      <div className="text-xs font-mono font-bold text-slate-300">
                        {check.metrics.pct != null ? `${check.metrics.pct}%` : ''}
                      </div>
                      {check.metrics.count != null && (
                        <div className="text-[10px] text-slate-500 font-mono">
                          {check.metrics.count} occurrences
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      </div>
    </div>
  );
};
