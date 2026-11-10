import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Sidebar } from './components/Sidebar';
import { ChatArea } from './components/ChatArea';
import { ChatInput } from './components/ChatInput';
import { WorkspacesView } from './components/WorkspacesView';
import { LibraryView } from './components/LibraryView';
import { ModelPicker } from './components/ModelPicker';
import { SettingsModal } from './components/SettingsModal';
import { ChatControlsModal } from './components/ChatControlsModal';
import { FirstLaunchWizard } from './components/FirstLaunchWizard';
import { OomWarningModal } from './components/OomWarningModal';
import { FolderUploadModal } from './components/FolderUploadModal';
import { SearchModal } from './components/SearchModal';
import { ImageLightboxModal } from './components/ImageLightboxModal';
import {
  Conversation,
  Message,
  HardwareSpecs,
  ModelTierItem,
  OllamaModel,
  DocumentItem,
  AppSettings,
  ChatStreamChunk,
  Workspace,
} from '../../shared/types';

export const App: React.FC = () => {
  // Navigation View State: 'chat' | 'workspaces' | 'library'
  const [activeView, setActiveView] = useState<'chat' | 'workspaces' | 'library'>('chat');

  // Workspaces State
  const [workspaces, setWorkspaces] = useState<Workspace[]>([]);
  const [activeWorkspaceId, setActiveWorkspaceId] = useState<string | null>(null);

  // Conversations & Messages State
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);

  // System & Model State
  const [hardware, setHardware] = useState<HardwareSpecs | null>(null);
  const [knownModels, setKnownModels] = useState<ModelTierItem[]>([]);
  const [installedModels, setInstalledModels] = useState<OllamaModel[]>([]);
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [settings, setSettings] = useState<AppSettings>({
    activeModel: 'qwen3:4b',
    defaultPersona: 'General Assistant',
    defaultSystemPrompt:
      "You are an intelligent, helpful local AI running entirely privately on the user's PC. Answer concisely, accurately, and show steps for code.",
    theme: 'dark',
    colibriConsent: false,
    storageDir: '',
    firstRunComplete: false,
    whisperModel: 'base',
    voiceChatMode: false,
    enableAbliteratedModels: false,
  });

  // Streaming State
  const [isStreaming, setIsStreaming] = useState(false);
  const [activeStreamingMessageId, setActiveStreamingMessageId] = useState<string | null>(null);

  // Background Progress
  const [indexingProgress, setIndexingProgress] = useState<{
    active: boolean;
    message: string;
    percent: number;
  }>({ active: false, message: '', percent: 0 });

  const [pullProgress, setPullProgress] = useState<{
    modelTag: string;
    status: string;
    percent?: number;
  } | null>(null);

  // Modals
  const [isModelPickerOpen, setIsModelPickerOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settingsTab, setSettingsTab] = useState('hardware');
  const [isControlsOpen, setIsControlsOpen] = useState(false);
  const [isFirstLaunchOpen, setIsFirstLaunchOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [isFolderUploadOpen, setIsFolderUploadOpen] = useState(false);
  const [folderUploadScope, setFolderUploadScope] = useState<{ scope: string; scopeName: string }>({
    scope: 'global',
    scopeName: 'Global Knowledge',
  });
  const [zoomedImageUrl, setZoomedImageUrl] = useState<string | null>(null);
  const [oomState, setOomState] = useState<{ isOpen: boolean; failedModel: string }>({
    isOpen: false,
    failedModel: '',
  });

  // Theme Sync
  useEffect(() => {
    if (settings.theme === 'dark') {
      document.documentElement.classList.add('dark');
    } else {
      document.documentElement.classList.remove('dark');
    }
  }, [settings.theme]);

  // Global Keyboard Shortcuts (Ctrl+K for search)
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Initial Data Refresh
  const refreshAll = useCallback(async () => {
    try {
      console.log('[APP-MOUNT] refreshAll starting Promise.all...');
      const [specs, known, health, wsList, convs, docs, sets] = await Promise.all([
        window.api.hardware.getSpecs(),
        window.api.hardware.getKnownModels(),
        window.api.ollama.getHealth(),
        window.api.workspaces.list(),
        window.api.conversations.list(),
        window.api.documents.list(),
        window.api.settings.get(),
      ]);
      console.log('[APP-MOUNT] Promise.all completed successfully!');

      setHardware(specs);
      setKnownModels(known);
      setWorkspaces(wsList);
      setInstalledModels(health.models || []);
      setConversations(convs);
      setDocuments(docs);
      setSettings(sets);

      // Select active chat if exists and none active
      if (convs.length > 0 && !activeId) {
        setActiveId(convs[0].id);
      }

      // First run wizard check
      if (!sets.firstRunComplete) {
        setIsFirstLaunchOpen(true);
      }

      // Notify main process that the first chat interface is ready and interactive
      if (window.api?.app?.notifyReady) {
        window.api.app.notifyReady();
      }
    } catch (err) {
      console.error('[APP-MOUNT] Initialization error:', err);
    }
  }, [activeId]);

  useEffect(() => {
    refreshAll();
  }, [refreshAll]);

  // Load messages when activeId changes
  useEffect(() => {
    if (activeId) {
      window.api.messages.list(activeId).then((msgs) => setMessages(msgs));
    } else {
      setMessages([]);
    }
  }, [activeId]);

  // Listen to IPC stream events
  useEffect(() => {
    const unsubChunk = window.api.chat.onChunk((chunk: ChatStreamChunk) => {
      setMessages((prev) => {
        const existingIdx = prev.findIndex((m) => m.id === chunk.messageId);
        if (existingIdx !== -1) {
          const updated = [...prev];
          const curr = updated[existingIdx];
          updated[existingIdx] = {
            ...curr,
            content: curr.content + chunk.delta,
            tokens_per_sec: chunk.tokensPerSec || curr.tokens_per_sec,
            total_duration_ms: chunk.durationMs || curr.total_duration_ms,
            citations: chunk.citations || curr.citations,
          };
          return updated;
        } else {
          const newMsg: Message = {
            id: chunk.messageId,
            conversation_id: activeId || '',
            role: 'assistant',
            content: chunk.delta,
            created_at: Date.now(),
            tokens_per_sec: chunk.tokensPerSec,
            total_duration_ms: chunk.durationMs,
            citations: chunk.citations,
          };
          return [...prev, newMsg];
        }
      });

      if (chunk.isOom) {
        setIsStreaming(false);
        setActiveStreamingMessageId(null);
        setOomState({
          isOpen: true,
          failedModel: activeConversation?.model || settings.activeModel,
        });
      }

      if (chunk.done) {
        setIsStreaming(false);
        setActiveStreamingMessageId(null);
      }
    });

    const unsubRag = window.api.documents.onProgress((data) => {
      setIndexingProgress({
        active: data.percent < 100,
        message: data.message,
        percent: data.percent,
      });
      if (data.percent >= 100) {
        setTimeout(() => {
          setIndexingProgress((p) => ({ ...p, active: false }));
          window.api.documents.list().then(setDocuments);
        }, 1200);
      }
    });

    const unsubPull = window.api.ollama.onPullProgress((data) => {
      setPullProgress(data);
      if (data.percent && data.percent >= 100) {
        setTimeout(() => {
          setPullProgress(null);
          window.api.ollama.getHealth().then((h) => {
            setInstalledModels(h.models || []);
          });
        }, 1500);
      }
    });

    return () => {
      unsubChunk();
      unsubRag();
      unsubPull();
    };
  }, [activeId, settings.activeModel]);

  const activeConversation = conversations.find((c) => c.id === activeId) || null;
  const activeWorkspace = workspaces.find((w) => w.id === activeWorkspaceId) || null;

  // Check if any vision model is currently installed
  const isVisionModelInstalled = useMemo(() => {
    return installedModels.some(
      (m) =>
        m.name.includes('vision') ||
        m.name.includes('qwen3.5') ||
        m.name.includes('gemma3') ||
        m.name.includes('vl')
    );
  }, [installedModels]);

  // Handler: Create new conversation
  const handleNewChat = useCallback(async () => {
    const id = 'conv_' + Date.now().toString(36) + Math.random().toString(36).substring(2, 6);
    const newConv: Conversation = {
      id,
      title: 'New Chat',
      created_at: Date.now(),
      updated_at: Date.now(),
      pinned: false,
      temperature: 0.7,
      context_length: 4096,
      max_tokens: 2048,
      model: settings.activeModel,
      workspace_id: activeWorkspaceId || undefined,
    };
    await window.api.conversations.save(newConv);
    setConversations((prev) => [newConv, ...prev]);
    setActiveId(id);
    setMessages([]);
    setActiveView('chat');
  }, [settings.activeModel, activeWorkspaceId]);

  // Handler: Send Message
  const handleSendMessage = async (text: string, images?: string[]) => {
    let currentConvId = activeId;
    let targetConv = activeConversation;

    if (!currentConvId || !targetConv) {
      const newId = 'conv_' + Date.now().toString(36);
      const title = text.slice(0, 36).trim() || 'New Chat';
      const newConv: Conversation = {
        id: newId,
        title,
        created_at: Date.now(),
        updated_at: Date.now(),
        pinned: false,
        temperature: 0.7,
        context_length: 4096,
        max_tokens: 2048,
        model: settings.activeModel,
        workspace_id: activeWorkspaceId || undefined,
      };
      await window.api.conversations.save(newConv);
      setConversations((prev) => [newConv, ...prev]);
      setActiveId(newId);
      currentConvId = newId;
      targetConv = newConv;
    } else if (messages.length === 0 && targetConv.title === 'New Chat') {
      const updatedTitle = text.slice(0, 36).trim() || 'New Chat';
      await window.api.conversations.rename(currentConvId, updatedTitle);
      targetConv.title = updatedTitle;
      setConversations((prev) =>
        prev.map((c) => (c.id === currentConvId ? { ...c, title: updatedTitle } : c))
      );
    }

    const assistantMsgId = 'msg_' + Date.now().toString(36) + '_asst';

    const userMsg: Message = {
      id: 'msg_' + Date.now().toString(36) + '_user',
      conversation_id: currentConvId,
      role: 'user',
      content: text,
      created_at: Date.now(),
      images,
    };
    setMessages((prev) => [...prev, userMsg]);

    setIsStreaming(true);
    setActiveStreamingMessageId(assistantMsgId);
    setActiveView('chat');

    try {
      await window.api.chat.send({
        conversationId: currentConvId,
        userMessage: text,
        images,
        model: targetConv.model || settings.activeModel,
        systemPrompt: targetConv.system_prompt || settings.defaultSystemPrompt,
        temperature: targetConv.temperature,
        contextLength: targetConv.context_length,
        maxTokens: targetConv.max_tokens,
        assistantMessageId: assistantMsgId,
      });
    } catch (err: any) {
      console.error('Chat send error:', err);
      setIsStreaming(false);
      setActiveStreamingMessageId(null);
    }
  };

  const handleStopStream = () => {
    if (activeStreamingMessageId) {
      window.api.chat.abort(activeStreamingMessageId);
      setIsStreaming(false);
      setActiveStreamingMessageId(null);
    }
  };

  // Handler: Regenerate
  const handleRegenerate = async (messageId: string) => {
    if (isStreaming || !activeId) return;
    const msgIdx = messages.findIndex((m) => m.id === messageId);
    if (msgIdx === -1) return;

    let userMsg: Message | null = null;
    for (let i = msgIdx - 1; i >= 0; i--) {
      if (messages[i].role === 'user') {
        userMsg = messages[i];
        break;
      }
    }
    if (!userMsg) return;

    await window.api.messages.delete(messageId);
    setMessages((prev) => prev.filter((m) => m.id !== messageId));

    const assistantMsgId = 'msg_' + Date.now().toString(36) + '_asst';
    setIsStreaming(true);
    setActiveStreamingMessageId(assistantMsgId);

    const targetConv = activeConversation!;
    await window.api.chat.send({
      conversationId: activeId,
      userMessage: userMsg.content,
      images: userMsg.images,
      model: targetConv.model || settings.activeModel,
      systemPrompt: targetConv.system_prompt || settings.defaultSystemPrompt,
      temperature: targetConv.temperature,
      contextLength: targetConv.context_length,
      maxTokens: targetConv.max_tokens,
      assistantMessageId: assistantMsgId,
    });
  };

  // Handler: Edit Message
  const handleEditMessage = async (messageId: string, newContent: string) => {
    if (!activeId) return;
    const msg = messages.find((m) => m.id === messageId);
    if (!msg) return;

    const updatedUserMsg: Message = { ...msg, content: newContent };
    await window.api.messages.save(updatedUserMsg);

    const idx = messages.findIndex((m) => m.id === messageId);
    const subsequent = messages.slice(idx + 1);
    for (const sub of subsequent) {
      await window.api.messages.delete(sub.id);
    }

    setMessages((prev) => [...prev.slice(0, idx), updatedUserMsg]);

    const assistantMsgId = 'msg_' + Date.now().toString(36) + '_asst';
    setIsStreaming(true);
    setActiveStreamingMessageId(assistantMsgId);

    const targetConv = activeConversation!;
    await window.api.chat.send({
      conversationId: activeId,
      userMessage: newContent,
      images: msg.images,
      model: targetConv.model || settings.activeModel,
      systemPrompt: targetConv.system_prompt || settings.defaultSystemPrompt,
      temperature: targetConv.temperature,
      contextLength: targetConv.context_length,
      maxTokens: targetConv.max_tokens,
      assistantMessageId: assistantMsgId,
    });
  };

  // Handler: Attach File in chat
  const handleAttachFile = async (scope: 'chat' | 'global') => {
    const targetScope =
      scope === 'chat' && activeId
        ? activeId
        : activeWorkspaceId
        ? activeWorkspaceId
        : 'global';
    await window.api.documents.selectAndUpload(targetScope);
    const docs = await window.api.documents.list();
    setDocuments(docs);
  };

  // Handler: Pull Model
  const handlePullModel = async (tag: string) => {
    setPullProgress({ modelTag: tag, status: 'Starting pull...', percent: 0 });
    await window.api.ollama.pull(tag);
    const health = await window.api.ollama.getHealth();
    setInstalledModels(health.models || []);
  };

  // Handler: Delete Model
  const handleDeleteModel = async (tag: string) => {
    await window.api.ollama.delete(tag);
    const health = await window.api.ollama.getHealth();
    setInstalledModels(health.models || []);
  };

  // Handler: Select Model
  const handleSelectModel = async (tag: string) => {
    if (activeConversation) {
      const updated = { ...activeConversation, model: tag };
      await window.api.conversations.save(updated);
      setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
    }
    await window.api.settings.save('activeModel', tag);
    setSettings((prev) => ({ ...prev, activeModel: tag }));
  };

  // Workspaces CRUD
  const handleCreateWorkspace = async (ws: Partial<Workspace>) => {
    const newWs: Workspace = {
      id: ws.id || 'ws_' + Date.now().toString(36),
      name: ws.name || 'New Workspace',
      instructions: ws.instructions || '',
      color: ws.color || '#2563EB',
      memory: ws.memory || '',
      created_at: Date.now(),
      updated_at: Date.now(),
    };
    await window.api.workspaces.save(newWs);
    setWorkspaces((prev) => [newWs, ...prev]);
    setActiveWorkspaceId(newWs.id);
  };

  const handleUpdateWorkspace = async (ws: Workspace) => {
    await window.api.workspaces.save(ws);
    setWorkspaces((prev) => prev.map((w) => (w.id === ws.id ? ws : w)));
  };

  const handleDeleteWorkspace = async (id: string, deleteChatsAndFiles: boolean) => {
    await window.api.workspaces.delete(id, deleteChatsAndFiles);
    setWorkspaces((prev) => prev.filter((w) => w.id !== id));
    if (activeWorkspaceId === id) {
      setActiveWorkspaceId(null);
    }
    // Refresh conversations & documents
    const [cList, dList] = await Promise.all([
      window.api.conversations.list(),
      window.api.documents.list(),
    ]);
    setConversations(cList);
    setDocuments(dList);
  };

  const handleMoveWorkspace = async (convId: string, wsId: string | null) => {
    await window.api.conversations.moveWorkspace(convId, wsId);
    setConversations((prev) =>
      prev.map((c) => (c.id === convId ? { ...c, workspace_id: wsId || undefined } : c))
    );
  };

  const handleOpenFolderUpload = (scope: string, scopeName: string) => {
    setFolderUploadScope({ scope, scopeName });
    setIsFolderUploadOpen(true);
  };

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-chatBgLight dark:bg-chatBgDark text-gray-900 dark:text-gray-100 font-sans antialiased">
      {/* Swiss Left Sidebar */}
      <Sidebar
        conversations={conversations}
        activeId={activeId}
        onSelect={(id) => {
          setActiveId(id);
          setActiveView('chat');
        }}
        onNewChat={handleNewChat}
        onDelete={async (id) => {
          await window.api.conversations.delete(id);
          setConversations((prev) => prev.filter((c) => c.id !== id));
          if (activeId === id) {
            const rem = conversations.filter((c) => c.id !== id);
            setActiveId(rem.length > 0 ? rem[0].id : null);
          }
        }}
        onPin={async (id, pinned) => {
          await window.api.conversations.pin(id, pinned);
          setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, pinned } : c)));
        }}
        onRename={async (id, title) => {
          await window.api.conversations.rename(id, title);
          setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
        }}
        onMoveWorkspace={handleMoveWorkspace}
        workspaces={workspaces}
        activeWorkspaceId={activeWorkspaceId}
        onSelectWorkspace={(id) => {
          setActiveWorkspaceId(id);
          // Pick first chat in this workspace if available
          const matching = id ? conversations.filter((c) => c.workspace_id === id) : conversations.filter((c) => !c.workspace_id);
          if (matching.length > 0) {
            setActiveId(matching[0].id);
          } else {
            setActiveId(null);
          }
        }}
        onOpenWorkspacesView={() => setActiveView('workspaces')}
        onOpenLibraryView={() => setActiveView('library')}
        onOpenSearchModal={() => setIsSearchOpen(true)}
        onOpenSettings={(tab) => {
          setSettingsTab(tab || 'hardware');
          setIsSettingsOpen(true);
        }}
        onOpenModelPicker={() => setIsModelPickerOpen(true)}
        activeModel={activeConversation?.model || settings.activeModel}
      />

      {/* Main View Area: One Screen, One Job */}
      <main className="flex-1 flex flex-col h-full overflow-hidden relative">
        {activeView === 'chat' && (
          <>
            <ChatArea
              conversation={activeConversation}
              messages={messages}
              isStreaming={isStreaming}
              activeStreamingMessageId={activeStreamingMessageId}
              onRegenerate={handleRegenerate}
              onEditMessage={handleEditMessage}
              onDeleteMessage={async (id) => {
                await window.api.messages.delete(id);
                setMessages((prev) => prev.filter((m) => m.id !== id));
              }}
              onOpenControls={() => setIsControlsOpen(true)}
              onExportMarkdown={async () => {
                if (activeConversation) {
                  await window.api.export.exportMarkdown(activeConversation.title, messages);
                }
              }}
              onExportPdf={async () => {
                if (activeConversation) {
                  await window.api.export.exportPdf(activeConversation.title);
                }
              }}
              onSelectPrompt={(p) => handleSendMessage(p)}
              onZoomImage={(url) => setZoomedImageUrl(url)}
              isVisionModelInstalled={isVisionModelInstalled}
              onDownloadVisionModel={() => handlePullModel('gemma3:4b')}
              workspaceName={activeWorkspace?.name}
            />

            <ChatInput
              onSendMessage={handleSendMessage}
              onAttachFile={handleAttachFile}
              onOpenFolderUpload={handleOpenFolderUpload}
              isStreaming={isStreaming}
              onStop={handleStopStream}
              currentScope={activeWorkspaceId || activeId || 'global'}
              scopeName={activeWorkspace?.name || 'Knowledge Base'}
              whisperModel={settings.whisperModel}
              voiceChatMode={settings.voiceChatMode}
              isVisionModelInstalled={isVisionModelInstalled}
              onDownloadVisionModel={() => handlePullModel('gemma3:4b')}
            />
          </>
        )}

        {activeView === 'workspaces' && (
          <WorkspacesView
            workspaces={workspaces}
            activeWorkspaceId={activeWorkspaceId}
            onSelectWorkspace={(id) => {
              setActiveWorkspaceId(id);
              const matching = id ? conversations.filter((c) => c.workspace_id === id) : conversations.filter((c) => !c.workspace_id);
              if (matching.length > 0) setActiveId(matching[0].id);
              else setActiveId(null);
            }}
            onCreateWorkspace={handleCreateWorkspace}
            onUpdateWorkspace={handleUpdateWorkspace}
            onDeleteWorkspace={handleDeleteWorkspace}
            conversations={conversations}
            documents={documents}
            onOpenFolderUpload={handleOpenFolderUpload}
            onOpenChat={() => setActiveView('chat')}
          />
        )}

        {activeView === 'library' && (
          <LibraryView
            documents={documents}
            onUploadFile={async (scope) => {
              await window.api.documents.selectAndUpload(scope);
              const docs = await window.api.documents.list();
              setDocuments(docs);
            }}
            onOpenFolderUpload={handleOpenFolderUpload}
            onDeleteDocument={async (id) => {
              await window.api.documents.delete(id);
              setDocuments((prev) => prev.filter((d) => d.id !== id));
            }}
            currentScope={activeWorkspaceId || 'all'}
            scopeName={activeWorkspace?.name || 'All Files'}
            indexingProgress={indexingProgress}
          />
        )}
      </main>

      {/* Unified Search Modal (Ctrl+K) */}
      <SearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        onSelectConversation={(id) => {
          setActiveId(id);
          setActiveView('chat');
        }}
        onSelectWorkspace={(id) => {
          setActiveWorkspaceId(id);
          setActiveView('chat');
        }}
        onOpenLibrary={() => setActiveView('library')}
        currentWorkspaceId={activeWorkspaceId}
      />

      {/* Folder Upload Modal (Feature 2) */}
      <FolderUploadModal
        isOpen={isFolderUploadOpen}
        onClose={() => setIsFolderUploadOpen(false)}
        scope={folderUploadScope.scope}
        scopeName={folderUploadScope.scopeName}
        onComplete={async () => {
          const docs = await window.api.documents.list();
          setDocuments(docs);
        }}
      />

      {/* Image Lightbox (Feature 3) */}
      <ImageLightboxModal
        imageUrl={zoomedImageUrl}
        onClose={() => setZoomedImageUrl(null)}
      />

      {/* Model Picker Modal */}
      <ModelPicker
        isOpen={isModelPickerOpen}
        onClose={() => setIsModelPickerOpen(false)}
        activeModel={activeConversation?.model || settings.activeModel}
        onSelectModel={handleSelectModel}
        installedModels={installedModels}
        knownModels={knownModels}
        hardware={hardware}
        onPullModel={handlePullModel}
        onDeleteModel={handleDeleteModel}
        pullProgress={pullProgress}
      />

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
        initialTab={settingsTab}
        hardware={hardware}
        settings={settings}
        onSaveSetting={async (k, v) => {
          await window.api.settings.save(k, v);
          setSettings((prev) => ({ ...prev, [k]: v }));
        }}
        installedModels={installedModels}
        knownModels={knownModels}
        onPullModel={handlePullModel}
        onDeleteModel={handleDeleteModel}
        documents={documents}
        onDeleteDocument={async (id) => {
          await window.api.documents.delete(id);
          setDocuments((prev) => prev.filter((d) => d.id !== id));
        }}
        privacyAudit={{
          statement:
            'All chats, files, embeddings, voice recordings, and inference remain 100% on this PC.',
          networkCallsAllowed: ['http://127.0.0.1:11434 (Ollama local inference)'],
          cloudApisUsed: 'None. No OpenAI, No Anthropic, No Google, No cloud tokens.',
          storageLocation: settings.storageDir,
        }}
        onOpenExternal={(url) => window.api.app.openExternal(url)}
      />

      {/* Chat Controls Modal */}
      {activeConversation && (
        <ChatControlsModal
          isOpen={isControlsOpen}
          onClose={() => setIsControlsOpen(false)}
          conversation={activeConversation}
          onSaveControls={async (params) => {
            const updated: Conversation = {
              ...activeConversation,
              ...params,
              updated_at: Date.now(),
            };
            await window.api.conversations.save(updated);
            setConversations((prev) => prev.map((c) => (c.id === updated.id ? updated : c)));
          }}
          hardware={hardware}
        />
      )}

      {/* First Launch Wizard */}
      <FirstLaunchWizard
        isOpen={isFirstLaunchOpen}
        onComplete={async () => {
          await window.api.settings.save('firstRunComplete', 'true');
          setSettings((s) => ({ ...s, firstRunComplete: true }));
          setIsFirstLaunchOpen(false);
        }}
        hardware={hardware}
        ollamaStatus={{
          cliInstalled: true,
          running: true,
          models: installedModels,
        }}
        onVerifyOllama={async () => {
          const h = await window.api.ollama.getHealth();
          setInstalledModels(h.models || []);
        }}
        onPullRecommended={handlePullModel}
        pullProgress={pullProgress}
        onOpenExternal={(url) => window.api.app.openExternal(url)}
      />

      {/* Out of Memory Warning Modal */}
      <OomWarningModal
        isOpen={oomState.isOpen}
        onClose={() => setOomState({ isOpen: false, failedModel: '' })}
        failedModel={oomState.failedModel}
        recommendedModel={hardware?.recommendedModel || 'qwen3:4b'}
        onSwitchModel={handleSelectModel}
      />
    </div>
  );
};
