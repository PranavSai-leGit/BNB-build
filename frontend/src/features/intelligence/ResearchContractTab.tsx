import React, { useState, useEffect } from 'react';
import {
  FileCode2,
  HelpCircle,
  Lightbulb,
  CheckCircle2,
  AlertTriangle,
  Info,
  Plus,
  Trash2,
  Save,
  RefreshCw,
  Sliders,
  Sparkles,
  ArrowRight,
  Target,
  FlaskConical,
  Activity,
  Layers,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';

interface ResearchContractProps {
  experimentId: string;
  versionNumber: number;
}

export const ResearchContractTab: React.FC<ResearchContractProps> = ({
  experimentId,
  versionNumber,
}) => {
  const [contract, setContract] = useState<any>(null);
  const [alignment, setAlignment] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [activeTab, setActiveTab] = useState<'design' | 'alignment'>('design');

  const fetchContract = async () => {
    setLoading(true);
    try {
      const data = await experimentApi.getContract(experimentId);
      setContract(data.contract);
      setAlignment(data.alignment);
    } catch (err) {
      console.error('Failed to load contract:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchContract();
  }, [experimentId, versionNumber]);

  const handleSave = async () => {
    if (!contract) return;
    setSaving(true);
    try {
      const res = await experimentApi.saveContract(experimentId, contract);
      setContract(res.contract);
      setAlignment(res.alignment);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch (err: any) {
      alert(`Failed to save research contract: ${err.message || err}`);
    } finally {
      setSaving(false);
    }
  };

  // Add/remove IVs and DVs
  const addIndependentVariable = () => {
    const newIv = {
      id: `iv_${Date.now()}`,
      name: 'New Independent Variable',
      type: 'within_subject',
      description: '',
      conditions: [
        { id: `cond_a_${Date.now()}`, name: 'Condition A', description: '', expected_trial_count: 5 },
        { id: `cond_b_${Date.now()}`, name: 'Condition B', description: '', expected_trial_count: 5 },
      ],
    };
    setContract({
      ...contract,
      independent_variables: [...(contract.independent_variables || []), newIv],
    });
  };

  const removeIndependentVariable = (ivIndex: number) => {
    const updated = [...contract.independent_variables];
    updated.splice(ivIndex, 1);
    setContract({ ...contract, independent_variables: updated });
  };

  const addConditionToIv = (ivIndex: number) => {
    const updated = [...contract.independent_variables];
    const newCond = {
      id: `cond_${Date.now()}`,
      name: `Condition ${String.fromCharCode(65 + updated[ivIndex].conditions.length)}`,
      description: '',
      expected_trial_count: 5,
    };
    updated[ivIndex].conditions = [...(updated[ivIndex].conditions || []), newCond];
    setContract({ ...contract, independent_variables: updated });
  };

  const removeConditionFromIv = (ivIndex: number, condIndex: number) => {
    const updated = [...contract.independent_variables];
    updated[ivIndex].conditions.splice(condIndex, 1);
    setContract({ ...contract, independent_variables: updated });
  };

  const addDependentVariable = () => {
    const newDv = {
      id: `dv_${Date.now()}`,
      name: 'Reaction Time',
      measurement_type: 'reaction_time',
      unit: 'ms',
      role: 'primary',
      required_measurement: 'reaction_time_ms',
      description: 'Response latency in milliseconds from stimulus onset to keypress.',
    };
    setContract({
      ...contract,
      dependent_variables: [...(contract.dependent_variables || []), newDv],
    });
  };

  const removeDependentVariable = (dvIndex: number) => {
    const updated = [...contract.dependent_variables];
    updated.splice(dvIndex, 1);
    setContract({ ...contract, dependent_variables: updated });
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-400 mr-3" />
        Loading Research Contract...
      </div>
    );
  }

  const warningsCount = alignment?.summary?.warnings || 0;
  const errorsCount = alignment?.summary?.errors || 0;

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-brand-500/10 border border-brand-500/20 flex items-center justify-center text-brand-400">
              <FileCode2 className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-slate-100 flex items-center gap-2">
                Research Contract
                <span className="text-xs px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono">
                  v{contract?.version || '1.0'}
                </span>
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                Defines study design linkage: Research Question → Hypothesis → Variables → Conditions → Measurement.
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          {/* Sub-tab switcher */}
          <div className="flex items-center bg-slate-900 border border-slate-800 rounded-xl p-0.5">
            <button
              onClick={() => setActiveTab('design')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'design'
                  ? 'bg-cogni-card text-brand-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Study Design
            </button>
            <button
              onClick={() => setActiveTab('alignment')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
                activeTab === 'alignment'
                  ? 'bg-cogni-card text-cyan-300 shadow'
                  : 'text-slate-400 hover:text-slate-200'
              }`}
            >
              Alignment Diagnostics
              {warningsCount > 0 && (
                <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-amber-500/20 text-amber-300 border border-amber-500/30">
                  {warningsCount}
                </span>
              )}
            </button>
          </div>

          <button
            onClick={handleSave}
            disabled={saving}
            className="flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl transition-all shadow-lg shadow-brand-600/20 disabled:opacity-50"
          >
            {saving ? (
              <RefreshCw className="w-3.5 h-3.5 animate-spin" />
            ) : saveSuccess ? (
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
            ) : (
              <Save className="w-3.5 h-3.5" />
            )}
            {saveSuccess ? 'Contract Saved!' : 'Save Contract'}
          </button>
        </div>
      </div>

      {/* Alignment summary bar */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="p-4 flex items-center justify-between">
          <div>
            <div className="text-xs text-slate-400">Alignment Status</div>
            <div className="text-sm font-bold mt-1 flex items-center gap-1.5">
              {errorsCount === 0 && warningsCount === 0 ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                  <span className="text-emerald-400">Fully Aligned</span>
                </>
              ) : (
                <>
                  <AlertTriangle className="w-4 h-4 text-amber-400" />
                  <span className="text-amber-400">Review Recommended</span>
                </>
              )}
            </div>
          </div>
          <div className="text-2xl font-mono font-bold text-slate-300">
            {alignment?.summary?.coverage_pct ?? 100}%
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Independent Variables</div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-1">
            {contract?.independent_variables?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {contract?.independent_variables?.reduce(
              (acc: number, iv: any) => acc + (iv.conditions?.length || 0),
              0
            ) || 0}{' '}
            Total Conditions
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Dependent Variables</div>
          <div className="text-xl font-mono font-bold text-slate-100 mt-1">
            {contract?.dependent_variables?.length || 0}
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            {contract?.dependent_variables?.filter((d: any) => d.role === 'primary').length || 0}{' '}
            Primary Outcomes
          </div>
        </Card>

        <Card className="p-4">
          <div className="text-xs text-slate-400">Contract Linkage</div>
          <div className="text-xs font-semibold text-brand-300 mt-1 flex items-center gap-1">
            <Sparkles className="w-3.5 h-3.5 text-brand-400" /> Research Passport
          </div>
          <div className="text-[11px] text-slate-500 mt-0.5">
            Version locked to Experiment v{versionNumber}
          </div>
        </Card>
      </div>

      {activeTab === 'design' ? (
        <div className="space-y-6">
          {/* Research Question & Hypothesis */}
          <Card className="p-5 space-y-4">
            <div className="flex items-center gap-2 border-b border-slate-800 pb-3">
              <Target className="w-4 h-4 text-brand-400" />
              <h3 className="text-sm font-bold text-slate-200">
                Scientific Question & Operational Hypothesis
              </h3>
            </div>

            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Primary Research Question
                </label>
                <textarea
                  rows={2}
                  value={contract?.research_question || ''}
                  onChange={(e) =>
                    setContract({ ...contract, research_question: e.target.value })
                  }
                  placeholder="e.g. Does semantic interference modulate behavioral response latency and accuracy in perceptual decision-making?"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">
                  Operational Hypothesis
                </label>
                <textarea
                  rows={2}
                  value={contract?.hypothesis || ''}
                  onChange={(e) =>
                    setContract({ ...contract, hypothesis: e.target.value })
                  }
                  placeholder="e.g. Participants will exhibit significantly slower reaction times and higher error rates under conflicting or incongruent conditions."
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-xl text-xs text-slate-100 focus:outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500 transition-colors"
                />
              </div>
            </div>
          </Card>

          {/* Independent Variables & Conditions */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FlaskConical className="w-4 h-4 text-cyan-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  Independent Variables & Experimental Conditions
                </h3>
              </div>
              <button
                onClick={addIndependentVariable}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-cyan-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Variable
              </button>
            </div>

            {contract?.independent_variables?.map((iv: any, ivIdx: number) => (
              <Card key={iv.id || ivIdx} className="p-4 space-y-4">
                <div className="flex items-start justify-between gap-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-3 flex-1">
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                        Variable Name
                      </label>
                      <input
                        type="text"
                        value={iv.name}
                        onChange={(e) => {
                          const updated = [...contract.independent_variables];
                          updated[ivIdx].name = e.target.value;
                          setContract({ ...contract, independent_variables: updated });
                        }}
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                        Design Type
                      </label>
                      <Select
                        value={iv.type || 'within_subject'}
                        onChange={(val) => {
                          const updated = [...contract.independent_variables];
                          updated[ivIdx].type = val;
                          setContract({ ...contract, independent_variables: updated });
                        }}
                        options={[
                          { value: 'within_subject', label: 'Within-Subject' },
                          { value: 'between_subject', label: 'Between-Subject' },
                          { value: 'mixed', label: 'Mixed Design' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-slate-400 mb-1 font-medium">
                        Description / Manipulation
                      </label>
                      <input
                        type="text"
                        value={iv.description || ''}
                        onChange={(e) => {
                          const updated = [...contract.independent_variables];
                          updated[ivIdx].description = e.target.value;
                          setContract({ ...contract, independent_variables: updated });
                        }}
                        placeholder="e.g. Manipulation of perceptual congruence"
                        className="w-full px-3 py-1.5 bg-slate-900 border border-slate-700 rounded-lg text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <button
                    onClick={() => removeIndependentVariable(ivIdx)}
                    className="p-1.5 text-slate-500 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {/* Conditions Table */}
                <div className="pt-2 border-t border-slate-800/80">
                  <div className="flex items-center justify-between mb-2">
                    <span className="text-xs font-semibold text-slate-300">
                      Conditions ({iv.conditions?.length || 0})
                    </span>
                    <button
                      onClick={() => addConditionToIv(ivIdx)}
                      className="text-[11px] text-brand-400 hover:text-brand-300 flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add Condition
                    </button>
                  </div>

                  <div className="space-y-2">
                    {iv.conditions?.map((cond: any, cIdx: number) => (
                      <div
                        key={cond.id || cIdx}
                        className="flex items-center gap-3 bg-slate-900/60 p-2.5 rounded-lg border border-slate-800 text-xs"
                      >
                        <div className="w-1/3">
                          <input
                            type="text"
                            value={cond.name}
                            onChange={(e) => {
                              const updated = [...contract.independent_variables];
                              updated[ivIdx].conditions[cIdx].name = e.target.value;
                              setContract({ ...contract, independent_variables: updated });
                            }}
                            placeholder="Condition label (e.g. congruent)"
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-100"
                          />
                        </div>
                        <div className="flex-1">
                          <input
                            type="text"
                            value={cond.description || ''}
                            onChange={(e) => {
                              const updated = [...contract.independent_variables];
                              updated[ivIdx].conditions[cIdx].description = e.target.value;
                              setContract({ ...contract, independent_variables: updated });
                            }}
                            placeholder="Condition specification"
                            className="w-full px-2.5 py-1 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-300"
                          />
                        </div>
                        <div className="w-24">
                          <input
                            type="number"
                            value={cond.expected_trial_count ?? 5}
                            onChange={(e) => {
                              const updated = [...contract.independent_variables];
                              updated[ivIdx].conditions[cIdx].expected_trial_count = Number(e.target.value);
                              setContract({ ...contract, independent_variables: updated });
                            }}
                            title="Expected trial count"
                            placeholder="Trials"
                            className="w-full px-2 py-1 bg-slate-950 border border-slate-700 rounded-md text-xs text-slate-300 text-right"
                          />
                        </div>
                        <button
                          onClick={() => removeConditionFromIv(ivIdx, cIdx)}
                          className="text-slate-500 hover:text-rose-400 p-1 rounded"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              </Card>
            ))}
          </div>

          {/* Dependent Variables & Measurements */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity className="w-4 h-4 text-emerald-400" />
                <h3 className="text-sm font-bold text-slate-200">
                  Dependent Variables & Measurement Specifications
                </h3>
              </div>
              <button
                onClick={addDependentVariable}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-emerald-300 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" /> Add Outcome DV
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {contract?.dependent_variables?.map((dv: any, dvIdx: number) => (
                <Card key={dv.id || dvIdx} className="p-4 space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span
                        className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase tracking-wider ${
                          dv.role === 'primary'
                            ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                            : 'bg-slate-800 text-slate-400'
                        }`}
                      >
                        {dv.role} outcome
                      </span>
                      <span className="text-xs font-semibold text-slate-200">{dv.name}</span>
                    </div>
                    <button
                      onClick={() => removeDependentVariable(dvIdx)}
                      className="p-1 text-slate-500 hover:text-rose-400 rounded"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Variable Name</label>
                      <input
                        type="text"
                        value={dv.name}
                        onChange={(e) => {
                          const updated = [...contract.dependent_variables];
                          updated[dvIdx].name = e.target.value;
                          setContract({ ...contract, dependent_variables: updated });
                        }}
                        className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-100"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Outcome Role</label>
                      <Select
                        value={dv.role || 'primary'}
                        onChange={(val) => {
                          const updated = [...contract.dependent_variables];
                          updated[dvIdx].role = val;
                          setContract({ ...contract, dependent_variables: updated });
                        }}
                        options={[
                          { value: 'primary', label: 'Primary Outcome' },
                          { value: 'secondary', label: 'Secondary Outcome' },
                          { value: 'exploratory', label: 'Exploratory' },
                        ]}
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Measurement Type</label>
                      <Select
                        value={dv.measurement_type || 'reaction_time'}
                        onChange={(val) => {
                          const updated = [...contract.dependent_variables];
                          updated[dvIdx].measurement_type = val;
                          if (val === 'reaction_time') {
                            updated[dvIdx].unit = 'ms';
                            updated[dvIdx].required_measurement = 'reaction_time_ms';
                          } else if (val === 'accuracy') {
                            updated[dvIdx].unit = 'boolean';
                            updated[dvIdx].required_measurement = 'is_correct';
                          }
                          setContract({ ...contract, dependent_variables: updated });
                        }}
                        options={[
                          { value: 'reaction_time', label: 'Reaction Time (Latency)' },
                          { value: 'accuracy', label: 'Accuracy (Binary/Correctness)' },
                          { value: 'rating', label: 'Likert / Rating Scale' },
                          { value: 'text', label: 'Free Text / Transcription' },
                        ]}
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] text-slate-400 mb-1">Unit</label>
                      <input
                        type="text"
                        value={dv.unit || ''}
                        onChange={(e) => {
                          const updated = [...contract.dependent_variables];
                          updated[dvIdx].unit = e.target.value;
                          setContract({ ...contract, dependent_variables: updated });
                        }}
                        placeholder="e.g. ms, boolean"
                        className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-100"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[10px] text-slate-400 mb-1">Description</label>
                    <input
                      type="text"
                      value={dv.description || ''}
                      onChange={(e) => {
                        const updated = [...contract.dependent_variables];
                        updated[dvIdx].description = e.target.value;
                        setContract({ ...contract, dependent_variables: updated });
                      }}
                      className="w-full px-2.5 py-1 bg-slate-900 border border-slate-700 rounded-md text-xs text-slate-300"
                    />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        </div>
      ) : (
        /* Alignment Diagnostics View */
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-cyan-400" />
              Contract Alignment & Verification Findings
            </h3>
            <span className="text-xs text-slate-400">
              Evaluated against Experiment Graph Version {versionNumber}
            </span>
          </div>

          {alignment?.mismatches?.length === 0 ? (
            <Card className="p-8 text-center space-y-3">
              <div className="w-12 h-12 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 flex items-center justify-center mx-auto">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <h4 className="text-base font-bold text-slate-200">
                Complete Structural & Measurement Alignment
              </h4>
              <p className="text-xs text-slate-400 max-w-lg mx-auto">
                All declared independent variables, experimental conditions, and primary dependent variable
                measurements are fully instantiated in your trial nodes and response collectors.
              </p>
            </Card>
          ) : (
            <div className="space-y-3">
              {alignment?.mismatches?.map((mismatch: any, idx: number) => {
                const isError = mismatch.severity === 'error';
                const isWarn = mismatch.severity === 'warning';
                return (
                  <Card
                    key={mismatch.id || idx}
                    className={`p-4 border-l-4 transition-all ${
                      isError
                        ? 'border-l-rose-500 bg-rose-500/5'
                        : isWarn
                        ? 'border-l-amber-500 bg-amber-500/5'
                        : 'border-l-cyan-500 bg-cyan-500/5'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-start gap-3">
                        {isError ? (
                          <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
                        ) : isWarn ? (
                          <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
                        ) : (
                          <Info className="w-5 h-5 text-cyan-400 shrink-0 mt-0.5" />
                        )}
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-xs font-bold text-slate-200">
                              {mismatch.title}
                            </span>
                            <span
                              className={`text-[9px] px-1.5 py-0.5 rounded font-bold uppercase tracking-wider ${
                                isError
                                  ? 'bg-rose-500/20 text-rose-300'
                                  : isWarn
                                  ? 'bg-amber-500/20 text-amber-300'
                                  : 'bg-cyan-500/20 text-cyan-300'
                              }`}
                            >
                              {mismatch.category || mismatch.severity}
                            </span>
                          </div>
                          <p className="text-xs text-slate-300 mt-1 leading-relaxed">
                            {mismatch.message}
                          </p>
                          {mismatch.recommendation && (
                            <div className="mt-2 text-[11px] text-slate-400 flex items-center gap-1.5 bg-slate-900/60 px-2.5 py-1.5 rounded-lg border border-slate-800">
                              <Lightbulb className="w-3.5 h-3.5 text-amber-400 shrink-0" />
                              <span>{mismatch.recommendation}</span>
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
      )}
    </div>
  );
};
