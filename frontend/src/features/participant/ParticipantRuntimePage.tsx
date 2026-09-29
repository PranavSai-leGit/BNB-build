import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { participantApi } from '../../api/participantApi';
import { InitSessionResponse } from '../../types/session';
import { TimingEngine } from '../../experiment-engine/TimingEngine';
import { ExperimentRunner } from '../../experiment-engine/ExperimentRunner';
import {
  Brain,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Maximize2,
  AlertCircle,
  LogOut,
  HelpCircle,
  Sparkles,
} from 'lucide-react';
import { Select } from '../../components/Select';
import { ParticipantPreflight } from './ParticipantPreflight';

type Step = 'consent' | 'demographics' | 'preflight' | 'fullscreen_prompt' | 'experiment' | 'completed' | 'withdrawn';

export const ParticipantRuntimePage: React.FC = () => {
  const { publicId } = useParams<{ publicId: string }>();
  const navigate = useNavigate();

  const [step, setStep] = useState<Step>('consent');
  const [studyInfo, setStudyInfo] = useState<any>(null);
  const [session, setSession] = useState<InitSessionResponse | null>(null);
  const [demographics, setDemographics] = useState<Record<string, any>>({});
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Fetch public experiment info
  useEffect(() => {
    if (!publicId) return;
    setLoading(true);
    participantApi
      .getPublicInfo(publicId)
      .then((info) => {
        setStudyInfo(info);
        setLoading(false);
      })
      .catch((err) => {
        setError(err.message || 'Experiment not found or is currently not active.');
        setLoading(false);
      });
  }, [publicId]);

  // Handle Consent Acceptance
  const handleAcceptConsent = () => {
    const participantSchema = studyInfo?.participant_schema || [];
    if (participantSchema.length > 0) {
      setStep('demographics');
    } else {
      setStep('preflight');
    }
  };

  const handleDeclineConsent = () => {
    setStep('withdrawn');
  };

  // Initialize Session
  const initializeSession = async (participantData: Record<string, any>) => {
    if (!publicId) return;
    setLoading(true);
    try {
      const timingEngine = TimingEngine.getInstance();
      const displayDiagnostics = await timingEngine.estimateDisplayPerformance(20);

      const sess = await participantApi.initSession(publicId, participantData, {
        user_agent: navigator.userAgent,
        screen_width: window.screen.width,
        screen_height: window.screen.height,
        device_pixel_ratio: window.devicePixelRatio,
        estimated_refresh_rate: displayDiagnostics.estimatedHz,
        timing_api_supported: displayDiagnostics.timingApiSupported,
        timing_quality: displayDiagnostics.timingQuality,
        hardware_concurrency: navigator.hardwareConcurrency,
      });

      setSession(sess);

      // Record consent acceptance
      await participantApi.submitConsent(sess.session_id, true, '1.0');

      if (sess.settings?.fullscreen) {
        setStep('fullscreen_prompt');
      } else {
        setStep('experiment');
      }
    } catch (err: any) {
      setError(err.message || 'Failed to initialize participant session.');
    } finally {
      setLoading(false);
    }
  };

  // Submit Demographics -> Proceed to Preflight Check
  const handleSubmitDemographics = (e: React.FormEvent) => {
    e.preventDefault();
    setStep('preflight');
  };

  // Request Fullscreen
  const handleEnterFullscreen = async () => {
    try {
      if (document.documentElement.requestFullscreen) {
        await document.documentElement.requestFullscreen();
      }
    } catch {
      // Browsers might block fullscreen if user interaction restriction applies
    }
    setStep('experiment');
  };

  // Handle Participant Withdrawal
  const handleWithdraw = async () => {
    if (confirm('Are you sure you want to withdraw from this study? Any in-progress data will be discarded.')) {
      if (session) {
        await participantApi.completeSession(session.session_id, true);
      }
      setStep('withdrawn');
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(() => {});
      }
    }
  };

  // Loading state
  if (loading) {
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-6 text-slate-300">
        <div className="w-12 h-12 rounded-full border-3 border-brand-500 border-t-transparent animate-spin mb-4" />
        <p className="text-sm font-medium">Preparing experiment environment...</p>
      </div>
    );
  }

  // Error state
  if (error) {
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-rose-500/20 text-rose-400 border border-rose-500/30 flex items-center justify-center mx-auto mb-4">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Study Unavailable</h2>
        <p className="text-slate-400 mt-2 max-w-md">{error}</p>
      </div>
    );
  }

  // Step: Withdrawn
  if (step === 'withdrawn') {
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center mx-auto mb-4">
          <LogOut className="w-8 h-8" />
        </div>
        <h2 className="text-2xl font-bold text-slate-100">Participation Withdrawn</h2>
        <p className="text-slate-400 mt-2 max-w-md">
          You have chosen not to participate or to withdraw from this study. No experimental response
          data will be retained. You may close this browser tab.
        </p>
      </div>
    );
  }

  // Step: Completed
  if (step === 'completed') {
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto mb-6 shadow-2xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h2 className="text-3xl font-extrabold text-slate-100">Study Completed</h2>
        <p className="text-slate-300 mt-3 max-w-lg leading-relaxed">
          Thank you for completing this behavioral research study. Your responses have been
          pseudonymously recorded under identifier:
        </p>
        <div className="mt-4 px-4 py-2 bg-cogni-card border border-slate-700 rounded-xl font-mono text-sm text-brand-300 font-bold">
          {session?.participant_id || 'P-VERIFIED'}
        </div>
        <p className="text-xs text-slate-400 mt-6">
          You may now safely close this browser window.
        </p>
      </div>
    );
  }

  // Step: Consent Screen
  if (step === 'consent') {
    const consent = studyInfo?.consent || {};
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-4 sm:p-8">
        <div className="max-w-2xl w-full bg-cogni-panel border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-fade-in">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-brand-600 to-cogni-cyan flex items-center justify-center text-white shadow-lg">
              <Brain className="w-5 h-5" />
            </div>
            <div>
              <span className="text-xs uppercase font-mono tracking-wider font-semibold text-brand-400">
                Cognitive Science Research Study
              </span>
              <h1 className="text-2xl font-bold text-slate-100">
                {consent.study_title || studyInfo.name}
              </h1>
            </div>
          </div>

          <div className="p-4 bg-cogni-card border border-slate-700/70 rounded-2xl flex items-center justify-between text-xs text-slate-300">
            <div className="flex items-center gap-2">
              <Clock className="w-4 h-4 text-brand-400" />
              <span>
                Estimated Time: <strong>{consent.duration_minutes || 5} minutes</strong>
              </span>
            </div>
            <div className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-emerald-400" />
              <span>Pseudonymous & Voluntary</span>
            </div>
          </div>

          {/* Consent Body */}
          <div className="space-y-4 text-xs text-slate-300 leading-relaxed bg-cogni-dark/50 p-5 rounded-2xl border border-slate-800 max-h-72 overflow-y-auto">
            <div>
              <h4 className="font-bold text-slate-100 mb-1">Purpose of the Research</h4>
              <p>{consent.purpose}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-100 mb-1">Procedures</h4>
              <p>{consent.procedures}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-100 mb-1">Risks & Benefits</h4>
              <p>{consent.risks} {consent.benefits}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-100 mb-1">Confidentiality & Data Handling</h4>
              <p>{consent.data_collected} {consent.data_retention_policy}</p>
            </div>
            <div>
              <h4 className="font-bold text-slate-100 mb-1">Right to Withdraw</h4>
              <p>{consent.withdrawal_statement}</p>
            </div>
            {consent.researcher_contact && (
              <div>
                <h4 className="font-bold text-slate-100 mb-1">Contact for Questions</h4>
                <p>{consent.researcher_contact}</p>
              </div>
            )}
          </div>

          {/* Actions */}
          <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-4">
            <button
              onClick={handleDeclineConsent}
              className="w-full sm:w-auto px-5 py-2.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors"
            >
              I Do Not Wish to Participate
            </button>
            <button
              onClick={handleAcceptConsent}
              className="w-full sm:w-auto px-8 py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl shadow-xl shadow-brand-600/30 transition-all transform hover:-translate-y-0.5 active:translate-y-0"
            >
              I Agree & Understand
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Step: Demographics Survey
  if (step === 'demographics') {
    const fields = studyInfo?.participant_schema || [];
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-4 sm:p-8">
        <form
          onSubmit={handleSubmitDemographics}
          className="max-w-xl w-full bg-cogni-panel border border-slate-700/80 rounded-3xl p-6 sm:p-10 shadow-2xl space-y-6 animate-fade-in"
        >
          <div>
            <span className="text-xs uppercase font-mono tracking-wider font-semibold text-brand-400">
              Participant Information
            </span>
            <h2 className="text-2xl font-bold text-slate-100 mt-1">Study Questions</h2>
            <p className="text-xs text-slate-400 mt-1">
              Please answer the following questions before entering the experiment.
            </p>
          </div>

          <div className="space-y-4 text-xs">
            {fields.map((f: any) => (
              <div key={f.id}>
                <label className="block text-slate-200 font-semibold mb-1.5">
                  {f.label} {f.required && <span className="text-rose-400">*</span>}
                </label>

                {f.type === 'select' ? (
                  <Select
                    value={demographics[f.id] || ''}
                    onChange={(val) => setDemographics({ ...demographics, [f.id]: val })}
                    options={(f.options || []).map((opt: string) => ({ value: opt, label: opt }))}
                    placeholder="-- Select an option --"
                  />
                ) : f.type === 'number' ? (
                  <input
                    type="number"
                    required={f.required}
                    value={demographics[f.id] || ''}
                    onChange={(e) => setDemographics({ ...demographics, [f.id]: Number(e.target.value) })}
                    className="w-full bg-cogni-card border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                  />
                ) : (
                  <input
                    type="text"
                    required={f.required}
                    value={demographics[f.id] || ''}
                    onChange={(e) => setDemographics({ ...demographics, [f.id]: e.target.value })}
                    className="w-full bg-cogni-card border border-slate-700 rounded-xl px-3.5 py-2.5 text-slate-100 focus:outline-none focus:border-brand-500"
                  />
                )}
              </div>
            ))}
          </div>

          <button
            type="submit"
            className="w-full py-3 bg-brand-600 hover:bg-brand-500 text-white text-sm font-bold rounded-xl shadow-xl transition-all"
          >
            Continue to Environment Check
          </button>
        </form>
      </div>
    );
  }

  // Step: Preflight Environment & Timing Diagnostics
  if (step === 'preflight') {
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-4">
        <ParticipantPreflight
          studyName={studyInfo?.name || 'Cognitive Study'}
          preflightConfig={studyInfo?.preflight_config || {}}
          onProceed={() => initializeSession(demographics)}
        />
      </div>
    );
  }

  // Step: Fullscreen Prompt
  if (step === 'fullscreen_prompt') {
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col items-center justify-center p-6 text-center">
        <div className="max-w-md w-full bg-cogni-panel border border-slate-700/80 rounded-3xl p-8 space-y-6 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-brand-500/20 text-brand-400 border border-brand-500/30 flex items-center justify-center mx-auto">
            <Maximize2 className="w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-slate-100">Fullscreen Mode</h2>
          <p className="text-slate-300 text-sm leading-relaxed">
            To ensure reliable browser timing and minimize visual distractions, this experiment runs
            in fullscreen mode.
          </p>
          <button
            onClick={handleEnterFullscreen}
            className="w-full py-3.5 bg-brand-600 hover:bg-brand-500 text-white font-bold rounded-xl shadow-xl transition-all transform hover:-translate-y-0.5"
          >
            Enter Fullscreen & Begin
          </button>
        </div>
      </div>
    );
  }

  // Step: Experiment Execution
  if (step === 'experiment' && session) {
    return (
      <div className="min-h-screen bg-cogni-dark flex flex-col justify-between select-none">
        {/* Minimal header */}
        <div className="h-10 px-4 flex items-center justify-between text-xs text-slate-500 border-b border-slate-800/40">
          <span className="font-mono">{session.participant_id}</span>
          <button
            onClick={handleWithdraw}
            className="hover:text-rose-400 transition-colors text-[11px]"
          >
            Withdraw from Study
          </button>
        </div>

        {/* Experiment runner engine */}
        <div className="flex-1 flex items-center justify-center p-6">
          <ExperimentRunner
            definition={session.definition}
            sessionId={session.session_id}
            previewMode={false}
            onComplete={async () => {
              await participantApi.completeSession(session.session_id, false);
              setStep('completed');
              if (document.fullscreenElement) {
                document.exitFullscreen().catch(() => {});
              }
            }}
            onWithdraw={handleWithdraw}
          />
        </div>

        {/* Minimal footer */}
        <div className="h-8 px-4 flex items-center justify-center text-[10px] text-slate-600">
          Cognera Experiment Runtime • High-Resolution Browser Clock
        </div>
      </div>
    );
  }

  return null;
};
