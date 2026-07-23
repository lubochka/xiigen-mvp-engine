# FLOW-06 Test Coverage Cleanup — Phase 12

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING
**Status:** CLEAN

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| server/test | `server/test/e2e/user-groups-communities/user-groups-communities-proper-flow.e2e.spec.ts` | 491 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/user-groups-communities/user-groups-communities.e2e.spec.ts` | 779 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=0, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest user-groups-communities --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- None — this flow's test suite passes P12 cleanup gate.
