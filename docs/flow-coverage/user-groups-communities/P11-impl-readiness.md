# FLOW-06 Server-Side Implementation Readiness — Phase 11

**Flow:** User Groups & Communities (`user-groups-communities`)
**Classification:** TENANT_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/user-groups-communities-bfa-rules.ts`
- Existing CF rules registered: 4 (`CF-06-1`, `CF-06-2`, `CF-06-3`, `CF-06-4`)
- Test directory: `server/test/user-groups-communities`

## New rules from Phase 10

- Count: 6
- CF range: CF-878 … CF-883
- Rules to register:
  - `CF-878` — spec block in `docs/flow-coverage/user-groups-communities/P10-server-specs.md`
  - `CF-879` — spec block in `docs/flow-coverage/user-groups-communities/P10-server-specs.md`
  - `CF-880` — spec block in `docs/flow-coverage/user-groups-communities/P10-server-specs.md`
  - `CF-881` — spec block in `docs/flow-coverage/user-groups-communities/P10-server-specs.md`
  - `CF-882` — spec block in `docs/flow-coverage/user-groups-communities/P10-server-specs.md`
  - `CF-883` — spec block in `docs/flow-coverage/user-groups-communities/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/user-groups-communities-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/user-groups-communities/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/user-groups-communities/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 6 P10 specs → 6 registered CF rules + 6 service enforcement blocks + 6 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/user-groups-communities-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 6 rules specified in P10, not yet implemented. Estimated effort: 12h–24h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/user-groups-communities-bfa-rules.ts` can be extended incrementally.

