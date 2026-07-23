# FLOW-01 Edge Cases — Phase 9 Deliverable

**Flow:** User Registration and Onboarding (`user-registration`)
**Classification:** TENANT_FACING
**P1 states:** 8
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 9 (CRITICAL=3, HIGH=5, MEDIUM=1; SERVER_REQUIRED=8, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | Ordering constraint bypass: Email uniqueness MUST be checked before user record created — CF-01-1 (duplicate user prevents corrupted state) | CRITICAL | SERVER_REQUIRED | Atomic check — violation rejected with 409. BFA rule CF-01-1 blocks downstream write. | `CF-01-1` |
| 2 | Rate limit exceeded: ResendVerificationRequested rate-limited — enforcement rule is MACHINE, window duration is FREEDOM (flow01_resend_rate_limit_minutes) | HIGH | SERVER_REQUIRED | 429 after threshold; window duration from FREEDOM config. BFA rule CF-01-2 enforces. | `CF-01-2` |
| 3 | DNA-8 outbox violation: T48: storeDocument BEFORE VerificationEmailRequested emit — outbox pattern (DNA-8). Store before enqueue. | CRITICAL | SERVER_REQUIRED | storeDocument MUST commit before enqueue. Queue consumer finds row. BFA rule CF-01-3. | `CF-01-3` |
| 4 | Cross-tenant read/write (scope isolation violation) | CRITICAL | SERVER_REQUIRED | TenantContext from ALS; any leak fails scope_isolation arbiter. BFA rule CF-01-4 (FC-32). | `CF-01-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/user-registration*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 8 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/user-registration/P1-business-logic-inventory.md` (8 items)
- CF rules from `server/src/engine-contracts/user-registration*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

