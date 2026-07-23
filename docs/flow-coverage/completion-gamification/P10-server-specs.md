# FLOW-05 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** Completion Gamification (`completion-gamification`)
**Classification:** TENANT_FACING
**P9 rows total:** 18
**SERVER_REQUIRED rows without prior CF:** 11
**CF consumed:** CF-867 … CF-877
**Next available CF after this flow:** CF-878

## Edge case specs

## EC-5: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-867`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-867` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-867" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-6: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-868`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-868` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-868" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-8: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-869`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-869` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-869" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-9: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-870`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-870` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-870" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-10: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-871`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-871` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-871" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-11: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-872`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-872` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-872" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-13: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-873`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-873` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-873" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-14: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-874`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-874` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-874" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-15: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-875`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-875` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-875" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-16: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-876`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-876` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-876" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-18: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-877`

### HTTP contract

```
method: POST
path: /api/dynamic/completion-gamification
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-877` — enforcement at `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
  (if file does not exist, create alongside `completion-gamification-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-877" server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest completion-gamification --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 11 P9 SERVER_REQUIRED rows → 11 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-867\|CF-877' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/completion-gamification/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
