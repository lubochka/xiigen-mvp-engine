# FLOW-08 Server-Side Implementation Readiness — Phase 11

**Flow:** Marketplace (`marketplace`)
**Classification:** TENANT_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/marketplace-bfa-rules.ts`
- Existing CF rules registered: 8 (`CF-08-1`, `CF-08-2`, `CF-08-3`, `CF-08-4`, `CF-16-1`, `CF-16-2`, `CF-16-3`, `CF-16-4`)
- Test directory: `server/test/marketplace`

## New rules from Phase 10

- Count: 8
- CF range: CF-895 … CF-902
- Rules to register:
  - `CF-895` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`
  - `CF-896` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`
  - `CF-897` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`
  - `CF-898` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`
  - `CF-899` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`
  - `CF-900` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`
  - `CF-901` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`
  - `CF-902` — spec block in `docs/flow-coverage/marketplace/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/marketplace-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/marketplace/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/marketplace/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 8 P10 specs → 8 registered CF rules + 8 service enforcement blocks + 8 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/marketplace-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 8 rules specified in P10, not yet implemented. Estimated effort: 16h–32h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/marketplace-bfa-rules.ts` can be extended incrementally.

