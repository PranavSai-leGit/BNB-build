import React, { memo } from 'react';
import { Handle, Position, NodeProps } from '@xyflow/react';
import {
  Play,
  FileText,
  Plus,
  Image as ImageIcon,
  Keyboard,
  GitBranch,
  Sparkles,
  CheckCircle2,
  Clock,
  Shuffle,
  Sliders,
} from 'lucide-react';
import { NodeType } from '../../types/experiment';

// Visual Category Mapping
export type NodeCategory = 'Start' | 'Display' | 'Timing' | 'Input' | 'Condition' | 'Randomization' | 'End';

export const getNodeCategory = (type: string): NodeCategory => {
  switch (type) {
    case 'start':
      return 'Start';
    case 'instructions':
    case 'stimulus':
      return 'Display';
    case 'fixation':
    case 'blank':
    case 'delay':
      return 'Timing';
    case 'response':
      return 'Input';
    case 'condition':
      return 'Condition';
    case 'randomization':
    case 'block':
      return 'Randomization';
    case 'completion':
      return 'End';
    default:
      return 'Display';
  }
};

const categoryBadgeColors: Record<NodeCategory, { bg: string; text: string; border: string }> = {
  Start: { bg: 'bg-emerald-500/10', text: 'text-emerald-400', border: 'border-emerald-500/30' },
  Display: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/30' },
  Timing: { bg: 'bg-indigo-500/10', text: 'text-indigo-400', border: 'border-indigo-500/30' },
  Input: { bg: 'bg-amber-500/10', text: 'text-amber-400', border: 'border-amber-500/30' },
  Condition: { bg: 'bg-cyan-500/10', text: 'text-cyan-400', border: 'border-cyan-500/30' },
  Randomization: { bg: 'bg-fuchsia-500/10', text: 'text-fuchsia-400', border: 'border-fuchsia-500/30' },
  End: { bg: 'bg-teal-500/10', text: 'text-teal-400', border: 'border-teal-500/30' },
};

const nodeIcons: Record<string, React.ComponentType<{ className?: string }>> = {
  start: Play,
  instructions: FileText,
  fixation: Plus,
  stimulus: ImageIcon,
  response: Keyboard,
  condition: GitBranch,
  randomization: Shuffle,
  feedback: Sparkles,
  completion: CheckCircle2,
  blank: Clock,
  delay: Clock,
};

export const CustomFlowNode: React.FC<NodeProps> = memo(({ data, selected }) => {
  const type = (data?.type as string) || 'stimulus';
  const label = (data?.label as string) || 'Node';
  const props = (data?.props as any) || {};

  const category = getNodeCategory(type);
  const catColor = categoryBadgeColors[category];
  const Icon = nodeIcons[type] || ImageIcon;

  const isCondition = type === 'condition';
  const isStart = type === 'start';
  const isEnd = type === 'completion';

  return (
    <div
      className={`min-w-[210px] max-w-[240px] p-3 rounded-xl border bg-cogni-panel shadow-lg transition-all select-none ${
        selected
          ? 'ring-2 ring-brand-400 border-brand-400 shadow-brand-500/25 -translate-y-0.5'
          : `${catColor.border} hover:border-slate-600`
      }`}
    >
      {/* Incoming Connection Handle */}
      {!isStart && (
        <Handle
          type="target"
          position={Position.Top}
          className="!bg-brand-400 !w-3 !h-3 !-top-1.5 border-2 border-slate-900"
        />
      )}

      {/* Header with Category Badge and Icon */}
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-2 truncate">
          <div className={`p-1.5 rounded-lg ${catColor.bg} ${catColor.text}`}>
            <Icon className="w-3.5 h-3.5" />
          </div>
          <div className="truncate">
            <h4 className="text-xs font-bold text-slate-100 truncate">{label}</h4>
          </div>
        </div>
        <span
          className={`text-[9px] uppercase px-1.5 py-0.5 rounded font-mono font-semibold border ${catColor.bg} ${catColor.text} ${catColor.border}`}
        >
          {category}
        </span>
      </div>

      {/* Node Details Snippet */}
      <div className="pt-2 border-t border-slate-800 text-[11px] text-slate-300 space-y-1">
        {props.duration_ms && (
          <div className="flex items-center gap-1 text-slate-400">
            <Clock className="w-3 h-3 text-slate-500" />
            <span>Duration: <strong className="text-slate-200">{props.duration_ms}ms</strong></span>
          </div>
        )}
        {props.stimulus_content && (
          <div className="truncate text-purple-300 font-mono text-[10px]">
            "{props.stimulus_content}"
          </div>
        )}
        {props.allowed_keys && props.allowed_keys.length > 0 && (
          <div className="text-[10px] font-mono text-amber-300">
            Keys: [{props.allowed_keys.join(', ')}]
          </div>
        )}
        {isCondition && (
          <div className="text-[10px] font-mono text-cyan-300 bg-cyan-950/40 p-1 rounded border border-cyan-800/40">
            IF {props.condition_variable || 'is_correct'} {props.condition_operator || '=='} {props.condition_value ?? 'true'}
          </div>
        )}
        {props.randomize_order && (
          <div className="flex items-center gap-1 text-[10px] text-fuchsia-300">
            <Shuffle className="w-3 h-3" /> Randomized Order
          </div>
        )}
      </div>

      {/* Outgoing Connection Handles */}
      {isCondition ? (
        // Branching Condition Handles (YES / NO)
        <div className="relative mt-3 pt-2 border-t border-slate-800 flex justify-between text-[10px] font-mono font-bold px-2">
          <div className="flex items-center gap-1 text-emerald-400 relative">
            <span>YES</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="true"
              className="!bg-emerald-400 !w-3 !h-3 !-bottom-2.5 !left-3 border-2 border-slate-900"
            />
          </div>
          <div className="flex items-center gap-1 text-rose-400 relative">
            <span>NO</span>
            <Handle
              type="source"
              position={Position.Bottom}
              id="false"
              className="!bg-rose-400 !w-3 !h-3 !-bottom-2.5 !right-3 border-2 border-slate-900"
            />
          </div>
        </div>
      ) : !isEnd ? (
        // Standard Single Output Handle
        <Handle
          type="source"
          position={Position.Bottom}
          id="default"
          className="!bg-brand-400 !w-3 !h-3 !-bottom-1.5 border-2 border-slate-900"
        />
      ) : null}
    </div>
  );
});
