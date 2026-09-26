import React from 'react';
import {
  Plus,
  Type,
  Image as ImageIcon,
  Square,
  FileText,
  Keyboard,
  MousePointer,
  GitBranch,
  Sparkles,
  CheckCircle2,
} from 'lucide-react';
import { NodeType } from '../../types/experiment';

interface ComponentTemplate {
  type: NodeType;
  label: string;
  description: string;
  icon: React.ComponentType<{ className?: string }>;
  defaultProps: Record<string, any>;
}

interface ComponentLibraryProps {
  onAddComponent: (template: ComponentTemplate) => void;
}

export const ComponentLibrary: React.FC<ComponentLibraryProps> = ({ onAddComponent }) => {
  const sections: Array<{ title: string; items: ComponentTemplate[] }> = [
    {
      title: 'Display & Stimuli',
      items: [
        {
          type: 'fixation',
          label: 'Fixation Cross',
          description: 'Center cross hair for visual gaze alignment',
          icon: Plus,
          defaultProps: { duration_ms: 500 },
        },
        {
          type: 'stimulus',
          label: 'Text Stimulus',
          description: 'Word, number, or symbol on high-contrast display',
          icon: Type,
          defaultProps: {
            stimulus_type: 'text',
            stimulus_content: 'TARGET',
            duration_ms: 1000,
          },
        },
        {
          type: 'stimulus',
          label: 'Image Stimulus',
          description: 'High-res image stimulus from uploaded assets',
          icon: ImageIcon,
          defaultProps: {
            stimulus_type: 'image',
            stimulus_url: 'https://images.unsplash.com/photo-1507525428034-b723cf961d3e?w=600&auto=format&fit=crop&q=80',
            duration_ms: 1000,
          },
        },
        {
          type: 'stimulus',
          label: 'Blank Screen (ISI)',
          description: 'Inter-stimulus interval pause',
          icon: Square,
          defaultProps: { stimulus_type: 'blank', duration_ms: 300 },
        },
        {
          type: 'instructions',
          label: 'Instructions',
          description: 'Task instructions and directions screen',
          icon: FileText,
          defaultProps: {
            title: 'Task Directions',
            instructions: 'Observe the target stimulus and respond as quickly and accurately as possible.',
          },
        },
      ],
    },
    {
      title: 'Responses & Inputs',
      items: [
        {
          type: 'response',
          label: 'Keyboard Response',
          description: 'Millisecond reaction time capture from keys',
          icon: Keyboard,
          defaultProps: {
            response_type: 'keyboard',
            allowed_keys: ['ArrowLeft', 'ArrowRight'],
            correct_response: 'ArrowLeft',
            timeout_ms: 2500,
          },
        },
        {
          type: 'response',
          label: 'Button Response',
          description: 'On-screen clickable buttons or multiple choice',
          icon: MousePointer,
          defaultProps: {
            response_type: 'button',
            options: ['Option A', 'Option B'],
            correct_response: 'Option A',
            timeout_ms: 5000,
          },
        },
      ],
    },
    {
      title: 'Logic & Feedback',
      items: [
        {
          type: 'condition',
          label: 'IF / ELSE Condition',
          description: 'Branch trial progression based on accuracy or RT',
          icon: GitBranch,
          defaultProps: {
            condition_variable: 'is_correct',
            condition_operator: '==',
            condition_value: true,
          },
        },
        {
          type: 'feedback',
          label: 'Trial Feedback',
          description: 'Visual feedback badge (Correct / Incorrect)',
          icon: Sparkles,
          defaultProps: {
            feedback_text_correct: 'Correct!',
            feedback_text_incorrect: 'Incorrect',
            feedback_duration_ms: 600,
          },
        },
        {
          type: 'completion',
          label: 'Completion Screen',
          description: 'Study debrief and thank-you screen',
          icon: CheckCircle2,
          defaultProps: {
            title: 'Experiment Completed',
            instructions: 'Thank you for your valuable research contribution! Your results have been pseudonymously recorded.',
          },
        },
      ],
    },
  ];

  return (
    <div className="w-72 bg-cogni-panel border-r border-slate-800 flex flex-col h-full overflow-hidden">
      <div className="p-4 border-b border-slate-800 bg-cogni-card/30">
        <h3 className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Component Library
        </h3>
        <p className="text-xs text-slate-400 mt-0.5">Click to add node to experiment</p>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-5">
        {sections.map((section) => (
          <div key={section.title}>
            <h4 className="text-[11px] font-bold uppercase tracking-wider text-slate-400 px-2 mb-2 font-mono">
              {section.title}
            </h4>
            <div className="space-y-1.5">
              {section.items.map((item) => {
                const Icon = item.icon;
                return (
                  <button
                    key={item.label}
                    onClick={() => onAddComponent(item)}
                    className="w-full flex items-start gap-2.5 p-2.5 rounded-xl border border-slate-700/50 bg-cogni-card/60 hover:bg-brand-500/10 hover:border-brand-500/40 text-left transition-all group"
                  >
                    <div className="p-1.5 rounded-lg bg-slate-800 text-brand-400 group-hover:bg-brand-500/20 group-hover:text-brand-300 transition-colors mt-0.5">
                      <Icon className="w-4 h-4" />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="text-xs font-semibold text-slate-200 group-hover:text-slate-100 truncate">
                        {item.label}
                      </div>
                      <div className="text-[11px] text-slate-400 leading-tight line-clamp-1 mt-0.5">
                        {item.description}
                      </div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
