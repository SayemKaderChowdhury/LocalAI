# Changelog

All notable changes to LocalAI are documented in this file.  
The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/), and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [2.0.0] - 2026-11-09

### Added
- **Offline Voice-to-Text**: Local speech-to-text powered by `faster-whisper` (CPU int8) in a sandboxed Python runner (`scripts/transcribe.py`). Includes microphone recording button and instant transcription into chat input.
- **Folder Upload & Differential Sync RAG**: Recursive directory scanning for multi-format document trees (`.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.xlsx`, `.png`, `.jpg`, `.webp`) with differential checksum synchronization (mtime + size hash).
- **Multimodal Vision & Lightbox**: Support for image understanding via local vision models (`qwen3.5:4b`, `gemma3:4b`), clipboard paste (`Ctrl+V`), thumbnail chip previews, and a click-to-zoom image lightbox.
- **Isolated Workspaces**: Project containers with isolated custom instructions, dedicated memory notes, and scoped document libraries.
- **Opt-in Abliterated Models**: Catalog of uncensored models with mandatory confirmation modal requiring explicit user responsibility acknowledgment.
- **Process Logging & Startup Instrumentation**: App logger writing to `%APPDATA%/LocalAI/logs/app.log` (with 10MB rotation) and millisecond milestone logging in `%APPDATA%/LocalAI/logs/startup.log`.
- **Clean About Screen**: Native About tab in Settings displaying app name, version (2.0.0), MIT license, local active model, storage path, and zero telemetry guarantee.
- **Documentation Suite**: CalProof-grade engineering documentation including `ESSENTIALS.md`, `PRD.md`, `ARCHITECTURE.md`, `CLAUDE.md`, `DESIGN.md`, `TICKETS.md`, `SESSION.md`, `startup-timeline.md`, and `terminal-audit.md`.

### Fixed
- **Terminal Popups on Launch (Top Priority Bug)**: Eliminated 20–30 flashing console/command prompt windows on Windows startup by enforcing `{ windowsHide: true, stdio: 'pipe', shell: false, detached: false }` across all child process calls.
- **Startup Blank Screen Flash**: Resolved white flash on boot by creating `BrowserWindow` with `{ show: false }` and displaying only on `ready-to-show`.
- **Startup Latency**: Reduced boot time to interactive UI to **493 ms (< 0.5s)** by caching hardware detection in SQLite and moving Ollama health checks and model warmup to non-blocking background routines.
- **Model Cold-Start Delay**: Added automatic background model warmup on boot with `keep_alive: "60m"`.
- **Branding Cleanse**: Removed all builder templates, third-party watermarks, and non-neutral copy.
