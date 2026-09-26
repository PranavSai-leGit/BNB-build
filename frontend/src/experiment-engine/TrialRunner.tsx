import React, { useEffect, useRef, useState } from 'react';
import { ExperimentNode } from '../types/experiment';
import { StimulusRenderer } from './StimulusRenderer';
import { TimingEngine } from './TimingEngine';
import { ResponseCollector, ResponseCaptureResult } from './ResponseCollector';
import { TrialTimingData, TrialResponseData } from '../types/session';

interface TrialRunnerProps {
  node: ExperimentNode;
  sequenceNumber: number;
  onComplete: (data: {
    responseData: TrialResponseData;
    timingData: TrialTimingData;
  }) => void;
  previewMode?: boolean;
}

export const TrialRunner: React.FC<TrialRunnerProps> = ({
  node,
  onComplete,
  previewMode = false,
}) => {
  const timing = TimingEngine.getInstance();
  const collectorRef = useRef(new ResponseCollector());
  const [stimulusPresented, setStimulusPresented] = useState(false);
  const [timeoutWarning, setTimeoutWarning] = useState(false);
  const presentationTimestampRef = useRef<number>(0);

  const props = node.props || {};

  useEffect(() => {
    let isCancelled = false;
    const requestTimestamp = timing.now();

    // VSYNC synchronization: commit DOM paint before starting reaction-time clock
    timing.waitForNextFrame().then((presentedTimestamp) => {
      if (isCancelled) return;
      presentationTimestampRef.current = presentedTimestamp;
      setStimulusPresented(true);

      // Node Type 1: Timed display (Fixation, Blank, Stimulus with fixed duration)
      if (
        (node.type === 'fixation' || node.type === 'stimulus' || node.type === 'feedback') &&
        props.duration_ms &&
        props.duration_ms > 0
      ) {
        const timer = setTimeout(() => {
          if (!isCancelled) {
            const endNow = timing.now();
            onComplete({
              responseData: {},
              timingData: {
                stimulus_requested_at: Math.round(requestTimestamp * 100) / 100,
                stimulus_presented_at: Math.round(presentedTimestamp * 100) / 100,
                response_received_at: Math.round(endNow * 100) / 100,
                reaction_time: Math.round((endNow - presentedTimestamp) * 100) / 100,
                frame_drops: 0,
              },
            });
          }
        }, props.duration_ms);

        return () => clearTimeout(timer);
      }

      // Node Type 2: Keyboard Response Collection
      if (node.type === 'response' && props.response_type === 'keyboard') {
        const allowed = props.allowed_keys || ['ArrowLeft', 'ArrowRight'];
        collectorRef.current
          .captureKeyboard(presentedTimestamp, allowed, props.timeout_ms || 3000)
          .then((res: ResponseCaptureResult) => {
            if (isCancelled) return;
            const correctResp = props.correct_response;
            const isCorrect = correctResp ? res.responseKeyOrValue === correctResp : undefined;

            onComplete({
              responseData: {
                key: res.responseKeyOrValue,
                button: res.responseKeyOrValue,
                is_correct: isCorrect,
                accuracy: isCorrect ? 1 : 0,
                timed_out: res.timedOut,
              },
              timingData: {
                stimulus_requested_at: Math.round(requestTimestamp * 100) / 100,
                stimulus_presented_at: Math.round(presentedTimestamp * 100) / 100,
                response_received_at: Math.round(res.responseTimestamp * 100) / 100,
                reaction_time: res.reactionTimeMs,
                frame_drops: 0,
              },
            });
          });
      }
    });

    return () => {
      isCancelled = true;
      collectorRef.current.cleanup();
    };
  }, [node.id]);

  const handleButtonClick = (buttonValue: string) => {
    const presented = presentationTimestampRef.current || timing.now();
    const res = collectorRef.current.recordButtonClick(buttonValue, presented);
    const correctResp = props.correct_response;
    const isCorrect = correctResp ? buttonValue === correctResp : undefined;

    onComplete({
      responseData: {
        button: buttonValue,
        choice: buttonValue,
        is_correct: isCorrect,
        accuracy: isCorrect ? 1 : 0,
      },
      timingData: {
        stimulus_requested_at: Math.round(presented * 100) / 100,
        stimulus_presented_at: Math.round(presented * 100) / 100,
        response_received_at: Math.round(res.responseTimestamp * 100) / 100,
        reaction_time: res.reactionTimeMs,
      },
    });
  };

  // 1. Fixation cross
  if (node.type === 'fixation') {
    return <StimulusRenderer type="fixation" />;
  }

  // 2. Stimulus (Text or Image)
  if (node.type === 'stimulus') {
    return (
      <StimulusRenderer
        type={props.stimulus_type || 'text'}
        content={props.stimulus_content}
        url={props.stimulus_url}
        customStyle={props.custom}
      />
    );
  }

  // 3. Response Node: On-screen buttons or multiple choice
  if (node.type === 'response') {
    if (props.response_type === 'button' || props.response_type === 'multi_choice') {
      const options = props.options || ['Option A', 'Option B'];
      return (
        <div className="flex flex-col items-center justify-center p-8 max-w-xl mx-auto space-y-6">
          <h2 className="text-2xl font-bold text-slate-100">
            {props.title || 'Please select your response:'}
          </h2>
          <div className="grid grid-cols-2 gap-4 w-full">
            {options.map((opt) => (
              <button
                key={opt}
                onClick={() => handleButtonClick(opt)}
                className="py-4 px-6 bg-cogni-panel border border-brand-500/30 hover:border-brand-400 hover:bg-brand-500/20 text-slate-100 font-semibold text-lg rounded-xl shadow-lg transition-all transform hover:-translate-y-0.5 active:translate-y-0"
              >
                {opt}
              </button>
            ))}
          </div>
        </div>
      );
    }

    // Keyboard response prompt indicator
    const allowed = props.allowed_keys || ['ArrowLeft', 'ArrowRight'];
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center space-y-6">
        <div className="w-16 h-16 rounded-full border-4 border-brand-500 border-t-transparent animate-spin mx-auto mb-2 opacity-60" />
        <h3 className="text-2xl font-medium text-slate-200">
          Awaiting response...
        </h3>
        <div className="flex items-center gap-3">
          {allowed.map((k) => (
            <span
              key={k}
              className="px-4 py-2 bg-cogni-card border border-slate-700 rounded-lg text-slate-300 font-mono text-sm shadow"
            >
              {k === 'ArrowLeft' ? '← Left' : k === 'ArrowRight' ? 'Right →' : k}
            </span>
          ))}
        </div>
      </div>
    );
  }

  // 4. Feedback Node
  if (node.type === 'feedback') {
    const isCorrect = props.custom?.lastIsCorrect ?? true;
    return (
      <div className="flex items-center justify-center min-h-[360px]">
        <div
          className={`px-8 py-4 rounded-2xl text-2xl font-extrabold shadow-xl ${
            isCorrect
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/40'
              : 'bg-rose-500/20 text-rose-400 border border-rose-500/40'
          }`}
        >
          {isCorrect
            ? props.feedback_text_correct || 'Correct (+1)'
            : props.feedback_text_incorrect || 'Incorrect'}
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 text-center text-slate-400">
      Node {node.label} ({node.type})
    </div>
  );
};
