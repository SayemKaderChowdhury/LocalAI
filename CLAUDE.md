# LocalAI — Developer Guidelines & Hard Rules

## 1. Technical Stack
- **Framework**: Electron 35 + TypeScript 5.8
- **Frontend**: React 18 + Tailwind CSS 3.4 + Vite 6.2
- **Local AI Runtime**: Ollama (bound to `127.0.0.1:11434`)
- **Database**: SQLite via `sql.js` (WebAssembly with `%APPDATA%/LocalAI/localai.sqlite` persistence)
- **Voice Transcription**: `faster-whisper` (Python 3.10+ in `whisper-env/`)
- **Icons**: Lucide React

---

## 2. Essential Commands

```bash
# Start Vite development server & Electron in parallel
npm run dev:electron

# Compile renderer and Electron main process
npm run build

# Run end-to-end acceptance tests
npm run test:e2e
# (Executes: node scripts/run-e2e.js)

# Measure startup latency timeline
node scripts/measure-startup.js

# Verify child process silent execution (zero terminal popups)
node scripts/verify-terminal-count.js

# Package unpacked Windows directory executable
npm run package
```

---

## 3. Hard Engineering Rules (CalProof Discipline Adapted)

1. **Local Only**: No prompt, user document, image, or audio recording may ever leave this PC. Ollama binds to `127.0.0.1` only. Zero telemetry, zero analytics, zero cloud accounts.
2. **Deterministic / Local First**: Ollama is the inference engine. Do not write a custom inference engine or bundle cloud APIs.
3. **Acceptance Ledgers Before "Done"**: Every ticket or bug fix must have a complete acceptance ledger with verifiable evidence (test name, command output, file path, and line numbers) before marking done in `TICKETS.md`.
4. **Zero Terminal Popups on Windows**: Every child process spawn (`exec`, `execSync`, `spawn`) MUST include `{ windowsHide: true, stdio: 'pipe', shell: false, detached: false }`. No conhost or cmd windows permitted.
5. **Never Delete User Data**: User conversations, documents, and database records are sacred. Always preserve files and backup before schema changes.
6. **No File Deletions**: Do not delete existing code files. Add or edit code safely.
7. **Never Weaken Tests**: Never skip, weaken, or comment out failing tests to make suites pass.
8. **Logging Redirection**: Pipe child process standard output and errors to `%APPDATA%/LocalAI/logs/app.log` with automatic rotation at 10 MB.
9. **No Secrets**: Never commit tokens, credentials, or private model keys.
10. **Startup Guardrail**: Keep cold startup to interactive UI under 3.0 seconds (currently ~493 ms).

---

## 4. Glossary (One Word, One Meaning)

- **Chat**: An individual conversation session with an ordered series of user and assistant messages.
- **Message**: A single discrete turn in a chat containing role (`user` | `assistant` | `system`), content, timestamp, citations, and optional images.
- **Workspace**: An isolated project environment scoping custom instructions, persistent memory notes, and private document collections.
- **Knowledge / Library**: The repository of ingested documents indexed for semantic context retrieval.
- **Embedding**: A 768-dimensional numerical vector representing the semantic meaning of a text chunk, generated locally via `nomic-embed-text`.
- **Model**: A local Large Language Model weight file managed by Ollama (e.g., `qwen3:4b`, `qwen3.5:4b`).
- **RAG**: Retrieval-Augmented Generation — finding relevant document chunks via cosine similarity and prepending them to the LLM system prompt with citations.
- **Voice-to-Text**: Offline speech recognition transcribing local microphone audio into text via `faster-whisper`.

