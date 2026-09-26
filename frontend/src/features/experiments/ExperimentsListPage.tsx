import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { experimentApi } from '../../api/experimentApi';
import { Experiment } from '../../types/experiment';
import { Modal } from '../../components/Modal';
import { Card } from '../../components/Card';
import { Pagination } from '../../components/Pagination';
import {
  FlaskConical,
  Plus,
  BarChart3,
  ExternalLink,
  Share2,
  Trash2,
  CheckCircle2,
  Clock,
  Sparkles,
  Users,
  Search,
  Filter,
} from 'lucide-react';

export const ExperimentsListPage: React.FC = () => {
  const navigate = useNavigate();
  const [experiments, setExperiments] = useState<Experiment[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(6);

  // New Experiment modal
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [newExpName, setNewExpName] = useState('');
  const [newExpDesc, setNewExpDesc] = useState('');
  const [newExpRetention, setNewExpRetention] = useState(90);
  const [creating, setCreating] = useState(false);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const fetchExperiments = () => {
    setLoading(true);
    experimentApi
      .list()
      .then((data) => {
        setExperiments(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to fetch experiments:', err);
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchExperiments();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newExpName) return;
    setCreating(true);
    try {
      const exp = await experimentApi.create({
        name: newExpName,
        description: newExpDesc,
        retention_days: newExpRetention,
      });
      setIsCreateOpen(false);
      setNewExpName('');
      setNewExpDesc('');
      navigate(`/builder/${exp.id}`);
    } catch (err: any) {
      alert(`Error creating experiment: ${err.message || err}`);
    } finally {
      setCreating(false);
    }
  };

  const handleDelete = async (id: string, name: string) => {
    if (confirm(`Are you sure you want to delete "${name}"? This action cannot be undone.`)) {
      try {
        await experimentApi.delete(id);
        fetchExperiments();
      } catch (err) {
        alert('Failed to delete experiment');
      }
    }
  };

  const handleCopyLink = (publicId: string) => {
    const url = `${window.location.origin}/participate/${publicId}`;
    navigator.clipboard.writeText(url);
    setCopiedId(publicId);
    setTimeout(() => setCopiedId(null), 2000);
  };

  const filteredExperiments = experiments.filter((exp) => {
    const matchesSearch =
      exp.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (exp.description && exp.description.toLowerCase().includes(searchQuery.toLowerCase()));
    const matchesStatus = filterStatus === 'all' || exp.status === filterStatus;
    return matchesSearch && matchesStatus;
  });

  const totalPages = Math.ceil(filteredExperiments.length / pageSize) || 1;
  const paginatedExperiments = filteredExperiments.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  const totalPublished = experiments.filter((e) => e.status === 'published').length;

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Overview Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <Card interactive={false} className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400">
              Total Studies
            </span>
            <div className="text-3xl font-extrabold text-slate-100 mt-1">
              {experiments.length}
            </div>
            <span className="text-[11px] text-brand-400 mt-1 block">Active research projects</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-brand-500/10 text-brand-400 border border-brand-500/20 flex items-center justify-center">
            <FlaskConical className="w-6 h-6" />
          </div>
        </Card>

        <Card interactive={false} className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400">
              Published
            </span>
            <div className="text-3xl font-extrabold text-emerald-400 mt-1">
              {totalPublished}
            </div>
            <span className="text-[11px] text-emerald-300 mt-1 block">Live accepting participants</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center">
            <CheckCircle2 className="w-6 h-6" />
          </div>
        </Card>

        <Card interactive={false} className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400">
              Timing Accuracy
            </span>
            <div className="text-3xl font-extrabold text-cogni-cyan mt-1">
              High-Res
            </div>
            <span className="text-[11px] text-cyan-300 mt-1 block">VSYNC & performance.now()</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-cyan-500/10 text-cogni-cyan border border-cyan-500/20 flex items-center justify-center">
            <Clock className="w-6 h-6" />
          </div>
        </Card>

        <Card interactive={false} className="flex items-center justify-between">
          <div>
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-slate-400">
              Privacy Architecture
            </span>
            <div className="text-3xl font-extrabold text-purple-400 mt-1">
              Privacy-Focused
            </div>
            <span className="text-[11px] text-purple-300 mt-1 block">Designed to support research ethics</span>
          </div>
          <div className="w-12 h-12 rounded-2xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center">
            <Users className="w-6 h-6" />
          </div>
        </Card>
      </div>

      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 pt-2">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight">
            Research Experiments
          </h1>
          <p className="text-sm text-slate-400 mt-0.5">
            Create, version, configure consent, and run high-resolution behavioral studies.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          <Plus className="w-4 h-4" /> New Experiment
        </button>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center gap-3">
        <div className="relative flex-1 w-full">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            placeholder="Search experiments by title or description..."
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setCurrentPage(1);
            }}
            className="w-full pl-10 pr-4 py-2 bg-cogni-panel border border-slate-800 rounded-xl text-sm text-slate-200 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Filter className="w-4 h-4 text-slate-400" />
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="bg-cogni-panel border border-slate-800 rounded-xl px-3 py-2 text-sm text-slate-200 focus:outline-none focus:border-brand-500"
          >
            <option value="all">All Statuses</option>
            <option value="published">Published</option>
            <option value="draft">Drafts</option>
            <option value="archived">Archived</option>
          </select>
        </div>
      </div>

      {/* Experiments Grid */}
      {loading ? (
        <div className="p-12 text-center text-slate-400">Loading experiments...</div>
      ) : filteredExperiments.length === 0 ? (
        <div className="p-12 text-center bg-cogni-panel/40 border border-dashed border-slate-800 rounded-3xl space-y-3">
          <FlaskConical className="w-12 h-12 text-slate-600 mx-auto" />
          <h3 className="text-lg font-bold text-slate-200">No experiments found</h3>
          <p className="text-sm text-slate-400 max-w-sm mx-auto">
            {searchQuery
              ? 'Try modifying your search or filter criteria.'
              : 'Create your first behavioral cognitive experiment to start collecting research data.'}
          </p>
          {!searchQuery && (
            <button
              onClick={() => setIsCreateOpen(true)}
              className="mt-2 inline-flex items-center gap-2 px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl"
            >
              <Plus className="w-4 h-4" /> Create Study
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {paginatedExperiments.map((exp) => (
              <div
                key={exp.id}
                className="glass-card rounded-2xl border border-slate-800 hover:border-slate-700/80 p-6 flex flex-col justify-between transition-all hover:shadow-xl group"
              >
                <div>
                  <div className="flex items-center justify-between gap-2 mb-3">
                    <span
                      className={`text-[10px] uppercase font-mono tracking-wider font-semibold px-2 py-0.5 rounded-full ${
                        exp.status === 'published'
                          ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/30'
                          : 'bg-amber-500/10 text-amber-400 border border-amber-500/30'
                      }`}
                    >
                      {exp.status}
                    </span>
                    <span className="text-xs text-slate-400 font-mono">
                      v{exp.current_version_number}
                    </span>
                  </div>

                  <h3 className="text-lg font-bold text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-1">
                    {exp.name}
                  </h3>
                  <p className="text-xs text-slate-400 mt-2 line-clamp-2 leading-relaxed">
                    {exp.description || 'No description provided.'}
                  </p>

                  <div className="mt-4 pt-4 border-t border-slate-800/80 flex items-center justify-between text-[11px] text-slate-400">
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" /> Retention: {exp.retention_days}d
                    </span>
                    <span className="font-mono text-slate-400">
                      {new Date(exp.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                {/* Action Buttons */}
                <div className="mt-5 pt-4 border-t border-slate-800 flex items-center justify-between gap-2">
                  <button
                    onClick={() => navigate(`/builder/${exp.id}`)}
                    className="flex-1 py-2 px-3 bg-brand-600/20 hover:bg-brand-600/30 text-brand-300 border border-brand-500/30 rounded-xl text-xs font-semibold transition-all text-center"
                  >
                    Visual Builder
                  </button>

                  <button
                    onClick={() => navigate(`/analytics?exp=${exp.id}`)}
                    title="View analytics & charts"
                    className="p-2 bg-cogni-panel border border-slate-700/60 hover:border-slate-600 text-slate-300 hover:text-slate-100 rounded-xl transition-all"
                  >
                    <BarChart3 className="w-4 h-4" />
                  </button>

                  {exp.status === 'published' && (
                    <button
                      onClick={() => handleCopyLink(exp.public_id)}
                      title="Copy participant link"
                      className="p-2 bg-cogni-panel border border-slate-700/60 hover:border-brand-500 text-slate-300 hover:text-brand-300 rounded-xl transition-all"
                    >
                      <Share2 className="w-4 h-4" />
                    </button>
                  )}

                  <button
                    onClick={() => handleDelete(exp.id, exp.name)}
                    title="Delete experiment"
                    className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-all"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>

                {copiedId === exp.public_id && (
                  <div className="mt-2 text-center text-[10px] text-emerald-400 font-semibold animate-fade-in">
                    Participant link copied to clipboard!
                  </div>
                )}
              </div>
            ))}
          </div>

          {filteredExperiments.length > pageSize && (
            <Pagination
              currentPage={currentPage}
              totalItems={filteredExperiments.length}
              pageSize={pageSize}
              onPageChange={setCurrentPage}
              onPageSizeChange={setPageSize}
              pageSizeOptions={[6, 9, 18, 36]}
              className="rounded-2xl border border-slate-800"
            />
          )}
        </div>
      )}

      {/* New Experiment Modal */}
      <Modal
        isOpen={isCreateOpen}
        onClose={() => setIsCreateOpen(false)}
        title="Create New Experiment"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleCreate} className="space-y-4 text-xs">
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Experiment Title *
            </label>
            <input
              type="text"
              required
              value={newExpName}
              onChange={(e) => setNewExpName(e.target.value)}
              placeholder="e.g. Visual Memory & Stroop Protocol"
              className="w-full bg-cogni-card border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500 text-sm"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Description & Hypothesis
            </label>
            <textarea
              rows={3}
              value={newExpDesc}
              onChange={(e) => setNewExpDesc(e.target.value)}
              placeholder="Brief summary of the cognitive paradigm, conditions, and research questions..."
              className="w-full bg-cogni-card border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
            />
          </div>

          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Data Retention Policy
            </label>
            <select
              value={newExpRetention}
              onChange={(e) => setNewExpRetention(Number(e.target.value))}
              className="w-full bg-cogni-card border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
            >
              <option value={30}>30 Days (Short-term evaluation)</option>
              <option value={90}>90 Days (Standard research protocol)</option>
              <option value={365}>1 Year (Longitudinal study)</option>
            </select>
          </div>

          <div className="pt-4 border-t border-slate-700/60 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={() => setIsCreateOpen(false)}
              className="px-4 py-2 text-sm text-slate-300 hover:text-slate-100"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={creating}
              className="px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl shadow-lg transition-all"
            >
              {creating ? 'Creating...' : 'Open Builder'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
