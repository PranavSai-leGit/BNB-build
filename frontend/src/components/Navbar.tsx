import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  Brain,
  FlaskConical,
  BarChart3,
  Gauge,
  ShieldCheck,
  LogOut,
  Sparkles,
  ShieldAlert,
  BookOpen,
  User as UserIcon,
} from 'lucide-react';
import { User } from '../types/user';

interface NavbarProps {
  user: User | null;
  onLogout: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({ user, onLogout }) => {
  const location = useLocation();
  const navigate = useNavigate();

  // Navigation for authenticated researchers
  const authenticatedLinks = [
    { label: 'Experiments', path: '/experiments', icon: FlaskConical },
    { label: 'Data & Analytics', path: '/analytics', icon: BarChart3 },
    { label: 'Timing Diagnostics', path: '/diagnostics', icon: Gauge },
    { label: 'Audit Trail', path: '/audit', icon: ShieldCheck },
  ];

  // If user is org_admin or platform_admin, add Admin console
  if (user && (user.role === 'org_admin' || user.role === 'platform_admin')) {
    authenticatedLinks.push({ label: 'Admin Console', path: '/admin', icon: ShieldAlert });
  }

  // Navigation for unauthenticated / public visitors
  const publicLinks = [
    { label: 'Product', path: '/#product' },
    { label: 'Features', path: '/#features' },
    { label: 'Research', path: '/#research' },
    { label: 'Documentation', path: '/docs' },
  ];

  return (
    <header className="sticky top-0 z-40 w-full border-b border-slate-800 bg-cogni-dark/90 backdrop-blur-md">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Logo */}
        <Link to={user ? '/experiments' : '/'} className="flex items-center gap-3 group">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cogni-cyan flex items-center justify-center text-white shadow-lg shadow-brand-500/20 group-hover:scale-105 transition-transform">
            <Brain className="w-6 h-6" />
          </div>
          <div>
            <span className="text-xl font-bold tracking-tight text-white flex items-center gap-1.5">
              <span className="text-cogni-cyan">Cognera</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded bg-brand-500/20 text-brand-300 font-mono font-semibold">
                SaaS
              </span>
            </span>
            <p className="text-[11px] text-slate-400 -mt-1 hidden sm:block">
              Cognitive Science Research Platform
            </p>
          </div>
        </Link>

        {/* Navigation items based on auth state */}
        <nav className="hidden md:flex items-center gap-1">
          {user ? (
            authenticatedLinks.map((link) => {
              const Icon = link.icon;
              const isActive =
                location.pathname === link.path ||
                (link.path === '/experiments' && location.pathname.startsWith('/builder'));
              return (
                <Link
                  key={link.path}
                  to={link.path}
                  className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium transition-all ${isActive
                      ? 'bg-brand-500/15 text-brand-300 border border-brand-500/30'
                      : 'text-slate-400 hover:text-slate-100 hover:bg-slate-800/50'
                    }`}
                >
                  <Icon className="w-4 h-4" />
                  {link.label}
                </Link>
              );
            })
          ) : (
            publicLinks.map((link) => (
              <Link
                key={link.label}
                to={link.path}
                className="px-3.5 py-2 rounded-xl text-sm font-medium text-slate-400 hover:text-slate-100 hover:bg-slate-800/50 transition-all"
              >
                {link.label}
              </Link>
            ))
          )}
        </nav>

        {/* User Profile / Action Buttons */}
        <div className="flex items-center gap-4">
          {user ? (
            <div className="flex items-center gap-3">
              <div className="hidden sm:flex flex-col text-right">
                <span className="text-sm font-semibold text-slate-200">
                  {user.full_name}
                </span>
                <span className="text-[11px] text-slate-400 font-mono capitalize">
                  {user.role.replace('_', ' ')}
                </span>
              </div>
              <div className="w-9 h-9 rounded-full bg-brand-600/30 border border-brand-500/40 flex items-center justify-center text-brand-300 font-semibold text-sm">
                {user.full_name.charAt(0)}
              </div>
              <button
                onClick={onLogout}
                title="Sign Out"
                className="p-2 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-xl transition-colors"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <div className="flex items-center gap-2">
              <Link
                to="/login"
                className="px-4 py-2 bg-brand-600 hover:bg-brand-500 text-white text-sm font-semibold rounded-xl shadow-lg shadow-brand-600/20 transition-all"
              >
                Sign In
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
};
