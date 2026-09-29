import React from 'react';
import { ExperimentNode } from '../../types/experiment';
import { Trash2, Copy, Settings2 } from 'lucide-react';
import { Select } from '../../components/Select';

interface NodePropertiesPanelProps {
  selectedNode: ExperimentNode | null;
  onUpdateNode: (updatedNode: ExperimentNode) => void;
  onDeleteNode: (nodeId: string) => void;
  onDuplicateNode: (nodeId: string) => void;
}

export const NodePropertiesPanel: React.FC<NodePropertiesPanelProps> = ({
  selectedNode,
  onUpdateNode,
  onDeleteNode,
  onDuplicateNode,
}) => {
  if (!selectedNode) {
    return (
      <div className="w-80 bg-cogni-panel border-l border-slate-800 p-6 flex flex-col items-center justify-center text-center text-slate-400">
        <Settings2 className="w-10 h-10 text-slate-600 mb-3" />
        <h4 className="text-sm font-semibold text-slate-300">No Node Selected</h4>
        <p className="text-xs text-slate-400 mt-1 max-w-[200px]">
          Click on any node in the timeline or canvas to view and configure its properties.
        </p>
      </div>
    );
  }

  const props = selectedNode.props || {};

  const handlePropChange = (key: string, value: any) => {
    onUpdateNode({
      ...selectedNode,
      props: {
        ...props,
        [key]: value,
      },
    });
  };

  const handleLabelChange = (newLabel: string) => {
    onUpdateNode({
      ...selectedNode,
      label: newLabel,
    });
  };

  return (
    <div className="w-80 bg-cogni-panel border-l border-slate-800 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-4 border-b border-slate-800 bg-cogni-card/30 flex items-center justify-between">
        <div>
          <span className="text-[10px] font-mono uppercase tracking-wider text-brand-400 font-semibold">
            {selectedNode.type} Node
          </span>
          <h3 className="text-sm font-bold text-slate-100 truncate max-w-[170px]">
            {selectedNode.label}
          </h3>
        </div>
        <div className="flex items-center gap-1">
          <button
            onClick={() => onDuplicateNode(selectedNode.id)}
            title="Duplicate node"
            className="p-1.5 text-slate-400 hover:text-slate-100 hover:bg-slate-700/50 rounded-lg transition-colors"
          >
            <Copy className="w-4 h-4" />
          </button>
          {selectedNode.type !== 'start' && (
            <button
              onClick={() => onDeleteNode(selectedNode.id)}
              title="Delete node"
              className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-rose-500/10 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Properties Form */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4 text-xs">
        {/* Node Label */}
        <div>
          <label className="block text-slate-300 font-semibold mb-1">Node Label</label>
          <input
            type="text"
            value={selectedNode.label}
            onChange={(e) => handleLabelChange(e.target.value)}
            className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 transition-colors"
          />
        </div>

        {/* Node-specific properties */}

        {/* 1. Timed Display / Fixation */}
        {(selectedNode.type === 'fixation' ||
          selectedNode.type === 'stimulus' ||
          selectedNode.type === 'feedback') && (
          <div>
            <label className="block text-slate-300 font-semibold mb-1">
              Duration (Milliseconds)
            </label>
            <input
              type="number"
              min="0"
              step="50"
              value={props.duration_ms ?? 500}
              onChange={(e) => handlePropChange('duration_ms', Number(e.target.value))}
              className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
            />
            <p className="text-[10px] text-slate-400 mt-1">
              Synchronized to nearest refresh frame via requestAnimationFrame
            </p>
          </div>
        )}

        {/* 2. Stimulus Content */}
        {selectedNode.type === 'stimulus' && (
          <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Stimulus Type
              </label>
              <Select
                value={props.stimulus_type || 'text'}
                onChange={(val) => handlePropChange('stimulus_type', val)}
                options={[
                  { value: 'text', label: 'Text / Word' },
                  { value: 'image', label: 'Image Asset' },
                  { value: 'blank', label: 'Blank Screen' },
                ]}
              />
            </div>

            {props.stimulus_type !== 'image' && props.stimulus_type !== 'blank' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Text Content
                </label>
                <input
                  type="text"
                  value={props.stimulus_content || ''}
                  onChange={(e) => handlePropChange('stimulus_content', e.target.value)}
                  placeholder="e.g. RED, TARGET, 42"
                  className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            {props.stimulus_type === 'image' && (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Image URL / Asset Path
                </label>
                <input
                  type="text"
                  value={props.stimulus_url || ''}
                  onChange={(e) => handlePropChange('stimulus_url', e.target.value)}
                  placeholder="https://... or uploaded stimulus URL"
                  className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono text-[11px]"
                />
              </div>
            )}
          </>
        )}

        {/* 3. Instructions */}
        {selectedNode.type === 'instructions' && (
          <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">Title</label>
              <input
                type="text"
                value={props.title || ''}
                onChange={(e) => handlePropChange('title', e.target.value)}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Instruction Text
              </label>
              <textarea
                rows={4}
                value={props.instructions || ''}
                onChange={(e) => handlePropChange('instructions', e.target.value)}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </>
        )}

        {/* 4. Response Node */}
        {selectedNode.type === 'response' && (
          <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Response Mechanism
              </label>
              <Select
                value={props.response_type || 'keyboard'}
                onChange={(val) => handlePropChange('response_type', val)}
                options={[
                  { value: 'keyboard', label: 'Keyboard Keypress' },
                  { value: 'button', label: 'On-Screen Buttons / Choices' },
                ]}
              />
            </div>

            {props.response_type === 'keyboard' ? (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Allowed Keys (comma separated)
                </label>
                <input
                  type="text"
                  value={(props.allowed_keys || []).join(', ')}
                  onChange={(e) =>
                    handlePropChange(
                      'allowed_keys',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="ArrowLeft, ArrowRight, Space"
                  className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
                />
              </div>
            ) : (
              <div>
                <label className="block text-slate-300 font-semibold mb-1">
                  Options (comma separated)
                </label>
                <input
                  type="text"
                  value={(props.options || []).join(', ')}
                  onChange={(e) =>
                    handlePropChange(
                      'options',
                      e.target.value.split(',').map((s) => s.trim()).filter(Boolean)
                    )
                  }
                  placeholder="Option A, Option B"
                  className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
                />
              </div>
            )}

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Correct Response (for Accuracy score)
              </label>
              <input
                type="text"
                value={props.correct_response || ''}
                onChange={(e) => handlePropChange('correct_response', e.target.value)}
                placeholder="e.g. ArrowLeft"
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Timeout (Milliseconds)
              </label>
              <input
                type="number"
                min="500"
                step="500"
                value={props.timeout_ms || 2500}
                onChange={(e) => handlePropChange('timeout_ms', Number(e.target.value))}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </>
        )}

        {/* 5. Condition Node */}
        {selectedNode.type === 'condition' && (
          <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Variable to Compare
              </label>
              <input
                type="text"
                value={props.condition_variable || 'is_correct'}
                onChange={(e) => handlePropChange('condition_variable', e.target.value)}
                placeholder="is_correct, reaction_time, key"
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">Operator</label>
              <Select
                value={props.condition_operator || '=='}
                onChange={(val) => handlePropChange('condition_operator', val)}
                options={[
                  { value: '==', label: '== (Equals)' },
                  { value: '!=', label: '!= (Not Equals)' },
                  { value: '>', label: '> (Greater Than)' },
                  { value: '<', label: '< (Less Than)' },
                  { value: '>=', label: '>= (Greater or Equal)' },
                  { value: '<=', label: '<= (Less or Equal)' },
                ]}
              />
            </div>

            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Target Value
              </label>
              <input
                type="text"
                value={String(props.condition_value ?? 'true')}
                onChange={(e) => handlePropChange('condition_value', e.target.value)}
                placeholder="true, false, or 400"
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500 font-mono"
              />
            </div>
          </>
        )}

        {/* 6. Feedback Node */}
        {selectedNode.type === 'feedback' && (
          <>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Correct Message
              </label>
              <input
                type="text"
                value={props.feedback_text_correct || 'Correct!'}
                onChange={(e) => handlePropChange('feedback_text_correct', e.target.value)}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
            <div>
              <label className="block text-slate-300 font-semibold mb-1">
                Incorrect Message
              </label>
              <input
                type="text"
                value={props.feedback_text_incorrect || 'Incorrect'}
                onChange={(e) => handlePropChange('feedback_text_incorrect', e.target.value)}
                className="w-full bg-cogni-card border border-slate-700 rounded-lg px-3 py-2 text-slate-100 focus:outline-none focus:border-brand-500"
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
};
