import { contextBridge, ipcRenderer } from 'electron';
import {
  Conversation,
  Message,
  AppSettings,
  ChatStreamChunk,
  Workspace,
  FolderScanResult,
  FolderIndexSummary,
} from '../shared/types';

export const api = {
  hardware: {
    getSpecs: () => ipcRenderer.invoke('hardware:get-specs'),
    getKnownModels: () => ipcRenderer.invoke('hardware:get-known-models'),
  },
  ollama: {
    getHealth: () => ipcRenderer.invoke('ollama:health'),
    start: () => ipcRenderer.invoke('ollama:start'),
    pull: (modelTag: string) => ipcRenderer.invoke('ollama:pull', modelTag),
    delete: (modelTag: string) => ipcRenderer.invoke('ollama:delete', modelTag),
    onPullProgress: (callback: (data: { modelTag: string; status: string; percent?: number }) => void) => {
      const sub = (_: any, data: any) => callback(data);
      ipcRenderer.on('ollama:pull-progress', sub);
      return () => ipcRenderer.removeListener('ollama:pull-progress', sub);
    },
  },
  workspaces: {
    list: (): Promise<Workspace[]> => ipcRenderer.invoke('workspaces:list'),
    save: (ws: Workspace): Promise<boolean> => ipcRenderer.invoke('workspaces:save', ws),
    delete: (id: string, deleteChatsAndFiles: boolean): Promise<boolean> =>
      ipcRenderer.invoke('workspaces:delete', { id, deleteChatsAndFiles }),
    updateMemory: (id: string, memory: string): Promise<boolean> =>
      ipcRenderer.invoke('workspaces:update-memory', { id, memory }),
  },
  chat: {
    send: (params: {
      conversationId: string;
      userMessage: string;
      images?: string[];
      model: string;
      systemPrompt?: string;
      temperature?: number;
      contextLength?: number;
      maxTokens?: number;
      assistantMessageId: string;
    }) => ipcRenderer.invoke('chat:send', params),
    abort: (messageId: string) => ipcRenderer.invoke('chat:abort', messageId),
    onChunk: (callback: (chunk: ChatStreamChunk) => void) => {
      const sub = (_: any, chunk: ChatStreamChunk) => callback(chunk);
      ipcRenderer.on('chat:chunk', sub);
      return () => ipcRenderer.removeListener('chat:chunk', sub);
    },
  },
  conversations: {
    list: (workspaceId?: string | null): Promise<Conversation[]> =>
      ipcRenderer.invoke('conversations:list', workspaceId),
    save: (conv: Conversation) => ipcRenderer.invoke('conversations:save', conv),
    delete: (id: string) => ipcRenderer.invoke('conversations:delete', id),
    pin: (id: string, pinned: boolean) => ipcRenderer.invoke('conversations:pin', { id, pinned }),
    rename: (id: string, title: string) => ipcRenderer.invoke('conversations:rename', { id, title }),
    moveWorkspace: (convId: string, workspaceId: string | null) =>
      ipcRenderer.invoke('conversations:move-workspace', { convId, workspaceId }),
  },
  messages: {
    list: (convId: string) => ipcRenderer.invoke('messages:list', convId),
    save: (msg: Message) => ipcRenderer.invoke('messages:save', msg),
    delete: (id: string) => ipcRenderer.invoke('messages:delete', id),
  },
  documents: {
    list: (scope?: string) => ipcRenderer.invoke('documents:list', scope),
    selectAndUpload: (scope: string) => ipcRenderer.invoke('documents:select-and-upload', scope),
    uploadFilePath: (filePath: string, scope: string) =>
      ipcRenderer.invoke('documents:upload-file-path', { filePath, scope }),
    delete: (docId: string) => ipcRenderer.invoke('documents:delete', docId),
    onProgress: (callback: (data: { message: string; percent: number }) => void) => {
      const sub = (_: any, data: any) => callback(data);
      ipcRenderer.on('rag:progress', sub);
      return () => ipcRenderer.removeListener('rag:progress', sub);
    },
  },
  folders: {
    selectAndScan: (): Promise<{ canceled?: boolean; success?: boolean; scanResult?: FolderScanResult; error?: string }> =>
      ipcRenderer.invoke('folders:select-and-scan'),
    indexFiles: (params: {
      folderRoot: string;
      files: Array<{ path: string; relativePath: string }>;
      scope: string;
    }): Promise<{ success: boolean; summary?: FolderIndexSummary; error?: string }> =>
      ipcRenderer.invoke('folders:index-files', params),
    sync: (params: {
      folderRoot: string;
      scope: string;
    }): Promise<{ success: boolean; result?: { added: number; updated: number; deleted: number; skipped: number; summary: string }; error?: string }> =>
      ipcRenderer.invoke('folders:sync', params),
  },
  voice: {
    transcribe: (params: {
      audioBase64: string;
      modelSize?: 'base' | 'tiny' | 'small';
    }): Promise<{ success: boolean; text?: string; duration?: number; language?: string; error?: string }> =>
      ipcRenderer.invoke('voice:transcribe', params),
  },
  search: {
    all: (query: string, workspaceId?: string) =>
      ipcRenderer.invoke('search:all', { query, workspaceId }),
  },
  settings: {
    get: () => ipcRenderer.invoke('settings:get'),
    save: (key: string, value: string) => ipcRenderer.invoke('settings:save', { key, value }),
  },
  export: {
    exportMarkdown: (title: string, messages: Message[]) =>
      ipcRenderer.invoke('export:chat-markdown', { title, messages }),
    exportPdf: (title: string) => ipcRenderer.invoke('export:chat-pdf', title),
  },
  app: {
    getPrivacyAudit: () => ipcRenderer.invoke('app:privacy-audit'),
    openExternal: (url: string) => ipcRenderer.invoke('app:open-external', url),
    notifyReady: () => ipcRenderer.invoke('app:ready'),
  },
};

contextBridge.exposeInMainWorld('api', api);

export type ElectronApi = typeof api;
