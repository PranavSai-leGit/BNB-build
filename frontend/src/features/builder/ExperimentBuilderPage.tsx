import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Save,
  Play,
  CheckCircle2,
  Share2,
  ListOrdered,
  Network,
  Sliders,
  Sparkles,
  ArrowLeft,
  AlertCircle,
  Clock,
  Layers,
  ExternalLink,
  ShieldCheck,
  Stethoscope,
  ShieldAlert,
  FileCheck2,
  LayoutDashboard,
  Settings as SettingsIcon,
  Eye,
  Shuffle,
  Users,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import {
  Experiment,
  ExperimentDefinition,
  ExperimentNode,
  ExperimentEdge,
} from '../../types/experiment';
import { ComponentLibrary } from './ComponentLibrary';
import { TimelineView } from './TimelineView';
import { FlowCanvasView } from './FlowCanvasView';
import { NodePropertiesPanel } from './NodePropertiesPanel';
import { PreviewModal } from './PreviewModal';
import { ConsentConfigPanel } from './ConsentConfigPanel';
import { ExperimentLinterPanel } from '../intelligence/ExperimentLinterPanel';
import { ExperimentDoctorPanel, DoctorFinding } from '../intelligence/ExperimentDoctorPanel';
import { DataQualityTab } from '../intelligence/DataQualityTab';
import { ResearchPassportTab } from '../intelligence/ResearchPassportTab';
import { Card } from '../../components/Card';

export const ExperimentBuilderPage: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [experiment, setExperiment] = useState<Experiment | null>(null);
  const [definition, setDefinition] = useState<ExperimentDefinition | null>(null);
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  // Top-level tabs: Overview | Builder | Preview | Data Quality | Research Passport | Settings
  const [activeTab, setActiveTab] = useState<'overview' | 'builder' | 'preview' | 'quality' | 'passport' | 'settings'>('builder');

  // Within Builder: Timeline vs Logic view
  const [builderSubView, setBuilderSubView] = useState<'timeline' | 'logic'>('timeline');

  // Linter state
  const [isLinterOpen, setIsLinterOpen] = useState(false);
  const [linterReport, setLinterReport] = useState<any>(null);
  const [linterLoading, setLinterLoading] = useState(false);

  // Doctor state
  const [isDoctorOpen, setIsDoctorOpen] = useState(false);
  const [doctorFindings, setDoctorFindings] = useState<DoctorFinding[]>([]);
  const [doctorLoading, setDoctorLoading] = useState(false);

  // Preview & Consent modals
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);
  const [isConsentOpen, setIsConsentOpen] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isPublishing, setIsPublishing] = useState(false);
  const [saveSuccessNotice, setSaveSuccessNotice] = useState(false);
  const [shareCopied, setShareCopied] = useState(false);

  const fetchExperiment = () => {
    if (!id) return;
    experimentApi
      .get(id)
      .then((exp) => {
        setExperiment(exp);
        if (exp.latest_version?.definition) {
          setDefinition(exp.latest_version.definition);
        }
      })
      .catch((err) => {
        console.error('Failed to load experiment:', err);
      });
  };

  useEffect(() => {
    fetchExperiment();
  }, [id]);

  if (!experiment || !definition) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mr-3" />
        Loading experiment workspace...
      </div>
    );
  }

  const selectedNode = definition.nodes.find((n) => n.id === selectedNodeId) || null;

  // Add component from library
  const handleAddComponent = (template: any) => {
    const newId = `${template.type}_${Date.now()}`;
    const newNode: ExperimentNode = {
      id: newId,
      type: template.type,
      label: template.label,
      props: { ...template.defaultProps },
      position: { x: 260, y: definition.nodes.length * 130 + 40 },
    };

    const updatedNodes = [...definition.nodes, newNode];
    let updatedEdges = [...definition.edges];

    // Connect automatically to previous node if available
    if (definition.nodes.length > 0) {
      const prevNode = definition.nodes[definition.nodes.length - 1];
      updatedEdges.push({
        id: `edge_${prevNode.id}_${newId}`,
        from: prevNode.id,
        to: newId,
        branch: 'default',
      });
    }

    setDefinition({
      ...definition,
      nodes: updatedNodes,
      edges: updatedEdges,
    });
    setSelectedNodeId(newId);
  };

  // Update selected node
  const handleUpdateNode = (updatedNode: ExperimentNode) => {
    const updatedNodes = definition.nodes.map((n) => (n.id === updatedNode.id ? updatedNode : n));
    setDefinition({ ...definition, nodes: updatedNodes });
  };

  // Delete node
  const handleDeleteNode = (nodeId: string) => {
    const updatedNodes = definition.nodes.filter((n) => n.id !== nodeId);
    const updatedEdges = definition.edges.filter(
      (e) => (e as any).from !== nodeId && (e as any).to !== nodeId && (e as any).from_node !== nodeId && (e as any).to_node !== nodeId
    );
    setDefinition({ ...definition, nodes: updatedNodes, edges: updatedEdges });
    if (selectedNodeId === nodeId) setSelectedNodeId(null);
  };

  // Duplicate node
  const handleDuplicateNode = (nodeId: string) => {
    const sourceNode = definition.nodes.find((n) => n.id === nodeId);
    if (!sourceNode) return;

    const newId = `${sourceNode.type}_${Date.now()}`;
    const newNode: ExperimentNode = {
      ...sourceNode,
      id: newId,
      label: `${sourceNode.label} (Copy)`,
      position: {
        x: (sourceNode.position?.x || 260) + 30,
        y: (sourceNode.position?.y || 100) + 30,
      },
    };

    setDefinition({
      ...definition,
      nodes: [...definition.nodes, newNode],
    });
    setSelectedNodeId(newId);
  };

  // Reorder nodes (from Timeline view)
  const handleReorderNodes = (reorderedNodes: ExperimentNode[]) => {
    const newEdges: ExperimentEdge[] = [];
    for (let i = 0; i < reorderedNodes.length - 1; i++) {
      newEdges.push({
        id: `e_${reorderedNodes[i].id}_${reorderedNodes[i + 1].id}`,
        from: reorderedNodes[i].id,
        to: reorderedNodes[i + 1].id,
        branch: 'default',
      });
    }
    setDefinition({
      ...definition,
      nodes: reorderedNodes,
      edges: newEdges,
    });
  };

  // Save draft version
  const handleSaveDraft = async () => {
    if (!experiment || !definition) return;
    setIsSaving(true);
    try {
      await experimentApi.saveVersion(experiment.id, definition, 'Updated draft design', false);
      setSaveSuccessNotice(true);
      setTimeout(() => setSaveSuccessNotice(false), 2500);
    } catch (err) {
      console.error('Save error:', err);
      alert('Failed to save experiment version');
    } finally {
      setIsSaving(false);
    }
  };

  // Run Deterministic Linter
  const handleRunLinter = async () => {
    if (!experiment) return;
    setLinterLoading(true);
    setIsLinterOpen(true);
    try {
      // Save draft first to validate latest state
      await experimentApi.saveVersion(experiment.id, definition, 'Pre-lint save', false);
      const rep = await experimentApi.lint(experiment.id);
      setLinterReport(rep);
    } catch (err) {
      console.error('Linter request error:', err);
    } finally {
      setLinterLoading(false);
    }
  };

  // Run Experiment Doctor
  const handleRunDoctor = async () => {
    if (!experiment) return;
    setDoctorLoading(true);
    setIsDoctorOpen(true);
    try {
      await experimentApi.saveVersion(experiment.id, definition, 'Pre-doctor review save', false);
      const res = await experimentApi.getDoctorReview(experiment.id);
      setDoctorFindings(res.findings || []);
    } catch (err) {
      console.error('Doctor review request error:', err);
    } finally {
      setDoctorLoading(false);
    }
  };

  // Select node from linter
  const handleSelectNodeFromLinter = (nodeId: string) => {
    setSelectedNodeId(nodeId);
    setActiveTab('builder');
  };

  // Publish experiment
  const handlePublish = async () => {
    if (!experiment) return;
    setIsPublishing(true);
    try {
      await handleSaveDraft();
      // Run linter check before publishing
      const lintRes = await experimentApi.lint(experiment.id);
      if (!lintRes.can_publish) {
        setLinterReport(lintRes);
        setIsLinterOpen(true);
        alert('Publication blocked: Please resolve all Linter Errors before publishing.');
        setIsPublishing(false);
        return;
      }

      const pubVer = await experimentApi.publish(experiment.id);
      setExperiment({
        ...experiment,
        status: 'published',
        current_version_number: pubVer.version_number,
      });
      alert(`Experiment v${pubVer.version_number} has been published successfully! The participant link is now live.`);
    } catch (err: any) {
      alert(`Publishing failed: ${err.message || err}`);
    } finally {
      setIsPublishing(false);
    }
  };

  const participantUrl = `${window.location.origin}/participate/${experiment.public_id}`;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(participantUrl);
    setShareCopied(true);
    setTimeout(() => setShareCopied(false), 2000);
  };

  return (
    <div className="flex flex-col h-[calc(100vh-64px)] overflow-hidden bg-cogni-dark">
      {/* Top Navigation & Workspace Header */}
      <div className="h-14 border-b border-slate-800 bg-cogni-panel/90 backdrop-blur-md px-4 flex items-center justify-between z-10">
        <div className="flex items-center gap-3">
          <button
            onClick={() => navigate('/experiments')}
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-800/60 rounded-lg transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
          </button>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-sm font-bold text-slate-100 truncate max-w-[220px]">
                {definition.name}
              </h1>
              <span className="text-[10px] px-2 py-0.5 rounded-full bg-brand-500/20 text-brand-300 font-mono font-semibold">
                v{experiment.current_version_number}
              </span>
              <span
                className={`text-[10px] px-2 py-0.5 rounded-full font-semibold uppercase tracking-wider ${
                  experiment.status === 'published'
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                }`}
              >
                {experiment.status}
              </span>
            </div>
          </div>
        </div>

        {/* Primary Workflow Tabs: Overview | Builder | Preview | Data Quality | Research Passport | Settings */}
        <div className="flex items-center p-0.5 bg-slate-900 border border-slate-800 rounded-xl">
          <button
            onClick={() => setActiveTab('overview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'overview'
                ? 'bg-cogni-card text-brand-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LayoutDashboard className="w-3.5 h-3.5" /> Overview
          </button>

          <button
            onClick={() => setActiveTab('builder')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'builder'
                ? 'bg-cogni-card text-brand-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Network className="w-3.5 h-3.5" /> Builder
          </button>

          <button
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'preview'
                ? 'bg-cogni-card text-brand-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <Eye className="w-3.5 h-3.5" /> Preview
          </button>

          <button
            onClick={() => setActiveTab('quality')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'quality'
                ? 'bg-cogni-card text-cyan-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <ShieldAlert className="w-3.5 h-3.5 text-cyan-400" /> Data Quality
          </button>

          <button
            onClick={() => setActiveTab('passport')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'passport'
                ? 'bg-cogni-card text-brand-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <FileCheck2 className="w-3.5 h-3.5 text-brand-400" /> Research Passport
          </button>

          <button
            onClick={() => setActiveTab('settings')}
            className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              activeTab === 'settings'
                ? 'bg-cogni-card text-brand-300 shadow'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <SettingsIcon className="w-3.5 h-3.5" /> Settings
          </button>
        </div>

        {/* Global Action Controls */}
        <div className="flex items-center gap-2">
          {experiment.status === 'published' && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-cogni-card border border-slate-700 hover:border-brand-500/50 text-slate-200 text-xs font-semibold rounded-xl transition-all"
            >
              <Share2 className="w-3.5 h-3.5 text-brand-400" />
              {shareCopied ? 'Link Copied!' : 'Participant URL'}
            </button>
          )}

          <button
            onClick={handleSaveDraft}
            disabled={isSaving}
            className="flex items-center gap-1.5 px-3.5 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-100 text-xs font-semibold rounded-xl transition-all"
          >
            <Save className="w-3.5 h-3.5" />
            {isSaving ? 'Saving...' : saveSuccessNotice ? 'Saved!' : 'Save'}
          </button>

          <button
            onClick={handlePublish}
            disabled={isPublishing}
            className="flex items-center gap-1.5 px-4 py-1.5 bg-brand-600 hover:bg-brand-500 text-white text-xs font-bold rounded-xl shadow-lg shadow-brand-600/30 transition-all"
          >
            <Sparkles className="w-3.5 h-3.5" />
            {isPublishing ? 'Publishing...' : 'Publish'}
          </button>
        </div>
      </div>

      {/* Main Tab Content */}
      <div className="flex-1 overflow-hidden flex flex-col">
        {/* TAB 1: OVERVIEW */}
        {activeTab === 'overview' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-7xl mx-auto w-full space-y-8 animate-fade-in">
            {/* Welcome & Study Overview */}
            <div className="p-6 rounded-2xl bg-gradient-to-r from-cogni-panel via-slate-900 to-cogni-panel border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-6 shadow-xl">
              <div>
                <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-bold">
                  Study Workspace Overview
                </span>
                <h2 className="text-2xl font-black text-slate-100 tracking-tight mt-1">
                  {definition.name}
                </h2>
                <p className="text-xs text-slate-400 mt-1 max-w-2xl leading-relaxed">
                  {experiment.description || 'Behavioral experiment protocol configured with high-resolution stimulus presentation and pseudonymous participant data collection.'}
                </p>
              </div>

              <div className="flex items-center gap-3">
                <button
                  onClick={() => setActiveTab('builder')}
                  className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg transition-all"
                >
                  Open Builder Canvas
                </button>
                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="px-4 py-2.5 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl transition-all"
                >
                  Test Runtime Preview
                </button>
              </div>
            </div>

            {/* Study Readiness Scorecard */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <Card onClick={handleRunLinter} className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-mono font-semibold text-cyan-400">
                    Deterministic Linter
                  </span>
                  <CheckCircle2 className="w-4 h-4 text-cyan-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">
                  Protocol Verification
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Click to check structural & timing integrity
                </span>
              </Card>

              <Card onClick={handleRunDoctor} className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-mono font-semibold text-purple-400">
                    Experiment Doctor
                  </span>
                  <Stethoscope className="w-4 h-4 text-purple-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">
                  AI Research Review
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Methodology, fatigue & ethics suggestions
                </span>
              </Card>

              <Card onClick={() => setActiveTab('quality')} className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-mono font-semibold text-emerald-400">
                    Data Quality Engine
                  </span>
                  <ShieldAlert className="w-4 h-4 text-emerald-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">
                  Reliability Signals
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  Inspect participant session reliability
                </span>
              </Card>

              <Card onClick={() => setActiveTab('passport')} className="cursor-pointer">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] uppercase font-mono font-semibold text-brand-400">
                    Research Passport
                  </span>
                  <FileCheck2 className="w-4 h-4 text-brand-400" />
                </div>
                <div className="text-xl font-bold text-slate-100 mt-2">
                  Reproducibility Hash
                </div>
                <span className="text-[11px] text-slate-400 mt-1 block">
                  SHA-256 fingerprint & data dictionary
                </span>
              </Card>
            </div>
          </div>
        )}

        {/* TAB 2: BUILDER (Timeline vs Logic, Inspector, Library, Linter & Doctor Actions) */}
        {activeTab === 'builder' && (
          <div className="flex-1 flex flex-col overflow-hidden">
            {/* Builder Sub-Bar: [Timeline] [Logic] [Preview] [Validate] [Experiment Doctor] */}
            <div className="h-11 border-b border-slate-800 bg-slate-900/60 px-4 flex items-center justify-between">
              {/* Timeline vs Logic Canvas Switcher */}
              <div className="flex items-center p-0.5 bg-slate-950 border border-slate-800 rounded-lg">
                <button
                  onClick={() => setBuilderSubView('timeline')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                    builderSubView === 'timeline'
                      ? 'bg-cogni-card text-brand-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <ListOrdered className="w-3.5 h-3.5" /> Timeline View
                </button>
                <button
                  onClick={() => setBuilderSubView('logic')}
                  className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-all ${
                    builderSubView === 'logic'
                      ? 'bg-cogni-card text-brand-300 shadow-sm'
                      : 'text-slate-400 hover:text-slate-200'
                  }`}
                >
                  <Network className="w-3.5 h-3.5" /> Logic / Flow View
                </button>
              </div>

              {/* Research Intelligence Actions */}
              <div className="flex items-center gap-2">
                <button
                  onClick={handleRunDoctor}
                  className="flex items-center gap-1.5 px-3 py-1 bg-purple-950/30 border border-purple-500/30 hover:bg-purple-900/40 text-purple-300 text-xs font-semibold rounded-lg transition-all"
                >
                  <Stethoscope className="w-3.5 h-3.5 text-purple-400" />
                  Experiment Doctor
                </button>

                <button
                  onClick={handleRunLinter}
                  className="flex items-center gap-1.5 px-3 py-1 bg-cyan-950/30 border border-cyan-500/30 hover:bg-cyan-900/40 text-cyan-300 text-xs font-semibold rounded-lg transition-all"
                >
                  <CheckCircle2 className="w-3.5 h-3.5 text-cyan-400" />
                  Validate (Lint)
                </button>

                <button
                  onClick={() => setIsPreviewOpen(true)}
                  className="flex items-center gap-1.5 px-3 py-1 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-lg transition-all"
                >
                  <Play className="w-3.5 h-3.5 fill-current" />
                  Preview
                </button>
              </div>
            </div>

            {/* Builder Body: Component Library + Canvas/Timeline + Inspector */}
            <div className="flex-1 flex overflow-hidden">
              <ComponentLibrary onAddComponent={handleAddComponent} />

              <div className="flex-1 flex flex-col h-full overflow-hidden bg-cogni-dark relative">
                {builderSubView === 'timeline' ? (
                  <TimelineView
                    nodes={definition.nodes}
                    edges={definition.edges}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={(node) => setSelectedNodeId(node.id)}
                    onReorderNodes={handleReorderNodes}
                    onDeleteNode={handleDeleteNode}
                  />
                ) : (
                  <FlowCanvasView
                    nodes={definition.nodes}
                    edges={definition.edges}
                    selectedNodeId={selectedNodeId}
                    onSelectNode={(node) => setSelectedNodeId(node?.id || null)}
                    onUpdateNodes={(nodes) => setDefinition({ ...definition, nodes })}
                    onUpdateEdges={(edges) => setDefinition({ ...definition, edges })}
                  />
                )}
              </div>

              <NodePropertiesPanel
                selectedNode={selectedNode}
                onUpdateNode={handleUpdateNode}
                onDeleteNode={handleDeleteNode}
                onDuplicateNode={handleDuplicateNode}
              />
            </div>
          </div>
        )}

        {/* TAB 3: PREVIEW */}
        {activeTab === 'preview' && (
          <div className="flex-1 flex flex-col items-center justify-center p-8 bg-cogni-dark animate-fade-in text-center space-y-4">
            <div className="p-4 rounded-3xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Play className="w-10 h-10 fill-current mx-auto" />
            </div>
            <h3 className="text-lg font-bold text-slate-100">Interactive Runtime Simulator</h3>
            <p className="text-xs text-slate-400 max-w-md mx-auto leading-relaxed">
              Experience the study exactly as participants will in their web browser, including fixation crosses, VSYNC timing, keyboard responses, and debriefing screens.
            </p>
            <button
              onClick={() => setIsPreviewOpen(true)}
              className="px-6 py-3 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 transition-all"
            >
              Launch Preview Modal
            </button>
          </div>
        )}

        {/* TAB 4: DATA QUALITY */}
        {activeTab === 'quality' && (
          <div className="flex-1 overflow-y-auto">
            <DataQualityTab experimentId={experiment.id} />
          </div>
        )}

        {/* TAB 5: RESEARCH PASSPORT */}
        {activeTab === 'passport' && (
          <div className="flex-1 overflow-y-auto">
            <ResearchPassportTab experimentId={experiment.id} />
          </div>
        )}

        {/* TAB 6: SETTINGS */}
        {activeTab === 'settings' && (
          <div className="flex-1 overflow-y-auto p-8 max-w-4xl mx-auto w-full space-y-6 animate-fade-in">
            <h2 className="text-lg font-bold text-slate-100">Study Governance & Settings</h2>

            <Card interactive={false} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Participant Fields & Demographics
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Define variables requested before the experiment begins.
                  </p>
                </div>
                <button
                  onClick={() => setIsConsentOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                >
                  Configure Form Fields
                </button>
              </div>

              <div className="text-xs text-slate-300 space-y-1">
                {definition.participant_schema.length === 0 ? (
                  <div className="text-slate-500 italic">No custom demographic fields configured.</div>
                ) : (
                  definition.participant_schema.map((f) => (
                    <div key={f.id} className="p-2 rounded-lg bg-slate-900/60 flex items-center justify-between">
                      <span className="font-semibold text-slate-200">{f.label}</span>
                      <span className="font-mono text-[10px] text-slate-400 uppercase">{f.type}</span>
                    </div>
                  ))
                )}
              </div>
            </Card>

            <Card interactive={false} className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
                    Participant Consent & Ethical Safeguards
                  </h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    Study information statement, voluntary withdrawal policy, and data retention duration.
                  </p>
                </div>
                <button
                  onClick={() => setIsConsentOpen(true)}
                  className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700"
                >
                  Edit Consent Text
                </button>
              </div>

              <div className="p-3 rounded-xl bg-slate-900/60 text-xs text-slate-300 space-y-1">
                <div><strong>Study Title:</strong> {definition.consent.study_title || 'Default Title'}</div>
                <div><strong>Retention Period:</strong> {experiment.retention_days} Days</div>
                <div><strong>Ethics Framework:</strong> Privacy-focused pseudonymous data architecture</div>
              </div>
            </Card>
          </div>
        )}
      </div>

      {/* Experiment Linter Panel */}
      <ExperimentLinterPanel
        isOpen={isLinterOpen}
        onClose={() => setIsLinterOpen(false)}
        report={linterReport}
        loading={linterLoading}
        onRevalidate={handleRunLinter}
        onSelectNode={handleSelectNodeFromLinter}
        onPublishClick={handlePublish}
      />

      {/* Experiment Doctor Panel */}
      <ExperimentDoctorPanel
        isOpen={isDoctorOpen}
        onClose={() => setIsDoctorOpen(false)}
        findings={doctorFindings}
        loading={doctorLoading}
        onRefresh={handleRunDoctor}
      />

      {/* Runtime Preview Modal */}
      <PreviewModal
        isOpen={isPreviewOpen}
        onClose={() => setIsPreviewOpen(false)}
        definition={definition}
      />

      {/* Consent & Demographics Modal */}
      <ConsentConfigPanel
        isOpen={isConsentOpen}
        onClose={() => setIsConsentOpen(false)}
        consent={definition.consent}
        participantSchema={definition.participant_schema}
        onSave={(updatedConsent, updatedSchema) => {
          setDefinition({
            ...definition,
            consent: updatedConsent,
            participant_schema: updatedSchema,
          });
        }}
      />
    </div>
  );
};
