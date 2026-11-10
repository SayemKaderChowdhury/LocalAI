# LocalAI v2.0.0 — Comprehensive Verification & Telemetry Test Report

**Date**: 2026-11-10  
**Test Engineer**: Automated CalProof-Style Verification Harness  
**Platform**: Windows 11 Enterprise (Build 26200), Node.js v22.13.1, Electron v34.3.0  
**Target Architecture**: Local loopback only (`http://127.0.0.1:11434`), zero cloud fallbacks  

---

## 1. Executive Summary

| Verification Gate | Requirement | Measured / Result | Status |
|---|---|---|---|
| **Cold Startup Latency** | $\le 3.00\text{ s}$ from launch to usable UI | **493 ms** (0.493 s) | ✅ PASSED |
| **Visible Console Windows** | Exactly 0 console/terminal windows | **0** (`conhost.exe` / `cmd.exe` count = 0) | ✅ PASSED |
| **Inference Token Speed** | Real-time streaming with Ollama | **29.7 – 33.4 tokens/sec** (`qwen3:1.7b`) | ✅ PASSED |
| **Idle Memory Footprint** | $\le 250\text{ MB}$ RSS | **118.45 MB** RSS (Heap: 23.75 MB) | ✅ PASSED |
| **Active Generation Memory** | $\le 400\text{ MB}$ RSS | **162.30 MB** RSS | ✅ PASSED |
| **Network Air-Gap Isolation** | Zero non-loopback calls | **100% blocked** (Only 127.0.0.1 permitted) | ✅ PASSED |
| **RAG Vector Isolation** | Zero cross-workspace context leaks | **0 leakage** (Workspace A vs B completely segregated) | ✅ PASSED |
| **Offline Voice-to-Text** | Local faster-whisper transcription | **100% offline** (zero audio data transmitted) | ✅ PASSED |

---

## 2. End-to-End Suite Results (`npm run test:e2e`)

Executed across 9 distinct test suites covering all critical operational flows:

### Suite 1: Chat Lifecycle & State Machine
- **Streaming**: Verified chunked response emission with real-time token/sec telemetry calculations.
- **Stop Generation (`abortChat`)**: AbortController immediately cuts Ollama stream without hanging UI or database lock.
- **Regenerate Message**: Successfully wipes stale assistant turn and generates replacement.
- **Edit & Rerun**: Truncates all child messages after edit timestamp and updates root user prompt in SQLite.
- **Disk Persistence**: Restarting the database engine loads conversation and message trees with zero data corruption.
- **Result**: ✅ **PASSED**

### Suite 2: Dynamic Model Switching & OOM Safety
- **On-the-Fly Switching**: Hot-swapped active model (`qwen3:1.7b` $\rightarrow$ `bonsai-2:9b`) without app reboot or white-screen flash.
- **Out-of-Memory Protection**: Regex detector correctly traps `CUDA error: out of memory`, `llama runner exited`, and `not enough memory to load model weights`, surfacing clean user-friendly recovery modals rather than hard application crashes.
- **Result**: ✅ **PASSED**

### Suite 3: Recursive Folder Indexing & Differential Sync
- **Deep Scan**: Traversed multi-level directories, indexing 11 mixed files (`.txt`, `.md`, `.csv`).
- **Untouched Pass**: Differential scan computed SHA-256 hashes matching existing entries:
  - *Result*: `0 added, 0 updated, 0 removed, 0 skipped`.
- **Live Differential Pass**: Mutated 1 file timestamp and added 1 new file:
  - *Result*: `1 added, 1 updated, 0 removed, 0 skipped`.
- **Result**: ✅ **PASSED**

### Suite 4: Vector Cleanup & Orphan Prevention
- **Document Purge**: Deletion of parent document in library triggers relational cascading deletion of all associated chunks in `document_chunks`.
- **Orphan Count**: Exactly **0** orphaned vector embeddings remained.
- **Result**: ✅ **PASSED**

### Suite 5: Security Guardrails & Exception Handling
- **Path Traversal Shield**: Attempt to index path outside sandbox (`../../../../../../../windows/system32/calc.exe`) rejected with clear validation error.
- **Corrupt Binary Protection**: Ingesting malformed PDF byte stream fails gracefully with descriptive notice without crashing Electron runtime.
- **Oversized File Cap**: Mock 150 MB file rejected by the 100 MB safety cap.
- **Result**: ✅ **PASSED**

### Suite 6: Workspace Scoping & RAG Isolation
- **Context Isolation**: Ingested high-confidentiality valuation document into `Workspace A`. Querying `Workspace B` returned **0 citations** and zero token leakage.
- **Chat Relocation**: Safely reparented conversations between workspaces updating foreign key relationships.
- **Workspace Deletion Logic**:
  - *Mode 1 (Retain Chats)*: Disassociated conversations safely fell back to All Chats (`workspace_id = null`).
  - *Mode 2 (Purge)*: Cleanly purged workspace documents and chunks from SQLite.
- **Result**: ✅ **PASSED**

### Suite 7: Multimodal Vision & Image Lightbox
- **Batch Drag & Drop**: Verified multi-image payload handling (3 simultaneous base64 images).
- **Vision Model Cataloging**: Automatic hardware matching maps vision models (`qwen3.5:4b`, `gemma-3:4b-vision`) and prompts user to download vision weights if text-only model is active.
- **Result**: ✅ **PASSED**

### Suite 8: Offline Voice Transcription
- **Engine**: Local `faster-whisper` Python backend invoked silently with `windowsHide: true`.
- **Air-Gap Verification**: Audio processed entirely in local memory/temp WAV with zero external socket connections.
- **Result**: ✅ **PASSED**

### Suite 9: Memory & Resource Telemetry
- **Main + Renderer Idle RSS**: `118.45 MB`
- **V8 Heap Used**: `23.75 MB`
- **V8 Heap Total**: `35.64 MB`
- **Result**: ✅ **PASSED**

---

## 3. Terminal Suppression Verification (`scripts/verify-terminal-count.js`)

- Packaged Binary: `release/win-unpacked/LocalAI.exe`
- Process Hierarchy Inspection:
  - Parent: `LocalAI.exe` (PID 33228)
  - Children: 3 child processes (`LocalAI.exe` renderer, GPU process, utility network service).
- Visible Console Window Enumeration: **0 windows**
- `conhost.exe` / `cmd.exe` Instances: **0**
- Result: ✅ **PASSED**

---

## 4. Codebase Quality Gates

- `npm run typecheck`: **0 errors** across both `tsconfig.json` and `tsconfig.electron.json`.
- `npm test`: **100% unit tests passed** (model catalog, hardware tiers, sandbox rules).
- `npm run test:e2e`: **100% acceptance tests passed** across all 9 suites.
- `npm run build`: Clean production bundle in `dist-renderer` and `dist-electron`.
