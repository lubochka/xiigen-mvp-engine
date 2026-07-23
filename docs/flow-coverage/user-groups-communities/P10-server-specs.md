# FLOW-06 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING
**P9 rows total:** 11
**SERVER_REQUIRED rows without prior CF:** 6
**CF consumed:** CF-878 … CF-883
**Next available CF after this flow:** CF-884

## Edge case specs

## EC-5: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-878`

### HTTP contract

```
method: POST
path: /api/dynamic/user-groups-communities
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-878` — enforcement at `server/src/engine-contracts/user-groups-communities-bfa-rules.ts`
  (if file does not exist, create alongside `user-groups-communities-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-878" server/src/engine-contracts/user-groups-communities-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest user-groups-communities --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-6: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-879`

### HTTP contract

```
method: POST
path: /api/dynamic/user-groups-communities
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-879` — enforcement at `server/src/engine-contracts/user-groups-communities-bfa-rules.ts`
  (if file does not exist, create alongside `user-groups-communities-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-879" server/src/engine-contracts/user-groups-communities-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest user-groups-communities --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-8: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-880`

### HTTP contract

```
method: POST
path: /api/dynamic/user-groups-communities
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-880` — enforcement at `server/src/engine-contracts/user-groups-communities-bfa-rules.ts`
  (if file does not exist, create alongside `user-groups-communities-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-880" server/src/engine-contracts/user-groups-communities-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest user-groups-communities --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-9: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-881`

### HTTP contract

```
method: POST
path: /api/dynamic/user-groups-communities
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-881` — enforcement at `server/src/engine-contracts/user-groups-communities-bfa-rules.ts`
  (if file does not exist, create alongside `user-groups-communities-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-881" server/src/engine-contracts/user-groups-communities-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest user-groups-communities --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-10: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-882`

### HTTP contract

```
method: POST
path: /api/dynamic/user-groups-communities
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-882` — enforcement at `server/src/engine-contracts/user-groups-communities-bfa-rules.ts`
  (if file does not exist, create alongside `user-groups-communities-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-882" server/src/engine-contracts/user-groups-communities-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest user-groups-communities --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-11: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-883`

### HTTP contract

```
method: POST
path: /api/dynamic/user-groups-communities
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-883` — enforcement at `server/src/engine-contracts/user-groups-communities-bfa-rules.ts`
  (if file does not exist, create alongside `user-groups-communities-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-883" server/src/engine-contracts/user-groups-communities-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest user-groups-communities --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 6 P9 SERVER_REQUIRED rows → 6 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-878\|CF-883' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/user-groups-communities/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
