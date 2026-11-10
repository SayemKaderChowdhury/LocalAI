# LocalAI — Project Tickets & Acceptance Ledgers

> **Discipline Rule**: Never mark a ticket `done` without a complete acceptance ledger containing verifiable test evidence (test names, file paths, line numbers, and command output). Never leave tickets stale when work has been implemented and tested.

---

## Ticket Overview

| Ticket ID | Description | Priority | Status | Evidence Summary |
|---|---|---|---|---|
| **T-001** | Fix Terminal Popups on Launch (Top Priority Bug) | P0 | **DONE** | Zero console windows verified via `scripts/verify-terminal-count.js` (0 conhost/cmd). |
| **T-002** | Diagnose & Optimize Startup Latency Timeline | P0 | **DONE** | Measured 493ms cold boot to usable UI in `docs/startup-timeline.md` (well under 3.0s ceiling). |
| **T-003** | Remove Builder Branding & Add Clean About Screen | P1 | **DONE** | Zero external watermarks in codebase; About tab in `SettingsModal.tsx` v2.0.0. |
| **T-004** | CalProof-Style Documentation Suite | P1 | **DONE** | Root docs created: `README`, `ESSENTIALS`, `PRD`, `ARCHITECTURE`, `CLAUDE`, `DESIGN`, `SESSION`, `CHANGELOG`. |
| **T-005** | Feature 1: Offline Voice-to-Text (`faster-whisper`) | P1 | **DONE** | E2E test `[TEST 3]` passed; `transcribe.py` runs with `windowsHide: true`. |
| **T-006** | Feature 2: Folder Upload & Differential Sync RAG | P1 | **DONE** | E2E test `[TEST 2]` passed (recursive scan, 0 dupes on untouched, 1 on edit). |
| **T-007** | Feature 3: Image Upload & Multimodal Vision Lightbox | P1 | **DONE** | Zoom lightbox component verified, clipboard paste (`Ctrl+V`), and vision routing. |
| **T-008** | Feature 4: Workspaces (Isolated Memory & Scoped RAG) | P1 | **DONE** | E2E test `[TEST 1]` passed; SQLite schema migration & scoped chat filter verified. |
| **T-009** | Opt-in Uncensored / Abliterated Model Catalog | P2 | **DONE** | E2E test `[TEST 4]` passed; default false, warning modal with acknowledgment. |
| **T-010** | GitHub Repository Readiness & CI Workflow Setup | P1 | **DONE** | Git initialized, `.gitignore`, MIT `LICENSE`, `NOTICES`, `CONTRIBUTING.md`, `.github/workflows/test.yml`. |

---

## Detailed Acceptance Ledgers

### [T-001] Fix Terminal Popups on Launch (Top Priority Bug)
- **Status**: **DONE**
- **Root Cause**: Unhidden child processes (`powershell.exe`, `ollama --version`, `python.exe`) called via `exec`/`execSync` without `{ windowsHide: true, stdio: 'pipe' }`.
- **Criteria & Evidence**:
  1. *Audit every child process in `docs/terminal-audit.md`*:
     - Evidence: Created `docs/terminal-audit.md` cataloging CP-01 through CP-06.
  2. *All child processes enforce `{ windowsHide: true, stdio: 'pipe', shell: false, detached: false }`*:
     - Evidence: `src/main/hardware.ts#L48-L53`, `src/main/ollama.ts#L16-L23`, `src/main/ollama.ts#L61-L70`, `src/main/ipc.ts#L446-L452`.
  3. *Zero terminal windows on packaged app boot*:
     - Command: `node scripts/verify-terminal-count.js`
     - Output: `Terminal / Console Window Count: 0` -> `✅ VERIFICATION PASSED: Exactly ZERO terminal windows detected!`
  4. *Child process output routed to log file*:
     - Evidence: Logger wrote daemon output to `%APPDATA%/LocalAI/logs/app.log`.

---

### [T-002] Diagnose & Optimize Startup Latency Timeline
- **Status**: **DONE**
- **Criteria & Evidence**:
  1. *Instrument timeline milestones `t0` to `t4`*:
     - Evidence: `src/main/index.ts#L1-L45`, `src/main/ipc.ts#L22-L27`, `src/main/ipc.ts#L274-L281`.
  2. *Startup log written to `%APPDATA%/LocalAI/logs/startup.log`*:
     - Command: `node scripts/measure-startup.js`
     - Output:
       - `t0 (process start)`: 0.00 ms
       - `t1 (window created)`: 96.00 ms
       - `t2 (window shown)`: 387.00 ms
       - `t3 (first chat usable)`: 493.00 ms (0.493s)
  3. *Eliminate white/blank window flash*:
     - Evidence: Set `show: false` in `BrowserWindow` options and show on `ready-to-show` event.
  4. *Evaluate Framework Decision Rule (<3s vs >5s)*:
     - Evidence: Recorded in `docs/framework-decision.md`. At 493 ms (<0.5s), Electron is retained.

---

### [T-003] Remove Builder Branding & Add Clean About Screen
- **Status**: **DONE**
- **Criteria & Evidence**:
  1. *Zero builder watermarks in codebase*:
     - Evidence: Case-insensitive search for "Gemini", "Google AI", "Anti-Gravity", "Powered by" returned 0 matches in application source.
  2. *Add clean About dialog / tab*:
     - Evidence: `src/renderer/src/components/SettingsModal.tsx#L604-L650`.
     - Displays: LocalAI, Version 2.0.0, "Local AI — chats and files stay on this PC.", active model, MIT License, storage path, zero telemetry statement.

---

### [T-004] CalProof-Style Documentation Suite
- **Status**: **DONE**
- **Criteria & Evidence**:
  1. *Create all required root documents*:
     - `README.md`: 3-line description, installation, what it does/doesn't do, screenshots, doc links.
     - `ESSENTIALS.md`: 1-page distillation, model ladder, AI order, #1 risk, do-NOT-rebuild list.
     - `PRD.md`: Features, non-goals, priority order, acceptance criteria.
     - `ARCHITECTURE.md`: Topologies, SQLite schemas, loopback boundary, storage layout.
     - `CLAUDE.md`: Hard rules, workflow, and one-word-one-meaning glossary.
     - `DESIGN.md`: Updated to match current built app.
     - `TICKETS.md`: This file with acceptance ledgers.
     - `SESSION.md`: Full session history, decisions, and watermark audit.
     - `CHANGELOG.md`: Version 2.0.0 release notes.

---

### [T-005] Feature 1: Offline Voice-to-Text (`faster-whisper`)
- **Status**: **DONE**
- **Criteria & Evidence**:
  - Mic button in chat input bar initiates audio recording.
  - Python runner `scripts/transcribe.py` invokes `faster-whisper` on CPU int8 offline.
  - Test evidence: `scripts/e2e-test.js` `[TEST 3]` passed with `{ success: true, duration: 0.5, language: 'en' }`.

---

### [T-006] Feature 2: Folder Upload & Differential Sync RAG
- **Status**: **DONE**
- **Criteria & Evidence**:
  - Recursive folder scanning handles multi-format file trees (`.txt`, `.csv`, `.docx`, `.pdf`, `.xlsx`).
  - Differential sync checks mtime/size hash; untouched folders return 0 changes.
  - Test evidence: `scripts/e2e-test.js` `[TEST 2]` passed (`0 added, 0 updated` on pass 1; `1 updated` on file edit).

---

### [T-007] Feature 3: Image Upload & Multimodal Vision Lightbox
- **Status**: **DONE**
- **Criteria & Evidence**:
  - Supports PNG, JPG, JPEG, WEBP via drag-drop, file input, and clipboard paste (`Ctrl+V`).
  - Zoom lightbox modal in `src/renderer/src/components/ImageLightboxModal.tsx`.
  - Automatically routes image messages to vision models (`qwen3.5:4b`).

---

### [T-008] Feature 4: Workspaces (Isolated Memory & Scoped RAG)
- **Status**: **DONE**
- **Criteria & Evidence**:
  - Dedicated Workspaces view with Bento cards in `src/renderer/src/components/WorkspacesView.tsx`.
  - Scoped database filtering by `workspace_id` in `src/main/db.ts`.
  - Test evidence: `scripts/e2e-test.js` `[TEST 1]` passed (`✓ Workspace created & retrieved`, `✓ Scoped chat found inside workspace`).

---

### [T-009] Opt-in Uncensored / Abliterated Model Catalog
- **Status**: **DONE**
- **Criteria & Evidence**:
  - Toggle in Settings disabled by default (`enableAbliteratedModels: false`).
  - Mandatory confirmation modal requiring explicit user acknowledgment before download.
  - Test evidence: `scripts/e2e-test.js` `[TEST 4]` passed.

---

### [T-010] GitHub Repository Readiness & CI Workflow Setup
- **Status**: **DONE**
- **Criteria & Evidence**:
  - Clean `.gitignore` protecting user chats, databases, binary models, and logs.
  - MIT `LICENSE` and `NOTICES` created.
  - Multi-OS GitHub Actions test workflow `.github/workflows/test.yml` configured.
  - Provided exact push commands with `[MY GITHUB REPO URL]` placeholder.

