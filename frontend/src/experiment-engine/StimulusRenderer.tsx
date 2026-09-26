import React from 'react';
import { StimulusType } from '../types/experiment';

interface StimulusRendererProps {
  type: StimulusType | string;
  content?: string;
  url?: string;
  customStyle?: Record<string, any>;
}

export const StimulusRenderer: React.FC<StimulusRendererProps> = ({
  type,
  content,
  url,
  customStyle,
}) => {
  if (type === 'fixation') {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[360px]">
        <div className="fixation-cross" aria-label="Fixation cross" />
      </div>
    );
  }

  if (type === 'blank') {
    return <div className="w-full h-full min-h-[360px] bg-cogni-dark" />;
  }

  if (type === 'image' && url) {
    return (
      <div className="flex items-center justify-center w-full h-full min-h-[360px] p-6">
        <img
          src={url}
          alt={content || 'Stimulus'}
          className="max-h-[500px] max-w-[80vw] object-contain rounded-xl shadow-2xl transition-all"
        />
      </div>
    );
  }

  // Text stimulus (e.g. Stroop color words, priming words, numbers)
  const textColor = customStyle?.color || '#f8fafc';
  const fontSize = customStyle?.fontSize || 'text-6xl';

  return (
    <div className="flex flex-col items-center justify-center w-full h-full min-h-[360px] p-8 text-center select-none">
      <div
        className={`font-extrabold tracking-wider ${fontSize} transition-all duration-75`}
        style={{ color: textColor }}
      >
        {content || 'STIMULUS'}
      </div>
    </div>
  );
};
