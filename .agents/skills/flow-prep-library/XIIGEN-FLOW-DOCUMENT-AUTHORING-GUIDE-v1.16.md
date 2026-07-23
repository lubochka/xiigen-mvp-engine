# XIIGEN FLOW DOCUMENT AUTHORING GUIDE — v1.16
## How to prepare Design Simulation, Teach-QA, and Implementation Plan files
## Date: 2026-04-20
## Supersedes: v1.15 (UI/UX compliance integration) and all prior versions

---

## WHAT CHANGED IN v1.16 (screen intent anchor)

Three classes of change. All additive. No existing rules removed.

**Q8 — Screen intent gate** (new, §SECTION 3 below): the Session Start
Checklist gains an eighth question that fires when the session will produce
React pages. Q8 enforces that WHO, VERB, and GRAMMAR are declared before the
first line of JSX. The examination record at
`docs/screen-examination/{slug}-examination.md` is checked first — 38 flows
already have this ground truth pre-populated. If the record is absent, the
question routes to F1 (STEP-1-INVARIANTS) and F3 (ROLE-ANALYSIS-BATCH) for
derivation. Q8 answers the Vocabulary B question ("who opens this screen and
what do they want?") before Vocabulary A ("can they access it and is the route
correct?") is checked in Phase 7.

**SCREEN INTENT SERVED** — new completion gate item (§SECTION 11 below):
added after FC-18 UI/UX COMPLIANCE. Verifies Q8 was answered before JSX was
written; page primary content matches declared VERB; page implements declared
GRAMMAR type (G1–G7); PNG shows the populated operating state (not
empty/error). A page that passes FC-18 but whose primary content does not
match the user's job-to-be-done fails this item.

**Rule 35 — Screen Intent Anchor** (new §18 below): every React page produced
in a XIIGen session must be anchored to the flow's `user_intent` sentence from
`FLOW-XX-STEP-1-INVARIANTS.md`, or to the "One-sentence spec" in the flow's
examination record where one exists. Enforces Q8 at authoring time, the same
way Rule 34 enforces Phase 7 at authoring time. The two rules are sequential:
Rule 35 before JSX, Rule 34 after pages are built.

---

## WHAT CHANGED IN v1.15 (UI/UX compliance integration)

This version integrates SK-539 (UI/UX Compliance) and FC-18 into the authoring
lifecycle. Four classes of change:

**Phase 7 — UI/UX Compliance Phase** (new, §PHASE 7 below): every flow
implementation session that produces React pages now runs a seventh phase that
verifies the 31 SK-539 checks and produces an FC-18 Audit Trail per page.
Phase 7 runs after Phase 6 (Topology Visual QA) and before the final ⛔ STOP.

**React Pages Starter Template Library** (new, §REACT-PAGES-STARTER-TEMPLATES
below): seven reusable screen templates (T-1..T-7) that pre-satisfy FC-18
checks for common patterns across XIIGen flows. Sessions that match a template
pattern must use it.

**General Rule 32 extended — UX review loop after PNG capture**: the existing
Playwright PNG rule (Rule 32) gains a mandatory sub-step: after PNGs are
captured, run a UX review pass against the captured PNGs before the phase is
closed. The review checks for the six most common FC-18 failure modes (FM-1
through FM-6 in the FC-18 gate document v1.1.0).

**Completion Gate (SECTION 11) updated**: one new check item added (FC-18
UI/UX COMPLIANCE) after the existing VISUAL PROOF item.

No existing rules were removed. v1.15 is strictly additive on v1.14.

---

## WHAT CHANGED IN v1.14 (session-derived habits + deliverable rules)

Three classes of change: Catalog refresh (Rule 30) · Three new General Rules
(31 JSON+MD pairing, 32 Playwright PNG, 33 Topology disambiguation) ·
Session Start Checklist Q7 added · Completion Gate four new items.

---

## MASTER NAMING TABLE

One slug per flow. `{SLUG_UPPER}` = slug with hyphens→underscores, uppercased.

| Flow | Slug | {SLUG_UPPER} |
|------|------|--------------|
| FLOW-01 | `user-registration` | `USER_REGISTRATION` |
| FLOW-02 | `profile-enrichment` | `PROFILE_ENRICHMENT` |
| FLOW-03 | `event-management` | `EVENT_MANAGEMENT` |
| FLOW-04 | `event-attendance` | `EVENT_ATTENDANCE` |
| FLOW-05 | `completion-gamification` | `COMPLETION_GAMIFICATION` |
| FLOW-06 | `user-groups-communities` | `USER_GROUPS_COMMUNITIES` |
| FLOW-07 | `friend-request-social-feed` | `FRIEND_REQUEST_SOCIAL_FEED` |
| FLOW-08 | `marketplace` | `MARKETPLACE` |
| FLOW-09 | `transactional-event-participation` | `TRANSACTIONAL_EVENT_PARTICIPATION` |
| FLOW-10 | `reviews-reputation` | `REVIEWS_REPUTATION` |
| FLOW-11 | `schema-registry-dag` | `SCHEMA_REGISTRY_DAG` |
| FLOW-12 | `subscription-billing` | `SUBSCRIPTION_BILLING` |
| FLOW-13 | `data-warehouse-analytics` | `DATA_WAREHOUSE_ANALYTICS` |
| FLOW-14 | `etl-data-integration` | `ETL_DATA_INTEGRATION` |
| FLOW-15 | `saas-multi-tenancy` | `SAAS_MULTI_TENANCY` |
| FLOW-16 | `marketplace-payments` | `MARKETPLACE_PAYMENTS` |
| FLOW-17 | `freelancer-marketplace` | `FREELANCER_MARKETPLACE` |
| FLOW-18 | `visual-flow-engine` | `VISUAL_FLOW_ENGINE` |
| FLOW-19 | `durable-sagas-compliance` | `DURABLE_SAGAS_COMPLIANCE` |
| FLOW-20 | `ads-platform` | `ADS_PLATFORM` |
| FLOW-21 | `dynamic-forms-workflows` | `DYNAMIC_FORMS_WORKFLOWS` |
| FLOW-22 | `cms-publishing` | `CMS_PUBLISHING` |
| FLOW-23 | `form-builder-templates` | `FORM_BUILDER_TEMPLATES` |
| FLOW-24 | `ai-safety-moderation` | `AI_SAFETY_MODERATION` |

---

## OVERVIEW — THREE DOCUMENT TYPES, ONE PIPELINE

Every XIIGen flow produces exactly three documents, in this order:

```
┌─────────────────────────────────────────────────────────────────────────┐
│ DOCUMENT 1                                                              │
│ FLOW-XX-DESIGN-SIMULATION-Rx.md                                        │
│ Written by: Design co-architect (Claude.ai)                            │
│ Purpose: The complete design — nodes, arbiters, five dimensions,        │
│          depth ladder, training corpus. Authoritative source.           │
│          Nothing downstream can contradict it.                          │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │ feeds
┌───────────────────────────▼─────────────────────────────────────────────┐
│ DOCUMENT 2                                                              │
│ FLOW-XX-TEACH-QA-R0.md                                                 │
│ Written by: Design co-architect (Claude.ai)                            │
│ Consumed by: Claude Code                                               │
│ Purpose: Teaching pipeline — fixtures, contracts, seed script,          │
│          proper-flow tests, topology visual QA.                         │
└───────────────────────────┬─────────────────────────────────────────────┘
                            │ feeds
┌───────────────────────────▼─────────────────────────────────────────────┐
│ DOCUMENT 3                                                              │
│ FLOW-XX-YY-IMPLEMENTATION-PLAN-vN.md                                   │
│ Written by: Design co-architect (Claude.ai)                            │
│ Consumed by: Claude Code                                               │
│ Purpose: End-to-end execution — corpus seeding, service                 │
│          implementation, tests, React pages, TEACH-QA execution.        │
└─────────────────────────────────────────────────────────────────────────┘
```

**Production order is MANDATORY.** Design simulation must be complete
(including R2 gap corrections) before TEACH-QA is written. TEACH-QA must be
complete before it is referenced in the implementation plan.

---

# DOCUMENT 1 — FLOW-XX-DESIGN-SIMULATION-Rx.md

## File naming

```
First complete version:   FLOW-03-DESIGN-SIMULATION-R1.md
Gap-correction addendum:  FLOW-03-DESIGN-SIMULATION-R2.md
Additional rounds:        FLOW-03-DESIGN-SIMULATION-R3.md (if needed)
```

R1 = full design from scratch.
R2 = gap corrections from design review. **Appends** to R1 — never replaces sections.

## File header

```markdown
# FLOW-XX — COMPLETE DESIGN SIMULATION
## [Flow human name]
## Prompts + Context + Connections + Arbiters + Positive/Negative Examples
## Simulated by: XIIGen design co-architect mode
## Date: YYYY-MM-DD
```

For R2+:
```markdown
# FLOW-XX — DESIGN SIMULATION R2
## Fixes for all N gaps identified in design review
## Appends to: FLOW-XX-DESIGN-SIMULATION-R1.md
## Date: YYYY-MM-DD
```

---

## SECTION 1 — INVENTORY CHECK (R1 only)

List every prior-flow document read before this session. ✅ checkmarks required.
Proves no prior pattern is re-derived.

---

## SECTION 2 — WHAT THIS FLOW INHERITS

Every pattern from prior flows that applies here. Never re-derived.

**Rule:** Every inherited pattern must name the specific node or scenario in column 2.

---

## SECTION 3 — SESSION START CHECKLIST

**Step 0 — Validate plan-state against engine contracts before answering Q0:**

```bash
grep -i "taskTypeId\|T[0-9][0-9]\|task_range" \
  server/src/engine-contracts/{slug}-contracts.ts | head -10

cat docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('Plan state task range:', d.get('task_range') or d.get('taskRange'))
print('Plan state flow name:', d.get('flow_name') or d.get('flowName'))
"
# If they disagree → the contracts file is authoritative.
```

Answer ALL eight questions before Round 1 output begins.

```markdown
## SESSION START CHECKLIST

`Q0: User asked for — "[verbatim or paraphrased user intent]"

Q1: Accomplishes — [the end state this flow creates — NOT a list of steps]
    [Who becomes what? What exists in the system that did not before?]
    [Synchronous vs asynchronous boundary]

Q2: 3–5 concerns that collapse in naive designs:
    (a) [First concern — usually the synchronous gate]
    (b) [Second concern — async heavy operation]
    (c) [Third concern — async fanout]
    (d) [Fourth concern if present]
    (e) [Fifth concern if present]

Q3: Completion event — [EventName] (named NOW)
    Named before any node expansion begins.
    [EventName] fires when: [exact gate condition — which nodes complete]

Q4: Downstream minimum payload:
    { tenantId, [entityId], [actorId], [completedAt],
      [flow-specific-fields FLOW-XX+1 and FLOW-XX+2 will need] }

Q5: Session type — DESIGN

Q6: Architect Habits catalog loaded — [yes/no]
    □ planning--architect-behavior-classifier-SKILL.md read at session start
    □ The three habits that matter most: running-to-keyboard [N-A1];
      deferring-in-scope [N-A2]; inherited-verdicts [N-A8]
    □ Every claim carried from a prior session re-verified

Q7: Inputs absorbed before writing — [yes/no]
    □ Every uploaded document, attachment, or long quoted content read in full
    □ Paraphrase of what was read appears before first structural decision

Q8: Screen intent — [skip entirely if this session produces NO React pages]
    Step 0: Check examination record
      cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -20
      Present → extract WHO/VERB/GRAMMAR directly from record. Skip to GRAMMAR declaration.
      Absent  → proceed to WHO/VERB/GRAMMAR sources below.
    WHO:     [Role from docs/design-reviews/ROLE-ANALYSIS-BATCH-NN.md —
              context, trigger moment, what they do before and after this page]
             Batch map: FLOW-01..05=BATCH-01, 06..10=BATCH-02, 11..16=BATCH-03,
                        17..21=BATCH-04, 22..26=BATCH-05, 27..31=BATCH-06,
                        32..34=BATCH-07, 35..47=BATCH-08+
    VERB:    [One action from user_intent in docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md]
             Not "use the page" — the specific task: "approve or defer the porting decision"
    GRAMMAR: [G1 PROGRESS_STRIP · G2 VERDICT_GRID · G3 CARD_LIST ·
              G4 TOPOLOGY_CANVAS · G5 KIOSK · G6 DASHBOARD · G7 SETTINGS_TABS]
             From: examination record (highest authority where present) →
                   planning--business-flows-registry.md →
                   docs/design-context/{slug}/.impeccable.md (if SK-540 already ran)
    If WHO, VERB, GRAMMAR cannot all be answered: do not write JSX.
    CFI-12 halt (FLOW-04/09/34): if F1 contradicts slug/pages, halt and report.`
```

**Q8 installs Vocabulary B (product design: who opens this screen and what do
they want?) before Vocabulary A (access control: role tier, route prefix) is
checked in Phase 7.** Examination record first — 38 flows have this ground
truth pre-populated.

---

## SECTION 4 — PRE-DESIGN STEP TABLE (SILENT_FAILURE CHECKS)

Run before Round 1. Identify 3–5 paths that produce no local error but
silently corrupt the system if the design gets them wrong.

---

## SECTION 5 — ROUND 1: TOP-LEVEL FLOW

Identify the top-level nodes. Name the completion event here. Identify which
nodes are time-decoupled and why.

---

## SECTION 5B — INLINE_ONLY SERVICE TYPE

When a node is called synchronously by another service (no queue consumer).

---

## SECTION 6 — ROUND 2: SUBFLOW EXPANSIONS

When NODE A or similar requires multi-step implementation.

---

## SECTION 7 — FOUR DIMENSIONS PER LEAF NODE

**Every LEAF node must have all four sections. No shortcuts.**

Dimensions: PROMPT → CONNECTIONS → ARBITERS → EXAMPLES.

---

## SECTION 8 — DESIGN_REASONING TRIPLES

Design-simulation and fixture formats as specified in v1.15.

---

## SECTION 9 — NEW RAG PATTERNS

Design-simulation and fixture formats as specified in v1.15.

---

## SECTION 10 — TRAINING CORPUS SUMMARY

Format as specified in v1.15.

---

## SECTION 11 — COMPLETION GATE (R1)

```markdown
## COMPLETION GATE

`☑ Session start checklist: Q0-Q8 answered before Round 1
   (Q8 skipped with declaration if session produces no React pages)
☑ Pre-design step table: [N] SILENT_FAILUREs identified and fixed before writing
☑ Completion event named in Round 1: [EventName]
☑ [Time-decoupled process] established in Round 1 — before any expansion
☑ All [N] nodes: four dimensions complete (PROMPT / CONNECTIONS / ARBITERS / EXAMPLES)
☑ "What could go wrong" placed in arbiters or subflows — not in notes
☑ UPSTREAM_CONTEXT: exact trigger events named for every node after the first
☑ PASS conditions explicit in every IronRules arbiter
☑ scope_isolation arbiter on every node with stored records
☑ applies_to: all [N] DR triples list ≥ 2 future flows
☑ Corpus: [N] code triples / [N] DR triples / [N] RAG patterns / [N] graph edges
☑ Inheritance documented: [N] patterns from prior flows, none re-derived
☑ ARCHITECT HABITS DISCIPLINE (General Rule 30):
  - No deferred-to-separate-session labels on goal-decomposing items [N-A2]
  - Every cited file:line has a grep/find/ls result in recon log [N-A5]
  - Every inherited verdict re-run with originating command [N-A8]
☑ DELIVERABLE SHAPE MATCHES OUTPUT CONTRACT (Rule 30 + N-A10):
  - Re-read output contract verbatim; confirm shape matches element-by-element
☑ JSON+MD DELIVERABLE PAIRING (General Rule 31):
  - Every JSON/NDJSON/CSV artifact has a Markdown companion in same directory
☑ VISUAL PROOF FOR FEATURE-COMPLETION CLAIMS (General Rule 32):
  - Every "done" claim for tenant-visible feature cites a Playwright PNG path
☑ FC-18 UI/UX COMPLIANCE (General Rule 34 — SK-539 Phase 7):
  - FC-18 Audit Trail at docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md for every page
  - Audit Trail: APPROVED or CONCERN verdict per page; no unclosed BLOCK
  - Grammar type declared (G1–G7) for every TENANT_CONSUMER or PUBLIC page
  - .impeccable.md exists at docs/design-context/{slug}/ for every flow producing pages
  - SK-541 AUDIT record attached to every Audit Trail
  - Screen template declared (T-1..T-7) or deviation documented
  - If FLOW-20/21/28/48: corresponding missing page created
☑ SCREEN INTENT SERVED (new v1.16 — General Rule 35):
  - Q8 was answered before JSX was written (WHO/VERB/GRAMMAR declared)
  - If examination record existed: it was read before JSX was written
  - Page <h1> derives from user_intent or examination record spec sentence
  - Page primary content matches declared VERB — user can accomplish VERB
    on this page without administrative knowledge of the engine
  - Page implements declared GRAMMAR type (G1–G7). CRUD table on
    TENANT_CONSUMER or PUBLIC = UX-30 BLOCK [catalog ref: UX-30]
  - PNG shows the populated operating state (not empty, not error).
    $0.00 or "Failed to fetch" as primary content = UX-06b BLOCK
☑ ARCHITECT-HABITS CLUSTER SCAN (Rule 30):
  - If any habit concern surfaced, scanned whole document for related concerns`
```

---

## R2 TRIGGERING CRITERIA

As specified in v1.15.

---

# DOCUMENT 2 — FLOW-XX-TEACH-QA-R0.md

As specified in v1.15. All six phases (Phases 1–6) unchanged.

---

# DOCUMENT 3 — FLOW-XX-YY-IMPLEMENTATION-PLAN-vN.md

## What this document is

A complete execution plan for Claude Code to implement TWO flows. Flows are
paired because they share corpus seeding, test infrastructure, and sometimes
fabric interfaces.

## File header, Plan Purpose Section, Absolute Gate Section, Critical Note
Section, Design References Section, State File Section, Phase 0, Service Phase
Template, Integration Test Phase Template: all unchanged from v1.15.

---

## REACT PAGES + PLAYWRIGHT PHASE TEMPLATE

```markdown
## PHASE-N — FLOW-XX REACT PAGES + PLAYWRIGHT

### What this phase produces
`client/src/pages/{slug}/`
  [Page1Name]Page.tsx
  [Page2Name]Page.tsx

`client/e2e/{slug}.spec.ts`

### Screen intent (Q8 — answer before writing JSX)
    ```
    cat docs/screen-examination/{slug}-examination.md 2>/dev/null | head -20
    cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | head -5
    ```
    If examination record present: extract WHO/VERB/GRAMMAR from it.
    If .impeccable.md present: SK-540 already satisfied.
    If neither: load SK-542 → SK-540 → declare grammar before JSX.

    WHO:     [Role + context]
    VERB:    [One action the user takes on this page]
    GRAMMAR: [G1–G7 type declared]

### Playwright tests (R-01..R-10):
    R-01: [test mapping to page 1 populated state — not empty state]
    R-02: [test mapping to a key iron rule]
    ...
    R-10: [edge case or error state with recovery path]

⛔ STOP — gate: failures===0, screenshots in docs/e2e-snapshots/{slug}/
          PNG shows populated state (not empty/error), await approval.
```

---

## REACT PAGES STARTER TEMPLATES (v1.15 — SK-539)

Before writing any `*.tsx` file, check whether the page matches one of these
seven templates. A matching page **must** use the template as its starting
point.

Templates T-1 through T-7 as specified in v1.15 (unchanged).

**Grammar type reference:**

| Type | User's question | Template |
|------|-----------------|---------|
| G1 PROGRESS_STRIP | "Where is this in its lifecycle?" | T-2 Bootstrap-Checklist |
| G2 VERDICT_GRID | "What did each evaluator decide?" | T-1 AI-Proposal-Review, T-3 Arbiter-Progress |
| G3 CARD_LIST | "Which items need attention?" | (no template — build per-flow) |
| G4 TOPOLOGY_CANVAS | "How do the parts connect?" | T-4 ParallelFlowMonitor, T-6 CycleTopologyDiff |
| G5 KIOSK | "I have one task" | T-5 AiSelfModificationReview |
| G6 DASHBOARD | "What are my key metrics?" | (no template — build per-flow) |
| G7 SETTINGS_TABS | "Which setting do I need?" | T-7 AgentSessionMonitor (partial) |

---

## PHASE 7 — UI/UX COMPLIANCE (v1.15 — updated v1.16)

Phase 7 runs after Phase 6 (Topology Visual QA) and before the final ⛔ STOP.
Mandatory for every session that produced React pages.

```markdown
## PHASE 7 — FLOW-XX UI/UX COMPLIANCE

### When this phase runs
After Phase 6 is ⛔ STOPped and approved. Before the session's final STOP.
Mandatory if this session produced ≥1 React page.

### What this phase produces
For every React page delivered in this session, one FC-18 Audit Trail record.
Stored at: `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`

### Step 1 — Examination record + design context verification (NEW v1.16)

```bash
# Verify examination record was consulted (Q8 compliance)
ls docs/screen-examination/{slug}-examination.md 2>/dev/null && echo "EXISTS" || echo "ABSENT"

# Verify design context produced (SK-540 compliance)
cat docs/design-context/{slug}/.impeccable.md 2>/dev/null | grep "^Type:"
# Expected: Type: G[1-7] <grammar-name>
# If absent: SK-540 was skipped → load SK-542 → SK-540 now before proceeding
```

If `.impeccable.md` is absent at Phase 7 Step 1: run SK-542 (examination
protocol) and SK-540 (design context) now. Do not proceed to Step 2 without
grammar declared.

### Step 2 — Role declaration check
For each page, confirm all four role questions are answered:
  Q1 ROLE_TIER, Q2 ROLE_GATE, Q3 ROUTE_GUARD, Q4 VISIBILITY.
Undeclared answers → fix before proceeding.

### Step 3 — Run the BLOCK check matrix
Run the 24-item BLOCK check matrix from FC-18 §3 Step 3 (includes UX-06b and
UX-30 added in v1.1.0). Apply exemptions where declared.

### Step 4 — Run the CONCERN check matrix
Run UX-06 (admin only), UX-07, UX-11, UX-13, UX-15, UX-21, UX-28.
CONCERNs do not block but must appear in carry-forward inventory.

### Step 5 — SK-541 four-layer PNG audit (updated v1.16)
Load `planning--screen-craft-audit-SKILL.md` (SK-541). Run all four layers:
  Layer 1: accessibility (ui-ux-pro-max P1–P2)
  Layer 2: AI slop detection (design-for-ai CHECKER)
  Layer 3: Nielsen H1/H2/H8/H9 (impeccable critique)
  Layer 4: grammar verification against declared type (UX-30)

Reference authoritative classification protocol:
  `docs/screen-examination/REPAIR-GUIDANCE.md` Parts 2/3

Check six failure modes (FM-1..FM-6 from fc-18-ui-ux-compliance-gate.md v1.1.0):
  FM-1: Wrong route tier (UX-16 + UX-19)
  FM-2: TENANT_FACING badge on admin CRUD (UX-25)
  FM-3: Automated gate with manual action button (UX-23)
  FM-4: Internal IDs (T-numbers, CF-numbers) in tenant UI copy (UX-21)
  FM-5: Missing public page for implemented service (UX-20)
  FM-6: Wrong grammar for tenant-facing page (UX-30) ← NEW FM in v1.1.0

### Step 6 — Produce FC-18 Audit Trail
Author `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` using the format from
`fc-18-ui-ux-compliance-gate.md v1.1.0` §4. One record per page. Include:
  - Role declaration (Q1–Q4)
  - Design context (grammar type, .impeccable.md present, examination record)
  - BLOCK check results (each UX-XX: PASS | BLOCK | EXEMPT + evidence)
  - CONCERN check results (each UX-XX: PASS | CONCERN + note)
  - SK-541 AUDIT record (Layer 1/2/3/4 results + overall verdict)
  - Screen template used (T-N name or NONE + deviation reason if NONE)
  - Missing page registry check result
  - FC-18 verdict: APPROVED | BLOCK | CONCERN

### Phase 7 gate
```bash
ls docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
# Expected: file exists

grep "^Type:" docs/design-context/{slug}/.impeccable.md 2>/dev/null
# Expected: declared grammar type (G1–G7)

grep "BLOCK" docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md | grep -v "PASS\|EXEMPT\|NONE"
# Expected: 0 lines (or only cleared findings)

grep "SK-541 AUDIT" docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
# Expected: SK-541 AUDIT record present
```

⛔ STOP — deliver Phase 7 Audit Trail, await approval before session closes.
```

---

## FILE INVENTORY SECTION

```markdown
## FILE INVENTORY — COMPLETE DELIVERABLE

`server/src/engine/flows/{slug}/
  {service-name}.service.ts         (T[N])
  ...
server/src/engine/flows/{slug-yy}/
  {service-name}.service.ts         (T[N])
  ...

server/src/engine-contracts/
  {slug}-contracts.ts
  {slug}-bfa-rules.ts
  {slug-yy}-contracts.ts
  {slug-yy}-bfa-rules.ts

server/src/bootstrap/history-seeds/
  {slug}-design-corpus.json         ([N] DR + [N] RAG)
  {slug-yy}-design-corpus.json      ([N] DR + [N] RAG)

server/test/e2e/
  {slug}/
    phase-a.spec.ts ... phase-n.spec.ts
    {slug}-integration.spec.ts
  {slug-yy}/
    phase-a.spec.ts ... phase-n.spec.ts
    {slug-yy}-integration.spec.ts

client/src/pages/
  {slug}/      [Page1]Page.tsx  [Page2]Page.tsx
  {slug-yy}/   [Page1]Page.tsx  [Page2]Page.tsx

docs/design-context/                ← NEW v1.16 (Q8 + SK-540 outputs)
  {slug}/
    .impeccable.md                  (design context: WHO/VERB/GRAMMAR declared)
  {slug-yy}/
    .impeccable.md

docs/ux-review/                     ← NEW v1.15 (Phase 7 outputs)
  {slug}/
    FC-18-AUDIT-TRAIL.md            (FC-18 Audit Trail per page — Phase 7)
  {slug-yy}/
    FC-18-AUDIT-TRAIL.md

client/e2e/
  {slug}.spec.ts
  {slug-yy}.spec.ts
  teaching-pipeline.spec.ts  (extended with SEED-[N]..[N+9])
  topology/
    {slug}-topology-qa.spec.ts      (Phase 6 — TVQ-01..TVQ-08)
    {slug-yy}-topology-qa.spec.ts   (Phase 6 — TVQ-01..TVQ-08)

fixtures/design-reasoning/
  {slug}-design-decisions.json
  {slug-yy}-design-decisions.json
fixtures/rag-patterns/             ([N] files)
fixtures/contracts/                ([N] files — t[range] subset)
fixtures/flow-definitions/         ([N] topology files)
fixtures/event-schemas/{slug}/     ([N] schemas)
fixtures/event-schemas/{slug-yy}/  ([N] schemas)
fixtures/arbiters/
  {slug}-arbiters.bulk.ndjson
  {slug-yy}-arbiters.bulk.ndjson
rag-benchmark/
  seed_{slug}_patterns.py
  seed_{slug_yy}_patterns.py`
```

---

# CROSS-CUTTING RULES — ALL THREE DOCUMENTS

Rules 1–34 unchanged from v1.15. Rule 35 is new.

---

## 1–17. (Rules 1–17 unchanged from v1.15)

All rules as specified in v1.15 including the complete text of Rules 30
(Architect Habits), 31 (JSON+MD pairing), 32 (Playwright PNG), 33 (Topology
disambiguation), and 34 (UI/UX Compliance). The only change to Rule 32 in
v1.16 is the addition of FM-6 to the UX review loop checklist.

---

## 18. Screen Intent Anchor (Rule 35 — new v1.16)

### What this rule says

Every React page produced in a XIIGen session must be anchored to the flow's
`user_intent` sentence from
`docs/sessions/FLOW-XX/FLOW-XX-STEP-1-INVARIANTS.md`, or to the
"One-sentence spec" in the flow's examination record
(`docs/screen-examination/{slug}-examination.md`) where one exists. The
anchor must be cited in the implementation plan before the React pages phase
is written and must be visible in the page's `<h1>` element.

### Why this rule exists

The 10-run role reconnaissance and subsequent screen examination of 38 flows
found a consistent root cause for CRUD tables shipped in place of
domain-specific UIs: the implementation plan described page functionality
without citing what the user is trying to accomplish. A plan that says
"FeatureRegistryPage.tsx — admin console for FT records" is describing
infrastructure. A plan that says "FeatureRegistryPage.tsx — platform-admin
reviews each FT record and approves or defers porting to a new platform
(G3 CARD_LIST grammar, source: feature-registry-examination.md)" is
describing a user's job. The difference is Q8.

Rule 35 installs Q8 as a mandatory pre-JSX gate at authoring time, the same
way Rule 34 installs Phase 7 as a mandatory post-build gate. The two rules
are sequential, not competing.

### The grammar types

Seven valid grammar types. Declare one in Q8 before writing JSX. The
declared grammar must match the examination record where one exists.

| Type | User's question | Flows |
|------|-----------------|-------|
| G1 PROGRESS_STRIP | "Where is this in its lifecycle?" | FLOW-00, 11, 14, 19, 33, 39, 45, 47 |
| G2 VERDICT_GRID | "What did each evaluator decide?" | FLOW-24(mod), 25, 27, 35, 37 |
| G3 CARD_LIST | "Which items need attention?" | FLOW-06, 07, 08, 10, 12, 16, 17, 20, 28, 32, 36, 40, 46 |
| G4 TOPOLOGY_CANVAS | "How do the parts connect?" | FLOW-18, 26, 29, 34 |
| G5 KIOSK | "I have one task" | FLOW-01, 02, 03, 04, 05, 09, 22, 24(report) |
| G6 DASHBOARD | "What are my key metrics?" | FLOW-13, 20(admin), 30, 31, 38 |
| G7 SETTINGS_TABS | "Which setting do I need?" | FLOW-15, 21, 23, 48 |

Reference: `planning--business-flows-registry.md` for pre-declared grammar
per flow, examination record status, and CFI notes.

**Reference implementation (passing):** FLOW-29 adaptive-rag-deep-research
(G4 TOPOLOGY_CANVAS) — three role PNGs at
`docs/e2e-snapshots/c6-role-coverage/flow-29-*.png` all passing as of
RUN-50. Examination record at
`docs/screen-examination/adaptive-rag-deep-research-examination.md`.

### What compliance looks like

- The implementation plan contains a Q8 block for each React pages phase:
  WHO declared, VERB declared, GRAMMAR declared with source citation.
- The examination record was read before JSX was written (or stated absent
  with source fallback).
- The page `<h1>` text is derived from user_intent or the examination record
  spec sentence — not from the service name or the API path.
- The page primary content implements the declared grammar type.
- The Playwright PNG shows the populated operating state for the declared
  role and VERB.

**Passing example (FLOW-36 feature-registry):**
```
Q8: WHO = platform-admin reviewing FT records for porting decisions
    VERB = approve or defer porting for each FT record
    GRAMMAR = G3 CARD_LIST
    Source: docs/screen-examination/feature-registry-examination.md

h1: "Feature Registry — Review porting decisions for each FT record"
Primary content: FeatureMatrixScreen — FT-ID cards with porting-candidate
  badge, signal count, cost estimate, Approve/Defer actions.
```

### What violation looks like

**Violating example (FLOW-36 feature-registry before fix):**
```
Page: FeatureRegistryPage.tsx
h1: "FLOW-36 admin console backed by /api/dynamic/xiigen-feature-registry"
Primary content: Name / portingCandidate / signals / Delete table
Q8: not answered — SK-540 and SK-542 not run before JSX
```
→ UX-30 BLOCK. UX-21 CONCERN (engineering identifiers in h1). Page rewrite
required per FLOW-45 RUN-52 HistoryBootstrapPage template.

### CFI-12 halt (FLOW-04, FLOW-09, FLOW-34)

These three flows have stale F1 documents where the stated user_intent
contradicts the slug, existing pages, and PNGs. Rule 35 requires Q8 to
be answered before JSX. Q8 cannot be answered for a flow whose user intent
is disputed. These three flows are blocked for UI design work until Luba
confirms the correct direction for each. See CFI-12 in SESSION-LOAD-PLAN v31.

### Relationship to Rule 34

Rule 35 fires before JSX: Q8 → `.impeccable.md` produced by SK-540 →
SK-539 Section 0 reads it.

Rule 34 fires after pages are built: Phase 7 → SK-541 Layer 4 verifies
grammar implemented → FC-18 Audit Trail.

Both must pass before the session closes. Rule 35 cannot be satisfied
retroactively by adding Q8 answers after JSX is written.

### Exemptions

Sessions that produce only server-side code (no `*.tsx` files, no new
`<Route>` entries) are exempt from Rule 35. State explicitly in DELIVERY
SUMMARY: *"No React pages produced — Rule 35 exempt."*

Engine-internal admin pages served exclusively to PLATFORM_ENG roles are
exempt from the grammar type mandate (UX-30 applies to TENANT_CONSUMER and
PUBLIC pages only). All other Rule 35 requirements apply.

---

*End of XIIGEN FLOW DOCUMENT AUTHORING GUIDE v1.16*
