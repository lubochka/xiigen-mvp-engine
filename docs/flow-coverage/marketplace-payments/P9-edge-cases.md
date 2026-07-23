# FLOW-16 Edge Cases — Phase 9 Deliverable

**Flow:** Marketplace Payments (`marketplace-payments`)
**Classification:** TENANT_FACING
**P1 states:** 6
**CF rules (iron-rule coverage):** 7
**Total edge cases:** 12 (CRITICAL=0, HIGH=11, MEDIUM=1; SERVER_REQUIRED=11, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-16-1 rule violation: T609 MarketplaceCheckoutGateway — BOLA ORDER 1, SETNX cart lock ORDER 2, OCC inventory (F1528/F1529/F1530) | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-16-1` |
| 2 | CF-16-2 rule violation: T610 MarketplacePaymentSplitter — SETNX idempotency, non-repudiation append-only, PII scrub, platformFeeBps FREEDOM (F1531/F1532/F1533/F1534) | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-16-2` |
| 3 | CF-16-3 rule violation: T611 MarketplaceEscrowController — LIFO compensation, dispute=updateDocument only; T612 SETNX payout + vault ref only (F1533/F1535/F1536) | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-16-3` |
| 4 | CF-16-4 rule violation: scope_isolation FC-32 across all 4 services | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-16-4` |
| 5 | CF-262 rule violation: payout freeze is synchronous | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-262` |
| 6 | CF-265 rule violation: PayoutHoldNotified is synchronous | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-265` |
| 7 | CF-268 rule violation: zero F234 imports = build failure | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-268` |
| 8 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 9 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 10 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 11 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 12 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 7 CF rules in `server/src/engine-contracts/marketplace-payments*.ts` → 7 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 11 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/marketplace-payments/P1-business-logic-inventory.md` (6 items)
- CF rules from `server/src/engine-contracts/marketplace-payments*.ts` (7 rules)
- Common edge-case library (5 generic patterns)

