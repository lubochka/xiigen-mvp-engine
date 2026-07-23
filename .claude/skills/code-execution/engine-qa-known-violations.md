# Known Violations Registry

> **Populated during Phase 11 code modifications.**
> Each entry corresponds to a bug found while modifying the 5 engine files
> (af4-rag-context.ts, af11-feedback.ts, af2-planning.ts, quality-scorer.ts, af3-prompt-library.ts).
>
> Use the FIX template from `engine-qa/SKILL.md` for all entries.
> Use `bug-to-tests-skill` to write 3 failing tests before any fix.

## Registry

| BUG-ENGINE-NN | Class | Affected Component | Status | Fixed in Phase |
|---------------|-------|-------------------|--------|---------------|
| — | — | — | — | — |

*No entries yet. Registry populated during Phase 11.*

---

## Registry Protocol

1. **Before Phase 11 starts:** Read all 5 Phase 11 target files. Document any pre-existing violations found during read (these are pre-existing, not introduced by Phase 11).
2. **During Phase 11:** Each new bug found while modifying a file → assign BUG-ENGINE-NN, classify, write 3 failing tests, fix, verify.
3. **After Phase 11:** Registry should have entries for every bug encountered.

## Pre-Existing Violations Found During Audit

*(To be populated at Phase 11 session start — before any code changes)*

| File | Pre-existing Issue | DNA Pattern | Notes |
|------|--------------------|-------------|-------|
| af4-rag-context.ts | 9 hardcoded stubs, keyword-only skill search | DNA-2 candidate | Not a violation per se; architectural gap |
| af11-feedback.ts | Score/pass/fail only; no skill tracking | — | Missing capability, not a violation |
| af2-planning.ts | No pre-flight gate | — | Missing capability, not a violation |
| quality-scorer.ts | test_quality uses keyword check only | — | Gap in scoring logic |
| af3-prompt-library.ts | Basic template map, no archetype org | — | Architectural gap |
