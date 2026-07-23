# FLOW-08 Test Coverage Cleanup — Phase 12

**Flow:** Marketplace (`marketplace`)
**Classification:** TENANT_FACING
**Status:** NEEDS_FIX — 4 unconditional .skip()

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/marketplace-plugin-adapter-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/marketplace-plugin-adapter-mock-states.spec.ts` | 36 | 0 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/sharable-flows-marketplace-crud.spec.ts` | 98 | 2 | 0 | 0 | 0 | 0 |
| client/e2e | `client/e2e/sharable-flows-marketplace-mock-states.spec.ts` | 36 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/freelancer-marketplace/freelancer-marketplace-integration.spec.ts` | 123 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/freelancer-marketplace/freelancer-marketplace-proper-flow.e2e.spec.ts` | 191 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/freelancer-marketplace/freelancer-marketplace.e2e.spec.ts` | 1463 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/marketplace-payments/marketplace-payments-integration.spec.ts` | 121 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/marketplace-payments/marketplace-payments-proper-flow.e2e.spec.ts` | 177 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/marketplace-payments/marketplace-payments.e2e.spec.ts` | 1746 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/marketplace/marketplace.e2e.spec.ts` | 957 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=4, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest marketplace --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- Resolve: 4 unconditional .skip()
