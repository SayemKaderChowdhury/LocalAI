export interface HardwareSpecs {
  cpu: string;
  cpuCores: number;
  totalRamGB: number;
  freeRamGB: number;
  gpuName: string;
  vramGB: number;
  diskFreeGB: number;
  diskTotalGB: number;
  isNvmeOrSsd: boolean;
  windowsVersion: string;
  tier: '8gb_low' | '16gb_mid' | '32gb_high' | 'ultra';
  recommendedModel: string;
  upgradeModel: string;
  visionModel: string;
}

export interface ModelTierItem {
  id: string;
  name: string;
  tag: string;
  sizeGB: number;
  ramNeededGB: number;
  expectedSpeed: string;
  tier: string;
  description: string;
  isVision: boolean;
  isExperimental: boolean;
  isAbliterated?: boolean;
  installed?: boolean;
}

export interface OllamaModel {
  name: string;
  model: string;
  size: number;
  digest: string;
  modified_at: string;
  details?: {
    family?: string;
    parameter_size?: string;
    quantization_level?: string;
    context_length?: number;
  };
  capabilities?: string[];
}

export interface Workspace {
  id: string;
  name: string;
  icon?: string;
  color?: string;
  instructions?: string;
  memory?: string;
  created_at: number;
  updated_at: number;
}

export interface Conversation {
  id: string;
  title: string;
  created_at: number;
  updated_at: number;
  pinned: boolean;
  folder_tag?: string;
  system_prompt?: string;
  temperature: number;
  context_length: number;
  max_tokens: number;
  model: string;
  workspace_id?: string;
}

export interface Citation {
  source: string;
  pageOrSection: string;
  snippet: string;
}

export interface Message {
  id: string;
  conversation_id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  created_at: number;
  tokens_per_sec?: number;
  total_duration_ms?: number;
  citations?: Citation[];
  images?: string[];
}

export interface DocumentItem {
  id: string;
  filename: string;
  file_type: string;
  file_size: number;
  created_at: number;
  chunk_count: number;
  scope: string; // 'global', or conversation_id, or workspace_id
  folder_path?: string; // relative path within folder (e.g. "Contracts/2026/Agreement.pdf")
  file_hash?: string; // mtime or hash for diff/sync
  updated_at?: number;
}

export interface FolderScanItem {
  path: string;
  relativePath: string;
  name: string;
  extension: string;
  size: number;
  supported: boolean;
  selected: boolean;
}

export interface FolderScanResult {
  rootPath: string;
  folderName: string;
  totalFiles: number;
  totalSize: number;
  supportedFiles: number;
  items: FolderScanItem[];
}

export interface FolderIndexSummary {
  indexedCount: number;
  skippedCount: number;
  skippedFiles: string[];
  totalChunks: number;
}

export interface AppSettings {
  activeModel: string;
  defaultPersona: string;
  defaultSystemPrompt: string;
  theme: 'dark' | 'light';
  colibriConsent: boolean;
  storageDir: string;
  firstRunComplete: boolean;
  whisperModel?: 'base' | 'tiny' | 'small';
  voiceChatMode?: boolean;
  enableAbliteratedModels?: boolean;
}

export interface ChatStreamChunk {
  messageId: string;
  delta: string;
  done: boolean;
  tokensPerSec?: number;
  durationMs?: number;
  citations?: Citation[];
  error?: string;
  isOom?: boolean;
}
