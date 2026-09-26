import React, { useState, useEffect, useRef } from 'react';
import confetti from 'canvas-confetti';
import { ExperimentDefinition, ExperimentNode } from '../types/experiment';
import { TrialRunner } from './TrialRunner';
import { ConditionEvaluator, TrialStateContext } from './ConditionEvaluator';
import { RandomizationEngine } from './RandomizationEngine';
import { EventLogger } from './EventLogger';
import { TrialResponseData, TrialTimingData } from '../types/session';
import { TimingEngine } from './TimingEngine';
import { CheckCircle2, Play, AlertCircle, RefreshCw, Eye, ArrowRight } from 'lucide-react';

interface ExperimentRunnerProps {
  definition: ExperimentDefinition;
  sessionId?: string;
  previewMode?: boolean;
  onComplete?: () => void;
  onWithdraw?: () => void;
}

export const ExperimentRunner: React.FC<ExperimentRunnerProps> = ({
  definition,
  sessionId = 'preview-session-id',
  previewMode = false,
  onComplete,
  onWithdraw,
}) => {
  const [currentNodeId, setCurrentNodeId] = useState<string>('');
  const [sequenceNumber, setSequenceNumber] = useState<number>(1);
  const [executionLog, setExecutionLog] = useState<
    Array<{ node: ExperimentNode; response: TrialResponseData; timing: TrialTimingData }>
  >([]);
  const [isFinished, setIsFinished] = useState<boolean>(false);
  const [trialContext, setTrialContext] = useState<TrialStateContext>({
    variables: {},
    trialSequence: 1,
  });

  const eventLoggerRef = useRef<EventLogger | null>(null);

  // Initialize nodes map and start node
  const nodesMap = useRef<Map<string, ExperimentNode>>(new Map());
  const edgesMap = useRef<Map<string, Array<{ to: string; branch?: string }>>>(new Map());

  useEffect(() => {
    if (!previewMode && sessionId) {
      eventLoggerRef.current = new EventLogger(sessionId);
    }

    // Map nodes
    const nMap = new Map<string, ExperimentNode>();
    (definition.nodes || []).forEach((n) => nMap.set(n.id, n));
    nodesMap.current = nMap;

    // Map edges
    const eMap = new Map<string, Array<{ to: string; branch?: string }>>();
    (definition.edges || []).forEach((e) => {
      const from = (e as any).from || (e as any).from_node;
      const to = (e as any).to || (e as any).to_node;
      if (from && to) {
        const existing = eMap.get(from) || [];
        existing.push({ to, branch: e.branch || 'default' });
        eMap.set(from, existing);
      }
    });
    edgesMap.current = eMap;

    // Find start node
    const startNode = (definition.nodes || []).find((n) => n.type === 'start') || definition.nodes?.[0];
    if (startNode) {
      // Advance immediately from start node to its child
      const outgoing = eMap.get(startNode.id);
      if (outgoing && outgoing.length > 0) {
        setCurrentNodeId(outgoing[0].to);
      } else {
        setCurrentNodeId(startNode.id);
      }
    }
  }, [definition, sessionId]);

  const currentNode = nodesMap.current.get(currentNodeId);

  // Determine next node based on condition/branch
  const advanceToNextNode = (
    currentId: string,
    responseData: TrialResponseData = {},
    timingData: TrialTimingData = { stimulus_requested_at: 0, stimulus_presented_at: 0 }
  ) => {
    const outgoing = edgesMap.current.get(currentId) || [];

    // Update execution history
    const thisNode = nodesMap.current.get(currentId);
    if (thisNode) {
      setExecutionLog((prev) => [
        ...prev,
        { node: thisNode, response: responseData, timing: timingData },
      ]);
    }

    // Update trial context variables
    const updatedContext: TrialStateContext = {
      lastResponse: responseData,
      variables: {
        ...trialContext.variables,
        ...(responseData.is_correct !== undefined ? { is_correct: responseData.is_correct } : {}),
        ...(responseData.key ? { last_key: responseData.key } : {}),
        ...(timingData.reaction_time ? { reaction_time: timingData.reaction_time } : {}),
      },
      trialSequence: sequenceNumber + 1,
    };
    setTrialContext(updatedContext);

    // Record to EventLogger if not preview
    if (!previewMode && eventLoggerRef.current && thisNode && (thisNode.type === 'response' || thisNode.type === 'stimulus')) {
      eventLoggerRef.current.logEvent({
        trial_id: thisNode.id,
        sequence_number: sequenceNumber,
        condition: (thisNode.props as any)?.condition || thisNode.props?.custom?.condition,
        stimulus_id: thisNode.props?.stimulus_content || thisNode.id,
        response_data: responseData,
        timing_data: timingData,
      });
    }

    if (outgoing.length === 0) {
      // Reached end of experiment
      setIsFinished(true);
      if (!previewMode && eventLoggerRef.current) {
        eventLoggerRef.current.flush();
      }
      try {
        confetti({ particleCount: 75, spread: 60, origin: { y: 0.6 } });
      } catch {}
      if (onComplete) onComplete();
      return;
    }

    // Branch resolution: If current node is a Condition node, evaluate rules
    if (thisNode?.type === 'condition') {
      const varName = thisNode.props?.condition_variable || 'is_correct';
      const op = thisNode.props?.condition_operator || '==';
      const targetVal = thisNode.props?.condition_value ?? true;

      const conditionResult = ConditionEvaluator.evaluate(varName, op, targetVal, updatedContext);
      const branchTarget = conditionResult ? 'true' : 'false';

      const matchingEdge =
        outgoing.find((e) => e.branch === branchTarget) ||
        outgoing.find((e) => e.branch === 'default') ||
        outgoing[0];

      setCurrentNodeId(matchingEdge.to);
      setSequenceNumber((s) => s + 1);
      return;
    }

    // Normal progression
    const nextEdge = outgoing[0];
    const nextNode = nodesMap.current.get(nextEdge.to);

    if (nextNode && nextNode.type === 'completion') {
      setIsFinished(true);
      if (!previewMode && eventLoggerRef.current) {
        eventLoggerRef.current.flush();
      }
      try {
        confetti({ particleCount: 80, spread: 70, origin: { y: 0.6 } });
      } catch {}
      if (onComplete) onComplete();
    }

    setCurrentNodeId(nextEdge.to);
    setSequenceNumber((s) => s + 1);
  };

  const handleRestart = () => {
    const startNode = (definition.nodes || []).find((n) => n.type === 'start') || definition.nodes?.[0];
    if (startNode) {
      const outgoing = edgesMap.current.get(startNode.id);
      if (outgoing && outgoing.length > 0) {
        setCurrentNodeId(outgoing[0].to);
      } else {
        setCurrentNodeId(startNode.id);
      }
    }
    setSequenceNumber(1);
    setExecutionLog([]);
    setIsFinished(false);
  };

  // If experiment finished or completion node reached
  if (isFinished || currentNode?.type === 'completion') {
    const completionProps = currentNode?.props || {};
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 max-w-2xl mx-auto text-center space-y-6 animate-fade-in">
        <div className="w-20 h-20 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 flex items-center justify-center mx-auto shadow-2xl">
          <CheckCircle2 className="w-10 h-10" />
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">
          {completionProps.title || 'Experiment Completed'}
        </h1>
        <p className="text-slate-300 text-lg leading-relaxed">
          {completionProps.instructions ||
            'Thank you for your valuable participation in this cognitive study! Your responses have been securely logged.'}
        </p>

        {previewMode && (
          <div className="pt-4 flex items-center justify-center gap-4">
            <button
              onClick={handleRestart}
              className="inline-flex items-center gap-2 px-5 py-2.5 bg-brand-600 hover:bg-brand-500 text-white rounded-xl font-medium shadow-lg transition-all"
            >
              <RefreshCw className="w-4 h-4" /> Restart Preview
            </button>
          </div>
        )}
      </div>
    );
  }

  // Instructions screen
  if (currentNode?.type === 'instructions') {
    const instrProps = currentNode.props || {};
    return (
      <div className="min-h-[500px] flex flex-col items-center justify-center p-8 max-w-2xl mx-auto text-center space-y-8 animate-fade-in">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/10 border border-brand-500/20 text-brand-300 text-xs font-semibold uppercase tracking-wider">
          Study Instructions
        </div>
        <h1 className="text-3xl font-extrabold text-slate-100">
          {instrProps.title || 'Instructions'}
        </h1>
        <div className="text-slate-300 text-lg leading-relaxed text-left bg-cogni-panel p-6 rounded-2xl border border-slate-700/60 shadow-inner whitespace-pre-line">
          {instrProps.instructions ||
            'Please read the task directions carefully before starting. Press the button below when you are ready to begin.'}
        </div>
        <button
          onClick={() => advanceToNextNode(currentNode.id, {}, { stimulus_requested_at: 0, stimulus_presented_at: 0 })}
          className="inline-flex items-center gap-2 px-8 py-3.5 bg-brand-600 hover:bg-brand-500 text-white text-lg font-bold rounded-xl shadow-xl transition-all transform hover:-translate-y-0.5 active:translate-y-0"
        >
          Begin Experiment <ArrowRight className="w-5 h-5" />
        </button>
      </div>
    );
  }

  // Active Trial Execution
  return (
    <div className="relative w-full flex flex-col items-center justify-center min-h-[500px]">
      {/* Researcher Preview Diagnostic HUD */}
      {previewMode && (
        <div className="w-full bg-cogni-panel/90 border-b border-slate-700/70 p-3 px-6 flex items-center justify-between text-xs text-slate-300 backdrop-blur-md mb-6 rounded-xl">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1.5 font-semibold text-brand-400">
              <Eye className="w-4 h-4" /> PREVIEW MODE
            </span>
            <span>
              Active Node: <strong className="text-slate-100 font-mono">{currentNodeId}</strong> ({currentNode?.type})
            </span>
            <span>
              Sequence: <strong className="text-slate-100">{sequenceNumber}</strong>
            </span>
          </div>

          <div className="flex items-center gap-3">
            {executionLog.length > 0 && (
              <span className="text-emerald-400 font-mono">
                Last RT: {executionLog[executionLog.length - 1].timing.reaction_time ?? 0}ms
              </span>
            )}
            <button
              onClick={handleRestart}
              className="flex items-center gap-1 text-slate-400 hover:text-slate-100 transition-colors"
            >
              <RefreshCw className="w-3.5 h-3.5" /> Restart
            </button>
          </div>
        </div>
      )}

      {currentNode ? (
        <TrialRunner
          node={currentNode}
          sequenceNumber={sequenceNumber}
          previewMode={previewMode}
          onComplete={({ responseData, timingData }) => {
            advanceToNextNode(currentNode.id, responseData, timingData);
          }}
        />
      ) : (
        <div className="text-slate-400">Loading trial...</div>
      )}
    </div>
  );
};
