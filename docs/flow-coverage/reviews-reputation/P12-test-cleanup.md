# FLOW-10 Test Coverage Cleanup — Phase 12

**Flow:** Reviews & Reputation (`reviews-reputation`)
**Classification:** TENANT_FACING
**Status:** NEEDS_FIX — 11 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/reviews-reputation.spec.ts` | 147 | 11 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/reviews-reputation/reviews-reputation-integration.spec.ts` | 303 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/reviews-reputation/reviews-reputation-proper-flow.e2e.spec.ts` | 477 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/reviews-reputation/reviews-reputation.e2e.spec.ts` | 863 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=11, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest reviews-reputation --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 11 unconditional .skip()
