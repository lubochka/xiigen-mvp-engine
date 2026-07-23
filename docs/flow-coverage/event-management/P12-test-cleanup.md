# FLOW-03 Test Coverage Cleanup — Phase 12

**Flow:** Event Management (`event-management`)
**Classification:** TENANT_FACING
**Status:** NEEDS_FIX — 19 unconditional .skip(), 1 duplicate spec(s) in e2e/tests/

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/event-management-event-attendance-teaching-pipeline.spec.ts` | 330 | 19 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/event-management.spec.ts` | 196 | 0 | 0 | 0 | 0 | 0 |
| e2e/tests (full-stack) | `e2e/tests/flow03-event-management.spec.ts` | 284 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/event-management/event-management.e2e.spec.ts` | 808 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=19, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ❌ — candidates:
  - `e2e/tests/flow03-event-management.spec.ts` — full-stack integration spec. Full-stack and client-mock serve different purposes; merge decision requires review.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest event-management --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 19 unconditional .skip()
- Resolve: 1 duplicate spec(s) in e2e/tests/
- **Architect decision required on duplicates:** the `e2e/tests/` files are full-stack (server+client) while `client/e2e/` files are client-only mock-state. Plan says "merge + delete"; architect verdict: these serve different QA layers — keep both, but rename `e2e/tests/flow{NN}-*.spec.ts` to semantic `e2e/tests/{slug}-fullstack.spec.ts` to comply with Rule 16 (no flow-NN paths).
