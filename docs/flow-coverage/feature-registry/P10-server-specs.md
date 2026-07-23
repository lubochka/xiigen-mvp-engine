# FLOW-36 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** Feature Registry (`feature-registry`)
**Classification:** ENGINE_INTERNAL
**P9 rows total:** 22
**SERVER_REQUIRED rows without prior CF:** 15
**CF consumed:** CF-1035 … CF-1049
**Next available CF after this flow:** CF-1050

## Edge case specs

## EC-4: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1035`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1035` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1035" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-5: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1036`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1036` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1036" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-7: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1037`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1037` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1037" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-8: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1038`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-1038` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1038" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-9: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1039`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1039` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1039" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-10: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1040`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1040` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1040" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-12: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1041`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1041` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1041" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-13: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1042`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-1042` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1042" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-14: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1043`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1043` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1043" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-15: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1044`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1044` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1044" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-17: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1045`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1045` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1045" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-18: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1046`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-1046` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1046" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-19: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1047`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1047` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1047" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-20: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1048`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1048` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1048" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-22: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1049`

### HTTP contract

```
method: POST
path: /api/dynamic/feature-registry
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1049` — enforcement at `server/src/engine-contracts/feature-registry-bfa-rules.ts`
  (if file does not exist, create alongside `feature-registry-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1049" server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest feature-registry --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 15 P9 SERVER_REQUIRED rows → 15 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-1035\|CF-1049' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/feature-registry/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
