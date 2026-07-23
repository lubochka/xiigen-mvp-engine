# FLOW-11 Server-Side Implementation Readiness — Phase 11

**Flow:** Schema Registry DAG (`schema-registry-dag`)
**Classification:** ADMIN_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/schema-registry-dag-bfa-rules.ts`
- Existing CF rules registered: 4 (`CF-11-1`, `CF-11-2`, `CF-11-3`, `CF-11-4`)
- Test directory: **MISSING** — P11 must create `server/test/schema-registry-dag/`

## New rules from Phase 10

- Count: 10
- CF range: CF-919 … CF-928
- Rules to register:
  - `CF-919` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-920` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-921` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-922` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-923` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-924` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-925` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-926` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-927` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`
  - `CF-928` — spec block in `docs/flow-coverage/schema-registry-dag/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/schema-registry-dag-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/schema-registry-dag/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/schema-registry-dag/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 10 P10 specs → 10 registered CF rules + 10 service enforcement blocks + 10 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/schema-registry-dag-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 10 rules specified in P10, not yet implemented. Estimated effort: 20h–40h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/schema-registry-dag-bfa-rules.ts` can be extended incrementally.

