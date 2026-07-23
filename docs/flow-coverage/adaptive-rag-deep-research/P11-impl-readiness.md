# FLOW-29 Server-Side Implementation Readiness — Phase 11

**Flow:** Adaptive RAG / Deep Research (`adaptive-rag-deep-research`)
**Classification:** ENGINE_INTERNAL

## Existing CF rules

- BFA rules file: **MISSING** — P11 must create `server/src/engine-contracts/adaptive-rag-deep-research-bfa-rules.ts`
- Existing CF rules registered: 0 ()
- Test directory: `server/test/adaptive-rag-deep-research`

## New rules from Phase 10

- Count: 4
- CF range: CF-1007 … CF-1010
- Rules to register:
  - `CF-1007` — spec block in `docs/flow-coverage/adaptive-rag-deep-research/P10-server-specs.md`
  - `CF-1008` — spec block in `docs/flow-coverage/adaptive-rag-deep-research/P10-server-specs.md`
  - `CF-1009` — spec block in `docs/flow-coverage/adaptive-rag-deep-research/P10-server-specs.md`
  - `CF-1010` — spec block in `docs/flow-coverage/adaptive-rag-deep-research/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/adaptive-rag-deep-research-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/adaptive-rag-deep-research/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/adaptive-rag-deep-research/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 4 P10 specs → 4 registered CF rules + 4 service enforcement blocks + 4 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/adaptive-rag-deep-research-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 4 rules specified in P10, not yet implemented. Estimated effort: 8h–16h depending on service complexity.
- Blocker: none. `BFA rules file` can be extended incrementally.

