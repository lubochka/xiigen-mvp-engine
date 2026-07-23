# FLOW-42 Server-Side Implementation Readiness — Phase 11

**Flow:** RAG Quality Graph (`rag-quality-graph`)
**Classification:** ENGINE_INTERNAL

## Existing CF rules

- BFA rules file: **MISSING** — P11 must create `server/src/engine-contracts/rag-quality-graph-bfa-rules.ts`
- Existing CF rules registered: 0 ()
- Test directory: **MISSING** — P11 must create `server/test/rag-quality-graph/`

## New rules from Phase 10

- Count: 4
- CF range: CF-1066 … CF-1069
- Rules to register:
  - `CF-1066` — spec block in `docs/flow-coverage/rag-quality-graph/P10-server-specs.md`
  - `CF-1067` — spec block in `docs/flow-coverage/rag-quality-graph/P10-server-specs.md`
  - `CF-1068` — spec block in `docs/flow-coverage/rag-quality-graph/P10-server-specs.md`
  - `CF-1069` — spec block in `docs/flow-coverage/rag-quality-graph/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/rag-quality-graph-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/rag-quality-graph/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/rag-quality-graph/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 4 P10 specs → 4 registered CF rules + 4 service enforcement blocks + 4 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/rag-quality-graph-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 4 rules specified in P10, not yet implemented. Estimated effort: 8h–16h depending on service complexity.
- Blocker: none. `BFA rules file` can be extended incrementally.

