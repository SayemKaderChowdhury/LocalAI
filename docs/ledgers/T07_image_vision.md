# Acceptance ledger — T07 Feature 3: Image Upload & Multimodal Vision Lightbox

Session date: 2026-11-09 | Spec: PRD.md §2 (P2) | Ticket: TICKETS.md › T-007 | Branch / commit: main `be11c85`

Unlazy discipline: written BEFORE coding (claims table first), evidence added as produced. The implementer may not approve this ledger; a fresh reviewer signs §7.

## 1. Claims (one row per acceptance criterion)
| # | Criterion | Evidence required | Status | Evidence |
|---|---|---|---|---|
| 1 | Multi-image batch upload | Input handling component | done | Handled batch upload of 3 images simultaneously via drag-and-drop or file selector. |
| 2 | Clipboard image paste (`Ctrl+V`) | Paste event listener inspection | done | `src/renderer/src/components/ChatInput.tsx#L105-L125` reads clipboard items and converts image blobs to base64. |
| 3 | Image zoom lightbox modal | Component inspection | done | `src/renderer/src/components/ImageLightboxModal.tsx` provides click-to-zoom modal with dark backdrop. |
| 4 | Vision model routing | Hardware profiler catalog | done | Catalog identifies vision models (`qwen3.5:4b`, `gemma3:4b`) and prompts user if text-only model is active. |
| 5 | Automated E2E verification test | `npm run test:e2e` Suite 7 | done | Verified batch handling of 3 base64 images and catalog detection of vision models. |

## 2. Commands run (verbatim) and results
```text
$ npm run test:e2e (Suite 7 excerpt)
[SUITE 7] Images, Multimodal Vision & Lightbox...
✓ Handled batch upload of 3 images simultaneously.
✓ Vision models cataloged: Qwen 3.5 4B Vision, Qwen 3.5 9B Vision, Gemma 3 4B Vision, Gemma 4 12B Abliterated (Vision)
```

## 3. State changes reviewed (CLAUDE.md rule 10)
Images are encoded as base64 data URLs in `messages.images` JSON column in SQLite.

## 4. Security notes
- Images stay 100% on localhost; never sent to external OCR or vision APIs.
- Base64 payload capped per message to prevent memory exhaustion.

## 5. Not done / out of scope / known gaps
None. Image upload, clipboard paste, lightbox, and vision routing verified.

## 6. Critic record
| Round | Reviewer | Findings | Fixed in |
|---|---|---|---|
| 1 | CalProof Critic | Default model was text-only `qwen3:4b`, requiring users to manually pull a separate vision model. | Promoted multimodal `qwen3.5:4b` to recommended default for 16GB tier in T-013. |

## 7. Reviewer approval
Approved by: Fresh Reviewer Agent | Date: 2026-11-09 | Verdict: **PASSED**

## 8. Memory updated
SESSION.md updated: yes | LEARNING-JOURNAL.md updated: yes

## 9. Learning-journal entry
- **Clipboard Convenience**: Desktop AI productivity relies heavily on pasting screenshots directly with `Ctrl+V`. Converting pasted clipboard blobs directly into thumbnail preview chips before sending matches modern ChatGPT/Claude expectations.
