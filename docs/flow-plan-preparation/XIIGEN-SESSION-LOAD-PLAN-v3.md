# XIIGEN — SESSION LOAD PLAN v3
## Date: 2026-04-01 | Supersedes: XIIGEN-SESSION-LOAD-PLAN-v2.md
## CRITICAL: Read this entire document before touching any file or writing any code.
## What changed in v3:
##   - RAG document index added
##   - Gap checklist with current status per gap
##   - Required abilities per phase (what you must be able to see)
##   - Two-layer context architectural decision (generator vs challenger isolation)
##   - Learning vs feeding detection protocol

---

## THE SINGLE MOST IMPORTANT THING TO UNDERSTAND

**XIIGen is NOT a code generator.**
**XIIGen is a self-developing, AI-driven, topology-discovery engine.**

```
WRONG mental model (what Claude Code keeps defaulting to):
  Human authors task type T47 → Engine generates code for T47
  Human writes iron rules → Engine enforces iron rules
  Human defines topology → Engine executes topology

CORRECT mental model:
  User says: "I need a user registration flow"
       ↓
  AI discovers: what are the nodes? (no human names them)
       ↓
  AI decides: is each node a leaf or does it expand into sub-nodes?
       ↓
  AI decides: what prompt, what models, what judge, what arbiters for THIS node?
       ↓
  AI generates the executor for each leaf node
       ↓
  Engine learns from every decision to improve future decisions
```

The existing FLOW-01 through FLOW-34 session files are the acceptance tests
for the LAST step (leaf executor quality). They are NOT the engine.
Everything before a leaf node reaches those files is what we are building.

---

## THE GOVERNING QUESTION FOR EVERY DECISION

> **"Am I making this decision for the AI, or am I giving the AI the minimum
> it needs to make the decision itself?"**

If the answer is "I am making it" — stop. Rewrite the context package.
If the answer is "boundaries and letting it discover" — proceed.

Every prompt, every context package field, every test assertion must pass this
question. The moment a human authors a result instead of a boundary, the AI
transcribes instead of learns.

---

## HOW THE ENGINE WORKS (4 cycles + learning)

### Cycle 1 — Intent to Plan
```
INPUT:   User's plain-language sentence

PLAYERS:
  Planner AI:    Reads 5-field context package → produces ordered plan steps
  Plan Reviewer: Checks coverage, abstraction, responsibility, dependencies
                 Produces grade. Below 0.85 → Planner reruns.

SENT:     INTENT (verbatim) + DOMAIN + CONSTRAINTS + PRIOR_ART query + SUCCESS format
RECEIVED: Plan steps + reviewer gap analysis + grade
DECIDED:  Accept (≥0.85) or rerun with reviewer feedback
CHANGED:  xiigen-rag-patterns updated with accepted plan
```

### Cycle 2 — Plan Step to NODE
```
INPUT:   One plan step (plain language)

PLAYERS:
  Generators A/B/C: 3 models in parallel → each produces a NODE candidate
                    Generators receive LOCAL FLOOR only (see two-layer rule)
  Blind judge:      Shuffled A/B/C (no model attribution) → picks best NODE
  Challengers:      Receive LOCAL FLOOR + PARENT CONTEXT (see two-layer rule)
                    AI-selected per node content → challenge independently

NODE = { structure, intent, constraints, quality }

SENT:     STEP_TEXT + UPSTREAM_CONTEXT + CHALLENGER_ROLES + RAG_QUERY + NODE format
RECEIVED: 3 candidate NODEs (shuffled A/B/C) + judge verdict + challenger verdicts
DECIDED:  Winning NODE + reasoning citing specific NODE field + grade ≥ 0.85
CHANGED:  RAG updated + decision graph edges updated
```

### Cycle 3 — Depth Decision (LEAF or EXPAND)
```
INPUT:   Verified NODE from Cycle 2

PLAYER:
  Depth Decider AI: Evaluates 5 complexity signals → LEAF or EXPAND
  MACHINE GATE:     depth ≥ terminationDepth (default 3) → LEAF without AI call

SENT:     Full NODE + depth history query + current depth + signals + termination bound
RECEIVED: LEAF/EXPAND verdict + signal citations + sub-flow decomposition (if EXPAND)
DECIDED:  Forward to Cycle 4 (LEAF) or spawn new Cycle 1 per sub-node (EXPAND)
CHANGED:  xiigen-depth-decisions updated + depth_history updated
```

### Cycle 4 — Leaf NODE to Executor (existing AF pipeline)
```
Input: leaf NODE → iron rules (from constraints) + I/O contract (from structure)
       + arbiter checklist (from quality) → existing FLOW-XX session files
These are the acceptance tests. They work. They do not need to be rewritten.
```

### Cycle 5 — Meta-Arbiter (fires only on grade < 0.85)
```
Input: full execution record from any failing cycle
Players: diagnosis model (different from failed) → proposals (PROMPT_PATCH / SKILL_EDIT)
         ranker model (blind — does not see diagnosis reasoning) → ranked proposals
Nothing applied without Luba approval.
```

---

## RAG DOCUMENT INDEX

Load the relevant document before the step that needs it. Not all upfront.

### Canonical architecture

| Document | Purpose | Load when |
|----------|---------|-----------|
| `XIIGEN-DESIGN-VISION-plain-language.md` | 4-cycle model, players, grades, visibility | Any session start; before any FLOW-PLAN step |
| `XIIGEN-GAP-REVIEW-2026-04-01.md` | 5-gap analysis, root causes α and β, simulation verdict | INVESTIGATION; verifying what still needs building |
| `XIIGEN-SKILL-GAP-ANALYSIS-2026-04-01.md` | Per-cycle skill status: exists / needs extension / missing | Before writing or reviewing any skill |
| `XIIGEN-SESSION-LOAD-PLAN-v3.md` (this file) | Single source of truth for session resumption | First thing read in every new session |
| `XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md` | Two-layer context rule, learning vs feeding detection | Before any convergence.handler work; before context package authoring |

### Governance

| Document | Purpose | Load when |
|----------|---------|-----------|
| `HOW-TO-USE-SKILLS-v3.0.0.md` | Skill triggers, session types, Q2 table | Every session start (SESSION-START GATE) |
| `XIIGEN-EXECUTION-PROTOCOL-v1.1.md` | Claude Code rules: 3-min checks, state, paths, NEVER DO | Every Claude Code session before touching files |
| `XIIGEN-FLOW-PLAN-PREPARATION-GUIDE-v2.md` | 10-step flow plan process, skills per step | Any FLOW-PLAN session |
| `XIIGEN-PLANNING-SKILLS-AUDIT.md` | QUESTION YOURSELF audit across planning skills | Reviewing or extending any planning skill |

### Skills preparation

| Document | Purpose | Load when |
|----------|---------|-----------|
| `XIIGEN-MISSING-SKILLS-PREPARATION-PLAN-v2.md` | Spec for SK-520..SK-525 | Writing any AI-topology skill |
| `planning--meta-arbiter-SKILL.md` (SK-525) | Meta-Arbiter governance | Step 9 visibility contracts; any grade < 0.85 |

### Implementation

| Document | Purpose | Load when |
|----------|---------|-----------|
| `FLOW-01-CYCLES-1-3-IMPLEMENTATION-PLAN.md` | Phase A/B/C/D handler specs, prompts, test specs | Implementing any cycle handler |
| `FLOW-01-FILE-ORGANIZATION.md` | Directory structure for FLOW-01 | Organizing FLOW-01 files |

### Flow patching

| Document | Purpose | Load when |
|----------|---------|-----------|
| `FLOW-06-34-PATCH-INSTRUCTIONS.md` | Per-flow user_intent + PRIOR_ART + arbiter tables | Per-flow patch (Action 1 Part 2) |
| `patch_flows.py` | 5 template fixes across FLOW-06..34 | Template patch (Action 1 Part 1) |

### RAG query patterns (runtime retrieval)

```
"prior plans for [domain keywords] flow"
  → xiigen-rag-patterns: accepted Cycle 1 plans

"prior NODEs for [step_type] capability in [domain]"
  → xiigen-rag-patterns: verified NODE representations

"depth decisions for [archetype] nodes at depth [N]"
  → xiigen-depth-decisions: prior LEAF/EXPAND verdicts

"execution records for [cycle] with grade < [threshold]"
  → xiigen-cycle-visibility: Meta-Arbiter trigger history
```

---

## TWO-LAYER CONTEXT — THE ARCHITECTURAL DECISION FOR CYCLE 2

This is the decision that determines whether XIIGen learns or feeds itself.

### The separation

**Generator AI receives LOCAL FLOOR only:**
```
INTENT:      sub-node step text verbatim
DOMAIN:      shared domain description — carried forward unchanged
CONSTRAINTS: DNA + BFA rules — carried forward unchanged
PRIOR_ART:   RAG query for this sub-node type
SUCCESS:     NODE format spec
```

**Challenger/Arbiter AI receives LOCAL FLOOR + PARENT CONTEXT:**
```
[all 5 fields above]
+ parentNode: { structure, intent, constraints, quality }
+ parentDepth: N
+ delegatedScope: "what the parent NODE delegated to this sub-flow"
```

The generator produces the sub-NODE from the step text alone.
It does not know it has a parent. This keeps inference genuine.

**Depth clarification:**
- depth = 1 (first Cycle 2, no recursion yet): challengerContext is absent.
  Challengers receive LOCAL FLOOR only. There is no parent NODE yet.
- depth > 1 (recursive sub-flow): challengerContext is populated with
  parentNode, parentDepth, and delegatedScope.

The challengers receive the parent NODE (when depth > 1). Their job is to raise concerns:

| Challenger | What it checks against parent |
|-----------|-------------------------------|
| Domain arbiter | Does sub-NODE intent.purpose cover the scope parent delegated — and only that scope? |
| Business arbiter | Does sub-NODE structure.outputShape connect to parent structure.inputShape at handoff? |
| Security arbiter | Does sub-NODE constraints contradict any parent NODE constraint? |
| Completeness arbiter | Do all sibling sub-NODEs collectively cover everything in parent intent.scope? |

### Why this matters for learning

The generator AI sees only the local step. If 3 generators produce the same
sub-NODE from the same step text → the step was under-decomposed (too simple
for genuine alternatives). If they produce meaningfully different sub-NODEs →
real ambiguity existed. The DPO triple records which resolution was correct for
this domain. That is genuine planning intelligence.

Parent context enters only through challenger challenge text. When a challenger
writes "sub-NODE's output does not connect to parent's inputShape at field X"
— the generator in the next round resolves that specific concern without
being told the answer. The trace of that resolution is what CHANGED captures.

### The failure mode this prevents

If parent context were in the generator's INTENT or DOMAIN field, generators
would produce structurally consistent sub-NODEs because they were told to.
Challengers would approve immediately. Convergence score = 1.0 on round 1.
No DPO signal. The system never learned what makes a valid sub-NODE for this
parent context — it was given a template.

### SK-435 PATH B submission format (updated)

```json
{
  "inputPath": "PLAN_STEP",
  "generatorContext": {
    "stepText": "...",
    "domain": "...",
    "constraints": [...],
    "priorArtQuery": "...",
    "successFormat": "..."
  },
  "challengerContext": {
    "parentNode": { "structure": {}, "intent": {}, "constraints": [], "quality": {} },
    "parentDepth": 2,
    "delegatedScope": "..."
  },
  "challengerRoles": [...]
}
```

`generatorContext` → all three generators.
`challengerContext` → challengers only.
The convergence session manager keeps these isolated — a generator NEVER
receives the contents of `challengerContext`.

---

## THE THREE-SIGNAL TEST: "IS XIIGEN LEARNING OR BEING FED?"

Run after every 5 flow plan sessions. All three failing simultaneously means
the context packages are acting as instruction files.

### Signal 1 — Derivation Independence
```
Measure: What % of intent.purpose in the produced NODE appears verbatim in DOMAIN?

Pass: < 30% shared noun phrases between DOMAIN and NODE.intent.purpose
Fail: > 60% → DOMAIN is over-specified → remove capability descriptions
      DOMAIN should say what the system does for users, not what this step does
```

### Signal 2 — Constraint Originality
```
Measure: Did constraints[] in produced NODE add anything beyond the sent CONSTRAINTS?

Pass: At least 1 domain-specific constraint added by the AI
      (e.g., "email uniqueness per tenant" — not in the DNA rules list)
Fail: Zero new constraints → NODE.constraints = DNA rule list verbatim
      → AI added nothing → context package already contained all constraints
```

### Signal 3 — Arbiter Disagreement Rate
```
Measure: How often did at least one challenger raise CONCERN or BLOCK on round 1?

Pass: < 40% of sessions have all-PASS on round 1
      (meaning: 60%+ required at least one revision)
Fail: > 70% all-PASS on round 1
      → Challengers have nothing to challenge
      → Context package already answered every question
      → Arbiters are rubber-stamping, not evaluating
```

---

## GAP CHECKLIST — CURRENT STATUS

### GAP-1: No user intent → plan
```
Root cause: Engine generation-first — task types pre-authored by humans
Status:     ✅ HANDLER BUILT — planner.handler.ts, Phase A COMPLETE
            ✅ 13 unit + 9 e2e + 9 UI tests
            ⚠️  REMAINING: No external entry point
                No API endpoint or UI routes a user sentence to PlannerHandler
                from outside the test suite. Handler works; not reachable by users.
Fix needed: POST /api/engine/plan { userIntent, tenantId }
            → PlannerHandler → plan steps + visibility record
```

### GAP-2: No NODE primitive
```
Root cause: Unit of work was taskTypeId string, not structured representation
Status:     ✅ TYPE DEFINED — NodeRepresentation = { structure, intent, constraints, quality }
            ✅ HANDLER BUILT — convergence.handler.ts, Phase B COMPLETE
            ✅ 15 unit + 9 e2e + 7 UI tests
            ⚠️  REMAINING: No persistent ES index for NODEs
                Verified NODEs live in memory during a run, not written to ES.
                CHANGED field references index updates that are mocks in tests.
Fix needed: Create xiigen-rag-patterns ES index + wire rag-store.handler
            to write verified NODEs after each Cycle 2 acceptance
```

### GAP-3: No convergence.handler
```
Root cause: Multi-model parallelism wired for code quality, not design consensus
Status:     ✅ FULLY CLOSED
            ✅ Design consensus NODEs (not code comparison)
            ✅ Blind judging, challenger isolation, grade formula
            ⚠️  MINOR: 2-model fallback (candidateC: null) not fully e2e tested
Fix needed: One e2e test: 2 generators available, third times out → valid NODE
```

### GAP-4: No topology deepening loop
```
Root cause: AF pipeline topology flat and pre-defined; no dynamic expansion
Status:     ✅ HANDLERS BUILT — depth-decision.handler.ts + ai-driven-cycle-router.ts
            ✅ MACHINE GATE enforced before AI call at terminationDepth
            ✅ 12 unit + 8 e2e + 8 UI tests
            🔴 REMAINING — MOST SIGNIFICANT OPEN GAP:
                Cycle router correctly identifies EXPAND → spawn new Cycle 1
                BUT spawning is a stub. Router marks "new Cycle 1 needed"
                but does not call PlannerHandler with sub-node as new INTENT.
                The loop is wired but not closed.

Fix — two steps (not one):

Step 1: Assemble sub-flow context package correctly (TWO-LAYER RULE):
  generatorContext.stepText   = sub-node text verbatim
  generatorContext.domain     = SAME domain as parent (not parent NODE content)
  generatorContext.constraints = SAME invariants as parent (DNA + BFA only)
  generatorContext.priorArt   = RAG query for this sub-node type
  challengerContext.parentNode = parent NODE (for challengers only)
  challengerContext.delegatedScope = scope this sub-node covers

Step 2: In ai-driven-cycle-router.ts EXPAND branch:
  for each sub-node in depth-decision output:
    1. Assemble context package (Step 1 above)
    2. Call PlannerHandler({ context, depth: currentDepth + 1 })
    3. For each resulting plan step, call ConvergenceHandler
    4. For each NODE, call DepthDecisionHandler (recurse)
    5. LEAF → hand to Cycle 4
    6. EXPAND → repeat this loop

The test harness (cycles-chain.e2e.spec.ts) already verifies the boundary.
Extend it to assert the sub-flow actually ran.
```

### GAP-5: No cycle visibility
```
Root cause: Engine designed as batch generator; transparency not a design goal
Status:     ✅ ALL HANDLERS EMIT — SENT/RECEIVED/DECIDED/CHANGED per cycle
            ✅ UI panels exist for Cycles 1-3
            ✅ Cycle 5 Meta-Arbiter record defined and tested
            ⚠️  REMAINING: No live ES index
                xiigen-cycle-visibility exists in handler code but is an
                in-memory mock in tests. No queryable record from live runs.
Fix needed: Create xiigen-cycle-visibility ES index + wire storeDocument()
            call before each visibility emit (DNA-8: store before emit)
```

---

## REQUIRED ABILITIES PER PHASE

What you must be able to see after each phase is working.

### Phase A — Planner (Cycle 1)

**Call:**
```
POST /api/engine/plan
{ "userIntent": "I need a user registration flow for a NestJS community platform",
  "tenantId": "demo-tenant" }
```

**Must see:**
```json
{
  "planSteps": [
    { "index": 1, "text": "Accept the user's email and password",
      "intClause": "user registration", "dependencies": [] },
    { "index": 4, "text": "Send a verification email to the provided address",
      "intClause": "verify email", "dependencies": [3] }
  ],
  "grade": 0.91,
  "accepted": true,
  "visibility": {
    "sent": { "INTENT": "I need a user registration...", "DOMAIN": "...", "CONSTRAINTS": [...] },
    "received": { "plannerOutput": [...], "reviewerGaps": [] },
    "decided": { "grade": 0.91, "accepted": true, "threshold": 0.85 },
    "changed": "xiigen-rag-patterns key FLOW-01/cycle1-plan updated"
  }
}
```

**Proves it works:**
- No technology names in any step text (NestJS, Elasticsearch, Redis absent)
- Every intent clause maps to at least one step
- visibility.sent.INTENT is byte-for-byte equal to the input

**Proves it is broken:**
- Steps contain class names or API paths
- visibility.decided is empty or missing grade
- Same steps produced regardless of userIntent

---

### Phase B — Convergence (Cycle 2)

**Call:**
```
POST /api/engine/converge
{ "stepText": "Verify the email is not already registered",
  "flowId": "FLOW-01", "tenantId": "demo-tenant", "depth": 1 }
```

**Must see:**
```json
{
  "node": {
    "structure": { "inputShape": ["email: string"], "outputShape": ["DataProcessResult<void>"] },
    "intent": { "purpose": "Verify the email address is not already registered in this tenant",
                "failureModes": ["email already in use", "database unavailable"] },
    "constraints": ["DNA-7: idempotency key required", "CF-1: uniqueness per tenant"],
    "quality": { "scoringCriteria": ["..."], "acceptanceThreshold": 0.85 }
  },
  "grade": 0.88,
  "visibility": {
    "received": {
      "candidateA": { "label": "A", "node": {...} },
      "candidateB": { "label": "B", "node": {...} },
      "candidateC": { "label": "C", "node": {...} }
    },
    "decided": {
      "winner": "B",
      "model": "claude-sonnet-4-5",
      "reasoning": "Winner B: only candidate where constraints[] includes CF-1 (tenant-scoped uniqueness). A and C omitted this constraint.",
      "challengerVerdicts": { "domain": "PASS", "principles": "PASS", "ironRules": "PASS" }
    },
    "changed": "xiigen-rag-patterns key FLOW-01/step-2-hash/node updated"
  }
}
```

**Proves it works:**
- NODE has exactly 4 canonical fields — no `behaviour`, no `scope`
- DECIDED.reasoning references a specific NODE field (not "better quality")
- All 3 candidates visible before winner de-shuffled
- constraints[] contains domain-specific items beyond DNA rules

**Proves two-layer separation is working:**
- Challenger verdicts cite parent scope violations specifically
- Generator NODEs do not contain parent NODE content
- Round 1 convergence score < 1.0 on non-trivial steps (real disagreement)

**Proves it is broken:**
- DECIDED says "Winner: B" with no reasoning
- All 3 candidates are identical (generators copying context package)
- convergence_score = 1.0 on round 1 for every step → over-prescription

---

### Phase C — Depth Decision (Cycle 3)

**Call:**
```
POST /api/engine/depth
{ "node": { ...4 fields... }, "currentDepth": 1, "terminationDepth": 3,
  "flowId": "FLOW-01", "tenantId": "demo-tenant" }
```

**Must see for a simple node (LEAF):**
```json
{
  "verdict": "LEAF",
  "justification": "S1 checked: intent.purpose = 'Verify the email is not already registered' — single action — S1 NOT triggered. S2-S5: 2 input types, 2 failure modes, 1 domain area, no multi-outcome quality. No signals triggered.",
  "signalsEvaluated": ["S1", "S2", "S3", "S4", "S5"],
  "signalsTriggered": [],
  "terminationBoundApplied": false,
  "grade": 1.0
}
```

**Must see for a complex node (EXPAND):**
```json
{
  "verdict": "EXPAND",
  "justification": "S1 triggered: intent.purpose contains 'workspace AND tutorial AND invitation' — 3 distinct outcomes.",
  "signalsTriggered": ["S1"],
  "subFlowDecomposition": [
    { "name": "Set up the member's workspace", "intClause": "workspace access", "isDistinct": true },
    { "name": "Send the first flow tutorial", "intClause": "tutorial", "isDistinct": true },
    { "name": "Send community invitation", "intClause": "invitation", "isDistinct": true }
  ]
}
```

**Must see at termination bound:**
```json
{
  "verdict": "LEAF",
  "justification": "depth = 3 = terminationDepth — bound enforced",
  "terminationBoundApplied": true,
  "signalsEvaluated": []
}
```

**Critical termination bound test:**
Run complex node at depth=1 (should EXPAND) and depth=3 (must LEAF).
If depth=3 produces EXPAND → MACHINE CONSTRAINT VIOLATED → stop immediately.

---

### Phase D — Full Chain (Cycles 1→2→3→4, including EXPAND recursion)

**Call:**
```
POST /api/engine/run
{ "userIntent": "I need a flow that handles user onboarding including workspace
   setup, tutorial delivery, and community invitation.",
  "tenantId": "demo-tenant" }
```

This intent should trigger EXPAND at Cycle 3 (3 distinct outcomes in intent).

**Must see (Q1-Q5 completeness):**
```
Q1: What did the user originally ask?
    → visibility.cycle1.sent.INTENT = verbatim user sentence

Q2: Which model produced the winning executor?
    → visibility.cycle4.decided.model = named model (de-shuffled)

Q3: Why was each depth decision LEAF or EXPAND?
    → visibility.cycle3[N].decided.signalEvidence = specific NODE field cited

Q4: What changed in the decision graph?
    → all cycles' visibility.changed = named index + key + what changed

Q5: If bad grade, what proposals were generated?
    → visibility.cycle5.decided.rankedProposals
    → or: "Cycle 5 did not fire — all grades ≥ 0.85"
```

**EXPAND recursion verification:**
```
Expected:
  Cycle 3 on onboarding NODE → EXPAND with 3 sub-nodes
  PlannerHandler called 3 times (once per sub-node)
  Each sub-plan produced independently (different plan steps per sub-node)
  Each sub-plan enters Cycle 2 independently
  Each resulting NODE enters Cycle 3 (depth=2)
  At depth=2: each sub-node is LEAF (single responsibilities)
  3 leaf NODEs forwarded to Cycle 4

Proves two-layer separation in recursion:
  Sub-flow plan steps do NOT repeat parent plan steps
  Sub-flow NODEs do NOT contain parent NODE fields
  Sub-flow generator NODEs differ from each other (not copied from parent)
```

---

## CURRENT STATE OF ALL TRACKS

### Track A — Flow Plan Documents
```
FLOW-01:     ✅ COMPLETE — docs\sessions\FLOW-01\ (10 steps + state)
FLOW-02..05: ✅ COMPLETE — all 8 issues fixed, committed
FLOW-06..34: ✅ FULLY COMPLETE — all 3 per-flow items verified correct across all 29 flows
             ✅ Template errors: none (patch_flows.py ran, 0 matches — already clean)
             ✅ user_intent: correct user-facing behavior in all Step 1 + Step 2 files
             ✅ PRIOR_ART: RAG query string (not inline bullets) in all Step 2 files
             ✅ Arbiter tables: domain-specific step types in all Step 4 files
             Verified by: patch_flows_perflow.py (0 matches — content was correct at generation)
```

### Track B — Skills
```
SK-525 (meta-arbiter):     ✅ COMPLETE
SK-522 (context package):  ✅ COMPLETE — .claude/skills/
SK-520 (intent-to-plan):   ✅ COMPLETE — .claude/skills/
SK-521 (depth-decision):   ✅ COMPLETE — .claude/skills/
SK-524 (cycle-visibility): ✅ COMPLETE — .claude/skills/
SK-435 (convergence):      ✅ v2.1.0 — PATH B extension added
SK-523 (config-selection): DEFERRED to Phase 2
```

### Track C — Cycle Handlers
```
PlannerHandler (Cycle 1):        ✅ COMPLETE — planner.handler.ts
                                    13 unit + 9 e2e + 9 UI tests
ConvergenceHandler (Cycle 2):    ✅ COMPLETE — convergence.handler.ts
                                    15 unit + 9 e2e + 7 UI tests
DepthDecisionHandler (Cycle 3):  ✅ COMPLETE — depth-decision.handler.ts
                                    12 unit + 8 e2e + 8 UI tests
Chain Integration (Phase D):     ✅ COMPLETE — cycles-chain.e2e.spec.ts
                                    12 e2e tests
Total tests: 40 unit + 38 e2e + 24 UI = 102 tests
Cycle 4 (AF pipeline):           ✅ EXISTS AND WORKS
```

### Track D — Open gaps (post Phase D)
```
🔴 GAP-4 recursive spawn: EXPAND stub not yet closed (most significant)
⚠️  GAP-1 external entry point: no API endpoint for users
⚠️  GAP-2 NODE ES index: xiigen-rag-patterns not live
⚠️  GAP-5 visibility ES index: xiigen-cycle-visibility not live
```

---

## NEXT ACTIONS

```
ACTION 1 — Close GAP-4 recursive spawn (two steps)
  Step 1: Update convergence.handler submission to use two-layer format
          (generatorContext separate from challengerContext)
          Test: convergence score < 1.0 on non-trivial steps
  Step 2: Wire EXPAND branch in ai-driven-cycle-router.ts
          Call PlannerHandler per sub-node with correct two-layer context
          Extend cycles-chain.e2e.spec.ts to assert sub-flows actually ran
  ⛔ STOP — verify Phase D abilities section above before proceeding

ACTION 2 — Wire external entry point (GAP-1)
  POST /api/engine/plan + POST /api/engine/run endpoints
  ⛔ STOP after wired and tested

ACTION 3 — Create ES indices (GAP-2 + GAP-5)
  xiigen-rag-patterns + xiigen-cycle-visibility index mappings
  Wire storeDocument() in handlers (DNA-8 compliant)
  ⛔ STOP after indices created and verified

ACTION 4 — Patch FLOW-06..34 per-flow content
  ✅ COMPLETE — verified correct at generation, no patching required
```

---

## ABSOLUTE RULES

```
1. Never prescribe what AI should produce.
   Write context, format, and test. AI produces content.

2. Generator context must not contain parent NODE content.
   Parent context goes to challengers only. Never to generators.

3. Never pre-author a topology.
   Handlers take context and call AI. AI decides.

4. Never hardcode models, prompts, or judges.
   Configuration adapts per node per cycle based on performance.

5. NODE canonical fields: { structure, intent, constraints, quality }
   No behaviour. No scope. No outcome at top level.

6. Grade threshold = 0.85 for ALL cycles. Everywhere.

7. Termination bound enforcement BEFORE AI call at every depth check.

8. DNA-3: every handler returns DataProcessResult — never throws.

9. DNA-8: store visibility record BEFORE any emit or downstream call.

10. PRIOR_ART is a RAG query string, never inline content.

11. user_intent is user-facing behavior, never a code generation prompt.

12. If convergence score = 1.0 on round 1 consistently across most steps
    in a session → STOP. A simple step legitimately converges in round 1.
    But if every non-trivial step converges immediately → the context
    package is prescribing the answer. Run the three-signal test. Reduce it.
```

---

## SESSION START CHECKLIST

```
□ 1. Read this document fully
□ 2. Check git log: what was the last committed action?
□ 3. Identify which ACTION is next
□ 4. Read XIIGEN-ARCHITECTURAL-DECISION-ADDENDUM.md (two-layer rule)
□ 5. Load required skills by READING the files (view tool)
     Print ✅ [filename] (SK-NNN) for each one loaded
□ 6. Read the referenced plan document for that action
□ 7. Confirm test baseline: cd server && npx jest 2>&1 | tail -5 → failures === 0
□ 8. State the output contract for round 1 in one sentence before starting
□ 9. BEGIN — one action, one phase, one step at a time
```

---

## FILE LOCATIONS

```
Project root:       C:\Projects\xiigen mvp\.claude\worktrees\crazy-shannon\
Branch:             Skills_Creation_Claude
Skills:             [PROJECT_ROOT]\.claude\skills\
Flow sessions:      [PROJECT_ROOT]\docs\sessions\FLOW-XX\
Server:             [PROJECT_ROOT]\server\
Client:             [PROJECT_ROOT]\client\
```
