import React from 'react';
import { ExperimentNode, ExperimentEdge, NodeType } from '../../types/experiment';
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
  ArrowDown,
  ChevronUp,
  ChevronDown,
  Trash2,
} from 'lucide-react';

const nodeIcons: Record<NodeType | string, React.ComponentType<{ className?: string }>> = {
  start: Play,
  instructions: FileText,
  fixation: Plus,
  stimulus: ImageIcon,
  response: Keyboard,
  condition: GitBranch,
  feedback: Sparkles,
  completion: CheckCircle2,
};

const nodeColors: Record<NodeType | string, string> = {
  start: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/40',
  instructions: 'text-blue-400 bg-blue-500/10 border-blue-500/40',
  fixation: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/40',
  stimulus: 'text-purple-400 bg-purple-500/10 border-purple-500/40',
  response: 'text-amber-400 bg-amber-500/10 border-amber-500/40',
  condition: 'text-cyan-400 bg-cyan-500/10 border-cyan-500/40',
  feedback: 'text-pink-400 bg-pink-500/10 border-pink-500/40',
  completion: 'text-teal-400 bg-teal-500/10 border-teal-500/40',
};

interface TimelineViewProps {
  nodes: ExperimentNode[];
  edges: ExperimentEdge[];
  selectedNodeId: string | null;
  onSelectNode: (node: ExperimentNode) => void;
  onReorderNodes: (reordered: ExperimentNode[]) => void;
  onDeleteNode: (nodeId: string) => void;
}

export const TimelineView: React.FC<TimelineViewProps> = ({
  nodes,
  selectedNodeId,
  onSelectNode,
  onReorderNodes,
  onDeleteNode,
}) => {
  const moveNode = (index: number, direction: 'up' | 'down') => {
    if (direction === 'up' && index === 0) return;
    if (direction === 'down' && index === nodes.length - 1) return;

    const newNodes = [...nodes];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    const temp = newNodes[index];
    newNodes[index] = newNodes[targetIndex];
    newNodes[targetIndex] = temp;
    onReorderNodes(newNodes);
  };

  return (
    <div className="flex-1 h-full overflow-y-auto p-8 flex flex-col items-center">
      <div className="max-w-xl w-full space-y-3">
        {nodes.map((node, index) => {
          const Icon = nodeIcons[node.type] || ImageIcon;
          const colorClass = nodeColors[node.type] || nodeColors.stimulus;
          const isSelected = node.id === selectedNodeId;
          const props = node.props || {};

          return (
            <React.Fragment key={node.id}>
              {/* Node Card */}
              <div
                onClick={() => onSelectNode(node)}
                className={`relative flex items-center justify-between p-4 rounded-2xl border transition-all cursor-pointer bg-cogni-panel/80 backdrop-blur-sm ${
                  isSelected
                    ? 'border-brand-400 ring-2 ring-brand-500/30 shadow-xl shadow-brand-500/10 -translate-y-0.5'
                    : 'border-slate-800 hover:border-slate-700 hover:bg-cogni-card/50'
                }`}
              >
                <div className="flex items-center gap-3.5 flex-1 min-w-0">
                  <div
                    className={`w-10 h-10 rounded-xl flex items-center justify-center border ${colorClass}`}
                  >
                    <Icon className="w-5 h-5" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono text-slate-400">
                        #{index + 1}
                      </span>
                      <h4 className="text-sm font-bold text-slate-100 truncate">
                        {node.label}
                      </h4>
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-400 mt-1">
                      <span className="uppercase text-[10px] tracking-wider font-mono font-semibold text-slate-400">
                        {node.type}
                      </span>

                      {props.duration_ms && (
                        <span className="flex items-center gap-1 font-mono text-slate-300">
                          <Clock className="w-3 h-3 text-slate-400" /> {props.duration_ms}ms
                        </span>
                      )}

                      {props.stimulus_content && (
                        <span className="truncate max-w-[150px] font-mono text-purple-300">
                          "{props.stimulus_content}"
                        </span>
                      )}

                      {props.allowed_keys && (
                        <span className="font-mono text-amber-300">
                          Keys: {props.allowed_keys.join(', ')}
                        </span>
                      )}

                      {node.type === 'condition' && (
                        <span className="font-mono text-cyan-300">
                          IF {props.condition_variable || 'is_correct'}{' '}
                          {props.condition_operator || '=='} {String(props.condition_value ?? 'true')}
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Actions */}
                <div
                  className="flex items-center gap-1 ml-4"
                  onClick={(e) => e.stopPropagation()}
                >
                  <button
                    disabled={index === 0}
                    onClick={() => moveNode(index, 'up')}
                    className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-700/40 transition-colors"
                    title="Move step up"
                  >
                    <ChevronUp className="w-4 h-4" />
                  </button>
                  <button
                    disabled={index === nodes.length - 1}
                    onClick={() => moveNode(index, 'down')}
                    className="p-1.5 text-slate-400 hover:text-slate-100 disabled:opacity-30 disabled:hover:text-slate-400 rounded-lg hover:bg-slate-700/40 transition-colors"
                    title="Move step down"
                  >
                    <ChevronDown className="w-4 h-4" />
                  </button>
                  {node.type !== 'start' && (
                    <button
                      onClick={() => onDeleteNode(node.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-400 rounded-lg hover:bg-rose-500/10 transition-colors"
                      title="Delete step"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                </div>
              </div>

              {/* Connecting Down Arrow between sequence steps */}
              {index < nodes.length - 1 && (
                <div className="flex justify-center py-1 text-slate-600">
                  <ArrowDown className="w-4 h-4 animate-pulse" />
                </div>
              )}
            </React.Fragment>
          );
        })}
      </div>
    </div>
  );
};
