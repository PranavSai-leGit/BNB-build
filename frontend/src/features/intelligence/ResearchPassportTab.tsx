import React, { useState, useEffect } from 'react';
import {
  FileCheck2,
  Download,
  Copy,
  CheckCircle2,
  Hash,
  Clock,
  Shield,
  Layers,
  Sparkles,
  BookOpen,
  Calendar,
  ExternalLink,
  Table,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import { Card } from '../../components/Card';

interface DataDictEntry {
  column: string;
  type: string;
  description: string;
  example: any;
  reproducibility_impact: string;
}

interface PassportData {
  study_name: string;
  study_id: string;
  public_id: string;
  version_number: number;
  status: string;
  fingerprint: string;
  published_at: string;
  created_by: string;
  organization: string;
  retention_policy_days: number;
  timing_engine_version: string;
  protocol_checklist: Record<string, { status: string; label: string; details: string }>;
  quality_rules: any[];
  data_dictionary: DataDictEntry[];
  reproducibility_score: number;
}

interface ResearchPassportTabProps {
  experimentId: string;
}

export const ResearchPassportTab: React.FC<ResearchPassportTabProps> = ({ experimentId }) => {
  const [passport, setPassport] = useState<PassportData | null>(null);
  const [loading, setLoading] = useState(true);
  const [copiedHash, setCopiedHash] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  useEffect(() => {
    setLoading(true);
    experimentApi
      .getPassport(experimentId)
      .then((data) => {
        setPassport(data);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load passport:', err);
        setLoading(false);
      });
  }, [experimentId]);

  const handleCopyHash = () => {
    if (passport?.fingerprint) {
      navigator.clipboard.writeText(passport.fingerprint);
      setCopiedHash(true);
      setTimeout(() => setCopiedHash(false), 2000);
    }
  };

  const handleDownloadPackage = async () => {
    setIsExporting(true);
    try {
      const pkg = await experimentApi.downloadReproducibilityPackage(experimentId);
      const blob = new Blob([JSON.stringify(pkg, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `reproducibility_package_${passport?.public_id || 'study'}_v${passport?.version_number || 1}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (err) {
      alert('Failed to download reproducibility package');
    } finally {
      setIsExporting(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-slate-400 text-xs">
        <div className="w-8 h-8 border-2 border-brand-500 border-t-transparent rounded-full animate-spin mx-auto mb-3" />
        Generating cryptographic Research Passport & data dictionary...
      </div>
    );
  }

  if (!passport) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Unable to load Research Passport. Please ensure the experiment has at least one saved version.
      </div>
    );
  }

  return (
    <div className="space-y-6 animate-fade-in p-6 max-w-7xl mx-auto">
      {/* Top Passport Banner */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-cogni-panel to-slate-900 border border-slate-800 flex flex-col md:flex-row items-start md:items-center justify-between gap-4 shadow-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-xl bg-brand-500/10 text-brand-400 border border-brand-500/20">
              <FileCheck2 className="w-5 h-5" />
            </div>
            <div>
              <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-bold">
                Official Reproducibility Record
              </span>
              <h2 className="text-xl font-black text-slate-100 tracking-tight">
                RESEARCH PASSPORT
              </h2>
            </div>
          </div>
          <p className="text-xs text-slate-400 max-w-xl">
            Answers: "What exact configuration produced this dataset?" Links the experimental definition, timing engine, consent policies, and data dictionary to an immutable cryptographic fingerprint.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={handleDownloadPackage}
            disabled={isExporting}
            className="flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-brand-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
          >
            <Download className="w-4 h-4" />
            {isExporting ? 'Packaging...' : 'Download Reproducibility Package'}
          </button>
        </div>
      </div>

      {/* Cryptographic Passport Card */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        {/* Left Column: Study Specs & Checksum */}
        <Card interactive={false} className="lg:col-span-1 space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
            Study Specification
          </h3>

          <div className="space-y-3 text-xs">
            <div>
              <span className="text-[10px] text-slate-500 uppercase font-mono">Study Title</span>
              <div className="font-bold text-slate-200 text-sm mt-0.5">{passport.study_name}</div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Version</span>
                <div className="font-bold text-brand-400 font-mono">v{passport.version_number}</div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Status</span>
                <div className="font-bold text-slate-300 capitalize">{passport.status}</div>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800">
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Published</span>
                <div className="font-mono text-slate-300">
                  {new Date(passport.published_at).toLocaleDateString()}
                </div>
              </div>
              <div>
                <span className="text-[10px] text-slate-500 uppercase font-mono">Retention</span>
                <div className="font-mono text-slate-300">{passport.retention_policy_days} Days</div>
              </div>
            </div>

            <div className="pt-2 border-t border-slate-800">
              <span className="text-[10px] text-slate-500 uppercase font-mono">Timing Pipeline</span>
              <div className="text-slate-300 font-semibold mt-0.5">
                {passport.timing_engine_version}
              </div>
            </div>

            {/* SHA-256 Fingerprint */}
            <div className="pt-2 border-t border-slate-800">
              <div className="flex items-center justify-between mb-1">
                <span className="text-[10px] text-slate-500 uppercase font-mono flex items-center gap-1">
                  <Hash className="w-3 h-3 text-cyan-400" /> Definition Hash (SHA-256)
                </span>
                <button
                  onClick={handleCopyHash}
                  className="text-[10px] text-cyan-400 hover:text-cyan-300 flex items-center gap-1 font-mono"
                >
                  <Copy className="w-2.5 h-2.5" /> {copiedHash ? 'Copied' : 'Copy'}
                </button>
              </div>
              <div className="p-2.5 rounded-lg bg-slate-900/90 border border-slate-800 font-mono text-[10px] text-cyan-300 break-all select-all">
                {passport.fingerprint}
              </div>
            </div>
          </div>
        </Card>

        {/* Right Columns: Protocol Verification Checklist */}
        <Card interactive={false} className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400 font-mono">
              Protocol Reproducibility Checklist
            </h3>
            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
              Score: {passport.reproducibility_score}%
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {Object.entries(passport.protocol_checklist).map(([key, item]) => (
              <div
                key={key}
                className="p-3.5 rounded-xl bg-slate-900/60 border border-slate-800 flex items-start gap-3"
              >
                <div className="p-1 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 shrink-0 mt-0.5">
                  <CheckCircle2 className="w-4 h-4" />
                </div>
                <div>
                  <h4 className="text-xs font-bold text-slate-200">{item.label}</h4>
                  <p className="text-[11px] text-slate-400 mt-0.5 leading-relaxed">{item.details}</p>
                </div>
              </div>
            ))}
          </div>
        </Card>
      </div>

      {/* Standardized Data Dictionary */}
      <Card interactive={false} className="space-y-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Table className="w-4 h-4 text-cyan-400" />
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-200 font-mono">
              Data Dictionary (Codebook)
            </h3>
          </div>
          <span className="text-[11px] text-slate-400 font-mono">
            {passport.data_dictionary.length} Export Variables Documented
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-800">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
              <tr>
                <th className="py-2.5 px-4">Column Name</th>
                <th className="py-2.5 px-4">Data Type</th>
                <th className="py-2.5 px-4">Description</th>
                <th className="py-2.5 px-4">Example Value</th>
                <th className="py-2.5 px-4">Reproducibility Impact</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {passport.data_dictionary.map((entry) => (
                <tr key={entry.column} className="hover:bg-slate-800/20 transition-colors">
                  <td className="py-2.5 px-4 font-mono font-bold text-brand-300">
                    {entry.column}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {entry.type}
                  </td>
                  <td className="py-2.5 px-4 text-slate-300 leading-relaxed max-w-xs">
                    {entry.description}
                  </td>
                  <td className="py-2.5 px-4 font-mono text-slate-400 text-[11px]">
                    {String(entry.example)}
                  </td>
                  <td className="py-2.5 px-4 text-slate-400 text-[11px] leading-relaxed">
                    {entry.reproducibility_impact}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
};
