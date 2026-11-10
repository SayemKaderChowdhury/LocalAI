# Acceptance ledger — T06 Feature 2: Folder Upload & Differential Sync RAG

Session date: 2026-11-09 | Spec: PRD.md §2 (P1) | Ticket: TICKETS.md › T-006 | Branch / commit: main `be11c85`

Unlazy discipline: written BEFORE coding (claims table first), evidence added as produced. The implementer may not approve this ledger; a fresh reviewer signs §7.

## 1. Claims (one row per acceptance criterion)
| # | Criterion | Evidence required | Status | Evidence |
|---|---|---|---|---|
| 1 | Recursive directory scan of mixed files | Folder scan engine | done | `RagEngine.scanFolder()` recursively detects files across subdirectories (`.pdf`, `.docx`, `.txt`, `.md`, `.csv`, `.xlsx`, images). |
| 2 | Differential checksum synchronization | mtime and file size hash | done | `syncFolder()` in `src/main/rag.ts#L368` computes hashes; untouched directories report `0 added, 0 updated, 0 removed`. |
| 3 | Selective re-indexing on file edit/add | Live modification test | done | Mutating 1 file and adding 1 file resulted in exactly `1 added, 1 updated, 0 removed, 0 skipped`. |
| 4 | Relational vector storage in SQLite | SQLite tables inspection | done | Embeddings stored in `document_chunks` table linked to parent `documents` table. |
| 5 | Source-level citations in RAG answers | Citation metadata verification | done | Retrieved passages include source file path, page or section name, and text snippet. |
| 6 | Complete vector cleanup on document delete | Deletion test | done | Deleting document in `LocalDatabase.deleteDocument()` purges all associated chunks (0 orphans). |

## 2. Commands run (verbatim) and results
```text
$ npm run test:e2e (Suite 3 & 4 excerpt)
[SUITE 3] Folder Upload (10+ Mixed Files) & Differential Sync...
✓ Recursive folder scan: detected 11 files (11 supported).
✓ Indexed 11 files into SQLite vector store.
✓ Differential Sync pass 1 (untouched): Sync complete: 0 added, 0 updated, 0 removed, 0 skipped.
✓ Differential Sync pass 2 (1 modified, 1 added): Sync complete: 1 added, 1 updated, 0 removed, 0 skipped.

[SUITE 4] Document Deletion & Complete Vector Cleanup...
✓ Found 1 embeddings for 'summary.txt'. Deleting document...
✓ Document and all associated vector embeddings completely purged from SQLite.
```

## 3. State changes reviewed (CLAUDE.md rule 10)
- Ingested files: `INSERT OR REPLACE INTO documents` and `INSERT OR REPLACE INTO document_chunks`.
- Deletion: `DELETE FROM documents WHERE id = ?; DELETE FROM document_chunks WHERE document_id = ?;`.

## 4. Security notes
- File paths are validated via `path.resolve` and checked for existence.
- Hard 100 MB file size limit prevents memory exhaustion during vector generation.
- Per-file try/catch in `syncFolder` skips corrupt or unreadable files gracefully.

## 5. Not done / out of scope / known gaps
None. Full folder RAG and differential sync verified.

## 6. Critic record
| Round | Reviewer | Findings | Fixed in |
|---|---|---|---|
| 1 | CalProof Critic | Differential sync aborted entire directory scan if a single file was corrupt. | Added per-file try/catch and `skipped++` counter in `syncFolder`. |

## 7. Reviewer approval
Approved by: Fresh Reviewer Agent | Date: 2026-11-09 | Verdict: **PASSED**

## 8. Memory updated
SESSION.md updated: yes | LEARNING-JOURNAL.md updated: yes

## 9. Learning-journal entry
- **Differential Sync vs Naive Re-indexing**: Re-vectorizing an entire folder on every sync wastes CPU/GPU cycles and risks thrashing vector databases. Hashing file size and modified timestamp enables instant verification that untouched files require zero processing.
