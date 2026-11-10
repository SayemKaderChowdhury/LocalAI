import React, { useState } from 'react';
import { X, Sliders, AlertTriangle, Check, RefreshCw } from 'lucide-react';
import { Conversation, HardwareSpecs } from '../../../shared/types';

interface ChatControlsModalProps {
  isOpen: boolean;
  onClose: () => void;
  conversation: Conversation;
  onSaveControls: (params: {
    system_prompt: string;
    temperature: number;
    context_length: number;
    max_tokens: number;
  }) => void;
  hardware: HardwareSpecs | null;
}

export const ChatControlsModal: React.FC<ChatControlsModalProps> = ({
  isOpen,
  onClose,
  conversation,
  onSaveControls,
  hardware,
}) => {
  const [temperature, setTemperature] = useState(conversation.temperature ?? 0.7);
  const [contextLength, setContextLength] = useState(conversation.context_length ?? 4096);
  const [maxTokens, setMaxTokens] = useState(conversation.max_tokens ?? 2048);
  const [systemPrompt, setSystemPrompt] = useState(conversation.system_prompt ?? '');

  if (!isOpen) return null;

  // Check if context length is high relative to available RAM
  const totalRam = hardware?.totalRamGB || 16;
  const isContextHeavy = (totalRam <= 8 && contextLength > 4096) || (totalRam <= 16 && contextLength > 16384);

  const handleSave = () => {
    onSaveControls({
      temperature,
      context_length: contextLength,
      max_tokens: maxTokens,
      system_prompt: systemPrompt,
    });
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-lg border border-borderLight dark:border-borderDark shadow-2xl overflow-hidden flex flex-col">
        {/* Header */}
        <div className="p-5 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-indigo-500" />
            Chat Controls & Parameters
          </h3>
          <button onClick={onClose} className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-5 space-y-5 text-xs">
          {/* Temperature */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
              <span>Temperature: {temperature.toFixed(2)}</span>
              <span className="text-gray-400">
                {temperature < 0.4 ? 'Precise / Deterministic' : temperature > 0.8 ? 'Creative / Exploratory' : 'Balanced'}
              </span>
            </div>
            <input
              type="range"
              min="0.0"
              max="1.5"
              step="0.05"
              value={temperature}
              onChange={(e) => setTemperature(parseFloat(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Context Length */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
              <span>Context Window: {contextLength.toLocaleString()} tokens</span>
              <span className="text-gray-400 font-mono">
                ~{Math.round(contextLength * 0.75 * 4)} chars
              </span>
            </div>
            <input
              type="range"
              min="2048"
              max="32768"
              step="2048"
              value={contextLength}
              onChange={(e) => setContextLength(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />

            {isContextHeavy && (
              <div className="p-2.5 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-800 text-amber-700 dark:text-amber-300 flex items-center gap-2">
                <AlertTriangle className="w-4 h-4 shrink-0 text-amber-500" />
                <span>
                  High context window ({contextLength.toLocaleString()} tokens) increases KV-cache RAM usage. May exceed your {totalRam} GB RAM on larger models!
                </span>
              </div>
            )}
          </div>

          {/* Max Tokens */}
          <div className="space-y-1.5">
            <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
              <span>Max Generation Length: {maxTokens} tokens</span>
            </div>
            <input
              type="range"
              min="256"
              max="4096"
              step="256"
              value={maxTokens}
              onChange={(e) => setMaxTokens(parseInt(e.target.value))}
              className="w-full accent-indigo-600 cursor-pointer"
            />
          </div>

          {/* Per-chat System Prompt Override */}
          <div className="space-y-1.5 pt-2 border-t border-borderLight dark:border-borderDark">
            <div className="flex justify-between font-medium text-gray-700 dark:text-gray-300">
              <span>Per-Chat System Prompt (Overrides Global)</span>
            </div>
            <textarea
              value={systemPrompt}
              onChange={(e) => setSystemPrompt(e.target.value)}
              placeholder="e.g. You are a senior Python architect. Answer concisely with production-ready code."
              rows={3}
              className="w-full p-2.5 rounded-lg bg-gray-50 dark:bg-cardBgDark border border-borderLight dark:border-borderDark text-gray-900 dark:text-gray-100 focus:outline-none focus:border-indigo-500"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-borderLight dark:border-borderDark flex justify-end gap-2 bg-gray-50 dark:bg-cardBgDark/50">
          <button
            onClick={onClose}
            className="px-3 py-1.5 rounded-lg text-xs font-medium text-gray-600 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-700"
          >
            Cancel
          </button>
          <button
            onClick={handleSave}
            className="flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-xs font-medium bg-indigo-600 hover:bg-indigo-700 text-white transition shadow-sm"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Apply Settings</span>
          </button>
        </div>
      </div>
    </div>
  );
};

