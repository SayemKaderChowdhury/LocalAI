import React, { useState, useEffect, useRef } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import {
  Sliders,
  Download,
  Copy,
  Check,
  RotateCcw,
  Edit3,
  Trash2,
  FileText,
  ChevronDown,
  ChevronUp,
  Image as ImageIcon,
  Sparkles,
  AlertCircle,
} from 'lucide-react';
import { Conversation, Message, Citation } from '../../../shared/types';
import { CodeBlock } from './CodeBlock';

interface ChatAreaProps {
  conversation: Conversation | null;
  messages: Message[];
  isStreaming: boolean;
  activeStreamingMessageId: string | null;
  onRegenerate: (messageId: string) => void;
  onEditMessage: (messageId: string, newContent: string) => void;
  onDeleteMessage: (messageId: string) => void;
  onOpenControls: () => void;
  onExportMarkdown: () => void;
  onExportPdf: () => void;
  onSelectPrompt: (prompt: string) => void;
  onZoomImage: (url: string) => void;
  isVisionModelInstalled: boolean;
  onDownloadVisionModel: () => void;
  workspaceName?: string;
}

export const ChatArea: React.FC<ChatAreaProps> = ({
  conversation,
  messages,
  isStreaming,
  activeStreamingMessageId,
  onRegenerate,
  onEditMessage,
  onDeleteMessage,
  onOpenControls,
  onExportMarkdown,
  onExportPdf,
  onSelectPrompt,
  onZoomImage,
  isVisionModelInstalled,
  onDownloadVisionModel,
  workspaceName,
}) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [editingMsgId, setEditingMsgId] = useState<string | null>(null);
  const [editText, setEditText] = useState('');
  const [expandedCitations, setExpandedCitations] = useState<Record<string, boolean>>({});

  // Auto-scroll on new messages or streaming
  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isStreaming]);

  const handleCopyText = (id: string, text: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 1800);
  };

  const toggleCitation = (msgId: string) => {
    setExpandedCitations((prev) => ({ ...prev, [msgId]: !prev[msgId] }));
  };

  // Calm Empty State
  const renderEmptyState = () => (
    <div className="flex-1 flex flex-col items-center justify-center p-8 text-center select-none">
      <div className="w-full max-w-xl space-y-8">
        <div className="space-y-2">
          <h2 className="text-2xl font-semibold tracking-tight text-gray-900 dark:text-gray-100">
            LocalAI
          </h2>
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Your private AI — chats and files stay on this PC
          </p>
        </div>

        {/* 3 Calm Suggested Prompts in a Bento Row */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left">
          {[
            {
              title: 'Draft a summary',
              prompt: 'Summarize key points from my uploaded documents into a clean bulleted list.',
            },
            {
              title: 'Analyze & debug code',
              prompt: 'Analyze this code snippet, explain potential edge cases, and suggest clean fixes.',
            },
            {
              title: 'Review project data',
              prompt: 'What are the main findings and metrics in the indexed spreadsheet files?',
            },
          ].map((item, idx) => (
            <button
              key={idx}
              onClick={() => onSelectPrompt(item.prompt)}
              className="p-3.5 rounded-2xl bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark hover:border-gray-400 dark:hover:border-gray-600 transition flex flex-col justify-between text-left group shadow-2xs"
            >
              <div className="font-medium text-xs text-gray-800 dark:text-gray-200 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition">
                {item.title}
              </div>
              <div className="text-[11px] text-gray-400 mt-2 line-clamp-2 leading-relaxed">
                {item.prompt}
              </div>
            </button>
          ))}
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex-1 flex flex-col h-full bg-chatBgLight dark:bg-chatBgDark relative overflow-hidden">
      {/* Top Header: Quiet, No Badge Clutter */}
      <header className="h-12 px-6 border-b border-borderLight dark:border-borderDark flex items-center justify-between shrink-0 select-none bg-chatBgLight/80 dark:bg-chatBgDark/80 backdrop-blur-xs">
        <div className="flex items-center gap-2 truncate text-xs">
          {workspaceName && (
            <>
              <span className="text-gray-400 font-medium truncate">{workspaceName}</span>
              <span className="text-gray-300 dark:text-gray-600">/</span>
            </>
          )}
          <span className="font-semibold text-gray-800 dark:text-gray-200 truncate max-w-sm">
            {conversation ? conversation.title : 'New Chat'}
          </span>
        </div>

        {conversation && (
          <div className="flex items-center gap-1 text-xs">
            <button
              onClick={onOpenControls}
              title="Chat Parameters (Temperature, Context, System Prompt)"
              className="px-2 py-1 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition flex items-center gap-1.5"
            >
              <Sliders className="w-3.5 h-3.5" />
              <span className="hidden sm:inline text-[11px]">Controls</span>
            </button>

            <button
              onClick={onExportMarkdown}
              title="Export as Markdown"
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
            >
              <Download className="w-3.5 h-3.5" />
            </button>
          </div>
        )}
      </header>

      {/* Main Chat Thread Column: Centered max-w-3xl (~768px) */}
      <div ref={scrollRef} className="flex-1 overflow-y-auto px-4 py-8 flex justify-center">
        {messages.length === 0 ? (
          renderEmptyState()
        ) : (
          <div className="w-full max-w-3xl space-y-6">
            {messages.map((m) => {
              const isAssistant = m.role === 'assistant';
              const isStreamingThis = isStreaming && m.id === activeStreamingMessageId;
              const isEditing = editingMsgId === m.id;

              return (
                <div
                  key={m.id}
                  className={`flex flex-col ${isAssistant ? 'items-start' : 'items-end'}`}
                >
                  {/* User Message */}
                  {!isAssistant && (
                    <div className="group relative max-w-[85%] space-y-2">
                      {/* Attached Images */}
                      {m.images && m.images.length > 0 && (
                        <div className="flex flex-wrap gap-2 justify-end">
                          {m.images.map((img, idx) => (
                            <img
                              key={idx}
                              src={img.startsWith('data:') ? img : `data:image/png;base64,${img}`}
                              alt="Attachment"
                              onClick={() => onZoomImage(img)}
                              className="w-24 h-24 object-cover rounded-xl border border-borderLight dark:border-borderDark cursor-pointer hover:opacity-90 transition shadow-2xs"
                            />
                          ))}
                        </div>
                      )}

                      {/* Content or Edit Field */}
                      {isEditing ? (
                        <div className="bg-white dark:bg-cardBgDark border border-blue-500 rounded-2xl p-3 space-y-2 w-full shadow-lg">
                          <textarea
                            value={editText}
                            onChange={(e) => setEditText(e.target.value)}
                            className="w-full bg-transparent text-sm focus:outline-none resize-none text-gray-900 dark:text-white"
                            rows={3}
                          />
                          <div className="flex justify-end gap-1.5">
                            <button
                              onClick={() => setEditingMsgId(null)}
                              className="px-2.5 py-1 text-xs text-gray-500 hover:text-gray-700"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => {
                                onEditMessage(m.id, editText);
                                setEditingMsgId(null);
                              }}
                              className="px-3 py-1 bg-blue-600 hover:bg-blue-500 text-white rounded-lg text-xs font-medium"
                            >
                              Save & Rerun
                            </button>
                          </div>
                        </div>
                      ) : (
                        <div className="bg-gray-100 dark:bg-cardBgDark border border-borderLight dark:border-borderDark/80 rounded-2xl px-4 py-2.5 text-sm text-gray-900 dark:text-gray-100 leading-relaxed shadow-2xs">
                          {m.content}
                        </div>
                      )}

                      {/* Message Actions */}
                      {!isEditing && (
                        <div className="opacity-0 group-hover:opacity-100 transition flex items-center justify-end gap-1 pt-0.5 text-gray-400">
                          <button
                            onClick={() => {
                              setEditingMsgId(m.id);
                              setEditText(m.content);
                            }}
                            className="p-1 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                            title="Edit message & re-run"
                          >
                            <Edit3 className="w-3 h-3" />
                          </button>
                          <button
                            onClick={() => handleCopyText(m.id, m.content)}
                            className="p-1 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                            title="Copy text"
                          >
                            {copiedId === m.id ? (
                              <Check className="w-3 h-3 text-emerald-500" />
                            ) : (
                              <Copy className="w-3 h-3" />
                            )}
                          </button>
                          <button
                            onClick={() => onDeleteMessage(m.id)}
                            className="p-1 hover:text-red-500 rounded"
                            title="Delete"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Assistant Message */}
                  {isAssistant && (
                    <div className="group relative max-w-full w-full space-y-2">
                      <div className="prose dark:prose-invert max-w-none text-sm text-gray-900 dark:text-gray-100 leading-relaxed">
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            code: CodeBlock as any,
                          }}
                        >
                          {m.content}
                        </ReactMarkdown>

                        {isStreamingThis && (
                          <span className="inline-block w-1.5 h-4 ml-1 bg-blue-500 animate-cursor" />
                        )}
                      </div>

                      {/* Citations Card: Clean Swiss Footnote */}
                      {m.citations && m.citations.length > 0 && (
                        <div className="pt-2">
                          <div className="p-3 rounded-xl bg-gray-50 dark:bg-cardBgDark/60 border border-borderLight dark:border-borderDark text-xs space-y-2">
                            <div
                              onClick={() => toggleCitation(m.id)}
                              className="flex items-center justify-between cursor-pointer font-medium text-gray-700 dark:text-gray-300"
                            >
                              <span className="flex items-center gap-1.5">
                                <FileText className="w-3.5 h-3.5 text-blue-500" />
                                <span>Sources cited ({m.citations.length})</span>
                              </span>
                              {expandedCitations[m.id] ? (
                                <ChevronUp className="w-3.5 h-3.5 text-gray-400" />
                              ) : (
                                <ChevronDown className="w-3.5 h-3.5 text-gray-400" />
                              )}
                            </div>

                            {expandedCitations[m.id] && (
                              <div className="space-y-1.5 pt-1 border-t border-borderLight dark:border-borderDark divide-y divide-borderLight dark:divide-borderDark/40">
                                {m.citations.map((c, i) => (
                                  <div key={i} className="pt-1.5 space-y-0.5">
                                    <div className="font-mono text-[11px] text-blue-600 dark:text-blue-400 font-medium">
                                      [Source: {c.source}, {c.pageOrSection}]
                                    </div>
                                    <div className="text-[11px] text-gray-500 dark:text-gray-400 italic">
                                      "{c.snippet}"
                                    </div>
                                  </div>
                                ))}
                              </div>
                            )}
                          </div>
                        </div>
                      )}

                      {/* Quiet Footer: Model name + tok/s + duration (NO LOUD BADGES) */}
                      <div className="flex items-center justify-between text-[11px] font-mono text-gray-400 pt-1">
                        <div className="flex items-center gap-2">
                          <span>{conversation?.model || 'local'}</span>
                          {m.tokens_per_sec ? (
                            <>
                              <span>·</span>
                              <span>{m.tokens_per_sec.toFixed(1)} tok/s</span>
                            </>
                          ) : null}
                          {m.total_duration_ms ? (
                            <>
                              <span>·</span>
                              <span>{(m.total_duration_ms / 1000).toFixed(1)}s</span>
                            </>
                          ) : null}
                        </div>

                        {/* Hover Actions */}
                        {!isStreamingThis && (
                          <div className="opacity-0 group-hover:opacity-100 transition flex items-center gap-1">
                            <button
                              onClick={() => handleCopyText(m.id, m.content)}
                              className="p-1 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                              title="Copy response"
                            >
                              {copiedId === m.id ? (
                                <Check className="w-3 h-3 text-emerald-500" />
                              ) : (
                                <Copy className="w-3 h-3" />
                              )}
                            </button>
                            <button
                              onClick={() => onRegenerate(m.id)}
                              className="p-1 hover:text-gray-700 dark:hover:text-gray-200 rounded"
                              title="Regenerate"
                            >
                              <RotateCcw className="w-3 h-3" />
                            </button>
                            <button
                              onClick={() => onDeleteMessage(m.id)}
                              className="p-1 hover:text-red-500 rounded"
                              title="Delete"
                            >
                              <Trash2 className="w-3 h-3" />
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
