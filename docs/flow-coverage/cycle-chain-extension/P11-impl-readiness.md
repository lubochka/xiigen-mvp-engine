# FLOW-45 Server-Side Implementation Readiness — Phase 11

**Flow:** Cycle Chain Extension (`cycle-chain-extension`)
**Classification:** ENGINE_INTERNAL

## Existing CF rules

- BFA rules file: **MISSING** — P11 must create `server/src/engine-contracts/cycle-chain-extension-bfa-rules.ts`
- Existing CF rules registered: 0 ()
- Test directory: **MISSING** — P11 must create `server/test/cycle-chain-extension/`

## New rules from Phase 10

- Count: 4
- CF range: CF-1078 … CF-1081
- Rules to register:
  - `CF-1078` — spec block in `docs/flow-coverage/cycle-chain-extension/P10-server-specs.md`
  - `CF-1079` — spec block in `docs/flow-coverage/cycle-chain-extension/P10-server-specs.md`
  - `CF-1080` — spec block in `docs/flow-coverage/cycle-chain-extension/P10-server-specs.md`
  - `CF-1081` — spec block in `docs/flow-coverage/cycle-chain-extension/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/cycle-chain-extension-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/cycle-chain-extension/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/cycle-chain-extension/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 4 P10 specs → 4 registered CF rules + 4 service enforcement blocks + 4 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/cycle-chain-extension-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 4 rules specified in P10, not yet implemented. Estimated effort: 8h–16h depending on service complexity.
- Blocker: none. `BFA rules file` can be extended incrementally.

