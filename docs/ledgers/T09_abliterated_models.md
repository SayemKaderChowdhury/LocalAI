# Acceptance ledger — T09 Opt-In Uncensored / Abliterated Model Catalog

Session date: 2026-11-09 | Spec: PRD.md §2 (P5) | Ticket: TICKETS.md › T-009 | Branch / commit: main `be11c85`

Unlazy discipline: written BEFORE coding (claims table first), evidence added as produced. The implementer may not approve this ledger; a fresh reviewer signs §7.

## 1. Claims (one row per acceptance criterion)
| # | Criterion | Evidence required | Status | Evidence |
|---|---|---|---|---|
| 1 | Abliterated model isolation in catalog | Model catalog inspection | done | 6 uncensored models tagged with `isAbliterated: true` in `KNOWN_MODELS`. |
| 2 | Default disabled in settings | Settings default value check | done | `settings.enableAbliteratedModels` defaults to `false` in `src/main/db.ts#L695`. |
| 3 | Mandatory user responsibility modal | React component verification | done | `src/renderer/src/components/AbliteratedWarningModal.tsx` requires explicit checkbox acknowledgment before viewing or downloading. |
| 4 | Unit test verification | `npm test` assertion | done | `scripts/test-unit.js` tests that at least 5 abliterated models exist and all have `isAbliterated: true`. |

## 2. Commands run (verbatim) and results
```text
$ npm test (Abliterated test excerpt)
✓ Model catalog integrity passed (16 models verified).
✓ Abliterated model isolation passed (6 models flagged).
```

## 3. State changes reviewed (CLAUDE.md rule 10)
- Settings toggle: `INSERT OR REPLACE INTO settings (key, value) VALUES ('enableAbliteratedModels', ?)`.
- Consent acknowledgment stored locally in SQLite `colibriConsent`.

## 4. Security notes
- Prevents accidental exposure of unfiltered outputs to unsuspecting users.
- Explicit local user consent required before downloading uncensored weights.

## 5. Not done / out of scope / known gaps
None. Catalog isolation and consent verification complete.

## 6. Critic record
| Round | Reviewer | Findings | Fixed in |
|---|---|---|---|
| 1 | CalProof Critic | Ensured uncensored models cannot be pulled via API without first enabling the setting in the database. | Verified in `src/main/ipc.ts`. |

## 7. Reviewer approval
Approved by: Fresh Reviewer Agent | Date: 2026-11-09 | Verdict: **PASSED**

## 8. Memory updated
SESSION.md updated: yes | LEARNING-JOURNAL.md updated: yes

## 9. Learning-journal entry
- **Safety with User Autonomy**: Advanced users occasionally need unaligned models for security testing or creative writing. Quarantining these models behind an opt-in toggle and a responsibility disclaimer balances user freedom with safe out-of-the-box defaults.
