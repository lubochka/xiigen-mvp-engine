# FLOW-09 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING
**P9 rows total:** 20
**SERVER_REQUIRED rows without prior CF:** 10
**CF consumed:** CF-903 … CF-912
**Next available CF after this flow:** CF-913

## Edge case specs

## EC-8: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-903`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-903` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-903" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-9: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-904`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-904` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-904" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-11: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-905`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-905` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-905" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-12: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-906`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-906` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-906" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-13: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-907`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-907` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-907" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-14: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-908`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-908` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-908" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-16: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-909`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-909` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-909" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-17: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-910`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-910` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-910" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-18: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-911`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-911` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-911" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-19: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-912`

### HTTP contract

```
method: POST
path: /api/dynamic/transactional-event-participation
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-912` — enforcement at `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
  (if file does not exist, create alongside `transactional-event-participation-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-912" server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest transactional-event-participation --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 10 P9 SERVER_REQUIRED rows → 10 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-903\|CF-912' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/transactional-event-participation/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
