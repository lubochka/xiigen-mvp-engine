# FLOW-07 Server-Side Implementation Readiness — Phase 11

**Flow:** Friend Request & Social Feed (`friend-request-social-feed`)
**Classification:** TENANT_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts`
- Existing CF rules registered: 4 (`CF-07-1`, `CF-07-2`, `CF-07-3`, `CF-07-4`)
- Test directory: `server/test/friend-request-social-feed`

## New rules from Phase 10

- Count: 11
- CF range: CF-884 … CF-894
- Rules to register:
  - `CF-884` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-885` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-886` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-887` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-888` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-889` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-890` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-891` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-892` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-893` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`
  - `CF-894` — spec block in `docs/flow-coverage/friend-request-social-feed/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/friend-request-social-feed/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/friend-request-social-feed/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 11 P10 specs → 11 registered CF rules + 11 service enforcement blocks + 11 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 11 rules specified in P10, not yet implemented. Estimated effort: 22h–44h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/friend-request-social-feed-bfa-rules.ts` can be extended incrementally.

