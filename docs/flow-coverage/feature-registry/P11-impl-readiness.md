# FLOW-36 Server-Side Implementation Readiness — Phase 11

**Flow:** Feature Registry (`feature-registry`)
**Classification:** ENGINE_INTERNAL

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/feature-registry-bfa-rules.ts`
- Existing CF rules registered: 3 (`CF-808`, `CF-809`, `CF-813`)
- Test directory: `server/test/feature-registry`

## New rules from Phase 10

- Count: 15
- CF range: CF-1035 … CF-1049
- Rules to register:
  - `CF-1035` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1036` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1037` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1038` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1039` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1040` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1041` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1042` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1043` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1044` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1045` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1046` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1047` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1048` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`
  - `CF-1049` — spec block in `docs/flow-coverage/feature-registry/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/feature-registry-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/feature-registry/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/feature-registry/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 15 P10 specs → 15 registered CF rules + 15 service enforcement blocks + 15 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/feature-registry-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 15 rules specified in P10, not yet implemented. Estimated effort: 30h–60h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/feature-registry-bfa-rules.ts` can be extended incrementally.

