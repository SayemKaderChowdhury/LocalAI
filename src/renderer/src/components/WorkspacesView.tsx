import React, { useState } from 'react';
import {
  Folder,
  Plus,
  Trash2,
  FileText,
  MessageSquare,
  Sparkles,
  ArrowRight,
  Brain,
  Edit2,
  X,
  Check,
  FolderOpen,
} from 'lucide-react';
import { Workspace, Conversation, DocumentItem } from '../../../shared/types';

interface WorkspacesViewProps {
  workspaces: Workspace[];
  activeWorkspaceId: string | null;
  onSelectWorkspace: (id: string | null) => void;
  onCreateWorkspace: (ws: Partial<Workspace>) => Promise<void>;
  onUpdateWorkspace: (ws: Workspace) => Promise<void>;
  onDeleteWorkspace: (id: string, deleteChatsAndFiles: boolean) => Promise<void>;
  conversations: Conversation[];
  documents: DocumentItem[];
  onOpenFolderUpload: (scope: string, scopeName: string) => void;
  onOpenChat: () => void;
}

export const WorkspacesView: React.FC<WorkspacesViewProps> = ({
  workspaces,
  activeWorkspaceId,
  onSelectWorkspace,
  onCreateWorkspace,
  onUpdateWorkspace,
  onDeleteWorkspace,
  conversations,
  documents,
  onOpenFolderUpload,
  onOpenChat,
}) => {
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [name, setName] = useState('');
  const [instructions, setInstructions] = useState('');
  const [color, setColor] = useState('#2563EB');

  // Deletion modal
  const [deleteTarget, setDeleteTarget] = useState<Workspace | null>(null);

  // Edit instructions / memory modal
  const [editingWs, setEditingWs] = useState<Workspace | null>(null);
  const [editInstructions, setEditInstructions] = useState('');
  const [editMemory, setEditMemory] = useState('');

  const handleCreate = async () => {
    if (!name.trim()) return;
    await onCreateWorkspace({
      id: 'ws_' + Date.now().toString(36),
      name: name.trim(),
      instructions: instructions.trim(),
      color,
      memory: '',
      created_at: Date.now(),
      updated_at: Date.now(),
    });
    setName('');
    setInstructions('');
    setIsCreateOpen(false);
  };

  const handleStartEdit = (ws: Workspace) => {
    setEditingWs(ws);
    setEditInstructions(ws.instructions || '');
    setEditMemory(ws.memory || '');
  };

  const handleSaveEdit = async () => {
    if (!editingWs) return;
    await onUpdateWorkspace({
      ...editingWs,
      instructions: editInstructions.trim(),
      memory: editMemory.trim(),
      updated_at: Date.now(),
    });
    setEditingWs(null);
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-chatBgLight dark:bg-chatBgDark overflow-y-auto">
      {/* Top Header */}
      <div className="px-8 py-6 border-b border-borderLight dark:border-borderDark flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
            <Folder className="w-5 h-5 text-blue-500" />
            <span>Workspaces</span>
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400 mt-0.5">
            Dedicated spaces for projects, clients, or research. Each has its own knowledge base, instructions, and isolated memory.
          </p>
        </div>

        <button
          onClick={() => setIsCreateOpen(true)}
          className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition flex items-center gap-2 shadow-sm"
        >
          <Plus className="w-4 h-4" />
          <span>New Workspace</span>
        </button>
      </div>

      {/* Main Content: Bento Grid */}
      <div className="p-8 max-w-6xl w-full mx-auto space-y-6">
        {/* Bento Grid: Max 3 columns */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* All Chats Card (Default Scope) */}
          <div
            onClick={() => {
              onSelectWorkspace(null);
              onOpenChat();
            }}
            className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between group ${
              activeWorkspaceId === null
                ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30'
                : 'bg-white dark:bg-cardBgDark border-borderLight dark:border-borderDark hover:border-gray-400 dark:hover:border-gray-600'
            }`}
          >
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <div className="w-9 h-9 rounded-xl bg-gray-100 dark:bg-gray-800 flex items-center justify-center text-gray-600 dark:text-gray-300 font-semibold text-xs">
                  💬
                </div>
                {activeWorkspaceId === null && (
                  <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-600 text-white">
                    Active
                  </span>
                )}
              </div>
              <div>
                <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100">
                  All Chats (General)
                </h3>
                <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                  Unassigned conversations using the standard system persona and global documents.
                </p>
              </div>
            </div>

            <div className="pt-4 border-t border-borderLight dark:border-borderDark/60 flex items-center justify-between text-[11px] text-gray-400">
              <span>{conversations.filter((c) => !c.workspace_id).length} chats</span>
              <span className="flex items-center gap-1 group-hover:text-blue-500 transition">
                Enter <ArrowRight className="w-3 h-3" />
              </span>
            </div>
          </div>

          {/* User Defined Workspaces */}
          {workspaces.map((ws) => {
            const wsChats = conversations.filter((c) => c.workspace_id === ws.id);
            const wsDocs = documents.filter((d) => d.scope === ws.id);
            const isActive = activeWorkspaceId === ws.id;

            return (
              <div
                key={ws.id}
                onClick={() => {
                  onSelectWorkspace(ws.id);
                  onOpenChat();
                }}
                className={`p-5 rounded-2xl border transition cursor-pointer flex flex-col justify-between group ${
                  isActive
                    ? 'bg-blue-50/50 dark:bg-blue-950/20 border-blue-500/50 ring-1 ring-blue-500/30'
                    : 'bg-white dark:bg-cardBgDark border-borderLight dark:border-borderDark hover:border-gray-400 dark:hover:border-gray-600'
                }`}
              >
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div
                      className="w-9 h-9 rounded-xl flex items-center justify-center text-white font-semibold text-xs shadow-sm"
                      style={{ backgroundColor: ws.color || '#2563EB' }}
                    >
                      <Folder className="w-4 h-4" />
                    </div>

                    <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleStartEdit(ws)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 dark:hover:text-gray-200 transition"
                        title="Edit Instructions & Memory"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={() => setDeleteTarget(ws)}
                        className="p-1.5 rounded-lg text-gray-400 hover:text-red-500 transition"
                        title="Delete Workspace"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-sm text-gray-900 dark:text-gray-100 truncate">
                        {ws.name}
                      </h3>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-600 text-white">
                          Active
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 line-clamp-2">
                      {ws.instructions || 'No custom instructions set. Chats will use standard assistant prompt.'}
                    </p>
                  </div>
                </div>

                <div className="pt-4 border-t border-borderLight dark:border-borderDark/60 flex items-center justify-between text-[11px] text-gray-400">
                  <div className="flex items-center gap-3">
                    <span className="flex items-center gap-1">
                      <MessageSquare className="w-3 h-3" />
                      {wsChats.length}
                    </span>
                    <span className="flex items-center gap-1">
                      <FileText className="w-3 h-3" />
                      {wsDocs.length} files
                    </span>
                  </div>
                  <span className="flex items-center gap-1 group-hover:text-blue-500 transition">
                    Open <ArrowRight className="w-3 h-3" />
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Create Workspace Modal */}
        {isCreateOpen && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-lg border border-borderLight dark:border-borderDark shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Folder className="w-4 h-4 text-blue-500" />
                  Create New Workspace
                </h3>
                <button onClick={() => setIsCreateOpen(false)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Workspace Name
                  </label>
                  <input
                    type="text"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="e.g. CalProof Startup, Q4 Tax Prep, Thesis Research"
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-cardBgDark border border-borderLight dark:border-borderDark focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Custom Instructions (Scoped to this project)
                  </label>
                  <textarea
                    rows={3}
                    value={instructions}
                    onChange={(e) => setInstructions(e.target.value)}
                    placeholder="e.g. You are helping me build my startup pitch deck. Answer concisely, cite financial figures strictly, and show step-by-step math."
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-cardBgDark border border-borderLight dark:border-borderDark focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Accent Color
                  </label>
                  <div className="flex items-center gap-2">
                    {['#2563EB', '#10B981', '#F59E0B', '#8B5CF6', '#EC4899', '#6B7280'].map((c) => (
                      <button
                        key={c}
                        onClick={() => setColor(c)}
                        className={`w-6 h-6 rounded-full transition ${
                          color === c ? 'ring-2 ring-offset-2 ring-blue-500' : ''
                        }`}
                        style={{ backgroundColor: c }}
                      />
                    ))}
                  </div>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setIsCreateOpen(false)}
                  className="px-3 py-1.5 rounded-xl border border-borderLight dark:border-borderDark text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleCreate}
                  disabled={!name.trim()}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white font-medium text-xs transition"
                >
                  Create Workspace
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Edit Instructions & Memory Modal */}
        {editingWs && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-lg border border-borderLight dark:border-borderDark shadow-2xl p-6 space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100 flex items-center gap-2">
                  <Brain className="w-4 h-4 text-blue-500" />
                  Workspace Settings & Memory: {editingWs.name}
                </h3>
                <button onClick={() => setEditingWs(null)} className="text-gray-400 hover:text-gray-600">
                  <X className="w-4 h-4" />
                </button>
              </div>

              <div className="space-y-3 text-xs">
                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1">
                    Custom System Instructions
                  </label>
                  <textarea
                    rows={3}
                    value={editInstructions}
                    onChange={(e) => setEditInstructions(e.target.value)}
                    placeholder="Instructions injected into every chat in this workspace."
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-cardBgDark border border-borderLight dark:border-borderDark focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-none"
                  />
                </div>

                <div>
                  <label className="block text-gray-700 dark:text-gray-300 font-medium mb-1 flex items-center justify-between">
                    <span>Project Memory & Key Facts</span>
                    <span className="text-[10px] text-gray-400 font-normal">Isolated to this workspace</span>
                  </label>
                  <textarea
                    rows={4}
                    value={editMemory}
                    onChange={(e) => setEditMemory(e.target.value)}
                    placeholder="e.g. Current runway is 14 months. Tech stack is React + Vite. CEO is Jane Doe."
                    className="w-full px-3 py-2 rounded-xl bg-gray-50 dark:bg-cardBgDark border border-borderLight dark:border-borderDark focus:outline-none focus:border-blue-500 text-gray-900 dark:text-white resize-none font-mono text-[11px]"
                  />
                </div>

                <div className="pt-2 flex items-center justify-between border-t border-borderLight dark:border-borderDark">
                  <button
                    onClick={() => onOpenFolderUpload(editingWs.id, editingWs.name)}
                    className="px-3 py-1.5 rounded-xl border border-blue-200 dark:border-blue-900 bg-blue-50 dark:bg-blue-950/40 text-blue-700 dark:text-blue-300 hover:bg-blue-100 transition flex items-center gap-1.5"
                  >
                    <FolderOpen className="w-3.5 h-3.5" />
                    <span>Upload Folder to this Workspace</span>
                  </button>
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button
                  onClick={() => setEditingWs(null)}
                  className="px-3 py-1.5 rounded-xl border border-borderLight dark:border-borderDark text-xs hover:bg-gray-100 dark:hover:bg-gray-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleSaveEdit}
                  className="px-4 py-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white font-medium text-xs transition"
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Delete Confirmation Modal (Rule: Ask once, offer move vs delete all) */}
        {deleteTarget && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-cardBgDark rounded-2xl w-full max-w-md border border-borderLight dark:border-borderDark shadow-2xl p-6 space-y-4">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-gray-100">
                Delete Workspace "{deleteTarget.name}"?
              </h3>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                What would you like to do with the conversations and knowledge files associated with this workspace?
              </p>

              <div className="space-y-2 pt-2">
                <button
                  onClick={async () => {
                    await onDeleteWorkspace(deleteTarget.id, false);
                    setDeleteTarget(null);
                  }}
                  className="w-full p-3 rounded-xl border border-borderLight dark:border-borderDark hover:bg-gray-50 dark:hover:bg-gray-800 text-left transition text-xs"
                >
                  <div className="font-semibold text-gray-900 dark:text-gray-100">
                    Move chats to All Chats
                  </div>
                  <div className="text-gray-500 text-[11px] mt-0.5">
                    Preserves your chat history and files in the general library.
                  </div>
                </button>

                <button
                  onClick={async () => {
                    await onDeleteWorkspace(deleteTarget.id, true);
                    setDeleteTarget(null);
                  }}
                  className="w-full p-3 rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 hover:bg-red-100/60 text-left transition text-xs"
                >
                  <div className="font-semibold text-red-600 dark:text-red-400">
                    Delete chats and files too
                  </div>
                  <div className="text-red-500/80 text-[11px] mt-0.5">
                    Permanently removes all scoped chats, messages, and uploaded documents.
                  </div>
                </button>
              </div>

              <div className="flex justify-end pt-2">
                <button
                  onClick={() => setDeleteTarget(null)}
                  className="px-3 py-1.5 rounded-xl border border-borderLight dark:border-borderDark text-xs hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-600 dark:text-gray-300"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

