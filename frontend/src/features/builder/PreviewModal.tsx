import React from 'react';
import { Modal } from '../../components/Modal';
import { ExperimentDefinition } from '../../types/experiment';
import { ExperimentRunner } from '../../experiment-engine/ExperimentRunner';

interface PreviewModalProps {
  isOpen: boolean;
  onClose: () => void;
  definition: ExperimentDefinition;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  onClose,
  definition,
}) => {
  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Preview: ${definition.name}`}
      maxWidth="max-w-5xl"
    >
      <div className="min-h-[550px] bg-cogni-dark border border-slate-800 rounded-2xl p-6 flex flex-col justify-center items-center shadow-inner relative">
        <ExperimentRunner
          definition={definition}
          previewMode={true}
          sessionId="preview-session-id"
          onComplete={() => {}}
        />
      </div>
    </Modal>
  );
};
