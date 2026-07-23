# FLOW-03 Edge Cases — Phase 9 Deliverable

**Flow:** Event Management (`event-management`)
**Classification:** TENANT_FACING
**P1 states:** 10
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 10 (CRITICAL=3, HIGH=6, MEDIUM=1; SERVER_REQUIRED=9, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | DNA-8 outbox violation: EventCreated MUST be stored before emitted — storeDocument(event) before enqueue(EventCreated). Emitting before storage means the event record may not exist when downstream consumers attempt to read it. | CRITICAL | SERVER_REQUIRED | storeDocument MUST commit before enqueue. Queue consumer finds row. BFA rule CF-03-1. | `CF-03-1` |
| 2 | CF-03-2 rule violation: capacity === null means unlimited registrations (strict null check). capacity === 0 means the event is closed. Using !capacity or == null conflates the two states — capacity=0 events incorrectly accept registrations. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-03-2` |
| 3 | Ordering constraint bypass: Content safety check MUST complete and PASS before EventPromoted is emitted (IR-61-1). Safety failure → emit EventPromotionRejected (business rejection), not DataProcessResult.failure (system error). The promotion attempt was valid — it was rejected by content policy. | CRITICAL | SERVER_REQUIRED | Atomic check — violation rejected with 409. BFA rule CF-03-3 blocks downstream write. | `CF-03-3` |
| 4 | Cross-tenant read/write (scope isolation violation) | CRITICAL | SERVER_REQUIRED | TenantContext from ALS; any leak fails scope_isolation arbiter. BFA rule CF-03-4 (FC-32). | `CF-03-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |
| 10 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/event-management*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 9 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/event-management/P1-business-logic-inventory.md` (10 items)
- CF rules from `server/src/engine-contracts/event-management*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

