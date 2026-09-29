import React, { useState, useEffect } from 'react';
import {
  BookOpen,
  Download,
  FileSpreadsheet,
  FileText,
  Copy,
  Check,
  Search,
  Filter,
  RefreshCw,
  Sparkles,
  Layers,
  Database,
  ExternalLink,
} from 'lucide-react';
import { experimentApi } from '../../api/experimentApi';
import { Card } from '../../components/Card';
import { Select } from '../../components/Select';
import { Pagination } from '../../components/Pagination';

interface DataDictionaryProps {
  experimentId: string;
  versionNumber: number;
}

export const DataDictionaryTab: React.FC<DataDictionaryProps> = ({
  experimentId,
  versionNumber,
}) => {
  const [data, setData] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [copiedJson, setCopiedJson] = useState(false);

  // Pagination states
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  const fetchDictionary = async () => {
    setLoading(true);
    try {
      const res = await experimentApi.getDataDictionary(experimentId);
      setData(res);
    } catch (err) {
      console.error('Failed to load data dictionary:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDictionary();
  }, [experimentId, versionNumber]);

  const handleCopyJson = () => {
    if (!data) return;
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopiedJson(true);
    setTimeout(() => setCopiedJson(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center p-12 text-slate-400">
        <RefreshCw className="w-6 h-6 animate-spin text-brand-400 mr-3" />
        Generating Automatic Data Dictionary...
      </div>
    );
  }

  const variables: any[] = data?.variables || [];

  // Filter variables
  const filtered = variables.filter((v) => {
    const matchesSearch =
      v.name?.toLowerCase().includes(search.toLowerCase()) ||
      v.label?.toLowerCase().includes(search.toLowerCase()) ||
      v.description?.toLowerCase().includes(search.toLowerCase());

    const matchesRole =
      roleFilter === 'all' ||
      (roleFilter === 'primary' && v.outcome_role === 'primary_outcome') ||
      (roleFilter === 'iv' && v.outcome_role === 'independent_variable') ||
      (roleFilter === 'demographics' && v.source === 'Participant Demographics') ||
      (roleFilter === 'diagnostics' && v.outcome_role === 'diagnostic');

    return matchesSearch && matchesRole;
  });

  const totalItems = filtered.length;
  const paginated = filtered.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-7xl mx-auto space-y-6 animate-fade-in pb-16">
      {/* Header Banner */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 flex items-center justify-center">
            <BookOpen className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-xl font-bold text-slate-100">Automatic Data Dictionary</h2>
              <span className="text-xs px-2.5 py-0.5 rounded-full font-bold uppercase tracking-wider bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
                Codebook v{versionNumber}
              </span>
            </div>
            <p className="text-xs text-slate-400 mt-0.5">
              Exhaustive variable schema compiled automatically from your experimental graph, Research Contract, and empirical trial streams.
            </p>
          </div>
        </div>

        {/* Export Actions */}
        <div className="flex items-center gap-2">
          <a
            href={experimentApi.downloadDictionaryCsvUrl(experimentId)}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-brand-500 text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <FileSpreadsheet className="w-3.5 h-3.5 text-emerald-400" />
            CSV Codebook
          </a>

          <a
            href={experimentApi.downloadDictionaryMarkdownUrl(experimentId)}
            download
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-900 border border-slate-700 hover:border-brand-500 text-slate-200 text-xs font-semibold rounded-xl transition-all shadow-sm"
          >
            <FileText className="w-3.5 h-3.5 text-blue-400" />
            Markdown Docs
          </a>

          <button
            onClick={handleCopyJson}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
          >
            {copiedJson ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
            {copiedJson ? 'Copied' : 'JSON'}
          </button>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3 bg-slate-900/60 p-3 rounded-2xl border border-slate-800">
        <div className="relative w-full sm:w-80">
          <Search className="w-4 h-4 text-slate-500 absolute left-3 top-2.5" />
          <input
            type="text"
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            placeholder="Search variables by name, label, or description..."
            className="w-full pl-9 pr-3 py-1.5 bg-slate-950 border border-slate-700 rounded-xl text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-brand-500"
          />
        </div>

        <div className="flex items-center gap-2 w-full sm:w-auto">
          <span className="text-xs text-slate-400">Filter Role:</span>
          <div className="w-44">
            <Select
              value={roleFilter}
              onChange={(val) => {
                setRoleFilter(val);
                setCurrentPage(1);
              }}
              options={[
                { value: 'all', label: 'All Variables' },
                { value: 'primary', label: 'Primary Outcomes' },
                { value: 'iv', label: 'Independent Variables' },
                { value: 'demographics', label: 'Demographics' },
                { value: 'diagnostics', label: 'Timing Diagnostics' },
              ]}
            />
          </div>
        </div>
      </div>

      {/* Variables Table */}
      <Card className="overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-950/80 border-b border-slate-800 text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
              <tr>
                <th className="py-3 px-4">Variable</th>
                <th className="py-3 px-3">Type & Unit</th>
                <th className="py-3 px-4">Role</th>
                <th className="py-3 px-4">Description</th>
                <th className="py-3 px-3">Allowed / Values</th>
                <th className="py-3 px-3">Source</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/60">
              {paginated.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-500 italic">
                    No variables matched your search criteria.
                  </td>
                </tr>
              ) : (
                paginated.map((v: any, idx: number) => {
                  const isPrimary = v.outcome_role === 'primary_outcome';
                  const isIV = v.outcome_role === 'independent_variable';

                  return (
                    <tr key={v.name || idx} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 px-4 font-mono font-bold text-slate-200">
                        <div>{v.name}</div>
                        <div className="text-[10px] font-sans font-normal text-slate-400 mt-0.5">
                          {v.label}
                        </div>
                      </td>

                      <td className="py-3 px-3">
                        <span className="font-mono text-cyan-300">{v.type}</span>
                        {v.unit && v.unit !== '—' && (
                          <span className="ml-1 text-[10px] text-slate-500">({v.unit})</span>
                        )}
                      </td>

                      <td className="py-3 px-4">
                        <span
                          className={`text-[9px] px-2 py-0.5 rounded font-bold uppercase ${
                            isPrimary
                              ? 'bg-brand-500/20 text-brand-300 border border-brand-500/30'
                              : isIV
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-400'
                          }`}
                        >
                          {v.outcome_role?.replace('_', ' ') || 'standard'}
                        </span>
                      </td>

                      <td className="py-3 px-4 text-slate-300 max-w-xs leading-relaxed">
                        {v.description}
                      </td>

                      <td className="py-3 px-3 font-mono text-[11px] text-slate-400 max-w-xs truncate">
                        {v.allowed_values || '—'}
                      </td>

                      <td className="py-3 px-3 text-[11px] text-slate-400">
                        {v.source || 'Session Stream'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {/* Reusable Pagination */}
        <Pagination
          currentPage={currentPage}
          totalItems={totalItems}
          pageSize={pageSize}
          onPageChange={setCurrentPage}
          onPageSizeChange={setPageSize}
          pageSizeOptions={[10, 20, 30, 50]}
        />
      </Card>
    </div>
  );
};
