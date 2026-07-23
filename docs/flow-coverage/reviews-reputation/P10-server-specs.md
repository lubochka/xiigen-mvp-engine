# FLOW-10 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** Reviews & Reputation (`reviews-reputation`)
**Classification:** TENANT_FACING
**P9 rows total:** 12
**SERVER_REQUIRED rows without prior CF:** 6
**CF consumed:** CF-913 … CF-918
**Next available CF after this flow:** CF-919

## Edge case specs

## EC-5: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-913`

### HTTP contract

```
method: POST
path: /api/dynamic/reviews-reputation
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-913` — enforcement at `server/src/engine-contracts/reviews-reputation-bfa-rules.ts`
  (if file does not exist, create alongside `reviews-reputation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-913" server/src/engine-contracts/reviews-reputation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest reviews-reputation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-6: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-914`

### HTTP contract

```
method: POST
path: /api/dynamic/reviews-reputation
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-914` — enforcement at `server/src/engine-contracts/reviews-reputation-bfa-rules.ts`
  (if file does not exist, create alongside `reviews-reputation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-914" server/src/engine-contracts/reviews-reputation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest reviews-reputation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-8: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-915`

### HTTP contract

```
method: POST
path: /api/dynamic/reviews-reputation
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-915` — enforcement at `server/src/engine-contracts/reviews-reputation-bfa-rules.ts`
  (if file does not exist, create alongside `reviews-reputation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-915" server/src/engine-contracts/reviews-reputation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest reviews-reputation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-9: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-916`

### HTTP contract

```
method: POST
path: /api/dynamic/reviews-reputation
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-916` — enforcement at `server/src/engine-contracts/reviews-reputation-bfa-rules.ts`
  (if file does not exist, create alongside `reviews-reputation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-916" server/src/engine-contracts/reviews-reputation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest reviews-reputation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-10: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-917`

### HTTP contract

```
method: POST
path: /api/dynamic/reviews-reputation
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-917` — enforcement at `server/src/engine-contracts/reviews-reputation-bfa-rules.ts`
  (if file does not exist, create alongside `reviews-reputation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-917" server/src/engine-contracts/reviews-reputation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest reviews-reputation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-11: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-918`

### HTTP contract

```
method: POST
path: /api/dynamic/reviews-reputation
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-918` — enforcement at `server/src/engine-contracts/reviews-reputation-bfa-rules.ts`
  (if file does not exist, create alongside `reviews-reputation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-918" server/src/engine-contracts/reviews-reputation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest reviews-reputation --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 6 P9 SERVER_REQUIRED rows → 6 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-913\|CF-918' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/reviews-reputation/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
