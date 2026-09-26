import React from 'react';
import {
  Cpu,
  Database,
  Layers,
  Code2,
  Zap,
  Shield,
  Clock,
  Terminal,
  Server,
  FileCode,
} from 'lucide-react';
import { Card } from '../../components/Card';

export const DocsPage: React.FC = () => {
  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Header */}
      <div>
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-mono uppercase tracking-widest text-cyan-400 font-bold px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20">
            System Architecture
          </span>
        </div>
        <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-1">
          Technical Architecture & Developer Documentation
        </h1>
        <p className="text-xs text-slate-400 mt-1 max-w-2xl">
          Detailed technical specifications for software engineers, research systems engineers, and open-science platform auditors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Backend & Database */}
        <Card interactive={false} className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">
              <Server className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">FastAPI & PostgreSQL Backend</h3>
              <span className="text-[10px] font-mono text-slate-400">High-Performance Asynchronous Python</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The core Cognera API service is powered by <strong>FastAPI</strong> with Python 3.12, utilizing Pydantic v2 schemas for strict serialization and validation. Data persistence is managed via <strong>PostgreSQL</strong> with a hybrid relational and JSONB architecture. Relational tables index users, sessions, and organizations, while JSONB columns store immutable experiment version graphs, trial trees, and participant schemas without migration friction.
          </p>
        </Card>

        {/* Browser High-Resolution Timing Engine */}
        <Card interactive={false} className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <Clock className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">VSYNC Display Synchronization</h3>
              <span className="text-[10px] font-mono text-slate-400">Hardware-Level Refresh Coupling</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Stimulus onset is synchronized using dual <code>requestAnimationFrame</code> hooks coupled with sub-millisecond timestamps derived from <code>performance.now()</code>. The engine continuously detects skipped frames, background tab switching, and display refresh jitter, streaming telemetry diagnostics to the Data Quality Engine.
          </p>
        </Card>

        {/* React Flow Graph Engine */}
        <Card interactive={false} className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20">
              <Layers className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">React Flow State Graph Engine</h3>
              <span className="text-[10px] font-mono text-slate-400">Declarative Directed Acyclic Graph</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            The visual logic canvas uses <code>@xyflow/react</code> for node positioning, connection handles, and branch routing. The state synchronization pattern maintains the Experiment Definition JSON as the single source of truth, synchronizing timeline reordering with graph positions bidirectionally.
          </p>
        </Card>

        {/* Cryptographic Reproducibility */}
        <Card interactive={false} className="space-y-3">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
              <Shield className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-slate-100">Cryptographic Research Passports</h3>
              <span className="text-[10px] font-mono text-slate-400">Deterministic SHA-256 Fingerprinting</span>
            </div>
          </div>
          <p className="text-xs text-slate-300 leading-relaxed">
            Published experiment snapshots undergo canonical JSON sorting and SHA-256 cryptographic hashing. Every participant response session references its immutable study fingerprint, allowing independent computational replication and data auditability.
          </p>
        </Card>
      </div>

      {/* API Reference Snippet */}
      <Card interactive={false} className="space-y-3">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono flex items-center gap-2">
          <Terminal className="w-4 h-4 text-cyan-400" /> Core REST API Endpoints
        </h3>
        <div className="overflow-x-auto rounded-xl border border-slate-800 bg-slate-900/80 p-3 font-mono text-[11px] space-y-1.5 text-slate-300">
          <div><span className="text-emerald-400 font-bold">GET</span> /api/v1/experiments - List experiments</div>
          <div><span className="text-cyan-400 font-bold">POST</span> /api/v1/experiments/&#123;id&#125;/lint - Execute deterministic linter</div>
          <div><span className="text-purple-400 font-bold">GET</span> /api/v1/experiments/&#123;id&#125;/doctor - Run consultative AI design review</div>
          <div><span className="text-amber-400 font-bold">GET</span> /api/v1/experiments/&#123;id&#125;/quality - Retrieve session quality signals</div>
          <div><span className="text-brand-400 font-bold">GET</span> /api/v1/experiments/&#123;id&#125;/passport - Retrieve official Research Passport</div>
          <div><span className="text-brand-400 font-bold">GET</span> /api/v1/experiments/&#123;id&#125;/passport/package - Download reproducibility package</div>
        </div>
      </Card>
    </div>
  );
};
