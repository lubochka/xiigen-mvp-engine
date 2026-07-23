# FLOW-26 Server-Side Implementation Readiness — Phase 11

**Flow:** Meta Flow Engine (`meta-flow-engine`)
**Classification:** ENGINE_INTERNAL

## Existing CF rules

- BFA rules file: **MISSING** — P11 must create `server/src/engine-contracts/meta-flow-engine-bfa-rules.ts`
- Existing CF rules registered: 0 ()
- Test directory: `server/test/meta-flow-engine`

## New rules from Phase 10

- Count: 7
- CF range: CF-989 … CF-995
- Rules to register:
  - `CF-989` — spec block in `docs/flow-coverage/meta-flow-engine/P10-server-specs.md`
  - `CF-990` — spec block in `docs/flow-coverage/meta-flow-engine/P10-server-specs.md`
  - `CF-991` — spec block in `docs/flow-coverage/meta-flow-engine/P10-server-specs.md`
  - `CF-992` — spec block in `docs/flow-coverage/meta-flow-engine/P10-server-specs.md`
  - `CF-993` — spec block in `docs/flow-coverage/meta-flow-engine/P10-server-specs.md`
  - `CF-994` — spec block in `docs/flow-coverage/meta-flow-engine/P10-server-specs.md`
  - `CF-995` — spec block in `docs/flow-coverage/meta-flow-engine/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/meta-flow-engine-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/meta-flow-engine/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/meta-flow-engine/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 7 P10 specs → 7 registered CF rules + 7 service enforcement blocks + 7 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/meta-flow-engine-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 7 rules specified in P10, not yet implemented. Estimated effort: 14h–28h depending on service complexity.
- Blocker: none. `BFA rules file` can be extended incrementally.

