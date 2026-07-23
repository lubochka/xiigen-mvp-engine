# FLOW-04 Server-Side Implementation Readiness — Phase 11

**Flow:** Event Attendance (`event-attendance`)
**Classification:** TENANT_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/event-attendance-bfa-rules.ts`
- Existing CF rules registered: 4 (`CF-04-1`, `CF-04-2`, `CF-04-3`, `CF-04-4`)
- Test directory: `server/test/event-attendance`

## New rules from Phase 10

- Count: 4
- CF range: CF-863 … CF-866
- Rules to register:
  - `CF-863` — spec block in `docs/flow-coverage/event-attendance/P10-server-specs.md`
  - `CF-864` — spec block in `docs/flow-coverage/event-attendance/P10-server-specs.md`
  - `CF-865` — spec block in `docs/flow-coverage/event-attendance/P10-server-specs.md`
  - `CF-866` — spec block in `docs/flow-coverage/event-attendance/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/event-attendance-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/event-attendance/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/event-attendance/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 4 P10 specs → 4 registered CF rules + 4 service enforcement blocks + 4 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/event-attendance-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 4 rules specified in P10, not yet implemented. Estimated effort: 8h–16h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/event-attendance-bfa-rules.ts` can be extended incrementally.

