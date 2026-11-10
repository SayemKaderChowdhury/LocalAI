# LocalAI — Essentials

> **The Idea in One Line**: A private, high-performance desktop assistant running 100% locally on Windows with zero cloud dependency, zero telemetry, and zero subscription costs.

---

## 1. Technical Stack

| Component | Technology | Rationale |
|---|---|---|
| **Shell & Window** | Electron 35 + TypeScript | Native Windows desktop integration, fast window lifecycle (<0.5s), local file system access. |
| **Frontend UI** | React 18 + Tailwind CSS + Lucide Icons | Responsive Swiss design, Bento grid layout, high-contrast dark/light mode. |
| **Local LLM Engine** | Ollama (`http://127.0.0.1:11434`) | Production-grade local inference runtime with GGUF support and memory tiering. |
| **Relational Storage** | SQLite (`sql.js` wasm + local file persistence) | Zero-setup single-file database for chat history, settings, and workspace isolation. |
| **Local Embeddings** | `nomic-embed-text` | High-accuracy 768-dim local vector embeddings without API keys. |
| **Voice Transcription** | `faster-whisper` (CPU int8) | Fast, private, offline automatic speech recognition. |

---

## 2. Model Ladder by Hardware

| Memory Tier | Recommended Model | Vision Model | High Performance Upgrade |
|---|---|---|---|
| **Entry (< 10 GB RAM)** | `qwen3:1.7b` | `gemma3:4b` | `qwen3:4b` |
| **Mid (16 GB RAM)** | `qwen3:4b` *(Default)* | `qwen3.5:4b` | `qwen3:8b` |
| **High (32 GB RAM)** | `qwen3:14b` | `qwen3.5:9b` | `qwen3:32b` |
| **Studio (64 GB+ RAM)** | `qwen3:32b` | `qwen3.5:9b` | `mistral-small:24b` |

---

## 3. Local Execution Order

1. **Local Model First**: All reasoning is performed on-device via Ollama at `127.0.0.1:11434`.
2. **Deterministic Local RAG Second**: Document context is ingested, vectorized locally (`nomic-embed-text`), and retrieved via cosine similarity with precise file/section citations.
3. **Strict Network Sandboxing**: Outbound network requests outside `127.0.0.1` and `localhost` are blocked at the Electron session layer. Zero cloud fallback.

---

## 4. Primary Failure Mode (#1 Risk)

> **Risk**: A user selects an LLM too large for their PC's available RAM/VRAM, triggering an Out-of-Memory (OOM) crash or extreme swap thrashing (< 0.5 tok/s).

**Mitigation Protocol**:
- System detects hardware specs and assigns a safety-rated recommended tier.
- In-flight inference stream captures runner exit and CUDA/memory errors (`runner exited`, `out of memory`).
- Friendly OOM recovery modal appears immediately, suggesting safe fallback to `qwen3:4b` or `qwen3:1.7b` without losing the conversation state.

---

## 5. Do-NOT-Rebuild List

- **DO NOT** implement a custom C++/CUDA inference engine — Ollama is the validated engine.
- **DO NOT** bundle cloud APIs (OpenAI, Claude, Gemini) or add API key inputs.
- **DO NOT** implement cloud user accounts, authentication, or remote synchronization.
- **DO NOT** bypass Windows subprocess hiding (`windowsHide: true` is non-negotiable).

---

## 6. Engineering & Build Discipline

1. **Local Only**: All prompt and vector data strictly remains on `127.0.0.1`.
2. **Acceptance Ledgers First**: No task is marked "done" without concrete verification evidence (test outputs, file citations, line numbers).
3. **No File Deletions**: Preserve all project assets and code structure.
4. **Zero Console Popups**: Every child process must execute silently with `{ windowsHide: true, stdio: 'pipe' }`.

