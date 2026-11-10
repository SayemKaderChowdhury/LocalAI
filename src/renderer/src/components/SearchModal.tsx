import React, { useState, useEffect, useRef } from 'react';
import { Search, X, MessageSquare, Folder, FileText, ArrowRight } from 'lucide-react';
import { Conversation, Workspace, DocumentItem } from '../../../shared/types';

interface SearchModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSelectConversation: (id: string) => void;
  onSelectWorkspace: (id: string) => void;
  onOpenLibrary: () => void;
  currentWorkspaceId?: string | null;
}

export const SearchModal: React.FC<SearchModalProps> = ({
  isOpen,
  onClose,
  onSelectConversation,
  onSelectWorkspace,
  onOpenLibrary,
  currentWorkspaceId,
}) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<{
    conversations: Conversation[];
    workspaces: Workspace[];
    documents: DocumentItem[];
  }>({ conversations: [], workspaces: [], documents: [] });
  const [isSearching, setIsSearching] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
      setResults({ conversations: [], workspaces: [], documents: [] });
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setResults({ conversations: [], workspaces: [], documents: [] });
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const res = await window.api.search.all(query, currentWorkspaceId || undefined);
        setResults(res);
      } catch (err) {
        console.error('Search error:', err);
      } finally {
        setIsSearching(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, currentWorkspaceId]);

  if (!isOpen) return null;

  const totalResults =
    results.conversations.length + results.workspaces.length + results.documents.length;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-start justify-center pt-20 p-4 animate-in fade-in duration-150"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-xl border border-borderLight dark:border-borderDark shadow-2xl overflow-hidden flex flex-col"
      >
        {/* Search Bar */}
        <div className="p-3 border-b border-borderLight dark:border-borderDark flex items-center gap-3">
          <Search className="w-4 h-4 text-gray-400 shrink-0 ml-1" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search conversations, workspaces, and files..."
            className="flex-1 bg-transparent text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none"
          />
          {query && (
            <button onClick={() => setQuery('')} className="p-1 text-gray-400 hover:text-gray-600">
              <X className="w-3.5 h-3.5" />
            </button>
          )}
          <kbd className="hidden sm:inline-block px-1.5 py-0.5 text-[10px] font-mono text-gray-400 bg-gray-100 dark:bg-gray-800 rounded border border-borderLight dark:border-borderDark">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4 text-xs">
          {!query.trim() && (
            <div className="py-8 text-center text-gray-400 text-xs">
              Type keywords to search across all chats, persistent workspaces, and indexed knowledge.
            </div>
          )}

          {query.trim() && totalResults === 0 && !isSearching && (
            <div className="py-8 text-center text-gray-400 text-xs">
              No results found for "{query}".
            </div>
          )}

          {/* Workspaces */}
          {results.workspaces.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold text-gray-400 px-2 tracking-wider">
                Workspaces ({results.workspaces.length})
              </div>
              {results.workspaces.map((ws) => (
                <div
                  key={ws.id}
                  onClick={() => {
                    onSelectWorkspace(ws.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <Folder className="w-3.5 h-3.5 text-blue-500 shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {ws.name}
                    </span>
                    {ws.instructions && (
                      <span className="text-[11px] text-gray-400 truncate max-w-xs">
                        · {ws.instructions}
                      </span>
                    )}
                  </div>
                  <ArrowRight className="w-3 h-3 text-gray-400 opacity-0 group-hover:opacity-100 transition shrink-0" />
                </div>
              ))}
            </div>
          )}

          {/* Conversations */}
          {results.conversations.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold text-gray-400 px-2 tracking-wider">
                Chats ({results.conversations.length})
              </div>
              {results.conversations.map((conv) => (
                <div
                  key={conv.id}
                  onClick={() => {
                    onSelectConversation(conv.id);
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <MessageSquare className="w-3.5 h-3.5 text-gray-400 shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate">
                      {conv.title}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0 font-mono">
                    {new Date(conv.updated_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          )}

          {/* Files */}
          {results.documents.length > 0 && (
            <div className="space-y-1">
              <div className="text-[10px] uppercase font-semibold text-gray-400 px-2 tracking-wider">
                Files & Documents ({results.documents.length})
              </div>
              {results.documents.map((doc) => (
                <div
                  key={doc.id}
                  onClick={() => {
                    onOpenLibrary();
                    onClose();
                  }}
                  className="px-3 py-2 rounded-xl hover:bg-gray-100 dark:hover:bg-gray-800/60 cursor-pointer flex items-center justify-between transition group"
                >
                  <div className="flex items-center gap-2 truncate">
                    <FileText className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                    <span className="font-medium text-gray-800 dark:text-gray-200 truncate font-mono text-[11px]">
                      {doc.folder_path || doc.filename}
                    </span>
                  </div>
                  <span className="text-[10px] text-gray-400 shrink-0">
                    {(doc.file_size / 1024).toFixed(0)} KB · {doc.chunk_count} passages
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

