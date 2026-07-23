# FLOW-28 Test Coverage Cleanup — Phase 12

**Flow:** Blog/CMS Modules (`blog-cms-modules`)
**Classification:** TENANT_FACING
**Status:** NEEDS_FIX — 2 unconditional .skip(), 2 expect(true).toBe(true)

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/blog-cms-modules-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/blog-cms-modules-mock-states.spec.ts` | 36 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/blog-cms-modules/blog-cms-modules-integration.spec.ts` | 206 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/blog-cms-modules/blog-cms-modules-proper-flow.e2e.spec.ts` | 224 | 0 | 0 | 0 | 0 | 2 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=2, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 2.
- **Test gate:** `npx jest blog-cms-modules --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 2 unconditional .skip()
- Resolve: 2 expect(true).toBe(true)
