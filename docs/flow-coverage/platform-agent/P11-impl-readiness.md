# FLOW-46 Server-Side Implementation Readiness — Phase 11

**Flow:** Platform Agent (`platform-agent`)
**Classification:** ADMIN_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/platform-agent-bfa-rules.ts`
- Existing CF rules registered: 3 (`CF-839`, `CF-840`, `CF-841`)
- Test directory: **MISSING** — P11 must create `server/test/platform-agent/`

## New rules from Phase 10

- Count: 14
- CF range: CF-1082 … CF-1095
- Rules to register:
  - `CF-1082` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1083` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1084` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1085` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1086` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1087` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1088` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1089` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1090` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1091` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1092` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1093` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1094` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`
  - `CF-1095` — spec block in `docs/flow-coverage/platform-agent/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/platform-agent-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/platform-agent/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/platform-agent/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 14 P10 specs → 14 registered CF rules + 14 service enforcement blocks + 14 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/platform-agent-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 14 rules specified in P10, not yet implemented. Estimated effort: 28h–56h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/platform-agent-bfa-rules.ts` can be extended incrementally.

