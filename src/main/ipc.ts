import { ipcMain, dialog, shell, BrowserWindow } from 'electron';
import fs from 'fs';
import path from 'path';
import crypto from 'crypto';
import { execSync } from 'child_process';
import { LocalDatabase } from './db';
import { OllamaClient } from './ollama';
import { RagEngine } from './rag';
import { getHardwareSpecs, KNOWN_MODELS } from './hardware';
import { Conversation, Message, AppSettings, Workspace } from '../shared/types';
import { logger } from './logger';

export function setupIpcHandlers(
  mainWindow: BrowserWindow,
  db: LocalDatabase,
  ollama: OllamaClient,
  rag: RagEngine,
  appStartTime: number = Date.now()
) {
  let cachedCliVersion: string | null = null;

  // --- App Lifecycle & Benchmarking ---
  ipcMain.handle('app:ready', async () => {
    const elapsed = Date.now() - appStartTime;
    logger.startup('first chat usable (ready)', elapsed, 'UI loaded and interactive');
    return { elapsed };
  });

  // --- Hardware ---
  ipcMain.handle('hardware:get-specs', async (_event, forceRefresh?: boolean) => {
    if (!forceRefresh) {
      const cached = db.getSetting('hardware_cache');
      if (cached) {
        try {
          return JSON.parse(cached);
        } catch {}
      }
    }
    const specs = getHardwareSpecs(forceRefresh);
    try {
      db.saveSetting('hardware_cache', JSON.stringify(specs));
    } catch {}
    return specs;
  });

  ipcMain.handle('hardware:get-known-models', async () => {
    return KNOWN_MODELS;
  });

  // --- Ollama Engine ---
  ipcMain.handle('ollama:health', async () => {
    const health = await ollama.checkHealth();
    if (!cachedCliVersion && !health.running) {
      const cli = await ollama.checkCliInstalled();
      if (cli.version) cachedCliVersion = cli.version;
    }
    return {
      cliInstalled: health.running || Boolean(cachedCliVersion),
      cliVersion: cachedCliVersion || (health.running ? 'Running' : undefined),
      running: health.running,
      models: health.models,
      error: health.error,
    };
  });

  ipcMain.handle('ollama:start', async () => {
    return await ollama.startOllama();
  });

  ipcMain.handle('ollama:pull', async (_event, modelTag: string) => {
    try {
      await ollama.pullModel(modelTag, (info) => {
        mainWindow.webContents.send('ollama:pull-progress', { modelTag, ...info });
      });
      return { success: true };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle('ollama:delete', async (_event, modelTag: string) => {
    try {
      const res = await ollama.deleteModel(modelTag);
      return { success: res };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  // --- Workspaces (Feature 4) ---
  ipcMain.handle('workspaces:list', async () => {
    return db.getWorkspaces();
  });

  ipcMain.handle('workspaces:save', async (_event, ws: Workspace) => {
    db.saveWorkspace(ws);
    return true;
  });

  ipcMain.handle(
    'workspaces:delete',
    async (_event, { id, deleteChatsAndFiles }: { id: string; deleteChatsAndFiles: boolean }) => {
      db.deleteWorkspace(id, deleteChatsAndFiles);
      return true;
    }
  );

  ipcMain.handle(
    'workspaces:update-memory',
    async (_event, { id, memory }: { id: string; memory: string }) => {
      db.updateWorkspaceMemory(id, memory);
      return true;
    }
  );

  ipcMain.handle(
    'conversations:move-workspace',
    async (_event, { convId, workspaceId }: { convId: string; workspaceId: string | null }) => {
      db.moveConversationToWorkspace(convId, workspaceId);
      return true;
    }
  );

  // --- Conversations ---
  ipcMain.handle('conversations:list', async (_event, workspaceId?: string | null) => {
    return db.getConversations(workspaceId);
  });

  ipcMain.handle('conversations:save', async (_event, conv: Conversation) => {
    db.saveConversation(conv);
    return true;
  });

  ipcMain.handle('conversations:delete', async (_event, id: string) => {
    db.deleteConversation(id);
    return true;
  });

  ipcMain.handle('conversations:pin', async (_event, { id, pinned }: { id: string; pinned: boolean }) => {
    db.pinConversation(id, pinned);
    return true;
  });

  ipcMain.handle('conversations:rename', async (_event, { id, title }: { id: string; title: string }) => {
    db.renameConversation(id, title);
    return true;
  });

  // --- Messages ---
  ipcMain.handle('messages:list', async (_event, conversationId: string) => {
    return db.getMessages(conversationId);
  });

  ipcMain.handle('messages:save', async (_event, msg: Message) => {
    db.saveMessage(msg);
    return true;
  });

  ipcMain.handle('messages:delete', async (_event, id: string) => {
    db.deleteMessage(id);
    return true;
  });

  // --- Streaming Chat with RAG (Workspaces & Knowledge Scoped) ---
  ipcMain.handle(
    'chat:send',
    async (
      _event,
      payload: {
        conversationId: string;
        userMessage: string;
        images?: string[];
        model: string;
        systemPrompt?: string;
        temperature?: number;
        contextLength?: number;
        maxTokens?: number;
        assistantMessageId: string;
      }
    ) => {
      const {
        conversationId,
        userMessage,
        images,
        model,
        systemPrompt,
        temperature,
        contextLength,
        maxTokens,
        assistantMessageId,
      } = payload;

      // 1. Save user message to database
      const userMsg: Message = {
        id: 'msg_' + crypto.randomUUID().replace(/-/g, '').substring(0, 16),
        conversation_id: conversationId,
        role: 'user',
        content: userMessage,
        created_at: Date.now(),
        images,
      };
      db.saveMessage(userMsg);

      // Check if conversation belongs to a workspace
      const allConvs = db.getConversations();
      const currentConv = allConvs.find((c) => c.id === conversationId);
      let ragScope = conversationId;
      let workspaceInstructions = '';
      let workspaceMemory = '';

      if (currentConv && currentConv.workspace_id) {
        const ws = db.getWorkspace(currentConv.workspace_id);
        if (ws) {
          ragScope = ws.id; // Scope RAG to this workspace
          if (ws.instructions) workspaceInstructions = ws.instructions.trim();
          if (ws.memory) workspaceMemory = ws.memory.trim();
        }
      }

      // 2. Perform local RAG retrieval
      let ragCitations: any[] = [];
      let ragSystemPromptAddition = '';
      try {
        const ragResult = await rag.retrieveRelevantChunks(userMessage, ragScope);
        ragCitations = ragResult.citations;
        ragSystemPromptAddition = ragResult.contextPrompt;
      } catch (ragErr) {
        console.warn('RAG retrieval notice:', ragErr);
      }

      // 3. Assemble message history
      const prevMessages = db.getMessages(conversationId);
      const apiMessages: Array<{ role: string; content: string; images?: string[] }> = [];

      // Combine default system prompt + workspace instructions + memory + conversation system prompt + RAG context
      const settings = db.getSettings();
      let combinedSystemPrompt = (systemPrompt || settings.defaultSystemPrompt).trim();
      if (workspaceInstructions) {
        combinedSystemPrompt = `${workspaceInstructions}\n\n${combinedSystemPrompt}`;
      }
      if (workspaceMemory) {
        combinedSystemPrompt = `${combinedSystemPrompt}\n\n[Workspace Memory & Context]\n${workspaceMemory}`;
      }
      if (ragSystemPromptAddition) {
        combinedSystemPrompt = `${combinedSystemPrompt}\n\n${ragSystemPromptAddition}`;
      }

      if (combinedSystemPrompt) {
        apiMessages.push({ role: 'system', content: combinedSystemPrompt });
      }

      // Add recent history
      for (const m of prevMessages) {
        apiMessages.push({
          role: m.role,
          content: m.content,
          images: m.images && m.images.length ? m.images : undefined,
        });
      }

      let accumulatedAnswer = '';
      let finalTokensPerSec = 0;
      let finalDurationMs = 0;
      let hasReceivedFirstToken = false;

      // 4. Stream chat response
      ollama.chatStream(
        {
          messageId: assistantMessageId,
          model,
          messages: apiMessages,
          temperature,
          contextLength,
          maxTokens,
        },
        (chunk) => {
          if (!hasReceivedFirstToken && chunk.delta) {
            hasReceivedFirstToken = true;
            const t4 = Date.now() - appStartTime;
            logger.startup('first model reply started', t4, `First token received from '${model}'`);
          }

          accumulatedAnswer += chunk.delta;
          if (chunk.tokensPerSec) finalTokensPerSec = chunk.tokensPerSec;
          if (chunk.durationMs) finalDurationMs = chunk.durationMs;

          mainWindow.webContents.send('chat:chunk', {
            ...chunk,
            citations: ragCitations,
          });

          if (chunk.done) {
            // Save completed assistant message to SQLite
            const assistantMsg: Message = {
              id: assistantMessageId,
              conversation_id: conversationId,
              role: 'assistant',
              content: accumulatedAnswer,
              created_at: Date.now(),
              tokens_per_sec: finalTokensPerSec,
              total_duration_ms: finalDurationMs,
              citations: ragCitations,
            };
            db.saveMessage(assistantMsg);
          }
        }
      );

      return { userMessageId: userMsg.id };
    }
  );

  ipcMain.handle('chat:abort', async (_event, messageId: string) => {
    ollama.abortChat(messageId);
    return true;
  });

  // --- Document Ingestion & Knowledge Library ---
  ipcMain.handle('documents:list', async (_event, scope?: string) => {
    return db.getDocuments(scope);
  });

  ipcMain.handle('documents:select-and-upload', async (_event, scope: string) => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Document to Index',
      properties: ['openFile'],
      filters: [
        {
          name: 'Supported Documents & Images',
          extensions: ['pdf', 'docx', 'txt', 'md', 'csv', 'xlsx', 'png', 'jpg', 'jpeg', 'webp'],
        },
      ],
    });

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    const filePath = result.filePaths[0];
    try {
      const doc = await rag.ingestDocument(filePath, scope, undefined, (msg, pct) => {
        mainWindow.webContents.send('rag:progress', { message: msg, percent: pct });
      });
      return { success: true, doc };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(
    'documents:upload-file-path',
    async (_event, { filePath, scope }: { filePath: string; scope: string }) => {
      try {
        const doc = await rag.ingestDocument(filePath, scope, undefined, (msg, pct) => {
          mainWindow.webContents.send('rag:progress', { message: msg, percent: pct });
        });
        return { success: true, doc };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  ipcMain.handle('documents:delete', async (_event, docId: string) => {
    db.deleteDocument(docId);
    return true;
  });

  // --- Folder Upload & Differential Sync (Feature 2) ---
  ipcMain.handle('folders:select-and-scan', async () => {
    const result = await dialog.showOpenDialog(mainWindow, {
      title: 'Select Folder to Index',
      properties: ['openDirectory'],
    });

    if (result.canceled || !result.filePaths.length) {
      return { canceled: true };
    }

    const folderPath = result.filePaths[0];
    try {
      const scanResult = rag.scanFolder(folderPath);
      return { success: true, scanResult };
    } catch (err: any) {
      return { success: false, error: err.message };
    }
  });

  ipcMain.handle(
    'folders:index-files',
    async (
      _event,
      payload: {
        folderRoot: string;
        files: Array<{ path: string; relativePath: string }>;
        scope: string;
      }
    ) => {
      const { folderRoot, files, scope } = payload;
      try {
        const summary = await rag.indexFolderFiles(folderRoot, files, scope, (msg, pct) => {
          mainWindow.webContents.send('rag:progress', { message: msg, percent: pct });
        });
        return { success: true, summary };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  ipcMain.handle(
    'folders:sync',
    async (_event, payload: { folderRoot: string; scope: string }) => {
      const { folderRoot, scope } = payload;
      try {
        const result = await rag.syncFolder(folderRoot, scope, (msg, pct) => {
          mainWindow.webContents.send('rag:progress', { message: msg, percent: pct });
        });
        return { success: true, result };
      } catch (err: any) {
        return { success: false, error: err.message };
      }
    }
  );

  // --- Voice to Text (Feature 1: Local faster-whisper) ---
  ipcMain.handle(
    'voice:transcribe',
    async (
      _event,
      payload: { audioBase64: string; modelSize?: 'base' | 'tiny' | 'small' }
    ) => {
      const { audioBase64, modelSize = 'base' } = payload;
      const tempWav = path.join(db.getStorageDir(), `voice_${Date.now()}.wav`);
      try {
        const buffer = Buffer.from(audioBase64, 'base64');
        fs.writeFileSync(tempWav, buffer);

        const pythonExe = path.resolve(process.cwd(), 'whisper-env/Scripts/python.exe');
        const scriptPath = path.resolve(process.cwd(), 'scripts/transcribe.py');

        if (!fs.existsSync(pythonExe)) {
          return { success: false, error: 'Whisper Python environment not found.' };
        }

        const raw = execSync(`"${pythonExe}" "${scriptPath}" "${tempWav}" --model ${modelSize}`, {
          encoding: 'utf-8',
          timeout: 45000,
          windowsHide: true,
          stdio: ['ignore', 'pipe', 'pipe'],
        });

        try {
          const parsed = JSON.parse(raw.trim());
          return parsed;
        } catch {
          return { success: false, error: 'Transcription output parse error: ' + raw };
        }
      } catch (err: any) {
        console.error('Transcription error:', err);
        return { success: false, error: err.message || 'Offline Whisper transcription failed' };
      } finally {
        if (fs.existsSync(tempWav)) {
          try {
            fs.unlinkSync(tempWav);
          } catch {}
        }
      }
    }
  );

  // --- Unified Search across chats, workspaces, and files ---
  ipcMain.handle(
    'search:all',
    async (_event, payload: { query: string; workspaceId?: string }) => {
      const { query, workspaceId } = payload;
      return db.search(query, workspaceId);
    }
  );

  // --- Settings ---
  ipcMain.handle('settings:get', async () => {
    return db.getSettings();
  });

  ipcMain.handle('settings:save', async (_event, { key, value }: { key: string; value: string }) => {
    db.saveSetting(key, value);
    return true;
  });

  // --- Export Chat ---
  ipcMain.handle(
    'export:chat-markdown',
    async (_event, { title, messages }: { title: string; messages: Message[] }) => {
      const result = await dialog.showSaveDialog(mainWindow, {
        title: 'Export Chat as Markdown',
        defaultPath: `${title.replace(/[^a-z0-9_-]/gi, '_')}.md`,
        filters: [{ name: 'Markdown Document', extensions: ['md'] }],
      });

      if (result.canceled || !result.filePath) return { canceled: true };

      let md = `# ${title}\n*Exported from LocalAI on ${new Date().toLocaleString()}*\n\n---\n\n`;
      for (const m of messages) {
        const roleName = m.role === 'user' ? '### 👤 User' : '### 🤖 LocalAI';
        md += `${roleName}\n\n${m.content}\n\n`;
        if (m.citations && m.citations.length) {
          md += `*Sources:*\n`;
          for (const c of m.citations) {
            md += `- ${c.source} (${c.pageOrSection})\n`;
          }
          md += '\n';
        }
        md += `---\n\n`;
      }

      fs.writeFileSync(result.filePath, md, 'utf-8');
      return { success: true, filePath: result.filePath };
    }
  );

  ipcMain.handle('export:chat-pdf', async (_event, title: string) => {
    const result = await dialog.showSaveDialog(mainWindow, {
      title: 'Export Chat as PDF',
      defaultPath: `${title.replace(/[^a-z0-9_-]/gi, '_')}.pdf`,
      filters: [{ name: 'PDF Document', extensions: ['pdf'] }],
    });

    if (result.canceled || !result.filePath) return { canceled: true };

    const pdfData = await mainWindow.webContents.printToPDF({
      printBackground: true,
      pageSize: 'A4',
    });

    fs.writeFileSync(result.filePath, pdfData);
    return { success: true, filePath: result.filePath };
  });

  // --- Privacy Audit ---
  ipcMain.handle('app:privacy-audit', async () => {
    return {
      statement: 'All chats, files, embeddings, voice recordings, and inference remain 100% on this PC.',
      networkCallsAllowed: ['http://127.0.0.1:11434 (Ollama local inference)'],
      cloudApisUsed: 'None. No OpenAI, No Anthropic, No Google, No cloud tokens.',
      telemetryEnabled: false,
      analyticsEnabled: false,
      storageLocation: db.getStorageDir(),
      voiceModel: 'Local faster-whisper (CPU int8)',
    };
  });

  // --- External link (Ollama installer only) ---
  ipcMain.handle('app:open-external', async (_event, url: string) => {
    if (url.startsWith('https://ollama.com') || url.startsWith('https://github.com/JustVugg/colibri')) {
      await shell.openExternal(url);
    }
  });
}
