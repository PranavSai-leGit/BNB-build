import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Brain, Lock, Mail, User as UserIcon, Building, ArrowRight, Sparkles } from 'lucide-react';
import { authApi } from '../../api/authApi';
import { User } from '../../types/user';

interface LoginPageProps {
  onLoginSuccess: (user: User, token: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLoginSuccess }) => {
  const navigate = useNavigate();
  const [isRegister, setIsRegister] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [orgName, setOrgName] = useState('Cognitive Neuroscience Lab');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      if (isRegister) {
        const resp = await authApi.register({
          email,
          password,
          full_name: fullName,
          organization_name: orgName,
        });
        localStorage.setItem('cognilab_token', resp.access_token);
        onLoginSuccess(resp.user, resp.access_token);
        navigate('/experiments');
      } else {
        const resp = await authApi.login({ email, password });
        localStorage.setItem('cognilab_token', resp.access_token);
        onLoginSuccess(resp.user, resp.access_token);
        navigate('/experiments');
      }
    } catch (err: any) {
      setError(err.message || 'Authentication failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickLogin = async (quickEmail: string, quickPass: string) => {
    setEmail(quickEmail);
    setPassword(quickPass);
    setLoading(true);
    setError(null);
    try {
      const resp = await authApi.login({ email: quickEmail, password: quickPass });
      localStorage.setItem('cognilab_token', resp.access_token);
      onLoginSuccess(resp.user, resp.access_token);
      navigate('/experiments');
    } catch (err: any) {
      setError(err.message || 'Quick login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col justify-center items-center py-12 px-4 sm:px-6">
      <div className="max-w-md w-full space-y-8 animate-fade-in">
        {/* Brand Header */}
        <div className="text-center space-y-2">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-brand-600 to-cogni-cyan flex items-center justify-center text-white shadow-xl shadow-brand-500/20 mx-auto">
            <Brain className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-extrabold tracking-tight text-slate-100">
            Cogne<span className="text-cogni-cyan">ra</span>
          </h1>
          <p className="text-xs text-slate-400 max-w-sm mx-auto">
            SaaS Platform for Cognitive Science, Behavioral Experiments, and High-Resolution Timing
          </p>
        </div>

        {/* Demo Fast Login Box for Hackathon Reviewers */}
        <div className="p-4 bg-cogni-panel border border-brand-500/30 rounded-2xl space-y-2.5 shadow-lg">
          <div className="flex items-center gap-2 text-xs font-semibold text-brand-300">
            <Sparkles className="w-4 h-4 text-brand-400" />
            <span>Fast Sign-In for Reviewers:</span>
          </div>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => handleQuickLogin('researcher@cognilab.edu', 'CogniLab2026!')}
              className="p-2.5 bg-cogni-card hover:bg-brand-500/20 border border-slate-700 hover:border-brand-400 rounded-xl text-left transition-all"
            >
              <div className="font-bold text-slate-200">Dr. Elena Vance</div>
              <div className="text-[10px] text-slate-400">Lead Researcher</div>
            </button>
            <button
              type="button"
              onClick={() => handleQuickLogin('admin@cognilab.edu', 'CogniLabAdmin2026!')}
              className="p-2.5 bg-cogni-card hover:bg-brand-500/20 border border-slate-700 hover:border-brand-400 rounded-xl text-left transition-all"
            >
              <div className="font-bold text-slate-200">Prof. David Chen</div>
              <div className="text-[10px] text-slate-400">Org Admin</div>
            </button>
          </div>
        </div>

        {/* Auth Card */}
        <div className="glass-panel p-8 rounded-3xl border border-slate-800 shadow-2xl space-y-6">
          <div className="flex border-b border-slate-800 pb-3 gap-6">
            <button
              type="button"
              onClick={() => setIsRegister(false)}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                !isRegister
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Sign In
            </button>
            <button
              type="button"
              onClick={() => setIsRegister(true)}
              className={`text-sm font-bold pb-2 border-b-2 transition-all ${
                isRegister
                  ? 'border-brand-500 text-brand-400'
                  : 'border-transparent text-slate-400 hover:text-slate-200'
              }`}
            >
              Create Account
            </button>
          </div>

          {error && (
            <div className="p-3 bg-rose-500/10 border border-rose-500/30 rounded-xl text-xs text-rose-300 font-medium">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4 text-xs">
            {isRegister && (
              <>
                <div>
                  <label className="block text-slate-300 font-semibold mb-1">Full Name</label>
                  <div className="relative">
                    <UserIcon className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      required
                      value={fullName}
                      onChange={(e) => setFullName(e.target.value)}
                      placeholder="Dr. Jane Doe"
                      className="w-full bg-cogni-card border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-slate-300 font-semibold mb-1">
                    Organization / Lab Name
                  </label>
                  <div className="relative">
                    <Building className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                    <input
                      type="text"
                      value={orgName}
                      onChange={(e) => setOrgName(e.target.value)}
                      placeholder="Center for Cognitive Neuroscience"
                      className="w-full bg-cogni-card border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
                    />
                  </div>
                </div>
              </>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Academic Email</label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="researcher@university.edu"
                  className="w-full bg-cogni-card border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Password</label>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••••••"
                  className="w-full bg-cogni-card border border-slate-700 rounded-xl pl-9 pr-3 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-brand-600/30 transition-all flex items-center justify-center gap-2"
            >
              {loading
                ? 'Authenticating...'
                : isRegister
                ? 'Create Researcher Account'
                : 'Sign In to Dashboard'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        </div>
      </div>
    </div>
  );
};
