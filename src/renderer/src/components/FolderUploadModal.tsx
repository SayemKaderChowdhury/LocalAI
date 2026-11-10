import React, { useState } from 'react';
import {
  X,
  Folder,
  FolderOpen,
  FileText,
  CheckSquare,
  Square,
  AlertCircle,
  CheckCircle2,
  Loader2,
  RefreshCw,
} from 'lucide-react';
import { FolderScanResult, FolderScanItem, FolderIndexSummary } from '../../../shared/types';

interface FolderUploadModalProps {
  isOpen: boolean;
  onClose: () => void;
  scope: string;
  scopeName?: string;
  onComplete: () => void;
}

export const FolderUploadModal: React.FC<FolderUploadModalProps> = ({
  isOpen,
  onClose,
  scope,
  scopeName = 'Knowledge Base',
  onComplete,
}) => {
  const [scanResult, setScanResult] = useState<FolderScanResult | null>(null);
  const [selectedPaths, setSelectedPaths] = useState<Set<string>>(new Set());
  const [isScanning, setIsScanning] = useState(false);
  const [isIndexing, setIsIndexing] = useState(false);
  const [progressMsg, setProgressMsg] = useState('');
  const [progressPct, setProgressPct] = useState(0);
  const [summary, setSummary] = useState<FolderIndexSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen) return null;

  const handleSelectFolder = async () => {
    setError(null);
    setIsScanning(true);
    setSummary(null);
    try {
      const res = await window.api.folders.selectAndScan();
      if (res.canceled) {
        setIsScanning(false);
        return;
      }
      if (!res.success || !res.scanResult) {
        setError(res.error || 'Failed to scan folder.');
        setIsScanning(false);
        return;
      }

      setScanResult(res.scanResult);
      // Default: select all supported files
      const supported = new Set<string>();
      res.scanResult.items.forEach((item) => {
        if (item.supported) supported.add(item.path);
      });
      setSelectedPaths(supported);
    } catch (err: any) {
      setError(err.message || 'Error selecting folder.');
    } finally {
      setIsScanning(false);
    }
  };

  const toggleSelectAll = () => {
    if (!scanResult) return;
    if (selectedPaths.size > 0) {
      setSelectedPaths(new Set());
    } else {
      const allSupported = new Set<string>();
      scanResult.items.forEach((item) => {
        if (item.supported) allSupported.add(item.path);
      });
      setSelectedPaths(allSupported);
    }
  };

  const toggleItem = (pathStr: string) => {
    setSelectedPaths((prev) => {
      const next = new Set(prev);
      if (next.has(pathStr)) {
        next.delete(pathStr);
      } else {
        next.add(pathStr);
      }
      return next;
    });
  };

  const handleStartIndexing = async () => {
    if (!scanResult || selectedPaths.size === 0) return;
    setIsIndexing(true);
    setProgressMsg('Preparing files for embedding...');
    setProgressPct(5);
    setError(null);

    const filesToIndex = scanResult.items
      .filter((i) => selectedPaths.has(i.path))
      .map((i) => ({ path: i.path, relativePath: i.relativePath }));

    try {
      const res = await window.api.folders.indexFiles({
        folderRoot: scanResult.rootPath,
        files: filesToIndex,
        scope,
      });

      if (res.success && res.summary) {
        setSummary(res.summary);
        onComplete();
      } else {
        setError(res.error || 'Failed to index files.');
      }
    } catch (err: any) {
      setError(err.message || 'Failed during indexing.');
    } finally {
      setIsIndexing(false);
    }
  };

  const selectedCount = selectedPaths.size;
  const selectedSize = scanResult?.items
    .filter((i) => selectedPaths.has(i.path))
    .reduce((acc, i) => acc + i.size, 0) || 0;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-2xl border border-borderLight dark:border-borderDark shadow-2xl flex flex-col max-h-[85vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
          <div className="flex items-center gap-2">
            <FolderOpen className="w-5 h-5 text-blue-500" />
            <div>
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Index Entire Folder & Subfolders
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                Target scope: <span className="font-medium text-gray-700 dark:text-gray-300">{scopeName}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            disabled={isIndexing}
            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content */}
        <div className="p-6 flex-1 overflow-y-auto space-y-4 text-xs">
          {error && (
            <div className="p-3 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {!scanResult && !isScanning && !summary && (
            <div className="py-12 border-2 border-dashed border-borderLight dark:border-borderDark rounded-2xl flex flex-col items-center justify-center text-center p-6 space-y-3">
              <Folder className="w-12 h-12 text-blue-500/40" />
              <div>
                <h4 className="text-sm font-medium text-gray-900 dark:text-gray-100">
                  Select a local directory to scan
                </h4>
                <p className="text-xs text-gray-500 dark:text-gray-400 max-w-md mt-1">
                  Supported files: PDF, Word (DOCX), Text (TXT, MD), Spreadsheets (CSV, XLSX), and Images. Unsupported files are skipped automatically.
                </p>
              </div>
              <button
                onClick={handleSelectFolder}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium transition flex items-center gap-2"
              >
                <FolderOpen className="w-4 h-4" />
                <span>Browse Folder...</span>
              </button>
            </div>
          )}

          {isScanning && (
            <div className="py-12 flex flex-col items-center justify-center space-y-3 text-center">
              <Loader2 className="w-8 h-8 text-blue-500 animate-spin" />
              <p className="text-xs text-gray-500">Scanning directory tree and reading file stats...</p>
            </div>
          )}

          {scanResult && !summary && (
            <div className="space-y-4">
              {/* Summary Bar */}
              <div className="p-3 rounded-xl bg-gray-50 dark:bg-cardBgDark/50 border border-borderLight dark:border-borderDark flex items-center justify-between">
                <div>
                  <div className="font-medium text-gray-900 dark:text-gray-100">
                    {scanResult.folderName}
                  </div>
                  <div className="text-[11px] text-gray-500">
                    {scanResult.totalFiles} files found ({scanResult.supportedFiles} supported) · Total {(scanResult.totalSize / (1024 * 1024)).toFixed(1)} MB
                  </div>
                </div>

                <button
                  onClick={toggleSelectAll}
                  disabled={isIndexing}
                  className="px-2.5 py-1 rounded-lg border border-borderLight dark:border-borderDark hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300 text-xs transition"
                >
                  {selectedPaths.size === 0 ? 'Select All' : 'Deselect All'}
                </button>
              </div>

              {/* File Tree List */}
              <div className="border border-borderLight dark:border-borderDark rounded-xl max-h-60 overflow-y-auto divide-y divide-borderLight dark:divide-borderDark">
                {scanResult.items.map((item) => {
                  const isChecked = selectedPaths.has(item.path);
                  return (
                    <div
                      key={item.path}
                      onClick={() => item.supported && !isIndexing && toggleItem(item.path)}
                      className={`px-3 py-2 flex items-center justify-between transition ${
                        !item.supported
                          ? 'opacity-40 bg-gray-50/50 dark:bg-gray-900/20 cursor-not-allowed'
                          : 'cursor-pointer hover:bg-gray-50 dark:hover:bg-gray-800/40'
                      }`}
                    >
                      <div className="flex items-center gap-2 truncate pr-2">
                        {item.supported ? (
                          isChecked ? (
                            <CheckSquare className="w-4 h-4 text-blue-500 shrink-0" />
                          ) : (
                            <Square className="w-4 h-4 text-gray-400 shrink-0" />
                          )
                        ) : (
                          <span className="w-4 h-4 text-gray-400 text-[10px] text-center shrink-0">✕</span>
                        )}
                        <span className="truncate font-mono text-[11px] text-gray-800 dark:text-gray-200">
                          {item.relativePath}
                        </span>
                      </div>

                      <div className="flex items-center gap-2 shrink-0 text-[11px] text-gray-400 font-mono">
                        <span>{(item.size / 1024).toFixed(0)} KB</span>
                        {!item.supported && <span className="text-amber-500 text-[10px]">unsupported</span>}
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Progress Bar (if indexing) */}
              {isIndexing && (
                <div className="p-4 rounded-xl bg-blue-50 dark:bg-blue-950/30 border border-blue-200 dark:border-blue-900/50 space-y-2">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-medium text-blue-700 dark:text-blue-300 flex items-center gap-2">
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      {progressMsg}
                    </span>
                    <span className="font-mono text-blue-600 dark:text-blue-400 font-semibold">{progressPct}%</span>
                  </div>
                  <div className="w-full bg-blue-200 dark:bg-blue-900/50 rounded-full h-1.5 overflow-hidden">
                    <div
                      className="bg-blue-600 h-1.5 transition-all duration-300"
                      style={{ width: `${progressPct}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Finished Summary */}
          {summary && (
            <div className="p-6 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-emerald-800 dark:text-emerald-200 space-y-3">
              <div className="flex items-center gap-2 font-semibold text-sm">
                <CheckCircle2 className="w-5 h-5 text-emerald-500" />
                <span>Folder Indexing Complete</span>
              </div>
              <p className="text-xs">
                Successfully indexed <strong>{summary.indexedCount} files</strong> ({summary.totalChunks} text passages embedded with <code>nomic-embed-text</code>).
                {summary.skippedCount > 0 && ` Skipped ${summary.skippedCount} unsupported or empty files.`}
              </p>
              {summary.skippedFiles.length > 0 && (
                <div className="text-[11px] font-mono text-gray-500 max-h-24 overflow-y-auto space-y-0.5 pt-1">
                  <div className="font-semibold text-gray-600 dark:text-gray-400">Skipped files:</div>
                  {summary.skippedFiles.slice(0, 5).map((f) => (
                    <div key={f}>• {f}</div>
                  ))}
                  {summary.skippedFiles.length > 5 && (
                    <div>...and {summary.skippedFiles.length - 5} more</div>
                  )}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-borderLight dark:border-borderDark flex items-center justify-between bg-gray-50/50 dark:bg-cardBgDark/50">
          <div className="text-xs text-gray-500">
            {scanResult && !summary && (
              <span>
                Selected: <strong>{selectedCount} files</strong> ({(selectedSize / (1024 * 1024)).toFixed(1)} MB)
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={onClose}
              disabled={isIndexing}
              className="px-3 py-1.5 rounded-xl border border-borderLight dark:border-borderDark hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 text-xs transition"
            >
              {summary ? 'Close' : 'Cancel'}
            </button>
            {scanResult && !summary && (
              <button
                onClick={handleStartIndexing}
                disabled={isIndexing || selectedCount === 0}
                className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition flex items-center gap-1.5"
              >
                {isIndexing ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    <span>Indexing...</span>
                  </>
                ) : (
                  <span>Index {selectedCount} Files</span>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

