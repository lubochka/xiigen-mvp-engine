# FLOW-09 Server-Side Implementation Readiness — Phase 11

**Flow:** Transactional Event Participation (`transactional-event-participation`)
**Classification:** TENANT_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts`
- Existing CF rules registered: 7 (`CF-09-1`, `CF-09-2`, `CF-09-3`, `CF-09-4`, `CF-09-5`, `CF-09-6`, `CF-09-7`)
- Test directory: `server/test/transactional-event-participation`

## New rules from Phase 10

- Count: 10
- CF range: CF-903 … CF-912
- Rules to register:
  - `CF-903` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-904` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-905` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-906` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-907` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-908` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-909` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-910` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-911` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`
  - `CF-912` — spec block in `docs/flow-coverage/transactional-event-participation/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/transactional-event-participation/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/transactional-event-participation/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 10 P10 specs → 10 registered CF rules + 10 service enforcement blocks + 10 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 10 rules specified in P10, not yet implemented. Estimated effort: 20h–40h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/transactional-event-participation-bfa-rules.ts` can be extended incrementally.

