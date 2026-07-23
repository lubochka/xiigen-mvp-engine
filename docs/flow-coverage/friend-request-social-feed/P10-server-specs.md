# FLOW-07 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** Friend Request & Social Feed (`friend-request-social-feed`)
**Classification:** TENANT_FACING
**P9 rows total:** 18
**SERVER_REQUIRED rows without prior CF:** 11
**CF consumed:** CF-884 … CF-894
**Next available CF after this flow:** CF-895

## Edge case specs

## EC-5: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-884`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-884` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-884" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-6: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-885`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-885` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-885" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-8: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-886`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-886` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-886" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-9: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-887`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-887` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-887" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-10: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-888`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-888` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-888" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-11: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-889`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-889` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-889" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-13: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-890`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-890` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-890" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-14: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-891`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-891` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-891" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-15: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-892`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-892` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-892" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-16: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-893`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-893` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-893" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-18: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-894`

### HTTP contract

```
method: POST
path: /api/dynamic/friend-request-social-feed
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-894` — enforcement at `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
  (if file does not exist, create alongside `friend-request-social-feed-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-894" server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest friend-request-social-feed --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 11 P9 SERVER_REQUIRED rows → 11 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-884\|CF-894' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/friend-request-social-feed/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
