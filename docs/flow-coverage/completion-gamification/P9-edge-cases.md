# FLOW-05 Edge Cases — Phase 9 Deliverable

**Flow:** Completion Gamification (`completion-gamification`)
**Classification:** TENANT_FACING
**P1 states:** 18
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 18 (CRITICAL=1, HIGH=14, MEDIUM=3; SERVER_REQUIRED=15, CLIENT_ONLY=3)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-05-1 rule violation: T84 PointsCalculator MUST derive points server-side from questionnaireResult.scorePercent (stored DB record). The earnedPoints field MUST NOT exist in T84 | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-05-1` |
| 2 | CF-05-2 rule violation: T96 StreakManager MUST receive userTimezoneOffset (minutes) and compute localDate = utcNow + offsetMinutes. UTC-based streak date comparison (new Date().toISOString().slice(0,10)) silently breaks streaks for learners outside UTC. userTimezoneOffset is a required contract field — absence is a BUILD_FAILURE. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-05-2` |
| 3 | CF-05-3 rule violation: T91 SocialShareDistributor MUST use @EventPattern( | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-05-3` |
| 4 | Cross-tenant read/write (scope isolation violation) | CRITICAL | SERVER_REQUIRED | TenantContext from ALS; any leak fails scope_isolation arbiter. BFA rule CF-05-4 (FC-32). | `CF-05-4` |
| 5 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 6 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 7 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 8 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 9 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |
| 10 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 11 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 12 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 13 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 14 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |
| 15 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 16 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 17 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 18 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/completion-gamification*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 15 rows need a new/updated endpoint, validator, or BFA rule. 3 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/completion-gamification/P1-business-logic-inventory.md` (18 items)
- CF rules from `server/src/engine-contracts/completion-gamification*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

