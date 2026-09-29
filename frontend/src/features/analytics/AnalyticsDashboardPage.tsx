import React, { useState, useEffect } from 'react';
import { useSearchParams } from 'react-router-dom';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from 'recharts';
import { experimentApi } from '../../api/experimentApi';
import { analyticsApi } from '../../api/analyticsApi';
import { Experiment } from '../../types/experiment';
import { ExperimentAnalytics } from '../../types/analytics';
import {
  Download,
  BarChart3,
  Clock,
  Target,
  Users,
  CheckCircle2,
  FileSpreadsheet,
  FileCode,
  Activity,
  Calendar,
} from 'lucide-react';
import { Pagination } from '../../components/Pagination';
import { Select } from '../../components/Select';

export const AnalyticsDashboardPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const selectedExpIdFromUrl = searchParams.get('exp');

  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [selectedExpId, setSelectedExpId] = useState<string>('');
  const [analytics, setAnalytics] = useState<ExperimentAnalytics | null>(null);
  const [loading, setLoading] = useState(true);
  const [exportingCsv, setExportingCsv] = useState(false);
  const [exportingJson, setExportingJson] = useState(false);
  const [sessionPage, setSessionPage] = useState(1);
  const [sessionPageSize, setSessionPageSize] = useState(10);

  useEffect(() => {
    experimentApi.list().then((list) => {
      setExperiments(list);
      if (list.length > 0) {
        const targetId = selectedExpIdFromUrl || list[0].id;
        setSelectedExpId(targetId);
      }
    });
  }, [selectedExpIdFromUrl]);

  useEffect(() => {
    if (!selectedExpId) return;
    setLoading(true);
    analyticsApi
      .getExperimentAnalytics(selectedExpId)
      .then((data) => {
        setAnalytics(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load analytics:', err);
        setLoading(false);
      });
  }, [selectedExpId]);

  const handleExportCsv = async () => {
    if (!selectedExpId) return;
    setExportingCsv(true);
    try {
      const csvText = await experimentApi.exportCsv(selectedExpId);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${analytics?.experiment_name || 'experiment'}_data.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export CSV');
    } finally {
      setExportingCsv(false);
    }
  };

  const handleExportJson = async () => {
    if (!selectedExpId) return;
    setExportingJson(true);
    try {
      const jsonData = await experimentApi.exportJson(selectedExpId);
      const blob = new Blob([JSON.stringify(jsonData, null, 2)], {
        type: 'application/json',
      });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${analytics?.experiment_name || 'experiment'}_data.json`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    } catch (err) {
      alert('Failed to export JSON');
    } finally {
      setExportingJson(false);
    }
  };

  const histogramColors = ['#06b6d4', '#3b82f6', '#6366f1', '#8b5cf6', '#d946ef', '#f43f5e'];

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header and Experiment Selector */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Research Analytics & Data Export
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Evaluate high-resolution reaction times, condition differences, and export research datasets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="w-64">
            <Select
              value={selectedExpId}
              onChange={(val) => setSelectedExpId(val)}
              options={experiments.map((exp) => ({
                value: exp.id,
                label: `${exp.name} (${exp.status})`,
              }))}
            />
          </div>

          <button
            onClick={handleExportCsv}
            disabled={exportingCsv || !analytics}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cogni-panel border border-slate-700 hover:border-brand-500 text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-400" />
            {exportingCsv ? 'Exporting...' : 'Export CSV'}
          </button>

          <button
            onClick={handleExportJson}
            disabled={exportingJson || !analytics}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-cogni-panel border border-slate-700 hover:border-brand-500 text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <FileCode className="w-4 h-4 text-cyan-400" />
            {exportingJson ? 'Exporting...' : 'Export JSON'}
          </button>
        </div>
      </div>

      {loading || !analytics ? (
        <div className="p-12 text-center text-slate-400">Loading experimental analytics...</div>
      ) : (
        <>
          {/* Key Metric KPIs */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-[11px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                Total Participants
              </span>
              <div className="text-2xl font-extrabold text-slate-100 mt-1 flex items-baseline gap-2">
                {analytics.total_participants}
                <span className="text-xs font-normal text-slate-400">sessions</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-[11px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                Completion Rate
              </span>
              <div className="text-2xl font-extrabold text-emerald-400 mt-1 flex items-baseline gap-2">
                {analytics.completion_rate_percent}%
                <span className="text-xs font-normal text-slate-400">
                  ({analytics.completed_participants} completed)
                </span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-[11px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                Mean Reaction Time
              </span>
              <div className="text-2xl font-extrabold text-cogni-cyan mt-1 flex items-baseline gap-2">
                {analytics.overall_avg_rt}
                <span className="text-xs font-mono font-normal text-slate-400">ms</span>
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-[11px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                Overall Accuracy
              </span>
              <div className="text-2xl font-extrabold text-purple-400 mt-1 flex items-baseline gap-2">
                {analytics.overall_accuracy_percent}%
              </div>
            </div>

            <div className="glass-card p-5 rounded-2xl border border-slate-800">
              <span className="text-[11px] uppercase font-mono tracking-wider font-semibold text-slate-400">
                Timing Quality
              </span>
              <div className="text-sm font-semibold text-slate-200 mt-2 space-y-1">
                <div className="flex justify-between text-xs">
                  <span className="text-emerald-400">Good:</span>
                  <span>{analytics.timing_quality_breakdown['Good'] || 0}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-amber-400">Normal:</span>
                  <span>{analytics.timing_quality_breakdown['Normal'] || 0}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Visual Charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Chart 1: RT Distribution Histogram */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                    <Clock className="w-4 h-4 text-brand-400" /> Reaction Time Distribution
                  </h3>
                  <p className="text-xs text-slate-400">
                    Distribution of response latencies across participant trials (milliseconds)
                  </p>
                </div>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.rt_histogram} margin={{ top: 10, right: 10, left: -20, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis
                      dataKey="bucket"
                      stroke="#94a3b8"
                      fontSize={11}
                      interval={0}
                      angle={-20}
                      textAnchor="end"
                    />
                    <YAxis stroke="#94a3b8" fontSize={11} allowDecimals={false} />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131b2e',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                    />
                    <Bar dataKey="count" name="Trial Count" radius={[6, 6, 0, 0]}>
                      {analytics.rt_histogram.map((entry, index) => (
                        <Cell
                          key={`cell-${index}`}
                          fill={histogramColors[index % histogramColors.length]}
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Chart 2: Condition Comparison */}
            <div className="glass-panel p-6 rounded-2xl border border-slate-800 space-y-4">
              <div>
                <h3 className="text-base font-bold text-slate-100 flex items-center gap-2">
                  <Target className="w-4 h-4 text-emerald-400" /> Condition Comparison
                </h3>
                <p className="text-xs text-slate-400">
                  Mean reaction time across experimental conditions (e.g. Congruent vs Incongruent)
                </p>
              </div>

              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={analytics.condition_breakdown}
                    margin={{ top: 10, right: 10, left: -10, bottom: 20 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#1e293b" />
                    <XAxis dataKey="condition" stroke="#94a3b8" fontSize={12} />
                    <YAxis stroke="#94a3b8" fontSize={11} unit="ms" />
                    <Tooltip
                      contentStyle={{
                        backgroundColor: '#131b2e',
                        border: '1px solid #334155',
                        borderRadius: '12px',
                        color: '#f8fafc',
                        fontSize: '12px',
                      }}
                      formatter={(value: any, name: any) => [
                        `${value} ms`,
                        name === 'avg_reaction_time' ? 'Mean RT' : (name || ''),
                      ]}
                    />
                    <Bar
                      dataKey="avg_reaction_time"
                      name="Mean Reaction Time"
                      fill="#6366f1"
                      radius={[6, 6, 0, 0]}
                    />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>

          {/* Recent Participant Sessions Table */}
          <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
            <div className="p-5 border-b border-slate-800 flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-100">
                  Recent Participant Sessions
                </h3>
                <p className="text-xs text-slate-400">
                  Pseudonymous participant sessions and trial metrics
                </p>
              </div>
              <span className="text-xs font-mono text-slate-400">
                Showing latest {analytics.recent_sessions.length} sessions
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                  <tr>
                    <th className="py-3 px-4">Participant ID</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4">Trials Completed</th>
                    <th className="py-3 px-4">Mean RT</th>
                    <th className="py-3 px-4">Accuracy</th>
                    <th className="py-3 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800 text-slate-300">
                  {analytics.recent_sessions
                    .slice((sessionPage - 1) * sessionPageSize, sessionPage * sessionPageSize)
                    .map((s) => (
                      <tr key={s.session_id} className="hover:bg-slate-800/30 transition-colors">
                        <td className="py-3.5 px-4 font-mono font-semibold text-brand-300">
                          {s.participant_id}
                        </td>
                        <td className="py-3.5 px-4">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase ${
                              s.status === 'completed'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                                : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                            }`}
                          >
                            {s.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 font-mono">{s.trials_completed} trials</td>
                        <td className="py-3.5 px-4 font-mono font-semibold text-slate-100">
                          {s.avg_rt ? `${s.avg_rt} ms` : '—'}
                        </td>
                        <td className="py-3.5 px-4 font-mono">
                          {s.accuracy !== null && s.accuracy !== undefined ? `${s.accuracy}%` : '—'}
                        </td>
                        <td className="py-3.5 px-4 text-slate-400">
                          {new Date(s.started_at).toLocaleString()}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>

            {analytics.recent_sessions.length > sessionPageSize && (
              <Pagination
                currentPage={sessionPage}
                totalItems={analytics.recent_sessions.length}
                pageSize={sessionPageSize}
                onPageChange={setSessionPage}
                onPageSizeChange={setSessionPageSize}
                pageSizeOptions={[5, 10, 20, 50]}
              />
            )}
          </div>
        </>
      )}
    </div>
  );
};
