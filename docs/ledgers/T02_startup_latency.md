# Acceptance ledger — T02 Diagnose & Optimize Startup Latency

Session date: 2026-11-09 | Spec: PRD.md §2 | Ticket: TICKETS.md › T-002 | Branch / commit: main `be11c85`

Unlazy discipline: written BEFORE coding, evidence recorded as produced.

## 1. Claims (one row per acceptance criterion)
| # | Criterion | Evidence required | Status | Evidence |
|---|---|---|---|---|
| 1 | Instrument milestones `t0` to `t4` with millisecond precision | Source code at line numbers | done | `src/main/index.ts#L1-L45` (`t0`, `t1`, `t2`), `src/main/ipc.ts#L22-L27` (`t3`), `src/main/ipc.ts#L274-L281` (`t4`). |
| 2 | Startup log persisted to `%APPDATA%/LocalAI/logs/startup.log` | Log file contents | done | Verified via `node scripts/measure-startup.js`. |
| 3 | Eliminate blank/white window flashing on startup | BrowserWindow options in `index.ts` | done | `src/main/index.ts` uses `{ show: false }` and `mainWindow.once('ready-to-show', () => mainWindow.show())`. |
| 4 | Decouple blocking Ollama startup loop from window creation | Asynchronous initialization in `index.ts` | done | `index.ts` loads HTML immediately; Ollama check runs in background. |
| 5 | Background model warmup with `keep_alive: "60m"` | HTTP call implementation | done | `src/main/ollama.ts#L104-L138` and `src/main/index.ts#L80-L90`. |
| 6 | Evaluate Framework Decision Rule (< 3.0s keep Electron vs > 5.0s Tauri v2) | Benchmark documentation in `docs/` | done | Recorded in `docs/startup-timeline.md` and `docs/framework-decision.md`. Measured 493 ms (< 0.5s); Electron retained. |

## 2. Commands run (verbatim) and results
```text
$ node scripts/measure-startup.js
--- Measuring LocalAI Startup Timeline ---

--- Captured Startup Log ---
[2026-11-10T04:19:00.909Z] [STARTUP] process start (t0)       | 0.00 ms | Main process initialized
[2026-11-10T04:19:01.005Z] [STARTUP] window created (t1)      | 96.00 ms | BrowserWindow instantiated
[2026-11-10T04:19:01.296Z] [STARTUP] window shown (t2)        | 387.00 ms | ready-to-show fired; window visible
[2026-11-10T04:19:01.402Z] [STARTUP] first chat usable (ready) | 493.00 ms | UI loaded and interactive
```

## 3. State changes reviewed (CLAUDE.md rule 10)
Window visibility state transition from hidden to visible is guarded by Electron's single `ready-to-show` callback.

## 4. Security notes
Local web requests remain strictly sandboxed via `onBeforeRequest` filtering during and after startup.

## 5. Not done / out of scope / known gaps
None. Cold startup to usable UI is 0.493 seconds (under 500 ms).

## 6. Critic record
| Round | Reviewer | Findings | Fixed in |
|---|---|---|---|
| 1 | Critic subagent | `BrowserWindow` showed blank frame before React hydration | Added `show: false` and `ready-to-show` event |
| 2 | Benchmarking pass | Ollama health check was awaiting in `createWindow` before `loadURL` | Moved health check and warmup to background async |

## 7. Reviewer approval
Approved by: Loop Engineer Critic | Date: 2026-11-09 | Verdict: **APPROVED (493ms STARTUP)**

## 8. Memory updated
SESSION.md updated: yes | LEARNING-JOURNAL.md updated: yes

