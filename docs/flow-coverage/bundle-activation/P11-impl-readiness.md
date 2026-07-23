# FLOW-00 Server-Side Implementation Readiness — Phase 11

**Flow:** Bundle Activation (`bundle-activation`)
**Classification:** ENGINE_INTERNAL

## Existing CF rules

- BFA rules file: **MISSING** — P11 must create `server/src/engine-contracts/bundle-activation-bfa-rules.ts`
- Existing CF rules registered: 0 ()
- Test directory: `server/test/bundle-activation`

## New rules from Phase 10

- Count: 8
- CF range: CF-842 … CF-849
- Rules to register:
  - `CF-842` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`
  - `CF-843` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`
  - `CF-844` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`
  - `CF-845` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`
  - `CF-846` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`
  - `CF-847` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`
  - `CF-848` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`
  - `CF-849` — spec block in `docs/flow-coverage/bundle-activation/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/bundle-activation-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/bundle-activation/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/bundle-activation/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 8 P10 specs → 8 registered CF rules + 8 service enforcement blocks + 8 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/bundle-activation-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 8 rules specified in P10, not yet implemented. Estimated effort: 16h–32h depending on service complexity.
- Blocker: none. `BFA rules file` can be extended incrementally.

