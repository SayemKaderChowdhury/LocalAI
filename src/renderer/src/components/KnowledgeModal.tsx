import React from 'react';
import {
  X,
  HardDrive,
  Upload,
  Trash2,
  FileText,
  FileCode,
  FileSpreadsheet,
  AlertCircle,
  Loader2,
  BookOpen,
} from 'lucide-react';
import { DocumentItem } from '../../../shared/types';

interface KnowledgeModalProps {
  isOpen: boolean;
  onClose: () => void;
  documents: DocumentItem[];
  onUploadFile: (scope: 'global') => void;
  onDeleteDocument: (id: string) => void;
  indexingProgress: { active: boolean; message: string; percent: number };
}

export const KnowledgeModal: React.FC<KnowledgeModalProps> = ({
  isOpen,
  onClose,
  documents,
  onUploadFile,
  onDeleteDocument,
  indexingProgress,
}) => {
  if (!isOpen) return null;

  const totalBytes = documents.reduce((acc, d) => acc + d.file_size, 0);
  const totalChunks = documents.reduce((acc, d) => acc + d.chunk_count, 0);

  const getFileIcon = (type: string) => {
    switch (type.toLowerCase()) {
      case 'pdf':
        return <FileText className="w-4 h-4 text-red-500" />;
      case 'docx':
        return <FileText className="w-4 h-4 text-blue-500" />;
      case 'csv':
        return <FileSpreadsheet className="w-4 h-4 text-emerald-500" />;
      default:
        return <FileCode className="w-4 h-4 text-gray-500" />;
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 backdrop-blur-xs flex items-center justify-center z-50 p-4 animate-in fade-in duration-200">
      <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-2xl border border-borderLight dark:border-borderDark shadow-2xl overflow-hidden flex flex-col max-h-[85vh]">
        {/* Header */}
        <div className="p-5 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
          <div>
            <h3 className="text-base font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
              <HardDrive className="w-5 h-5 text-indigo-500" />
              Knowledge Base & Local Vector Library
            </h3>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
              Documents are chunked, embedded via nomic-embed-text, and stored locally in SQLite.
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Indexing Progress Indicator */}
        {indexingProgress.active && (
          <div className="p-4 bg-indigo-50 dark:bg-indigo-950/40 border-b border-indigo-200 dark:border-indigo-900 flex items-center gap-3 text-xs text-indigo-700 dark:text-indigo-300">
            <Loader2 className="w-4 h-4 animate-spin text-indigo-600 shrink-0" />
            <div className="flex-1 space-y-1">
              <div className="flex justify-between font-medium">
                <span>{indexingProgress.message}</span>
                <span>{indexingProgress.percent}%</span>
              </div>
              <div className="w-full h-1.5 bg-indigo-200 dark:bg-indigo-900/60 rounded-full overflow-hidden">
                <div
                  className="h-full bg-indigo-600 rounded-full transition-all duration-300"
                  style={{ width: `${indexingProgress.percent}%` }}
                />
              </div>
            </div>
          </div>
        )}

        {/* Action bar & Stats */}
        <div className="px-5 py-3 border-b border-borderLight dark:border-borderDark flex items-center justify-between bg-gray-50 dark:bg-cardBgDark/50 text-xs">
          <div className="text-gray-500 dark:text-gray-400 font-mono">
            {documents.length} Files • {totalChunks} Indexed Vector Passages • {(totalBytes / (1024 * 1024)).toFixed(2)} MB
          </div>

          <button
            onClick={() => onUploadFile('global')}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-600 hover:bg-indigo-700 text-white font-medium shadow-xs transition"
          >
            <Upload className="w-3.5 h-3.5" />
            <span>Upload & Index Document</span>
          </button>
        </div>

        {/* Documents List */}
        <div className="flex-1 overflow-y-auto p-5 space-y-2">
          {documents.length === 0 ? (
            <div className="text-center py-16 text-gray-400 space-y-2">
              <BookOpen className="w-12 h-12 text-gray-300 dark:text-gray-600 mx-auto" />
              <p className="text-sm font-medium text-gray-600 dark:text-gray-300">
                No documents in library
              </p>
              <p className="text-xs max-w-sm mx-auto">
                Upload PDF, DOCX, TXT, Markdown, or CSV files to enable private question answering with automatic citations.
              </p>
            </div>
          ) : (
            documents.map((doc) => (
              <div
                key={doc.id}
                className="p-3.5 rounded-xl border border-borderLight dark:border-borderDark bg-white dark:bg-cardBgDark hover:border-indigo-400 transition flex items-center justify-between text-xs"
              >
                <div className="flex items-center gap-3">
                  <div className="p-2 rounded-lg bg-gray-100 dark:bg-gray-800">
                    {getFileIcon(doc.file_type)}
                  </div>
                  <div>
                    <div className="font-semibold text-gray-900 dark:text-gray-100 text-sm">
                      {doc.filename}
                    </div>
                    <div className="text-[11px] text-gray-400 font-mono mt-0.5">
                      {(doc.file_size / 1024).toFixed(1)} KB • {doc.chunk_count} vector chunks • Added {new Date(doc.created_at).toLocaleDateString()} • Scope: {doc.scope}
                    </div>
                  </div>
                </div>

                <button
                  onClick={() => {
                    if (confirm(`Delete ${doc.filename} and remove all its embeddings from the vector store?`)) {
                      onDeleteDocument(doc.id);
                    }
                  }}
                  className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/30 rounded-lg transition"
                  title="Delete file and embeddings"
                >
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            ))
          )}
        </div>

        {/* Honest Limits Notice */}
        <div className="p-4 border-t border-borderLight dark:border-borderDark bg-gray-50 dark:bg-cardBgDark/50 text-[11px] text-gray-500 dark:text-gray-400 space-y-1">
          <div className="flex items-center gap-1.5 font-medium text-gray-700 dark:text-gray-300">
            <AlertCircle className="w-3.5 h-3.5 text-indigo-500" />
            <span>Honest Performance Details</span>
          </div>
          <p>
            Large PDFs take time to index because each passage is embedded locally via nomic-embed-text on your CPU/iGPU. Supported formats: PDF, DOCX, TXT, Markdown, CSV, PNG, JPG. All vectors stay strictly in your local SQLite database.
          </p>
        </div>
      </div>
    </div>
  );
};

