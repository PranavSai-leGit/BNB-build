import React, { useState, useEffect } from 'react';
import {
  Compass,
  Laptop,
  Smartphone,
  AlertTriangle,
  Info,
  Clock,
  Activity,
  Layers,
  HelpCircle,
  RefreshCw,
  Search,
  Eye,
  Sliders,
  ChevronRight,
  TrendingDown,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import { Card } from '../../components/Card';
import { Pagination } from '../../components/Pagination';

interface RootCauseProps {
  experimentId: string;
}

export const DataQualityRootCauseExplorer: React.FC<RootCauseProps> = ({ experimentId }) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [includePilot, setIncludePilot] = useState(false);
  const [selectedIssue, setSelectedIssue] = useState<any>(null);

  // Pagination for affected sessions in drilldown
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(5);

  const fetchRootCauses = async (pilot: boolean = includePilot) => {
    setLoading(true);
    try {
      const res = await experimentApi.getRootCauses(experimentId, pilot);
      setData(res);
    } catch (err) {
      console.error('Failed to load root causes:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRootCauses(includePilot);
  }, [experimentId, includePilot]);

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-cyan-400 mx-auto mb-2" />
        Analyzing Multi-Dimensional Quality Signals...
      </div>
    );
  }

  const issues = data?.identified_issues || [];
  const breakdowns = data?.breakdowns || {};
  const device = breakdowns?.device || {};

  return (
    <div className="space-y-6">
      {/* Subheader */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-slate-900/60 p-4 rounded-2xl border border-slate-800">
        <div>
          <h3 className="text-sm font-bold text-slate-100 flex items-center gap-2">
            <Compass className="w-4 h-4 text-cyan-400" />
            Root-Cause Diagnostic Engine
          </h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Investigates underlying patterns across devices, experimental conditions, trial blocks, and dropout stages using probabilistic evidence.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <label className="flex items-center gap-2 text-xs text-slate-300 bg-slate-950 border border-slate-800 px-3 py-1.5 rounded-xl cursor-pointer">
            <input
              type="checkbox"
              checked={includePilot}
              onChange={(e) => setIncludePilot(e.target.checked)}
              className="rounded bg-slate-900 border-slate-700 text-brand-500 focus:ring-brand-500"
            />
            <span>Include Pilot Data</span>
          </label>
          <button
            onClick={() => fetchRootCauses()}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-xs font-semibold rounded-xl text-slate-200 transition-colors"
          >
            <RefreshCw className="w-3.5 h-3.5" /> Re-scan
          </button>
        </div>
      </div>

      {/* Primary Identified Issues with Evidence Language */}
      <div className="space-y-3">
        <h4 className="text-xs font-bold text-slate-300 uppercase tracking-wider">
          Detected Quality Patterns ({issues.length})
        </h4>

        {issues.length === 0 ? (
          <Card className="p-6 text-center text-slate-400">
            <div className="w-10 h-10 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto mb-2">
              <Activity className="w-5 h-5" />
            </div>
            <div className="text-sm font-bold text-slate-200">No Concentrated Quality Anomalies</div>
            <p className="text-xs text-slate-400 mt-1 max-w-md mx-auto">
              Trial latencies, completion rates, and timing jitter are homogeneously distributed across
              devices, conditions, and session blocks.
            </p>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {issues.map((issue: any, idx: number) => {
              const isHigh = issue.severity === 'high';
              return (
                <Card
                  key={issue.id || idx}
                  className={`p-4 border-l-4 transition-all hover:border-brand-500 cursor-pointer ${
                    isHigh
                      ? 'border-l-rose-500 bg-rose-500/5'
                      : 'border-l-amber-500 bg-amber-500/5'
                  }`}
                  onClick={() => {
                    setSelectedIssue(issue);
                    setSessionPage(1);
                  }}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-100">{issue.title}</span>
                      <span
                        className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase ${
                          isHigh
                            ? 'bg-rose-500/20 text-rose-300'
                            : 'bg-amber-500/20 text-amber-300'
                        }`}
                      >
                        {issue.dimension}
                      </span>
                    </div>
                    <ChevronRight className="w-4 h-4 text-slate-500 shrink-0" />
                  </div>

                  {/* Possible Cause & Evidence */}
                  <div className="mt-2 space-y-1.5 text-xs text-slate-300">
                    <div className="p-2 bg-slate-900/80 rounded-lg border border-slate-800">
                      <div className="text-[10px] text-brand-300 font-semibold uppercase tracking-wider mb-0.5">
                        Possible Cause
                      </div>
                      <div className="text-slate-200 leading-relaxed">{issue.possible_cause}</div>
                    </div>

                    <div className="space-y-1 pt-1">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase tracking-wider">
                        Observed Evidence
                      </div>
                      <ul className="list-disc list-inside text-[11px] text-slate-300 space-y-0.5">
                        {issue.evidence?.map((ev: string, evIdx: number) => (
                          <li key={evIdx}>{ev}</li>
                        ))}
                      </ul>
                    </div>
                  </div>

                  <div className="mt-3 pt-2 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span>
                      Affected Sessions: <strong className="text-slate-200 font-mono">{issue.affected_sessions?.length || 0}</strong>
                    </span>
                    <span className="text-brand-400 hover:text-brand-300 font-semibold flex items-center gap-1">
                      Drill Down <ChevronRight className="w-3 h-3" />
                    </span>
                  </div>
                </Card>
              );
            })}
          </div>
        )}
      </div>

      {/* Multi-Dimensional Breakdowns */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Device & Browser Analysis */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <Laptop className="w-4 h-4 text-cyan-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Device Modality Comparison
            </h4>
          </div>

          <div className="grid grid-cols-2 gap-3">
            {/* Desktop */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Laptop className="w-3.5 h-3.5 text-cyan-400" /> Desktop
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sessions:</span>
                  <span className="font-mono text-slate-200">{device.desktop?.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed:</span>
                  <span className="font-mono text-emerald-400">{device.desktop?.completed ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dropouts:</span>
                  <span className="font-mono text-amber-400">{device.desktop?.dropouts ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fast RT Flags:</span>
                  <span className="font-mono text-slate-300">{device.desktop?.fast_rts ?? 0}</span>
                </div>
              </div>
            </div>

            {/* Mobile */}
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 space-y-2">
              <div className="flex items-center gap-1.5 text-xs font-bold text-slate-200">
                <Smartphone className="w-3.5 h-3.5 text-purple-400" /> Mobile / Touch
              </div>
              <div className="space-y-1 text-[11px] text-slate-300">
                <div className="flex justify-between">
                  <span className="text-slate-500">Sessions:</span>
                  <span className="font-mono text-slate-200">{device.mobile?.total ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Completed:</span>
                  <span className="font-mono text-emerald-400">{device.mobile?.completed ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Dropouts:</span>
                  <span className="font-mono text-rose-400">{device.mobile?.dropouts ?? 0}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-slate-500">Fast RT Flags:</span>
                  <span className="font-mono text-slate-300">{device.mobile?.fast_rts ?? 0}</span>
                </div>
              </div>
            </div>
          </div>
        </Card>

        {/* Dropout Stage Distribution */}
        <Card className="p-4 space-y-3">
          <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
            <TrendingDown className="w-4 h-4 text-amber-400" />
            <h4 className="text-xs font-bold text-slate-200 uppercase tracking-wider">
              Participant Dropout Stage Points
            </h4>
          </div>

          <div className="space-y-2">
            {breakdowns?.dropouts?.length === 0 ? (
              <div className="text-xs text-slate-500 italic py-4 text-center">
                No dropouts recorded in this dataset.
              </div>
            ) : (
              breakdowns?.dropouts?.map((d: any, i: number) => (
                <div
                  key={i}
                  className="flex items-center justify-between p-2 bg-slate-900/60 rounded-lg border border-slate-800 text-xs"
                >
                  <span className="text-slate-200 font-medium">{d.stage || 'Trial Sequence'}</span>
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-amber-300">{d.count} dropouts</span>
                    <span className="text-[10px] text-slate-500 font-mono">
                      ({d.pct ?? 0}%)
                    </span>
                  </div>
                </div>
              ))
            )}
          </div>
        </Card>
      </div>

      {/* Drill-Down Modal for Selected Issue */}
      {selectedIssue && (
        <div className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-3xl max-w-2xl w-full p-6 space-y-4 shadow-2xl animate-in zoom-in-95">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div>
                <h4 className="text-sm font-bold text-slate-100 flex items-center gap-2">
                  <Compass className="w-4 h-4 text-brand-400" />
                  Drill Down: {selectedIssue.title}
                </h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Dimension: {selectedIssue.dimension} • Non-destructive investigation
                </p>
              </div>
              <button
                onClick={() => setSelectedIssue(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg"
              >
                ✕
              </button>
            </div>

            <div className="p-3 bg-slate-950 rounded-xl border border-slate-800 text-xs space-y-2">
              <div className="font-semibold text-brand-300">Hypothesized Underlying Cause</div>
              <p className="text-slate-300 leading-relaxed">{selectedIssue.possible_cause}</p>
            </div>

            {/* Affected Sessions Table with Pagination */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-semibold text-slate-300">
                <span>Associated Participant Sessions ({selectedIssue.affected_sessions?.length || 0})</span>
                <span className="text-[10px] text-slate-500">
                  Data quality engine flags are non-destructive
                </span>
              </div>

              <div className="bg-slate-950 rounded-xl border border-slate-800 overflow-hidden divide-y divide-slate-800 text-xs font-mono">
                {selectedIssue.affected_sessions
                  ?.slice((sessionPage - 1) * sessionPageSize, sessionPage * sessionPageSize)
                  .map((sid: string, sIdx: number) => (
                    <div key={sIdx} className="px-3 py-2 flex items-center justify-between text-slate-300">
                      <span>{sid}</span>
                      <span className="text-[10px] text-brand-400 bg-brand-500/10 px-2 py-0.5 rounded font-sans">
                        Flagged For Review
                      </span>
                    </div>
                  ))}
              </div>

              {selectedIssue.affected_sessions?.length > sessionPageSize && (
                <Pagination
                  currentPage={sessionPage}
                  totalItems={selectedIssue.affected_sessions.length}
                  pageSize={sessionPageSize}
                  onPageChange={setSessionPage}
                  onPageSizeChange={setSessionPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              )}
            </div>

            <div className="pt-2 flex justify-end">
              <button
                onClick={() => setSelectedIssue(null)}
                className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl"
              >
                Close Drill Down
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
