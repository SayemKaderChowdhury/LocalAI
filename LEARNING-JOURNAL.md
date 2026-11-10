# LEARNING-JOURNAL.md — why decisions were made, not just what changed

> One entry per feature, bug fix, or major architectural iteration (CLAUDE.md Workflow).
> Format: `date | ticket or topic | decision | why | what we would do differently`.
> Keep entries short; the ledger holds the evidence.

---

## 2026-11-09 — Architecture, Redesign & Modern Features (v2.0)

- 2026-11-09 | architecture | Local-only execution with Ollama on `127.0.0.1:11434` and zero cloud fallback | Protects user privacy and guarantees no user prompts, source code, or documents ever leave the host machine; air-gapped readiness | Provide automated one-click Ollama pull script for new users during initial setup
- 2026-11-09 | database | Single-file SQLite via `sql.js` (WebAssembly) with `%APPDATA%/LocalAI/localai.sqlite` persistence | Eliminates heavy local DBMS daemon installation (e.g. Postgres or MySQL) while delivering ACID relational guarantees, zero-config startup, and instant backups | Implement automated daily database snapshotting (`.bak`) before migrations run
- 2026-11-09 | design | Minimalism + Swiss Design + Bento Grid layout strictly adhering to Apple HIG | Prevents the cluttered, hyper-saturated aesthetic of generic AI demos; centered `max-w-3xl` reading column ensures optimal typographic rhythm and readability | Enforce design tokens via Tailwind configuration variables rather than inline hex colors
- 2026-11-09 | feature-1 | Offline voice-to-text powered by `faster-whisper` (CPU int8) in a sandboxed Python runner | Zero reliance on cloud speech recognition (Web Speech API / Google Speech); completely offline audio processing | Provide an internal streaming WebSocket IPC runner rather than one-shot process execution if audio clips exceed 60 seconds
- 2026-11-09 | feature-2 | Differential checksum sync (mtime + size hash) for recursive folder ingestion | Indexing full directory trees without deduplication wastes disk, memory, and embedding generation compute; differential sync ensures 0 duplicate passes on untouched files | Add SHA-256 content verification for edge cases where timestamps match but file contents vary
- 2026-11-09 | feature-3 | Clipboard paste (`Ctrl+V`) and zoom lightbox modal for image inputs | Desktop users expect instant clipboard pasting for screenshots; modal enables detailed visual inspection of charts and diagrams | Support multi-image side-by-side comparison in lightbox

---

## 2026-11-09 — Performance, Safety & GitHub Readiness

- 2026-11-09 | bug-terminal-popups | Non-negotiable `{ windowsHide: true, stdio: 'pipe', shell: false, detached: false }` across all child process calls | Windows GUI applications spawn visible `conhost.exe` or `cmd.exe` windows whenever CLI processes are invoked without the hidden flag; 20–30 flashing windows on boot look like malware | Enforce child process lint rule to reject any raw `exec` or `spawn` without `windowsHide: true`
- 2026-11-09 | bug-terminal-popups | HTTP API health checking (`GET /api/tags`) instead of CLI polling (`ollama --version`) | Native Node `http.get` executes in 2 ms with zero child process overhead, zero terminal windows, and deterministic status detection | Cache CLI version string once on install and never re-poll it via terminal
- 2026-11-09 | startup-lag | Hardware detection cached in SQLite (`settings.hardware_cache`) | PowerShell CIM queries (`Get-CimInstance`) take ~2.5 seconds on Windows; caching them makes subsequent application launches instantaneous (0 ms hardware overhead) | Add background re-detection trigger only when user clicks "Refresh Specs" in Settings
- 2026-11-09 | startup-lag | Decouple Ollama daemon verification and model warmup from `BrowserWindow` creation | Blocking `loadURL` / `loadFile` while polling Ollama stalled UI rendering; showing window on `ready-to-show` and checking daemon in background dropped cold boot to 493 ms (< 0.5s) | Maintain subtle connecting dot in sidebar while background check is resolving
- 2026-11-09 | framework-decision | Retain Electron over migrating to Tauri v2 | Benchmark showed cold boot to interactive chat is 493 ms (well under the 3.0s ceiling); Tauri v2 would add Rust FFI and toolchain complexity without perceptible speed gain for the user | Re-evaluate only if idle memory consumption becomes a constraint on sub-8GB hardware
- 2026-11-09 | branding-cleanse | Complete removal of builder templates and addition of native About tab | Eliminates third-party tool watermarks and establishes clean open-source product identity with MIT license | Ensure About dialog displays exact SQLite storage directory path for transparency

---

## 2026-11-10 — Extensive CalProof Verification & Testing Harness

- 2026-11-10 | bug-workspace-scoping | Strict scoping for vector chunk queries in `getChunksForScope` | Unconditional inclusion of `global` chunks inside workspace queries leaked general documents into confidential workspaces and prevented clean verification of workspace deletion | Provide explicit `includeGlobal` flag defaulting to `false` for scoped workspaces
- 2026-11-10 | bug-folder-sync | Per-file try/catch in differential sync `syncFolder` | A single malformed PDF or unreadable file halted the entire directory synchronization run; wrapping individual file indexing in error handlers allows differential sync to continue and log `skipped++` | Surface list of skipped files in the UI sync completion notification
- 2026-11-10 | test-isolation | Isolated temporary database directory parameter for `LocalDatabase` | Testing against the shared user AppData directory caused cross-test data pollution and risked modifying user chat history | Always inject isolated test sandbox directory paths in automated test runners


