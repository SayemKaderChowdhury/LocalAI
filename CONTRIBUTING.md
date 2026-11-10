# Contributing to LocalAI

Thank you for contributing to LocalAI. We welcome contributions that maintain the strict privacy, local-first execution, and minimalist design standards of the project.

---

## 1. Guiding Principles

1. **Local-Only Guarantee**: Code changes must never introduce external network calls, cloud LLM providers, telemetry, or remote logging. All operations must stay on `127.0.0.1`.
2. **Zero Terminal Popups on Windows**: Any new child process call must enforce `{ windowsHide: true, stdio: 'pipe', shell: false, detached: false }`.
3. **Minimalism & Swiss Design**: UI additions must follow [DESIGN.md](DESIGN.md). No purple gradients, decorative animations, or cluttered toolbars.

---

## 2. Development Setup

1. **Prerequisites**:
   - Node.js 20+
   - Ollama installed locally (`http://127.0.0.1:11434`)
   - Model weights pulled: `ollama pull qwen3:4b` and `ollama pull nomic-embed-text`
2. **Clone & Install**:
   ```bash
   git clone https://github.com/SayemKaderChowdhury/LocalAI.git
   cd LocAI
   npm install
   ```
3. **Run in Development**:
   ```bash
   npm run dev:electron
   ```

---

## 3. Running Verification & Tests

Before submitting a Pull Request, ensure all acceptance suites pass cleanly:

```bash
# 1. Typecheck & Build
npm run build

# 2. Run End-to-End Test Suite
npm run test:e2e

# 3. Verify Silent Spawns (Zero Terminal Windows)
node scripts/verify-terminal-count.js

# 4. Measure Startup Latency (Must remain < 3.0s)
node scripts/measure-startup.js
```

---

## 4. Code Style & Commit Guidelines

- **TypeScript**: Strict mode enabled. Avoid `any` where strong types exist in `src/shared/types.ts`.
- **Formatting**: Tailwind utility classes ordered logically.
- **Commits**: Clear, imperative commit messages (e.g. `fix: eliminate conhost popup in whisper runner`).
- **Never Commit User Data**: Never commit `.sqlite` files, conversation history, user documents, or `.env` files.

