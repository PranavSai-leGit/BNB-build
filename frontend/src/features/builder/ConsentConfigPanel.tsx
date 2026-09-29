import React, { useState } from 'react';
import { Modal } from '../../components/Modal';
import { ConsentConfig, ParticipantField } from '../../types/experiment';
import { Plus, Trash2, AlertTriangle, ShieldCheck } from 'lucide-react';
import { Select } from '../../components/Select';

interface ConsentConfigPanelProps {
  isOpen: boolean;
  onClose: () => void;
  consent: ConsentConfig;
  participantSchema: ParticipantField[];
  onSave: (updatedConsent: ConsentConfig, updatedSchema: ParticipantField[]) => void;
}

export const ConsentConfigPanel: React.FC<ConsentConfigPanelProps> = ({
  isOpen,
  onClose,
  consent,
  participantSchema,
  onSave,
}) => {
  const [activeTab, setActiveTab] = useState<'consent' | 'fields'>('consent');
  const [localConsent, setLocalConsent] = useState<ConsentConfig>(consent);
  const [localSchema, setLocalSchema] = useState<ParticipantField[]>(participantSchema);
  const [newFieldId, setNewFieldId] = useState('');
  const [newFieldLabel, setNewFieldLabel] = useState('');
  const [newFieldType, setNewFieldType] = useState<'text' | 'number' | 'select' | 'boolean'>('text');
  const [newFieldRequired, setNewFieldRequired] = useState(false);
  const [newFieldOptions, setNewFieldOptions] = useState('');

  // Check if sensitive field names are attempted
  const hasSensitiveField = localSchema.some((f) =>
    ['name', 'email', 'phone', 'ssn', 'address', 'ip'].some((s) =>
      f.id.toLowerCase().includes(s) || f.label.toLowerCase().includes(s)
    )
  );

  const handleAddField = () => {
    if (!newFieldId || !newFieldLabel) return;
    const field: ParticipantField = {
      id: newFieldId.toLowerCase().replace(/[^a-z0-9_]/g, '_'),
      label: newFieldLabel,
      type: newFieldType,
      required: newFieldRequired,
      options:
        newFieldType === 'select'
          ? newFieldOptions.split(',').map((s) => s.trim()).filter(Boolean)
          : undefined,
    };
    setLocalSchema([...localSchema, field]);
    setNewFieldId('');
    setNewFieldLabel('');
    setNewFieldOptions('');
  };

  const handleRemoveField = (index: number) => {
    setLocalSchema(localSchema.filter((_, i) => i !== index));
  };

  const handleSave = () => {
    onSave(localConsent, localSchema);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Consent Protocol & Participant Fields"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {/* Navigation Tabs */}
        <div className="flex border-b border-slate-700/60 pb-2 gap-4">
          <button
            onClick={() => setActiveTab('consent')}
            className={`pb-2 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'consent'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Informed Consent & Ethics
          </button>
          <button
            onClick={() => setActiveTab('fields')}
            className={`pb-2 text-sm font-semibold transition-all border-b-2 ${
              activeTab === 'fields'
                ? 'border-brand-500 text-brand-400'
                : 'border-transparent text-slate-400 hover:text-slate-200'
            }`}
          >
            Participant Demographic Fields ({localSchema.length})
          </button>
        </div>

        {/* Tab 1: Consent & IRB Configuration */}
        {activeTab === 'consent' && (
          <div className="space-y-4 text-xs">
            <div className="p-3 bg-brand-500/10 border border-brand-500/20 rounded-xl text-brand-300 flex items-start gap-2.5">
              <ShieldCheck className="w-4 h-4 mt-0.5" />
              <div>
                <strong className="font-semibold">Privacy-by-Design & Transparency:</strong>
                <p className="mt-0.5 text-slate-300">
                  Participants receive this information prior to entering the study. Pseudonymous IDs
                  are cryptographically assigned and separated from responses.
                </p>
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Study Title</label>
              <input
                type="text"
                value={localConsent.study_title}
                onChange={(e) => setLocalConsent({ ...localConsent, study_title: e.target.value })}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Estimated Duration (Minutes)
                </label>
                <input
                  type="number"
                  value={localConsent.duration_minutes}
                  onChange={(e) =>
                    setLocalConsent({ ...localConsent, duration_minutes: Number(e.target.value) })
                  }
                  className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 font-mono"
                />
              </div>
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Researcher / Lab Contact
                </label>
                <input
                  type="text"
                  value={localConsent.researcher_contact}
                  onChange={(e) =>
                    setLocalConsent({ ...localConsent, researcher_contact: e.target.value })
                  }
                  className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Research Purpose</label>
              <textarea
                rows={2}
                value={localConsent.purpose}
                onChange={(e) => setLocalConsent({ ...localConsent, purpose: e.target.value })}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Study Procedures</label>
              <textarea
                rows={2}
                value={localConsent.procedures}
                onChange={(e) => setLocalConsent({ ...localConsent, procedures: e.target.value })}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Data Retention & Pseudonymization Policy
              </label>
              <textarea
                rows={2}
                value={localConsent.data_retention_policy}
                onChange={(e) =>
                  setLocalConsent({ ...localConsent, data_retention_policy: e.target.value })
                }
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100"
              />
            </div>
          </div>
        )}

        {/* Tab 2: Dynamic Participant Fields */}
        {activeTab === 'fields' && (
          <div className="space-y-5 text-xs">
            {hasSensitiveField && (
              <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-rose-300 flex items-start gap-2.5">
                <AlertTriangle className="w-4 h-4 mt-0.5 text-rose-400" />
                <div>
                  <strong className="font-semibold">GDPR Data Minimization Warning:</strong>
                  <p className="mt-0.5 text-slate-300">
                    You have defined fields that may collect personally identifying information. In
                    accordance with privacy-by-design principles, avoid collecting names, emails, or
                    direct identifiers unless an institutional ethics review explicitly warrants it.
                  </p>
                </div>
              </div>
            )}

            {/* Existing Fields List */}
            <div className="space-y-2">
              <h5 className="font-bold text-slate-300 uppercase tracking-wider">
                Configured Participant Schema
              </h5>
              {localSchema.length === 0 ? (
                <p className="text-slate-400 italic">No participant fields configured.</p>
              ) : (
                localSchema.map((field, idx) => (
                  <div
                    key={field.id}
                    className="flex items-center justify-between p-3 bg-cogni-card border border-slate-700 rounded-xl"
                  >
                    <div>
                      <span className="font-bold text-slate-100">{field.label}</span>
                      <span className="ml-2 font-mono text-[10px] text-slate-400">({field.id})</span>
                      <span className="ml-2 px-1.5 py-0.5 rounded bg-slate-800 text-[10px] text-brand-300 font-mono">
                        {field.type}
                      </span>
                      {field.required && (
                        <span className="ml-2 text-rose-400 text-[10px] font-semibold">
                          Required
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleRemoveField(idx)}
                      className="text-slate-400 hover:text-rose-400 transition-colors p-1"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                ))
              )}
            </div>

            {/* Add New Field Box */}
            <div className="p-4 bg-cogni-panel border border-slate-700/80 rounded-xl space-y-3">
              <h5 className="font-bold text-slate-200">Add Custom Field</h5>
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Field ID (code name)</label>
                  <input
                    type="text"
                    value={newFieldId}
                    onChange={(e) => setNewFieldId(e.target.value)}
                    placeholder="e.g. sleep_hours, age"
                    className="w-full bg-cogni-card border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100 font-mono"
                  />
                </div>
                <div>
                  <label className="block text-slate-400 mb-1">Display Label</label>
                  <input
                    type="text"
                    value={newFieldLabel}
                    onChange={(e) => setNewFieldLabel(e.target.value)}
                    placeholder="e.g. Hours of sleep last night"
                    className="w-full bg-cogni-card border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-slate-400 mb-1">Type</label>
                  <Select
                    value={newFieldType}
                    onChange={(val) => setNewFieldType(val as any)}
                    options={[
                      { value: 'text', label: 'Text' },
                      { value: 'number', label: 'Number' },
                      { value: 'select', label: 'Dropdown Select' },
                      { value: 'boolean', label: 'Yes / No (Boolean)' },
                    ]}
                  />
                </div>
                <div className="flex items-center gap-2 pt-5">
                  <input
                    type="checkbox"
                    id="req_check"
                    checked={newFieldRequired}
                    onChange={(e) => setNewFieldRequired(e.target.checked)}
                    className="rounded bg-slate-800 border-slate-700 text-brand-500"
                  />
                  <label htmlFor="req_check" className="text-slate-300">
                    Mandatory / Required
                  </label>
                </div>
              </div>

              {newFieldType === 'select' && (
                <div>
                  <label className="block text-slate-400 mb-1">
                    Select Options (comma-separated)
                  </label>
                  <input
                    type="text"
                    value={newFieldOptions}
                    onChange={(e) => setNewFieldOptions(e.target.value)}
                    placeholder="Option 1, Option 2, Option 3"
                    className="w-full bg-cogni-card border border-slate-700 rounded-lg px-2.5 py-1.5 text-slate-100"
                  />
                </div>
              )}

              <button
                type="button"
                onClick={handleAddField}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-brand-600 hover:bg-brand-500 text-white rounded-lg font-medium transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Field
              </button>
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="px-5 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
          >
            Save Configuration
          </button>
        </div>
      </div>
    </Modal>
  );
};
