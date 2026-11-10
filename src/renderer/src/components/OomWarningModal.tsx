import React from 'react';
import { AlertCircle, ArrowRight, X } from 'lucide-react';

interface OomWarningModalProps {
  isOpen: boolean;
  onClose: () => void;
  failedModel: string;
  recommendedModel: string;
  onSwitchModel: (newModel: string) => void;
}

export const OomWarningModal: React.FC<OomWarningModalProps> = ({
  isOpen,
  onClose,
  failedModel,
  recommendedModel,
  onSwitchModel,
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-md border border-amber-300 dark:border-amber-900 shadow-2xl p-6 space-y-4">
        <div className="flex items-start justify-between">
          <div className="w-10 h-10 rounded-full bg-amber-100 dark:bg-amber-950/60 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
            <AlertCircle className="w-5 h-5" />
          </div>
          <button onClick={onClose} className="p-1 text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="space-y-2">
          <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100">
            Out of Memory Warning
          </h3>
          <p className="text-sm text-gray-600 dark:text-gray-300 leading-relaxed">
            This model needs more RAM/VRAM than this PC has. Try <strong>{recommendedModel}</strong> instead.
          </p>
        </div>

        <div className="p-3 rounded-lg bg-gray-100 dark:bg-gray-800 text-xs font-mono text-gray-600 dark:text-gray-400">
          Failed Model: {failedModel}
        </div>

        <div className="flex items-center justify-end gap-2 pt-2">
          <button
            onClick={onClose}
            className="px-3 py-2 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Dismiss
          </button>
          <button
            onClick={() => {
              onSwitchModel(recommendedModel);
              onClose();
            }}
            className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold shadow-sm transition"
          >
            <span>Switch to {recommendedModel}</span>
            <ArrowRight className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
};

