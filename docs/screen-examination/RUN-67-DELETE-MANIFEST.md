# RUN-67 — Invalid-PNG delete manifest

## Date: 2026-04-20 · Scope: high-confidence invalid PNGs only (Tier 1)

## Summary

**285 PNGs deleted** across 44 flow directories. All deletions are flagged
❌ invalid in `PNG-INVENTORY.md` and fall into one of 6 high-confidence
engineering-leak or CRUD-scaffold patterns.

Tier 2 (remaining ~195 `01-09-*.png` PNGs with service/event/topology-edge
names like `*-processing-step-entered-*` or `*-when-emits-*`) is deferred
— those need per-flow review to avoid false deletes.

## Patterns deleted (6 groups)

| Group | Pattern | Count | Reason |
|-------|---------|-----:|--------|
| A1 | `*/default.png` | 47 | CRUD scaffold default view — replaced by purpose-built screens |
| A2 | `*/c-03-before.png` | 23 | CRUD pre-state capture |
| A3 | `*/crud-*.png` (after-create, initial-load, list-with-test-row) | 71 | CRUD scaffold screens |
| B1 | `*/0N-(every-task-type\|every-plan-step\|no-step-imports\|no-step-creates\|all-steps-return\|focus-areas)-*.png` | 69 | BFA mock renders STEP-1-INVARIANTS.md SUCCESS_CRITERIA lines as visible UI — engineering-leak pattern (FLOW-18 / 20 / 24 / 28 / 31 / 33 / many others) |
| B2 | `*/state-*-flow-has*.png` | 9 | BFA mock renders "FLOW-XX has no documented states" text as UI |
| B3 | `*/0N-dna-N-*.png` | 18 | DNA-rule leak (2 flows × 9 DNA rules: human-interaction-gate + meta-flow-engine) |
| B4 | `*/state-N-dna-*.png` | 18 | DNA-rule duplicate of B3 with `state-` prefix |
| B5 | `*/state-N-(every\|no-step\|all-steps\|focus-areas)-*.png` | 30 | SUCCESS_CRITERIA duplicate of B1 with `state-` prefix |

## Retained (not in this delete)

- `*/state-N-<domain-state>.png` (e.g. `state-1-content-received.png`) — domain state mocks, 🟡 partial, retain until rebuild
- `c6-role-coverage/` — role-coverage evidence from RUN-47+
- `run-65-regen/` — RUN-66 post-fix verified PNGs
- `UNKNOWN/` — deferred to RUN-68 for case-by-case review
- Tier 2 `0N-<service-name>-*.png` — deferred

## Verification

```
$ git status | grep -E '^\s+deleted:' | wc -l
285
```

## Commits

- RUN-67 invalid-PNG cleanup — 285 deletions in one commit
- RUN-68 (pending) — FLOW-41..44 external-adapter directory cleanup + UNKNOWN/ relocation
- RUN-69+ (pending) — Tier 2 per-flow review for the ~195 service-name-leak PNGs

## Net fleet count after RUN-67

| Before RUN-67 | After RUN-67 | Delta |
|--------------:|-------------:|------:|
| ~980 PNGs | ~695 PNGs | −285 |
