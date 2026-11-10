# PLANNING-LOG.md — Architecture, Decisions & Risk Iterations

> Chronological log of architecture, engineering decisions, and risk assessments for LocalAI.

---

## 1. Project Initialization & Architecture Baseline (v1.0)

### Decisions Recorded
1. **Desktop Shell**: Electron + TypeScript + React + Tailwind CSS.
   - *Rationale*: Native window controls, native local filesystem access, easy integration with local SQLite and child process runners.
2. **Inference Engine**: Ollama running locally at `http://127.0.0.1:11434`.
   - *Rationale*: Stable GGUF execution, GPU/CPU auto-offloading, actively maintained API surface.
3. **Embeddings Engine**: `nomic-embed-text` (768 dimensions).
   - *Rationale*: State-of-the-art open-source text embeddings running locally in <50ms per chunk.
4. **Relational & Vector Store**: Single SQLite database via `sql.js` (WebAssembly) stored in `%APPDATA%/LocalAI/localai.sqlite`.
   - *Rationale*: Self-contained, portable, no separate database server to install or maintain.

---

## 2. Redesign & Modern Features Planning (v2.0)

### Decisions Recorded
1. **Design System**: Minimalism + Swiss Design + Bento Grid.
   - *References*: Mobbin, 21st.dev, Apple Human Interface Guidelines (HIG).
   - *Constraints*: No purple gradients, no random emojis, no glassmorphism overload, no neumorphism, max 3 cards in a row, single accent blue (`#2563EB`).
2. **Voice-to-Text Architecture**:
   - Evaluated Web Speech API vs Local Whisper.
   - *Decision*: Rejected Web Speech API because Chromium routes audio to Google cloud servers on Windows. Adopted offline `faster-whisper` on CPU int8 to guarantee 100% offline privacy.
3. **Folder Sync Architecture**:
   - Evaluated Full Re-index vs Differential Checksum Sync.
   - *Decision*: Adopted differential synchronization using composite file hash (`stats.size + stats.mtimeMs`). Skips unchanged files entirely (0 duplicate compute).
4. **Workspace Scoping**:
   - Implemented ChatGPT/Claude-style projects.
   - *Decision*: Scoped conversations, documents, system prompt instructions, and memory per workspace via `workspace_id` foreign key.

---

## 3. Bug Fixing, Performance & GitHub Release (v2.0.0)

### Problem 1: 20–30 Visible Terminal Windows on Launch
- **Root Cause**: Windows allocates a visible `conhost.exe` console window for any GUI child process execution that lacks `windowsHide: true`.
- **Plan & Execution**:
  1. Audit every `child_process` call across `src/main` (`docs/terminal-audit.md`).
  2. Enforce `{ windowsHide: true, stdio: 'pipe', shell: false, detached: false }` across all calls.
  3. Replace CLI version calls in health polling with native HTTP `GET /api/tags`.
  4. Cache hardware detection results in SQLite `settings` table (`hardware_cache`).
  5. Route daemon output to `%APPDATA%/LocalAI/logs/app.log` with 10MB rotation.
- **Verification**: `scripts/verify-terminal-count.js` executed against packaged executable. Verified exactly 0 terminal windows.

### Problem 2: Startup Latency & White Flash
- **Root Cause**: Main thread blocked by synchronous PowerShell CIM queries and Ollama daemon startup before window creation. `show: true` default caused blank window flash.
- **Plan & Execution**:
  1. Add millisecond instrumentation (`t0` to `t4`).
  2. Set `show: false` on `BrowserWindow` and reveal on `ready-to-show`.
  3. Move Ollama health check and model warmup to background asynchronous tasks.
  4. Preload model in background with `keep_alive: "60m"`.
- **Measured Result**: Cold boot dropped to **493 ms (0.493 seconds)**.
- **Decision**: Retain Electron; do not migrate to Tauri v2.

---

## 4. Hardware Tiering Ladder

| Detected Physical RAM | Assigned Tier | Default Chat Model | Vision Model | High Performance Upgrade |
|---|---|---|---|---|
| **< 10 GB** | `8gb_low` | `qwen3:1.7b` | `gemma3:4b` | `qwen3:4b` |
| **10 – 20 GB** | `16gb_mid` | `qwen3:4b` | `qwen3.5:4b` | `qwen3:8b` |
| **20 – 32 GB** | `32gb_high` | `qwen3:14b` | `qwen3.5:9b` | `qwen3:32b` |
| **> 32 GB / 24GB+ VRAM** | `ultra` | `qwen3:32b` | `qwen3.5:9b` | `mistral-small:24b` |

---

## 5. Security & Boundary Verification

1. **Network Interceptor**: Electron session webRequest blocks all URLs not matching:
   - `file:*`
   - `devtools:*`
   - `http://127.0.0.1:*`
   - `http://localhost:*`
   - `ws://127.0.0.1:*`
   - `ws://localhost:*`
2. **Database Integrity**: Backed up before migrations (`localai.sqlite.bak`).
3. **No External Telemetry**: Zero tracking pixels, Google Analytics, or remote error reporting packages.

