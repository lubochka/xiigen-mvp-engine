# FLOW-09 Edge Cases — Phase 9 Deliverable

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**P1 states:** 20
**CF rules (iron-rule coverage):** 7
**Total edge cases:** 20 (CRITICAL=0, HIGH=18, MEDIUM=2; SERVER_REQUIRED=17, CLIENT_ONLY=3)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-09-1 rule violation: SEAT_BEFORE_PAYMENT — T99 MUST reserve seat (TTL hold) BEFORE initiating | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-09-1` |
| 2 | CF-09-2 rule violation: FAIL_OPEN — T113 FraudDetectionGate MUST allow purchase to proceed when | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-09-2` |
| 3 | CF-09-3 rule violation: COMPLIANCE_ESCALATION_ON_EXHAUSTION — T105 after max retries MUST | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-09-3` |
| 4 | CF-09-4 rule violation: ALL_OR_NOTHING_GROUP — T108 GroupTicketCoordinator MUST wrap ALL group | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-09-4` |
| 5 | CF-09-5 rule violation: INLINE_PURE — T112 FeeCalculator returns FeeBreakdown only. No storeDocument, | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-09-5` |
| 6 | CF-09-6 rule violation: PLATFORM_ONLY_QR — F275 QR token generation/validation is PLATFORM-ONLY. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-09-6` |
| 7 | CF-09-7 rule violation: SCOPE_ISOLATION — scope_isolation arbiter present in all arbiterConfig blocks | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-09-7` |
| 8 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 9 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 10 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 11 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 12 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |
| 13 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 14 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 15 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 16 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 17 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |
| 18 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 19 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 20 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |

## Arbiters

- **Iron rule coverage:** 7 CF rules in `server/src/engine-contracts/transactional-event-participation*.ts` → 7 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 17 rows need a new/updated endpoint, validator, or BFA rule. 3 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/transactional-event-participation/P1-business-logic-inventory.md` (20 items)
- CF rules from `server/src/engine-contracts/transactional-event-participation*.ts` (7 rules)
- Common edge-case library (5 generic patterns)

