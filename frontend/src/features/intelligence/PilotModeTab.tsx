import React, { useState, useEffect } from 'react';
import {
  Play,
  CheckCircle2,
  AlertTriangle,
  Clock,
  Laptop,
  Users,
  GitBranch,
  RefreshCw,
  Share2,
  Copy,
  ExternalLink,
  ShieldCheck,
  Lightbulb,
  Layers,
  Sparkles,
  Bot,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';

interface PilotModeProps {
  experimentId: string;
  publicId: string;
  versionNumber: number;
}

export const PilotModeTab: React.FC<PilotModeProps> = ({
  experimentId,
  publicId,
  versionNumber,
}) => {
  const [report, setReport] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [simulating, setSimulating] = useState(false);
  const [simCount, setSimCount] = useState(5);
  const [copied, setCopied] = useState(false);

  const fetchPilotReport = async () => {
    setLoading(true);
    try {
      const data = await experimentApi.getPilotReport(experimentId);
      setReport(data);
    } catch (err) {
      console.error('Failed to load pilot report:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPilotReport();
  }, [experimentId, versionNumber]);

  const handleSimulate = async () => {
    setSimulating(true);
    try {
      const data = await experimentApi.simulatePilot(experimentId, simCount);
      setReport(data);
      alert(`Simulation completed! Generated ${simCount} simulated pilot runs to verify branch coverage and condition balance.`);
    } catch (err: any) {
      alert(`Simulation failed: ${err.message || err}`);
    } finally {
      setSimulating(false);
    }
  };

  const pilotUrl = `${window.location.origin}/participate/${publicId}?pilot=true`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(pilotUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-400 mr-3" />
        Compiling Pilot Telemetry & Diagnostic Report...
      </div>
    );
  }

  const findings = report?.findings || [];
  const metrics = report?.metrics || {};

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500/10 border border-purple-500/20 text-purple-400 flex items-center justify-center">
            <Play className="w-5 h-5 fill-purple-400" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">Pilot Mode & Test Suite</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-purple-500/20 text-purple-300 border border-purple-500/30">
                Pre-Publication
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Run test sessions with pilot participants or automated agents without polluting live research study datasets.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Copy Pilot Link */}
          <button
            onClick={handleCopyLink}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-brand-500 text-slate-200 text-xs font-semibold rounded-xl transition-all"
          >
            <Share2 className="w-3.5 h-3.5 text-purple-400" />
            {copied ? 'Pilot Link Copied!' : 'Copy Pilot URL'}
          </button>

          {/* Quick Simulation */}
          <div className="flex items-center gap-1.5 bg-slate-900 border border-slate-800 p-1 rounded-xl">
            <div className="w-24">
              <Select
                value={String(simCount)}
                onChange={(val) => setSimCount(Number(val))}
                options={[
                  { value: '5', label: '5 runs' },
                  { value: '10', label: '10 runs' },
                  { value: '20', label: '20 runs' },
                ]}
              />
            </div>
            <button
              onClick={handleSimulate}
              disabled={simulating}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-purple-600 hover:bg-purple-500 text-white text-xs font-bold rounded-lg transition-colors disabled:opacity-50"
            >
              {simulating ? (
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
              ) : (
                <Bot className="w-3.5 h-3.5" />
              )}
              Simulate
            </button>
          </div>
        </div>
      </div>

      {/* Top Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-400">Pilot Sessions</div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-1">
            {metrics.total_sessions ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics.completed_sessions ?? 0} completed ({metrics.dropout_rate_pct ?? 0}% dropouts)
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Avg Completion Time</div>
          <div className="text-xl font-mono font-bold text-purple-300 mt-1">
            {metrics.avg_completion_time_formatted || '0s'}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Estimated participant burden</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Branch Coverage</div>
          <div className="text-xl font-mono font-bold text-emerald-400 mt-1">
            {metrics.branch_coverage_pct ?? 100}%
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics.visited_nodes ?? 0} / {metrics.total_nodes ?? 0} nodes visited
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Timing Warnings</div>
          <div className="text-xl font-mono font-bold text-amber-300 mt-1">
            {metrics.timing_warnings_count ?? 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">Frame drops or jitter events</div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Unreachable Dead-Ends</div>
          <div className="text-xl font-mono font-bold text-slate-200 mt-1">
            {metrics.unreachable_nodes?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {metrics.unreachable_nodes?.length === 0 ? '✓ All paths reachable' : '⚠ Action needed'}
          </div>
        </Card>
      </div>

      {/* Pilot Report Findings */}
      <div className="space-y-3">
        <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
          <ShieldCheck className="w-4 h-4 text-purple-400" />
          Actionable Pilot Report ({findings.length} findings)
        </h3>

        {findings.length === 0 ? (
          <Card className="p-8 text-center text-slate-400">
            <CheckCircle2 className="w-8 h-8 text-emerald-400 mx-auto mb-2" />
            <div className="text-sm font-bold text-slate-200">No Pilot Telemetry Yet</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Run a test simulation or share the Pilot URL with testers to collect pre-publication
              timing, coverage, and dropout diagnostics.
            </p>
          </Card>
        ) : (
          <div className="space-y-3">
            {findings.map((f: any, idx: number) => {
              const isPassed = f.status === 'passed';
              const isWarning = f.status === 'warning';
              const isError = f.status === 'error';

              return (
                <Card
                  key={f.id || idx}
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
                        <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                      )}

                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs font-bold text-slate-200">{f.title}</span>
                          <span
                            className={`text-[9px] px-1.5 py-0.2 rounded font-bold uppercase ${
                              isPassed
                                ? 'bg-emerald-500/20 text-emerald-300'
                                : isWarning
                                ? 'bg-amber-500/20 text-amber-300'
                                : 'bg-rose-500/20 text-rose-300'
                            }`}
                          >
                            {f.category}
                          </span>
                        </div>
                        <p className="text-xs text-slate-300 mt-1 leading-relaxed">{f.message}</p>
                        {f.recommendation && (
                          <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/70 px-2.5 py-1.5 rounded-lg border border-slate-800">
                            <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                            <span>{f.recommendation}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Pilot Data Separation Notice */}
      <div className="p-4 bg-purple-500/10 border border-purple-500/20 rounded-2xl flex items-start gap-3 text-xs text-purple-200">
        <Sparkles className="w-5 h-5 text-purple-400 shrink-0 mt-0.5" />
        <div>
          <div className="font-bold">Strict Isolation of Pilot Datasets</div>
          <p className="text-[11px] text-purple-300 mt-0.5 leading-relaxed">
            All data collected via the Pilot Participant URL is tagged with <code className="bg-purple-900/50 px-1 py-0.5 rounded text-purple-200">is_pilot = true</code>.
            Pilot trials are automatically excluded from production CSV/JSON exports, publication dashboards, and final research analysis unless explicitly requested.
          </p>
        </div>
      </div>
    </div>
  );
};
