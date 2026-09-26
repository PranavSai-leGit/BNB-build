import React, { useState, useEffect } from 'react';
import {
  Shield,
  Users,
  Building,
  Activity,
  Settings,
  Lock,
  Clock,
  CheckCircle2,
  AlertTriangle,
  RefreshCw,
  Search,
} from 'lucide-react';
import { adminApi } from '../../api/adminApi';
import { Card } from '../../components/Card';
import { Pagination } from '../../components/Pagination';

export const AdminPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'users' | 'orgs' | 'settings'>('overview');
  const [overview, setOverview] = useState<any>(null);
  const [users, setUsers] = useState<any[]>([]);
  const [orgs, setOrgs] = useState<any[]>([]);
  const [settings, setSettings] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Pagination states
  const [usersPage, setUsersPage] = useState(1);
  const [usersPageSize, setUsersPageSize] = useState(10);
  const [orgsPage, setOrgsPage] = useState(1);
  const [orgsPageSize, setOrgsPageSize] = useState(6);
  const [auditPage, setAuditPage] = useState(1);
  const [auditPageSize, setAuditPageSize] = useState(5);

  const fetchAdminData = () => {
    setLoading(true);
    setError(null);
    Promise.all([
      adminApi.getOverview(),
      adminApi.getUsers(),
      adminApi.getOrganizations(),
      adminApi.getSystemSettings(),
    ])
      .then(([ov, u, o, s]) => {
        setOverview(ov);
        setUsers(u);
        setOrgs(o);
        setSettings(s);
        setLoading(false);
      })
      .catch((err) => {
        console.error('Failed to load admin data:', err);
        setError(err.message || 'Access restricted to Organization and Platform Administrators.');
        setLoading(false);
      });
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  if (error) {
    return (
      <div className="max-w-2xl mx-auto my-20 p-8 rounded-2xl bg-rose-950/20 border border-rose-500/30 text-center space-y-4 animate-fade-in">
        <Lock className="w-12 h-12 text-rose-400 mx-auto" />
        <h2 className="text-xl font-bold text-slate-100">Administrator Access Required</h2>
        <p className="text-xs text-rose-300/90 leading-relaxed max-w-md mx-auto">
          {error}
        </p>
        <p className="text-xs text-slate-400">
          To test administrative functions, sign in with an Organization or Platform Admin account (e.g. <code>admin@cognilab.edu</code>).
        </p>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-8 animate-fade-in">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono uppercase tracking-widest text-brand-400 font-bold px-2 py-0.5 rounded bg-brand-500/10 border border-brand-500/20">
              Platform Administration
            </span>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-100 tracking-tight mt-1">
            System Administration & Governance
          </h1>
          <p className="text-xs text-slate-400 mt-0.5">
            Manage organization members, study retention policies, timing engine configurations, and system audit logs.
          </p>
        </div>

        <button
          onClick={fetchAdminData}
          disabled={loading}
          className="flex items-center gap-1.5 px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-xl border border-slate-700 transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-brand-400' : ''}`} />
          Refresh Status
        </button>
      </div>

      {/* Admin Tabs */}
      <div className="flex items-center gap-2 border-b border-slate-800 pb-2">
        <button
          onClick={() => setActiveTab('overview')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'overview'
              ? 'bg-cogni-panel text-brand-300 border border-brand-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Activity className="w-3.5 h-3.5" /> System Overview
        </button>

        <button
          onClick={() => setActiveTab('users')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'users'
              ? 'bg-cogni-panel text-brand-300 border border-brand-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Users className="w-3.5 h-3.5" /> Users & Permissions ({users.length})
        </button>

        <button
          onClick={() => setActiveTab('orgs')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'orgs'
              ? 'bg-cogni-panel text-brand-300 border border-brand-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Building className="w-3.5 h-3.5" /> Organizations ({orgs.length})
        </button>

        <button
          onClick={() => setActiveTab('settings')}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all ${
            activeTab === 'settings'
              ? 'bg-cogni-panel text-brand-300 border border-brand-500/30'
              : 'text-slate-400 hover:text-slate-200'
          }`}
        >
          <Settings className="w-3.5 h-3.5" /> Governance & Policies
        </button>
      </div>

      {/* Tab 1: Overview */}
      {activeTab === 'overview' && (
        <div className="space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <Card interactive={false}>
              <span className="text-[11px] uppercase font-mono font-semibold text-slate-400">
                Active Users
              </span>
              <div className="text-3xl font-extrabold text-slate-100 mt-1">
                {overview?.stats?.total_users ?? 0}
              </div>
              <span className="text-[10px] text-brand-400 mt-1 block">Researchers & Admins</span>
            </Card>

            <Card interactive={false}>
              <span className="text-[11px] uppercase font-mono font-semibold text-slate-400">
                Total Experiments
              </span>
              <div className="text-3xl font-extrabold text-slate-100 mt-1">
                {overview?.stats?.total_experiments ?? 0}
              </div>
              <span className="text-[10px] text-slate-400 mt-1 block">Created on platform</span>
            </Card>

            <Card interactive={false}>
              <span className="text-[11px] uppercase font-mono font-semibold text-slate-400">
                Participant Sessions
              </span>
              <div className="text-3xl font-extrabold text-emerald-400 mt-1">
                {overview?.stats?.total_sessions ?? 0}
              </div>
              <span className="text-[10px] text-emerald-300 mt-1 block">Pseudonymous records</span>
            </Card>

            <Card interactive={false}>
              <span className="text-[11px] uppercase font-mono font-semibold text-slate-400">
                Organizations
              </span>
              <div className="text-3xl font-extrabold text-purple-400 mt-1">
                {overview?.stats?.total_organizations ?? 0}
              </div>
              <span className="text-[10px] text-purple-300 mt-1 block">Labs & University Depts</span>
            </Card>
          </div>

          {/* Recent Audit Logs */}
          <Card interactive={false} className="space-y-4">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              System Audit Activity
            </h3>
            <div className="overflow-x-auto rounded-xl border border-slate-800">
              <table className="w-full text-left text-xs">
                <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                  <tr>
                    <th className="py-2.5 px-4">Action</th>
                    <th className="py-2.5 px-4">User ID</th>
                    <th className="py-2.5 px-4">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/60 font-mono text-[11px]">
                  {(overview?.recent_audit_logs || [])
                    .slice((auditPage - 1) * auditPageSize, auditPage * auditPageSize)
                    .map((a: any) => (
                      <tr key={a.id} className="hover:bg-slate-800/20">
                        <td className="py-2.5 px-4 text-cyan-300 font-semibold">{a.action}</td>
                        <td className="py-2.5 px-4 text-slate-400">{a.user_id || 'System'}</td>
                        <td className="py-2.5 px-4 text-slate-500">
                          {a.created_at ? new Date(a.created_at).toLocaleString() : '—'}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>

              {(overview?.recent_audit_logs || []).length > auditPageSize && (
                <Pagination
                  currentPage={auditPage}
                  totalItems={(overview?.recent_audit_logs || []).length}
                  pageSize={auditPageSize}
                  onPageChange={setAuditPage}
                  onPageSizeChange={setAuditPageSize}
                  pageSizeOptions={[5, 10, 20]}
                />
              )}
            </div>
          </Card>
        </div>
      )}

      {/* Tab 2: Users */}
      {activeTab === 'users' && (
        <Card interactive={false} className="space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
              Registered Researchers & Administrators
            </h3>
            <span className="text-xs text-slate-400">{users.length} registered accounts</span>
          </div>

          <div className="overflow-x-auto rounded-xl border border-slate-800">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900/80 text-slate-400 uppercase font-mono text-[10px] border-b border-slate-800">
                <tr>
                  <th className="py-3 px-4">Full Name</th>
                  <th className="py-3 px-4">Email</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Created At</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {users
                  .slice((usersPage - 1) * usersPageSize, usersPage * usersPageSize)
                  .map((u) => (
                    <tr key={u.id} className="hover:bg-slate-800/20">
                      <td className="py-3 px-4 font-semibold text-slate-200">{u.full_name}</td>
                      <td className="py-3 px-4 text-slate-400 font-mono">{u.email}</td>
                      <td className="py-3 px-4">
                        <span
                          className={`text-[10px] font-mono px-2 py-0.5 rounded font-bold uppercase ${
                            u.role === 'org_admin' || u.role === 'platform_admin'
                              ? 'bg-purple-500/20 text-purple-300 border border-purple-500/30'
                              : 'bg-slate-800 text-slate-300'
                          }`}
                        >
                          {u.role}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className="text-emerald-400 flex items-center gap-1 text-[11px]">
                          <CheckCircle2 className="w-3 h-3" /> Active
                        </span>
                      </td>
                      <td className="py-3 px-4 text-slate-500 font-mono text-[11px]">
                        {u.created_at ? new Date(u.created_at).toLocaleDateString() : '—'}
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>

            {users.length > usersPageSize && (
              <Pagination
                currentPage={usersPage}
                totalItems={users.length}
                pageSize={usersPageSize}
                onPageChange={setUsersPage}
                onPageSizeChange={setUsersPageSize}
                pageSizeOptions={[5, 10, 25, 50]}
              />
            )}
          </div>
        </Card>
      )}

      {/* Tab 3: Organizations */}
      {activeTab === 'orgs' && (
        <Card interactive={false} className="space-y-4">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Research Organizations
          </h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {orgs
              .slice((orgsPage - 1) * orgsPageSize, orgsPage * orgsPageSize)
              .map((org) => (
                <div
                  key={org.id}
                  className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 space-y-2"
                >
                  <div className="flex items-center justify-between">
                    <h4 className="font-bold text-slate-100 text-sm">{org.name}</h4>
                    <span className="text-[10px] font-mono text-slate-500 uppercase">{org.slug}</span>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-800/80 text-xs">
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Members</span>
                      <div className="font-bold text-slate-200">{org.member_count}</div>
                    </div>
                    <div>
                      <span className="text-[10px] text-slate-500 uppercase font-mono">Studies</span>
                      <div className="font-bold text-slate-200">{org.experiment_count}</div>
                    </div>
                  </div>
                </div>
              ))}
          </div>

          {orgs.length > orgsPageSize && (
            <Pagination
              currentPage={orgsPage}
              totalItems={orgs.length}
              pageSize={orgsPageSize}
              onPageChange={setOrgsPage}
              onPageSizeChange={setOrgsPageSize}
              pageSizeOptions={[4, 6, 12, 24]}
              className="rounded-xl border border-slate-800"
            />
          )}
        </Card>
      )}

      {/* Tab 4: Settings & Governance */}
      {activeTab === 'settings' && (
        <Card interactive={false} className="space-y-4 max-w-2xl">
          <h3 className="text-xs font-bold uppercase tracking-wider text-slate-300 font-mono">
            Platform Policies & Governance Configuration
          </h3>

          <div className="space-y-3 text-xs">
            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200">Default Data Retention Period</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Automated purging schedule for pseudonymous trial data.
                </p>
              </div>
              <span className="font-mono text-brand-300 font-bold px-3 py-1 bg-brand-500/10 rounded-lg border border-brand-500/20">
                {settings?.retention_policy_default_days || 90} Days
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200">Timing Subsystem Version</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Browser-side VSYNC frame measurement & sub-millisecond precision.
                </p>
              </div>
              <span className="font-mono text-cyan-300 font-bold px-3 py-1 bg-cyan-500/10 rounded-lg border border-cyan-500/20">
                {settings?.timing_engine_version || 'VSYNC v2.4'}
              </span>
            </div>

            <div className="p-3 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
              <div>
                <h4 className="font-bold text-slate-200">Pseudonymization Pipeline</h4>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Protects participant identity by automatically generating cryptographic pseudonym tokens.
                </p>
              </div>
              <span className="font-mono text-emerald-400 font-bold px-3 py-1 bg-emerald-500/10 rounded-lg border border-emerald-500/20">
                Active
              </span>
            </div>
          </div>
        </Card>
      )}
    </div>
  );
};
