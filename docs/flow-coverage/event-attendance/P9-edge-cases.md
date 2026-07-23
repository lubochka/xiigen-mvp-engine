# FLOW-04 Edge Cases — Phase 9 Deliverable

**Flow:** Event Attendance (`event-attendance`)
**Classification:** TENANT_FACING
**P1 states:** 9
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 9 (CRITICAL=2, HIGH=6, MEDIUM=1; SERVER_REQUIRED=8, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-04-1 rule violation: T63 RSVP creation MUST use one atomic decrementAndCreate() operation — not a separate read-check-write sequence. Separate steps create a race condition at the capacity boundary: two concurrent reads of capacity=1 → two writes → capacity=-1 (oversell). | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-04-1` |
| 2 | CF-04-2 rule violation: T64 waitlist promotion order is FIFO by joinTimestamp (MACHINE). Priority overrides require flow04_waitlist_priority_rules FREEDOM key. Hardcoded priority logic (VIP first, etc.) violates the fairness invariant and is a CF-804 violation. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-04-2` |
| 3 | Ordering constraint bypass: T66 FeedbackWindowController MUST trigger on event.ended CloudEvent — never on a timer or scheduler (CF-807). A timer fires at a pre-configured time regardless of actual event status. Timer-based feedback arrives mid-event if the event runs long. | CRITICAL | SERVER_REQUIRED | Atomic check — violation rejected with 409. BFA rule CF-04-3 blocks downstream write. | `CF-04-3` |
| 4 | Cross-tenant read/write (scope isolation violation) | CRITICAL | SERVER_REQUIRED | TenantContext from ALS; any leak fails scope_isolation arbiter. BFA rule CF-04-4 (FC-32). | `CF-04-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/event-attendance*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 8 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/event-attendance/P1-business-logic-inventory.md` (9 items)
- CF rules from `server/src/engine-contracts/event-attendance*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

