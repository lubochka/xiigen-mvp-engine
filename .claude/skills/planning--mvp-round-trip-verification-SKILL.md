---
name: mvp-round-trip-verification
version: "1.0.0"
sk_number: SK-533
priority: MANDATORY
load_order: 4
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-533 MVP Round-Trip Verification — The canonical acceptance test

"Tests pass" and "arbiters approve" do not answer "can the user do the thing?" For XIIGen's tenant-facing work, this skill installs the canonical round-trip — from master tenant authoring a flow through another tenant running it — as the observable acceptance test. Every session touching this surface declares which step(s) it advances.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). v27 of User Journey Reconnection had 55 arbiter findings applied and 22 review rounds passed. Zero of those findings verified that master-authored flows actually reached tenant libraries. The acceptance tests all checked intermediate states (plan internal consistency, fabric compliance, schema validity) — none checked user-observable success. SK-533 replaces abstract acceptance with a concrete 8-step sequence tied to specific API endpoints, specific indices, and specific observables.

## When to Invoke

- At any MATERIALIZATION session start (paired with SK-532)
- At session start when the work is tenant-facing
- At Step 4 of MATERIALIZATION process shape (round-trip verification)
- At plan review time — Gate 0g of CODE-REVIEW-PROTOCOL-v1.3 verifies round-trip nomination
- Whenever Luba asks "does this work end-to-end?" — run the round-trip check

Round-trip declared at session start + verified at session end = zero "shipped it, users couldn't use it" failures.

---

## Section 1 — Purpose

XIIGen's MVP promise, stated as a user-observable sequence:

> **Master tenant authors flow → tenants install it → tenants run it → result observable.**

Anything less than the full sequence is infrastructure progress that the user cannot see. Arbiters can approve infrastructure for 22 rounds without the sequence completing — and indeed did, in v27.

SK-533 installs the sequence as the canonical acceptance test. Every session nominates which step(s) of the 8-step sequence it advances. Every session runs the specific verification command for the step(s) it advanced. "Done" means "the nominated step(s) now return PASS on the verification command."

This is not a test of whether the code works. It is a test of whether the user can do the thing. For XIIGen, those are distinct properties. Code can work internally while the user sees nothing.

---

## Section 2 — The Canonical XIIGen Round-Trip

The 8 steps, with the underlying XIIGen surface each depends on:

### Step 1 — Master tenant authors flow X

**What happens:** Design simulation runs in XIIGen engine; produces contract, topology, design-reasoning, arbiters, event-schemas for flow X; artifacts saved to fixtures.

**Underlying surface:**
- `POST /api/cycle-chain/run` (design simulation endpoint)
- Writes to: `fixtures/contracts/`, `fixtures/topologies/`, `fixtures/design-reasoning/`, `fixtures/arbiters/`, `fixtures/event-schemas/`

### Step 2 — Flow X visible in master's Flow Library

**What happens:** Engine bootstrap reads fixtures and registers flow X as a global (master-tenant) flow; FlowLibraryPage renders the flow as available.

**Underlying surface:**
- `engine-bootstrapper.ts` reads fixtures at startup
- Writes to: `xiigen-flow-templates` ES index (scope: GLOBAL, tenantId: MASTER_TENANT_ID)
- `GET /api/flows/definitions?scope=global` returns flow X
- `client/src/pages/FlowLibraryPage.tsx` renders the flow card

### Step 3 — Master publishes flow X to marketplace

**What happens:** MarketplacePackageController.publish() converts the global flow into a marketplace package (versioned, immutable, tenant-copyable).

**Underlying surface:**
- `POST /api/marketplace/packages` with master tenant context
- `MarketplacePackageController.publish()` at `server/src/api/marketplace-package.controller.ts:115`
- Writes to: `xiigen-marketplace-packages` ES index

### Step 4 — Tenant B browses marketplace

**What happens:** Tenant B's client requests available marketplace packages; list renders in MarketplacePage.

**Underlying surface:**
- `GET /api/marketplace/packages`
- Reads from: `xiigen-marketplace-packages` (scope: GLOBAL — marketplace is platform-global)
- `client/src/pages/MarketplacePage.tsx` renders the package list

### Step 5 — Tenant B installs flow X

**What happens:** Install copies the package's contract + topology into tenant B's private flow library; ALS scopes the write to tenant B.

**Underlying surface:**
- `POST /api/marketplace/packages/{packageId}/install` with tenant-B context
- Writes to: `xiigen-tenant-topologies` (scope: PRIVATE, tenantId: B)

### Step 6 — Flow X visible in tenant B's Flow Library

**What happens:** Tenant B's FlowLibraryPage fetches tenant-scoped flows and renders flow X.

**Underlying surface:**
- `GET /api/flows/definitions?scope=private` with tenant-B ALS context
- Reads from: `xiigen-tenant-topologies` filtered by tenantId=B
- Same FlowLibraryPage.tsx, but querying tenant scope

### Step 7 — Tenant B runs flow X

**What happens:** Tenant B invokes the flow; CycleChain executes with tenant B scoping; all intermediate writes (spend events, arbiter verdicts, run traces) carry tenantId=B.

**Underlying surface:**
- `POST /api/cycle-chain/run` with tenant-B ALS context and flow X reference
- Uses tenant B's copy of the topology from `xiigen-tenant-topologies`
- Executes with scope isolation (FC-32 / SK-526)

### Step 8 — Result observable in tenant B's session

**What happens:** Run trace is recorded with tenant B scoping; outputs are available to tenant B via run observability endpoints; downstream effects land in tenant B's indices.

**Underlying surface:**
- `xiigen-run-traces` index has new entry (scope: PRIVATE, tenantId: B, flowId: X)
- `GET /api/run-traces/{runId}` returns the trace
- `client/src/pages/RunTracePage.tsx` or equivalent renders the result

---

## Section 2b — Generic Component Round-Trip (universal 8 steps, min = 1–6)

The tenant sequence in Section 2 is the *product-level* round-trip. Underneath it,
**every delivered component** (an AF station, fabric provider, NestJS service, React
surface) has the same universal 8-step round-trip. Use this when the work is not
tenant-facing but still must prove "the thing actually exists and is callable", not
just "tests pass". Each step has an explicit `nest build` / `jest` / import / Playwright
command — not only curl/grep narrative.

| # | Universal step | What it proves | mvp verification command (explicit) |
|---|---|---|---|
| 1 | **Authored** | the code/file exists in the repo | `ls server/src/<path>.ts` → file exists, non-zero size |
| 2 | **Visible (build)** | it compiles into the app | `cd server && npx tsc --noEmit` (or `nest build`) → 0 errors |
| 3 | **Registered** | it is wired into the NestJS module graph | `grep -rn "<Provider>\|provide:.*<IToken>" server/src/**/*.module.ts` → ≥1 hit |
| 4 | **Discoverable** | a consumer can resolve/import it | `Test.createTestingModule({...}).compile()` resolves it without "No provider for" |
| 5 | **Callable** | it runs and returns a typed result | `cd server && npx jest <spec>` → the unit test invokes it, `result.isSuccess` asserted |
| 6 | **Result-visible** | the specific output value is correct | jest asserts the path-specific field/`errorCode`, not just `isSuccess` |
| 7 | **Pipeline-complete** | it works composed in the full flow | `npx jest test/phase9-lifecycle.spec.ts` (AF chain) → the component's output flows downstream |
| 8 | **Result-observable** | the end user sees the result | Playwright e2e observes the result in React (`client/` `@playwright/test`) — **N/A for non-UI components, declared explicitly** |

### Minimum deliverable = steps 1–6 (universal rule)

> A component is **delivered** when steps **1–6** PASS: authored, builds, registered,
> discoverable, callable, and its specific result is verified. Steps **7 (pipeline)**
> and **8 (UI-observable)** may legitimately come in a later session — but only under
> the explicit **partial-protocol** below. Steps 1–6 are NOT optional: "tests pass"
> without Registered (3) + Discoverable (4) is the classic "shipped it, nobody could
> call it" failure.

### Partial-protocol (explicit, required when 7–8 are deferred)

When you deliver 1–6 but 7 and/or 8 are not yet done, you must state it as a partial,
not as "done":

```
Component round-trip (SK-533 generic):
  Steps 1–6: COMPLETE — authored / builds / registered / discoverable / callable / result-verified
  Step 7 (pipeline-complete): PENDING — <why: e.g. upstream station X not yet emitting this input>
  Step 8 (result-observable):  PENDING | N/A — <why, or "N/A: no UI surface for this component">
  Claim: "component delivered, pipeline/observability pending" — NOT "feature done"
```

Rules:
- `Step 8 = N/A` is allowed ONLY with an explicit reason (no user-visible surface).
  Silent omission of step 8 is rejected (same as the tenant block's Gate 0g rule).
- "Steps 1–6 done" ⇒ you may say **delivered**, never **done end-to-end**, until 7
  (and 8 where applicable) PASS.
- A green unit suite satisfies at most steps 5–6 for the unit; it does NOT satisfy
  3 (Registered), 4 (Discoverable), or 7 (Pipeline). Verify those separately.

---

## Section 3 — Nomination Format

Every session plan's acceptance section includes a round-trip block. Format:

```markdown
## Round-trip advancement (SK-533)

Current state of round-trip (before this session):
  Step 1 (master authors):       [COMPLETE N flows | PARTIAL | NOT_STARTED]
  Step 2 (visible in master lib): [COMPLETE N flows | PARTIAL | NOT_STARTED]
  Step 3 (published to marketplace): [COMPLETE N packages | PARTIAL | NOT_STARTED]
  Step 4 (tenant B browses):     [COMPLETE | NOT_STARTED]
  Step 5 (tenant B installs):    [COMPLETE | NOT_STARTED]
  Step 6 (visible in B's lib):   [COMPLETE | NOT_STARTED]
  Step 7 (B runs it):            [COMPLETE | NOT_STARTED]
  Step 8 (result observable):    [COMPLETE | NOT_STARTED]

This session advances: [step number(s)]

Verification after this session:
  [specific curl / grep / observation command per advanced step]
  [expected output of each command]

Round-trip steps still blocked after this session:
  [step number(s) and why]
```

Sessions that do not touch tenant-facing work can declare N/A for all 8 steps, but must explicitly declare so — silent omission of the round-trip block is rejected by Gate 0g.

Sessions that advance ZERO steps are either (a) misclassified as MATERIALIZATION (should be GENERATION/PLANNING/MAINTENANCE), or (b) produced no tenant-facing value in this session. Both cases are surfaced, not hidden.

---

## Section 4 — Per-Step Verification Commands

Each step has a reproducible verification command. Running the command post-session and receiving the expected output = step verified as advanced.

### Step 1 verification

```bash
ls fixtures/design-reasoning/[flow-name].design-reasoning.json
ls contracts/topologies/[flow-name].topology.json
# Then run SK-537 checks 1-2 on both files
```

**Expected:** both files exist, both pass SK-537 Check 2 (fields populated).

### Step 2 verification

```bash
curl -s "http://api:3000/api/flows/definitions?scope=global" \
  | jq '.flows[] | select(.name == "[flow-name]")'
```

**Expected:** JSON entry returned for flow X with non-empty topology reference.

### Step 3 verification

```bash
curl -s -X POST "http://api:3000/api/marketplace/packages" \
  -H "Authorization: Bearer [master-token]" \
  -d '{"flowName": "[flow-name]", "version": "1.0.0"}'

curl -s "http://api:3000/api/marketplace/packages" \
  | jq '.packages[] | select(.flowName == "[flow-name]")'
```

**Expected:** 201 on publish; subsequent GET returns the new package.

Also verify:
```bash
grep -rn "publish" server/src/engine/engine-bootstrapper.ts
```
**Expected:** ≥1 hit calling MarketplacePackageController.publish() (this wiring was absent in v27 codebase).

### Step 4 verification

```bash
curl -s "http://api:3000/api/marketplace/packages"
# In browser: navigate to /marketplace, verify package list renders
```

**Expected:** endpoint returns package list; UI component renders without error.

Also verify:
```bash
ls client/src/pages/MarketplacePage.tsx
```
**Expected:** file exists with non-zero size (this file was absent in v27 codebase).

### Step 5 verification

```bash
curl -s -X POST "http://api:3000/api/marketplace/packages/[packageId]/install" \
  -H "Authorization: Bearer [tenant-B-token]"
```

**Expected:** 200 response with installed flow reference.

Post-install check:
```bash
curl -s "http://elasticsearch:9200/xiigen-tenant-topologies/_search?q=tenantId:B+AND+flowName:[flow-name]"
```
**Expected:** 1 hit.

Also verify:
```bash
grep -n "disabled" client/src/pages/FlowLibraryPage.tsx
```
**Expected:** zero hits for hardcoded disabled on Fork button (v27 had hardcoded disabled at line 147).

### Step 6 verification

```bash
curl -s "http://api:3000/api/flows/definitions?scope=private" \
  -H "Authorization: Bearer [tenant-B-token]" \
  | jq '.flows[] | select(.name == "[flow-name]")'
```

**Expected:** flow X entry returned under tenant B's scope.

### Step 7 verification

```bash
curl -s -X POST "http://api:3000/api/cycle-chain/run" \
  -H "Authorization: Bearer [tenant-B-token]" \
  -d '{"flowName": "[flow-name]", "input": {...}}'
```

**Expected:** 200 response with runId.

### Step 8 verification

```bash
curl -s "http://elasticsearch:9200/xiigen-run-traces/_search?q=tenantId:B+AND+runId:[runId]"
```

**Expected:** 1 hit. Run trace has non-empty output, correlationId set, scope=PRIVATE, tenantId=B.

Also verify scope isolation (FC-32):
```bash
curl -s "http://elasticsearch:9200/xiigen-run-traces/_search?q=tenantId:A+AND+runId:[runId]"
```
**Expected:** 0 hits (tenant A should NOT see tenant B's run).

---

## Section 5 — STATE.roundTrip Schema

```json
{
  "roundTrip": {
    "definition": "XIIGen-canonical-v1",
    "currentState": {
      "step1": {
        "status": "PARTIAL",
        "completionCount": 4,
        "totalCount": 14,
        "notes": "4 flows have populated topologies; 10 flows have nodes:[]"
      },
      "step2": {
        "status": "PARTIAL",
        "completionCount": 4,
        "totalCount": 14
      },
      "step3": {
        "status": "NOT_STARTED",
        "blocker": "engine-bootstrapper.ts does not call publish()"
      },
      "step4": {
        "status": "NOT_STARTED",
        "blocker": "MarketplacePage.tsx does not exist"
      },
      "step5": {
        "status": "NOT_STARTED",
        "blocker": "FlowLibraryPage.tsx:147 Fork button hardcoded disabled"
      },
      "step6": { "status": "NOT_STARTED", "blocker": "depends on step 5" },
      "step7": { "status": "NOT_STARTED", "blocker": "depends on step 6" },
      "step8": { "status": "NOT_STARTED", "blocker": "depends on step 7" }
    },
    "thisSessionAdvances": ["step3", "step4", "step5"],
    "verificationCommands": [
      "curl GET /api/marketplace/packages -- expected: non-empty list",
      "ls client/src/pages/MarketplacePage.tsx -- expected: file exists",
      "grep -n disabled FlowLibraryPage.tsx -- expected: 0 hits for hardcoded disabled"
    ],
    "verificationResults": {
      "step3": { "command": "...", "expectedOutput": "...", "actualOutput": "...", "verdict": "PASS | FAIL" }
    },
    "stillBlockedAfterSession": ["step6", "step7", "step8"],
    "blockedReason": "Steps 6-8 require step 5 to be verified-PASS first; tenant install must work before tenant run observability is testable"
  }
}
```

---

## Section 6 — Gate Enforcement

### At session start (MATERIALIZATION sessions)

1. **round-trip pointer declared** in STATE.roundTrip.thisSessionAdvances — non-empty for tenant-facing work
2. **currentState populated** with reconnaissance-verified status for all 8 steps — not inherited from memory

### At session end (before ⛔ STOP)

1. **every advanced step has a verificationResults entry**
2. **every verificationResults entry has verdict = PASS** — if FAIL, session cannot STOP as complete, must surface the gap
3. **stillBlockedAfterSession list is complete and reasoned** — which steps remain blocked and why
4. **round-trip block is included in the session file** per SK-443 Gate D

### Gate rule for zero-advancement sessions

A session declared MATERIALIZATION that advances ZERO steps is either:
- Misclassified → reclassify as GENERATION or PLANNING
- Ran into a blocker → session output is the blocker analysis, not the intended wiring

Silent zero-advancement is rejected. Surface the zero and explain why.

---

## Section 7 — Integration Notes

- **SK-532 Materialization Session Type:** SK-533 pairs with SK-532. Every MATERIALIZATION session runs SK-533 round-trip nomination at start and verification at end. MATERIALIZATION sessions that skip SK-533 cannot verify their own success.

- **SK-529 Reconnaissance Gate:** step-state reconnaissance (counting how many flows are at each round-trip step) counts toward the reconnaissance threshold. Running the verification commands pre-session to establish currentState is reconnaissance work.

- **SK-535 Session Mode Declaration:** MATERIALIZATION mode triggers mandatory round-trip nomination. ARCHITECT, PLANNER, REVIEWER modes may nominate round-trip steps if the work is tenant-facing but are not required to.

- **SK-536 Goal Context Persistence:** user goals decompose into round-trip step advances. The "This round advances the goal by" field in the Goal Reminder Block (SK-536 Section 3) often cites specific round-trip steps.

- **SK-537 Design Artifact Completeness:** Step 1 verification uses SK-537 Checks 1-2. Step 1 PASS requires SK-537 PASS on Checks 1-2 for the flow's fixtures.

- **SK-526 Scope Isolation Arbiter:** Step 7 and Step 8 verification include scope isolation checks (tenant A does not see tenant B's run). SK-526 verdicts can surface isolation failures even when functional steps PASS.

- **SK-534 Goal Delivery Completeness Arbiter:** evaluates whether plan tasks map to round-trip step advances. The goal-to-turn mapping table often uses round-trip step references as the verification column.

- **FC-32 in SK-526:** every tenant-facing flow's arbiter panel must include scope_isolation. Step 7 and Step 8 verification indirectly check FC-32 compliance by running with tenant-B scope and verifying tenant-A cannot see results.

- **Rule 28 in SESSION-LOAD-PLAN-v23:** default MATERIALIZATION routing triggers SK-533 automatic invocation.

- **Gate 0g in CODE-REVIEW-PROTOCOL-v1.3:** Goal Delivery Completeness verification uses round-trip step references as the acceptance vocabulary. A plan advancing step 5 is verifiable; a plan "improving tenant experience" is not.

---

## Section 8 — Worked Examples

### Example A — v27 retrospective

**v27 plan's claimed acceptance:** "Plan approved after 22 arbiter rounds; 55 findings applied; APPROVED on all 8 arbiters."

**v27 plan's round-trip advancement (retrospectively applied):**
- Step 1: partial (design existed for 4 of 14 flows; 10 flows had empty topologies, design was INCOMPLETE for them — though v27 didn't know this)
- Step 2: partial (4 flows visible in master lib)
- Steps 3-8: NOT_STARTED (v27 plan did not include Bootstrap auto-publish, MarketplacePage, Fork re-enable)

**Round-trip verdict:** v27 advanced ZERO steps of the round-trip. The 22 arbiter rounds and 55 findings applied to Step 1 infrastructure (plan internal consistency about how Step 1 would eventually be wired), not to any step completion.

**What SK-533 would have surfaced:**
- At session start, currentState shows 7 of 8 steps NOT_STARTED
- thisSessionAdvances nominates no steps in v27's plan
- Gate rule: zero-advancement session is misclassified or blocker-only
- Either reclassify (the plan wasn't MATERIALIZATION at all — it was PLANNING re-design) or surface the blocker (the plan doesn't contain wiring tasks)

### Example B — The 4-task MATERIALIZATION plan

**Declared:** advances steps 3, 4, 5 of the round-trip.

**currentState at session start:**
- Step 1: PARTIAL (4/14)
- Step 2: PARTIAL (4/14)
- Steps 3-8: NOT_STARTED

**Task 1 (enrich 10 empty topologies):** advances Step 1 PARTIAL → COMPLETE (14/14).

**Task 2 (bootstrap auto-publish):** advances Step 3. Verification command:
```
grep -n publish engine-bootstrapper.ts → ≥1 hit
curl POST /api/marketplace/packages then GET → new package listed
```
Post-session verdict: PASS.

**Task 3 (MarketplacePage client):** advances Step 4. Verification command:
```
ls client/src/pages/MarketplacePage.tsx → file exists
curl GET /api/marketplace/packages from tenant-B context → returns list
```
Post-session verdict: PASS.

**Task 4 (re-enable Fork button):** advances Step 5. Verification command:
```
grep -n disabled FlowLibraryPage.tsx:147 → hardcoded disabled removed
curl POST /api/marketplace/packages/[id]/install with tenant-B context → 200
```
Post-session verdict: PASS.

**stillBlockedAfterSession:** [step6, step7, step8] — these need step 5 verified first, which this session achieved. Future sessions can advance 6-8.

**Round-trip before session:** 2 of 8 steps advanced (1, 2 partial).
**Round-trip after session:** 5 of 8 steps advanced (1 complete, 2, 3, 4, 5).

This is observable, measurable progress. Luba can verify each step independently with the stated commands. No dependence on internal plan consistency or arbiter subjectivity.

---

## Section 9 — Anti-patterns

1. **"Tests pass, so we're done"** — internal tests can pass without any round-trip step advancing. SK-533 verification is outside the test suite.

2. **"Step 3 is probably wired, skip verification"** — v27 assumed the bootstrap wiring was in place. Grep: 0 hits. Verification is not skippable on assumption.

3. **"The round-trip is a product concern, not an engineering concern"** — the round-trip IS the product; everything else is infrastructure to enable it. Engineering that ships without advancing the round-trip has produced infrastructure progress, not product progress.

4. **"We're still on Step 1 after 22 rounds"** — if 22 rounds only advance Step 1, the rounds are over-scoped. Decompose into smaller MATERIALIZATION sessions each advancing 1-3 steps.

5. **"Step verification is just running curl commands, anyone can do it"** — yes, and that's the point. If anyone can verify with curl, acceptance is objective. If verification requires interpreting arbiter verdicts, acceptance is subjective and drifts.

6. **"Zero-advancement session but valuable work done"** — surface the zero-advancement explicitly. Valuable work that doesn't advance the round-trip is valuable infrastructure; label it as such so the next session knows what's still blocked.

---

## END OF SK-533
