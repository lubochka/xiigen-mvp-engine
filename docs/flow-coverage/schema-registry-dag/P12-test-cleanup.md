# FLOW-11 Test Coverage Cleanup — Phase 12

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING
**Status:** NEEDS_FIX — 8 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/schema-registry-dag.spec.ts` | 95 | 8 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/schema-registry-dag/schema-registry-dag-integration.spec.ts` | 75 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/schema-registry-dag/schema-registry-dag-proper-flow.e2e.spec.ts` | 217 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/schema-registry-dag/schema-registry-dag.e2e.spec.ts` | 877 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=8, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest schema-registry-dag --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 8 unconditional .skip()
