# XIIGEN — WHAT WE ARE BUILDING AND HOW WE TEST IT
## Plain language. No code. No handler names.
## Date: 2026-04-01

---

## THE JOURNEY FROM USER PROMPT TO RUNNING CODE

Everything starts with a single sentence from a user.

```
"I need a user registration flow for a NestJS application."
```

What happens from that sentence to working, tested, deployable code is a series
of AI-driven cycles. Each cycle has players. Each player has a job. Each job
produces something that the next player uses.

This document describes every player, every cycle, and how you know each one
did its job correctly.

---

# CYCLE 1 — INTENT TO PLAN

## What happens

The user's sentence enters the system. The first job is to turn it into a
structured plan — a list of steps in plain language, ordered, with dependencies
between them. Not code. Not task types. Plain language steps.

Example:
```
Step 1: Accept the user's credentials (email or SSO token)
Step 2: Verify the email address is unique
Step 3: Create the user record
Step 4: Send a verification email and wait for confirmation
Step 5: Deliver the onboarding experience
```

The AI does not know the infrastructure yet. It is describing WHAT needs to happen,
not HOW it will be implemented.

---

## THE PLAYERS IN CYCLE 1

### Player: The Planner

| Field | Description |
|-------|-------------|
| Who | One AI model (best available for reasoning and decomposition) |
| What it receives | The user's prompt + context about the domain (what kind of system this is, what constraints apply) |
| What it produces | An ordered list of plain-language steps with dependency relationships |
| What it must NOT produce | Code, class names, task type IDs, technology choices |
| Connected context | Domain knowledge (what a registration flow typically involves), constraint rules (what must always hold — e.g. email uniqueness before record creation), prior plans from similar flows |

### Player: The Plan Reviewer

| Field | Description |
|-------|-------------|
| Who | A different AI model acting as a critic |
| What it receives | The plan produced by the Planner |
| What it produces | A verdict: complete / incomplete / has gaps. If gaps: what is missing |
| Connected context | The original user prompt — does the plan actually cover what was asked? |

---

## HOW YOU TEST CYCLE 1

**Test question:** Did the Planner produce a plan that covers the user's intent?

| What you check | How you check it (no code) | Acceptable result |
|---------------|---------------------------|-------------------|
| Coverage | Does every part of the user's request appear somewhere in the plan? | Every named intent in the prompt maps to at least one step |
| Order | Does the dependency order make logical sense? | No step depends on something that comes after it |
| Completeness | Does the Plan Reviewer find gaps? | Zero gaps identified |
| Abstraction level | Are any steps already technology-specific? | No technology names, no class names in steps |
| Size | Is the plan reasonable (not too coarse, not too granular)? | Between 3 and 12 steps for a typical flow |

**Grade for Cycle 1:** Number of gaps found by the Plan Reviewer divided by total steps.
Zero gaps = 1.0. Each gap reduces the grade proportionally.

---

# CYCLE 2 — PLAN STEP TO NODE

## What happens

Each step in the plan now goes through its own AI process independently.
The goal is to turn "Accept the user's credentials (email or SSO token)"
into a structured NODE — a richer description of what this step really is,
what it needs, what it produces, and what constraints apply to it.

A NODE looks like this (in plain language):
```
INTENT:       Accept initial signup credentials and determine authentication path
STRUCTURE:    Receives: email or SSO token. Produces: authenticated identity or rejection
CONSTRAINTS:  Must not store raw password. Must validate SSO token via external provider.
              Must check email uniqueness before creating any record.
QUALITY:      This is the security boundary. Any mistake here affects every downstream step.
```

Three different AI models each produce their version of this NODE independently.
They do not see each other's output while generating.

Then a judge sees all three versions and decides which is best — or whether
elements from multiple versions should be combined.

---

## THE PLAYERS IN CYCLE 2

### Player: Node Generator (×3, run in parallel)

| Field | Description |
|-------|-------------|
| Who | Three different AI models, called simultaneously, each blind to the others |
| What it receives | The plan step in plain language + the full context package for this step |
| What it produces | A NODE: intent, structure (inputs/outputs), constraints, quality notes |
| What it must NOT produce | Code, implementation details, technology choices |
| Connected context | RAG-retrieved patterns from similar prior nodes, domain constraints, DNA rules that always apply |

### Player: The Node Judge

| Field | Description |
|-------|-------------|
| Who | A designated judge model (e.g. Sonnet) — different from the three generators |
| What it receives | All three NODE candidates, labeled A/B/C (shuffled — judge does not know which model produced which) |
| What it produces | A ranking with scores and reasoning. Which NODE best captures the intent, constraints, and quality requirements |
| Connected context | The original plan step, the domain constraints, what "good" looks like for this type of node |

### Player: The Arbiters

| Field | Description |
|-------|-------------|
| Who | Specialized AI evaluators — each focused on one dimension (security, business logic, data integrity, etc.) |
| How they are selected | ALSO by AI — based on what the NODE is about. A security-sensitive step gets a security arbiter. A data aggregation step gets a data integrity arbiter. The arbiter panel is not fixed. |
| What each arbiter receives | The winning NODE candidate + the specific dimension it evaluates |
| What each arbiter produces | Pass / concern / block for its dimension, with reasoning |
| Connected context | Domain rules for that specific dimension, prior violations caught for similar nodes |

---

## HOW YOU TEST CYCLE 2

**Test question:** Did the three generators converge on a coherent NODE, and did the judge pick the right one?

| What you check | How you check it | Acceptable result |
|---------------|-----------------|-------------------|
| Convergence | How similar are the three NODE candidates to each other? | Core intent and constraints are consistent across all three — details may differ |
| Judge consistency | If you run the same three candidates through the judge twice, does the same one win? | Same winner both times (or explainable tie) |
| Arbiter agreement | Do the arbiters agree with the judge's choice? | No arbiter blocks the winning NODE |
| Constraint completeness | Does the NODE capture all constraints that must hold for this step? | Cross-reference against domain constraint rules — none missing |
| Abstraction level | Is the NODE still technology-neutral? | No technology names in intent, structure, or constraints |
| Quality capture | Does the NODE identify what makes this step hard or risky? | Quality section is non-empty and specific |

**Grade for Cycle 2 (per node):**
- Convergence score: how similar were the three candidates (high similarity = easy judge job = good)
- Arbiter score: fraction of arbiters that passed (no concerns)
- Judge confidence: how far apart were the scores of the top two candidates (large gap = clear winner = confident judge)

---

# CYCLE 3 — NODE DEPTH DECISION

## What happens

After a NODE is produced and verified, the system must decide:
**Is this a leaf (go directly to code generation) or does it need sub-flows?**

This decision is also made by AI — not by a pre-set rule.

The AI looks at the NODE and asks:
- Is the intent simple enough to generate in one step?
- Or does it contain multiple distinct responsibilities that should each become their own node?

If it decides to expand: the NODE's structure becomes the input for a new Cycle 1
(intent to plan) — but now for the sub-flow. The same process repeats.

If it decides it's a leaf: the NODE moves to code generation (Cycle 4).

---

## THE PLAYERS IN CYCLE 3

### Player: The Depth Decider

| Field | Description |
|-------|-------------|
| Who | An AI model (can be same judge model) |
| What it receives | The verified NODE + a depth context (how deep are we already? what did similar nodes look like at this depth?) |
| What it produces | LEAF or EXPAND. If EXPAND: a proposed sub-flow decomposition |
| Connected context | Prior depth decisions for similar nodes (from RAG), current depth level, constraints on maximum depth |

---

## HOW YOU TEST CYCLE 3

**Test question:** Did the depth decision make sense?

| What you check | How you check it | Acceptable result |
|---------------|-----------------|-------------------|
| Consistency | For the same NODE type, does the same depth decision get made across different runs? | Same decision ≥ 80% of the time |
| Justification | Did the Depth Decider explain why it chose LEAF or EXPAND? | Non-empty reasoning that references the NODE's content |
| Depth sanity | Is the resulting tree a reasonable depth for the complexity of the original request? | A simple flow doesn't go 6 levels deep. A complex orchestration doesn't stay at 1 level. |
| Sub-flow coherence | If EXPAND: does each sub-node cover a distinct responsibility? | No two sub-nodes have overlapping intents |

**Grade for Cycle 3:** Consistency score × justification quality (human-readable reasoning present = 1.0, absent = 0.0)

---

# CYCLE 4 — LEAF NODE TO EXECUTOR

## What happens

A leaf node has a fully specified NODE: intent, structure, constraints, quality.
Now three AI models each generate an implementation — an executor — that satisfies
that NODE.

This is where the existing AF pipeline applies. What we already have (multi-model
generation, blind judging, score brackets, DPO triples) is the right model for this
cycle. It just needs to receive a properly specified NODE as input instead of a
pre-authored task type ID.

The prompt, the models, the judge, and the arbiters for this cycle are also
AI-configured — based on what the NODE describes. A security-sensitive leaf gets
a security-focused prompt and a security arbiter. A data aggregation leaf gets
different configuration. The configuration adapts to the node.

---

## THE PLAYERS IN CYCLE 4

### Player: Configuration Selector

| Field | Description |
|-------|-------------|
| Who | AI model |
| What it receives | The verified leaf NODE |
| What it produces | Which prompt template to use, which models to call, which judge, which arbiters, which API sources — all chosen based on the NODE's content and prior performance data |
| Connected context | Performance history for similar nodes (which model performed best on security nodes? on data nodes?), available model/API configurations |

### Player: Executor Generator (×3, run in parallel)

| Field | Description |
|-------|-------------|
| Who | Three AI models selected by the Configuration Selector |
| What it receives | The leaf NODE + the selected prompt configuration |
| What it produces | An implementation (executor) that satisfies the NODE |
| Connected context | RAG patterns from similar prior executors, DNA rules, fabric constraints |

### Player: Execution Judge + Arbiters

| Field | Description |
|-------|-------------|
| Who | Judge and arbiters selected by Configuration Selector |
| What they receive | The three executor candidates |
| What they produce | Winner selection + scores + DPO triple (chosen vs rejected) for training |
| Connected context | The NODE's constraints — these are the acceptance criteria |

---

## HOW YOU TEST CYCLE 4

This is where the existing session files apply. FLOW-01-SESSION-B through F
already define how to score an executor, what DNA violations look like, what
a valid DPO triple requires. Those tests do not change.

**The one new test for Cycle 4:** Does the executor actually satisfy the NODE it was built for?

| What you check | How you check it | Acceptable result |
|---------------|-----------------|-------------------|
| Intent coverage | Does the executor implement everything the NODE's intent describes? | Every intent clause maps to observable behavior |
| Constraint satisfaction | Does the executor respect every constraint in the NODE? | Zero constraint violations |
| Structure match | Does the executor's inputs/outputs match the NODE's declared structure? | Input and output shapes match |

---

# WHAT YOU SEE AT EVERY CYCLE (VISIBILITY)

At every cycle — Cycle 1 through 4 — the system emits a structured record:

```
WHAT WAS SENT:
  The full context package given to each AI player
  Which model, which prompt configuration, which RAG patterns were retrieved

WHAT WAS RECEIVED:
  Each player's output, side by side
  For multi-model cycles: all three outputs visible, labeled A/B/C

WHAT WAS DECIDED:
  The judge's verdict and reasoning
  Each arbiter's verdict and reasoning
  The final winner and its grade
  What the runner-up produced (for DPO training)

WHAT CHANGED:
  Which configuration choices were made and why
  What performance data was updated
  What RAG seeds were strengthened or weakened
```

This record is the engine's "thinking visible." You can trace any output back
to every decision that produced it.

---

# HOW THE PLAYERS IMPROVE OVER TIME

Every cycle produces training data. The system learns which configurations
work best for which kinds of nodes.

| What gets better | How |
|-----------------|-----|
| Model selection | Track which model wins most often for each node type. Over time, the Configuration Selector learns to choose the right model for the right node. |
| Prompt selection | Track which prompt configurations produce executors that pass all arbiter checks. Winning prompts get stronger weighting in RAG. |
| Judge reliability | Track when the judge's top-ranked candidate later fails in testing. Unreliable judges get replaced. |
| Arbiter panel | Track which arbiters catch real problems vs false alarms. Useful arbiters stay. Noisy arbiters are demoted. |
| Depth decisions | Track whether LEAF decisions that were later found to be too coarse (executor had to be split) vs EXPAND decisions that were unnecessarily deep. |

**Nothing is hardcoded. Everything is a configuration that can be updated based on evidence.**

---

# THE FULL PICTURE (ONE PAGE)

```
USER PROMPT
"I need a user registration flow"
    │
    ▼
CYCLE 1 — INTENT TO PLAN
  Planner AI → ordered steps in plain language
  Plan Reviewer AI → verifies coverage
  Test: zero gaps, correct abstraction level
    │
    ▼ (one branch per step, parallel)
CYCLE 2 — STEP TO NODE (per step)
  3 Generator AIs → 3 NODE candidates (parallel, blind)
  Node Judge AI → picks best candidate
  Arbiter AIs (AI-selected panel) → validate each dimension
  Test: convergence score, arbiter pass rate, judge confidence
    │
    ▼
CYCLE 3 — DEPTH DECISION (per node)
  Depth Decider AI → LEAF or EXPAND?
  If EXPAND → back to Cycle 1 for the sub-flow
  If LEAF → forward to Cycle 4
  Test: consistency, justification, depth sanity
    │
    ▼ (only for LEAF nodes)
CYCLE 4 — LEAF NODE TO EXECUTOR
  Configuration Selector AI → picks models, prompts, judge, arbiters
  3 Executor Generator AIs → 3 implementations (parallel, blind)
  Execution Judge + Arbiters → winner + DPO triple
  Test: existing AF pipeline gates (FLOW-01-SESSION-B through F)
    │
    ▼
VISIBILITY RECORD (emitted at every cycle)
  What was sent | What came back | What was decided | What changed

LEARNING (after every cycle)
  Model performance updated
  Prompt weights updated
  Arbiter reliability updated
  Depth decision calibration updated
```

---

# WHAT THE EXISTING FLOW PLANS BECOME

FLOW-01 through FLOW-09 do not disappear. They become:

**The acceptance test for Cycle 4.**

When a leaf node for "accept user credentials" is generated, FLOW-01's session
files define what a correct executor looks like: which DNA rules must hold, which
iron rules must pass, what a valid score looks like. That does not change.

What changes is what feeds INTO those session files. Instead of a pre-authored
task type ID, the input is a fully specified NODE produced by Cycles 1 through 3.

The existing session files are the quality gate at the END. The new cycles
described above are the discovery process at the BEGINNING.

---

*This document describes intent only. No implementation details, no handler names,
no code structure. It describes what each AI player does, what it receives,
what it produces, and how you verify it did its job.*
