import React from 'react';
import { Modal } from '../../components/Modal';
import { ValidationReport } from '../../types/experiment';
import { AlertCircle, AlertTriangle, CheckCircle2, ShieldAlert } from 'lucide-react';

interface ValidationModalProps {
  isOpen: boolean;
  onClose: () => void;
  report: ValidationReport | null;
  onPublishClick?: () => void;
}

export const ValidationModal: React.FC<ValidationModalProps> = ({
  isOpen,
  onClose,
  report,
  onPublishClick,
}) => {
  if (!report) return null;

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Experiment Validation Report" maxWidth="max-w-xl">
      <div className="space-y-6">
        {/* Status Banner */}
        <div
          className={`p-4 rounded-xl border flex items-start gap-3.5 ${
            report.can_publish
              ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-300'
              : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {report.can_publish ? (
            <CheckCircle2 className="w-5 h-5 text-emerald-400 mt-0.5" />
          ) : (
            <ShieldAlert className="w-5 h-5 text-rose-400 mt-0.5" />
          )}
          <div>
            <h4 className="font-bold text-sm">
              {report.can_publish ? 'Experiment Ready for Publishing' : 'Validation Errors Detected'}
            </h4>
            <p className="text-xs opacity-90 mt-0.5">
              {report.can_publish
                ? 'All nodes, timing sequences, and response mechanisms passed structural and scientific logic checks.'
                : 'Please resolve the critical errors below before publishing this experiment version to participants.'}
            </p>
          </div>
        </div>

        {/* Errors list */}
        {report.errors.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-rose-400 flex items-center gap-1.5">
              <AlertCircle className="w-4 h-4" /> Errors ({report.errors.length})
            </h5>
            <div className="space-y-2">
              {report.errors.map((err, i) => (
                <div
                  key={i}
                  className="p-3 bg-cogni-card border border-rose-500/30 rounded-xl text-xs text-rose-200"
                >
                  <p className="font-medium">{err.message}</p>
                  {err.node_id && (
                    <span className="text-[10px] text-slate-400 font-mono mt-1 block">
                      Node ID: {err.node_id}
                    </span>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Warnings list */}
        {report.warnings.length > 0 && (
          <div className="space-y-2">
            <h5 className="text-xs font-semibold uppercase tracking-wider text-amber-400 flex items-center gap-1.5">
              <AlertTriangle className="w-4 h-4" /> Recommendations & Warnings ({report.warnings.length})
            </h5>
            <div className="space-y-2">
              {report.warnings.map((warn, i) => (
                <div
                  key={i}
                  className="p-3 bg-cogni-card border border-amber-500/30 rounded-xl text-xs text-amber-200"
                >
                  <p>{warn.message}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Action footer */}
        <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
          >
            Close
          </button>
          {report.can_publish && onPublishClick && (
            <button
              onClick={() => {
                onClose();
                onPublishClick();
              }}
              className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
            >
              Publish Now
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
};
