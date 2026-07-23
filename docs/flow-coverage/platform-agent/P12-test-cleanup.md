# FLOW-46 Test Coverage Cleanup — Phase 12

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**Status:** NEEDS_FIX — 4 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/platform-agent-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/platform-agent-mock-states.spec.ts` | 150 | 0 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/platform-agent-teaching-pipeline.spec.ts` | 90 | 2 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=4, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest platform-agent --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 4 unconditional .skip()
