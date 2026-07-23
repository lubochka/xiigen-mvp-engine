# FLOW-21 Test Coverage Cleanup — Phase 12

**Flow:** Dynamic Forms & Workflows (`dynamic-forms-workflows`)
**Classification:** TENANT_FACING
**Status:** NEEDS_FIX — 2 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/dynamic-forms-workflows-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/dynamic-forms-workflows-mock-states.spec.ts` | 66 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/dynamic-forms-workflows/dynamic-forms-workflows-integration.spec.ts` | 120 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/dynamic-forms-workflows/dynamic-forms-workflows-proper-flow.e2e.spec.ts` | 148 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/dynamic-forms-workflows/dynamic-forms-workflows.e2e.spec.ts` | 1070 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=2, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest dynamic-forms-workflows --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 2 unconditional .skip()
