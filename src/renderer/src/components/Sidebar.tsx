import React, { useState, useMemo } from 'react';
import {
  Plus,
  Search,
  Pin,
  Trash2,
  Edit2,
  Folder,
  HardDrive,
  Settings,
  ChevronDown,
  ChevronUp,
  FolderPlus,
  Check,
  X,
  ShieldCheck,
  ArrowRight,
  MoreVertical,
  MessageSquare,
} from 'lucide-react';
import { Conversation, Workspace } from '../../../shared/types';

interface SidebarProps {
  conversations: Conversation[];
  activeId: string | null;
  onSelect: (id: string) => void;
  onNewChat: () => void;
  onDelete: (id: string) => void;
  onPin: (id: string, pinned: boolean) => void;
  onRename: (id: string, title: string) => void;
  onMoveWorkspace: (convId: string, workspaceId: string | null) => void;

  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string | null) => void;

  onOpenWorkspacesView: () => void;
  onOpenLibraryView: () => void;
  onOpenSearchModal: () => void;
  onOpenSettings: (tab?: string) => void;
  onOpenModelPicker: () => void;

  activeModel: string;
}

export const Sidebar: React.FC<SidebarProps> = ({
  conversations,
  activeId,
  onSelect,
  onNewChat,
  onDelete,
  onPin,
  onRename,
  onMoveWorkspace,
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onOpenWorkspacesView,
  onOpenLibraryView,
  onOpenSearchModal,
  onOpenSettings,
  onOpenModelPicker,
  activeModel,
}) => {
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editTitle, setEditTitle] = useState('');
  const [isWorkspaceDropdownOpen, setIsWorkspaceDropdownOpen] = useState(false);
  const [moveMenuConvId, setMoveMenuConvId] = useState<string | null>(null);
  const [showAllHistory, setShowAllHistory] = useState(false);

  // Active workspace object
  const activeWorkspace = useMemo(() => {
    return workspaces.find((w) => w.id === activeWorkspaceId) || null;
  }, [workspaces, activeWorkspaceId]);

  // Filter conversations for the current workspace view
  const scopedConversations = useMemo(() => {
    if (activeWorkspaceId === null) {
      // All Chats: show conversations where workspace_id is empty or undefined
      return conversations.filter((c) => !c.workspace_id);
    }
    return conversations.filter((c) => c.workspace_id === activeWorkspaceId);
  }, [conversations, activeWorkspaceId]);

  // Group chronologically
  const groups = useMemo(() => {
    const now = Date.now();
    const oneDay = 24 * 60 * 60 * 1000;
    const pinned: Conversation[] = [];
    const today: Conversation[] = [];
    const yesterday: Conversation[] = [];
    const thisWeek: Conversation[] = [];
    const older: Conversation[] = [];

    for (const c of scopedConversations) {
      if (c.pinned) {
        pinned.push(c);
        continue;
      }
      const age = now - c.updated_at;
      if (age < oneDay) {
        today.push(c);
      } else if (age < 2 * oneDay) {
        yesterday.push(c);
      } else if (age < 7 * oneDay) {
        thisWeek.push(c);
      } else {
        older.push(c);
      }
    }

    return [
      { title: 'Pinned', items: pinned },
      { title: 'Today', items: today },
      { title: 'Yesterday', items: yesterday },
      { title: 'This Week', items: thisWeek },
      { title: 'Older', items: older },
    ].filter((g) => g.items.length > 0);
  }, [scopedConversations]);

  const handleStartRename = (c: Conversation, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingId(c.id);
    setEditTitle(c.title);
  };

  const handleSaveRename = (id: string) => {
    if (editTitle.trim()) {
      onRename(id, editTitle.trim());
    }
    setEditingId(null);
  };

  // Limit to max 7 visible items total before "Show more"
  let totalRendered = 0;
  const maxVisible = showAllHistory ? 9999 : 7;

  return (
    <aside className="w-64 md:w-72 h-screen flex flex-col bg-sidebarBgLight dark:bg-sidebarBgDark border-r border-borderLight dark:border-borderDark select-none transition-all duration-200 shrink-0">
      {/* Top: Workspace Switcher */}
      <div className="p-3 border-b border-borderLight dark:border-borderDark relative">
        <button
          onClick={() => setIsWorkspaceDropdownOpen(!isWorkspaceDropdownOpen)}
          className="w-full flex items-center justify-between px-3 py-2 rounded-xl bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark hover:border-gray-400 dark:hover:border-gray-600 transition text-left text-xs font-medium text-gray-800 dark:text-gray-200 shadow-2xs group"
        >
          <div className="flex items-center gap-2 truncate">
            {activeWorkspace ? (
              <span
                className="w-2.5 h-2.5 rounded-full shrink-0"
                style={{ backgroundColor: activeWorkspace.color || '#2563EB' }}
              />
            ) : (
              <span className="w-2.5 h-2.5 rounded-full bg-blue-500 shrink-0" />
            )}
            <span className="truncate">
              {activeWorkspace ? activeWorkspace.name : 'All Chats'}
            </span>
          </div>
          <ChevronDown className="w-3.5 h-3.5 text-gray-400 shrink-0" />
        </button>

        {/* Workspace Dropdown */}
        {isWorkspaceDropdownOpen && (
          <div className="absolute top-14 left-3 right-3 bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark rounded-xl shadow-xl z-30 p-1.5 space-y-0.5 text-xs animate-in fade-in duration-150">
            <button
              onClick={() => {
                onSelectWorkspace(null);
                setIsWorkspaceDropdownOpen(false);
              }}
              className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                activeWorkspaceId === null
                  ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium'
                  : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
              }`}
            >
              <span>All Chats</span>
              {activeWorkspaceId === null && <Check className="w-3.5 h-3.5" />}
            </button>

            {workspaces.map((ws) => (
              <button
                key={ws.id}
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  setIsWorkspaceDropdownOpen(false);
                }}
                className={`w-full flex items-center justify-between px-2.5 py-1.5 rounded-lg transition ${
                  activeWorkspaceId === ws.id
                    ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-600 dark:text-blue-400 font-medium'
                    : 'hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-300'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span
                    className="w-2 h-2 rounded-full shrink-0"
                    style={{ backgroundColor: ws.color || '#2563EB' }}
                  />
                  <span className="truncate">{ws.name}</span>
                </div>
                {activeWorkspaceId === ws.id && <Check className="w-3.5 h-3.5 shrink-0" />}
              </button>
            ))}

            <div className="pt-1 border-t border-borderLight dark:border-borderDark mt-1">
              <button
                onClick={() => {
                  setIsWorkspaceDropdownOpen(false);
                  onOpenWorkspacesView();
                }}
                className="w-full flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg text-blue-600 dark:text-blue-400 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <FolderPlus className="w-3.5 h-3.5" />
                <span>Manage Workspaces</span>
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Primary Action: ONE Clear New Chat Button */}
      <div className="p-3 space-y-2">
        <button
          onClick={onNewChat}
          className="w-full flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition shadow-2xs"
        >
          <Plus className="w-4 h-4" />
          <span>New Chat</span>
        </button>

        {/* Quiet Navigation Items */}
        <nav className="space-y-0.5 text-xs">
          <button
            onClick={onOpenWorkspacesView}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-cardBgDark transition"
          >
            <Folder className="w-3.5 h-3.5 text-blue-500" />
            <span>Workspaces</span>
          </button>

          <button
            onClick={onOpenLibraryView}
            className="w-full flex items-center gap-2.5 px-3 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-cardBgDark transition"
          >
            <HardDrive className="w-3.5 h-3.5 text-emerald-500" />
            <span>Library</span>
          </button>

          <button
            onClick={onOpenSearchModal}
            className="w-full flex items-center justify-between px-3 py-1.5 rounded-xl text-gray-600 dark:text-gray-300 hover:bg-white dark:hover:bg-cardBgDark transition"
          >
            <div className="flex items-center gap-2.5">
              <Search className="w-3.5 h-3.5 text-gray-400" />
              <span>Search</span>
            </div>
            <kbd className="text-[10px] text-gray-400 font-mono bg-gray-200/50 dark:bg-gray-800 px-1.5 py-0.2 rounded">
              Ctrl+K
            </kbd>
          </button>
        </nav>
      </div>

      {/* Chat History: Grouped by Today / Yesterday / This Week (Max 7 before Show More) */}
      <div className="flex-1 overflow-y-auto px-3 space-y-4 text-xs">
        {groups.length === 0 ? (
          <div className="text-center py-12 text-gray-400 text-xs">
            No chats in this workspace yet.
          </div>
        ) : (
          groups.map((group) => {
            const visibleItems = group.items.filter(() => {
              if (totalRendered < maxVisible) {
                totalRendered++;
                return true;
              }
              return false;
            });

            if (visibleItems.length === 0) return null;

            return (
              <div key={group.title} className="space-y-0.5">
                <div className="text-[10px] uppercase font-semibold text-gray-400 dark:text-gray-500 tracking-wider px-2 py-0.5">
                  {group.title}
                </div>

                {visibleItems.map((conv) => {
                  const isActive = conv.id === activeId;
                  const isEditing = conv.id === editingId;

                  return (
                    <div
                      key={conv.id}
                      onClick={() => onSelect(conv.id)}
                      className={`group relative flex items-center justify-between px-2.5 py-1.5 rounded-xl cursor-pointer transition ${
                        isActive
                          ? 'bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 font-medium'
                          : 'text-gray-700 dark:text-gray-300 hover:bg-white dark:hover:bg-cardBgDark'
                      }`}
                    >
                      {isEditing ? (
                        <div
                          className="flex items-center gap-1 w-full"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="text"
                            value={editTitle}
                            onChange={(e) => setEditTitle(e.target.value)}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') handleSaveRename(conv.id);
                              if (e.key === 'Escape') setEditingId(null);
                            }}
                            autoFocus
                            className="flex-1 px-1.5 py-0.5 text-xs rounded bg-white dark:bg-gray-800 border border-blue-500 focus:outline-none text-gray-900 dark:text-white"
                          />
                          <button
                            onClick={() => handleSaveRename(conv.id)}
                            className="p-1 text-emerald-500 hover:text-emerald-600"
                          >
                            <Check className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => setEditingId(null)}
                            className="p-1 text-gray-400 hover:text-gray-500"
                          >
                            <X className="w-3 h-3" />
                          </button>
                        </div>
                      ) : (
                        <>
                          <div className="flex items-center gap-2 truncate pr-2">
                            {conv.pinned && (
                              <Pin className="w-3 h-3 text-blue-500 shrink-0 rotate-45" />
                            )}
                            <span className="truncate">{conv.title}</span>
                          </div>

                          {/* Hover Actions */}
                          <div className="hidden group-hover:flex items-center gap-0.5 shrink-0 text-gray-400">
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                onPin(conv.id, !conv.pinned);
                              }}
                              title={conv.pinned ? 'Unpin chat' : 'Pin chat'}
                              className="p-1 hover:text-blue-500 rounded"
                            >
                              <Pin
                                className={`w-3 h-3 ${conv.pinned ? 'fill-current text-blue-500' : ''}`}
                              />
                            </button>
                            <button
                              onClick={(e) => handleStartRename(conv, e)}
                              title="Rename"
                              className="p-1 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                            >
                              <Edit2 className="w-3 h-3" />
                            </button>
                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                if (confirm(`Delete chat "${conv.title}"?`)) {
                                  onDelete(conv.id);
                                }
                              }}
                              title="Delete chat"
                              className="p-1 hover:text-red-500 rounded"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                  );
                })}
              </div>
            );
          })
        )}

        {/* Show More Button if scopedConversations > 7 */}
        {scopedConversations.length > 7 && (
          <button
            onClick={() => setShowAllHistory(!showAllHistory)}
            className="w-full py-1 text-center text-[11px] text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
          >
            {showAllHistory
              ? 'Show fewer chats'
              : `Show more (${scopedConversations.length - 7} more)`}
          </button>
        )}
      </div>

      {/* Footer: Quiet Model Status & Settings */}
      <div className="p-3 border-t border-borderLight dark:border-borderDark bg-gray-50/50 dark:bg-cardBgDark/30 flex items-center justify-between text-xs text-gray-500">
        <button
          onClick={onOpenModelPicker}
          className="flex items-center gap-1.5 truncate hover:text-gray-900 dark:hover:text-gray-100 transition max-w-[170px]"
          title="Change active model"
        >
          <span className="w-2 h-2 rounded-full bg-emerald-500 shrink-0" />
          <span className="font-mono text-[11px] truncate">{activeModel}</span>
        </button>

        <button
          onClick={() => onOpenSettings()}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
          title="App Settings"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </aside>
  );
};
