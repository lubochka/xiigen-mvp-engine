# XIIGEN FLOW DOCUMENT AUTHORING GUIDE — v1.15
## How to prepare Design Simulation, Teach-QA, and Implementation Plan files
## Date: 2026-04-20
## Supersedes: v1.14 (session-derived habits + deliverable rules) and all prior versions

---

## WHAT CHANGED IN v1.15 (UI/UX compliance integration)

This version integrates SK-539 (UI/UX Compliance) and FC-18 into the authoring
lifecycle. Four classes of change:

**Phase 7 — UI/UX Compliance Phase** (new, §PHASE 7 below): every flow
implementation session that produces React pages now runs a seventh phase that
verifies the 29 SK-539 checks and produces an FC-18 Audit Trail per page.
Phase 7 runs after Phase 6 (Topology Visual QA) and before the final ⛔ STOP.

**React Pages Starter Template Library** (new, §REACT-PAGES-STARTER-TEMPLATES
below): seven reusable screen templates (T-1..T-7) that pre-satisfy FC-18 checks
for common patterns across XIIGen flows. Added to the REACT PAGES + PLAYWRIGHT
PHASE TEMPLATE section. Sessions that match a template pattern must use it.

**General Rule 32 extended — UX review loop after PNG capture**: the existing
Playwright PNG rule (Rule 32) gains a mandatory sub-step: after PNGs are
captured, run a UX review pass against the captured PNGs before the phase is
closed. The review checks for the five most common FC-18 failure modes (FM-1
through FM-5 in the FC-18 gate document). This closes the loop between "PNGs
exist" and "PNGs prove the UX is correct."

**Completion Gate (SECTION 11) updated**: one new check item added (FC-18
UI/UX COMPLIANCE) after the existing VISUAL PROOF item. This check verifies
the FC-18 Audit Trail was produced for every page in the session.

**FILE INVENTORY updated**: two new entries added for UX compliance artifacts
produced by Phase 7.

No existing rules were removed. No existing section was restructured. v1.15 is
strictly additive on v1.14.

---

## WHAT CHANGED IN v1.14 (session-derived habits + deliverable rules)

This version extends v1.13 by folding findings from the 2026-04-17 authoring
session back into the authoring guide. Three classes of change:

**Catalog refresh (Rule 30)** — the Architect Habits catalog now has
twenty-five entries instead of the earlier seventeen. The three-habit "mattering
most" list stays at running-to-the-keyboard, deferring-in-scope, and
inherited-verdicts — those were the most corroborated. Five newer habits show
up as emerging tier: acting-before-reading, shape-match-at-phase-close,
wide-scope-before-drafting, meaning-not-enumeration, and ask-tools-before-person.
Rule 30 prose rewritten in human-first style: names lead, IDs back-reference.

**Three new General Rules for deliverable discipline** —

- **General Rule 31 — JSON+MD deliverable pairing**: every structured data
  output ships with a Markdown companion in the same directory. No JSON
  without an MD that a human can read.

- **General Rule 32 — Playwright PNG per feature**: every feature ships with
  a Playwright spec that captures PNGs before the work is considered done.
  Not optional. Not deferred. Same session. Luba's permanent rule.

- **General Rule 33 — Topology disambiguation**: when a document refers to
  "topology," it specifies which kind — business topology (the tenant-visible
  artifact in `contracts/topologies/*.topology.json`) or AF pipeline mock
  (the engine-run internal structure in `makeStandardFixture`). The bare word
  is ambiguous and forbidden.

**Session Start Checklist (SECTION 3)** — Q7 added. The checklist now has
eight questions (Q0–Q7). Q7 is the reads-first-absorbs-first discipline: if
the session brief contains uploads, attachments, or long quoted content, full
absorption precedes the first tool call or first line of authoring.

**Completion Gate (SECTION 11)** — four new items added to catch:
deliverable-shape matching the output contract; JSON deliverables paired with
MD companions; feature-completion claims citing visual-proof paths; and a
cluster-scan when any architect-habits concern surfaces (habits cluster within
a session — finding one usually means finding two more).

No existing rules were removed. The existing Rule 30 section is rewritten to
reflect the current catalog and new naming conventions. Rules 31–33 are added
after Rule 30. Footer updated to v1.14.

---

## WHAT CHANGED IN v1.13 (architect behavior discipline)

- **New General Rule #30 — Architect Behavior Discipline** added at end of document
  (the governance section). Codifies the authoring-side mirror of Code Review v1.4
  Gate 0i and Design Review v1.1 Check 6. References SK-538 Architect Behavior
  Classifier as the canonical 17-pattern catalog.
- **Session Start Checklist (SECTION 3)** — Q6 added. Checklist now has 7 questions
  (Q0–Q6) instead of 6 (Q0–Q5). Q6 requires SK-538 catalog loaded before Round 1.
- **Completion Gate (SECTION 11)** — three new checklist items added covering the
  top 3 architect-behavior patterns from the corpus (N-A2 deferred-in-scope, N-A5
  unverified claims, N-A8 inherited verdicts).
- Fixed end-of-document footer from "v1.11" to "v1.13" (the source file incorrectly
  retained the v1.11 footer through the v1.12 consolidation).

No existing rules were removed. No existing section was restructured. v1.13 is
strictly additive on v1.12.

---

## WHAT CHANGED IN v1.12 (naming refactor complete + seedFlowCorpus API)

History seed files renamed to `{slug}-design-corpus.json`:
- All 9 files in `server/src/bootstrap/history-seeds/` now use semantic slug prefix.
  Old: `flow-02-design-corpus.json` → New: `profile-enrichment-design-corpus.json`
- `seedFlowCorpus()` API change: callers must pass the semantic slug, not a numeric
  string. Use `seedFlowCorpus('profile-enrichment')` not `seedFlowCorpus('02')`.
  The service constructs: `` `${slug}-design-corpus.json` `` (no `flow-` prefix).
- All fixture directories are now 100% slug-named (commit 5d21952, DEV-109).
  Phase 9 naming gate returns 0 across all four fixture categories.
- 10 open corpus/arbiter/contract gaps tracked in `fix_session_flow_13.json` at repo
  root. Do not author TEACH-QA for FLOW-01 through FLOW-13 until those gaps are closed.

---

## WHAT CHANGED IN v1.11 (ESLint integration + client build gates)

Rule 12 (#29) added — ESLint suppression protocol:
- `npm run lint` added to ABSOLUTE GATE template (was missing entirely)
- `npm run lint` added to SERVICE PHASE TEMPLATE gate
- Correct `eslint-disable-next-line` placement documented with right/wrong examples
- `--max-warnings 0` semantics explained: warnings ARE build failures
- When to suppress vs when to remove console calls

---

## WHAT CHANGED IN v1.10 (flow execution documentation protocol)

Rule 10 (#27) added — the complete execution documentation protocol:
- 5 documentation debt accumulation classes (TEACH-QA phantom, BFA stub,
  stale TECH DEBT TRACKER, undocumented ES index scope, factory list drift)
- Per-phase documentation checklist (7 items — runs at every ⛔ STOP)
- Recovery procedure for already-accumulated documentation debt

---

## WHAT CHANGED IN v1.8 (semantic naming everywhere)

Source code, test files, fixtures, and scripts use `{slug}` everywhere.
Planning/session documents keep the `FLOW-XX` prefix.

**The split rule (non-negotiable):**

```
FLOW-XX prefix KEPT:
  Design simulation:     FLOW-09-DESIGN-SIMULATION-R1.md
  TEACH-QA file:         FLOW-09-TEACH-QA-R0.md
  Implementation plan:   FLOW-07-08-IMPLEMENTATION-PLAN-v2.md
  State file:            FLOW-07-08-IMPL-STATE.json
  Session directory:     docs/sessions/FLOW-09/
  flowId data value:     "FLOW-09"
  patternId value:       "FLOW-09-DR-01"
  arbiter ruleId:        "CF-09-1"

Semantic slug REQUIRED everywhere else:
  Engine directory, service files, test files, fixture files,
  TypeScript variable names, seed scripts, snapshot directories
```

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

**Production order is MANDATORY.** Design simulation must be complete (including
R2 gap corrections) before TEACH-QA is written. TEACH-QA must be complete before
it is referenced in the implementation plan.

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

```markdown
## INVENTORY CHECK (mandatory before design)

Documents read before this session began:
\`\`\`
FLOW-01-DESIGN-SIMULATION-R4.md          ✅
FLOW-02-DESIGN-SIMULATION-R1.md          ✅
...
\`\`\`
```

---

## SECTION 2 — WHAT THIS FLOW INHERITS

Every pattern from prior flows that applies here. Never re-derived.

```markdown
## WHAT FLOW-XX INHERITS — NO RE-DERIVATION

| Pattern | Teaching for FLOW-XX |
|---|---|
| DR-01 (name completion event first) | Name `[EventName]` before Round 1 expansion |
| DR-04-A (atomic capacity operation) | [Specific node] reuses decrementAndCreate() from [prior node] |
| TIMEOUT-AS-SUCCESS-MODE-001 | [N]-second timeout → partial result in successModes |
...
```

**Rule:** Every inherited pattern must name the specific node or scenario in column 2.

---

## SECTION 3 — SESSION START CHECKLIST

**Step 0 — Validate plan-state against engine contracts before answering Q0:**

```bash
# Confirm the flow's task range from the authoritative source
grep -i "taskTypeId\|T[0-9][0-9]\|task_range" \
  server/src/engine-contracts/{slug}-contracts.ts | head -10

# Confirm what the plan-state file claims
cat docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json | python3 -c "
import json,sys; d=json.load(sys.stdin)
print('Plan state task range:', d.get('task_range') or d.get('taskRange'))
print('Plan state flow name:', d.get('flow_name') or d.get('flowName'))
"
# If they disagree → the contracts file is authoritative.
# State the discrepancy, use the contracts file, proceed with the correct task range.
```

Answer ALL seven questions before Round 1 output begins.

```markdown
## SESSION START CHECKLIST

\`\`\`
Q0: User asked for — "[verbatim or paraphrased user intent]"

Q1: Accomplishes — [the end state this flow creates — NOT a list of steps]
    [Who becomes what? What exists in the system that did not before?]
    [Synchronous vs asynchronous boundary]

Q2: 3–5 concerns that collapse in naive designs:
    (a) [First concern — usually the synchronous gate]
    (b) [Second concern — async heavy operation]
    (c) [Third concern — async fanout]
    (d) [Fourth concern if present]
    (e) [Fifth concern if present]

    Naive collapse: [naive event chain] → [why it's wrong]
    1. [Why first concern cannot block the second]
    2. [Why second and third have different scaling profiles]
    3. [Most important design decision — usually time-decoupling]

Q3: Completion event — [EventName] (named NOW)
    Named before any node expansion begins.
    NOT [SimilarName1] ([which node emits that and when])
    NOT [SimilarName2] ([which node emits that and when])
    [EventName] fires when: [exact gate condition — which nodes complete]
    [TimeDecoupledProcess] runs after — independently.

Q4: Downstream minimum payload:
    { tenantId, [entityId], [actorId], [completedAt],
      [flow-specific-fields FLOW-XX+1 and FLOW-XX+2 will need] }

Q5: Session type — DESIGN

Q6: Architect Habits catalog loaded — [yes/no]
    □ Architect Habits skill file (planning--architect-behavior-classifier-SKILL.md)
      read at session start (load_order 6). Catalog now has twenty-five habits
      across three classes: seven worth cultivating, four neutral-is-positive,
      fourteen worth catching.
    □ The three habits that matter most in practice are named, not just
      recognized by ID: running to the keyboard when the question was
      architectural [N-A1]; deferring in-scope work to a future session [N-A2];
      inherited verdicts — using a prior claim without re-running its source [N-A8].
    □ Every claim carried from a prior session has been re-verified with its
      originating command before being cited in this document.

Q7: Inputs absorbed before writing — [yes/no]
    □ Every uploaded document, attachment, or long quoted content in the
      session brief has been read in full before the first line of authoring
      or the first tool call. Acting on partial absorption produces
      documents that miss what was asked for.
    □ Paraphrase of what was read appears before the first structural
      decision. If the brief referenced prior artifacts, those were opened
      and read before planning.
\`\`\`
```

**Q3 is the most important question.** It is locked after being stated.
The completion event name is a MACHINE literal — it appears in code and all downstream consumers.

**Q6 loads the Architect Habits catalog** — without it, altitude and ground-truth drift enters the session
invisibly and accumulates through the depth ladder. See General Rule 30.

**Q7 enforces reads-first discipline** — added in v1.14 after sessions where
authoring began before the user's full input had been absorbed. Finding the
same thing Luba already wrote in her brief, or missing what she said entirely,
is the failure this question catches.

---

## SECTION 4 — PRE-DESIGN STEP TABLE (SILENT_FAILURE CHECKS)

Run before Round 1. Identify 3–5 paths that produce no local error but silently
corrupt the system if the design gets them wrong.

```markdown
## PRE-DESIGN STEP TABLE (SK-441) — [N] SILENT_FAILURE CHECKS

Running the step table on [N] dangerous paths before writing any node.

### SF-CHECK-1: [Short description of the race/ordering/scope danger]

Step: [What the node does]
Question: [Does it fall into the trap?]
If [wrong approach]:
  [What breaks]: [exact failure — a single wrong operation or omission]
Verdict: SILENT_FAILURE if [naive approach is taken]
Fix: [The correct pattern — what must happen instead, and why]

### SF-CHECK-2: ...
```

---

## SECTION 5 — ROUND 1: TOP-LEVEL FLOW

Identify the top-level nodes (not yet expanded). Name the completion event here.
Identify which nodes are time-decoupled and why.

```markdown
## ROUND 1 — TOP-LEVEL FLOW

NODE A — [Name]: [what it does synchronously]
NODE B — [Name]: [what it does asynchronously — explain the time-decoupling]
NODE C — [Name]: [another async path]
NODE D — Completion Signal: emits [EventName]

[Time-decoupled node]:
  Starts from [trigger event] — independently of NODE D.
  Its completion event ([EventName]) NEVER blocks NODE D.
  If [TimedProcess] is modeled as a gate condition on NODE D, [exact failure].
```

---

## SECTION 5B — INLINE_ONLY SERVICE TYPE

When a node is called synchronously by another service (no queue consumer):

```markdown
## T[N] — [ServiceName] (INLINE_ONLY)

EXECUTION MODEL: inline
NO @EventPattern. NO @MessagePattern.
Called directly by [caller service] via constructor injection.
Returns [ReturnType] — does NOT store records independently.
```

**Why:** If T[N] stores records independently and the caller fails after calling T[N],
an orphaned record exists with no corresponding parent record. The two databases diverge.

---

## SECTION 6 — ROUND 2: SUBFLOW EXPANSIONS

When NODE A or similar requires multi-step implementation:

```markdown
## ROUND 2 — SUBFLOW EXPANSIONS

[NODE] expands because [reason — multiple atomic steps, or conditional paths].

NODE A expands to:
  NODE A1 — [Step 1]
  NODE A2 — [Step 2]
  NODE A3 — [Step 3] (conditional — only if [condition])
```

```markdown
## COMPLETE FLOW ASSEMBLY

MAIN PATH:   [Full ordered sequence]
BRANCH A:    [T[N] → T[M] (condition)]
BRANCH B:    [Async path — T[K] → T[K+1]]
INLINE:      [T[P] called by T[Q] — no queue]
```

---

## SECTION 7 — FOUR DIMENSIONS PER LEAF NODE

**Every LEAF node must have all four sections. No shortcuts. No "same as NODE X".**

From FLOW-04 onward, CONTEXT is folded into PROMPT's `PRIOR NODES` line.
Current format: PROMPT → CONNECTIONS → ARBITERS → EXAMPLES.

### Dimension 1 — PROMPT

```markdown
#### PROMPT

**System:**
\`\`\`
CONSTRAINTS:
1. [Most important MACHINE constraint — cross-flow or invariant]
   [Reason: why this must be fixed, what breaks if it varies]

2. [Second constraint — domain-specific failure mode]

3. [Third constraint — ordering, idempotency, or scope rule]

4. [Additional constraints — 3–6 total]

QUESTION YOURSELF before finalising:
1. Single responsibility?
2. All constraints reflected?
3. Failure modes specific and named?
4. Any technology names? (must remove)
\`\`\`

**User:**
\`\`\`
STEP: [exact step description from Cycle 1 plan step]

UPSTREAM CONTEXT: [what prior nodes established]
  [Name the trigger event explicitly]
  [Name the fields that arrive from the previous node]
  [State the SILENT_FAILURE class risk if context is misunderstood]

PRIOR NODES: [RAG: pattern-name-001, pattern-name-002]
\`\`\`
```

**UPSTREAM_CONTEXT is mandatory for every node after the first.**

### Dimension 2 — CONNECTIONS

```markdown
#### CONNECTIONS

\`\`\`
Receives from: [source node or trigger event]
  { field1, field2, field3 }
  [actorId, tenantId]: from ALS (never from payload)

[Conditional reads, if any:]
  Reads from: [index name] ([scope] — [when this read occurs])
  Filter: { [fields] }
  Returns: [what it returns]
  CONTRACT: [what happens when this returns empty or null]

Writes to: [index name]
  { [fields written including connectionType and knowledgeScope] }

Emits: [EventName] { [payload fields] }
  Consumed by: [which node or subflow]

Cross-flow:
  [downstream flow]: [what it depends on from this node]
\`\`\`
```

**Every node that stores records must include `connectionType` and `knowledgeScope`.**
Every cross-flow event must declare the consuming flow.

### Dimension 3 — ARBITERS

Minimum arbiter panels by archetype:

```
ROUTING:       IronRules + Business + scope_isolation
DATA_PIPELINE: IronRules + Domain + Security + Completeness + scope_isolation
VALIDATION:    IronRules + Domain + Security + scope_isolation
TRANSACTION:   IronRules + Domain + Business + Security + Completeness + Skills + Prompts + scope_isolation
ORCHESTRATION: All 7 + scope_isolation (8th)
SCHEDULED:     IronRules + Domain + Business + Security + Completeness + scope_isolation
```

```markdown
#### ARBITERS

**IronRules arbiter**
\`\`\`
Isolated context: [MACHINE rules only]
Checks:
  BLOCK if: [exact measurable condition]
  BLOCK if: [exact condition]
  PASS if:  [exact condition — must be as specific as BLOCK]
\`\`\`

**scope_isolation arbiter (FC-32)**
\`\`\`
Checks:
  PASS if: { connectionType: 'FLOW_SCOPED', knowledgeScope: '[PRIVATE|GLOBAL]' }
           on [specific record type]
  BLOCK if: [wrong scope assignment — with specific consequence stated]
\`\`\`
```

**scope_isolation is mandatory on every node that stores records.**

### Dimension 4 — EXAMPLES

```markdown
#### EXAMPLES

**POSITIVE (chosen — [Model] round [N], score [X.X]):**
\`\`\`json
{
  "constraints": [
    "[constraint 1 — maps to PROMPT constraint 1, MACHINE rule verbatim]",
    "[constraint 2 — domain-specific failure mode guard]",
    "[constraint 3 — ordering or idempotency rule]"
  ]
}
\`\`\`

**NEGATIVE (rejected — [Model] round [N], score [X.X]):**
\`\`\`json
{
  "[the field with the wrong value]": "[the naive/wrong value]"
}
\`\`\`

**Why rejected:**
\`\`\`
[Exact BLOCK condition that fires — which arbiter, which rule]
[Why this matters: what breaks in production if this passes]
[Traceability: which SILENT_FAILURE from the pre-design table this catches]
\`\`\`

**DPO triple:**
\`\`\`
discriminating_constraint: "[the one constraint distinguishing chosen from rejected]"
chosen.model:  [model family] (round [N], score [X.X])
rejected.model: [different model family] (round [N], score [X.X])
teaching:      [what the fine-tuned model learns from this pair]
\`\`\`
```

**RULES:**
- `chosen.model` MUST differ from `rejected.model` (V9-002)
- `curriculumTier` MUST be non-null integer (V9-003)
- POSITIVE example contains only the discriminating fields — not a full NODE spec
- NEGATIVE example shows the exact problematic text, not a description of it

---

## SECTION 8 — DESIGN_REASONING TRIPLES

Design-simulation format (compact, human-readable during session):

```markdown
## DESIGN_REASONING TRIPLES

\`\`\`
DR-XX-A: [Short name of the decision]
  context:    [what situation the designer faces]
  chosen:     [the correct decision — specific, actionable]
  rejected:   [the naive/wrong alternative]
  teaching:   "[quote-style teaching point — one paragraph]"
  applies_to: [FLOW-XX+1, FLOW-XX+2, FLOW-XX+3]
  curriculumTier: [1-5]
\`\`\`
```

Fixture format (15 required fields — used in `{slug}-design-decisions.json`):

```json
{
  "patternId":                "FLOW-XX-DR-01",
  "patternType":              "DESIGN_REASONING",
  "flowId":                   "FLOW-XX",
  "domainId":                 "[domain area e.g. event-management]",
  "seededAt":                 "YYYY-MM-DDT00:00:00Z",
  "teachingPoint":            "[from DR-XX-A — principle + why wrong fails]",
  "positiveExample":          "[from DR-XX-A chosen]",
  "negativeExample":          "[from DR-XX-A rejected]",
  "discriminatingConstraint": "[one constraint separating chosen from rejected]",
  "appliesTo":                ["FLOW-XX+1", "FLOW-XX+2"],
  "curriculumTier":           1,
  "qualityScore":             0.93,
  "sourceDocument":           "FLOW-XX-DESIGN-SIMULATION-R1.md (DR-XX-A)",
  "tags":                     ["[tag1]", "[tag2]"],
  "keywords":                 "[space-separated search terms]",
  "connectionType":           "FLOW_SCOPED",
  "knowledgeScope":           "GLOBAL"
}
```

**`appliesTo` is a real JSON array** — `["FLOW-03", "FLOW-07"]` not `"['FLOW-03', 'FLOW-07']"`.

Fields NOT in DR fixtures: `category`, `sourceFlow`, `observedIn` — do NOT add them.

**Type rules (non-negotiable):**
- `curriculumTier`: int (1) — NOT string "1"
- `qualityScore`: float (0.93) — NOT string "0.93"
- `appliesTo`: JSON array — at least 2 future flows

---

## SECTION 9 — NEW RAG PATTERNS

Design-simulation format:

```markdown
## NEW RAG PATTERNS PRODUCED

\`\`\`
PATTERN-NAME-001
  teachingPoint: "[transferable principle — multi-sentence, future-flow-applicable]"
  qualityScore: 0.NN
  observedIn: [FLOW-XX (NODE)]
  applies_to: [FLOW-XX+1, FLOW-XX+2]
\`\`\`
```

Fixture format:

```json
{
  "patternId":   "PATTERN-NAME-001",
  "patternType": "ARCH_PATTERN",
  "flowId":      "FLOW-XX",
  "domainId":    "[domain area]",
  "seededAt":    "YYYY-MM-DDT00:00:00Z",
  "archetype":   "[ROUTING|DATA_PIPELINE|VALIDATION|TRANSACTION|ORCHESTRATION|SCHEDULED]",
  "tags":        ["[tag1]", "[tag2]"],
  "keywords":    "[space-separated search terms]",
  "teachingPoint": "[what to do and why — one or two sentences]",
  "ironRules":   ["[rule 1]", "[rule 2]"],
  "codeSnippet": "[short illustrative pseudo-code; embed negative as comment]",
  "appliesTo":   ["FLOW-XX+1", "FLOW-XX+2"],
  "curriculumTier": 1,
  "qualityScore": 0.93,
  "sourceDocument": "FLOW-XX-DESIGN-SIMULATION-R1.md",
  "connectionType": "FLOW_SCOPED",
  "knowledgeScope": "GLOBAL"
}
```

**Fields NOT in actual fixtures:** `summary`, `antiPattern` — do NOT add them.

Only create a pattern if it is: (1) not already in corpus, (2) transferable to ≥2
future flows, (3) substantive enough to influence generation.

---

## SECTION 10 — TRAINING CORPUS SUMMARY

```markdown
## TRAINING CORPUS — FLOW-XX

\`\`\`
Code triples (DPO pairs):          [N]
  [NODE-ID]  ([name])              1

DESIGN_REASONING triples:          [N]  (DR-XX-A through DR-XX-[Letter])
  curriculumTier: [N]

New RAG patterns:                  [N]
  [pattern-name-001]

Graph edges:                       [N]
  [edge-description] (confidence: 0.NN)

Inherits from prior flows (no re-derivation):
  DR-01 → [how it applies]
\`\`\`
```

---

## SECTION 11 — COMPLETION GATE (R1)

```markdown
## COMPLETION GATE

\`\`\`
☑ Session start checklist: Q0-Q5 answered before Round 1
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
☑ ARCHITECT HABITS DISCIPLINE (General Rule 30, refreshed v1.14):
  - No deferred-to-separate-session labels on items that decompose a stated
    goal element. Goal-decomposing deferrals require explicit approval
    recorded in STATE.goalContext. [catalog ref: N-A2]
  - Every cited file:line has a corresponding grep/find/ls command result
    in the session's recon log. Recollection is not evidence. [catalog ref: N-A5]
  - Every inherited verdict from a prior session has been re-run with its
    originating command. Inherited hallucinations cost three plan versions
    (the registerInstall case). [catalog ref: N-A8]
☑ DELIVERABLE SHAPE MATCHES OUTPUT CONTRACT (new v1.14, Rule 30 + N-A10):
  - At ⛔ STOP, re-read the original output contract (what was asked for)
    verbatim and confirm the deliverable's shape matches each element:
    cardinality (N items when N were asked), granularity (per-unit fields
    when per-unit was asked), structure (enumeration when enumeration was
    asked, not rollup to archetype classes).
  - A six-archetype rollup when forty-seven per-flow entries were the
    contract is not "done" — it is a shape mismatch. [catalog ref: N-A10]
☑ JSON+MD DELIVERABLE PAIRING (new v1.14, General Rule 31):
  - Every JSON, NDJSON, or CSV artifact produced has a Markdown companion
    in the same directory, with matching base name (e.g., STATE.json has
    STATE.md). The MD is human-readable: executive summary → per-unit
    sections with file:line citations → gap analysis.
  - Absent MD = incomplete ⛔ STOP. See General Rule 31.
☑ VISUAL PROOF FOR FEATURE-COMPLETION CLAIMS (new v1.14, General Rule 32):
  - Every "done" claim for a tenant-visible feature cites a Playwright PNG
    path produced in this session, or an explicit exemption rationale for
    why the feature cannot be visually shown.
  - "It works" without a PNG to prove it does is not done. See General Rule 32.
  - [catalog ref: P-A4 — show, don't assert]
☑ FC-18 UI/UX COMPLIANCE (new v1.15, SK-539 + General Rule 34):
  - For every React page produced in this session, FC-18 Audit Trail exists
    at `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`.
  - Audit Trail has FC-18 verdict APPROVED or CONCERN for each page.
    BLOCK verdict = session cannot close. Fix and re-run Phase 7.
  - If session used a screen template (T-1..T-7), template name is declared
    in the Audit Trail for each matching page.
  - If session implements FLOW-20/21/28/48, the corresponding missing page
    from the registry (SK-539 §6) was created in this session.
  - "Page exists" without Audit Trail is not done. See SK-539 and FC-18.
☑ ARCHITECT-HABITS CLUSTER SCAN (new v1.14, Rule 30 extension):
  - If any habit concern surfaced during authoring, scanned the whole
    document for related habit concerns — not just the section where the
    first concern appeared. Habits cluster within a session; finding one
    usually means finding two more. [catalog ref: Section 4 cluster-note]
\`\`\`
```

---

## R2 TRIGGERING CRITERIA

**R2 is required when design review finds any of these:**

1. A node is missing full four dimensions AND carries iron rules with design-safety
   implications (scope leak, capacity race condition, wrong trigger event).
   Wording improvements alone do not require R2.

2. A node's archetype is misclassified. Archetype drives arbiter panel minimum
   requirements; misclassification silently under-provisions arbiters.

3. A corpus count in the Completion Gate is wrong.

**TEACH-QA corrections are sufficient (R2 not required) when:**
- A contract's `namedChecks` is empty and no key exists in validate.handler.ts
- An event schema is missing a non-critical field
- Wording in an iron rule is imprecise but intent is unambiguous

**Decision rule:** If the gap would cause a SILENT_FAILURE at generation time → R2.

## R2 STRUCTURE

```markdown
## WHAT THIS DOCUMENT FIXES

\`\`\`
Gap 1  [Node] [Dimension] — [what was missing or wrong]
Gap 2  [Node] — [what was missing or wrong]
\`\`\`

---

## GAP 1: [NODE] [DIMENSION] — [TITLE]

### Root cause
[Why the gap exists — trace the failure at generation time]

### Corrected [Dimension]

\`\`\`
CURRENT (R1):
  [the wrong version]

CORRECTED:
  [the full corrected version — not a diff, a replacement]
\`\`\`
```

R2 also produces an UPDATED TRAINING CORPUS section and a COMPLETION GATE — FLOW-XX FINAL.

---

# DOCUMENT 2 — FLOW-XX-TEACH-QA-R0.md

## What this document is

A self-contained execution session file for Claude Code. Closes the loop from
design to corpus: the design simulation says what should exist; this file builds
the infrastructure that makes it queryable and verifiable.

TEACH-QA files are consumed by Claude Code — SK-443 rules apply: no cross-references,
no undefined variables, no English descriptions in place of literal commands.

## File naming

```
FLOW-05-TEACH-QA-R0.md
```

Always R0 for first version. Never `SESSION-05-TEACH-QA.md` — `SESSION-` prefix is banned.

## File header

```markdown
# FLOW-XX-TEACH-QA-R0.md
## FLOW-XX: [Flow human name] — Teaching Pipeline + Proper Flow Testing
## Session type: MAINTENANCE
## Consumer: Claude Code
## Branch: claude/vigorous-margulis
## Date: YYYY-MM-DD
```

---

## TEACH-QA PHASE STRUCTURE

Every TEACH-QA file has exactly 6 phases. Each phase ends with ⛔ STOP.

```
Phase 1: Design-reasoning fixtures + RAG pattern fixtures
Phase 2: Contracts + topologies + arbiters + event schemas
Phase 3: rag-benchmark/seed_{slug}_patterns.py
Phase 4: Proper-flow design contract tests ({slug}-proper-flow.e2e.spec.ts)
Phase 5: Teaching-pipeline Playwright test extension (SEED-NN..SEED-NN+4)
Phase 6: Topology visual QA ({slug}-topology-qa.spec.ts — TVQ-01..TVQ-08)
```

---

## SESSION PREAMBLE (required structure)

```markdown
## SESSION PREAMBLE

**Why this session exists:**
FLOW-XX ([Name], T[start]-T[end]) has [state of design simulation] but
[state of teaching infrastructure]. [Table of what is missing:]

\`\`\`
fixtures/rag-patterns/                  — [N] {slug} files
fixtures/design-reasoning/              — [status of {slug}-design-decisions.json]
fixtures/contracts/                     — [status of T[range] contracts]
fixtures/flow-definitions/              — [status of {slug}-*.topology.json]
fixtures/arbiters/                      — [status of {slug}-arbiters.bulk.ndjson]
fixtures/event-schemas/{slug}/          — [status]
rag-benchmark/seed_{slug}_patterns.py   — [status]
server/test/e2e/{slug}/                 — [status]
client/e2e/                             — [status of teaching-pipeline.spec.ts]
\`\`\`

FLOW-XX introduces [N] new RAG patterns not seen in prior flows:
- PATTERN-NAME-001 ([node] — [one-sentence why it's new])

**P19 ABSOLUTE TEST GATE — before every ⛔ STOP:**
\`\`\`bash
cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|passed|failed" | tail -3
# Gate: failures === 0. Count must not decrease from baseline.
\`\`\`

**FOUND-ISSUE PROTOCOL:**
FIXED / DEFERRED+CARRY-FORWARD / EXCEPTION — no other statuses valid.
```

---

## COLD START

```markdown
## COLD START

\`\`\`bash
# Confirm branch
git branch --show-current
# Expected: claude/vigorous-margulis

# Confirm baseline test count
cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:" | tail -1
# Record this number — count must not decrease

# Confirm ALL fixture gaps
ls fixtures/rag-patterns/ | grep -i "{slug}" | wc -l
# Expected: 0 (none yet)

ls fixtures/design-reasoning/{slug}-design-decisions.json 2>/dev/null || echo "MISSING"
ls fixtures/contracts/t[range]*.contract.json 2>/dev/null || echo "No T[range] contracts"
ls fixtures/flow-definitions/{slug}-*.json 2>/dev/null || echo "No {slug} topologies"
ls fixtures/arbiters/{slug}-arbiters.bulk.ndjson 2>/dev/null || echo "No {slug} arbiters"
ls fixtures/event-schemas/{slug} 2>/dev/null || echo "No {slug} event schemas"
ls rag-benchmark/seed_{slug}_patterns.py 2>/dev/null || echo "No seed script"
ls server/test/e2e/{slug}/{slug}-proper-flow.e2e.spec.ts 2>/dev/null || echo "No proper-flow test"
ls client/e2e/topology/{slug}-topology-qa.spec.ts 2>/dev/null || echo "No topology QA spec"

# Confirm format references
ls fixtures/design-reasoning/profile-enrichment-design-decisions.json  # JSON ARRAY
# PIPE PRECEDENCE WARNING (#22 — v1.9): always wrap the cat fallback pair in () before piping.
# Wrong: cat A 2>/dev/null || cat B | python3   (when A exists, python3 is never called)
# Right: (cat A 2>/dev/null || cat B) | python3
(cat fixtures/design-reasoning/profile-enrichment-design-decisions.json 2>/dev/null || \
  cat fixtures/design-reasoning/saas-multi-tenancy-design-decisions.json) | python3 -c "
import json, sys; d=json.load(sys.stdin)
print('Format: JSON ARRAY, len=', len(d))
print('Keys:', list(d[0].keys()))
print('curriculumTier type:', type(d[0]['curriculumTier']).__name__)  # must be int
print('qualityScore type:', type(d[0]['qualityScore']).__name__)       # must be float
"
ls fixtures/contracts/t50.contract.json                              # contract format
ls fixtures/flow-definitions/profile-enrichment-t50.topology.json   # topology format
ls fixtures/arbiters/profile-enrichment-arbiters.bulk.ndjson        # arbiter format
\`\`\`
```

---

## DESIGN REFERENCES SECTION

```markdown
## DESIGN REFERENCES (read before every phase)

\`\`\`
FLOW-XX-DESIGN-SIMULATION-R1.md        ← authoritative — read in full before Phase 1
FLOW-XX-DESIGN-SIMULATION-R2.md        ← gap corrections — read after R1
  If absent: corrections listed inline in this file's DESIGN REFERENCES block.
  cp /mnt/user-data/outputs/FLOW-XX-DESIGN-SIMULATION-R2.md \
     docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R2.md

API constraints (non-negotiable):
  createCloudEvent({ eventType, source, tenantId, data })  ← 'eventType' not 'type'
  validateCloudEvent returns [boolean, string[]]           ← always destructure
  event['type'] to access CloudEvents type field
  DataProcessResult.failure(code, message)                 ← both args required
  No FabricType.SCOPED_MEMORY                              ← use FabricType.CORE

Format references:
  fixtures/design-reasoning/profile-enrichment-design-decisions.json  ← JSON ARRAY
    curriculumTier: int (1)      qualityScore: float (0.91)
  fixtures/rag-patterns/arch--[most-recent].json
    fields: patternId, patternType, flowId, domainId, seededAt,
            archetype, tags[], keywords, ironRules[], codeSnippet
    NOTE: `summary` and `antiPattern` do NOT exist — do not add them
  fixtures/contracts/t50.contract.json
    fields: taskTypeId, flowId, name, archetype, domainId, seededAt,
            stackCoupling{}, factories[], ironRules[]{id,rule,severity},
            namedChecks[], machineComponents[], freedomComponents[]
  fixtures/flow-definitions/profile-enrichment-t50.topology.json
    8 nodes: validate → rag-retrieve → decompose → ai-generate →
             validate → score → route → feedback
  fixtures/arbiters/profile-enrichment-arbiters.bulk.ndjson
    ndjson format — one JSON object per line
\`\`\`
```

---

## PHASE 1 — DESIGN-REASONING FIXTURES + RAG PATTERNS

```markdown
## PHASE 1 — DESIGN-REASONING FIXTURES + RAG PATTERNS

### What this phase produces
- `fixtures/design-reasoning/{slug}-design-decisions.json` — [N] DR triples
- `fixtures/rag-patterns/[pattern-name-001].json` — [N] arch pattern files

### P1-1: Inventory check
\`\`\`bash
ls fixtures/design-reasoning/{slug}-design-decisions.json 2>/dev/null && echo "EXISTS" || echo "MISSING"
# Must NOT exist yet
\`\`\`

### P1-2: {slug}-design-decisions.json
Derive every record from FLOW-XX-DESIGN-SIMULATION-R1.md + R2.md.
**Read the full simulation before writing a single record.**

Format: JSON ARRAY (not object with 'decisions' key).

#### COMPACT FORMAT MAPPING (when simulation uses documentation-friendly names)

\`\`\`
context:           → absorbed into teachingPoint
proposed:          → negativeExample
challenge:         → absorbed into teachingPoint
resolution:        → positiveExample
principleApplied:  → absorbed into teachingPoint
discriminatingConstraint → discriminatingConstraint (keep as-is)
\`\`\`

`teachingPoint` = [principle] + [why proposed fails]. One paragraph.

Fields the compact format omits — must be added:
  flowId, domainId, seededAt, tags, keywords, connectionType, knowledgeScope

#### DR fixture template (#F)

\`\`\`json
[
  {
    "patternId": "FLOW-XX-DR-01",
    "patternType": "DESIGN_REASONING",
    "flowId": "FLOW-XX",
    "domainId": "[domain area]",
    "seededAt": "YYYY-MM-DDT00:00:00Z",
    "teachingPoint": "[principle + why wrong fails — one paragraph]",
    "positiveExample": "[from resolution / chosen]",
    "negativeExample": "[from proposed / rejected]",
    "discriminatingConstraint": "[one constraint separating chosen from rejected]",
    "appliesTo": ["FLOW-XX+1", "FLOW-XX+2", "FLOW-XX+3"],
    "curriculumTier": 1,
    "qualityScore": 0.93,
    "sourceDocument": "FLOW-XX-DESIGN-SIMULATION-R1.md (DR-XX-A)",
    "tags": ["[tag1]", "[tag2]"],
    "keywords": "[space-separated retrieval terms]",
    "connectionType": "FLOW_SCOPED",
    "knowledgeScope": "GLOBAL"
  }
]
\`\`\`

Forbidden fields: `category`, `sourceFlow`, `observedIn` — do NOT add.

### P1-3: RAG pattern fixtures
\`\`\`json
{
  "patternId": "PATTERN-NAME-001",
  "patternType": "ARCH_PATTERN",
  "flowId": "FLOW-XX",
  "domainId": "[domain]",
  "seededAt": "YYYY-MM-DDT00:00:00Z",
  "archetype": "[ROUTING|DATA_PIPELINE|VALIDATION|TRANSACTION|ORCHESTRATION|SCHEDULED]",
  "tags": ["[tag1]"],
  "keywords": "[space-separated]",
  "teachingPoint": "[what to do and why]",
  "ironRules": ["[rule 1]", "[rule 2]"],
  "codeSnippet": "[short pseudo-code; embed negative as comment]",
  "appliesTo": ["FLOW-XX+1", "FLOW-XX+2"],
  "curriculumTier": 1,
  "qualityScore": 0.93,
  "sourceDocument": "FLOW-XX-DESIGN-SIMULATION-R1.md",
  "connectionType": "FLOW_SCOPED",
  "knowledgeScope": "GLOBAL"
}
\`\`\`

Forbidden fields: `summary`, `antiPattern`.

### Phase 1 gate

**Note (#21 — v1.9):** The gate checks ALL 17 required fields. Prior versions checked only 4
structural fields — the remaining 13 content fields were missing from every flow before FLOW-14.
Do not copy an older gate template. Use this one verbatim.

\`\`\`bash
python3 -c "
import json
d = json.load(open('fixtures/design-reasoning/{slug}-design-decisions.json'))
assert isinstance(d, list), 'Must be JSON ARRAY'
assert len(d) >= 4, f'Expected >= 4 DR records, got {len(d)}'
for r in d:
    pid = r.get('patternId','?')
    # --- Type checks ---
    assert isinstance(r['curriculumTier'], int),   f'{pid}: curriculumTier not int'
    assert isinstance(r['qualityScore'],   float), f'{pid}: qualityScore not float'
    assert isinstance(r['appliesTo'],      list),  f'{pid}: appliesTo not list — must be JSON array, not Python-style string'
    assert len(r['appliesTo']) >= 2,               f'{pid}: appliesTo needs >= 2 flows'
    # --- Required scope fields ---
    assert r.get('connectionType') == 'FLOW_SCOPED', f'{pid}: connectionType missing or wrong'
    assert r.get('knowledgeScope') == 'GLOBAL',      f'{pid}: knowledgeScope missing or wrong'
    # --- Required content fields (v1.9 addition — closes systemic gap) ---
    assert r.get('patternId'),                         f'{pid}: patternId missing or empty'
    assert r.get('patternType') == 'DESIGN_REASONING', f'{pid}: patternType must be DESIGN_REASONING'
    assert r.get('flowId'),                            f'{pid}: flowId missing'
    assert r.get('seededAt','').endswith('Z'),         f'{pid}: seededAt must use Z suffix (e.g. 2026-04-13T00:00:00Z)'
    assert r.get('teachingPoint'),                     f'{pid}: teachingPoint missing or empty'
    assert r.get('positiveExample'),                   f'{pid}: positiveExample missing'
    assert r.get('negativeExample'),                   f'{pid}: negativeExample missing'
    assert r.get('discriminatingConstraint'),          f'{pid}: discriminatingConstraint missing'
    assert isinstance(r.get('tags',[]), list),         f'{pid}: tags must be a list'
    assert isinstance(r.get('keywords',''), str),      f'{pid}: keywords must be a string'
    # --- Forbidden fields ---
    assert 'summary' not in r,     f'{pid}: forbidden field summary'
    assert 'antiPattern' not in r, f'{pid}: forbidden field antiPattern'
    # --- Future-flow check ---
    for flow in r.get('appliesTo',[]):
        flownum = int(flow.replace('FLOW-',''))
        assert flownum > [CURRENT_FLOW_NUMBER], f'{pid}: appliesTo contains current or past flow {flow}'
print(f'OK: {len(d)} DR records, all 17 field checks passed')
"

python3 -c "
import json, glob
VALID = {'ROUTING','DATA_PIPELINE','VALIDATION','TRANSACTION','ORCHESTRATION','SCHEDULED'}
files = [f for f in glob.glob('fixtures/rag-patterns/*.json')
         if any(p in f for p in [{slug-specific-pattern-names}])]
assert len(files) >= 4, f'Expected >= 4 RAG pattern files, got {len(files)}'
for f in files:
    d = json.load(open(f))
    pid = d.get('patternId','?')
    assert d.get('archetype') in VALID,               f'{pid}: invalid archetype (use ROUTING|DATA_PIPELINE|VALIDATION|TRANSACTION|ORCHESTRATION|SCHEDULED)'
    assert isinstance(d.get('curriculumTier'), int),  f'{pid}: curriculumTier not int'
    assert isinstance(d.get('qualityScore'), float),  f'{pid}: qualityScore not float'
    assert isinstance(d.get('appliesTo',[]), list),   f'{pid}: appliesTo not list'
    assert len(d.get('appliesTo',[])) >= 2,           f'{pid}: appliesTo needs >= 2 future flows'
    assert 'sourceDocument' in d,                     f'{pid}: missing sourceDocument'
    assert d.get('connectionType') == 'FLOW_SCOPED',  f'{pid}: connectionType missing'
    assert d.get('knowledgeScope') == 'GLOBAL',       f'{pid}: knowledgeScope missing'
    # --- RAG-specific content fields (v1.9 addition) ---
    assert d.get('patternId'),                        f'{pid}: patternId missing'
    assert d.get('patternType') == 'ARCH_PATTERN',    f'{pid}: patternType must be ARCH_PATTERN'
    assert d.get('flowId'),                           f'{pid}: flowId missing'
    assert d.get('seededAt','').endswith('Z'),        f'{pid}: seededAt must use Z suffix'
    assert d.get('teachingPoint'),                    f'{pid}: teachingPoint missing or empty'
    assert len(d.get('ironRules',[])) >= 1,           f'{pid}: ironRules must have >= 1 entry (not just an empty list)'
    assert isinstance(d.get('tags',[]), list),        f'{pid}: tags must be a list'
    assert isinstance(d.get('keywords',''), str),     f'{pid}: keywords must be a string'
    assert 'codeSnippet' in d,                        f'{pid}: missing codeSnippet'
    assert 'summary' not in d,     f'{pid}: forbidden field summary (use teachingPoint)'
    assert 'antiPattern' not in d, f'{pid}: forbidden field antiPattern (use negativeExample in DR; codeSnippet comment in RAG)'
    for flow in d.get('appliesTo',[]):
        flownum = int(flow.replace('FLOW-',''))
        assert flownum > [CURRENT_FLOW_NUMBER], f'{pid}: appliesTo contains current or past flow {flow}'
print(f'OK: {len(files)} RAG pattern files, all checks passed')
"

cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:" | tail -1
# Gate: failures === 0
\`\`\`

⛔ STOP — deliver Phase 1 files, await approval.
```

---

## PHASE 2 — CONTRACTS + TOPOLOGIES + ARBITERS + EVENT SCHEMAS

```markdown
## PHASE 2 — CONTRACTS + TOPOLOGIES + ARBITERS + EVENT SCHEMAS

### What this phase produces
- `fixtures/contracts/t[N].contract.json` — [N] files for key task types
- `fixtures/flow-definitions/{slug}-t[N].topology.json` — [N] topology files
- `fixtures/arbiters/{slug}-arbiters.bulk.ndjson` — [N] arbiter records (minimum 7)
- `fixtures/event-schemas/{slug}/[EventName].schema.json` — [N] files

**Read before writing:**
- `fixtures/contracts/t47.contract.json` or t50 — contract format
- `fixtures/flow-definitions/profile-enrichment-t50.topology.json` — topology format
- `fixtures/arbiters/profile-enrichment-arbiters.bulk.ndjson` — arbiter format
- `server/src/engine/node-handlers/validate.handler.ts` — valid namedCheck keys

**HARD RULE — namedChecks existence check:**
\`\`\`bash
grep -n "^  [a-z_]*:" server/src/engine/node-handlers/validate.handler.ts \
  | grep -v "passed\|default\|message\|variant"
# These are the ONLY valid namedCheck key names.
# Do NOT invent key names. An invented key silently passes without enforcing anything.
\`\`\`

### P2-1: Contracts
Select 3–5 most architecturally significant task types.
\`\`\`json
{
  "taskTypeId": "T[N]",
  "flowId": "FLOW-XX",
  "name": "[service name]",
  "archetype": "[archetype]",
  "domainId": "[domain]",
  "seededAt": "YYYY-MM-DDT00:00:00Z",
  "stackCoupling": { "database": ["[index]"], "queue": [], "aiEngine": [] },
  "factories": [{ "token": "[TOKEN]", "fabricType": "[FabricType]" }],
  "ironRules": [{ "id": "IR-XX-N-1", "rule": "[exact rule]", "severity": "BLOCKING" }],
  "namedChecks": ["[check_name from validate.handler.ts]"],
  "machineComponents": ["[MACHINE constant]"],
  "freedomComponents": ["[FREEDOM key]"]
}
\`\`\`

### P2-2: Topologies
8 standard nodes: validate → rag-retrieve → decompose → ai-generate →
validate → score → route → feedback.

**n4 (ai-generate) and n8 (feedback) must have explicit content — not generic placeholders.**

n4 instruction format:
\`\`\`
"Generate [service-name].service.ts — [MACHINE constraint 1].
 [MACHINE constraint 2]. [MACHINE constraint 3]."
\`\`\`

n8 feedback (DPO) format:
\`\`\`
chosen: [pattern-name] — [what chosen code does]
rejected: [anti-pattern] — [what rejected code does]
discriminatingConstraint: SF-CHECK-N — [why chosen is correct]
\`\`\`

### P2-3: Arbiters (NDJSON — one record per line, no trailing newline)
Minimum **7** records per flow (6 domain + 1 scope_isolation — FC-32 / SK-526).

scope_isolation NDJSON template (always the final record):
\`\`\`ndjson
{"arbiterId": "{slug}-scope-isolation", "flowId": "FLOW-XX",
 "scope": ["T[first]", "...", "T[last]"],
 "arbiterType": "scope_isolation", "cfId": "FC-32",
 "description": "[list PRIVATE records; note any intentional GLOBAL reads]",
 "blockConditions": [
   "[record type] stored with knowledgeScope:GLOBAL",
   "tenantId absent from stored record",
   "tenantId sourced from parameter instead of ALS"
 ],
 "resolution": "scope_isolation: { modelToken: 'AI_SCOPE_ARBITER', blind: true, blockSemanticsBehavior: 'ANY_BLOCK_CLASS_REJECTS' }"}
\`\`\`

Gate check:
\`\`\`bash
python3 -c "
import json
lines = [l.strip() for l in open('fixtures/arbiters/{slug}-arbiters.bulk.ndjson') if l.strip()]
# IMPORTANT: each NDJSON arbiter record occupies TWO lines (index header + document).
# count by parsing objects, not by line count.
arbs = [json.loads(l) for l in lines if 'arbiterId' in l]
scope = [a for a in arbs if a.get('arbiterType') == 'scope_isolation']
# For a flow with N task nodes, expect N scope_isolation records (one per node):
assert len(scope) >= [NODE_COUNT], f'Expected >= [NODE_COUNT] scope_isolation records (one per node), got {len(scope)}'
# Verify each scope record covers a DISTINCT node — not [NODE_COUNT] records all for the same T-number:
scope_nodes = set(a.get('scope',[None])[0] for a in scope if a.get('scope'))
assert scope_nodes == {[T-NUMBERS]}, f'scope_isolation must cover all nodes, got {scope_nodes}'
# No isolated field — it is not a valid arbiterConfig field:
for a in arbs:
    assert 'isolated' not in a, f'isolated field in arbiter {a.get(\"arbiterId\")} — remove: isolated is not a valid arbiterConfig field'
print(f'OK: {len(arbs)} arbiters, {len(scope)} scope_isolation records, all nodes covered')
"
\`\`\`

**⚠️ `isolated: false` is NOT a valid arbiterConfig field (#21 — v1.9)**
Never include `isolated: false` in any scope_isolation block or any other arbiter. The field does
not exist in the interface and will be silently ignored if present — but it signals a copy-paste
error and will fail future schema validation. Remove it if found.

### P2-4: Event schemas
\`\`\`json
{
  "$schema": "http://json-schema.org/draft-07/schema#",
  "title": "[EventName]",
  "type": "object",
  "required": ["tenantId", "[entityId]", "[actorId]", "[timestamp]"],
  "properties": {
    "tenantId": { "type": "string" },
    "[entityId]": { "type": "string" }
  }
}
\`\`\`

⛔ STOP — deliver Phase 2 files, await approval.
```

---

## PHASE 3 — SEED SCRIPT

```markdown
## PHASE 3 — SEED SCRIPT

### What this phase produces
`rag-benchmark/seed_{slug}_patterns.py`

(Python convention: hyphens in slug become underscores in the script name.
 Example: `seed_transactional_event_participation_patterns.py`)

**Read `rag-benchmark/seed_profile_enrichment_patterns.py` before writing.
The interface must be identical.**

Required CLI interface:
\`\`\`bash
python seed_{slug}_patterns.py                          # seed all
python seed_{slug}_patterns.py --dry-run                # parse only
python seed_{slug}_patterns.py --es-endpoint http://...
python seed_{slug}_patterns.py --graphrag-url http://...
python seed_{slug}_patterns.py --skip-es
python seed_{slug}_patterns.py --skip-graphrag
\`\`\`

Script header:
\`\`\`python
"""
seed_{slug}_patterns.py — seeds fixtures/ into {slug} ES indices.
Usage:
  python seed_{slug}_patterns.py          # seed all
  python seed_{slug}_patterns.py --dry-run
"""
\`\`\`

Dry-run expected output:
\`\`\`
[dry-run] ARCH_PATTERN: [N] records
[dry-run] DESIGN_REASONING: [N] records
[dry-run] Total: [N] records — 0 errors
\`\`\`

ES index routing:
| patternType      | ES index                  |
|---|---|
| ARCH_PATTERN     | xiigen-rag-patterns       |
| CONFLICT_PATTERN | xiigen-rag-patterns       |
| SERVICE_PATTERN  | xiigen-rag-patterns       |
| DESIGN_REASONING | xiigen-planning-decisions |

**PLAN_EXEMPLAR guard:** Do NOT add `plan-{slug}-...` to RAG_FILES unless the fixture
physically exists. No standard TEACH-QA phase creates PLAN_EXEMPLAR fixtures.

GraphRAG workspace: `{slug}-design`
  — suffix is `-design`, NOT `-teaching`
  — examples: `profile-enrichment-design`, `completion-gamification-design`
  — teaching-pipeline.spec.ts tests query this exact workspace name

Rich text format (produce for every record):
\`\`\`python
# For rag-patterns records:
f"Pattern: {r['patternId']} | Type: {r['patternType']} | {r.get('codeSnippet','')[:200]}\n"
f"IronRules: {'; '.join(r.get('ironRules', []))} | Tags: {' '.join(r.get('tags', []))}"

# For design-reasoning records:
f"Decision: {r['patternId']} | Teaching: {r['teachingPoint']} | "
f"Positive: {r.get('positiveExample','')} | Constraint: {r.get('discriminatingConstraint','')}"
\`\`\`

### Phase 3 gate
\`\`\`bash
python3 rag-benchmark/seed_{slug}_patterns.py --dry-run 2>&1
# Expected: 0 errors, correct record counts
\`\`\`

⛔ STOP — deliver seed script, await approval.
```

---

## PHASE 4 — PROPER-FLOW DESIGN CONTRACT TESTS

```markdown
## PHASE 4 — PROPER-FLOW DESIGN CONTRACT TESTS

### What this phase produces
`server/test/e2e/{slug}/{slug}-proper-flow.e2e.spec.ts`
10 named tests: DC-01 through DC-10.

**Read before writing:**
- `server/test/e2e/{slug}/phase-*.spec.ts` — what's already covered
- `server/test/e2e/user-registration/*.e2e.spec.ts` — canonical e2e pattern
- `server/src/engine-contracts/contract-schema.ts` — EngineContract shape

### NEGATIVE ASSERTION TRAP — read before writing any DC test

Never use two-keyword negative assertions against iron rule text.

Iron rules commonly say what something is NOT:
```
"NOT_INVITED returns DataProcessResult.success — never failure"
```

A test like `expect(bad).toBeUndefined()` where `bad` matches both 'NOT_INVITED' and
'failure' FAILS against a correctly-written rule — the rule contains both words in
a negation context.

**Use positive routing assertions:**
\`\`\`typescript
// CORRECT
expect(ironRules.some(r => r.rule.includes('NOT_INVITED') && r.rule.includes('success'))).toBe(true);
\`\`\`

Also avoid fragile exact-text matches. Test **what the constraint achieves**, not the
exact phrasing of the exclusion.

### INT TEST FIELD VALIDATION RULE (#24 — v1.9)

Integration tests must only read contract fields that are defined in the contract schema.
The standard EngineContract schema fields are:
```
taskTypeId, flowId, name, archetype, domainId, seededAt, stackCoupling{},
factories[], ironRules[]{id,rule,severity}, namedChecks[], machineComponents[],
freedomComponents[]
```

**Before writing any INT test that reads a contract field, verify the field exists**
in the TEACH-QA P2-1 contract specification for that T-number. If it is not in P2-1,
the contract file will not have it, and the test will silently evaluate an empty/undefined
value — no compile error, no test failure, silent wrong result.

Common trap: accessing `t231['eventPatterns']` — this field does not exist in the schema.
`(t231['eventPatterns'] as string[]) ?? []` always evaluates to `[]`, making every
`toContain()` assertion silently pass-when-wrong.

**If you need to verify multi-event subscriptions:** read `stackCoupling.queue` or check
the iron rules text, both of which are actual schema fields.

### API constraints
\`\`\`typescript
// createCloudEvent — param is 'eventType' not 'type'
const event = createCloudEvent({ eventType: '[EventName]', source: '{slug}/tNN', tenantId: 'test', data: {...} });
// event['type'] gives the CloudEvents type field
const [valid, errors] = validateCloudEvent(event);  // returns [boolean, string[]]
DataProcessResult.failure('ERROR_CODE', 'message'); // BOTH args required
{ fabricType: FabricType.CORE }  // No SCOPED_MEMORY
\`\`\`

### Phase 4 gate
\`\`\`bash
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l
# Expected: 0

npx playwright test server/test/e2e/{slug}/{slug}-proper-flow.e2e.spec.ts 2>&1 | tail -3
# Expected: 10 passed, 0 failed
\`\`\`

⛔ STOP — deliver proper-flow spec, await approval.
```

---

## PHASE 5 — TEACHING PIPELINE PLAYWRIGHT EXTENSION

```markdown
## PHASE 5 — TEACHING PIPELINE PLAYWRIGHT EXTENSION

### What this phase produces
Extension of `client/e2e/teaching-pipeline.spec.ts` with SEED-[N]..SEED-[N+4].

### Test numbering — one valid action: READ THE FILE
\`\`\`bash
grep "SEED-" client/e2e/teaching-pipeline.spec.ts | grep -oE "SEED-[0-9]+" | \
  sort -t- -k2 -n | tail -1
# Current highest SEED number.
# Your flow starts at (highest + 1), uses 5 consecutive numbers.
\`\`\`
Do NOT use a formula. Historical anomalies mean any formula produces the wrong number.

### Required tests (5 per flow)
\`\`\`
SEED-[N+0]: {slug} design-reasoning fixture present in ES
SEED-[N+1]: FLOW-XX rag-patterns present in ES
SEED-[N+2]: [key pattern] is retrievable by keyword
SEED-[N+3]: nano-graphrag returns results for FLOW-XX design question
SEED-[N+4]: FLOW-XX arbiters seeded in xiigen-arbiters
\`\`\`

### Pattern: graceful skip when service unavailable
\`\`\`typescript
const ES = process.env.ES_URL ?? 'http://localhost:9200';
const GRAPHRAG = process.env.GRAPHRAG_URL ?? 'http://localhost:8080';

const response = await request.get(`${ES}/xiigen-rag-patterns/_count?q=flowId:FLOW-XX`);
if (response.status() === 503 || response.status() === 0) test.skip();

const health = await request.get(`${GRAPHRAG}/health`).catch(() => null);
if (!health || !health.ok()) { console.log('nano-graphrag not running'); test.skip(); }
\`\`\`

### Phase 5 gate
\`\`\`bash
npx playwright test client/e2e/teaching-pipeline.spec.ts 2>&1 | tail -10
# Expected: all tests skipped OR passed (0 failures)

cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l
# Expected: 0
\`\`\`

⛔ STOP — Phase 5 complete. Await approval before Phase 6.
```

---

## PHASE 6 — TOPOLOGY VISUAL QA

```markdown
## PHASE 6 — TOPOLOGY VISUAL QA

### What this phase produces
`client/e2e/topology/{slug}-topology-qa.spec.ts`
8 tests: TVQ-01..TVQ-08

### What TopologyViewer renders — read before writing tests

TopologyViewer renders **cycle pipeline topology fixtures** from
`fixtures/flow-definitions/{slug}-*.topology.json`.
Node IDs are n1..n8 — NOT the T[N] service graph.

\`\`\`
n1  validate       — iron rule pre-check
n2  rag-retrieve   — fetch patterns from ES / nano-graphrag
n3  decompose      — break intent into steps
n4  ai-generate    — 3 models in parallel (multi-model convergence)
n5  validate       — score generated output
n6  score          — rate against iron rules
n7  route          — ≥85% → promote (n8); <85% → iterate (n3)
n8  feedback       — DPO triple: chosen model vs rejected
\`\`\`

### Prerequisites — confirm before writing tests

**#E1 — data-node-id attribute (required for TVQ-03..05)**
In `client/src/components/topology/TopologyViewer.tsx`:
\`\`\`typescript
interface TopologyNodeData {
  label: string; nodeType: string;
  nodeId: string;    // ← add
  nodeState: NodeStateEntry | null;
}
\`\`\`
In the node mapping useEffect, pass `nodeId: n.id`.
In `TopologyNodeComponent`, add: `data-node-id={data.nodeId}` `data-node-type={data.nodeType}`.

**#E2 — /flow-viewer/:flowId route**
\`\`\`typescript
// App.tsx
import { TopologyViewerPage } from './pages/TopologyViewerPage';
<Route path="/flow-viewer/:flowId" element={<TopologyViewerPage />} />
\`\`\`
\`\`\`typescript
// client/src/pages/TopologyViewerPage.tsx
import { useParams, useSearchParams } from 'react-router-dom';
import { TopologyViewer } from '../components/topology/TopologyViewer';
export function TopologyViewerPage() {
  const { flowId = '' } = useParams<{ flowId: string }>();
  const [searchParams] = useSearchParams();
  const runId = searchParams.get('runId') ?? undefined;
  return <div style={{ height: '100vh' }}><TopologyViewer flowId={flowId} runId={runId} /></div>;
}
\`\`\`

\`\`\`bash
grep "data-node-id" client/src/components/topology/TopologyViewer.tsx | wc -l
# Expected: >= 1  (E1 applied)
grep "flow-viewer" client/src/App.tsx | wc -l
# Expected: >= 1  (E2 applied)
\`\`\`

### TVQ test spec structure

The spec file name uses the semantic slug. The FLOW_ID constant inside the spec
is the `FLOW-XX` data value (flowId field) — not a path.

\`\`\`typescript
// File name: client/e2e/topology/{slug}-topology-qa.spec.ts
// e.g. transactional-event-participation-topology-qa.spec.ts

import { test, expect } from '@playwright/test';

const FLOW_ID  = 'FLOW-XX';   // ← data value — keep as FLOW-XX
const BASE_URL = process.env.CLIENT_URL ?? 'http://localhost:5173';
const TOPO_URL = `${BASE_URL}/flow-viewer/${FLOW_ID}`;
const NODE_COUNT = 8;  // ← from fixture; replace if non-standard

test.beforeEach(async ({ page }) => {
  // Always mock topology API — no Docker dependency
  await page.route(`**/api/topology/${FLOW_ID}`, async route => {
    if (!route.request().url().includes('/run/')) {
      await route.fulfill({ status: 200, contentType: 'application/json',
        body: JSON.stringify(TOPOLOGY_FIXTURE) });
    } else { await route.continue(); }
  });
});

test('TVQ-01: topology graph renders without error', async ({ page }) => {
  try { await page.goto(TOPO_URL, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('topology-graph')).toBeVisible();
  await expect(page.locator('text=Error:')).toHaveCount(0);
});

test('TVQ-02: all N cycle nodes render', async ({ page }) => {
  try { await page.goto(TOPO_URL, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  const nodes = await page.getByTestId('topology-node').all();
  expect(nodes.length).toBe(NODE_COUNT);  // exact — never approximate
});

test('TVQ-03: ai-generate node (n4) present — requires #E1', async ({ page }) => {
  try { await page.goto(TOPO_URL, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  const n4 = page.locator('[data-node-id="n4"]');
  await expect(n4).toBeVisible();
  await expect(n4).toContainText(/ai-generate/i);
});

test('TVQ-04: feedback node (n8) present — requires #E1', async ({ page }) => {
  try { await page.goto(TOPO_URL, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  const n8 = page.locator('[data-node-id="n8"]');
  await expect(n8).toBeVisible();
  await expect(n8).toContainText(/feedback/i);
});

test('TVQ-05: route node (n7) describes both outcomes', async ({ page }) => {
  try { await page.goto(TOPO_URL, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  const n7 = page.locator('[data-node-id="n7"]');
  await expect(n7).toBeVisible();
  await expect(n7).toContainText(/route|score|iterate|promote/i);
});

test('TVQ-06: SUSPENDED run state shows suspension card and resume button', async ({ page }) => {
  await page.route(`**/api/topology/${FLOW_ID}/run/**`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ topology: TOPOLOGY_FIXTURE, runState: {
        nodeStates: { 'n4': { status: 'SUSPENDED' } },
        cycle2Traces: [], cycle3Traces: [], subFlows: [],
        suspensions: [{ id: 's1', nodeId: 'n4',
          gapDescription: 'Missing constraint', gapRequest: ['What is the TTL?'] }],
      }}) });
  });
  try { await page.goto(`${TOPO_URL}?runId=tvq-mock`, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('node-suspended-badge')).toBeVisible();
  await expect(page.getByTestId('resume-button')).toBeVisible();
});

test('TVQ-07: Cycle 2 DPO score spread chart renders', async ({ page }) => {
  await page.route(`**/api/topology/${FLOW_ID}/run/**`, async route => {
    await route.fulfill({ status: 200, contentType: 'application/json',
      body: JSON.stringify({ topology: TOPOLOGY_FIXTURE, runState: {
        nodeStates: {},
        cycle2Traces: [
          { round: 1, stepText: 'Step 1', chosen: { model: 'gemini', score: 8.7 },
            rejected: { model: 'gpt-4', score: 6.2 }, discarded: null },
          { round: 2, stepText: 'Step 2', chosen: { model: 'gpt-4', score: 9.1 },
            rejected: { model: 'gemini', score: 7.4 }, discarded: null },
        ],
        cycle3Traces: [], subFlows: [], suspensions: [],
      }}) });
  });
  try { await page.goto(`${TOPO_URL}?runId=tvq-mock`, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  await expect(page.getByTestId('score-spread-chart')).toBeVisible();
});

test('TVQ-08: no JavaScript errors on topology load', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', err => errors.push(err.message));
  try { await page.goto(TOPO_URL, { timeout: 10_000 }); }
  catch { test.skip(true, 'Dev server not running'); }
  await page.waitForLoadState('networkidle');
  expect(errors).toHaveLength(0);
});
\`\`\`

### What NOT to write — negative examples

\`\`\`typescript
// ❌ WRONG: T-numbers as node IDs (T112 is a task type, not a topology node)
await expect(page.locator('[data-testid="topology-node-T112"]')).toBeVisible();
// Correct: topology node IDs are n1..n8

// ❌ WRONG: approximate count (passes when nodes are missing)
expect(nodes.length).toBeGreaterThan(0);
// Correct: expect(nodes.length).toBe(NODE_COUNT)  — exact from fixture

// ❌ WRONG: service-level inline constraint via edge absence
await expect(page.locator('[data-edge-source="T112"]')).toHaveCount(0);
// INLINE_ONLY is enforced by BFA rules, not cycle topology edges

// ❌ WRONG: live API (requires Docker)
await page.goto(`${TOPO_URL}?runId=some-real-run-id`);
// TVQ-06 and TVQ-07 must use page.route() to mock
\`\`\`

### Phase 6 gate
\`\`\`bash
cd client && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l
# Expected: 0

npx playwright test client/e2e/topology/{slug}-topology-qa.spec.ts 2>&1 | tail -5
# Expected: 8 passed, 0 failed
# Screenshots: docs/e2e-snapshots/{slug}/topology-tvq-{01..08}.png
\`\`\`

⛔ STOP — all 6 phases complete.
```

---

## TEACH-QA END SECTIONS

```markdown
## CONSTRAINTS (APPLY TO EVERY PHASE)

API constraints (non-negotiable):
- `createCloudEvent` param is `eventType` not `type`
- `validateCloudEvent` returns `[boolean, string[]]` — always destructure
- `DataProcessResult.failure` requires TWO arguments
- No `FabricType.SCOPED_MEMORY` — use `FabricType.CORE`
- Named checks: only use keys that EXIST in validate.handler.ts — read file first

Fixture format constraints:
- `curriculumTier` is an int (1), never string `"1"`
- `qualityScore` is a float (0.91), never string `"0.91"`
- `{slug}-design-decisions.json` is a JSON ARRAY, not object

Governance constraints:
- Session file naming: `FLOW-{XX}-{STAGE}-R{N}.md` — never `SESSION-` prefix
- Branch: claude/vigorous-margulis only
- Phase stops are absolute — no chaining phases without explicit approval
```

```markdown
## ISSUE INVENTORY FORMAT

Before every ⛔ STOP:
\`\`\`
ISSUE INVENTORY:
  ISSUE-NNN: <description> → FIXED | DEFERRED (reason) | EXCEPTION (approval)
\`\`\`
If no issues: `ISSUE INVENTORY: NONE`
```

```markdown
## DELIVERY SUMMARY FORMAT

\`\`\`
DELIVERY SUMMARY
================
Phase 1: fixtures/design-reasoning/{slug}-design-decisions.json — [N] records
         fixtures/rag-patterns/: [N] files
Phase 2: contracts: [N] files / topologies: [N] files / arbiters: [N] records ([N-1] domain + 1 scope_isolation) / schemas: [N] files
Phase 3: rag-benchmark/seed_{slug}_patterns.py — [N] records, dry-run 0 errors
Phase 4: {slug}-proper-flow.e2e.spec.ts — DC-01..DC-10, [N] tests, 0 failures
Phase 5: teaching-pipeline.spec.ts extended with SEED-[N]..SEED-[N+4]
Phase 6: client/e2e/topology/{slug}-topology-qa.spec.ts — TVQ-01..TVQ-08, 8 tests, 0 failures

Test delta: +[N] tests (baseline [M])
Failures: 0
Commit: <hash>
\`\`\`

**Cascade rule:** If scope_isolation is added to the arbiter NDJSON in any phase,
update ALL deliverable summary lines referencing that file's count.
```

---

# DOCUMENT 3 — FLOW-XX-YY-IMPLEMENTATION-PLAN-vN.md

## What this document is

A complete execution plan for Claude Code to implement TWO flows.
Flows are paired (FLOW-03+04, FLOW-05+06, FLOW-07+08) because they share
corpus seeding, test infrastructure, and sometimes fabric interfaces.

## File naming

```
FLOW-03-04-IMPLEMENTATION-PLAN-v2.md
FLOW-05-06-IMPLEMENTATION-PLAN-v1_0.md
```

Version: v1.0→v1.1 = minor corrections. v1.1→v2.0 = structural additions.

## File header

```markdown
# FLOW-XX + FLOW-YY IMPLEMENTATION PLAN FOR CLAUDE CODE
## Version: [N.N] | Date: YYYY-MM-DD
## Covers: [FLOW-XX human name] (T[range]) + [FLOW-YY human name] (T[range])
## Protocol: Mirrors FLOW-[prev pair] execution pattern exactly
## Fixes: [list of what changed — only for corrections versions]
```

---

## PLAN PURPOSE SECTION

```markdown
## PURPOSE — WHY THIS PLAN EXISTS

This plan teaches XIIGen to resolve complex systems design. Each phase is:
  (a) a working implementation that passes tests, AND
  (b) a training signal — the code is the DPO "chosen" output.

The design simulations are the authoritative source for every iron rule,
arbiter constraint, and negative example in this plan.
```

---

## ABSOLUTE GATE SECTION

```markdown
## ABSOLUTE GATE — APPLIES BEFORE EVERY ⛔ STOP

\`\`\`bash
cd server && npx jest --passWithNoTests 2>&1 | grep -E "Tests:|passed|failed" | tail -3
# Gate: failures === 0, count ≥ session-start baseline

cd server && npx tsc --noEmit 2>&1 | grep -v "TS5101" | grep "error" | wc -l
# Expected: 0

cd server && npm run lint 2>&1 | grep -c "warning\|error"
# Expected: 0 — --max-warnings 0 means warnings ARE build failures
# See Rule 12 for correct suppression pattern before adding any eslint-disable comment

cd client && npx tsc --noEmit 2>&1 | grep -v "TS5101" | grep "error" | wc -l
# Expected: 0 — required when any phase produces client files

cd client && npm run build 2>&1 | grep -c "^Error:"
# Expected: 0 — catches vite-specific errors tsc alone misses
\`\`\`

**No phase is complete unless all five gates pass.**
Client gates are NOT optional when a phase writes React pages, hooks, or Playwright specs.
```

---

## CRITICAL NOTE SECTION (if prior partial implementation exists)

```markdown
## CRITICAL NOTE — FLOW-YY PRIOR PHASE A

[status of prior partial implementation]

The new design simulation ([file]) defines T[range].
These are DIFFERENT services with richer iron rules. The new services go in:
  `server/src/engine/flows/{slug-yy}/`

The old services in `[old-directory]/` remain untouched. No conflict.
```

---

## DESIGN REFERENCES SECTION

```markdown
## DESIGN REFERENCES (READ BEFORE EVERY PHASE)

\`\`\`bash
# Copy R2 documents into repo before Phase 1A (if R2 produced externally)
cp /mnt/user-data/outputs/FLOW-XX-DESIGN-SIMULATION-R2.md \
   docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R2.md
\`\`\`

\`\`\`
FLOW-XX design (read all before any Phase 1 work):
  docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R1.md
  docs/sessions/FLOW-XX/FLOW-XX-DESIGN-SIMULATION-R2.md
  server/src/engine-contracts/{slug}-contracts.ts

FLOW-YY design (read all before any Phase 2 work):
  docs/sessions/FLOW-YY/FLOW-YY-DESIGN-SIMULATION-R1.md
  docs/sessions/FLOW-YY/FLOW-YY-DESIGN-SIMULATION-R2.md
  server/src/engine-contracts/{slug-yy}-contracts.ts

Pattern reference (canonical service structure — read in this order):
  server/src/engine/flows/user-registration/registration.service.ts
  server/src/engine/flows/event-management/event-creation.service.ts    ← most recent
  server/src/engine/flows/event-attendance/rsvp-orchestrator.service.ts ← atomic pattern
\`\`\`
```

---

## STATE FILE SECTION

```markdown
## STATE FILE

Save after every phase to: `docs/sessions/FLOW-XX-YY/FLOW-XX-YY-IMPL-STATE.json`

\`\`\`json
{
  "plan": "FLOW-XX-YY-IMPLEMENTATION",
  "slugs": { "xx": "{slug}", "yy": "{slug-yy}" },
  "phases": {
    "PHASE-0":  { "status": "NOT_STARTED",
                  "label": "Corpus seeding + BFA contracts ({slug} + {slug-yy})" },
    "PHASE-1A": { "status": "NOT_STARTED",
                  "label": "T[N] [ServiceName]", "expected_tests": 0 },
    "PHASE-N":  { "status": "NOT_STARTED",
                  "label": "FLOW-XX Teaching QA (FLOW-XX-TEACH-QA-R0 Phases 1-6)" },
    "PHASE-N+1":{ "status": "NOT_STARTED",
                  "label": "FLOW-YY Teaching QA (FLOW-YY-TEACH-QA-R0 Phases 1-6)" }
  },
  "test_counts": { "server_unit": 0, "integration": 0, "e2e_playwright": 0 },
  "issues": []
}
\`\`\`

**RULE: Set `expected_tests` for every implementation phase before execution begins.**
Mismatches between `expected_tests` and listed tests produce false early stops.
```

**PHASE ordering rule:** PHASE-0 (corpus seeding) always first.
Teaching QA phases always last — after all service implementations and React pages.

---

## PHASE 0 — CORPUS SEEDING + BFA CONTRACTS

```markdown
## PHASE 0 — CORPUS SEEDING + BFA CONTRACTS

### What it produces
- `server/src/bootstrap/history-seeds/{slug}-design-corpus.json`     ([N] DR + [N] RAG)
- `server/src/bootstrap/history-seeds/{slug-yy}-design-corpus.json`  ([N] DR + [N] RAG)
- `server/src/engine-contracts/{slug}-contracts.ts`
- `server/src/engine-contracts/{slug}-bfa-rules.ts`
- `server/src/engine-contracts/{slug-yy}-contracts.ts`
- `server/src/engine-contracts/{slug-yy}-bfa-rules.ts`
- Both BFA rule sets wired into `engine-bootstrapper.ts`

### P0-1: T-number collision check
\`\`\`bash
for T in T[N] T[N+1] T[N+2]; do
  count=$(grep -r "taskTypeId.*\"${T}\"" server/src/engine-contracts/ 2>/dev/null | wc -l)
  echo "${T}: ${count} existing references"
done
# Expected: 0 for each — any > 0 means that T-number is already allocated elsewhere
# IMPORTANT: "0 for each" means zero. If any value > 0, STOP and report before creating
# any contracts. Do NOT proceed. Do NOT overwrite the existing allocation.
# The comment "count only from {slug}-contracts.ts" is WRONG — if it shows > 0 from
# any file, that is a collision regardless of which file it is in.
\`\`\`

Inventory check:
\`\`\`bash
ls server/src/bootstrap/history-seeds/
# Must NOT have {slug}/{slug-yy} corpus yet
ls server/src/engine-contracts/{slug}* 2>/dev/null && echo "EXISTS" || echo "MISSING"
\`\`\`

### P0-2: {slug}-design-corpus.json

Derive from design simulation. curriculumTier: int, qualityScore: float.

Verify before commit:
\`\`\`bash
python3 -c "
import json
data = json.load(open('server/src/bootstrap/history-seeds/{slug}-design-corpus.json'))
for r in data:
    pid = r.get('patternId', '?')
    assert isinstance(r['curriculumTier'], int), f'{pid}: curriculumTier not int'
    assert isinstance(r['qualityScore'], float), f'{pid}: qualityScore not float'
    at = r.get('appliesTo')
    if at is not None:
        assert isinstance(at, list), f'{pid}: appliesTo must be JSON array'
        for flow in at:
            flownum = int(flow.replace('FLOW-',''))
            assert flownum > [CURRENT_FLOW_NUMBER], f'{pid}: appliesTo contains past flow {flow}'
    # v1.9: scope fields required on ALL corpus records:
    assert r.get('connectionType') == 'FLOW_SCOPED', f'{pid}: connectionType missing'
    assert r.get('knowledgeScope') == 'GLOBAL',      f'{pid}: knowledgeScope missing'
print(f'OK: {len(data)} records, all types + scope correct')
"
\`\`\`

### P0-3: BFA rules

Every flow's BFA rules file must have ≥4 entries.
First three: strongest iron rules (one per key SF-CHECK).
Fourth: FC-32 scope_isolation — ALWAYS, NEVER omit.

\`\`\`typescript
// server/src/engine-contracts/{slug}-bfa-rules.ts

export const {SLUG_UPPER}_BFA_RULES = [
  { ruleId: 'CF-XX-1', flowId: 'FLOW-XX',
    description: '[strongest MACHINE rule from design simulation]',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED', knowledgeScope: 'GLOBAL' },
  { ruleId: 'CF-XX-2', flowId: 'FLOW-XX',
    description: '[second key rule]',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED', knowledgeScope: 'GLOBAL' },
  { ruleId: 'CF-XX-3', flowId: 'FLOW-XX',
    description: '[third key rule]',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED', knowledgeScope: 'GLOBAL' },
  // CF-XX-4 is always scope_isolation — FC-32 — do not omit
  { ruleId: 'CF-XX-4', flowId: 'FLOW-XX',
    description: 'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526)',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED', knowledgeScope: 'GLOBAL' },
];
\`\`\`

Example (FLOW-09):
\`\`\`typescript
// server/src/engine-contracts/transactional-event-participation-bfa-rules.ts
export const TRANSACTIONAL_EVENT_PARTICIPATION_BFA_RULES = [
  { ruleId: 'CF-09-1', flowId: 'FLOW-09', ... },
  { ruleId: 'CF-09-4', flowId: 'FLOW-09', ... },
];
\`\`\`

Wire into engine-bootstrapper.ts:
\`\`\`typescript
import { TRANSACTIONAL_EVENT_PARTICIPATION_BFA_RULES } from
  './engine-contracts/transactional-event-participation-bfa-rules';
\`\`\`

**BFA rules MUST be a non-empty TypeScript array — not comment stubs.**
Comment stubs pass `tsc` and `jest` but enforce nothing. Zero rules = seedBfaRules() does nothing silently.
```

---

## SERVICE PHASE TEMPLATE (PHASE-1A through PHASE-N)

```markdown
## PHASE-1A — T[N] [ServiceName]

### What this phase produces
`server/src/engine/flows/{slug}/[service-name].service.ts`
`server/test/e2e/{slug}/phase-a.spec.ts`

**Read before writing:**
\`\`\`
FLOW-XX-DESIGN-SIMULATION-R[N].md: NODE [X][N] (all four dimensions)
FLOW-XX-DESIGN-SIMULATION-R[N].md: NEGATIVE examples for applicable arbiters
server/src/engine/flows/[most-recent-service].service.ts  ← structural pattern
server/test/e2e/[most-recent-slug]/phase-a.spec.ts        ← test pattern
\`\`\`

### Iron rules (from design simulation)
\`\`\`typescript
// MACHINE: [rule 1 — from IronRules arbiter]
// MACHINE: [rule 2]
// FREEDOM: [config key] — default value
\`\`\`

**NEGATIVE example guards:**
\`\`\`typescript
// This design was REJECTED (score [X.X]):
//   [exact rejected pattern from negative example]
// The correct design:
//   [exact chosen pattern from positive example]
\`\`\`

### Tests ([N] tests): named [T-ID]-N

[T-ID]-1: [test description — maps to iron rule 1]
[T-ID]-2: [test description — maps to iron rule 2]
[T-ID]-N: [scope_isolation arbiter check]

### Gate
\`\`\`bash
cd server && npx jest --testPathPattern="phase-a\\.spec" 2>&1 | tail -3
# Expected: [N] passing, 0 failed
cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep "error" | wc -l
# Expected: 0
cd server && npm run lint 2>&1 | grep -c "warning\|error"
# Expected: 0 — fix lint before ⛔ STOP; see Rule 12 for suppression pattern
\`\`\`

⛔ STOP — deliver service + tests, await approval.
```

---

## INTEGRATION TEST PHASE TEMPLATE

```markdown
## PHASE-N — FLOW-XX INTEGRATION TESTS

### What this phase produces
`server/test/e2e/{slug}/{slug}-integration.spec.ts`

Integration tests verify cross-service iron rules:
1. Completion event name is exact MACHINE literal
2. Completion event fires only when correct gate conditions are met
3. Time-decoupled process does NOT block the main completion gate
4. Cross-flow event payload contains all fields downstream consumers require

⛔ STOP — deliver integration spec, await approval.
```

---

## REACT PAGES + PLAYWRIGHT PHASE TEMPLATE

```markdown
## PHASE-N — FLOW-XX REACT PAGES + PLAYWRIGHT

### What this phase produces
\`\`\`
client/src/pages/{slug}/
  [Page1Name]Page.tsx
  [Page2Name]Page.tsx

client/e2e/{slug}.spec.ts
\`\`\`

### Playwright tests (R-01..R-10):
\`\`\`
R-01: [test mapping to page 1]
R-02: [test mapping to a key iron rule]
...
R-10: [edge case or error state]
\`\`\`

⛔ STOP — gate: failures===0, screenshots in docs/e2e-snapshots/{slug}/, await approval.
```

---

## REACT PAGES STARTER TEMPLATES (v1.15 — SK-539)

Before writing any `*.tsx` file, check whether the page matches one of these
seven templates. A matching page **must** use the template as its starting point.
Every template pre-satisfies the FC-18 checks listed alongside it.

### T-1 — AI-Proposal-Review

**Match:** Page shows an AI-generated proposal with a confidence score and an
approve/reject decision form.

**Used by:** FLOW-24 safety gate, FLOW-26 5-arbiter gate, FLOW-31 design
intelligence, FLOW-35 meta arbitration.

**Required fields:** proposalId · topic · draftedBy · draftedAt ·
automated score (0.0–1.0 with classification label) · evidence panel
(citations, simulation runs, regression count) · APPROVE button +
REJECT button with mandatory `reason` textarea (min 20 chars) ·
approvedBy / rejectedBy populated on submit.

**FC-18 checks pre-satisfied:** UX-01, UX-03, UX-04, UX-23, UX-24, UX-27

---

### T-2 — Bootstrap-Checklist

**Match:** Page shows sequential system initialization or upgrade steps with
per-step status.

**Used by:** FLOW-33 system bootstrap, FLOW-47 module upgrade wizard.

**Required fields:** boot/upgrade ID · start timestamp · step list (name,
status chip: NOT_STARTED / IN_PROGRESS / COMPLETE / FAILED, elapsed time) ·
progress bar (N of M) · current step highlighted · failure detail panel
(error code + recovery suggestion) · terminal state: WARM/READY or FAILED
with retry.

**FC-18 checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23

---

### T-3 — Arbiter-Progress

**Match:** Page shows N-of-M automated gate verdicts. No manual action
button — the gate fires automatically on consensus.

**Used by:** FLOW-26 5-arbiter consensus, FLOW-35 meta arbitration,
FLOW-44 AI self-modification validation.

**Required fields:** gate ID · triggered-by source · per-arbiter verdict
chip list (arbiter name + PENDING / PASS / NEEDS_REVISION / REJECTED) ·
"N of M verdicts received" counter · consensus result panel (shown when
all N received): final verdict + classification.

**FC-18 checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23

---

### T-4 — ParallelFlowMonitor

**Match:** Page shows multiple child flows dispatched in parallel with
individual per-flow status tracking.

**Used by:** FLOW-43 meta flow orchestration.

**Required fields:** orchestration ID · triggered-by · enqueued timestamp ·
child flow swimlane list (flow name + status chip + elapsed time) ·
"N of M child flows complete" counter · failed flow detail (expandable) ·
completion summary panel.

**FC-18 checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23

---

### T-5 — AiSelfModificationReview

**Match:** Page shows an AI-generated self-modification proposal with a
before/after diff, simulation evidence, and a human review decision.

**Used by:** FLOW-44 AI self-modification.

**Required fields:** proposalId · target (skill/prompt/arbiter) ·
changeType · draftedBy · diff preview panel (before vs after, side-by-side
or unified) · simulation evidence (simulationRuns integer, regressionCount
integer, blastRadius LOW/MEDIUM/HIGH/CRITICAL) · auto-rollback threshold
indicator (non-dismissable: "Will auto-rollback if quality drops X%") ·
APPROVE button (R-ENGINE-ARCHITECT role check) + REJECT with mandatory
reason textarea · rejection reason stored in audit trail.

**FC-18 checks pre-satisfied:** UX-01, UX-03, UX-04, UX-23, UX-24, UX-27

---

### T-6 — CycleTopologyDiff

**Match:** Page shows a before/after topology graph for a cycle chain
extension with an insertion point marker.

**Used by:** FLOW-45 cycle chain extension.

**Required fields:** cycle identity (cycleId, flowId, baselineNodes) ·
before-graph (rendered via `TopologyViewer`) · insertion point highlight ·
after-graph (new node inserted, highlighted) · validation result badge
(PASS / FAILED + reason) · Apply button (disabled until validation PASS;
confirmation dialog on click).

**Component dependency:** `client/src/components/topology/TopologyViewer.tsx`

**FC-18 checks pre-satisfied:** UX-01, UX-05, UX-14, UX-23

---

### T-7 — AgentSessionMonitor

**Match:** Page shows a platform agent execution session with a stage
pipeline, verdicts at each gate, and a consent decision widget.

**Used by:** FLOW-46 platform agent.

**Required fields:** sessionId · userIntent (verbatim) · submittedBy ·
startedAt · execution stage pipeline (PlatformContextEnricher → AF-4 →
SuperJudgeArbiter → AgentActionPublisher → PatternContributor, each with
IN_PROGRESS / COMPLETE / FAILED / SKIPPED chip) · SuperJudge verdict panel
(DEFER_TO_AF9 / OVERRIDE_PASS / OVERRIDE_BLOCK + reason) · action dispatch
panel (actionType chip + target + af9Verdict) · consent pending widget
(SHARE vs KEEP_PRIVATE radio + explanation + Submit) · session summary
panel at terminal state.

**FC-18 checks pre-satisfied:** UX-01, UX-05, UX-10, UX-23, UX-24, UX-29

---

## PHASE 7 — UI/UX COMPLIANCE (v1.15 — NEW)

Phase 7 runs after Phase 6 (Topology Visual QA) and before the final
⛔ STOP. It is mandatory for every session that produced React pages.

```markdown
## PHASE 7 — FLOW-XX UI/UX COMPLIANCE

### When this phase runs
After Phase 6 is ⛔ STOPped and approved. Before the session's final STOP.
Mandatory if this session produced ≥1 React page.

### What this phase produces
For every React page delivered in this session, one FC-18 Audit Trail record
(format defined in `fc-18-ui-ux-compliance-gate.md` §4).

Stored at: `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md`

### Step 1 — Role declaration check
For each page, confirm all four role questions are answered:
  Q1 ROLE_TIER:   declared? [PLATFORM_ENG | PLATFORM_OPS | TENANT_OPS |
                             TENANT_CONSUMER | PUBLIC]
  Q2 ROLE_GATE:   primary role named from SK-539 §3 taxonomy?
  Q3 ROUTE_GUARD: route prefix matches declared tier?
  Q4 VISIBILITY:  visibility scope declared from SK-539 §4 registry?

Undeclared answers → fix before proceeding.

### Step 2 — Run the BLOCK check matrix
For each page, run the 22-item BLOCK check matrix from FC-18 §3 Step 3.
Checks UX-01..UX-10 (baseline), UX-12 (mobile), UX-14 (destructive),
UX-16..UX-20 (route/role), UX-22..UX-27 (gates/consent).

Apply exemptions where declared (see FC-18 §5 exemptions table).

### Step 3 — Run the CONCERN check matrix
For each page, run UX-06, UX-07, UX-11, UX-13, UX-15, UX-21, UX-28.
CONCERNs do not block but must appear in the carry-forward inventory.

### Step 4 — Missing page registry check
If this session implements or extends any of these flows, verify the
corresponding missing page was created:

| Flow | Required page |
|---|---|
| FLOW-20 | `/settings/privacy` |
| FLOW-21 | `/forms/:schemaId` |
| FLOW-28 | `/blog` and `/blog/:slug` |
| FLOW-48 | `/settings/language` |

### Step 5 — UX review pass on captured PNGs
Review the Playwright PNGs captured in Phase 5/6 against the five most
common FC-18 failure modes:

  FM-1: Wrong route tier (UX-16 + UX-19) — privacy/consent pages under /admin/
  FM-2: TENANT_FACING badge on admin CRUD (UX-25)
  FM-3: Automated gate with manual action button (UX-23)
  FM-4: Internal IDs (T-numbers, CF-numbers) in tenant UI copy (UX-21)
  FM-5: Missing public page for implemented service (UX-20)

For each FM found: add to BLOCK findings in the Audit Trail.

### Step 6 — Produce FC-18 Audit Trail
Author `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` using the format
from `fc-18-ui-ux-compliance-gate.md` §4.

One Audit Trail record per page. Include:
  - Role declaration (Q1–Q4)
  - BLOCK check results (each UX-XX: PASS | BLOCK | EXEMPT + evidence)
  - CONCERN check results (each UX-XX: PASS | CONCERN + note)
  - Screen template used (T-N name or NONE + deviation reason if NONE)
  - Missing page registry check result
  - FC-18 verdict: APPROVED | BLOCK | CONCERN

### Phase 7 gate
```bash
# Verify Audit Trail file exists for each page
ls docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md
# Expected: file exists

# Verify no unclosed BLOCK findings
grep "BLOCK" docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md | grep -v "PASS\|EXEMPT\|NONE"
# Expected: 0 lines (or only lines that describe cleared findings)
```

⛔ STOP — deliver Phase 7 Audit Trail, await approval before session closes.
```

---

```markdown
## PHASE-N — FLOW-XX TEACHING QA (FLOW-XX-TEACH-QA-R0.md)

Execute Phases 1-6 from `FLOW-XX-TEACH-QA-R0.md` exactly as specified.

\`\`\`
Phase 1: fixtures/design-reasoning/{slug}-design-decisions.json + [N] RAG patterns
Phase 2: [N] contracts + [N] topologies + [N] arbiters + [N] event schemas
Phase 3: rag-benchmark/seed_{slug}_patterns.py — dry-run: [N] records, 0 errors
Phase 4: server/test/e2e/{slug}/{slug}-proper-flow.e2e.spec.ts (DC-01..DC-10)
Phase 5: client/e2e/teaching-pipeline.spec.ts extended with SEED-[N]..SEED-[N+4]
Phase 6: client/e2e/topology/{slug}-topology-qa.spec.ts (TVQ-01..TVQ-08)
\`\`\`

Each TEACH-QA phase requires a ⛔ STOP and explicit approval.

**Phase 6 prerequisites:**
\`\`\`bash
grep "data-node-id" client/src/components/topology/TopologyViewer.tsx | wc -l
# Expected: >= 1  (Enhancement #E1 applied)
grep "flow-viewer" client/src/App.tsx | wc -l
# Expected: >= 1  (Enhancement #E2 applied)
\`\`\`

⛔ STOP after all 6 TEACH-QA phases — await approval before next phase.
```

---

## FILE INVENTORY SECTION

```markdown
## FILE INVENTORY — COMPLETE DELIVERABLE

\`\`\`
server/src/engine/flows/{slug}/
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
  NOTE: Do NOT list PLAN_EXEMPLAR files unless a phase explicitly creates them.
fixtures/contracts/                ([N] files — t[range] subset)
fixtures/flow-definitions/         ([N] topology files)
fixtures/event-schemas/{slug}/     ([N] schemas)
fixtures/event-schemas/{slug-yy}/  ([N] schemas)
fixtures/arbiters/
  {slug}-arbiters.bulk.ndjson
  {slug-yy}-arbiters.bulk.ndjson
rag-benchmark/
  seed_{slug}_patterns.py
  seed_{slug_yy}_patterns.py
\`\`\`
```

---

## CORPUS TEACHING SUMMARY SECTION

```markdown
## CORPUS TEACHING SUMMARY

| Source | DRs | RAG patterns | Code triples |
|---|---|---|---|
| FLOW-XX corpus | [N] | [N] | [N] (T[range]) |
| FLOW-YY corpus | [N] | [N] | [N] (T[range]) |

New patterns entering corpus for the first time:
- [PATTERN-NAME-001] ([node]) — [why it's new and high-signal]
```

---

# CROSS-CUTTING RULES — ALL THREE DOCUMENTS

## 1. Document authority chain

```
DESIGN SIMULATION > TEACH-QA > IMPLEMENTATION PLAN
```

If the implementation plan contradicts the design simulation, the design simulation wins.
Never "fix" a contradiction by editing the design simulation.

---

## 2. Naming conventions

```
THE RULE: source code uses {slug}; planning docs use FLOW-XX. Never mix.

SESSION/PLANNING DOCS — keep FLOW-XX prefix:
  Design simulation:     FLOW-09-DESIGN-SIMULATION-R1.md
  TEACH-QA file:         FLOW-09-TEACH-QA-R0.md
  Implementation plan:   FLOW-07-08-IMPLEMENTATION-PLAN-v2.md
  State file:            FLOW-07-08-IMPL-STATE.json
  Session directory:     docs/sessions/FLOW-09/

SOURCE CODE — use {slug} everywhere:
  Engine directory:      server/src/engine/flows/{slug}/
  Service file:          {service-name}.service.ts
  Contracts file:        server/src/engine-contracts/{slug}-contracts.ts
  BFA rules file:        server/src/engine-contracts/{slug}-bfa-rules.ts
  BFA export constant:   export const {SLUG_UPPER}_BFA_RULES = [
  Design corpus:         server/src/bootstrap/history-seeds/{slug}-design-corpus.json

KNOWN SLUG CONFUSION (#23 — v1.9): The following slug pair is repeatedly confused:
  SOURCE slug:  analytics-warehouse         → server/src/engine/flows/analytics-warehouse/
  TEST slug:    data-warehouse-analytics    → server/test/e2e/data-warehouse-analytics/
  These are DIFFERENT directories. When referencing FLOW-13 service files in a
  pattern-reference or implementation plan, always use analytics-warehouse, never
  data-warehouse-analytics. The e2e directory name does NOT match the source slug.
  Always verify: ls server/src/engine/flows/ before writing a pattern reference path.

TEST FILES — use {slug} everywhere:
  e2e directory:         server/test/e2e/{slug}/
  Proper-flow spec:      server/test/e2e/{slug}/{slug}-proper-flow.e2e.spec.ts
  Integration spec:      server/test/e2e/{slug}/{slug}-integration.spec.ts
  Phase unit spec:       server/test/e2e/{slug}/phase-a.spec.ts  (ordinal suffix, no flow number)
  Playwright spec:       client/e2e/{slug}.spec.ts
  TVQ spec:              client/e2e/topology/{slug}-topology-qa.spec.ts
  Client unit tests:     client/__tests__/flows/{slug}/

FIXTURE FILES — use {slug} everywhere:
  DR fixture:            fixtures/design-reasoning/{slug}-design-decisions.json
  Arbiter NDJSON:        fixtures/arbiters/{slug}-arbiters.bulk.ndjson
  Event schemas dir:     fixtures/event-schemas/{slug}/
  Topology fixtures:     fixtures/flow-definitions/{slug}-{group}.topology.json

SCRIPTS — use {slug} everywhere (hyphens → underscores for Python):
  Seed script:           rag-benchmark/seed_{slug}_patterns.py

PAGES + SNAPSHOTS:
  React pages dir:       client/src/pages/{slug}/
  E2E snapshots dir:     docs/e2e-snapshots/{slug}/

DATA VALUES — identifiers, not paths — keep FLOW-XX:
  flowId field:          "FLOW-09"
  patternId field:       "DR-09-A"  ← use DR-{FLOWNUM}-{LETTER} format (not FLOW-09-DR-01)
  arbiter ruleId:        "CF-09-1"
```

---

## 3. Type correctness rules (fixtures)

```
curriculumTier: int (1)    — never string "1"
qualityScore: float (0.93) — never string "0.93"
appliesTo: JSON array — ["FLOW-XX", "FLOW-YY"] — real array, NOT string
connectionType: "FLOW_SCOPED"
knowledgeScope: "GLOBAL" for training corpus records; "PRIVATE" for tenant records
```

---

## 4. Scope rules for stored records

```
Training corpus (DR, RAG patterns):
  connectionType: FLOW_SCOPED
  knowledgeScope: GLOBAL    ← teaches all tenants

Tenant operation records:
  connectionType: FLOW_SCOPED
  knowledgeScope: PRIVATE   ← this tenant only
  tenantId: from ALS

Cross-tenant feed/search records:
  connectionType: FLOW_SCOPED
  knowledgeScope: GLOBAL    ← discoverable across tenants
```

---

## 5. The completion event rule

```
Named in Q3 of SESSION START CHECKLIST — BEFORE Round 1.
Never changed after Round 1.
Not the same as any step event (RSVPConfirmed ≠ AttendanceFlowCompleted).
Not the same as the time-decoupled process's event.
Exact string literal — never computed or read from config.
```

---

## 6. ⛔ STOP cadence

```
Design simulation:   ⛔ STOP only at natural session boundary
                     (rounds complete, all four dimensions done)
TEACH-QA:            ⛔ STOP after every phase (6 stops total)
Implementation plan: ⛔ STOP after every phase (one service/page at a time)

No phase chaining without explicit approval. Ever.
```

---

## 7. ISSUE INVENTORY rules

```
Valid statuses: FIXED | DEFERRED+CARRY-FORWARD | EXCEPTION
Invalid: "noted", "low priority", "pre-existing", "out of scope", "separate session"
Every DEFERRED must have explicit authorization AND a CARRY-FORWARD entry.
```

---

## 8. Phase gate # Expected comment rules (#25 — v1.9)

```
Every phase gate — including Phase 0 — must have an explicit # Expected comment
after every verification command. No exceptions.

tsc gate:
  cd server && npx tsc --noEmit 2>&1 | grep -v TS5101 | grep error | wc -l
  # Expected: 0

jest gate:
  cd server && npx jest --testPathPattern="..." 2>&1 | tail -3
  # Expected: N passed, 0 failed

If the # Expected comment is absent, Claude Code cannot distinguish between
"command returned the right number" and "command returned nothing."

# Expected comments must appear exactly ONCE per gate line.
# Duplicate # Expected comments (same comment twice in a row) are a copy-paste error
# and must be removed — they do not double-verify anything.
```

---

## 9. Systemic gap rule — fix everywhere, not just here (#26 — v1.9)

```
When a review identifies a gap and says "consistent with all prior flows" or
"systemic gap across the series": that is a REASON TO FIX ALL AFFECTED DOCUMENTS,
not a reason to skip the fix in the current one.

"Consistency with broken documents" is not a valid justification.
The correct response is: fix all documents that haven't been executed yet.

Procedure when a systemic gap is found:
  1. Identify all flows in the series that contain the same gap
  2. Separate into: already-executed (fix next session) vs not-yet-executed (fix now)
  3. Apply the fix to all not-yet-executed documents in the same session
  4. Record which already-executed flows need correction as a CARRY-FORWARD

Examples of systemic gaps that were found and fixed across FLOW-14 through FLOW-17:
  - Phase 1 DR gate missing 13 content field checks (fixed in all four flows)
  - Phase 1 RAG gate missing 8 content field checks (fixed in all four flows)
  - COLD START pipe precedence: (cat A || cat B) | python3 (fixed in all four flows)
  - scope_isolation gate: >= 1 instead of >= N per-node (fixed in FLOW-16/17)
  - analytics-warehouse vs data-warehouse-analytics path confusion (fixed in FLOW-15/16/17)
```

---

## 10. Flow execution documentation protocol (#27 — v1.10)

This rule prevents documentation gap debt from accumulating across implementation sessions.
The pattern observed: Claude Code executes phases, tests pass, but documentation artifacts
(TEACH-QA fixtures, arbiter NDJSON, BFA rules, AGENTS.md TECH DEBT TRACKER) are left
incomplete or outdated. Over time, the gap between "code that exists" and "documentation
that matches" becomes a blocking debt.

### What must be updated in the same phase as the code change

```
Code change                          → Required documentation update
─────────────────────────────────────────────────────────────────────────────
New .service.ts file                 → TEACH-QA phase assigned for it (fixtures,
                                       arbiters, DC tests — or ticket created)
New BFA rule (CF-XX-N)               → AGENTS.md TECH DEBT TRACKER updated if
                                       deferred; fixed if pre-existing violation
New factory (FN IServiceName)        → Complete flow assembly in simulation updated;
                                       FLOW-18 factories section updated
Service behavior changed             → Iron rules in the relevant contract updated;
                                       BFA rule description updated if necessary
Phase gate fails pre-existing test   → ISSUE INVENTORY created with FIXED or
                                       DEFERRED+CARRY-FORWARD status; never skip
New ES index introduced              → Scope rules documented in scope_isolation
                                       arbiter for that flow
```

### Documentation debt accumulation classes (prevent these)

```
CLASS-1 — TEACH-QA phantom: code exists but TEACH-QA infrastructure does not.
  Symptoms: service file present; no t[N].contract.json; no fixtures; no DC tests.
  Prevention: TEACH-QA phase must be in the implementation plan BEFORE Phase A.
  Detection: ls fixtures/contracts/t[N].contract.json || echo "MISSING"

CLASS-2 — BFA stub: BFA rules file has comment-only entries or empty array.
  Symptoms: export const X_BFA_RULES = [] or // CF-XX-1: [description only]
  Prevention: BFA rules must be executable TypeScript object literals from Phase 0.
  Detection: grep -c "ruleId" server/src/engine-contracts/{slug}-bfa-rules.ts

CLASS-3 — Stale TECH DEBT TRACKER: AGENTS.md lists deferred items that were
  silently resolved (or not resolved) without updating the tracker.
  Symptoms: TECH DEBT TRACKER lists violations that no longer exist in the code,
  or lists items as DEFERRED when they should be FIXED.
  Prevention: Every session that resolves or adds a deferred item updates the
  tracker before ⛔ STOP.
  Detection: grep -c "DEFERRED" AGENTS.md vs grep -c "eslint-disable" server/src/**

CLASS-4 — Scope undocumented: new ES index written to but not listed in
  scope_isolation arbiter blockConditions/passConditions.
  Symptoms: xiigen-[new-index] appears in service code but not in arbiter NDJSON.
  Prevention: Every new index introduced in a phase must be documented in the
  flow's scope_isolation arbiter by the end of that phase.

CLASS-5 — Factory list drift: COMPLETE FLOW ASSEMBLY in simulation lists different
  factories than what the implementation plan actually registers.
  Symptoms: Phase 0 creates F258 IFlowCanvasService; simulation says F260.
  Prevention: After Phase 0, verify factory numbers match the simulation exactly.
  Detection: grep -n "fabricType" server/src/engine-contracts/{slug}-contracts.ts
```

### Per-phase documentation checklist (add to every ⛔ STOP)

```
Before every ⛔ STOP in an implementation plan, verify:

□ STATE FILE updated with current phase status and test counts
□ TECH DEBT TRACKER: any new OP-2 violations found → added as DEFERRED or FIXED
□ Any new ES index introduced → scope_isolation arbiter updated (or ticket filed)
□ BFA rules: all entries are executable TypeScript objects, not comment stubs
□ ISSUE INVENTORY complete: every found issue has FIXED | DEFERRED+CARRY-FORWARD status
□ TEACH-QA plan: if a new service was added, does a TEACH-QA phase exist for it?
  If not, create a ticket before ⛔ STOP — not after
□ Factory list: verify COMPLETE FLOW ASSEMBLY matches what was actually registered

This checklist supplements (does not replace) the MANDATORY CHECKS from HOW-TO-USE-SKILLS.
```

### Recovering from accumulated documentation debt

```
When a flow is discovered to have documentation gaps post-execution
(e.g., TEACH-QA phase never ran, BFA stubs present):

1. Create a CARRY-FORWARD entry in AGENTS.md TECH DEBT TRACKER
2. Assign a session ticket for the documentation-only session
3. That session's scope is documentation catch-up ONLY — no new code
4. The catch-up session follows MAINTENANCE session type rules (not GENERATION)
5. Each TEACH-QA phase produces all 6 standard phases and must pass gates before ⛔ STOP

Example carry-forward entry:
  FLOW-12 TEACH-QA: fixtures, topology, arbiters, seed script, DC tests,
  SEED tests, TVQ spec — ALL missing (services exist, docs do not)
  Priority: HIGH — FLOW-13+ TEACH-QA authors need FLOW-12 patterns as format reference
```

## 12. ESLint suppression protocol (#29 — v1.11)

`npm run lint` runs with `--max-warnings 0`. **A warning is a build failure.**
Run lint after every service file is written, not just before commit.

### The only permitted suppression form

```typescript
// eslint-disable-next-line no-console
console.warn('SchedulerRegistry: job already exists, skipping');
```

The comment goes on the line **immediately before** the offending statement.
Not on the case label. Not on the function declaration. Not two lines away.

### Wrong patterns — all fail or misplace the suppression

```typescript
// ❌ WRONG: placed on case label — does NOT suppress the console.warn below it
case 'SUSPENDED':
  // eslint-disable-next-line no-console
  someOtherLine();
  console.warn('...');   // ← still flagged

// ❌ WRONG: file-level banner — OP-2 violation, banned entirely
/* eslint-disable no-console */
```

### When to suppress vs when to remove

```
console.log   → REMOVE. Never log in production services.

console.warn  → Use eslint-disable-next-line ONLY when:
                  (a) it is a genuine operational signal
                      (e.g. "scheduler: job already exists — skipping")
                  AND
                  (b) no logger service is injectable in that context
                      (e.g. microservice-base.ts bootstrap code)

console.error → same rule as console.warn
```

If a logger service IS injectable: inject it and remove the console call entirely.
The suppression comment is the fallback for bootstrap/kernel code, not the default.

### Verification before every ⛔ STOP

```bash
# After writing all phase files:
cd server && npm run lint 2>&1 | grep -E "warning|error" | head -10
# Expected: empty output

# Verify no file-level disable banners were introduced (OP-2):
grep -rn "eslint-disable$\|eslint-disable " server/src/engine/flows/{slug}/ | \
  grep -v "eslint-disable-next-line"
# Expected: 0 hits
```

---

## 13. Architect Habits discipline (Rule 30 — refreshed v1.14)

**Canonical reference:** the Architect Habits catalog lives in
`planning--architect-behavior-classifier-SKILL.md` (back-reference `SK-538`),
version 1.1.0 and forward. Twenty-five habits organized as: seven worth
cultivating, four neutral-is-positive, fourteen worth catching. Load at session
start via Q6 of the Session Start Checklist.

### Why this rule exists

Across the architect-session corpus, two failure modes recur independent of
the design-quality rules already codified in Rules 25–29: **wrong altitude**
(dropping from architect-level into code or mechanism before the architectural
decision has closed) and **wrong ground truth** (asserting a confident claim
about the codebase or a prior decision without verification, and having it
turn out false). Design-quality rules catch content defects. Rule 30 catches
the authoring-mode defects that produce them.

### The authoring-side doc-first loop

When you identify something that might be a concern while authoring — a gap
in the document you are producing, a claim that seems wrong, a scope question —
run the same three-step loop that the code-review scan-for-architect-drifts
gate and the design-review Check 6 use at review time:

1. **Name the concern.** Match it against the Architect Habits catalog. If it
   matches a negative habit, it is a concern to resolve, not a feature to ship.

2. **Dig in docs first.** Before adding a "deferred" section to the document
   or asserting a factual claim, search `docs/`, `historyRag/`,
   `DECISIONS-LOCKED.md`, prior FLOW session files, and the current
   XIIGEN-SESSION-LOAD-PLAN for an existing locked decision that answers it.
   The decision usually exists; the search has not gone deep enough yet.

3. **Classify what remains.**
   - Docs resolved it → silently continue. Log the decision ID in STATE.recon.
   - Concern is architectural and unresolved → place it in an arbiter or a
     subflow (per SECTION 5B rules) — never in notes, never in a "deferred"
     block at document end.
   - Concern is a factual claim you cannot verify → do not assert it. Mark
     PENDING_VERIFICATION in the document. Resolve with a grep/find command
     before ⛔ STOP.

### The three habits that matter most in practice

Across the corpus, three negative habits account for the majority of
escalating corrections:

**Running to the keyboard when the question was architectural.** File edits
in ARCHITECT mode are scope-out. If an architectural point is open and you
reach for `view` / `grep` / code edits as your response, STOP and reframe at
design altitude. The developer checks; the architect answers. These are
different modes. [catalog ref: N-A1]

**Deferring in-scope work to a future session.** A deferred item that
decomposes a stated goal element is scope surrender, not discipline. The
Completion Gate in SECTION 11 explicitly checks this. Resolve by design
(arbiter / subflow / explicit decision). If a true deferral is required, it
must be recorded in STATE.goalContext with explicit approval — not in a
document's "deferred" appendix. [catalog ref: N-A2]

**Inherited verdicts — using a prior claim without re-running its source.**
Every inherited claim is re-run with its originating command before being used
in this session. The `registerInstall()` hallucination propagated through
three FLOW-47 plan versions before the fourth review ran
`grep -rn "registerInstall" server/` → 0 matches. One grep costs seconds.
One inherited hallucination costs three plan versions. [catalog ref: N-A8]

### Emerging habits — watch for these

Five habits added in the catalog's v1.1.0 release (2026-04-17) are emerging
tier: they have corpus corroboration but are not yet in the top-three. Watch
for them while authoring:

- **Acting before reading the user's full input** — if the session brief has
  attachments or long quoted content, absorbing it in full precedes the first
  tool call. [catalog ref: N-A9]

- **Claiming phase done when the shape diverges from the spec** — re-read the
  output contract at ⛔ STOP and confirm shape-match before declaring done.
  [catalog ref: N-A10]

- **Narrow plans that need widening** — any plan touching two or more documents
  or three or more flows runs wide-scope mode proactively before drafting.
  [catalog ref: N-A11]

- **Enumeration sync when meaning integration was needed** — when a catalog
  grows, ask what each finding means for each document's job; don't just swap
  counts. [catalog ref: N-A12]

- **Asking the person for what the tools already know** — check the codebase,
  prior artifacts, or metadata before asking a clarifying question. Questions
  the tools can answer don't go to the human. [catalog ref: N-A13]

### How this rule interacts with the review-side protocols

- **Code-review scan-for-architect-drifts gate** (CODE-REVIEW-PROTOCOL v1.5
  and forward) runs the Architect Habits catalog on plan text at plan-review
  time. What you author under Rule 30 is what the gate audits. Clean
  authoring = silent gate pass.
- **Design-review Check 6** (DESIGN-REVIEW-PROTOCOL v1.2 and forward) runs
  the catalog on design-reasoning prose fleet-wide. Authored prose from this
  guide feeds into design-reasoning records that Check 6 periodically scans.
  Fleet-wide propagation of a single hallucination is the failure mode
  Check 6 catches.
- **FC-16** (HOW-TO-USE-SKILLS v4.1.1 and forward) runs the catalog at
  plan-authoring time as part of the SK-410 v2.0 battery, FIRST alongside
  FC-14 and FC-15 before FC-1..FC-13. Rule 30 compliance = FC-16 pass.
- **Absolute Rule 32** (SESSION-LOAD-PLAN v26 and forward) codifies this at
  the project-state level: every ARCHITECT, PLANNER, REVIEWER, and
  MATERIALIZATION session loads the Architect Habits catalog at load_order 6.

### Verification before every ⛔ STOP

Run this self-check as part of the Completion Gate:

```
□ Architect Habits catalog loaded (Q6 answered yes)
□ Inputs absorbed in full before writing (Q7 answered yes)
□ No "deferred to separate session" labels on goal-decomposing items
□ Every file:line reference in the document has a corresponding command
  result in STATE.recon
□ Every inherited verdict from a prior session re-verified with its
  originating command
□ Every "what could go wrong" placed in an arbiter or subflow, never
  in notes (existing Rule 4 and 5 discipline)
□ Deliverable shape matches output contract (cardinality, granularity,
  per-unit fields) — re-read the contract and verify
```

Seven checks. None of them is optional.

### Anti-pattern — "Rule 30 is review-side, not authoring-side"

False. The review gates exist because authoring failed to catch the pattern.
Rule 30 exists to catch it earlier — at the document the reviewer will
eventually audit. A document authored under Rule 30 produces silent gate
passes and unblocks downstream sessions. A document authored without Rule
30 produces the same review-time corrections as historical sessions did,
plus the cost of one more plan version.

---

## 14. JSON+MD deliverable pairing (Rule 31 — new v1.14)

### What this rule says

Every structured data output a flow document produces — JSON, NDJSON, or
CSV — ships with a Markdown companion in the same directory, with matching
base name. `STATE.json` has `STATE.md`. `topology.json` has `topology.md`.
`corpus-seeds.ndjson` has `corpus-seeds.md`. No exceptions.

### Why this rule exists

Structured data files are machine-readable. They are good for tooling, bad
for humans trying to audit what was produced. When a reviewer, a future
author, or anyone else needs to understand what a file contains, they should
not have to write a parser or squint at nested braces. The MD companion is
the human reader's version of the same content.

Luba's directive from the 2026-04-17 session: *"additionally to json I need
a human read md file."* Applied as a general rule going forward.

### Structure of the MD companion

The MD file has three sections, in order:

1. **Executive summary** — one table (three to six rows) capturing the
   highest-level shape of the JSON's contents. For STATE.json: what mode
   this session is in, what round it's on, what the current focus is. For
   topology.json: flow slug, node count, edge count, category (business or
   pipeline-mock), connection type.

2. **Per-unit sections** — one section per top-level unit in the JSON. For
   each, cite the JSON path where the unit lives, the file:line range if
   the JSON is long, and a human-readable description. Example for a
   topology's nodes array:

   ```
   ### Node: publish_event (topology.json, nodes[3], lines 47-62)
   This node emits the PublishedToMarketplace event. Handler:
   marketplace.publish.handler. Consumes: DraftApproved from node approve.
   Iron rules: IR-MKT-1 (PUBLISHED-only check), IR-MKT-2 (scope elevation
   via KnowledgePolicyService only).
   ```

3. **Gap analysis** — one section listing what the JSON is missing or
   what questions about it remain open. If nothing is missing, the section
   is one sentence: "No gaps at this time." If gaps exist, each gap cites
   the specific field or unit and the open question.

### What compliance looks like

When a flow document phase produces `STATE.json`, the same phase produces
`STATE.md`. When a Teach-QA phase produces a contract JSON, the phase
produces the contract's MD. When a Design Simulation produces topology-corpus
triples as NDJSON, the simulation produces an MD rollup alongside.

### What violation looks like

- A directory containing `STATE.json` with no `STATE.md` alongside.
- An MD file that is just `cat STATE.json` with no summary, sections, or gap
  analysis — the MD exists but does not do the human-readability work.
- Deferring the MD to "a later cleanup pass" — the MD is same-session or
  the deliverable is incomplete.

### Exemptions

Fixture files that are wholly mechanical (e.g., a JSON test fixture whose
purpose is exact reproduction of prior state) are exempt. The exemption is
recorded at the top of the directory's README or in the phase's commit
message. Exemption without record counts as violation.

---

## 15. Playwright PNG per feature (Rule 32 — new v1.14)

### What this rule says

Every feature — every unit of work that produces tenant-visible behavior —
ships with a Playwright spec that captures PNG screenshots before the work
is considered done. Not optional. Not deferred. Same session.

Luba's verbatim directive, now a permanent rule: *"Every feature, from now
on, ships with a Playwright spec that captures PNGs before the work is
considered done. Not optional. Not deferred. Same session."*

### Why this rule exists

A claim that a feature works, written in prose or listed in a completion
table, is not proof. The history of this project includes multiple cases
where a feature was listed as "done" in a plan, then discovered not to work
(or not even to exist in the UI) when someone tried to use it. PNG evidence
closes that gap. If you claim a tenant can do X, prove it by taking a
screenshot of the tenant doing X.

### Where the spec lives

Client-side Playwright specs live in `client/e2e/`. Naming pattern:
`client/e2e/{feature-slug}.spec.ts`. Screenshots produced go to
`docs/e2e-snapshots/{feature-slug}/NN-description.png` where NN is
two-digit ordinal in the feature's user journey.

Example for the marketplace feature:

- Spec: `client/e2e/marketplace.spec.ts`
- PNGs:
  - `docs/e2e-snapshots/marketplace/01-empty-state.png`
  - `docs/e2e-snapshots/marketplace/02-flows-loaded.png`
  - `docs/e2e-snapshots/marketplace/03-install-dialog.png`
  - `docs/e2e-snapshots/marketplace/04-install-complete.png`

### What compliance looks like

- The feature's flow document Phase 5 (TEACHING PIPELINE PLAYWRIGHT
  EXTENSION, see existing SECTION 7) contains the Playwright spec file path,
  the list of expected PNGs, and the command used to produce them.
- The PNGs are committed to the repository alongside the feature code.
- Feature-completion claims cite one or more specific PNG paths as evidence.

### What violation looks like

- A feature claimed "done" with no Playwright spec written.
- A Playwright spec written but not run, so no PNGs exist.
- PNGs produced but not committed — only local evidence, not reviewable.
- Feature-completion claim citing "tests pass" without visual evidence.

### Exemptions

Features that are wholly server-side (no UI visible to the tenant) are
exempt from Playwright PNGs but still require evidence — typically
integration test output showing the server behavior. The exemption must be
stated explicitly in the flow document: *"This feature is server-only;
integration test `<path>` provides the evidence in lieu of PNG."*

Exemption without the explicit statement counts as violation.

### UX review loop (new v1.15 — Rule 32 extension)

After PNGs are captured and committed, run a UX review pass on the captured
screenshots before the phase is closed. The review is not a design critique
— it is a targeted five-point check for the most common FC-18 failure modes:

1. **FM-1 (route tier)** — does any captured page show user-rights content
   (consent, privacy, language) behind an `/admin/` route? If so: UX-19
   BLOCK.
2. **FM-2 (TENANT_FACING on CRUD)** — does any captured page show a
   generic Name/Status/Notes table for a flow classified TENANT_FACING?
   If so: UX-25 BLOCK.
3. **FM-3 (manual button on automated gate)** — does any captured page
   show a "Publish", "Apply", or "Trigger" button for a gate that fires
   automatically? If so: UX-23 BLOCK.
4. **FM-4 (internal IDs in copy)** — do any captured pages show T-numbers
   (T637), CF-numbers (CF-465), flow IDs (FLOW-28), or spec file paths in
   visible UI text? If so: UX-21 CONCERN or BLOCK (if in h1/h2).
5. **FM-5 (missing public page)** — does the captured session include a
   server service that handles user-facing requests (form submission, blog
   reading, consent) but no client route for users to reach it? If so:
   UX-20 BLOCK.

Any FM found in the review → add to FC-18 Audit Trail (Phase 7) and fix
before the session closes. The UX review loop is the bridge between "PNGs
exist" (Rule 32 original) and "PNGs prove the UX is correct" (v1.15
extension).

---

## 16. Topology disambiguation (Rule 33 — new v1.14)

### What this rule says

When a flow document refers to "topology," it specifies which kind. Two
distinct categories exist in XIIGen:

- **Business topology** — the tenant-visible artifact stored in
  `contracts/topologies/*.topology.json`. This is the flow that shows up in
  the marketplace, that a tenant installs, that renders in the flow-viewer
  UI. It is what the product is.

- **AF pipeline mock** — the engine-internal scaffold produced by
  `makeStandardFixture` and rendered by the 17 topology-QA Playwright
  specs. It is a test fixture for engine correctness, NOT what gets shown
  to tenants.

Every reference to "topology" in a flow document uses a qualified name.
The bare word "topology" is ambiguous and forbidden in prose.

### Why this rule exists

The two categories look structurally similar — both have nodes, edges, and
handlers. Conflating them has specific failure modes: a plan that produces
AF-pipeline-mock snapshots and claims these are what tenants see in the
marketplace; a design document that specifies iron rules for one category
as if they apply to the other; a review that raises a C6 finding on an
AF-pipeline-mock artifact thinking it's a business topology.

Luba's directive from the 2026-04-16 Pre-Phase 3 spec: *"Explicitly
distinguish: business topology (`contracts/topologies/`) vs AF pipeline
n1-n8 mock (`makeStandardFixture` — what the 17 topology-QA specs render
today, which is NOT what you want shown to tenants in marketplace)."*

### What compliance looks like

- Every instance of "topology" in prose is preceded or followed by the
  category: "business topology," "AF pipeline mock," "pipeline-mock
  topology." No bare "topology" standing alone.
- Plan documents referring to topology-production work specify which
  category is being produced.
- Review findings citing "topology" issues specify category before raising
  the concern.
- Tables and diagrams label each topology artifact by category.

### What violation looks like

- Prose that says "the flow's topology has five nodes" without qualifier —
  the reader has to guess whether this is the business topology or the
  pipeline mock.
- A plan that refers to "topology snapshots" without saying which kind,
  leading to the wrong deliverable shape.
- A review finding that says "the topology is missing iron rules" without
  category — the answer differs by category.

### Exemptions

Internal code-level references where the context is unambiguous (e.g., a
variable named `topology` inside `makeStandardFixture`) are exempt. The
exemption is scoped to code, not prose. Every document-authoring reference
follows the rule.

---

## 17. UI/UX Compliance (Rule 34 — new v1.15)

### What this rule says

Every React page implementation session runs Phase 7 (UI/UX Compliance)
after Phase 6 and before the final ⛔ STOP. Phase 7 verifies the 29 UX
checks from SK-539 (planning--ui-ux-compliance-SKILL.md) and produces an
FC-18 Audit Trail per page. A session that produces React pages without
Phase 7 violates this rule regardless of how good the PNGs look.

### Why this rule exists

The 10-run reconnaissance across all 48 XIIGen flows found four confirmed
missing pages (pages whose server services are fully implemented but whose
client routes do not exist), three confirmed route-tier mismatches (user-rights
pages behind `/admin/`), and a recurring pattern of TENANT_FACING pages
rendering generic admin CRUD. Every one of these gaps would have been caught
by the 29 UX checks if the checks had been run at authoring time.

Rule 34 installs those checks as a mandatory authoring-time gate rather than
a QA-time discovery.

### What compliance looks like

- Session produces `docs/ux-review/{slug}/FC-18-AUDIT-TRAIL.md` with one
  record per page.
- Every record has FC-18 verdict APPROVED or CONCERN.
- No record has verdict BLOCK at ⛔ STOP (BLOCK findings must be cleared
  before the session can close).
- If a screen template (T-1..T-7 from the REACT PAGES STARTER TEMPLATES
  section) matches the page, the template is declared in the record.
- If the session implements FLOW-20, FLOW-21, FLOW-28, or FLOW-48, the
  corresponding missing page (SK-539 §6) was created.

### What violation looks like

- React pages delivered with no Phase 7 output.
- FC-18 Audit Trail authored but missing required check items.
- Missing page registry gap not addressed when implementing a listed flow.
- Screen template matches but session rebuilt the template from scratch
  without documenting the deviation — CONCERNs from missed checks result.

### Relationship to Rule 32

Rule 32 (Playwright PNG per feature) and Rule 34 (UI/UX compliance) are
sequential, not competing. Rule 32 requires PNGs to exist. Rule 34's UX
review loop (Rule 32 extension, v1.15) verifies the PNGs prove the UX is
correct. Both must pass before the session closes.

### Exemptions

Sessions that produce only server-side code (no `*.tsx` files, no new
`<Route>` entries) are exempt from Phase 7. The exemption must be stated
explicitly in the DELIVERY SUMMARY: *"No React pages produced — Phase 7
exempt."*

Engine-internal admin pages served exclusively to PLATFORM_ENG roles
(R-ENGINE-ARCHITECT, R-SENIOR-ARCHITECT, R-ENGINE-DEV, R-DATA-ENGINEER,
R-DEVOPS-ENGINEER, R-FLOW-ARCHITECT) are exempt from UX-09 (tap targets)
and UX-12 (mobile responsive). All other UX checks apply. The exemption
must be declared in the Audit Trail.

---

*End of XIIGEN FLOW DOCUMENT AUTHORING GUIDE v1.15*
