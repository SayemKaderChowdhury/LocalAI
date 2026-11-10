import React, { useState } from 'react';
import {
  X,
  Check,
  Download,
  Trash2,
  Cpu,
  Eye,
  Loader2,
} from 'lucide-react';
import { ModelTierItem, OllamaModel, HardwareSpecs } from '../../../shared/types';

interface ModelPickerProps {
  isOpen: boolean;
  onClose: () => void;
  activeModel: string;
  onSelectModel: (tag: string) => void;
  installedModels: OllamaModel[];
  knownModels: ModelTierItem[];
  hardware: HardwareSpecs | null;
  onPullModel: (tag: string) => void;
  onDeleteModel: (tag: string) => void;
  pullProgress: { modelTag: string; status: string; percent?: number } | null;
}

export const ModelPicker: React.FC<ModelPickerProps> = ({
  isOpen,
  onClose,
  activeModel,
  onSelectModel,
  installedModels,
  knownModels,
  hardware,
  onPullModel,
  onDeleteModel,
  pullProgress,
}) => {
  const [filter, setFilter] = useState<'all' | 'installed' | 'vision'>('all');

  if (!isOpen) return null;

  const installedTagSet = new Set(installedModels.map((m) => m.name));

  const items = knownModels.filter((m) => {
    if (m.isExperimental) return false;
    if (m.isAbliterated) return false; // Handled in settings opt-in
    if (filter === 'installed') return installedTagSet.has(m.tag) || installedTagSet.has(`${m.tag}:latest`);
    if (filter === 'vision') return m.isVision;
    return true;
  });

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-2xl border border-borderLight dark:border-borderDark shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
          <div>
            <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <Cpu className="w-4 h-4 text-blue-500" />
              <span>Select Model Engine</span>
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Optimized for {hardware?.cpu || 'Local PC'} · {hardware?.totalRamGB || 16} GB RAM
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Filter Pills */}
        <div className="px-5 py-2.5 flex gap-2 border-b border-borderLight dark:border-borderDark bg-gray-50/50 dark:bg-cardBgDark/50 text-xs">
          <button
            onClick={() => setFilter('all')}
            className={`px-3 py-1 rounded-xl transition ${
              filter === 'all'
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Recommended Models
          </button>
          <button
            onClick={() => setFilter('installed')}
            className={`px-3 py-1 rounded-xl transition ${
              filter === 'installed'
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Installed ({installedModels.length})
          </button>
          <button
            onClick={() => setFilter('vision')}
            className={`px-3 py-1 rounded-xl transition ${
              filter === 'vision'
                ? 'bg-blue-600 text-white font-medium'
                : 'text-gray-600 dark:text-gray-400 hover:bg-gray-200 dark:hover:bg-gray-800'
            }`}
          >
            Vision Multimodal
          </button>
        </div>

        {/* Pull Progress Banner */}
        {pullProgress && (
          <div className="px-5 py-3 bg-blue-50 dark:bg-blue-950/40 border-b border-blue-200 dark:border-blue-900/50 text-xs flex items-center justify-between">
            <div className="flex items-center gap-2 text-blue-700 dark:text-blue-300 font-medium truncate">
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
              <span>
                Pulling {pullProgress.modelTag}: {pullProgress.status}
              </span>
            </div>
            {pullProgress.percent !== undefined && (
              <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">
                {pullProgress.percent}%
              </span>
            )}
          </div>
        )}

        {/* Model List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2.5 text-xs">
          {items.map((m) => {
            const isInstalled =
              installedTagSet.has(m.tag) || installedTagSet.has(`${m.tag}:latest`);
            const isActive = activeModel === m.tag;

            return (
              <div
                key={m.id}
                onClick={() => isInstalled && onSelectModel(m.tag)}
                className={`p-3.5 rounded-2xl border transition flex items-center justify-between group ${
                  isActive
                    ? 'border-blue-500 bg-blue-50/50 dark:bg-blue-950/30 ring-1 ring-blue-500/20'
                    : isInstalled
                    ? 'border-borderLight dark:border-borderDark hover:border-gray-400 dark:hover:border-gray-600 bg-white dark:bg-cardBgDark cursor-pointer'
                    : 'border-borderLight/60 dark:border-borderDark/60 bg-gray-50/50 dark:bg-cardBgDark/30 opacity-75'
                }`}
              >
                <div className="space-y-1 truncate pr-3">
                  <div className="flex items-center gap-2">
                    <span className="font-medium text-sm text-gray-900 dark:text-gray-100">
                      {m.name}
                    </span>
                    <span className="font-mono text-[11px] text-gray-400">{m.tag}</span>
                    {m.isVision && (
                      <span className="px-1.5 py-0.2 rounded text-[10px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 flex items-center gap-1 font-medium">
                        <Eye className="w-2.5 h-2.5" /> Vision
                      </span>
                    )}
                    {isActive && (
                      <span className="px-2 py-0.5 rounded-full text-[10px] bg-blue-600 text-white font-semibold">
                        Active
                      </span>
                    )}
                  </div>
                  <p className="text-gray-500 text-xs">{m.description}</p>
                  <div className="text-[11px] text-gray-400 font-mono">
                    {m.sizeGB} GB on disk · Needs ~{m.ramNeededGB} GB RAM · {m.expectedSpeed}
                  </div>
                </div>

                <div className="shrink-0 flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                  {isInstalled ? (
                    <button
                      onClick={() => onSelectModel(m.tag)}
                      className={`px-3 py-1.5 rounded-xl text-xs font-medium transition ${
                        isActive
                          ? 'bg-blue-600 text-white cursor-default'
                          : 'border border-borderLight dark:border-borderDark hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {isActive ? 'Current' : 'Select'}
                    </button>
                  ) : (
                    <button
                      onClick={() => onPullModel(m.tag)}
                      className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition flex items-center gap-1"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Download</span>
                    </button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
