import React, { useState } from 'react';
import {
  Cpu,
  CheckCircle2,
  Download,
  AlertCircle,
  ExternalLink,
  ArrowRight,
  HardDrive,
  ShieldCheck,
  RefreshCw,
  Loader2,
} from 'lucide-react';
import { HardwareSpecs, OllamaModel } from '../../../shared/types';

interface FirstLaunchWizardProps {
  isOpen: boolean;
  onComplete: () => void;
  hardware: HardwareSpecs | null;
  ollamaStatus: {
    cliInstalled: boolean;
    cliVersion?: string;
    running: boolean;
    models: OllamaModel[];
  };
  onVerifyOllama: () => void;
  onPullRecommended: (tag: string) => void;
  pullProgress: { modelTag: string; status: string; percent?: number } | null;
  onOpenExternal: (url: string) => void;
}

export const FirstLaunchWizard: React.FC<FirstLaunchWizardProps> = ({
  isOpen,
  onComplete,
  hardware,
  ollamaStatus,
  onVerifyOllama,
  onPullRecommended,
  pullProgress,
  onOpenExternal,
}) => {
  const [manualSpecs, setManualSpecs] = useState(false);
  const [pastedCpu, setPastedCpu] = useState('');
  const [pastedRam, setPastedRam] = useState('');
  const [pastedGpu, setPastedGpu] = useState('');
  const [pastedDisk, setPastedDisk] = useState('');

  if (!isOpen) return null;

  const targetModel = hardware?.recommendedModel || 'qwen3:4b';
  const isTargetInstalled = ollamaStatus.models.some((m) => m.name === targetModel);
  const isDownloading = pullProgress?.modelTag === targetModel;

  return (
    <div className="fixed inset-0 bg-black/80 backdrop-blur-md flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
      <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-2xl border border-borderLight dark:border-borderDark shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="p-6 border-b border-borderLight dark:border-borderDark bg-indigo-600 text-white">
          <div className="flex items-center gap-2 text-indigo-200 text-xs font-semibold uppercase tracking-wider">
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
            <span>Step 0: Hardware Detection & Private Setup</span>
          </div>
          <h2 className="text-xl font-bold mt-1">Welcome to Your Private Local AI</h2>
          <p className="text-xs text-indigo-100 mt-1">
            Running 100% on your PC. No cloud, no API keys, no telemetry.
          </p>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6 text-xs">
          {/* STEP 0: Hardware Specs Display */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <h4 className="font-semibold text-sm text-gray-900 dark:text-gray-100 flex items-center gap-2">
                <Cpu className="w-4 h-4 text-indigo-500" />
                Detected Hardware Specifications
              </h4>
              <button
                onClick={() => setManualSpecs(!manualSpecs)}
                className="text-indigo-600 dark:text-indigo-400 hover:underline"
              >
                {manualSpecs ? 'Use Auto-Detected' : 'Specs not right? Paste manually'}
              </button>
            </div>

            {manualSpecs ? (
              <div className="p-4 rounded-xl border border-gray-300 dark:border-gray-700 space-y-3 bg-gray-50 dark:bg-gray-800">
                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="text-gray-500">CPU Model</label>
                    <input
                      value={pastedCpu}
                      onChange={(e) => setPastedCpu(e.target.value)}
                      placeholder="e.g. Intel Core i7 / Ryzen 7"
                      className="w-full p-2 rounded border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500">Total RAM (GB)</label>
                    <input
                      value={pastedRam}
                      onChange={(e) => setPastedRam(e.target.value)}
                      placeholder="e.g. 16"
                      className="w-full p-2 rounded border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500">GPU & VRAM</label>
                    <input
                      value={pastedGpu}
                      onChange={(e) => setPastedGpu(e.target.value)}
                      placeholder="e.g. RTX 4060 8GB / Arc"
                      className="w-full p-2 rounded border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                  <div>
                    <label className="text-gray-500">Free Disk Space</label>
                    <input
                      value={pastedDisk}
                      onChange={(e) => setPastedDisk(e.target.value)}
                      placeholder="e.g. 200 GB NVMe"
                      className="w-full p-2 rounded border bg-white dark:bg-gray-900 text-gray-900 dark:text-gray-100"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="grid grid-cols-2 gap-2 font-mono">
                <div className="p-3 rounded-lg border border-borderLight dark:border-borderDark bg-gray-50 dark:bg-cardBgDark">
                  <div className="text-gray-400 font-sans text-[11px]">CPU</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {hardware?.cpu}
                  </div>
                  <div className="text-[10px] text-gray-400">{hardware?.cpuCores} cores</div>
                </div>

                <div className="p-3 rounded-lg border border-borderLight dark:border-borderDark bg-gray-50 dark:bg-cardBgDark">
                  <div className="text-gray-400 font-sans text-[11px]">Memory (RAM)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {hardware?.totalRamGB} GB Total
                  </div>
                  <div className="text-[10px] text-emerald-500">{hardware?.freeRamGB} GB free</div>
                </div>

                <div className="p-3 rounded-lg border border-borderLight dark:border-borderDark bg-gray-50 dark:bg-cardBgDark">
                  <div className="text-gray-400 font-sans text-[11px]">Graphics (GPU)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200 truncate">
                    {hardware?.gpuName}
                  </div>
                  <div className="text-[10px] text-gray-400">{hardware?.vramGB ? `${hardware.vramGB} GB VRAM` : 'Shared memory'}</div>
                </div>

                <div className="p-3 rounded-lg border border-borderLight dark:border-borderDark bg-gray-50 dark:bg-cardBgDark">
                  <div className="text-gray-400 font-sans text-[11px]">Storage (C:)</div>
                  <div className="font-semibold text-gray-800 dark:text-gray-200">
                    {hardware?.diskFreeGB} GB Free
                  </div>
                  <div className="text-[10px] text-indigo-400">
                    {hardware?.isNvmeOrSsd ? 'Fast NVMe SSD' : 'Standard Disk'}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* OLLAMA STATUS CHECK */}
          <div className="p-4 rounded-xl border border-borderLight dark:border-borderDark bg-gray-50/50 dark:bg-cardBgDark/50 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                {ollamaStatus.running ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 shrink-0" />
                ) : (
                  <AlertCircle className="w-5 h-5 text-amber-500 shrink-0" />
                )}
                <div>
                  <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                    {ollamaStatus.running
                      ? 'Ollama Engine is Active & Ready'
                      : ollamaStatus.cliInstalled
                      ? 'Ollama is Installed (Starting Service...)'
                      : 'Ollama Engine Not Detected'}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {ollamaStatus.cliVersion || 'Model inference runtime on http://127.0.0.1:11434'}
                  </div>
                </div>
              </div>

              {!ollamaStatus.running && (
                <button
                  onClick={onVerifyOllama}
                  className="flex items-center gap-1 px-3 py-1.5 rounded-lg border border-indigo-600 text-indigo-600 hover:bg-indigo-600 hover:text-white transition font-medium"
                >
                  <RefreshCw className="w-3.5 h-3.5" />
                  <span>Verify Status</span>
                </button>
              )}
            </div>

            {!ollamaStatus.cliInstalled && (
              <div className="p-3 rounded-lg bg-amber-50 dark:bg-amber-950/30 border border-amber-200 dark:border-amber-900 text-amber-800 dark:text-amber-200 space-y-2">
                <p>
                  Ollama is the local MIT-licensed inference engine that runs models directly on your hardware. Please download and install it once:
                </p>
                <div className="flex items-center gap-3">
                  <button
                    onClick={() => onOpenExternal('https://ollama.com/download')}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs"
                  >
                    <span>Download Ollama for Windows</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </button>
                  <span className="text-gray-500">Once installed, click "Verify Status" above.</span>
                </div>
              </div>
            )}
          </div>

          {/* MODEL RECOMMENDATION & AUTO DOWNLOAD */}
          <div className="p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
            <div className="flex items-center justify-between">
              <div>
                <span className="text-[11px] font-semibold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider">
                  Recommended Model for Your {hardware?.totalRamGB || 16} GB RAM
                </span>
                <div className="text-base font-bold text-gray-900 dark:text-gray-100 font-mono mt-0.5">
                  {targetModel} (2.5 GB download, Apache-2.0)
                </div>
              </div>

              {isTargetInstalled ? (
                <span className="flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-700 dark:text-emerald-300 font-semibold text-xs">
                  <CheckCircle2 className="w-4 h-4" />
                  Installed & Ready
                </span>
              ) : (
                <button
                  onClick={() => onPullRecommended(targetModel)}
                  disabled={isDownloading || !ollamaStatus.running}
                  className="flex items-center gap-1.5 px-4 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold transition disabled:opacity-50"
                >
                  {isDownloading ? (
                    <>
                      <Loader2 className="w-4 h-4 animate-spin" />
                      <span>Downloading...</span>
                    </>
                  ) : (
                    <>
                      <Download className="w-4 h-4" />
                      <span>Download {targetModel}</span>
                    </>
                  )}
                </button>
              )}
            </div>

            {isDownloading && pullProgress && (
              <div className="space-y-1 pt-1">
                <div className="flex justify-between text-xs text-indigo-600 dark:text-indigo-400 font-medium font-mono">
                  <span>{pullProgress.status}</span>
                  <span>{pullProgress.percent || 0}%</span>
                </div>
                <div className="w-full h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 transition-all duration-300 rounded-full"
                    style={{ width: `${pullProgress.percent || 0}%` }}
                  />
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-borderLight dark:border-borderDark bg-gray-50 dark:bg-cardBgDark/50 flex justify-between items-center">
          <div className="text-[11px] text-gray-500">
            All data and conversations are stored locally in %APPDATA%\LocalAI.
          </div>

          <button
            onClick={onComplete}
            disabled={!ollamaStatus.running}
            className="flex items-center gap-1.5 px-5 py-2 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-semibold text-xs transition shadow-sm disabled:opacity-50"
          >
            <span>Start Chatting</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};

