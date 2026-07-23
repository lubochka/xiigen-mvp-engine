# FLOW-12 Server-Side Implementation Readiness — Phase 11

**Flow:** Subscription Billing (`subscription-billing`)
**Classification:** TENANT_FACING

## Existing CF rules

- BFA rules file: `server/src/engine-contracts/subscription-billing-bfa-rules.ts`
- Existing CF rules registered: 4 (`CF-12-1`, `CF-12-2`, `CF-12-3`, `CF-12-4`)
- Test directory: **MISSING** — P11 must create `server/test/subscription-billing/`

## New rules from Phase 10

- Count: 6
- CF range: CF-929 … CF-934
- Rules to register:
  - `CF-929` — spec block in `docs/flow-coverage/subscription-billing/P10-server-specs.md`
  - `CF-930` — spec block in `docs/flow-coverage/subscription-billing/P10-server-specs.md`
  - `CF-931` — spec block in `docs/flow-coverage/subscription-billing/P10-server-specs.md`
  - `CF-932` — spec block in `docs/flow-coverage/subscription-billing/P10-server-specs.md`
  - `CF-933` — spec block in `docs/flow-coverage/subscription-billing/P10-server-specs.md`
  - `CF-934` — spec block in `docs/flow-coverage/subscription-billing/P10-server-specs.md`

## Implementation checklist (per CF)

Each new CF requires the following before P11 closes:

1. **Rule registration** — append entry to `server/src/engine-contracts/subscription-billing-bfa-rules.ts` (ruleId, flowId, type, description, violationSeverity, connectionType, knowledgeScope, tenantId=MASTER_TENANT_ID).
2. **Service enforcement** — code in `server/src/engine/flows/subscription-billing/` that triggers BFA rule at the relevant decision point. DNA-8: storeDocument BEFORE enqueue. DNA-7: idempotency check.
3. **Unit test** — `server/test/subscription-billing/` with happy path + edge + idempotency.
4. **Server baseline** — `npx jest --no-coverage` ≥ 10,617 passing, 0 failures.
5. **BFA cross-flow gate** — `npx jest bfa-validator.spec` passes with new rule included.

## Arbiters

- **Goal delivery:** 6 P10 specs → 6 registered CF rules + 6 service enforcement blocks + 6 unit tests.
- **Scope isolation:** `tenantId` read from AsyncLocalStorage — never as parameter.
- **DNA-8:** `storeDocument()` BEFORE `enqueue()` — outbox pattern.
- **CF match:** `grep -n 'CF-{N}' server/src/engine-contracts/subscription-billing-bfa-rules.ts` → ≥1 hit per new CF.
- **Test gate:** failures === 0. Server jest ≥ 10,617.

## Status

- **PENDING:** 6 rules specified in P10, not yet implemented. Estimated effort: 12h–24h depending on service complexity.
- Blocker: none. `server/src/engine-contracts/subscription-billing-bfa-rules.ts` can be extended incrementally.

