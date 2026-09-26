import React, { useState, useEffect } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Navbar } from './components/Navbar';
import { LoginPage } from './features/auth/LoginPage';
import { ExperimentsListPage } from './features/experiments/ExperimentsListPage';
import { ExperimentBuilderPage } from './features/builder/ExperimentBuilderPage';
import { AnalyticsDashboardPage } from './features/analytics/AnalyticsDashboardPage';
import { TimingDiagnosticsPage } from './features/diagnostics/TimingDiagnosticsPage';
import { AuditTrailPage } from './features/audit/AuditTrailPage';
import { ParticipantRuntimePage } from './features/participant/ParticipantRuntimePage';
import { AdminPage } from './features/admin/AdminPage';
import { DocsPage } from './features/docs/DocsPage';
import { authApi } from './api/authApi';
import { User } from './types/user';

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      retry: 1,
    },
  },
});

export const AppContent: React.FC = () => {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const location = useLocation();

  useEffect(() => {
    const token = localStorage.getItem('cognilab_token');
    if (token) {
      authApi
        .getCurrentUser()
        .then((u) => setUser(u))
        .catch(() => {
          localStorage.removeItem('cognilab_token');
          setUser(null);
        })
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const handleLoginSuccess = (loggedInUser: User, token: string) => {
    setUser(loggedInUser);
  };

  const handleLogout = () => {
    localStorage.removeItem('cognilab_token');
    setUser(null);
  };

  const isParticipantRoute =
    location.pathname.startsWith('/participate') || location.pathname.startsWith('/p/');

  if (loading) {
    return (
      <div className="min-h-screen bg-cogni-dark flex items-center justify-center text-slate-400">
        <div className="w-8 h-8 rounded-full border-2 border-brand-500 border-t-transparent animate-spin mr-3" />
        Initializing Cognera...
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-cogni-dark text-slate-100 flex flex-col font-sans">
      {/* Hide researcher navbar on participant test screens */}
      {!isParticipantRoute && <Navbar user={user} onLogout={handleLogout} />}

      <main className="flex-1 flex flex-col">
        <Routes>
          {/* Public Participant Routes (No login required) */}
          <Route path="/participate/:publicId" element={<ParticipantRuntimePage />} />
          <Route path="/p/:publicId" element={<ParticipantRuntimePage />} />
          <Route path="/docs" element={<DocsPage />} />

          {/* Authentication */}
          <Route
            path="/login"
            element={user ? <Navigate to="/experiments" replace /> : <LoginPage onLoginSuccess={handleLoginSuccess} />}
          />

          {/* Researcher Protected Routes (or fallback to login) */}
          <Route
            path="/experiments"
            element={user ? <ExperimentsListPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/builder/:id"
            element={user ? <ExperimentBuilderPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/analytics"
            element={user ? <AnalyticsDashboardPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/diagnostics"
            element={user ? <TimingDiagnosticsPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/audit"
            element={user ? <AuditTrailPage /> : <Navigate to="/login" replace />}
          />
          <Route
            path="/admin"
            element={user ? <AdminPage /> : <Navigate to="/login" replace />}
          />

          {/* Default redirect */}
          <Route path="*" element={<Navigate to={user ? '/experiments' : '/login'} replace />} />
        </Routes>
      </main>
    </div>
  );
};

export default function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </QueryClientProvider>
  );
}
