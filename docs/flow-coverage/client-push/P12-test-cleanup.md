# FLOW-40 Test Coverage Cleanup — Phase 12

**Flow:** Client Push (`client-push`)
**Classification:** ENGINE_INTERNAL
**Status:** NEEDS_FIX — 2 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/client-push-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/client-push-mock-states.spec.ts` | 36 | 0 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/client-push.spec.ts` | 65 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=2, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest client-push --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 2 unconditional .skip()
