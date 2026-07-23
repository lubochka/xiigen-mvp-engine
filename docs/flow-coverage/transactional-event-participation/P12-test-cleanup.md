# FLOW-09 Test Coverage Cleanup — Phase 12

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**Status:** NEEDS_FIX — 11 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/transactional-event-participation.spec.ts` | 234 | 11 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/transactional-event-participation/transactional-event-participation-transactional-flow.e2e.spec.ts` | 387 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/transactional-event-participation/transactional-event-participation.e2e.spec.ts` | 746 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=11, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest transactional-event-participation --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 11 unconditional .skip()
