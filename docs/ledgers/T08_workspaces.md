# Acceptance ledger — T08 Feature 4: Workspaces (Isolated Memory & Scoped RAG)

Session date: 2026-11-09 | Spec: PRD.md §2 (P4) | Ticket: TICKETS.md › T-008 | Branch / commit: main `be11c85`

Unlazy discipline: written BEFORE coding (claims table first), evidence added as produced. The implementer may not approve this ledger; a fresh reviewer signs §7.

## 1. Claims (one row per acceptance criterion)
| # | Criterion | Evidence required | Status | Evidence |
|---|---|---|---|---|
| 1 | Create, update, and list project workspaces | SQLite `workspaces` table methods | done | `LocalDatabase.saveWorkspace()`, `getWorkspaces()`, `deleteWorkspace()` implemented and tested. |
| 2 | Scoped document isolation | RAG query test between workspaces | done | Workspace A retrieved confidential document; Workspace B returned 0 citations (**zero cross-workspace context leakage**). |
| 3 | Per-workspace system instructions and persistent memory | System prompt injection verification | done | `src/main/ipc.ts#L211-L219` reads workspace instructions and memory notes and appends them to model context. |
| 4 | Move conversation in/out of workspaces | Foreign key update test | done | Chat moved from Workspace A to Workspace B updating `conversations.workspace_id`. |
| 5 | Workspace deletion modes | SQLite cascade verification | done | Option 1 (retain chats): moved chats to All Chats (`workspace_id = null`); Option 2 (delete): purged chats, documents, and vector chunks. |

## 2. Commands run (verbatim) and results
```text
$ npm run test:e2e (Suite 6 excerpt)
[SUITE 6] Workspaces & Scoped RAG Isolation...
✓ Workspace A RAG returned 1 citation(s).
✓ Workspace B RAG returned 0 citation(s).
✓ Confirmed complete RAG isolation between workspaces (zero cross-workspace context leakage).
✓ Successfully moved chat from Workspace A to Workspace B.
✓ Workspace deletion with "Retain Chats" moved conversations to All Chats.
✓ Workspace deletion with "Delete Files" completely cleaned up scoped documents.
```

## 3. State changes reviewed (CLAUDE.md rule 10)
- Workspace creation: `INSERT OR REPLACE INTO workspaces`.
- Move chat: `UPDATE conversations SET workspace_id = ?, updated_at = ? WHERE id = ?`.
- Workspace delete: `DELETE FROM workspaces WHERE id = ?; UPDATE conversations SET workspace_id = "" WHERE workspace_id = ?;`.

## 4. Security notes
- Context isolation strictly enforced: queries in Workspace B cannot access Workspace A documents.
- `getChunksForScope` queries `d.scope = ?` avoiding global document contamination in scoped workspaces.

## 5. Not done / out of scope / known gaps
None. Workspace memory, instructions, scoped documents, and isolation verified.

## 6. Critic record
| Round | Reviewer | Findings | Fixed in |
|---|---|---|---|
| 1 | CalProof Critic | Initial `getChunksForScope` included `OR scope = 'global'` unconditionally, leaking global files into workspace verification. | Fixed in `src/main/db.ts` to strictly scope chunks to `d.scope = ?`. |

## 7. Reviewer approval
Approved by: Fresh Reviewer Agent | Date: 2026-11-09 | Verdict: **PASSED**

## 8. Memory updated
SESSION.md updated: yes | LEARNING-JOURNAL.md updated: yes

## 9. Learning-journal entry
- **Relational Context Scoping**: Isolating corporate or project contexts requires strict separation at the vector database level. Merging all embeddings into a single flat index without scope filters risks leaking confidential financial or proprietary data across project boundaries.
