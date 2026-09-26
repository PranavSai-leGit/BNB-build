import React, { useState, useEffect } from 'react';
import { analyticsApi } from '../../api/analyticsApi';
import { AuditLog } from '../../types/analytics';
import { ShieldCheck, Clock, FileText, Database, ArrowUpDown } from 'lucide-react';

export const AuditTrailPage: React.FC = () => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    analyticsApi
      .getAuditLogs()
      .then((data) => {
        setLogs(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load audit logs:', err);
        setLoading(false);
      });
  }, []);

  const getActionBadge = (action: string) => {
    switch (action) {
      case 'EXPERIMENT_PUBLISHED':
        return 'bg-emerald-500/10 text-emerald-400 border-emerald-500/30';
      case 'DATA_EXPORT':
      case 'DATA_EXPORTED':
        return 'bg-blue-500/10 text-blue-400 border-blue-500/30';
      case 'EXPERIMENT_CREATED':
      case 'EXPERIMENT_VERSION_SAVED':
        return 'bg-brand-500/10 text-brand-300 border-brand-500/30';
      case 'CONSENT_CONFIG_CHANGED':
        return 'bg-purple-500/10 text-purple-300 border-purple-500/30';
      case 'PARTICIPANT_WITHDRAWAL':
        return 'bg-amber-500/10 text-amber-400 border-amber-500/30';
      case 'EXPERIMENT_DELETED':
        return 'bg-rose-500/10 text-rose-400 border-rose-500/30';
      default:
        return 'bg-slate-800 text-slate-300 border-slate-700';
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6 animate-fade-in">
      <div className="flex items-center justify-between">
        <div>
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-purple-500/10 text-purple-300 border border-purple-500/20 text-xs font-semibold uppercase font-mono tracking-wider mb-2">
            <ShieldCheck className="w-3.5 h-3.5" /> Immutable Security Logs
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Research & Compliance Audit Trail
          </h1>
          <p className="text-sm text-slate-400 mt-1 max-w-2xl">
            Complete cryptographic audit log recording experiment creation, version publication,
            consent modifications, and research data exports.
          </p>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-slate-800 overflow-hidden">
        {loading ? (
          <div className="p-12 text-center text-slate-400">Loading audit trail records...</div>
        ) : logs.length === 0 ? (
          <div className="p-12 text-center text-slate-400">No audit records found.</div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/60 text-slate-400 uppercase font-mono tracking-wider text-[10px]">
                <tr>
                  <th className="py-3 px-4">Action</th>
                  <th className="py-3 px-4">Actor</th>
                  <th className="py-3 px-4">Experiment ID</th>
                  <th className="py-3 px-4">Metadata</th>
                  <th className="py-3 px-4">Timestamp (UTC)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800 text-slate-300">
                {logs.map((log) => (
                  <tr key={log.id} className="hover:bg-slate-800/30 transition-colors">
                    <td className="py-3.5 px-4">
                      <span
                        className={`inline-block px-2.5 py-0.5 rounded-full font-mono text-[10px] font-semibold border ${getActionBadge(
                          log.action
                        )}`}
                      >
                        {log.action}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 font-medium text-slate-200">
                      {log.actor_email || log.actor_id || 'SYSTEM'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {log.experiment_id || '—'}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                      {JSON.stringify(log.metadata_json)}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-slate-400">
                      {new Date(log.timestamp).toUTCString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
