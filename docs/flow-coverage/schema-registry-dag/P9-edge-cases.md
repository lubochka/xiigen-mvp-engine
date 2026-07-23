# FLOW-11 Edge Cases — Phase 9 Deliverable

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING
**P1 states:** 16
**CF rules (iron-rule coverage):** 4
**Total edge cases:** 16 (CRITICAL=1, HIGH=13, MEDIUM=2; SERVER_REQUIRED=14, CLIENT_ONLY=2)

## Edge case matrix

| # | Edge Case | Severity | Type | Expected Outcome | CF Rule |
|--:|-----------|----------|------|------------------|---------|
| 1 | CF-11-1 rule violation: T191 DagCycleDetector MUST use three-state DFS (WHITE/GRAY/BLACK). | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-11-1` |
| 2 | CF-11-2 rule violation: T194 SchemaPublisher MUST use storeDocumentWithOCC(schema, expectedVersionPin). | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-11-2` |
| 3 | CF-11-3 rule violation: T189 SchemaRegistrationGateway: BREAKING changeType MUST route to | HIGH | SERVER_REQUIRED | Rule enforced by BFA; violation produces BUILD_FAILURE at ship time. | `CF-11-3` |
| 4 | Cross-tenant read/write (scope isolation violation) | CRITICAL | SERVER_REQUIRED | TenantContext from ALS; any leak fails scope_isolation arbiter. BFA rule CF-11-4 (FC-32). | `CF-11-4` |
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

## Arbiters

- **Iron rule coverage:** 4 CF rules in `server/src/engine-contracts/schema-registry-dag*.ts` → 4 edge case rows in this doc. ✅ PASS.
- **Severity accuracy:** CRITICAL reserved for data loss / cross-tenant / DNA-8 / ordering violations; HIGH for concurrency, rate limit, auth, timeout; MEDIUM for UX/validation polish.
- **SERVER_REQUIRED accuracy:** 14 rows need a new/updated endpoint, validator, or BFA rule. 2 rows are purely client-side.

## Inputs
- P1 states from `docs/flow-coverage/schema-registry-dag/P1-business-logic-inventory.md` (16 items)
- CF rules from `server/src/engine-contracts/schema-registry-dag*.ts` (4 rules)
- Common edge-case library (5 generic patterns)

