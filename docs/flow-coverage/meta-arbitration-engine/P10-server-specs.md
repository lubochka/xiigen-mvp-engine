# FLOW-35 Server-Side Edge Case Specs — Phase 10 Deliverable

**Flow:** Meta Arbitration Engine (`meta-arbitration-engine`)
**Classification:** ENGINE_INTERNAL
**P9 rows total:** 5
**SERVER_REQUIRED rows without prior CF:** 4
**CF consumed:** CF-1031 … CF-1034
**Next available CF after this flow:** CF-1035

## Edge case specs

## EC-1: Concurrent write on same resource (two clients simultaneously)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1031`

### HTTP contract

```
method: POST
path: /api/dynamic/meta-arbitration-engine
headers: If-Match: <version>  (optional optimistic token)
success: 201 { id, version }  (winner)
collision: 409 { code: 'CONCURRENT_UPDATE', currentVersion }  (loser retries)
error_400: 400 { code: 'BAD_REQUEST', details }
```

### Business rule
- Optimistic concurrency — one 201, other 409 with reason='concurrent_update'. Client retries.

### BFA rule
- `CF-1031` — enforcement at `server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts`
  (if file does not exist, create alongside `meta-arbitration-engine-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Optimistic concurrency** — version token; collision returns 409.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1031" server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest meta-arbitration-engine --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-2: Request retried 3× with same idempotency key

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1032`

### HTTP contract

```
method: POST
path: /api/dynamic/meta-arbitration-engine
headers: X-Idempotency-Key: <uuid>
success: 201 { id, ...body }  (first call)
duplicate: 200 { id, ...body }  (replay, same key → cached response)
error_400: 400 { code: 'BAD_REQUEST', details: { field: reason } }
```

### Business rule
- First call 201 + stores record. Retries return 200 with cached response. No duplicate side effects.

### BFA rule
- `CF-1032` — enforcement at `server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts`
  (if file does not exist, create alongside `meta-arbitration-engine-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — idempotency key required in header. Replay returns cached result.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1032" server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest meta-arbitration-engine --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-4: Boundary value: empty / null / zero input to primary field

**Severity:** MEDIUM &nbsp;•&nbsp; **BFA rule:** `CF-1033`

### HTTP contract

```
method: POST
path: /api/dynamic/meta-arbitration-engine
success: 201 { id, ...body }
error_400: 400 { code: 'VALIDATION_FAILED', details: [{ field, reason }] }
```

### Business rule
- 400 with field-level validation error; no partial write.

### BFA rule
- `CF-1033` — enforcement at `server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts`
  (if file does not exist, create alongside `meta-arbitration-engine-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1033" server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest meta-arbitration-engine --no-coverage` → failures === 0; server jest ≥ 10,617.

## EC-5: Timeout / partial failure from downstream fabric (DB or queue)

**Severity:** HIGH &nbsp;•&nbsp; **BFA rule:** `CF-1034`

### HTTP contract

```
method: POST
path: /api/dynamic/meta-arbitration-engine
success: 201 { id, ...body }
timeout: 504 { code: 'TIMEOUT', retryAfterMs: 5000 }  (outbox row retained)
error_500: 500 { code: 'UPSTREAM_FAILURE', upstream: '<fabric>' }
```

### Business rule
- DataProcessResult.failure('TIMEOUT', …); outbox record retained; retried from queue consumer.

### BFA rule
- `CF-1034` — enforcement at `server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts`
  (if file does not exist, create alongside `meta-arbitration-engine-contracts.ts`).
- Violation severity: BUILD_FAILURE (blocks ship via BFA gate).

### Idempotency
- **Yes** — writes wrapped in outbox (DNA-8). Queue consumer deduplicates.

### Test oracle
- Concurrency/retry: fire 2 calls simultaneously → expected split (201 + error code).
- Existence: `grep -n "CF-1034" server/src/engine-contracts/meta-arbitration-engine-bfa-rules.ts` → ≥1 hit.
- Zero regression: `npx jest meta-arbitration-engine --no-coverage` → failures === 0; server jest ≥ 10,617.


## Arbiters

- **Goal delivery:** 4 P9 SERVER_REQUIRED rows → 4 spec blocks below.
- **HTTP contract:** every block declares method+path + success shape + all error shapes.
- **CF assignment:** sequential, no collision. Declared range above. Verify with `grep -n 'CF-1031\|CF-1034' server/src/engine-contracts/` → existing hits = 0 before P11.
- **No code:** behavior only. No TypeScript. No class names (until P11).

## Inputs
- P9 rows from `docs/flow-coverage/meta-arbitration-engine/P9-edge-cases.md`
- CF ceiling check: `grep -roh 'CF-[0-9]\+' server/src/engine-contracts/ | sort -u | tail`
