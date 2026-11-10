# LocalAI — Product Requirements Document (PRD)

**Version**: 2.0.0  
**Target Platform**: Windows 10 / 11 (x64)  
**Status**: Production / Active

---

## 1. Product Overview

### What It Is
LocalAI is a native Windows desktop productivity application providing an uncompromising ChatGPT/Claude-like AI assistant experience running 100% on the user's local machine.

### Why It Exists
Modern cloud AI tools offer strong reasoning but require sending proprietary source code, confidential financials, personal notes, and internal documents to third-party servers. LocalAI eliminates this risk by binding the complete AI stack—chat inference, document embedding, vector retrieval, and speech-to-text—strictly to `127.0.0.1`.

### Who It Is For
- Developers, analysts, founders, and professionals who demand complete privacy for sensitive IP and data.
- Users operating on metered or air-gapped networks.
- Users who reject subscription fees, rate limits, and remote usage monitoring.

---

## 2. Features in Priority Order

### P0 — Core Private Chat & Local Model Inference
- **Streaming UI**: Real-time token streaming with tokens/sec speed and duration indicators.
- **Rich Markdown**: Code syntax highlighting, tables, LaTeX formulas, bullet lists.
- **Session Continuity**: Multi-turn conversation persistence in local SQLite.
- **Hardware-Aware Tiering**: Automatic detection of CPU, physical RAM, GPU name, and VRAM with safe defaults (`qwen3.5:4b`).

### P1 — Local Document & Folder RAG (Retrieval-Augmented Generation)
- **Multi-Format Ingestion**: Native extraction for PDF, DOCX, TXT, MD, CSV, XLSX, and images.
- **Recursive Folder Scanning**: Ingestion of full directory trees with differential sync (mtime + size checksums).
- **Source Citations**: Exact file path and section/page attribution attached to every synthesized answer.
- **Local Vectors**: Embeddings generated locally via `nomic-embed-text` with cosine similarity search.

### P2 — Multimodal Vision
- **Image Input**: Drag-and-drop, clipboard paste (`Ctrl+V`), or file selection for PNG, JPG, JPEG, WEBP.
- **Visual Understanding**: OCR, document transcription, chart inspection, and diagram reasoning via vision models (`qwen3.5:4b`, `gemma3:4b`).
- **Image Lightbox**: Click-to-zoom preview modal with dark backdrop.

### P3 — Offline Voice-to-Text
- **One-Click Recording**: Native microphone button in chat input bar.
- **Offline Transcription**: Local CPU int8 inference via `faster-whisper`.
- **Zero Audio Leakage**: Audio waveforms recorded directly to temporary local WAV and deleted immediately after transcription.

### P4 — Isolated Workspaces
- **Project Sandboxes**: ChatGPT/Claude-style workspaces for context isolation.
- **Workspace Memory**: Dedicated persistent memory notes injected into model system prompts.
- **Custom System Instructions**: Independent per-workspace personas and prompt rules.
- **Scoped Knowledge**: Documents indexed inside a workspace remain isolated from other workspaces.

### P5 — Opt-In Uncensored / Abliterated Models
- **Catalog Integration**: Opt-in toggle to view abliterated models (`huihui_ai/qwen3-abliterated:8b`, `dolphin3:8b`).
- **Mandatory Responsibility Modal**: Explicit confirmation dialog with checkbox acknowledgment before downloading.
- **Default Disabled**: Hidden by default in general settings.

---

## 3. Explicit Non-Goals

- **No Cloud Synchronization**: No remote database sync or multi-device account linking.
- **No User Authentication**: No email/password registration, OAuth, or licenses.
- **No Cloud Model Fallbacks**: If Ollama or the local model is offline, the app prompts to start Ollama; it never routes prompts to external cloud endpoints.
- **No Generative Image Creation**: Text/code generation and visual understanding only; no Stable Diffusion or image synthesis.
- **No Unrestricted Web Browsing**: App does not scrape arbitrary external web pages to ensure deterministic air-gapped security.

---

## 4. Acceptance Criteria Matrix

| Feature | Acceptance Criteria | Verification Status |
|---|---|---|
| **Core Chat** | Streams tokens with speed meter; saves to SQLite; handles stop generation. | ✅ Verified |
| **Folder RAG** | Scans folders recursively; indexes supported formats; differential sync updates only modified files. | ✅ Verified |
| **Voice-to-Text** | Mic records audio; `faster-whisper` transcribes offline; zero visible console windows. | ✅ Verified |
| **Workspaces** | Workspaces isolate chat history, scoped documents, custom memory, and instructions. | ✅ Verified |
| **Startup Speed** | Process start to usable UI < 3.0 seconds (measured at 493 ms). | ✅ Verified (<0.5s) |
| **Silent Spawns** | Packaged binary launches with exactly 0 terminal windows (`conhost.exe`/`cmd.exe`). | ✅ Verified (0) |
| **Privacy Sandbox** | WebRequest blocks all outbound network calls outside `127.0.0.1` and `localhost`. | ✅ Verified |

