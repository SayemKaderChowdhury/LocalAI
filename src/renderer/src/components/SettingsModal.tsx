import React, { useState } from 'react';
import {
  X,
  Cpu,
  Layers,
  HardDrive,
  Sliders,
  Sun,
  Moon,
  ShieldCheck,
  Mic,
  AlertTriangle,
  Download,
  Trash2,
  Check,
  CheckSquare,
  Square,
  Lock,
  Info,
} from 'lucide-react';
import {
  HardwareSpecs,
  ModelTierItem,
  OllamaModel,
  DocumentItem,
  AppSettings,
} from '../../../shared/types';

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialTab?: string;
  hardware: HardwareSpecs | null;
  settings: AppSettings;
  onSaveSetting: (key: string, value: string) => void;
  installedModels: OllamaModel[];
  knownModels: ModelTierItem[];
  onPullModel: (tag: string) => void;
  onDeleteModel: (tag: string) => void;
  documents: DocumentItem[];
  onDeleteDocument: (id: string) => void;
  privacyAudit: any;
  onOpenExternal: (url: string) => void;
}

export const SettingsModal: React.FC<SettingsModalProps> = ({
  isOpen,
  onClose,
  initialTab = 'hardware',
  hardware,
  settings,
  onSaveSetting,
  installedModels,
  knownModels,
  onPullModel,
  onDeleteModel,
  documents,
  onDeleteDocument,
  privacyAudit,
  onOpenExternal,
}) => {
  const [activeTab, setActiveTab] = useState(initialTab);
  const [defaultPrompt, setDefaultPrompt] = useState(settings.defaultSystemPrompt);
  const [enableAbliterated, setEnableAbliterated] = useState(
    settings.enableAbliteratedModels || false
  );
  const [selectedWhisperModel, setSelectedWhisperModel] = useState<'base' | 'tiny' | 'small'>(
    settings.whisperModel || 'base'
  );
  const [voiceChatMode, setVoiceChatMode] = useState(settings.voiceChatMode || false);

  // Warning modal for downloading abliterated model
  const [abliteratedDownloadTarget, setAbliteratedDownloadTarget] = useState<ModelTierItem | null>(
    null
  );
  const [hasAcknowledgedWarning, setHasAcknowledgedWarning] = useState(false);

  if (!isOpen) return null;

  const totalModelDiskBytes = installedModels.reduce((acc, m) => acc + (m.size || 0), 0);
  const totalModelDiskGB = (totalModelDiskBytes / (1024 * 1024 * 1024)).toFixed(1);

  const totalDocBytes = documents.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const totalDocMB = (totalDocBytes / (1024 * 1024)).toFixed(2);

  const handleSaveSystemPrompt = () => {
    onSaveSetting('defaultSystemPrompt', defaultPrompt);
  };

  const handleToggleAbliterated = (enabled: boolean) => {
    setEnableAbliterated(enabled);
    onSaveSetting('enableAbliteratedModels', String(enabled));
  };

  const handleSelectWhisper = (val: 'base' | 'tiny' | 'small') => {
    setSelectedWhisperModel(val);
    onSaveSetting('whisperModel', val);
  };

  const handleToggleVoiceChat = (val: boolean) => {
    setVoiceChatMode(val);
    onSaveSetting('voiceChatMode', String(val));
  };

  const standardModels = knownModels.filter((m) => !m.isAbliterated && !m.isExperimental);
  const abliteratedModels = knownModels.filter((m) => m.isAbliterated);

  const handleConfirmAbliteratedDownload = () => {
    if (!abliteratedDownloadTarget || !hasAcknowledgedWarning) return;
    onPullModel(abliteratedDownloadTarget.tag);
    setAbliteratedDownloadTarget(null);
    setHasAcknowledgedWarning(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-3xl border border-borderLight dark:border-borderDark shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
          <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Sliders className="w-4 h-4 text-blue-500" />
            <span>LocalAI Settings</span>
          </h3>
          <button
            onClick={onClose}
            className="p-1 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Tab Strip */}
        <div className="flex border-b border-borderLight dark:border-borderDark bg-gray-50/50 dark:bg-cardBgDark/50 px-6 gap-6 text-xs font-medium overflow-x-auto shrink-0">
          {[
            { id: 'hardware', label: 'Hardware Specs', icon: Cpu },
            { id: 'models', label: 'Models & Engine', icon: Layers },
            { id: 'voice', label: 'Voice & Speech', icon: Mic },
            { id: 'persona', label: 'System Persona', icon: Sliders },
            { id: 'appearance', label: 'Appearance', icon: Sun },
            { id: 'privacy', label: 'Privacy & Offline', icon: ShieldCheck },
            { id: 'about', label: 'About', icon: Info },
          ].map((tab) => {
            const Icon = tab.icon;
            const isActive = activeTab === tab.id;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`py-3 border-b-2 flex items-center gap-1.5 transition whitespace-nowrap ${
                  isActive
                    ? 'border-blue-600 text-blue-600 dark:text-blue-400 font-semibold'
                    : 'border-transparent text-gray-500 hover:text-gray-800 dark:hover:text-gray-300'
                }`}
              >
                <Icon className="w-3.5 h-3.5" />
                <span>{tab.label}</span>
              </button>
            );
          })}
        </div>

        {/* Tab Content */}
        <div className="flex-1 overflow-y-auto p-6 text-xs space-y-6">
          {/* HARDWARE TAB */}
          {activeTab === 'hardware' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Detected Hardware Specifications
                </h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Autodetected on this PC. Used to calculate memory headroom and optimal model size.
                </p>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark space-y-1">
                  <div className="text-gray-400 text-[11px]">Processor (CPU)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {hardware?.cpu}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {hardware?.cpuCores} physical/logical cores
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark space-y-1">
                  <div className="text-gray-400 text-[11px]">System Memory (RAM)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {hardware?.totalRamGB} GB Total
                  </div>
                  <div className="text-[11px] text-emerald-600 dark:text-emerald-400 font-mono">
                    {hardware?.freeRamGB} GB currently free
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark space-y-1">
                  <div className="text-gray-400 text-[11px]">Graphics & Display (GPU)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {hardware?.gpuName}
                  </div>
                  <div className="text-[11px] text-gray-500 font-mono">
                    {hardware?.vramGB ? `${hardware.vramGB} GB VRAM` : 'Shared System Memory'}
                  </div>
                </div>

                <div className="p-3.5 rounded-2xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark space-y-1">
                  <div className="text-gray-400 text-[11px]">Primary Storage (C:)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 font-mono">
                    {hardware?.diskFreeGB} GB Free / {hardware?.diskTotalGB} GB Total
                  </div>
                  <div className="text-[11px] text-blue-600 dark:text-blue-400 font-mono">
                    {hardware?.isNvmeOrSsd ? 'Fast NVMe / SSD Storage' : 'HDD'}
                  </div>
                </div>
              </div>

              {/* Tier recommendation banner */}
              <div className="p-4 rounded-2xl bg-blue-50/50 dark:bg-blue-950/20 border border-blue-200 dark:border-blue-900/50 space-y-1.5">
                <div className="flex items-center gap-2">
                  <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white">
                    Hardware Tier: {hardware?.tier.toUpperCase()}
                  </span>
                  <span className="text-blue-800 dark:text-blue-300 font-medium">
                    Recommended Model: <code>{hardware?.recommendedModel}</code>
                  </span>
                </div>
                <p className="text-gray-600 dark:text-gray-400 text-[11px]">
                  Your machine has {hardware?.totalRamGB} GB RAM. The{' '}
                  <strong>{hardware?.recommendedModel}</strong> tier delivers fast, responsive
                  responses without risking out-of-memory paging.
                </p>
              </div>
            </div>
          )}

          {/* MODELS TAB */}
          {activeTab === 'models' && (
            <div className="space-y-6">
              {/* Installed Models */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Installed Local Models ({installedModels.length})
                </h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Stored locally on your SSD. Total space used: {totalModelDiskGB} GB.
                </p>
                <div className="mt-2 divide-y divide-borderLight dark:divide-borderDark border border-borderLight dark:border-borderDark rounded-xl overflow-hidden">
                  {installedModels.length === 0 ? (
                    <div className="p-4 text-center text-gray-400">No models installed in Ollama.</div>
                  ) : (
                    installedModels.map((m) => (
                      <div
                        key={m.name}
                        className="p-3 flex items-center justify-between bg-white dark:bg-cardBgDark"
                      >
                        <div>
                          <div className="font-mono font-medium text-gray-900 dark:text-gray-100">
                            {m.name}
                          </div>
                          <div className="text-[11px] text-gray-400">
                            {(m.size / (1024 * 1024 * 1024)).toFixed(1)} GB
                          </div>
                        </div>
                        <button
                          onClick={() => {
                            if (confirm(`Delete local model ${m.name}?`)) {
                              onDeleteModel(m.name);
                            }
                          }}
                          className="p-1.5 text-gray-400 hover:text-red-500 rounded"
                          title="Delete model"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* Standard Model Catalog */}
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Standard Verified Models
                </h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  High-reasoning Apache-2.0 open-weights models tailored to your PC.
                </p>
                <div className="mt-2 space-y-2">
                  {standardModels.map((km) => {
                    const isInstalled = installedModels.some(
                      (im) => im.name === km.tag || im.name === `${km.tag}:latest`
                    );
                    return (
                      <div
                        key={km.id}
                        className="p-3 rounded-xl border border-borderLight dark:border-borderDark bg-white dark:bg-cardBgDark flex items-center justify-between"
                      >
                        <div className="space-y-0.5 truncate pr-2">
                          <div className="flex items-center gap-2">
                            <span className="font-medium text-gray-900 dark:text-gray-100">
                              {km.name}
                            </span>
                            <span className="font-mono text-[10px] text-gray-400">{km.tag}</span>
                            {km.isVision && (
                              <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-600 dark:text-blue-300">
                                Vision
                              </span>
                            )}
                          </div>
                          <div className="text-gray-500 text-[11px]">{km.description}</div>
                          <div className="text-gray-400 font-mono text-[10px]">
                            {km.sizeGB} GB download · ~{km.ramNeededGB} GB RAM needed · {km.expectedSpeed}
                          </div>
                        </div>

                        {isInstalled ? (
                          <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1 shrink-0">
                            <Check className="w-3 h-3" /> Installed
                          </span>
                        ) : (
                          <button
                            onClick={() => onPullModel(km.tag)}
                            className="px-3 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-[11px] transition shrink-0 flex items-center gap-1"
                          >
                            <Download className="w-3 h-3" />
                            <span>Download</span>
                          </button>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Opt-In Abliterated / Uncensored Section */}
              <div className="pt-4 border-t border-borderLight dark:border-borderDark space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                      <Lock className="w-3.5 h-3.5 text-amber-500" />
                      <span>Uncensored / Abliterated Models (Opt-In)</span>
                    </h4>
                    <p className="text-gray-500 text-[11px] mt-0.5">
                      Uncensored — fewer refusals, slightly lower reasoning scores, use at your own
                      judgement.
                    </p>
                  </div>

                  <button
                    onClick={() => handleToggleAbliterated(!enableAbliterated)}
                    className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                      enableAbliterated ? 'bg-amber-600' : 'bg-gray-300 dark:bg-gray-700'
                    }`}
                  >
                    <span
                      className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                        enableAbliterated ? 'translate-x-4' : 'translate-x-0'
                      }`}
                    />
                  </button>
                </div>

                {enableAbliterated && (
                  <div className="space-y-2 pt-2 animate-in fade-in">
                    <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-[11px] space-y-1">
                      <div className="font-semibold flex items-center gap-1.5">
                        <AlertTriangle className="w-3.5 h-3.5" />
                        <span>Honest Technical Note</span>
                      </div>
                      <p>
                        Abliterated models do not improve reasoning or inference speed. They remove
                        safety refusals by modifying specific weight orthogonal vectors. Reasoning
                        benchmarks (MMLU / TruthfulQA) are measurably slightly lower than the stock
                        counterpart. Keep the standard model installed alongside it to switch anytime.
                      </p>
                    </div>

                    <div className="space-y-2 pt-1">
                      {abliteratedModels.map((am) => {
                        const isInstalled = installedModels.some(
                          (im) => im.name === am.tag || im.name === `${am.tag}:latest`
                        );
                        return (
                          <div
                            key={am.id}
                            className="p-3 rounded-xl border border-borderLight dark:border-borderDark bg-white dark:bg-cardBgDark flex items-center justify-between"
                          >
                            <div className="space-y-0.5 truncate pr-2">
                              <div className="flex items-center gap-2">
                                <span className="font-medium text-gray-900 dark:text-gray-100">
                                  {am.name}
                                </span>
                                <span className="font-mono text-[10px] text-gray-400">
                                  {am.tag}
                                </span>
                              </div>
                              <div className="text-gray-500 text-[11px]">{am.description}</div>
                              <div className="text-gray-400 font-mono text-[10px]">
                                {am.sizeGB} GB · Tier: {am.tier}
                              </div>
                            </div>

                            {isInstalled ? (
                              <span className="px-2.5 py-1 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 font-medium text-[11px] flex items-center gap-1 shrink-0">
                                <Check className="w-3 h-3" /> Installed
                              </span>
                            ) : (
                              <button
                                onClick={() => setAbliteratedDownloadTarget(am)}
                                className="px-3 py-1.5 rounded-xl border border-amber-500/40 hover:bg-amber-500/10 text-amber-600 dark:text-amber-400 font-medium text-[11px] transition shrink-0"
                              >
                                Download...
                              </button>
                            )}
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* VOICE & SPEECH TAB (Feature 1) */}
          {activeTab === 'voice' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Voice to Text (Offline Whisper)
                </h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Transcribes your speech into the input box using local <code>faster-whisper</code> on CPU. No audio leaves this PC.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark space-y-3">
                <div className="font-medium text-gray-800 dark:text-gray-200">
                  Whisper Model Size
                </div>
                <div className="grid grid-cols-3 gap-2">
                  {[
                    { id: 'tiny', name: 'Tiny (75 MB)', desc: 'Fastest, lowest CPU usage' },
                    { id: 'base', name: 'Base (145 MB)', desc: 'Recommended balance' },
                    { id: 'small', name: 'Small (480 MB)', desc: 'Highest accuracy' },
                  ].map((w) => (
                    <button
                      key={w.id}
                      onClick={() => handleSelectWhisper(w.id as any)}
                      className={`p-3 rounded-xl border text-left transition ${
                        selectedWhisperModel === w.id
                          ? 'border-blue-500 bg-blue-50/60 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300'
                          : 'border-borderLight dark:border-borderDark hover:bg-white dark:hover:bg-cardBgDark text-gray-700 dark:text-gray-300'
                      }`}
                    >
                      <div className="font-semibold text-xs">{w.name}</div>
                      <div className="text-[10px] text-gray-400 mt-1">{w.desc}</div>
                    </button>
                  ))}
                </div>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-800 dark:text-gray-200">
                    Voice Chat Mode
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Speak, immediately transcribe and auto-send the prompt without manual click.
                  </div>
                </div>
                <button
                  onClick={() => handleToggleVoiceChat(!voiceChatMode)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                    voiceChatMode ? 'bg-blue-600' : 'bg-gray-300 dark:bg-gray-700'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                      voiceChatMode ? 'translate-x-4' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>

              <div className="p-3 rounded-xl bg-gray-100 dark:bg-cardBgDark border border-borderLight dark:border-borderDark text-[11px] text-gray-500 space-y-1">
                <div className="font-semibold text-gray-700 dark:text-gray-300">
                  Text-to-Speech (TTS) Status
                </div>
                <p>
                  Local Voice-to-Text is active and running 100% offline. Local Text-to-Speech
                  speech synthesis requires a local Piper or Kokoro runtime. In accordance with
                  offline principles, cloud TTS is not used.
                </p>
              </div>
            </div>
          )}

          {/* SYSTEM PERSONA TAB */}
          {activeTab === 'persona' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">
                  Default System Prompt
                </h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Applied as the base instruction set for all new conversations.
                </p>
              </div>

              <textarea
                rows={5}
                value={defaultPrompt}
                onChange={(e) => setDefaultPrompt(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-50 dark:bg-cardBgDark border border-borderLight dark:border-borderDark focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-none font-mono text-xs leading-relaxed"
              />

              <div className="flex justify-end">
                <button
                  onClick={handleSaveSystemPrompt}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
                >
                  Save Prompt
                </button>
              </div>
            </div>
          )}

          {/* APPEARANCE TAB */}
          {activeTab === 'appearance' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100">Theme & Style</h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Swiss typography and high contrast across both light and dark modes.
                </p>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <button
                  onClick={() => onSaveSetting('theme', 'light')}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition ${
                    settings.theme === 'light'
                      ? 'border-blue-500 bg-blue-50/50 text-blue-900'
                      : 'border-borderLight hover:bg-gray-50 text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Sun className="w-4 h-4 text-amber-500" />
                    <span className="font-medium text-xs">Light Mode</span>
                  </div>
                  {settings.theme === 'light' && <Check className="w-4 h-4 text-blue-600" />}
                </button>

                <button
                  onClick={() => onSaveSetting('theme', 'dark')}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition ${
                    settings.theme === 'dark'
                      ? 'border-blue-500 bg-blue-950/40 text-blue-200'
                      : 'border-borderDark hover:bg-cardBgDark text-gray-300'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <Moon className="w-4 h-4 text-blue-400" />
                    <span className="font-medium text-xs">Dark Mode</span>
                  </div>
                  {settings.theme === 'dark' && <Check className="w-4 h-4 text-blue-400" />}
                </button>
              </div>
            </div>
          )}

          {/* PRIVACY & OFFLINE TAB */}
          {activeTab === 'privacy' && (
            <div className="space-y-4">
              <div>
                <h4 className="font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500" />
                  <span>Privacy Audit & Boundary Verification</span>
                </h4>
                <p className="text-gray-500 text-[11px] mt-0.5">
                  Strict local execution guarantee. No data leaves your machine.
                </p>
              </div>

              <div className="p-4 rounded-2xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark space-y-2">
                <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                  {privacyAudit?.statement}
                </div>
                <div className="space-y-1 text-gray-600 dark:text-gray-400 font-mono text-[11px] pt-1">
                  <div>• Allowed local calls: {privacyAudit?.networkCallsAllowed?.join(', ')}</div>
                  <div>• Cloud APIs: {privacyAudit?.cloudApisUsed}</div>
                  <div>• Telemetry: Disabled</div>
                  <div>• Speech Recognition: Local faster-whisper (no Google/Apple Web Speech API)</div>
                  <div>• Local SQLite path: {privacyAudit?.storageLocation}</div>
                </div>
              </div>
            </div>
          )}

          {/* ABOUT TAB */}
          {activeTab === 'about' && (
            <div className="space-y-5">
              <div className="p-5 rounded-2xl bg-gray-50 dark:bg-cardBgDark/60 border border-borderLight dark:border-borderDark space-y-3">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">LocalAI</h3>
                    <p className="text-[11px] text-gray-500 font-mono mt-0.5">Version 2.0.0</p>
                  </div>
                  <span className="px-2.5 py-1 rounded-full text-[10px] font-mono font-medium bg-blue-50 dark:bg-blue-950/60 text-blue-600 dark:text-blue-400 border border-blue-200 dark:border-blue-800/40">
                    MIT License
                  </span>
                </div>

                <div className="text-xs text-gray-700 dark:text-gray-300 leading-relaxed font-medium">
                  Local AI — chats and files stay on this PC.
                </div>

                <div className="pt-2 border-t border-borderLight dark:border-borderDark grid grid-cols-2 gap-3 text-[11px]">
                  <div>
                    <span className="text-gray-400 block font-mono">Active Model</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">
                      {settings.activeModel || 'qwen3.5:4b'}
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono">Inference Engine</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">
                      Ollama (127.0.0.1:11434)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono">Embeddings / RAG</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">
                      nomic-embed-text (Local)
                    </span>
                  </div>
                  <div>
                    <span className="text-gray-400 block font-mono">Voice Transcription</span>
                    <span className="font-medium text-gray-800 dark:text-gray-200 font-mono">
                      faster-whisper (CPU int8)
                    </span>
                  </div>
                </div>
              </div>

              <div className="p-4 rounded-xl border border-borderLight dark:border-borderDark bg-gray-50/50 dark:bg-cardBgDark/30 text-[11px] text-gray-500 space-y-1">
                <div>• Zero telemetry, analytics, tracking, or remote phone-home services.</div>
                <div>• Zero cloud accounts, logins, subscriptions, or credit card requirements.</div>
                <div>• All prompts, files, images, voice audio, and embeddings remain strictly on this PC.</div>
              </div>
            </div>
          )}
        </div>

        {/* Required Confirmation Modal for Abliterated Model */}
        {abliteratedDownloadTarget && (
          <div className="fixed inset-0 z-60 bg-black/70 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-lg border border-borderLight dark:border-borderDark shadow-2xl p-6 space-y-4 animate-in fade-in">
              <div className="flex items-center gap-2 text-amber-600 dark:text-amber-400 font-semibold text-sm">
                <AlertTriangle className="w-5 h-5" />
                <span>Notice: Uncensored / Abliterated Model</span>
              </div>

              <div className="p-3 rounded-xl bg-amber-500/10 border border-amber-500/20 text-xs text-gray-800 dark:text-gray-200 leading-relaxed font-mono">
                "Uncensored models will answer prompts the standard model would refuse. You are
                responsible for how you use the output. Do not use it to create harmful, illegal, or
                deceptive content. This model is slightly weaker on reasoning benchmarks than the
                standard version."
              </div>

              <div
                onClick={() => setHasAcknowledgedWarning(!hasAcknowledgedWarning)}
                className="flex items-start gap-2.5 cursor-pointer pt-1 text-xs select-none"
              >
                {hasAcknowledgedWarning ? (
                  <CheckSquare className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
                ) : (
                  <Square className="w-4 h-4 text-gray-400 shrink-0 mt-0.5" />
                )}
                <span className="text-gray-700 dark:text-gray-300">
                  I understand the trade-offs and assume full responsibility for outputs.
                </span>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => {
                    setAbliteratedDownloadTarget(null);
                    setHasAcknowledgedWarning(false);
                  }}
                  className="px-3 py-1.5 rounded-xl border border-borderLight dark:border-borderDark text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleConfirmAbliteratedDownload}
                  disabled={!hasAcknowledgedWarning}
                  className="px-4 py-1.5 rounded-xl bg-amber-600 hover:bg-amber-500 disabled:opacity-40 text-white font-medium text-xs transition"
                >
                  Download {abliteratedDownloadTarget.name}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
