# FLOW-19 Server-Side Implementation Readiness — Phase 11

**Flow:** Durable Sagas & Compliance (`durable-sagas-compliance`)
**Classification:** ADMIN_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/durable-sagas-compliance-bfa-rules.ts`
- Existing CF rules registered: 4 (`CF-19-1`, `CF-19-2`, `CF-19-3`, `CF-19-4`)
- Test directory: **MISSING** — P11 must create `server/test/durable-sagas-compliance/`

## New rules from Phase 10

- Count: 4
- CF range: CF-961 … CF-964
- Rules to register:
  - `CF-961` — spec block in `docs/flow-coverage/durable-sagas-compliance/P10-server-specs.md`
  - `CF-962` — spec block in `docs/flow-coverage/durable-sagas-compliance/P10-server-specs.md`
  - `CF-963` — spec block in `docs/flow-coverage/durable-sagas-compliance/P10-server-specs.md`
  - `CF-964` — spec block in `docs/flow-coverage/durable-sagas-compliance/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/durable-sagas-compliance-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/durable-sagas-compliance/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/durable-sagas-compliance/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 4 P10 specs → 4 registered CF rules + 4 service enforcement blocks + 4 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/durable-sagas-compliance-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 4 rules specified in P10, not yet implemented. Estimated effort: 8h–16h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/durable-sagas-compliance-bfa-rules.ts` can be extended incrementally.

