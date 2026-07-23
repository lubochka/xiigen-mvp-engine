# FLOW-24 Edge Cases — Phase 9 Deliverable

**Flow:** AI Safety & Moderation (`ai-safety-moderation`)
**Classification:** TENANT_FACING
**P1 states:** 6
**CF rules (iron-rule coverage):** 6
**Total edge cases:** 11 (CRITICAL=0, HIGH=10, MEDIUM=1; SERVER_REQUIRED=10, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-24-1 rule violation: T367 ConsentAndEnrollmentGate — CONSENT_GATE entry for ALL outcomes (GRANTED/DENIED/PENDING/WITHDRAWN) | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-24-1` |
| 2 | CF-24-2 rule violation: T368 ComposeStage/SafetyGateStage/PublishStage — saga ordering via saga log, not timestamps | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-24-2` |
| 3 | CF-24-3 rule violation: T369 QuizGradingGate — CLIENT_SCORE_REJECTED at ORDER 1, gamification async after HTTP response | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-24-3` |
| 4 | CF-24-4 rule violation: T370–T374 — Timezone from F982 profile ONLY, FREEDOM_GATED skip-not-fail, F1018 calendar fabric only | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-24-4` |
| 5 | CF-461 rule violation: Consent gate. Writes CONSENT_GATE entry for all outcomes (GRANTED/DENIED/PENDING/WITHDRAWN). Blocks T368-T374 on non-GRANTED status.', | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-461` |
| 6 | CF-465 rule violation: compose → safety gate → publish order is NON-NEGOTIABLE — score-0 if violated', | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-465` |
| 7 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 8 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 9 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 10 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 11 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 6 CF rules in `server/src/engine-contracts/ai-safety-moderation*.ts` → 6 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 10 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/ai-safety-moderation/P1-business-logic-inventory.md` (6 items)
- CF rules from `server/src/engine-contracts/ai-safety-moderation*.ts` (6 rules)
- Common edge-case library (5 generic patterns)

