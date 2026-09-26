import React, { useState, useEffect } from 'react';
import {
  ShieldAlert,
  CheckCircle2,
  AlertTriangle,
  XCircle,
  Sliders,
  Filter,
  Users,
  Search,
  RefreshCw,
  Plus,
  Trash2,
  HelpCircle,
  Eye,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import { Card } from '../../components/Card';
import { Modal } from '../../components/Modal';

interface QualitySignal {
  type: string;
  severity: 'critical' | 'warning' | 'info';
  count: number;
  message: string;
}

interface EvaluatedSession {
  session_id: string;
  participant_id: string;
  status: 'good' | 'review' | 'poor';
  signals: QualitySignal[];
  metrics: {
    total_trials: number;
    mean_rt_ms: number;
    rt_std_ms: number;
    fast_responses_count: number;
    slow_responses_count: number;
    missing_responses_count: number;
    attention_fails_count: number;
  };
  evaluated_at: string;
}

interface QualityReport {
  total_sessions: number;
  good: number;
  review: number;
  poor: number;
  quality_score_pct: number;
  common_signals: { signal: string; count: number; label: string }[];
  sessions: EvaluatedSession[];
  evaluated_at: string;
}

interface DataQualityTabProps {
  experimentId: string;
}

export const DataQualityTab: React.FC<DataQualityTabProps> = ({ experimentId }) => {
  const [report, setReport] = useState<QualityReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedSession, setSelectedSession] = useState<EvaluatedSession | null>(null);

  // Custom Quality Rules Modal
  const [isRulesModalOpen, setIsRulesModalOpen] = useState(false);
  const [fastRtThreshold, setFastRtThreshold] = useState(5);
  const [attentionFailThreshold, setAttentionFailThreshold] = useState(2);
  const [savingRules, setSavingRules] = useState(false);

  const fetchQualityData = () => {
    setLoading(true);
    experimentApi
      .getDataQualityReport(experimentId)
      .then((data) => {
        setReport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load quality report:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchQualityData();
  }, [experimentId]);

  const handleSaveCustomRules = async () => {
    setSavingRules(true);
    try {
      const rules = [
        {
          rule_type: 'fast_rt_trials',
          threshold: fastRtThreshold,
          action: 'flag_review',
          description: `Reaction time < 150ms on >= ${fastRtThreshold} trials`,
        },
        {
          rule_type: 'attention_fails',
          threshold: attentionFailThreshold,
          action: 'flag_review',
          description: `Attention checks failed >= ${attentionFailThreshold}`,
        },
      ];
      await experimentApi.updateQualityRules(experimentId, rules);
      setIsRulesModalOpen(false);
      fetchQualityData();
    } catch (err) {
      alert('Failed to save quality rules');
    } finally {
      setSavingRules(false);
    }
  };

  const filteredSessions = (report?.sessions || []).filter((s) => {
    const matchesFilter = filterStatus === 'all' || s.status === filterStatus;
    const matchesSearch =
      s.participant_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      s.session_id.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  return (
    <div className="space-y-6 animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Overview Banner */}
      <div className="p-4 rounded-2xl bg-gradient-to-r from-cyan-950/30 via-slate-900 to-indigo-950/30 border border-slate-800 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-bold text-slate-100 flex items-center gap-2">
            <ShieldAlert className="w-5 h-5 text-cyan-400" />
            Data Quality Engine
          </h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Automated reliability signals for researcher review. No participant data is permanently excluded without researcher intervention.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => setIsRulesModalOpen(true)}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            <Sliders className="w-3.5 h-3.5 text-cyan-400" />
            Configure Rules
          </button>
          <button
            onClick={fetchQualityData}
            disabled={loading}
            className="p-2 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-xl transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-cyan-400' : ''}`} />
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card interactive={false}>
          <span className="text-[11px] uppercase font-mono font-semibold text-slate-400">
            Total Sessions
          </span>
          <div className="text-2xl font-extrabold text-slate-100 mt-1">
            {report?.total_sessions ?? 0}
          </div>
          <span className="text-[10px] text-slate-500 mt-1 block">
            Quality score: {report?.quality_score_pct ?? 100}%
          </span>
        </Card>

        <Card interactive={false}>
          <span className="text-[11px] uppercase font-mono font-semibold text-emerald-400">
            Good (Clean)
          </span>
          <div className="text-2xl font-extrabold text-emerald-400 mt-1">
            {report?.good ?? 0}
          </div>
          <span className="text-[10px] text-emerald-300/80 mt-1 block">
            Passed all reliability signals
          </span>
        </Card>

        <Card interactive={false}>
          <span className="text-[11px] uppercase font-mono font-semibold text-amber-400">
            Flagged for Review
          </span>
          <div className="text-2xl font-extrabold text-amber-400 mt-1">
            {report?.review ?? 0}
          </div>
          <span className="text-[10px] text-amber-300/80 mt-1 block">
            Mild variance or attention lapses
          </span>
        </Card>

        <Card interactive={false}>
          <span className="text-[11px] uppercase font-mono font-semibold text-rose-400">
            Poor Reliability
          </span>
          <div className="text-2xl font-extrabold text-rose-400 mt-1">
            {report?.poor ?? 0}
          </div>
          <span className="text-[10px] text-rose-300/80 mt-1 block">
            Multiple critical quality flags
          </span>
        </Card>
      </div>

      {/* Common Signals Histogram */}
      {report?.common_signals && report.common_signals.length > 0 && (
        <Card interactive={false} className="space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Observed Quality Signals
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {report.common_signals.map((sig) => (
              <div
                key={sig.signal}
                className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between"
              >
                <div>
                  <h4 className="text-xs font-semibold text-slate-200">{sig.label}</h4>
                  <span className="text-[10px] text-slate-400 font-mono">Signal count</span>
                </div>
                <span className="text-base font-bold text-cyan-400 bg-cyan-950/40 px-2.5 py-0.5 rounded-lg border border-cyan-800/40">
                  {sig.count}
                </span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Filter and Session List */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative flex-1 w-full">
            <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search by participant pseudonym (e.g. P-8A9F1B2C)..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-10 pr-4 py-2 bg-cogni-panel border border-slate-800 rounded-xl text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            />
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto">
            <Filter className="w-4 h-4 text-slate-400" />
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="bg-cogni-panel border border-slate-800 rounded-xl px-3 py-2 text-xs text-slate-200 focus:outline-none focus:border-cyan-500"
            >
              <option value="all">All Quality Tiers</option>
              <option value="good">Good Only</option>
              <option value="review">Review Recommended</option>
              <option value="poor">Poor Reliability</option>
            </select>
          </div>
        </div>

        {/* Sessions Table */}
        {loading ? (
          <div className="p-12 text-center text-slate-400 text-xs">
            Evaluating participant session signals...
          </div>
        ) : filteredSessions.length === 0 ? (
          <div className="p-12 text-center bg-cogni-panel/40 border border-slate-800 rounded-2xl text-slate-400 text-xs space-y-2">
            <Users className="w-8 h-8 text-slate-600 mx-auto" />
            <p>No participant sessions match the selected filter criteria.</p>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-800 bg-cogni-panel/60">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Participant</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Quality Signals</th>
                  <th className="py-3 px-4">Mean RT</th>
                  <th className="py-3 px-4">RT Variance</th>
                  <th className="py-3 px-4 text-right">Review</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredSessions.map((session) => (
                  <tr
                    key={session.session_id}
                    className="hover:bg-slate-800/30 transition-colors"
                  >
                    <td className="py-3 px-4 font-mono font-bold text-slate-200">
                      {session.participant_id}
                    </td>
                    <td className="py-3 px-4">
                      <span
                        className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          session.status === 'good'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                            : session.status === 'review'
                            ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                        }`}
                      >
                        {session.status === 'good' && <CheckCircle2 className="w-3 h-3" />}
                        {session.status === 'review' && <AlertTriangle className="w-3 h-3" />}
                        {session.status === 'poor' && <XCircle className="w-3 h-3" />}
                        {session.status}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <div className="flex flex-wrap gap-1 max-w-md">
                        {session.signals.length === 0 ? (
                          <span className="text-[11px] text-slate-500">No flags</span>
                        ) : (
                          session.signals.map((sig, idx) => (
                            <span
                              key={idx}
                              className={`text-[10px] px-2 py-0.5 rounded ${
                                sig.severity === 'critical'
                                  ? 'bg-rose-950/40 text-rose-300 border border-rose-800/40'
                                  : 'bg-amber-950/40 text-amber-300 border border-amber-800/40'
                              }`}
                            >
                              {sig.message}
                            </span>
                          ))
                        )}
                      </div>
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-300">
                      {session.metrics.mean_rt_ms > 0 ? `${session.metrics.mean_rt_ms}ms` : '—'}
                    </td>
                    <td className="py-3 px-4 font-mono text-slate-400">
                      {session.metrics.rt_std_ms > 0 ? `±${session.metrics.rt_std_ms}ms` : '—'}
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => setSelectedSession(session)}
                        className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-semibold inline-flex items-center gap-1 transition-colors"
                      >
                        <Eye className="w-3 h-3 text-cyan-400" /> Inspect
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Participant Session Detail Modal */}
      {selectedSession && (
        <Modal
          isOpen={true}
          onClose={() => setSelectedSession(null)}
          title={`Data Quality Inspection: ${selectedSession.participant_id}`}
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-slate-900/80 rounded-xl border border-slate-800 flex items-center justify-between">
              <div>
                <span className="text-[10px] text-slate-400 uppercase font-mono">Session ID</span>
                <div className="font-mono text-slate-200 text-xs">{selectedSession.session_id}</div>
              </div>
              <span
                className={`px-3 py-1 rounded-full text-xs font-bold uppercase tracking-wider ${
                  selectedSession.status === 'good'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : selectedSession.status === 'review'
                    ? 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                    : 'bg-rose-500/10 text-rose-400 border border-rose-500/30'
                }`}
              >
                Status: {selectedSession.status}
              </span>
            </div>

            {/* Trial Metrics Grid */}
            <div className="grid grid-cols-3 gap-2">
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Total Trials</span>
                <div className="text-lg font-bold text-slate-100">
                  {selectedSession.metrics.total_trials}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Fast RTs (&lt;150ms)</span>
                <div className="text-lg font-bold text-amber-400">
                  {selectedSession.metrics.fast_responses_count}
                </div>
              </div>
              <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                <span className="text-[10px] text-slate-400 uppercase">Failed Attention</span>
                <div className="text-lg font-bold text-rose-400">
                  {selectedSession.metrics.attention_fails_count}
                </div>
              </div>
            </div>

            {/* Signal Details */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                Detected Quality Signals
              </h4>
              {selectedSession.signals.length === 0 ? (
                <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 rounded-xl text-emerald-300 text-xs">
                  ✓ No reliability anomalies or timing failures detected.
                </div>
              ) : (
                selectedSession.signals.map((sig, i) => (
                  <div
                    key={i}
                    className={`p-3 rounded-xl border flex items-start gap-2.5 ${
                      sig.severity === 'critical'
                        ? 'bg-rose-950/30 border-rose-500/30 text-rose-200'
                        : 'bg-amber-950/30 border-amber-500/30 text-amber-200'
                    }`}
                  >
                    <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5 text-current" />
                    <div>
                      <h5 className="font-bold text-xs capitalize">{sig.type.replace(/_/g, ' ')}</h5>
                      <p className="text-[11px] opacity-90 mt-0.5">{sig.message}</p>
                    </div>
                  </div>
                ))
              )}
            </div>

            <div className="p-3 rounded-xl bg-slate-900/40 border border-slate-800 text-[11px] text-slate-400 leading-relaxed">
              <strong>Researcher Discretion:</strong> Cognera flags potential reliability signals to support sensitivity analyses. You may retain, annotate, or filter this participant in your statistical analysis plan.
            </div>
          </div>
        </Modal>
      )}

      {/* Rules Configuration Modal */}
      <Modal
        isOpen={isRulesModalOpen}
        onClose={() => setIsRulesModalOpen(false)}
        title="Configure Data Quality Rules"
        maxWidth="max-w-md"
      >
        <div className="space-y-4 text-xs">
          <p className="text-slate-400 leading-relaxed">
            Define automated thresholds that flag participant sessions for researcher review. These rules are versioned alongside the experiment definition.
          </p>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Anticipatory Reaction Time Flag Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={50}
                value={fastRtThreshold}
                onChange={(e) => setFastRtThreshold(Number(e.target.value))}
                className="w-24 bg-cogni-card border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-center focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-400">trials with RT &lt; 150ms</span>
            </div>
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Attention Check Failure Threshold
            </label>
            <div className="flex items-center gap-2">
              <input
                type="number"
                min={1}
                max={10}
                value={attentionFailThreshold}
                onChange={(e) => setAttentionFailThreshold(Number(e.target.value))}
                className="w-24 bg-cogni-card border border-slate-700 rounded-xl px-3 py-2 text-slate-100 font-mono text-center focus:outline-none focus:border-cyan-500"
              />
              <span className="text-slate-400">failed attention checks flag session</span>
            </div>
          </div>

          <div className="pt-3 border-t border-slate-800 flex justify-end gap-2">
            <button
              onClick={() => setIsRulesModalOpen(false)}
              className="px-4 py-2 text-slate-400 hover:text-slate-200"
            >
              Cancel
            </button>
            <button
              onClick={handleSaveCustomRules}
              disabled={savingRules}
              className="px-5 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold rounded-xl transition-colors shadow-lg shadow-cyan-600/20"
            >
              {savingRules ? 'Saving...' : 'Apply Rules'}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
