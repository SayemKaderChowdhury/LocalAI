# LocalAI — Terminal & Child Process Audit

**Date**: November 9, 2026  
**Platform**: Windows 11 / x64  
**Audit Target**: Zero terminal popups, zero conhost window creation, silent background execution.

---

## 1. Executive Summary

On Windows, any process spawned by a GUI application (`BrowserWindow` or Node process) that does not specify `windowsHide: true` and proper stdio redirection will trigger the Windows console subsystem (`conhost.exe` / `cmd.exe` / `powershell.exe`), rendering a transient or persistent black console window.

During initial launch and user actions in v1/v2, up to 20–30 visible terminal windows were observed flashing or popping up. This audit catalogues every child process call in the repository, diagnoses the root causes, and defines strict non-negotiable spawn rules.

---

## 2. Child Process Inventory & Audit Matrix

| Call ID | File | Line | Command / Executable | Invocation API | `windowsHide` Before | `stdio` Before | Shell Flag | Root Cause & Impact | Fix Implemented |
|---|---|---|---|---|---|---|---|---|---|
| **CP-01** | `src/main/hardware.ts` | 48 | `powershell.exe -NoProfile -NonInteractive -Command ...` | `execSync` | ❌ `false` (absent) | Default (unhandled) | Default | Spawns visible PowerShell/conhost window on startup & on every UI refresh. Blocks main thread. | Added `{ windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }`. Added SQLite caching so it only runs once on first boot or on-demand. |
| **CP-02** | `src/main/ollama.ts` | 16 | `ollama --version` | `exec` | ❌ `false` (absent) | Default (unhandled) | Default | Called during health checks; pops up a cmd window whenever renderer polls Ollama health. | Added `{ windowsHide: true, stdio: 'pipe' }`. Removed CLI calls from normal health poll (now 100% HTTP via `GET /api/tags`). |
| **CP-03** | `src/main/ollama.ts` | 61 | `ollama serve` | `spawn` | ⚠️ `true` | `ignore` | `shell: false` | Detached daemon spawn had unrouted output and lacked process supervisor handle. | Added `{ windowsHide: true, stdio: 'pipe', detached: false }`. Output piped to `%APPDATA%/LocalAI/logs/app.log`. Health checked via HTTP *before* spawning. |
| **CP-04** | `src/main/ipc.ts` | 413 | `python.exe scripts/transcribe.py ...` | `execSync` | ❌ `false` (absent) | Default (unhandled) | Default | Flashes a Python terminal window every time the user records and transcribes voice. | Added `{ windowsHide: true, stdio: ['ignore', 'pipe', 'pipe'] }`. Redirected stderr/stdout to app logger. |
| **CP-05** | `scripts/dev.js` | 36 | `electron .` | `spawn` | N/A (Dev script) | `inherit` | Default | Dev environment runner. | Maintained for developer visibility in CLI. |
| **CP-06** | `scripts/e2e-test.js` | 133, 136 | `python.exe` / `transcribe.py` | `execSync` | N/A (Test script) | Default | Default | E2E test harness execution. | Updated with `{ windowsHide: true }`. |

---

## 3. Strict Spawn Rules (Non-Negotiable)

1. **Every Child Process Call**:
   ```typescript
   {
     windowsHide: true,
     stdio: 'pipe', // or ['ignore', 'pipe', 'pipe']
     shell: false,
     detached: false
   }
   ```
2. **HTTP First for Daemon Management**:
   - Health checks must NEVER execute CLI binaries (`ollama list`, `ollama ps`, etc.).
   - Query `http://127.0.0.1:11434/api/tags` and `http://127.0.0.1:11434/api/ps` via native Node `http`.
   - Only attempt to spawn `ollama serve` if the HTTP check fails and the daemon is confirmed absent.
3. **Hardware Detection Consolidation & Caching**:
   - Run CIM/PowerShell detection once on first application launch.
   - Cache results in SQLite (`settings` key `hardware_cache`).
   - Subsequent boots use cached specs instantly (0 ms overhead) with no child processes spawned.
4. **Output Redirection & Rotation**:
   - Route child process `stdout` and `stderr` to `%APPDATA%/LocalAI/logs/app.log`.
   - Never let standard streams dump to unhandled conhost handles.
   - Automatically rotate `app.log` when it exceeds 10 MB.
5. **Windows Subsystem Enforcement**:
   - Ensure the Electron executable is linked against the Windows GUI Subsystem (`/SUBSYSTEM:WINDOWS`), preventing Windows from attaching an initial console window on launch.

---

## 4. Verification & Acceptance Criteria

- [x] Every child process call audited with line numbers in `docs/terminal-audit.md`.
- [x] Zero terminal windows appear on packaged application launch (`release/win-unpacked/LocalAI.exe`).
- [x] Background Ollama daemon check is purely HTTP.
- [x] Voice transcription is completely silent with no terminal popup.

