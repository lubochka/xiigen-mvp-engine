# FLOW-47 Test Coverage Cleanup — Phase 12

**Flow:** Module Lifecycle (`module-lifecycle`)
**Classification:** ENGINE_INTERNAL
**Status:** NEEDS_FIX — 3 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/module-lifecycle-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/module-lifecycle-mock-states.spec.ts` | 36 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/module-lifecycle/module-lifecycle.e2e.spec.ts` | 239 | 1 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=3, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest module-lifecycle --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 3 unconditional .skip()
