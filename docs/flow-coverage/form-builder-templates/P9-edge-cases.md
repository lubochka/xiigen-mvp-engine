# FLOW-23 Edge Cases — Phase 9 Deliverable

**Flow:** Form Builder Templates (`form-builder-templates`)
**Classification:** TENANT_FACING
**P1 states:** 6
**CF rules (iron-rule coverage):** 12
**Total edge cases:** 17 (CRITICAL=0, HIGH=16, MEDIUM=1; SERVER_REQUIRED=16, CLIENT_ONLY=1)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-23-1 rule violation: T637 JSON Schema validation ORDER 1 + required field enforcement ORDER 2 + type compatibility ORDER 3 | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-23-1` |
| 2 | CF-23-2 rule violation: T638 OCC DRAFT→PUBLISHED ORDER 1 + version immutability ORDER 2 + schema evolution check ORDER 3 | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-23-2` |
| 3 | CF-23-3 rule violation: T639 SETNX instantiation lock ORDER 1 + variable binding ORDER 2 + default merge ORDER 3 + redis.del in finally | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-23-3` |
| 4 | CF-23-4 rule violation: T640 Append-only usage metrics + PII exclusion + popularity scoring | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-23-4` |
| 5 | CF-435 rule violation: Slot schema validated against data source schema. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-435` |
| 6 | CF-448 rule violation: ALL async events MUST use this service. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-448` |
| 7 | CF-446 rule violation: Code export quality threshold. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-446` |
| 8 | CF-449 rule violation: All queue consumers must call check() before processing. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-449` |
| 9 | CF-445 rule violation: Validate constraints before solve. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-445` |
| 10 | CF-433 rule violation: No side effects. Read and compute only. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-433` |
| 11 | CF-447 rule violation: T360 must be nodes[0] in all 6 DAG templates (70–75). | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-447` |
| 12 | CF-444 rule violation: T357 must call verifyReadOnly() after entering template context. | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-444` |
| 13 | Concurrent write on same resource (two clients simultaneously) | HIGH | SERVER_REQUIRED | Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries. | — |
| 14 | Request retried 3× with same idempotency key | HIGH | SERVER_REQUIRED | First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects. | — |
| 15 | Auth token expires mid-flow | HIGH | CLIENT_ONLY | 401 response → client redirects to login, preserves in-flight form state in session storage. | — |
| 16 | Boundary value: empty / null / zero input to primary field | MEDIUM | SERVER_REQUIRED | 400 with field-level validation error; no partial write. | — |
| 17 | Timeout / partial failure from downstream fabric (DB or queue) | HIGH | SERVER_REQUIRED | DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer. | — |

## Arbiters

- **Iron rule coverage:** 12 CF rules in `server/src/engine-contracts/form-builder-templates*.ts` → 12 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 16 rows need a new/updated endpoint, validator, or BFA rule. 1 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/form-builder-templates/P1-business-logic-inventory.md` (6 items)
- CF rules from `server/src/engine-contracts/form-builder-templates*.ts` (12 rules)
- Common edge-case library (5 generic patterns)

