# FLOW-13 Server-Side Implementation Readiness — Phase 11

**Flow:** Data Warehouse & Analytics (`data-warehouse-analytics`)
**Classification:** ADMIN_FACING

## Existing CF rules

- BFA rules file: **MISSING** — P11 must create `server/src/engine-contracts/data-warehouse-analytics-bfa-rules.ts`
- Existing CF rules registered: 0 ()
- Test directory: **MISSING** — P11 must create `server/test/data-warehouse-analytics/`

## New rules from Phase 10

- Count: 5
- CF range: CF-935 … CF-939
- Rules to register:
  - `CF-935` — spec block in `docs/flow-coverage/data-warehouse-analytics/P10-server-specs.md`
  - `CF-936` — spec block in `docs/flow-coverage/data-warehouse-analytics/P10-server-specs.md`
  - `CF-937` — spec block in `docs/flow-coverage/data-warehouse-analytics/P10-server-specs.md`
  - `CF-938` — spec block in `docs/flow-coverage/data-warehouse-analytics/P10-server-specs.md`
  - `CF-939` — spec block in `docs/flow-coverage/data-warehouse-analytics/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/data-warehouse-analytics-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/data-warehouse-analytics/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/data-warehouse-analytics/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 5 P10 specs → 5 registered CF rules + 5 service enforcement blocks + 5 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/data-warehouse-analytics-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 5 rules specified in P10, not yet implemented. Estimated effort: 10h–20h depending on service complexity.
- Blocker: none. `BFA rules file` can be extended incrementally.

