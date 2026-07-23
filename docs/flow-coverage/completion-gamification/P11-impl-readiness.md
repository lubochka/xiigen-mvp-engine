# FLOW-05 Server-Side Implementation Readiness — Phase 11

**Flow:** Completion Gamification (`completion-gamification`)
**Classification:** TENANT_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/completion-gamification-bfa-rules.ts`
- Existing CF rules registered: 4 (`CF-05-1`, `CF-05-2`, `CF-05-3`, `CF-05-4`)
- Test directory: `server/test/completion-gamification`

## New rules from Phase 10

- Count: 11
- CF range: CF-867 … CF-877
- Rules to register:
  - `CF-867` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-868` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-869` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-870` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-871` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-872` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-873` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-874` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-875` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-876` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`
  - `CF-877` — spec block in `docs/flow-coverage/completion-gamification/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/completion-gamification-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/completion-gamification/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/completion-gamification/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 11 P10 specs → 11 registered CF rules + 11 service enforcement blocks + 11 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/completion-gamification-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 11 rules specified in P10, not yet implemented. Estimated effort: 22h–44h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/completion-gamification-bfa-rules.ts` can be extended incrementally.

