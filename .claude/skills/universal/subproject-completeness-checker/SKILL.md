---
title: Subproject Completeness Checker
purpose: Two pre-gates (goal→phase mapping, design artifact populated) plus a 10-check score before a unit is called complete.
source-boundary: Universal process guidance only. Excludes source architecture, algorithms, design patterns, training, DPO, source domains, source classes, and source-specific paths.
status: active
---

# Subproject Completeness Checker

## Purpose
Use this to decide READY / NOT_READY for a module/feature with a repeatable score, instead of
an ad-hoc "looks done".

## When to Use
Invoke before declaring any unit (module / node-handler / React feature / RAG route) complete,
and before a phase-complete claim.

## Why this exists for mvp
mvp spreads completeness across `planning--goal-delivery-completeness`,
`planning--coverage-completeness-gate`, `planning--design-artifact-completeness`, and
`planning--flow-completeness-checker`. This is the single generalized completeness checker (any
unit, not only a FLOW) with one score format, TS-adapted.

---

## G08 universal content from llm_mvp_core — two pre-gates, then T1–T10

### Pre-Gate 1 — goal → phase mapping

Every element of the unit's goal maps to a phase AND a verification step. An unmapped goal
element is a NOT_READY, not a "we'll cover it later".

### Pre-Gate 2 — design artifact populated (not a stub)

The capability contract / design artifact has real content (inputs, outputs, failure modes,
the typed result shape) — not placeholder text. A stub design artifact fails this pre-gate.

Both pre-gates must pass before T1–T10 are even scored.

### The ten checks (mvp-adapted)

```
T1  Phase structure       : phases are ordered with explicit entry/exit.
T2  Measurable Gate-B      : each phase's gate is a count/assertion, e.g.
                             `npx jest --testPathPattern=<unit> → N passed, 0 failed`.
T3  Prerequisites          : prerequisite-chain run; no BLOCKING unmet.
T4  Typed result / no-throw : public methods return DataProcessResult<T>/Result<T>;
                              business errors are returned, not thrown.
T5  DI registration        : the @Injectable provider is registered in a `*.module.ts`
                              (`providers:`/`imports:`), not merely declared.
T6  Test categories        : unit (Jest) + integration + e2e (Playwright for UI) present.
T7  Injectable clock/time  : no hidden `Date.now()` in logic that needs deterministic tests.
T8  Compensation/cleanup    : failure paths undo partial work (LIFO where ordered).
T9  DNA / project rules    : fabric-first (no `= new ConcreteType`), tenant scope, No-Secrets.
T10 Scope                  : the unit stays within its allowed boundary; no scope leak.
```

### Score format

```
COMPLETENESS SCORE
  Pre-Gate 1 (goal→phase) : PASS / FAIL
  Pre-Gate 2 (artifact)   : PASS / FAIL
  T1..T10                 : <n>/10 passed   (list each PASS/FAIL with one-line evidence)
  Verdict                 : READY  (both pre-gates PASS and T1..T10 all PASS)
                            NOT_READY otherwise → the first FAIL is the next action.
```

Substitution bans: "at least one test" when the goal says "all"; category buckets in place of
the underlying classes; generated-artifact presence in place of an actual runtime/test
invocation; `goal_reached: true` while any row is FAIL.

### CHECK commands (mvp)

```
Gate-B   : npx jest --testPathPattern=<unit>   → N passed, 0 failed
types    : npx tsc --noEmit                      → 0 errors
DI (T5)  : grep -rn "<X>" server/src/**/*.module.ts
fabric (T9): grep -rn "= new [A-Z]" server/src   → expect 0 in non-provider code
UI (T6)  : npx playwright test <spec>            → passed  (mvp HAS a frontend)
RAG route: grep -rn "APIRouter\|@app\." rag/
```

## Avoid
- Do not score T1–T10 before both pre-gates pass.
- Do not accept "at least one" where the goal said "all/every".
- Do not call a unit READY with any FAIL row.
- Do not import source architecture, algorithms, design patterns, training, DPO, source domains,
  source classes, or source-specific paths.

## Completion Signal
- Both pre-gates PASS, T1–T10 all PASS with evidence, and the verdict is READY; otherwise the
  first FAIL row is the next action.

## Note-only (NOT ported — stays in G12, R5)
Completeness of a trainable shared unit (numeric held-out metrics, ablation, fresh-load,
continue-training) is a `llm_mvp_core` gate; here completeness covers the product unit that
*consumes* the shared model.
