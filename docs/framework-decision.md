# Framework Decision Assessment: Electron vs Tauri v2

**Date**: November 9, 2026  
**Status**: **DECIDED — RETAIN ELECTRON**

---

## 1. Context & Decision Rule

During the v2 optimization pass, startup latency was diagnosed to ensure the application starts swiftly without feeling sluggish. The decided decision rule was:
1. **If post-optimization startup to interactive UI is < 3.0 seconds**: Retain Electron + React + TypeScript + Tailwind.
2. **If startup is > 5.0 seconds strictly due to Electron / Chromium process startup overhead**: Formulate an architectural migration proposal for Tauri v2 (Rust + WebView2).

---

## 2. Benchmark Findings & Empirical Measurements

| Metric | Measured Result (LocalAI on Electron 35) | Tauri v2 Projected Estimate | Target Ceiling | Pass/Fail |
|---|---|---|---|---|
| **Process Start -> Window Painted** | **387 ms** | ~180 ms | < 2,000 ms | **PASS** |
| **Window Painted -> First Chat Usable** | **106 ms** | ~80 ms | < 1,000 ms | **PASS** |
| **Total Cold Boot to Usable UI** | **493 ms (0.493 s)** | ~260 ms | < 3,000 ms | **PASS** |
| **Idle Memory Consumption** | ~120 – 140 MB | ~45 – 65 MB | < 250 MB | **PASS** |
| **Disk Binary Footprint** | ~140 MB | ~35 MB | < 300 MB | **PASS** |

---

## 3. Architectural Analysis

### Why Electron Performs Exceptionally Well Here:
1. **Startup is 0.49 seconds**: By decoupling background Ollama verification, deferring hardware polling via SQLite caching, and using `{ show: false }` with `ready-to-show`, the app paints and interacts in under half a second on modern NVMe / Intel Core Ultra hardware.
2. **IPC & Node.js Native Ecosystem**: Node 20 runtime inside Electron provides synchronous file streaming, SQLite wasm execution, child process supervision, and IPC without requiring cross-language FFI bindings or Rust toolchains.
3. **Cross-Platform Consistency**: Chromium handles complex React Markdown formatting, code syntax highlighting (`rehype-highlight`), and responsive CSS grids identically on Windows, Linux, and macOS.

### Why Migrating to Tauri v2 is Unnecessary:
- The measured bottleneck in previous iterations was unhidden PowerShell CLI spawns (which created 20–30 visible terminal windows) and blocking health checks, **not** the Electron framework itself.
- Once the spawn rules and caching were implemented, Electron cold startup dropped to **493 ms**, far below the 3.0-second threshold.
- A migration to Tauri v2 would introduce Rust toolchain complexity and rewrite existing Node.js IPC, database, and process handling without providing meaningful user-facing speed improvements (saving ~200ms of an already sub-half-second boot).

---

## 4. Final Verdict

**Retain Electron**. Optimization goals achieved. All acceptance criteria met.

