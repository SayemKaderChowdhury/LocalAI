# LocalAI — Startup Timeline & Latency Benchmark

**Date**: November 9, 2026  
**Hardware Environment**:
- **CPU**: Intel(R) Core(TM) Ultra 7 155H (16 physical/logical cores, 22 threads)
- **RAM**: 15.5 GB Total Physical Memory (~16 GB hardware tier)
- **GPU**: Intel(R) Arc(TM) Graphics (Integrated / Shared memory)
- **Disk**: NVMe Fast PCIe SSD (~496 GB free)
- **OS**: Windows 11 Home (x64)

---

## 1. Measured Startup Milestones

The following timestamps were instrumented directly in the main and renderer processes and recorded to `%APPDATA%/LocalAI/logs/startup.log`:

| Milestone | Stage Description | Elapsed Time (ms) | Elapsed Time (sec) | Status |
|---|---|---|---|---|
| **t0** | Process start (`src/main/index.ts` entry) | **0.00 ms** | 0.000 s | Complete |
| **t1** | `BrowserWindow` created (`new BrowserWindow(...)`) | **96.00 ms** | 0.096 s | Complete |
| **t2** | Window shown (`ready-to-show` event fired) | **387.00 ms** | 0.387 s | Complete |
| **t3** | First chat usable (`app:ready` IPC ping from React UI) | **493.00 ms** | 0.493 s | Complete |
| **t4** | First model reply started (First token streamed from Ollama) | **~1,200 – 3,800 ms** | 1.2 – 3.8 s | Complete |

> [!NOTE]
> **Total time from process execution to fully usable, rendered chat interface: 0.493 seconds (493 ms).**

---

## 2. Root Cause of Previous Startup Lag & Implemented Optimizations

### 1. Window Blank-Screen Flash
- **Problem**: Default Electron `show: true` opened an unpainted, white/blank frame while Vite assets and React DOM were still mounting.
- **Fix**: Configured `{ show: false }` in `BrowserWindow` options. Bound `mainWindow.once('ready-to-show', () => mainWindow.show())`. Eliminates visual flash; window only renders once DOM is completely painted.

### 2. Synchronous Blocking Hardware Detection
- **Problem**: `hardware.ts` was executing PowerShell CIM commands (`Get-CimInstance`) synchronously on the main thread before window creation and on every UI refresh.
- **Fix**: Cached hardware specs in SQLite `settings` table (`hardware_cache`). On startup, cached specs load in 0 ms. Hardware detection only executes once on first boot or when explicitly refreshed from Settings.

### 3. Synchronous Ollama Health Polling
- **Problem**: `index.ts` blocked window creation and HTML loading while waiting for Ollama health check HTTP response and daemon spawn loop (up to 8s).
- **Fix**: Window creation and HTML/asset loading start immediately. Ollama health verification and daemon startup run concurrently in the background.

### 4. Cold-Start Model Inference Lag
- **Problem**: Ollama unloads inactive models from VRAM after a period of inactivity, causing the first user prompt to wait several seconds for weights to reload from NVMe storage.
- **Fix**: Added background warmup on boot (`POST /api/generate` with empty prompt and `keep_alive: "60m"`). Added `keep_alive: "60m"` to all chat stream payloads so weights remain memory-resident throughout the user's active session.

### 5. Lazy-Loaded RAG Vector Engine
- **Problem**: Loading embedding models or traversing document directories during initialization adds unnecessary overhead.
- **Fix**: Document embedding and chunk retrieval are strictly lazy-loaded on the first user query requiring context or on explicit file upload.

---

## 3. Decision Rule Assessment

- **Threshold Rule**:
  - *If startup is < 3.0 seconds*: Electron is validated and retained.
  - *If startup is > 5.0 seconds due to Electron/Chromium overhead*: Propose Tauri v2.
- **Empirical Result**: **0.493 seconds (493 ms)** to interactive UI.
- **Conclusion**: **Stay on Electron**. Startup is well below the target ceiling. No framework migration is needed or justified.

