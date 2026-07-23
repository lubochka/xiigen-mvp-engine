---
name: xiigen-core-principles-skill
version: "4.0.0"
description: >
  The 13 non-negotiable architectural principles every XIIGen plan, flow, and
  code modification must satisfy. P1–P8 after FLOW-33. P9–P10 Mode C (2026-03-20).
  P11 Stack Coupling (2026-03-22). P12 Implementation Mode + P13 Scope Discipline
  (2026-03-22) — prevent plans from routing to wrong executor or containing
  out-of-scope content that causes Claude Code to build the wrong system.
  Any plan that violates any principle is REJECTED regardless of FC checks.
author: luba
updated: "2026-03-22"
priority: SUPREME
triggers:
  - "plan a new flow"
  - "design a new feature"
  - "new task type"
  - "architecture decision"
  - "plan review"
---

# XIIGen Core Principles v4.0
## 13 Non-Negotiable Requirements for Every Plan

> P1–P8 established after FLOW-25–33.
> P9–P10 established in Mode C / Client Architecture session (2026-03-20).
> P11 established in FLOW-00.2 Stack Coupling Base (2026-03-22).
> P12–P13 established after FLOW-01 review failure (2026-03-22).
> All 13 must have explicit design answers. "TBD" = plan is INCOMPLETE.

**Authoritative source: DECISIONS-LOCKED.md**

---

## MISSION PRINCIPLES (governing layer — all P-principles serve these)

---

## M1: Self-Improvement Is the Primary Output

Every flow that runs must leave the engine measurably better than it was before.
"Measurably better" means at least one of: a prompt version advanced, a RAG pattern
quality score updated, a skill evolved from GAP_SIGNAL, an arbiter calibrated from
ARBITER_VERDICT data, a distilled rule added to `xiigen-distilled-rules`.

Generated code that compiles and passes tests is the minimum bar. It is not success.
Success is: the engine can generate better code next time because of what it learned
this time.

**The question:** "After this session, what is the engine better at that it wasn't
before? If the answer is 'nothing,' the session failed its primary purpose."

**Red flags — M1 violations:**
```
❌ PHASE-COMPLETE-N.md has no ENGINE PROGRESS section
❌ "Tests pass, code generated" — no mention of what improved
❌ DPO triples stored but no prompt version advanced after low-score cycle
❌ OUTCOME signals accumulated but RAG quality scores never queried or updated
❌ GAP_SIGNAL emitted but no skill created or updated in response
❌ "FLOW-38 will handle the learning loop when it's built"
   (correct answer: do the minimum equivalent manually until FLOW-38 is active)
```

---

## M2: Every AI Judgment Uses a Specialized Panel With Escalation

**The node definition:** A node is a station where several models receive context,
skills, prompts, previous run results, and prior judgments — and converge through
evaluation rounds until they reach the final best solution. This is the universal
unit of decomposition. Every task, subflow, flow, and capability decomposes to nodes.
A station that does not have this structure is a function call, not a node.
Function calls do not improve. Nodes do.

No AI station in the AF pipeline uses a single model to generate, evaluate, and judge
its own output. Every station where AI quality judgment occurs runs a panel of
specialized arbiters — each with a defined expertise scope, each blind to the others'
verdicts — and an escalation orchestrator that applies decision rules rather than
averaging scores.

**Two distinct entities govern panel operation — do not conflate them:**

The **Escalation Orchestrator** (within-session, within-panel) collects all arbiter
verdicts after every generation cycle and applies decision rules: ANY BLOCK → reject
output; ≥5 APPROVED → accept; 3-4 ADVISORY → patch-and-cycle; consensus impossible
→ human escalation. The orchestrator applies rules. It does not add new arbiters.

The **Upper Judge** (cross-cycle, meta-level) activates when the Escalation
Orchestrator cannot resolve a conflict even after the maximum cycle budget. The Upper
Judge's question is not "which output wins?" but "what expertise is missing from this
panel that would resolve the disagreement?" It may spawn a new specialized arbiter
for the current run, and records that decision as a DESIGN_REASONING triple so future
runs can include that arbiter in the permanent panel.

The panel is not fixed. The Upper Judge grows it. The Escalation Orchestrator runs it.
These are two separate skills in the overhaul: SK-446 (Escalation Orchestrator protocol)
and a subsection of SK-442 (Upper Judge protocol within arbiter panel design).

**The question:** "Does this AF station run multiple specialized arbiters with an
escalation path, or is one model generating and evaluating its own output class?"

**Red flags — M2 violations:**
```
❌ score.handler uses a single AI_JUDGE_PROVIDER for all 5 evaluator dimensions
❌ The judge that scored a run is from the same model family as the generator
❌ Arbiter disagreements are resolved by averaging scores
❌ A Principles Arbiter is not in the panel (see P20)
❌ No escalation path exists — every disagreement results in a cycle
❌ "We only have one API key" used to justify single-model evaluation
   (correct: mark triple PENDING_COMPARISON, never store as training data)
❌ Panel is the same for every archetype regardless of domain complexity
```

---

## M3: Teaching-First Generation

The primary output of every AF pipeline run is teaching material for open-source
model fine-tuning. Working code is a byproduct — valuable, but secondary.

The economic target: at 80 valid DPO triples across curriculum tiers, the engine
switches generation of simpler archetypes (ROUTING, DATA_PIPELINE) to a local model.
At full curriculum coverage, all AF-1 generation runs on local models. The cost per
generation run approaches zero. Every flow that produces structurally invalid triples
delays this target.

The curriculum must be built from FLOW-01. T47 (ROUTING, Tier 1) and T49
(ORCHESTRATION, Tier 4) are among the first triples the local model will ever learn
from. If they are stored without `curriculumTier`, the model learns in the wrong
order and the graduation threshold moves further away.

**The question:** "If I fine-tune DeepSeek-Coder on every triple this phase produced,
what specific capabilities will it gain? Are those in the right curriculum order?"

**Red flags — M3 violations:**
```
❌ DPO triple stored with curriculumTier: null
❌ chosen.model === rejected.model (same model family — not comparative signal)
❌ V9 gate skipped because "FLOW-39 not yet ACTIVE"
❌ Shadow run omitted because "local model not ready yet"
   (correct: create PENDING_LOCAL_MODEL placeholder in xiigen-shadow-runs)
❌ teachingPoint is a restatement of the score ("the code scored 0.62")
   instead of naming the specific principle or iron rule the rejected code violated
❌ "FLOW-39 will structure the curriculum" — FLOW-39 refines the curriculum.
   The curriculum begins with triple one.
❌ No instructionFormat field — local model fine-tuning script cannot parse the triple
```

---

## M4: Zero Known Defects

No session ends with a known unfixed defect unless Luba has explicitly authorized
deferral. "Known" means: observed during the session, regardless of when introduced.

"Pre-existing" describes when a defect was introduced — not its exemption status.
A worker force-exit warning introduced in a session three months ago is a known defect
in this session if this session observed it. This session owns it.

Three valid dispositions for any defect found:
1. **FIX** — in this session, before ⛔ STOP
2. **ESCALATE** — report to Luba with root cause analysis and reproduction steps
3. **DEFER** — only with Luba's explicit "yes, defer this" written in the session

Option 4 (silently note and move on) does not exist.

**The question:** "When this session ends, does the codebase have fewer known defects
than when it started? On every dimension examined — not just the target task?"

**Red flags — M4 violations:**
```
❌ "1 pre-existing failure (unrelated)" — unrelated to this task,
   but related to the product. Owns it.
❌ "N skipped tests (unchanged from baseline)" — unchanged means unfixed
❌ "worker force-exit warning — pre-existing" — a leak is a defect, not a label
❌ Delta gate passes while absolute gate would fail
❌ ISSUE INVENTORY not produced before ⛔ STOP
❌ Defect mentioned in session log but absent from ISSUE INVENTORY
```

---

## M5: Mission Progress Is Visible at Every Phase

Every PHASE-COMPLETE-N.md begins with an ENGINE PROGRESS section. Not buried after
technical gate results — first. The question it answers is the one Luba asks after
every session: "Are we closer to the goal than we were before?"

The goal is an independent, cost-effective engine. The metrics that track it are:
valid DPO triple count (toward 80-triple graduation threshold), curriculum tier
coverage, shadow gap score per archetype, prompt versions improved, RAG pattern
quality, and estimated sessions remaining to graduation test.

If any metric cannot be computed, state PENDING and the reason. Never omit. The
absence of data is itself a visible fact. "We don't know the shadow gap score" is
more useful than silence — it drives the decision to initialize `xiigen-shadow-runs`.

**The question:** "After reading this session's output, can Luba answer: are we
closer to or further from an independent engine than yesterday? By how much?"

**Red flags — M5 violations:**
```
❌ PHASE-COMPLETE-N.md starts with test counts and file lists
❌ ENGINE PROGRESS section missing entirely
❌ Shadow gap score field absent (not even PENDING)
❌ DPO triple count not compared to 80-triple threshold
❌ "We'll add progress tracking when FLOW-39 is built"
❌ Graduation timeline estimated without querying actual triple counts
❌ A session where none of the 3 layers advanced — without stating this explicitly
   and explaining why
```

---

## PRINCIPLE 1 — Multi-Tenant by Default

Every entity, query, event, config, RAG index, prompt store, local model,
and background job is tenant-scoped from day one.

**Plan must show:**
```
□ tenantId on every new entity, index, cache key, event
□ Multi-tenant isolation test (tenant A cannot see tenant B)
□ RAG retrieval filtered by tenantId
□ Quota and rate-limit strategy per tenant
```

---

## PRINCIPLE 2 — Configs in Safe Environments

No secret or credential lives in code or git. All tenant-specific values
live in the FREEDOM layer, resolved via ISecretsService.

**Plan must show:**
```
□ ISecretsService for all credentials
□ FREEDOM config for all tenant-configurable values
□ No hardcoded limits, thresholds, or keys
```

---

## PRINCIPLE 3 — Always Improve Prompts

Every genesis prompt has a versioning lifecycle. AF-9 judges quality.
Feedback produces PromptPatches.

**Plan must show:**
```
□ PromptAsset version declared
□ AF-9 quality gate in generation loop
□ DPO triple export on ACCEPT
```

---

## PRINCIPLE 4 — RAG Is Always Dual: Global + Local

Two RAG tiers. Global: ES-backed shared patterns. Local: docker-backed
per-tenant patterns. Both must be designed.

**Plan must show:**
```
□ Global RAG tier usage (cross-flow patterns)
□ Local RAG tier usage (tenant-specific patterns)
□ Both layers in docker-compose test environment
```

---

## PRINCIPLE 5 — Always Improve (Self-Learning Loop)

Every generation run captures 6 metrics. Every flow contributes to the
improvement cycle.

**Plan must show:**
```
□ 6 metrics captured per run: quality, cost, latency, retry_count, dpo_triples, model_used
□ Improvement cycle defined (how feedback re-enters the system)
```

---

## PRINCIPLE 6 — Plan and Arbitrate Every Decision Node

Every task type has 5 arbiters. No arbiter is optional.

**Plan must show:**
```
□ 5 arbiters configured per new T-XXX
□ Arbiter replay test in Phase A gate
□ BFA rules seeded and validated
```

---

## PRINCIPLE 7 — Test Everything Locally

All 4 test layers pass with zero cloud credentials.

**Plan must show:**
```
□ Unit, integration, e2e, and multi-tenant isolation tests
□ docker-compose covers all dependencies
□ No cloud SDK calls in test suite
```

---

## PRINCIPLE 8 — Open Source Local Model: Learn, Save, Reuse

Local model endpoint via FREEDOM config. Training capture on every run.
Per-tenant isolation.

**Plan must show:**
```
□ FREEDOM config key for local model endpoint
□ Training capture on ACCEPT decisions
□ Per-tenant model isolation
```

---

## PRINCIPLE 9 — Mode C Event-First Architecture

All inter-service communication via QUEUE FABRIC. No direct HTTP calls
between services. Events have contracts in contracts/events/FLOW-XX/.

**Plan must show:**
```
□ Event contracts in contracts/events/FLOW-XX/
□ All CONSUMES reference QUEUE FABRIC events (no HTTP)
□ No PII in any event payload
□ correlationId, tenantId, timestamp, source in every schema required[]
```

---

## PRINCIPLE 10 — Client-Side Architecture

Every user-facing flow has a complete client state model: optimistic
contracts, app reopen behavior, offline queue, background signals.

**Plan must show:**
```
□ Client state map per DAG node (screen, actions, appReopenBehavior)
□ FlowStateSnapshot endpoint defined
□ offlineQueue.queueable[] and notQueueable[] with reasons
□ backgroundSteps[] and signal types
□ requiresDraftState declared
□ Client integration tests (C1–C5) in Phase E gate
```

---

## PRINCIPLE 11 — Stack Coupling Awareness (NEW — 2026-03-22)

Every flow plan must declare, for every task type and client node, exactly
what is stack-neutral and what requires stack-specific implementation.
A plan that assumes one stack without declaring it is INCOMPLETE.

**Plan must show:**
```
□ stackTargets declared in STATE.json (min: ['node-nestjs'])
□ clientTargets declared in STATE.json (min: ['react-web'])

□ All genesis prompts in HybridGenesisPrompt format (D-STACK-2):
    Section 1 neutralIronRules[]: no framework names, no stack syntax
    Section 4 stackImplementations: per StackKey generation frames

□ stackCoupling annotation on all task types (V29):
    entries map with 'node-nestjs:server' as minimum
    tier: CONCEPT_NEUTRAL | IMPL_VARIES | STACK_COUPLED
    neutralConcepts[]: non-empty, framework-neutral language only

□ All ⛔ INCOMPATIBLE stacks flagged before implementation (V30):
    incompatibleReason present
    mitigation present (alternative stack or workaround)

□ Client nodes with reactive state have stateNotes per framework (V31):
    stateHolderType: framework-specific term (e.g. "BehaviorSubject", "useState", "StateFlow")
    stateScope: 'feature-scoped' | 'root-scoped'
    propagationRisk: 'LOW' | 'MEDIUM' | 'HIGH'
    routeGuardRequired: boolean
```

**The two questions for P11:**
1. "If a Python developer picks up this plan, can they implement the server
   without reading any other document?"
2. "If an Angular developer picks up this plan, do they know the stateHolderType,
   stateScope, and propagationRisk for every node with reactive state?"

**Priority stacks (D-STACK-3):** `node-nestjs` server, `react-web` client.
Full IMPL_VARIES annotation for these. Other stacks: INCOMPATIBLE flags
where structural constraints exist; stubs otherwise.

**Red flags — P11 violations:**
```
✗ "Generate a NestJS service..." in a genesis prompt Section 1
✗ Framework name (NestJS, Laravel, FastAPI) in neutralIronRules[]
✗ stackTargets / clientTargets absent from STATE.json
✗ stackCoupling absent on any task type introduced by this flow
✗ INCOMPATIBLE stack not flagged before implementation begins
✗ Client node with optimisticActions but no stateNotes in topology
✗ T48-equivalent (long-running scheduled task) targeting WordPress without ⛔ flag
```

---

## Quick Reference — P11 by Element Type

| Element | What P11 requires |
|---------|------------------|
| EngineContractParams | stackCoupling with entries map |
| Genesis prompt | HybridGenesisPrompt 4-section format |
| topology.json node | stackCoupling with stateNotes if reactive |
| STATE.json | flow_name, stackTargets, clientTargets |
| Jira comment (SK-429) | 5-section format: business purpose, flow context, delivery, arch fit |
| Service file names | {verb}-{domain-noun}.service.ts (naming-conventions-enforcer Rule 1) |

---

## PRINCIPLE 12 — Implementation Mode Declaration (NEW — 2026-03-22)

Every flow plan must declare WHO writes the service code: the XIIGen AF
pipeline (AI-generated) or Claude Code (manual). A plan that does not
declare this routes to the wrong executor and bypasses the entire
learning loop.

**Plan must show:**
```
□ implementationMode in STATE.json: "af-pipeline" | "manual" | "hybrid"
□ implementationModeReason present

□ If af-pipeline (FLOW-01 through FLOW-24, FLOW-25+):
    SESSION Phase A = INJECT (contracts + prompts seeded to ES)
    SESSION Phase B = GENERATE (engine.generate(), not create_file)
    SESSION Phase C = JUDGE (AF-6/7/8/9 scoring)
    SESSION Phase D = INTEGRATE (wiring + naming gate)
    SESSION Phase E = PROMOTE (DPO export, promotion to INJECTED)
    Genesis prompts are AF-1 INPUT — not Claude Code instructions
    No SESSION file creates .service.ts files directly

□ If manual (FLOW-00.x, FLOW-35 Phase A-C):
    Justification present (AF pipeline not yet available)
    SESSION files describe direct file creation

□ If hybrid (FLOW-35 Phase D+):
    Boundary documented: what Claude Code writes vs what AF generates
```

**The key question for P12:**
"Does any SESSION file tell Claude Code to create a .service.ts file for a
user-facing flow? If yes → P12 violation. The engine generates services."

**Red flags — P12 violations:**
```
✗ SESSION-FLOW-01-B.md says "Create user-registration-initiator.service.ts"
✗ Genesis prompt treated as coding instructions for Claude Code
✗ Phase B described as "implement T47" instead of "submit T47 to AF pipeline"
✗ No implementationMode in STATE.json
✗ implementationMode: "manual" for FLOW-01..24 without justification
✗ Plan passes 31/31 but SESSION files bypass AF pipeline entirely
```

---

## PRINCIPLE 13 — Scope Discipline (NEW — 2026-03-22)

Every flow plan must contain content ONLY for its declared stackTargets
and clientTargets. Content outside declared scope is noise that causes
Claude Code (or the AF pipeline) to build the wrong system.

**Plan must show:**
```
□ stackTargets and clientTargets declared in STATE.json
□ Topology nodes contain stateNotes ONLY for declared clientTargets
□ Coupling maps contain full entries ONLY for declared stackTargets + platforms
□ Non-priority stacks: one-line INCOMPATIBLE flags where known, nothing else
□ Non-priority client stacks: absent from topology, referenced in APPENDIX only
□ APPENDIX A at end of plan: "for FLOW-37 reference only — Claude Code MUST IGNORE"
```

**The key question for P13:**
"If I delete everything outside stackTargets/clientTargets, does the plan
still work? If yes → the deleted content was noise. If no → scope is wrong."

**Red flags — P13 violations:**
```
✗ Angular stateNotes in topology when clientTargets = ['react-web']
✗ Full BehaviorSubject analysis for a framework not being implemented
✗ 400 lines of non-priority stack coupling analysis in the plan body
✗ V31 checking angular + android stateNotes when only react-web is in scope
✗ FC-21 verifying stateNotes for frameworks outside clientTargets
```

---

## P14: NODE-First Design

Every capability that will be generated by the AF pipeline MUST first have a
verified NODE — `{structure, intent, constraints, quality}` — built through
convergence before any genesis prompt is written.

The NODE is stack-neutral. Genesis prompts are DERIVED from the NODE per target
stack. They are not authored independently for each stack.

**The question:** "Does a verified, stack-neutral representation of this capability's
intent, structure, constraints, and quality exist before I write any generation
instructions?"

**Red flags — P14 violations:**
```
❌ Genesis prompt written before NODE representation defined
❌ Genesis prompt hardcodes a stack name in the first sentence
   ("Generate a NestJS UserRegistrationInitiatorService...")
❌ stackCoupling.implementationNotes exists but is not reflected in genesis
   prompt Section 4
❌ A capability classified INCOMPATIBLE without asking: "is this incompatibility
   at the mechanism level or the design level?"
❌ Stack portability decision deferred to "after FLOW-01 runs"
```

---

## P15: Design Reasoning as Training Data

Every significant design decision made during planning MUST be captured as a
DESIGN_REASONING triple and seeded to the RAG at Gate C.

A decision that is not captured is a decision the system cannot learn from.
After 24 flows, the code generator will be significantly better. The designer
will be exactly as good as today — unless design decisions are captured.

**Significant decisions include:**
- Q1-Q4 classification outcomes with non-obvious reasoning
- INCOMPATIBLE → IMPL_VARIES_WITH_PROVIDER reclassifications
- Wave assignments (if non-obvious)
- Iron rules derived from domain analysis (not copied from a template)
- Fabric interfaces introduced to replace hardcoded dependencies
- Cross-flow dependencies identified that could produce a BFA conflict

**The question:** "Will the engine be able to retrieve the reasoning behind this
decision when it faces a similar situation in FLOW-15?"

**Red flags — P15 violations:**
```
❌ Gate C approval given without producing ARCHITECTURE-DECISIONS.json
❌ A design decision recorded only in DECISIONS-LOCKED.md prose but not as
   a structured DESIGN_REASONING triple
❌ A reclassification made without recording the reasoning that produced it
❌ "The decision is obvious" — if it were obvious, it wouldn't need explaining.
   Non-obvious decisions are exactly what needs to be captured.
```

---

## P16: Semantic RAG, Not Database Queries

When retrieving patterns from the RAG, queries MUST be formulated as semantic
descriptions of what is being generated — not as structured field filters.

The NODE representation IS the query. Structured filters (`patternType`, `domain`,
`tags`) are post-retrieval noise reduction, not the primary retrieval mechanism.

**The question:** "Is this RAG query using semantic similarity, or is it just
a WHERE clause on indexed fields?"

**Red flags — P16 violations:**
```
❌ AF-4 query contains only term filters with no semantic query string:
   {"query": {"term": {"patternType": "FLOW_DESIGN"}}}
   This is Elasticsearch term filtering. Not RAG.

❌ Pattern retrieval returns 0 results and the response is "no relevant
   patterns found" rather than "the semantic query was not specific enough"

❌ New patterns seeded without vector embeddings at write time
   (stored but not indexed for similarity search)

❌ "We don't have a RAG pattern for this" when the correct answer is
   "the semantic query didn't find the relevant pattern — refine the query"
```

**Correct approach:**
```
semantic query: "I'm designing a validation topology that checks prerequisite
                phase completion and routes to AI-generated remediation when
                gaps are found. The topology has file-existence checks feeding
                a branch node with two paths."

post-filter: patternType=FLOW_DESIGN (reduce noise — not the primary filter)
```

---

## P17: Arbiter Panel Evaluation

Every AF station that produces or evaluates AI output operates through a specialized
arbiter panel — not a single model. The panel has three tiers:

**Generation tier:** N ≥ 2 model families generate in parallel. Outputs are shuffled
and labeled (A/B/C) before any arbiter sees them. No model attribution passes to
the evaluation tier.

**Evaluation tier:** 5 specialized arbiters evaluate every candidate output
independently. Each arbiter receives only its own expertise context — never another
arbiter's verdict:
- Business Logic Arbiter: `ironRules[] + domain events + BFA CF rules`
- Security Arbiter: `DNA-3/5/8 + stackCoupling.failureModes + auth patterns`
- Skills & Patterns Arbiter: `RAG-retrieved patterns for this archetype`
- Prompts Compliance Arbiter: `genesis prompt text + output format spec`
- Key Principles Arbiter: `P1-P(N) full text + 9 DNA patterns` (see P20 — isolated)

**Orchestration tier:** Escalation Orchestrator collects all verdicts, applies
decision rules (never averages), routes to next cycle or human escalation.

Single-model evaluation is an architectural violation. A weighted average that
allows a BLOCK-class violation to be diluted by high scores elsewhere is an
architectural violation.

**The question:** "Does every AI-driven AF station run ≥ 2 model families with
specialized blind arbiters and an escalation orchestrator?"

**Red flags — P17 violations:**
```
❌ score.handler has one AI_JUDGE_PROVIDER across all 5 evaluator dimensions
❌ DPO triple with chosen and rejected from the same model family
❌ ai-generate.handler node with no arbiters: [] field in topology contract
❌ Arbiter expertise marked as "general" (no domain boundary)
❌ BLOCK-class verdict from one arbiter averaged with PASS from others
❌ "We only have one key" — store as PENDING_COMPARISON, not as training data
```

---

## P18: OSS Model Teaching From Triple One

Every DPO triple is simultaneously a teaching artifact for open-source model
fine-tuning. Teaching structure is not delegated to FLOW-39. It is present from
the first triple stored in FLOW-01.

FLOW-39 assigns curriculum positions when active. When FLOW-39 is not active,
curriculum position is assigned manually from the archetype tier table at storage time.
FLOW-39 arriving later does not retroactively fix triples with `curriculumTier: null`.

**Curriculum tier table (assign at storage time — never defer):**

| Archetype       | Tier | Rationale                              |
|----------------|------|----------------------------------------|
| ROUTING        | 1    | Simplest — idempotency, dedup, DNA-8   |
| DATA_PIPELINE  | 2    | Requires Tier 1 fabric foundation      |
| VALIDATION     | 2    | Requires Tier 1 validate.handler       |
| TRANSACTION    | 3    | Complex state — compensation, saga     |
| ORCHESTRATION  | 4    | Multi-step, event contracts, gate events|
| SCHEDULED      | 5    | SLA windows, virtual clock, state machine|

**Required fields on every DPO triple from FLOW-01 onward:**

| Field | Required value |
|-------|---------------|
| `curriculumTier` | Integer from tier table — NEVER null |
| `targetModelFamily` | From FREEDOM config `xiigen.oss_target_model` |
| `instructionFormat` | `'deepseek-coder'` \| `'chatml'` \| `'alpaca'` |
| `distillationReadiness` | `'READY'` \| `'TOO_COMPLEX'` \| `'PENDING_SIMPLIFICATION'` |
| `chosen.model` | Model family string — MUST differ from `rejected.model` |
| `rejected.model` | Model family string — MUST differ from `chosen.model` |
| `modelComparison.shuffleWasApplied` | `true` |
| `prompt.system` | Full genesis prompt text — non-null |

**The question:** "Is every triple stored today immediately usable for OSS fine-tuning
without any transformation?"

**Red flags — P18 violations:**
```
❌ curriculumTier: null on any stored triple
❌ instructionFormat absent — fine-tuning script cannot parse the triple
❌ chosen.model === rejected.model — not DPO, intra-model style drift
❌ Shadow run omitted because "local model not ready"
❌ V9 checks skipped "until FLOW-39 is ACTIVE"
❌ "FLOW-39 will add teaching structure retroactively" — it cannot
❌ teachingPoint is generic ("lowest gates") not specific
   ("DNA-8 violated: enqueue at line 34 precedes storeDocument")
```

---

## P19: Zero Known Defects

No session ends with a known unfixed defect unless Luba has explicitly authorized
deferral in writing.

**"Pre-existing" is a description, not a disposition.** A defect observed in this
session is owned by this session — regardless of when it was introduced. The worker
force-exit warning that appeared three sessions ago and was labeled "pre-existing"
each time has been deferred three times without authorization. That is three M4
violations.

**ISSUE INVENTORY is mandatory before every ⛔ STOP:**

```
| Issue | Introduced this session? | Status | Resolution / Reason |
|-------|-------------------------|--------|---------------------|
| worker force-exit warning | NO (pre-existing) | DEFERRED | Luba to authorize fix |
| ...   | ...                     | FIXED  | clearTimeout in dispatcher.ts:249 |
```

If the inventory is empty: write "None found." — never omit the section.

**The question:** "Does the codebase have zero failures, zero unauthorized skips,
and zero unaddressed warnings as of this ⛔ STOP?"

**Red flags — P19 violations:**
```
❌ "pre-existing — not introduced by this session" as a resolution
❌ Test failures > 0 without Luba deferral authorization
❌ "N skipped (unchanged from baseline)" — each skip needs documented reason
❌ Worker leak warning in test output without an ISSUE INVENTORY entry
❌ ISSUE INVENTORY section absent from session output
❌ Defect mentioned in session log body but missing from ISSUE INVENTORY
```

---

## P20: Dedicated Principles Enforcement

The Key Principles Arbiter is a mandatory member of every arbiter panel. Its sole
expertise is the complete and current text of M1-M5 and P1-P(N) — every active
mission and implementation principle, with red flag lists and violation examples.

This arbiter exists because AI models systematically forget principles that were stated
earlier in their context. A genesis prompt that says "DNA-8: store before enqueue"
will sometimes produce code that enqueues before storing. The Business Logic Arbiter
will not catch this (not its domain). The Security Arbiter may miss it (consistency
issue, not a vulnerability). Only an arbiter whose ENTIRE context is the principles
document, and whose ONLY task is checking compliance, reliably catches violations.

**Isolation rule:** The Key Principles Arbiter receives ONLY the principles text and
the generated code. It does NOT receive: iron rules (Business Logic domain), RAG
patterns (Skills domain), security vulnerability patterns (Security domain), task type
name, archetype, or flow ID. Any additional context is a contamination that reduces
reliability.

**Verdict class:** BLOCK_OR_PASS. A principles violation is BLOCK severity. It is
never advisory. No other arbiter's score compensates for a principles violation.

**Self-reinforcement rule:** The Principles Arbiter checks whether the current run's
topology includes a Principles Arbiter entry (P17 + P20 compliance). It reads the
contract's `arbiterConfig` block and verifies `principles` role is present.

**Growth rule:** When P(N+1) is added to the principles document, the Key Principles
Arbiter's context automatically includes it at the next run. No code change required.
The context grows with the principles.

**The question:** "Is the Principles Arbiter isolated, loading the full current
principles text, producing BLOCK-class verdicts, and checking that it is present in
the current topology's arbiterConfig?"

**Red flags — P20 violations:**
```
❌ Principles Arbiter receives iron rules or RAG patterns (isolation broken)
❌ Principles Arbiter verdict is ADVISORY (must be BLOCK_OR_PASS)
❌ Principles violation averaged with high Business Logic score → overall PASS
❌ Principles Arbiter uses a summary of P1-P(N) instead of full text
❌ Principles Arbiter not present in the panel (P17 + P20 both violated)
❌ New principle added but Principles Arbiter not refreshed before next run
   (should be automatic via context — if not automatic, it is a wiring gap)
```

---

## P21: Gap Score Is a First-Class Metric

The gap score — `expensive_model_score − local_model_score` per task type per
archetype — measures how close the engine is to independence. It is tracked from
FLOW-01 Phase B onward, regardless of whether a local model is deployed.

**Action thresholds (from M3):**
- Gap score < 5% for a task type → that task type is a candidate for local model routing
- Valid DPO triples ≥ 80 across curriculum tiers → graduation test can begin (see M3)
- Gap score trending DOWN over 3+ flows → local model is learning, stay the course
- Gap score flat or rising after 5 flows → curriculum may have quality issues, check triple validity

When no local model is deployed: a placeholder record is created in
`xiigen-shadow-runs` with `ossScore: null` and `shadowStatus: 'PENDING_LOCAL_MODEL'`.
The placeholder records the expensive model's score for that task type. When a local
model becomes available, the shadow run fills in the `ossScore` and computes the gap.

Unknown gap score = unknown independence timeline = failure state. It is not neutral.
The engine cannot make cost routing decisions without gap data.

**The question:** "Does `xiigen-shadow-runs` contain a record for every task type
that has executed through the AF pipeline, even if ossScore is null?"

**Red flags — P21 violations:**
```
❌ xiigen-shadow-runs index does not exist
❌ No record in xiigen-shadow-runs for a task type that has completed Phase B
❌ Shadow run omitted because "local model not ready"
❌ Gap score absent from ENGINE PROGRESS section
❌ "We'll track independence when FLOW-39D is built"
❌ Graduation timeline estimated without querying actual gap scores
```

---

## P22: Mission Progress Is Visible at Every Phase

Every PHASE-COMPLETE-N.md, SESSION-BRIEF-N.md, and session output package begins with
an ENGINE PROGRESS section. It is the first section — not the last, not buried.

**Mandatory content (query ES — never estimate):**

```markdown
## ENGINE PROGRESS — Phase [X] Complete

| Metric                           | This Phase | Cumulative | Target | Gap          |
|----------------------------------|-----------|------------|--------|--------------|
| Valid DPO triples                | +N        | TOTAL      | 80     | REMAINING    |
| Pending DPO triples              | +N        | TOTAL      | 0      | —            |
| Shadow gap T47 (ROUTING, Tier 1) | N% / null | N% / null  | <5%    | N% / PENDING |
| Shadow gap T48 (SCHEDULED, Tier 5)| N% / null | N% / null  | <5%    | N% / PENDING |
| Shadow gap T49 (ORCH., Tier 4)   | N% / null | N% / null  | <5%    | N% / PENDING |
| (add one row per task type run)  | ...       | ...        | <5%    | ...          |
| Prompt versions improved         | N         | N total    | cont.  | —            |
| RAG patterns score ≥0.60         | N         | N total    | all    | MISSING N    |
| Flows to graduation test         | —         | —          | 24     | N remaining  |
| Estimated cost this phase        | $N        | $N total   | $0     | $N/run       |
```

**What improved this phase (required — not optional):**
- [ ] At least one prompt version advanced
- [ ] At least one RAG pattern quality score updated
- [ ] DPO triple count increased (verify: query xiigen-training-data count)

**What is blocked from improving (and why):**
State each blocked dimension with the specific blocker. "FLOW-39 not built" is a
valid blocker — but it must be stated, not silently absent.

**The question:** "After reading this ENGINE PROGRESS section, can Luba determine
whether the engine is closer to or further from independence than yesterday?"

**Red flags — P22 violations:**
```
❌ PHASE-COMPLETE begins with test counts, not ENGINE PROGRESS
❌ ENGINE PROGRESS section missing entirely
❌ Metrics estimated rather than queried from ES
❌ "What improved" checklist omitted
❌ "What is blocked" section absent — implies nothing is blocked,
   which is never true before FLOW-38/39 are active
❌ Gap scores all PENDING with no explanation of what would resolve them
```

---

## Updated Principle Count

M1 through M5 + P1 through P22. M1-M5 governing layer added v2.0.0 (before P1).
P17-P22 implementation principles added v2.0.0 (after P16).
M-principles govern. P-principles implement. When a P-principle appears to conflict
with an M-principle, the M-principle governs.
