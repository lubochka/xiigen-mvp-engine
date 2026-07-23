# SKILLS NEEDED TO PREPARE FLOW PLANS — GAP ANALYSIS
## Against: XIIGEN-DESIGN-VISION-plain-language.md (4 cycles)
## Date: 2026-04-01

---

## READING GUIDE

For each of the 4 cycles in the design vision, this document answers:
- Which skills already exist and apply directly
- Which skills exist but cover the wrong thing (need extension)
- Which skills are completely missing (new skills needed)

---

## CYCLE 1 — INTENT TO PLAN

### What Claude Code needs to be able to do
Package a user's natural language prompt as AI input.
Know what context to include (domain, constraints, prior plans).
Know what the output format is (ordered steps, dependencies, abstraction level).
Know how the Plan Reviewer tests coverage.

### Skills that exist and apply directly
**None.** SK-492 (requirement-to-flow) is the closest — it takes a UML diagram
or product spec and produces flows. But it assumes a human-authored artifact
as input. It does not handle a raw user sentence. It also produces FLOWS (with
task type IDs), not plan STEPS in plain language before any task type exists.

SK-454 (system-intake) extracts context from existing code and documents.
Useful as one source of context for packaging, but it is not the skill that
governs Cycle 1 itself.

### Skills that exist but cover the wrong scope
**SK-492 (requirement-to-flow)** — covers UML/spec → flows.
Needs a companion that covers: raw user sentence → plain-language steps.
The distinction is: SK-492 assumes a structured artifact. Cycle 1 starts
from unstructured natural language with no prior artifact.

### New skill needed
**SK-520: intent-to-plan**

What it governs:
- What is the minimum context package the Planner AI needs to receive
  (user sentence + domain constraints + prior plans for similar intents)
- What format the plan must be in (ordered steps, plain language, no technology
  names, dependency links between steps)
- What the Plan Reviewer checks (coverage, order, abstraction level, size)
- How to grade Cycle 1 output (gap count / step count)
- What RAG seeds inform this cycle (prior plans for similar user intents)

---

## CYCLE 2 — STEP TO NODE

### What Claude Code needs to be able to do
Take one plan step (plain language) and package it for 3-model convergence.
Know which challenger roles apply to this type of step.
Know how to evaluate whether the three NODE candidates converged.
Know how the judge picks and what the arbiters verify.

### Skills that exist and apply directly
**SK-435 (node-convergence)** — covers building a NODE through multi-model
convergence. Covers pre-convergence assembly, CONTEXT_INSUFFICIENT handling,
verification of output. This is the right skill — but with one gap (see below).

**SK-452 (convergence-round-design)** — covers how to design a convergence
session: challenger roles by archetype, prompt templates, termination conditions,
CONVERGENCE_SESSION training signal format. Applies directly.

**SK-442 (arbiter-panel-design)** — covers how to select and configure the
arbiter panel. Applies directly to the step where arbiters validate NODE
candidates.

**SK-446 (escalation-orchestrator)** — covers consensus rules and what happens
when convergence stalls. Applies directly.

### Skills that exist but cover the wrong scope
**SK-435 (node-convergence)** — currently assumes a pre-authored contract
(taskTypeId + EngineContract) exists before convergence runs. The STEP 1
of SK-435 says: "read the task type contract from the database."

In Cycle 2, the input is a plain-language plan step — no pre-authored contract,
no taskTypeId. The convergence process PRODUCES the NODE from the step.

SK-435 needs extension: a new input path where the domain context package is
assembled from the plan step itself, not from a pre-existing contract.
This is not a new skill — it is an additional input mode in SK-435.

### New skill needed
None for the core convergence mechanics. The extension to SK-435 is sufficient.

---

## CYCLE 3 — DEPTH DECISION

### What Claude Code needs to be able to do
After a NODE is verified, decide: is this a leaf (go to Cycle 4) or does it
need to expand into a sub-flow (go back to Cycle 1)?

Know what context informs that decision.
Know what the sub-flow decomposition looks like if expanding.
Know how to test that the decision was consistent and justified.

### Skills that exist and apply directly
**None.** No existing skill covers the LEAF / EXPAND decision or what governs it.

### Skills that exist but cover the wrong scope
**SK-492 (requirement-to-flow)** touches on flow decomposition — but at the
product level (UML → list of flows). It does not govern whether a single
verified NODE needs to expand into sub-nodes.

**SK-430 (problem-decomposition)** governs how to decompose a problem into
sub-problems. Structurally similar, but designed for planning sessions not
for runtime AI decisions about node depth.

### New skill needed
**SK-521: depth-decision**

What it governs:
- What makes a NODE a leaf vs a candidate for expansion (complexity signals
  in the NODE's structure, intent, and quality fields)
- What context the Depth Decider AI receives (the NODE + depth history for
  similar nodes from RAG + current depth level)
- What the sub-flow decomposition format looks like when expanding
  (becomes the input to a new Cycle 1 for the sub-flow)
- Termination conditions: when does recursion stop regardless of complexity
- How to test depth decision consistency across runs
- How to grade: consistency score × justification quality

---

## CYCLE 4 — LEAF NODE TO EXECUTOR

### What Claude Code needs to be able to do
Select models, prompt, judge, and arbiters for this specific leaf NODE.
Package the NODE as the input to multi-model generation (not a pre-authored task type).
Evaluate the executor against the NODE's constraints (not against pre-written iron rules).

### Skills that exist and apply directly
**SK-435 (node-convergence)** — the GENESIS PROMPT DERIVATION section already
describes how a verified NODE maps to a genesis prompt. This is the right model.

**SK-442 (arbiter-panel-design)** — covers arbiter selection. Applies directly.

**SK-513 (ai-decision-pipeline-design)** — covers AI pipeline design for
planning decisions. Partially applies to configuration selection.

**SK-512 (confidence-lifecycle-design)** — covers how performance data feeds
back into configuration selection over time. Applies to the learning component.

**SK-515 (learning-loop-closure)** — covers how execution outcomes update
the decision graph. Applies to the improvement loop.

The existing AF pipeline session files (FLOW-01 SESSION-B through F) are
the acceptance gate for executor quality. They apply unchanged.

### Skills that exist but cover the wrong scope
**SK-443 (session-file-authoring)** — currently governs how to write self-contained
instruction files for Claude Code. These are step-by-step execution documents.

Cycle 4 needs a DIFFERENT kind of document: an AI context package for the
Configuration Selector. Instead of "do step 1, call this API," the document
provides: intent, constraints, available configurations, performance history,
and success criteria — and the AI decides what to do.

These are fundamentally different document types. SK-443 governs instruction
files. A new skill is needed for context packages.

### New skills needed
**SK-522: AI context package authoring**

What it governs:
- The fundamental difference between an instruction file (tells Claude Code
  what to do step by step) and an AI context package (gives AI the context
  to decide what to do)
- The five required fields in every context package:
  INTENT / CONSTRAINTS / CONTEXT / RAG SEEDS / SUCCESS CRITERIA
- What belongs in each field and what does not
- How context packages are versioned and updated as performance data accumulates
- How to test a context package: does the AI reading it produce coherent
  decisions without being told what those decisions should be

**SK-523: configuration selection design**

What it governs:
- How the Configuration Selector AI chooses models, prompts, judge, and
  arbiters for a specific leaf NODE
- What performance data from RAG informs the selection
  (which model won most for this node type, which prompt produced fewest
  arbiter failures, which judge was most reliable)
- What the selection output format looks like
  (a configuration record: model A for generator 1, model B for generator 2,
  model C for judge, arbiters X+Y, prompt template Z)
- How the selection is recorded for future learning
- How to test that selection is improving over time
  (does the chosen configuration produce better executor quality than
  the default configuration would have?)

---

## CROSS-CUTTING MISSING SKILL

### What Claude Code needs to be able to do (across all cycles)
At every cycle, emit a structured visibility record:
what was sent, what came back, what was decided, what changed.

### New skill needed
**SK-524: cycle visibility design**

What it governs:
- The structure of the visibility record emitted at every cycle
- What "what was sent" means at each cycle type
  (Cycle 1: full context package sent to Planner AI
   Cycle 2: NODE candidates A/B/C side by side
   Cycle 3: depth decision reasoning
   Cycle 4: executor candidates A/B/C + judge reasoning)
- What "what was decided" must include (reasoning, not just winner)
- How visibility records are stored and queryable
- How to test visibility completeness: can you reconstruct the full
  decision path from the records alone, without re-running?

---

## SUMMARY TABLE

| Cycle | Skill needed | Status |
|-------|-------------|--------|
| Cycle 1: Intent → Plan | SK-520 (intent-to-plan) | MISSING — new skill |
| Cycle 2: Step → NODE | SK-435 (node-convergence) | EXISTS — needs input path extension |
| Cycle 2: Step → NODE | SK-452 (convergence-round-design) | EXISTS — applies directly |
| Cycle 2: Step → NODE | SK-442 (arbiter-panel-design) | EXISTS — applies directly |
| Cycle 3: Depth Decision | SK-521 (depth-decision) | MISSING — new skill |
| Cycle 4: Configuration | SK-522 (AI context package authoring) | MISSING — new skill |
| Cycle 4: Configuration | SK-523 (configuration selection design) | MISSING — new skill |
| All cycles: Visibility | SK-524 (cycle visibility design) | MISSING — new skill |
| Cycle 4: Executor gate | Existing AF pipeline skills (SK-435 genesis, SK-442 arbiters) | EXISTS — applies unchanged |
| All cycles: Learning | SK-512 (confidence-lifecycle) | EXISTS — applies directly |
| All cycles: Learning | SK-515 (learning-loop-closure) | EXISTS — applies directly |

---

## WHAT THIS MEANS FOR PREPARING FLOW PLANS

Before Claude Code can prepare a flow plan for any of FLOW-01 through FLOW-09
under the new model, it needs:

**Immediately (without these, the plan cannot be written):**
- SK-520 (intent-to-plan) — to know how to package the user prompt for Cycle 1
- SK-521 (depth-decision) — to know when the plan step becomes a leaf vs expands
- SK-522 (AI context package authoring) — to know what format the plan document
  should be in (context package, not instruction file)

**Before the plan can be tested:**
- SK-524 (cycle visibility design) — to know what observable outputs verify
  that each cycle worked correctly

**Before configuration can improve over time:**
- SK-523 (configuration selection design) — to know how model/prompt/judge
  selection is recorded and improved

**The existing skills (SK-435, SK-452, SK-442, SK-512, SK-515) provide the
mechanics for Cycles 2 and 4 once the above gaps are filled.**

---

## NEXT STEP

Write SK-520, SK-521, SK-522, SK-524 in that order.
SK-523 can follow once the first four are in place.
SK-435 extension (new input path) is written alongside SK-520
since they define the interface between Cycle 1 and Cycle 2.
