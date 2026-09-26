import React, { useState } from 'react';
import {
  Stethoscope,
  Sparkles,
  CheckCircle,
  Clock,
  Shield,
  HelpCircle,
  X,
  RefreshCw,
  EyeOff,
  CheckCheck,
} from 'lucide-react';

export interface DoctorFinding {
  id: string;
  category: 'Methodology' | 'Timing' | 'Privacy' | 'Participant Experience';
  severity: 'consideration' | 'recommendation' | 'caution';
  title: string;
  finding: string;
  explanation: string;
  suggestion: string;
  status: 'active' | 'dismissed' | 'addressed';
}

interface ExperimentDoctorPanelProps {
  isOpen: boolean;
  onClose: () => void;
  findings: DoctorFinding[];
  loading: boolean;
  onRefresh: () => void;
}

export const ExperimentDoctorPanel: React.FC<ExperimentDoctorPanelProps> = ({
  isOpen,
  onClose,
  findings: initialFindings,
  loading,
  onRefresh,
}) => {
  const [findingsState, setFindingsState] = useState<Record<string, 'active' | 'dismissed' | 'addressed'>>({});

  if (!isOpen) return null;

  const getStatus = (id: string, defaultStatus: string) => {
    return findingsState[id] || defaultStatus;
  };

  const handleUpdateStatus = (id: string, newStatus: 'active' | 'dismissed' | 'addressed') => {
    setFindingsState((prev) => ({ ...prev, [id]: newStatus }));
  };

  const activeFindings = initialFindings.filter(
    (f) => getStatus(f.id, f.status) !== 'dismissed'
  );

  return (
    <div className="fixed inset-y-0 right-0 w-full sm:w-[520px] bg-cogni-panel/95 backdrop-blur-xl border-l border-slate-800 shadow-2xl z-50 flex flex-col animate-slide-left">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Stethoscope className="w-4 h-4" />
          </div>
          <div>
            <h3 className="text-sm font-bold text-slate-100 flex items-center gap-1.5">
              Experiment Doctor
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-purple-500/20 text-purple-300 font-mono font-semibold">
                AI Research Advisor
              </span>
            </h3>
            <p className="text-[11px] text-slate-400">Methodological, timing & ethics review</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={onRefresh}
            disabled={loading}
            title="Re-run Experiment Doctor analysis"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin text-purple-400' : ''}`} />
          </button>
          <button
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800 rounded-lg transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Ethics & Advisory Notice */}
      <div className="p-3.5 bg-purple-950/20 border-b border-purple-500/20 text-[11px] text-purple-200/90 leading-relaxed flex items-start gap-2.5">
        <Shield className="w-4 h-4 text-purple-400 shrink-0 mt-0.5" />
        <p>
          <strong>Consultative Research Intelligence:</strong> The Experiment Doctor provides advisory design considerations. It does not provide official IRB, ethical, or legal certification.
        </p>
      </div>

      {/* Findings List */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {loading ? (
          <div className="py-16 text-center text-slate-400 text-xs">
            <div className="w-7 h-7 border-2 border-purple-400 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
            Analyzing trial distributions, timing constraints & privacy granularity...
          </div>
        ) : activeFindings.length === 0 ? (
          <div className="py-16 text-center text-slate-400 space-y-3">
            <CheckCircle className="w-10 h-10 text-emerald-400 mx-auto" />
            <h4 className="text-sm font-bold text-slate-200">All Design Considerations Reviewed</h4>
            <p className="text-xs text-slate-400 max-w-sm mx-auto">
              No outstanding methodological or timing concerns require attention.
            </p>
          </div>
        ) : (
          activeFindings.map((finding) => {
            const currentStatus = getStatus(finding.id, finding.status);
            const isAddressed = currentStatus === 'addressed';

            return (
              <div
                key={finding.id}
                className={`p-4 rounded-xl border bg-cogni-card transition-all ${
                  isAddressed
                    ? 'border-emerald-500/30 opacity-70 bg-emerald-950/10'
                    : finding.severity === 'caution'
                    ? 'border-amber-500/30 shadow-sm'
                    : 'border-slate-800'
                }`}
              >
                {/* Header Badge */}
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="flex items-center gap-2">
                    <span
                      className={`text-[10px] font-mono font-semibold uppercase px-2 py-0.5 rounded border ${
                        finding.category === 'Methodology'
                          ? 'bg-blue-500/10 text-blue-400 border-blue-500/30'
                          : finding.category === 'Timing'
                          ? 'bg-cyan-500/10 text-cyan-400 border-cyan-500/30'
                          : finding.category === 'Privacy'
                          ? 'bg-purple-500/10 text-purple-400 border-purple-500/30'
                          : 'bg-amber-500/10 text-amber-400 border-amber-500/30'
                      }`}
                    >
                      {finding.category}
                    </span>
                    <span className="text-[10px] text-slate-400 uppercase tracking-wider font-semibold">
                      {finding.severity}
                    </span>
                  </div>

                  {isAddressed && (
                    <span className="text-[10px] font-semibold text-emerald-400 flex items-center gap-1">
                      <CheckCheck className="w-3.5 h-3.5" /> Addressed
                    </span>
                  )}
                </div>

                <h4 className="text-xs font-bold text-slate-100">{finding.title}</h4>
                <p className="text-xs text-slate-300 mt-1 leading-relaxed">{finding.finding}</p>

                {/* Explanation */}
                <div className="mt-3 p-2.5 rounded-lg bg-slate-900/60 border border-slate-800/80 text-[11px] text-slate-400 leading-relaxed">
                  <strong className="text-slate-300 block mb-0.5">Methodological Context:</strong>
                  {finding.explanation}
                </div>

                {/* Suggestion */}
                <div className="mt-2.5 p-2.5 rounded-lg bg-brand-500/10 border border-brand-500/20 text-[11px] text-brand-200 leading-relaxed">
                  <strong className="text-brand-300 block mb-0.5">Suggested Consideration:</strong>
                  {finding.suggestion}
                </div>

                {/* Action buttons */}
                <div className="mt-3 pt-2.5 border-t border-slate-800 flex items-center justify-end gap-2">
                  <button
                    onClick={() => handleUpdateStatus(finding.id, 'dismissed')}
                    className="px-2.5 py-1 text-[11px] text-slate-400 hover:text-slate-200 rounded hover:bg-slate-800 transition-colors flex items-center gap-1"
                  >
                    <EyeOff className="w-3 h-3" /> Dismiss
                  </button>

                  <button
                    onClick={() =>
                      handleUpdateStatus(
                        finding.id,
                        isAddressed ? 'active' : 'addressed'
                      )
                    }
                    className={`px-3 py-1 text-[11px] font-semibold rounded-lg transition-colors flex items-center gap-1 ${
                      isAddressed
                        ? 'bg-slate-800 text-slate-300 hover:bg-slate-700'
                        : 'bg-emerald-600/20 text-emerald-300 border border-emerald-500/30 hover:bg-emerald-600/30'
                    }`}
                  >
                    <CheckCheck className="w-3 h-3" />
                    {isAddressed ? 'Reopen' : 'Mark Addressed'}
                  </button>
                </div>
              </div>
            );
          })
        )}
      </div>

      {/* Footer */}
      <div className="p-4 border-t border-slate-800 bg-cogni-panel flex items-center justify-between">
        <span className="text-[11px] text-slate-400">
          {activeFindings.length} active design {activeFindings.length === 1 ? 'consideration' : 'considerations'}
        </span>
        <button
          onClick={onClose}
          className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl transition-colors"
        >
          Done
        </button>
      </div>
    </div>
  );
};
