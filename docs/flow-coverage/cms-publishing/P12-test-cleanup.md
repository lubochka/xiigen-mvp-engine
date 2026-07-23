# FLOW-22 Test Coverage Cleanup — Phase 12

**Flow:** CMS Publishing (`cms-publishing`)
**Classification:** TENANT_FACING
**Status:** NEEDS_FIX — 2 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/cms-publishing-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/cms-publishing-mock-states.spec.ts` | 66 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/cms-publishing/cms-publishing-integration.spec.ts` | 143 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/cms-publishing/cms-publishing.e2e.spec.ts` | 1003 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=2, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest cms-publishing --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 2 unconditional .skip()
