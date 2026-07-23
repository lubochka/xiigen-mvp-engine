# FLOW-12 Test Coverage Cleanup — Phase 12

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING
**Status:** CLEAN

## Test file inventory

| Bucket | File | Lines | .skip | cond.skip | .todo | xit/xtest | false green |
|--------|------|------:|------:|----------:|------:|----------:|------------:|
| client/e2e | `client/e2e/subscription-billing.spec.ts` | 153 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/subscription-billing/subscription-billing-integration.spec.ts` | 254 | 0 | 0 | 0 | 0 | 0 |
| server/test | `server/test/e2e/subscription-billing/subscription-billing.e2e.spec.ts` | 935 | 0 | 0 | 0 | 0 | 0 |

## Arbiters

- **Stub free:** `.todo`=0, `.skip` (unconditional)=0, `xit`/`xtest`=0. Conditional skips (0) accepted (server-readiness gate).
- **Duplicate:** ✅ — no duplicate specs in `e2e/tests/` referencing this slug.
- **No false greens:** `expect(true).toBe(true)` = 0.
- **Test gate:** `npx jest subscription-billing --no-coverage` → failures === 0 required. Server jest baseline ≥ 10,617.

## Action items

- None — this flow's test suite passes P12 cleanup gate.
