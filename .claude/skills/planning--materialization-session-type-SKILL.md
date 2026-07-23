---
name: materialization-session-type
version: "1.0.0"
sk_number: SK-532
priority: MANDATORY
load_order: 4
category: planning
updated: "2026-04-16"
contexts: ["web-session", "claude-code"]
---

# SK-532 Materialization Session Type — Wiring existing design, not re-designing

Many sessions start with the design already done. Treating them as PLANNING sessions produces 15-turn plans for 4-task wiring work. This skill installs MATERIALIZATION as a distinct session type with its own shape, gates, and output constraints — so wiring work gets the right plan.

## Origin

Extracted from XIIGEN-GOVERNANCE-AUTHORING-R1 (2026-04-16). v1-v27 of the User Journey Reconnection plan produced a 15-turn plan for work that the parallel instance collapsed to 4 tasks. The difference was not intelligence or effort; it was session type. The 15-turn plan was shaped like PLANNING (which assumes new design decisions); the 4-task plan was shaped like MATERIALIZATION (which assumes existing design and scopes to wiring). XIIGen's session type taxonomy in v22 did not include MATERIALIZATION. SK-532 adds it.

## When to Invoke

- At session start, when SK-531 or reconnaissance finds existing design for the work in scope
- When the user's request includes phrases like "make visible," "wire up," "connect," "make this work"
- When SK-537 reports design artifacts with PASS on checks 1-4 but FAIL on check 5 (seeded to RAG) — the design exists, wiring is what's missing
- As the default session type whenever design exists (Rule 28 in SESSION-LOAD-PLAN-v23)

One correct classification at session start = zero over-engineered plans for wiring work.

---

## Section 1 — Purpose and Failure Pattern

Session types encode expectations about the work shape. The same problem approached under different session type expectations produces different plan shapes:

- **PLANNING** assumes new design decisions to make. Plan shape: 10-15 turns, explicit decision points, arbiter rounds, gate reviews. Appropriate when design doesn't exist.
- **GENERATION** assumes new code/artifacts to produce. Plan shape: phase-by-phase implementation with tests. Appropriate when design exists but code doesn't.
- **MATERIALIZATION** (new) assumes existing design AND existing code, with wiring gaps between them and user-visible surfaces. Plan shape: 1-5 tasks, each a specific wiring change. Appropriate when the design was authored, the services were built, and nothing connects them to the user.

The v27 plan was MATERIALIZATION work classified as PLANNING. It produced new design turns for decisions that had been made months earlier. It added arbiter rounds for plan internal-consistency that was already baked into the existing design. The 15-turn shape came from the PLANNING classification, not from the work itself. The 4-task shape comes when the classification matches the actual work.

---

## Section 2 — Taxonomy Placement

XIIGen session types after v23:

| Type | Purpose |
|------|---------|
| GENERATION | Produce flow phases, service code, topology contracts (new artifacts) |
| PLANNING | Design flows, review plans (new decisions) |
| INVESTIGATION | Gap analysis, simulation, diagnosis |
| DEBUG | Specific failing test or broken command |
| QA | Validate a delivered phase against acceptance criteria |
| TRANSFORMATION | Convert static code to graph-backed architecture |
| FLOW-PLAN | Prepare AI-driven topology context packages |
| SELF-EXTENSION | Close a capability gap |
| MAINTENANCE | Fix files, update skills, create docs |
| **MATERIALIZATION (NEW)** | **Wire existing designed artifacts into user-visible surfaces** |

The distinction MATERIALIZATION draws is between "the design exists, and the code exists — we need to connect them to the user" versus "the design does not exist" (PLANNING) or "the code does not exist" (GENERATION).

---

## Section 3 — When to Classify as MATERIALIZATION

Any one of these triggers is sufficient:

### Trigger 1: Existing design artifacts referenced

Session's scope touches an artifact that already has:
- A populated `contract.json` (SK-537 Check 2 PASS)
- A populated `topology.json` (SK-537 Check 2 PASS)
- A `design-reasoning.json` with decisions recorded

If the design is in place, the session is wiring, not designing.

### Trigger 2: User language signals visibility/connection

Trigger phrases:
- "Make this visible"
- "Make this work for tenants"
- "Connect X to Y"
- "Wire up [feature]"
- "Surface [capability] to users"
- "Expose [service] through the UI"
- "Let tenants see [flow]"

These phrases point at wiring gaps, not design gaps.

### Trigger 3: Reconnaissance finds design-unsurfaced pattern

SK-537 reports `DESIGN_COMPLETE_NOT_SEEDED` or `DESIGN_COMPLETE` on the subject artifacts, AND the feature is not observable through the user-facing path. Design done, wiring missing, user can't see it.

### Trigger 4: SK-531 verified "X is designed" as TRUE

When a user claim about design completeness is VERIFIED (not DISCONFIRMED and not PARTIAL-with-design-gaps), the session's focus shifts from producing the design to surfacing it.

### Default rule

If design exists (per SK-537) AND the work touches user-facing surfaces, **default session type is MATERIALIZATION**. Overriding to PLANNING or GENERATION requires explicit written justification in STATE.mode.justification.

Rule 28 in SESSION-LOAD-PLAN-v23 installs this default routing.

---

## Section 4 — Mandatory Inputs

A MATERIALIZATION session cannot start without three pointers. Without them, the session is misclassified.

### Input 1: Design source pointer

Path(s) to the design artifact(s) the session is materializing. Examples:
- `contracts/[flow-name].contract.json`
- `contracts/topologies/[flow-name].topology.json`
- `fixtures/design-reasoning/[flow-name].design-reasoning.json`

If the path doesn't exist or SK-537 reports INCOMPLETE — restart as GENERATION (to populate the design first).

### Input 2: Target user-facing surface pointer

Path(s) to the UI component, API endpoint, or user-observable artifact the session is wiring to:
- `client/src/pages/FlowLibraryPage.tsx`
- `server/src/api/[controller].ts`
- `client/src/pages/MarketplacePage.tsx`

If the target doesn't exist — the session may be MATERIALIZATION + GENERATION combined, which is two sessions (design the new UI, then materialize).

### Input 3: Round-trip pointer (SK-533)

Which step(s) of the canonical XIIGen round-trip does this session advance? From SK-533's 8-step sequence. Example: "This session advances step 3 (master publishes to marketplace)."

Without a round-trip pointer, the session has no acceptance test — success is undefined and the work cannot be verified as delivered.

---

## Section 5 — Process Shape

MATERIALIZATION sessions follow four steps:

### Step 1 — INVENTORY

Run SK-529 reconnaissance + SK-537 artifact completeness on the subject artifacts. Produce a list:
- Artifacts present and complete (usable as inputs)
- Artifacts present but incomplete (blocking — require GENERATION work first)
- Artifacts referenced but missing (blocking)

Session cannot proceed to Step 2 until every blocking gap is either resolved or explicitly scoped out (SK-531 DEFERRED with Luba approval).

### Step 2 — IDENTIFY WIRING GAP

What specifically is between the complete design and the user-visible surface? Concrete gaps, not abstract:

- "MarketplacePackageController.publish() exists but engine-bootstrapper.ts never calls it — 0 grep hits for 'publish' in engine-bootstrapper.ts"
- "FlowLibraryPage.tsx:147 has hardcoded disabled attribute on the Fork button"
- "10 of 14 topology files have nodes:[] — they must be populated before the design is usable"

Gaps are stated in specificity-scored language per SK-530 (file:line references, N-of-M counts, verbatim excerpts).

### Step 3 — MINIMAL WIRING PLAN

1-5 tasks. Each task:
- Names specific files (1-3 files per task)
- Specifies the concrete change ("add publish() call at engine-bootstrapper.ts:214 after flow authoring completes")
- Has a verification test (usually a round-trip step from SK-533)

Task count >5 indicates hidden design work that should be separated into a GENERATION session. Gate 0f of CODE-REVIEW-PROTOCOL-v1.3 enforces this at review time.

### Step 4 — ROUND-TRIP VERIFICATION

Execute SK-533's per-step verification commands for the round-trip step(s) the session advances. Record results in STATE.roundTrip.

Session's acceptance test is not "tests pass" or "arbiters approve" — it is "the round-trip step declared at Input 3 now passes its verification command."

---

## Section 6 — Output Shape Constraint

MATERIALIZATION plans have:

| Constraint | Value |
|------------|-------|
| Task count | 1-5 (hard upper bound 5) |
| Files changed per task | 1-3 typically; 5 maximum |
| New design decisions | 0 (if >0, session is mis-classified) |
| New task types or archetypes | 0 |
| Arbiter panel rounds | 0 for plan internal review; panel executes once at the end for scope_isolation and goal_delivery only |
| Round-trip step advances | 1+ required |

If the work genuinely needs >5 tasks, decompose into multiple MATERIALIZATION sessions (one per round-trip step) or identify the GENERATION work hiding in the task list and pull it out.

Gate 0f (CODE-REVIEW-PROTOCOL-v1.3, Phase 09) rejects plans exceeding 5 tasks for MATERIALIZATION sessions.

---

## Section 7 — Integration Notes

- **SK-529 Reconnaissance Gate (load_order 0):** reconnaissance threshold for MATERIALIZATION is 20 file reads / 8 grep counts / 10 excerpts (highest tier). Wide-scope mode doubles it. MATERIALIZATION requires broad existence checks across the design + service + surface layers.

- **SK-535 Session Mode Declaration (load_order 1):** MATERIALIZATION is one of the 5 mode values. Declared explicitly in STATE.mode.declared. Mode drift from MATERIALIZATION to GENERATION (new design proposed mid-session) triggers immediate STOP per SK-535 drift detection.

- **SK-536 Goal Context Persistence (load_order 2):** the goal in MATERIALIZATION sessions typically decomposes into specific round-trip step advances. goalElements list maps to SK-533 step references.

- **SK-531 Claim-as-Hypothesis (load_order 3):** user claims about "design exists / is complete" are verified during Step 1 INVENTORY via SK-531 + SK-537. SK-531 verifies the user assertion; SK-537 verifies the artifact.

- **SK-537 Design Artifact Completeness (load_order 3):** runs against every subject artifact during Step 1 INVENTORY. SK-537's PASS/FAIL verdicts determine whether MATERIALIZATION can proceed or whether GENERATION is needed first.

- **SK-533 MVP Round-Trip Verification:** pairs with SK-532. Every MATERIALIZATION session nominates round-trip step(s) it advances and runs SK-533's per-step verification at Step 4.

- **SK-530 Specificity Calibration:** Step 2 IDENTIFY WIRING GAP output must meet MATERIALIZATION specificity threshold (10 file:line refs / 5 N-of-M counts / 5 verbatim excerpts, ≥20 total concrete references).

- **SK-534 Goal Delivery Completeness:** FIRST arbiter in the end-of-session panel. Verifies the plan's tasks map to user goal elements. For MATERIALIZATION sessions, "delivers goal" means "advances the declared round-trip step(s) to PASS."

- **SK-442 Arbiter Panel:** MATERIALIZATION sessions execute an abbreviated panel at the end: scope_isolation (FC-32) + goal_delivery (SK-534). No Business Logic / Iron Rules / Principles arbiters because no new design decisions are being made.

- **Rule 28 in SESSION-LOAD-PLAN-v23:** formalizes MATERIALIZATION as default when design exists. Phase 08 installs Rule 28.

- **Gate 0f in CODE-REVIEW-PROTOCOL-v1.3:** enforces the ≤5-task constraint at plan review time. Phase 09 installs Gate 0f.

---

## Section 8 — Worked Examples

### Example A — Correctly classified MATERIALIZATION (the parallel instance)

**User request (Luba):** "During the flow design we already produced the proper teaching sets, and the design flows. We need to make them visible to tenants."

**Classification:** MATERIALIZATION. Triggers hit: Trigger 1 (existing design), Trigger 2 ("make visible"), Trigger 3 (design unsurfaced), Trigger 4 (claim verified partial).

**Input 1 (design source):**
- `fixtures/design-reasoning/*.json` (44 files, all populated)
- `contracts/topologies/*.topology.json` (14 files, 4 populated, 10 empty — INCOMPLETE)

**Input 2 (target surface):**
- `client/src/pages/FlowLibraryPage.tsx`
- `client/src/pages/MarketplacePage.tsx` (does not exist yet — will be created)
- `server/src/api/marketplace-package.controller.ts:115` (publish endpoint)

**Input 3 (round-trip pointer):** advances steps 2, 3, 4, 5 of the 8-step canonical round-trip.

**Step 1 INVENTORY:**
- Design complete for 4 flows, INCOMPLETE for 10 flows (nodes:[])
- MarketplacePackageController.publish() exists (217 lines, line 115)
- engine-bootstrapper.ts never calls publish (grep: 0 hits)
- MarketplacePage.tsx missing
- FlowLibraryPage.tsx:147 hardcoded disabled

**Step 2 WIRING GAP identified:**
- Gap 1: 10 empty topology files block design usability for 10 flows
- Gap 2: No auto-publish call at bootstrap — step 3 of round-trip at 0%
- Gap 3: No marketplace UI — steps 4-5 not observable
- Gap 4: Fork button disabled — tenant install flow unreachable

**Step 3 MINIMAL WIRING PLAN (4 tasks):**
1. Enrich 10 empty topology files (Files: 10 × `contracts/topologies/*.topology.json`)
2. Bootstrap auto-publish (Files: `engine-bootstrapper.ts`, add call at appropriate lifecycle hook)
3. Create MarketplacePage (Files: `client/src/pages/MarketplacePage.tsx`, router entry)
4. Re-enable Fork button (Files: `FlowLibraryPage.tsx:147` remove hardcoded disabled)

**Step 4 ROUND-TRIP VERIFICATION:**
- After Task 2: curl GET /api/marketplace/packages returns packages (step 3 verified)
- After Task 3: MarketplacePage renders package list (step 4 verified)
- After Task 4: tenant B clicks Fork → install succeeds (step 5 verified)
- Remaining steps 6-8 unblocked for future sessions

**Result:** 4 tasks, concrete files, specific changes, round-trip verified. Ships.

### Example B — Misclassified PLANNING (v27, retrospective)

Same starting question. Classified as PLANNING. Produces:
- Turn 1-3: "Design decisions about marketplace architecture" (re-designs what's already in MarketplacePackageController)
- Turn 4-6: "Arbiter panel rounds for plan consistency" (plan-of-the-plan review)
- Turn 7-10: "Infrastructure decisions" (re-decides fabric choices)
- Turn 11-15: actual wiring work (buried under 10 turns of re-design)
- 22 arbiter rounds, 55 findings, 3 of 4 user goals unmapped at the end

**Root cause:** PLANNING's default shape is 10-15 turns with arbiter rounds. When applied to wiring work, it produces 10-15 turns of not-wiring work and 0-5 turns of wiring.

**What SK-532 would have enforced:**
- Step 1 INVENTORY finds existing design → Rule 28 default routes to MATERIALIZATION
- Task count constraint (≤5) triggers rejection if plan exceeds
- Gate 0f at review time rejects the 15-turn plan

---

## Section 9 — Anti-patterns

1. **"Let's treat this as PLANNING for safety — more review is better"** — more review of the wrong session type produces worse output. MATERIALIZATION plans reviewed as PLANNING plans get 10+ extra turns of design noise grafted on.

2. **"Design exists but I want to revise it while I'm here"** — design revision is GENERATION or PLANNING. If the revision is genuinely needed, that's a separate session. MATERIALIZATION sessions do not re-design.

3. **"The task list is 7 tasks but each is small"** — the constraint is 5 tasks, not 5 large tasks. Task count is a shape signal. 7 tasks means either hidden design work or the session needs decomposing.

4. **"The round-trip pointer is optional, we can skip it"** — without a round-trip pointer, success is undefined. The session produces work that "looks done" but cannot be verified as delivered. Round-trip pointer is Input 3 of 3 mandatory inputs.

5. **"MATERIALIZATION is basically EXECUTOR with extra steps"** — EXECUTOR executes a plan someone else authored. MATERIALIZATION authors its own plan (1-5 tasks) before executing. They are different shapes; conflating them loses the inventory and round-trip-verify steps that make MATERIALIZATION safe.

6. **"This design artifact is probably fine, skip the SK-537 check"** — 10 of 14 topology files "looked fine" (present on disk) and were empty. SK-537 is not skippable during Step 1 INVENTORY.

---

## Universal Bits (UUS G07) — 3 inputs, 4 steps, cap 5, zero new design (React/Playwright round-trip)

These are the universal cross-project bits this skill must carry (imported from core via the universal-skills mapping), TS-adapted for the mvp stack (NestJS + React, Jest/Playwright).

### The MATERIALIZATION contract is universal

A MATERIALIZATION session is the distinct session type for "design exists + code exists + a gap remains to the user-visible surface." Its universal contract:

- **3 mandatory inputs**: (1) design-source pointer, (2) target user-visible surface pointer, (3) round-trip-step pointer. Missing any one = misclassified, do not start.
- **4 steps**: INVENTORY → IDENTIFY GAP (with `file:line`) → MINIMAL 1–5 task plan → ROUND-TRIP verify.
- **Hard cap of 5 tasks** and **0 new design decisions**. >5 tasks or any new design = the session is mis-typed (split out the GENERATION work).

Sections 4–6 above are the mvp implementation of this contract; this is the portable statement of it.

### Target surface and round-trip mapped to the mvp stack

- **Target user-visible surface** = a React component (Vite + Tailwind) or a Playwright e2e flow — not a Windows Forms `MainForm.cs` demo screen.
- **Round-trip** = "a call passes through a NestJS endpoint and is visible in the React UI." The acceptance test is the declared round-trip step turning to PASS, not "tests pass."
- **Gap statement** uses `grep` over `client/src` / `server/src` for `file:line` evidence.

### Verification filters adapted (Jest / Playwright, not dotnet --filter)

```bash
# Per-task verification — Jest filter, not `dotnet test --filter`:
cd server && npx jest -t "marketplace publish"        # targeted server test
cd client && npx jest -t "MarketplacePage renders"    # targeted client test
npx playwright test marketplace.spec.ts               # round-trip e2e step
```

Any inherited `dotnet test --filter` in the examples becomes the Jest `-t` filter or a named Playwright spec above.

## END OF SK-532
