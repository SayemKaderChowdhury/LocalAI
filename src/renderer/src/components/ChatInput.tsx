import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Plus,
  Mic,
  MicOff,
  Square,
  X,
  FileText,
  FolderOpen,
  Image as ImageIcon,
  AlertCircle,
  Loader2,
  Volume2,
} from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (text: string, images?: string[]) => void;
  onAttachFile: (scope: 'chat' | 'global') => void;
  onOpenFolderUpload: (scope: string, scopeName: string) => void;
  isStreaming: boolean;
  onStop: () => void;
  currentScope: string;
  scopeName?: string;
  disabled?: boolean;
  whisperModel?: 'base' | 'tiny' | 'small';
  voiceChatMode?: boolean;
  isVisionModelInstalled: boolean;
  onDownloadVisionModel: () => void;
}

export const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,
  onAttachFile,
  onOpenFolderUpload,
  isStreaming,
  onStop,
  currentScope,
  scopeName = 'Knowledge Base',
  disabled,
  whisperModel = 'base',
  voiceChatMode = false,
  isVisionModelInstalled,
  onDownloadVisionModel,
}) => {
  const [text, setText] = useState('');
  const [attachedImages, setAttachedImages] = useState<string[]>([]);
  const [isAttachPopoverOpen, setIsAttachPopoverOpen] = useState(false);

  // Voice recording state (Feature 1: Offline faster-whisper)
  const [isRecording, setIsRecording] = useState(false);
  const [recordingSeconds, setRecordingSeconds] = useState(0);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-resize textarea
  useEffect(() => {
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
      textareaRef.current.style.height = `${Math.min(textareaRef.current.scrollHeight, 180)}px`;
    }
  }, [text]);

  // Global paste handler for images (Ctrl+V)
  useEffect(() => {
    const handlePaste = (e: ClipboardEvent) => {
      if (e.clipboardData && e.clipboardData.items) {
        for (let i = 0; i < e.clipboardData.items.length; i++) {
          const item = e.clipboardData.items[i];
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            if (file) {
              const reader = new FileReader();
              reader.onload = () => {
                if (typeof reader.result === 'string') {
                  const b64 = reader.result.split(',')[1] || reader.result;
                  setAttachedImages((prev) => [...prev, b64]);
                }
              };
              reader.readAsDataURL(file);
            }
          }
        }
      }
    };

    window.addEventListener('paste', handlePaste);
    return () => window.removeEventListener('paste', handlePaste);
  }, []);

  // Keyboard navigation & Esc to stop recording
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Escape' && isRecording) {
      handleStopRecording();
      return;
    }
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleSend = () => {
    if (isStreaming) {
      onStop();
      return;
    }
    if ((!text.trim() && attachedImages.length === 0) || disabled) return;
    onSendMessage(text.trim(), attachedImages.length ? attachedImages : undefined);
    setText('');
    setAttachedImages([]);
    if (textareaRef.current) {
      textareaRef.current.style.height = 'auto';
    }
  };

  // Drag and drop images or files
  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      for (let i = 0; i < e.dataTransfer.files.length; i++) {
        const file = e.dataTransfer.files[i];
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onload = () => {
            if (typeof reader.result === 'string') {
              const b64 = reader.result.split(',')[1] || reader.result;
              setAttachedImages((prev) => [...prev, b64]);
            }
          };
          reader.readAsDataURL(file);
        } else {
          // Document file
          const path = (file as any).path;
          if (path) {
            window.api.documents.uploadFilePath(path, currentScope);
          }
        }
      }
    }
  };

  // --- Voice Recording Logic (Feature 1: All Local, Offline Whisper) ---
  const handleToggleVoice = async () => {
    if (isRecording) {
      handleStopRecording();
    } else {
      handleStartRecording();
    }
  };

  const handleStartRecording = async () => {
    setVoiceError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      audioChunksRef.current = [];
      const mediaRecorder = new MediaRecorder(stream);
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) {
          audioChunksRef.current.push(event.data);
        }
      };

      mediaRecorder.onstop = async () => {
        const audioBlob = new Blob(audioChunksRef.current, { type: 'audio/wav' });
        // Stop audio tracks
        stream.getTracks().forEach((track) => track.stop());

        // Convert blob to base64
        const reader = new FileReader();
        reader.onloadend = async () => {
          const base64Audio = (reader.result as string).split(',')[1];
          if (!base64Audio) return;

          setIsTranscribing(true);
          try {
            const res = await window.api.voice.transcribe({
              audioBase64: base64Audio,
              modelSize: whisperModel,
            });

            if (res.success && res.text) {
              const transcribedText = res.text.trim();
              if (voiceChatMode) {
                // Voice chat mode: send immediately!
                onSendMessage(transcribedText);
              } else {
                // Normal mode: put text into input box for user to edit before sending
                setText((prev) => (prev ? `${prev} ${transcribedText}` : transcribedText));
              }
            } else if (!res.success) {
              setVoiceError(res.error || 'Transcription failed.');
            }
          } catch (err: any) {
            setVoiceError(err.message || 'Local Whisper execution error.');
          } finally {
            setIsTranscribing(false);
          }
        };
        reader.readAsDataURL(audioBlob);
      };

      mediaRecorder.start();
      setIsRecording(true);
      setRecordingSeconds(0);
      timerRef.current = setInterval(() => {
        setRecordingSeconds((s) => s + 1);
      }, 1000);
    } catch (err: any) {
      setVoiceError(
        err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError'
          ? 'No microphone found on this device.'
          : 'Microphone permission denied.'
      );
      setIsRecording(false);
    }
  };

  const handleStopRecording = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();
    }
    setIsRecording(false);
  };

  const removeImage = (index: number) => {
    setAttachedImages((prev) => prev.filter((_, i) => i !== index));
  };

  const hasImages = attachedImages.length > 0;
  const needsVisionWarning = hasImages && !isVisionModelInstalled;

  return (
    <div
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      className="p-4 flex flex-col items-center justify-center shrink-0 border-t border-borderLight dark:border-borderDark/40 bg-chatBgLight/60 dark:bg-chatBgDark/60 backdrop-blur-xs select-none"
    >
      <div className="w-full max-w-3xl space-y-2">
        {/* Vision Model Download Prompt Banner */}
        {needsVisionWarning && (
          <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20 text-amber-800 dark:text-amber-300 text-xs flex items-center justify-between animate-in fade-in duration-200">
            <div className="flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>Image chat needs a vision model (e.g. <code>qwen3.5:4b</code> or <code>gemma3:4b</code>).</span>
            </div>
            <button
              onClick={onDownloadVisionModel}
              className="px-2.5 py-1 rounded-xl bg-amber-600 hover:bg-amber-500 text-white font-medium text-[11px] transition shrink-0"
            >
              Download gemma3:4b (2.6 GB)
            </button>
          </div>
        )}

        {/* Voice error banner */}
        {voiceError && (
          <div className="p-2.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-600 dark:text-red-400 text-xs flex items-center justify-between animate-in fade-in">
            <span>{voiceError}</span>
            <button onClick={() => setVoiceError(null)} className="p-1 hover:text-red-700">
              <X className="w-3.5 h-3.5" />
            </button>
          </div>
        )}

        {/* Recording / Transcribing Indicator Overlay */}
        {(isRecording || isTranscribing) && (
          <div className="p-3 rounded-2xl bg-blue-50 dark:bg-cardBgDark border border-blue-500/40 flex items-center justify-between text-xs animate-in fade-in">
            {isRecording ? (
              <div className="flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full bg-red-500 animate-ping" />
                <span className="font-semibold text-gray-900 dark:text-gray-100">
                  Recording audio ({recordingSeconds}s)...
                </span>
                <span className="text-gray-500 text-[11px]">Click mic or press Esc to finish</span>
              </div>
            ) : (
              <div className="flex items-center gap-2 text-blue-600 dark:text-blue-400 font-medium">
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Transcribing locally with faster-whisper ({whisperModel})...</span>
              </div>
            )}

            {isRecording && (
              <button
                onClick={handleStopRecording}
                className="px-3 py-1 rounded-xl bg-red-600 hover:bg-red-500 text-white text-xs font-medium"
              >
                Stop & Transcribe
              </button>
            )}
          </div>
        )}

        {/* Attached Images Thumbnails */}
        {attachedImages.length > 0 && (
          <div className="flex items-center gap-2 overflow-x-auto pb-1">
            {attachedImages.map((img, idx) => (
              <div key={idx} className="relative group shrink-0">
                <img
                  src={img.startsWith('data:') ? img : `data:image/png;base64,${img}`}
                  alt="Thumb"
                  className="w-14 h-14 object-cover rounded-xl border border-borderLight dark:border-borderDark"
                />
                <button
                  onClick={() => removeImage(idx)}
                  className="absolute -top-1.5 -right-1.5 p-0.5 rounded-full bg-black/70 hover:bg-black text-white transition"
                >
                  <X className="w-3 h-3" />
                </button>
              </div>
            ))}
          </div>
        )}

        {/* Input Box: One Rounded Box, Bottom-Centred with (+), Mic, Send */}
        <div className="relative bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark rounded-2xl p-2 transition-all focus-within:border-gray-400 dark:focus-within:border-gray-500 shadow-sm flex flex-col gap-2">
          {/* Attach Popover */}
          {isAttachPopoverOpen && (
            <div className="absolute bottom-14 left-2 bg-white dark:bg-cardBgDark border border-borderLight dark:border-borderDark rounded-xl shadow-xl p-1.5 z-30 space-y-0.5 text-xs animate-in fade-in duration-150">
              <button
                onClick={() => {
                  setIsAttachPopoverOpen(false);
                  onAttachFile(currentScope === 'global' ? 'global' : 'chat');
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition text-left"
              >
                <FileText className="w-4 h-4 text-blue-500" />
                <span>Upload Single File</span>
              </button>
              <button
                onClick={() => {
                  setIsAttachPopoverOpen(false);
                  onOpenFolderUpload(currentScope, scopeName);
                }}
                className="w-full flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 text-gray-700 dark:text-gray-200 transition text-left"
              >
                <FolderOpen className="w-4 h-4 text-emerald-500" />
                <span>Upload Folder</span>
              </button>
            </div>
          )}

          {/* Text Area */}
          <textarea
            ref={textareaRef}
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder={
              isRecording
                ? 'Listening to microphone...'
                : 'Ask anything, drag files, or paste images...'
            }
            disabled={isRecording || isTranscribing}
            className="w-full bg-transparent px-3 py-1 text-sm text-gray-900 dark:text-gray-100 placeholder-gray-400 focus:outline-none resize-none leading-relaxed"
          />

          {/* Bottom Control Row: Exactly Attach (+), Voice (mic), Send */}
          <div className="flex items-center justify-between px-1 pt-1 border-t border-borderLight/60 dark:border-borderDark/40">
            <div className="flex items-center gap-1">
              {/* Attach Button (+) */}
              <button
                onClick={() => setIsAttachPopoverOpen(!isAttachPopoverOpen)}
                title="Attach files or folder"
                className="p-1.5 rounded-xl text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800 transition"
              >
                <Plus className="w-4 h-4" />
              </button>

              {/* Voice Button (Mic) */}
              <button
                onClick={handleToggleVoice}
                title={
                  isRecording
                    ? 'Stop recording (Offline faster-whisper)'
                    : 'Speak (Offline Whisper Voice-to-Text)'
                }
                className={`p-1.5 rounded-xl transition ${
                  isRecording
                    ? 'text-red-500 bg-red-500/10 animate-pulse'
                    : 'text-gray-400 hover:text-gray-700 dark:hover:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                }`}
              >
                {isRecording ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
              </button>
            </div>

            {/* Send / Stop Button */}
            <div>
              {isStreaming ? (
                <button
                  onClick={onStop}
                  title="Stop generation"
                  className="p-1.5 rounded-xl bg-gray-200 dark:bg-gray-700 text-gray-800 dark:text-gray-200 hover:bg-gray-300 dark:hover:bg-gray-600 transition"
                >
                  <Square className="w-4 h-4" />
                </button>
              ) : (
                <button
                  onClick={handleSend}
                  disabled={!text.trim() && attachedImages.length === 0}
                  title="Send message (Enter)"
                  className="p-1.5 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white transition shadow-2xs"
                >
                  <Send className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
