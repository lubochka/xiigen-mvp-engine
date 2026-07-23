# FLOW-46 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING
**P9 rows total:** 20
**SERVER_REQUIRED rows without prior CF:** 14
**CF consumed:** CF-1082 … CF-1095
**Next available CF after this flow:** CF-1096

## Edge case specs

## EC-4: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1082`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1082` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1082" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-5: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1083`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1083` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1083" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-7: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1084`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1084` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1084" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-8: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1085`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-1085` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1085" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-9: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1086`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1086` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1086" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-10: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1087`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1087` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1087" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-12: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1088`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1088` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1088" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-13: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1089`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-1089` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1089" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-14: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1090`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1090` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1090" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-15: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1091`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1091` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1091" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-17: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1092`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1092` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1092" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-18: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1093`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-1093` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1093" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-19: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1094`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1094` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1094" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-20: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1095`

### HTTP contract

```
method: POST
path: /api/dynamic/platform-agent
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1095` — enforcement at `server/src/engine-contracts/platform-agent-bfa-rules.ts`
  (if file does not exist, create alongside `platform-agent-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1095" server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest platform-agent --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 14 P9 SERVER_REQUIRED rows → 14 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-1082\|CF-1095' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/platform-agent/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
