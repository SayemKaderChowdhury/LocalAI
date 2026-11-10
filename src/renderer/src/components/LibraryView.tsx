import React, { useState, useMemo } from 'react';
import {
  HardDrive,
  Folder,
  FolderOpen,
  FileText,
  Upload,
  Plus,
  Search,
  Trash2,
  RefreshCw,
  ChevronRight,
  ChevronDown,
  Check,
  AlertCircle,
  FileSpreadsheet,
  FileImage,
  FileCode,
} from 'lucide-react';
import { DocumentItem } from '../../../shared/types';

interface LibraryViewProps {
  documents: DocumentItem[];
  onUploadFile: (scope: string) => void;
  onOpenFolderUpload: (scope: string, scopeName: string) => void;
  onDeleteDocument: (id: string) => void;
  currentScope: string;
  scopeName?: string;
  indexingProgress: { active: boolean; message: string; percent: number };
}

interface TreeNode {
  name: string;
  fullPath: string;
  isFolder: boolean;
  children: Record<string, TreeNode>;
  doc?: DocumentItem;
}

export const LibraryView: React.FC<LibraryViewProps> = ({
  documents,
  onUploadFile,
  onOpenFolderUpload,
  onDeleteDocument,
  currentScope,
  scopeName = 'Knowledge Base',
  indexingProgress,
}) => {
  const [search, setSearch] = useState('');
  const [expandedFolders, setExpandedFolders] = useState<Record<string, boolean>>({ '': true });
  const [deleteConfirmId, setDeleteConfirmId] = useState<string | null>(null);
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncStatus, setSyncStatus] = useState<string | null>(null);

  // Filter documents by scope
  const scopedDocuments = useMemo(() => {
    if (!currentScope || currentScope === 'all') return documents;
    return documents.filter((d) => d.scope === currentScope || d.scope === 'global');
  }, [documents, currentScope]);

  // Build tree from folder_path or filename
  const tree = useMemo(() => {
    const root: TreeNode = { name: 'Root', fullPath: '', isFolder: true, children: {} };

    for (const doc of scopedDocuments) {
      if (search.trim()) {
        const matchesName = doc.filename.toLowerCase().includes(search.toLowerCase());
        const matchesPath = (doc.folder_path || '').toLowerCase().includes(search.toLowerCase());
        if (!matchesName && !matchesPath) continue;
      }

      const rawPath = doc.folder_path || doc.filename;
      const parts = rawPath.replace(/\\/g, '/').split('/').filter(Boolean);

      let current = root;
      let currentPath = '';

      for (let i = 0; i < parts.length; i++) {
        const part = parts[i];
        currentPath = currentPath ? `${currentPath}/${part}` : part;
        const isFile = i === parts.length - 1;

        if (isFile) {
          current.children[part] = {
            name: part,
            fullPath: currentPath,
            isFolder: false,
            children: {},
            doc,
          };
        } else {
          if (!current.children[part]) {
            current.children[part] = {
              name: part,
              fullPath: currentPath,
              isFolder: true,
              children: {},
            };
          }
          current = current.children[part];
        }
      }
    }

    return root;
  }, [scopedDocuments, search]);

  const toggleFolder = (folderPath: string) => {
    setExpandedFolders((prev) => ({
      ...prev,
      [folderPath]: !prev[folderPath],
    }));
  };

  const getFileIcon = (fileType: string) => {
    const ext = fileType.toLowerCase();
    if (ext === 'xlsx' || ext === 'csv') return <FileSpreadsheet className="w-4 h-4 text-emerald-500 shrink-0" />;
    if (['png', 'jpg', 'jpeg', 'webp'].includes(ext)) return <FileImage className="w-4 h-4 text-blue-500 shrink-0" />;
    if (['md', 'txt'].includes(ext)) return <FileCode className="w-4 h-4 text-amber-500 shrink-0" />;
    return <FileText className="w-4 h-4 text-gray-500 shrink-0" />;
  };

  const totalFiles = scopedDocuments.length;
  const totalBytes = scopedDocuments.reduce((acc, d) => acc + (d.file_size || 0), 0);
  const totalPassages = scopedDocuments.reduce((acc, d) => acc + (d.chunk_count || 0), 0);

  // Render tree node recursively
  const renderNode = (node: TreeNode, depth: number = 0) => {
    const keys = Object.keys(node.children).sort((a, b) => {
      const isFolderA = node.children[a].isFolder;
      const isFolderB = node.children[b].isFolder;
      if (isFolderA && !isFolderB) return -1;
      if (!isFolderA && isFolderB) return 1;
      return a.localeCompare(b);
    });

    return (
      <div className="space-y-0.5">
        {keys.map((key) => {
          const child = node.children[key];
          const isExpanded = expandedFolders[child.fullPath] !== false; // default open

          if (child.isFolder) {
            return (
              <div key={child.fullPath} className="space-y-0.5">
                <div
                  onClick={() => toggleFolder(child.fullPath)}
                  style={{ paddingLeft: `${depth * 16 + 8}px` }}
                  className="py-1.5 pr-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer flex items-center justify-between text-xs font-medium text-gray-700 dark:text-gray-300 transition select-none group"
                >
                  <div className="flex items-center gap-1.5 truncate">
                    {isExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    )}
                    <Folder className="w-4 h-4 text-blue-500 shrink-0" />
                    <span className="truncate">{child.name}</span>
                  </div>
                  <span className="text-[10px] text-gray-400 font-mono">
                    {Object.keys(child.children).length} items
                  </span>
                </div>

                {isExpanded && renderNode(child, depth + 1)}
              </div>
            );
          }

          // File item
          const doc = child.doc!;
          const isDeleting = deleteConfirmId === doc.id;

          return (
            <div
              key={doc.id}
              style={{ paddingLeft: `${depth * 16 + 24}px` }}
              className="py-1.5 pr-3 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800/60 flex items-center justify-between text-xs transition group"
            >
              <div className="flex items-center gap-2 truncate pr-2">
                {getFileIcon(doc.file_type)}
                <span className="font-mono text-[11px] text-gray-800 dark:text-gray-200 truncate">
                  {child.name}
                </span>
                {doc.scope !== 'global' && (
                  <span className="px-1.5 py-0.2 rounded text-[9px] bg-blue-100 dark:bg-blue-950 text-blue-700 dark:text-blue-300 font-mono shrink-0">
                    scoped
                  </span>
                )}
              </div>

              <div className="flex items-center gap-3 shrink-0 text-[11px] text-gray-400 font-mono">
                <span>{(doc.file_size / 1024).toFixed(0)} KB</span>
                <span>{doc.chunk_count} passages</span>

                {isDeleting ? (
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => {
                        onDeleteDocument(doc.id);
                        setDeleteConfirmId(null);
                      }}
                      className="px-2 py-0.5 rounded bg-red-600 text-white text-[10px] hover:bg-red-500"
                    >
                      Delete
                    </button>
                    <button
                      onClick={() => setDeleteConfirmId(null)}
                      className="px-1.5 py-0.5 rounded text-gray-400 hover:text-gray-200 text-[10px]"
                    >
                      Cancel
                    </button>
                  </div>
                ) : (
                  <button
                    onClick={() => setDeleteConfirmId(doc.id)}
                    className="p-1 opacity-0 group-hover:opacity-100 hover:text-red-500 text-gray-400 transition"
                    title="Delete document from index"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-chatBgLight dark:bg-chatBgDark overflow-y-auto">
      {/* Top Header */}
      <div className="px-8 py-6 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-blue-500" />
            <span>Knowledge Library</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Local documents embedded with <code>nomic-embed-text</code>. Mirroring folder hierarchies for accurate citations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={() => onUploadFile(currentScope || 'global')}
            className="px-3 py-2 rounded-xl border border-borderLight dark:border-borderDark bg-white dark:bg-cardBgDark hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300 font-medium text-xs transition flex items-center gap-1.5"
          >
            <Upload className="w-4 h-4" />
            <span>Upload File</span>
          </button>

          <button
            onClick={() => onOpenFolderUpload(currentScope || 'global', scopeName)}
            className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition flex items-center gap-2 shadow-sm"
          >
            <FolderOpen className="w-4 h-4" />
            <span>Upload Folder</span>
          </button>
        </div>
      </div>

      {/* Main Area: Bento Statistics + File Tree */}
      <div className="p-8 max-w-5xl w-full mx-auto space-y-6">
        {/* Bento Stats Row */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 rounded-2xl bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark space-y-1">
            <div className="text-xs text-gray-500">Indexed Files</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100">
              {totalFiles}
            </div>
            <div className="text-[11px] text-gray-400">PDF, DOCX, TXT, CSV, XLSX, Images</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark space-y-1">
            <div className="text-xs text-gray-500">Vector Embeddings</div>
            <div className="text-xl font-semibold text-blue-600 dark:text-blue-400 font-mono">
              {totalPassages}
            </div>
            <div className="text-[11px] text-gray-400">Passages embedded locally</div>
          </div>

          <div className="p-4 rounded-2xl bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark space-y-1">
            <div className="text-xs text-gray-500">Storage Size</div>
            <div className="text-xl font-semibold text-gray-900 dark:text-gray-100 font-mono">
              {(totalBytes / (1024 * 1024)).toFixed(1)} MB
            </div>
            <div className="text-[11px] text-emerald-600 dark:text-emerald-400">100% on your SSD</div>
          </div>
        </div>

        {/* Search Bar */}
        <div className="relative">
          <Search className="w-4 h-4 absolute left-3 top-3 text-gray-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search files by name or folder path..."
            className="w-full pl-9 pr-4 py-2 text-xs rounded-xl bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark focus:outline-none focus:border-blue-500 text-gray-900 dark:text-gray-100"
          />
        </div>

        {/* Tree Explorer Container */}
        <div className="bg-white dark:bg-cardBgDark rounded-2xl border border-borderLight dark:border-borderDark overflow-hidden">
          <div className="px-4 py-3 border-b border-borderLight dark:border-borderDark flex items-center justify-between text-xs font-semibold text-gray-700 dark:text-gray-300">
            <span>Folder & File Hierarchy</span>
            <span className="font-mono text-gray-400 font-normal">
              Scope: {scopeName}
            </span>
          </div>

          <div className="p-3 min-h-[300px]">
            {scopedDocuments.length === 0 ? (
              <div className="py-16 text-center text-gray-400 text-xs space-y-2">
                <Folder className="w-10 h-10 mx-auto text-gray-300 dark:text-gray-700" />
                <p>No documents uploaded yet in this scope.</p>
                <p className="text-[11px] text-gray-500">
                  Click "Upload Folder" or "Upload File" above to index documents into the local vector store.
                </p>
              </div>
            ) : Object.keys(tree.children).length === 0 ? (
              <div className="py-12 text-center text-gray-400 text-xs">
                No files match your search query.
              </div>
            ) : (
              renderNode(tree)
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

