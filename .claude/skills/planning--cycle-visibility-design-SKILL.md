---
name: cycle-visibility-design
sk_number: SK-524
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-04-01"
contexts: ["web-session", "claude-code"]
description: >
  Governs the visibility records emitted at every cycle of the XIIGen self-building
  loop (Cycles 1 through 4). Defines the 4-field record structure (SENT, RECEIVED,
  DECIDED, CHANGED), per-cycle specifications for all 4 cycles, and a completeness
  test that verifies the full decision path is traceable. Load before writing Step 9
  of the flow plan guide. Without this skill, visibility records have empty DECIDED
  fields and produce no learning — a cycle that ran but left no trace.
triggers:
  - "visibility record"
  - "cycle visibility"
  - "what was sent"
  - "what was decided"
  - "step 9 flow plan"
  - "visibility contract"
  - "per-cycle record"
  - "traceability"
  - "cycle transparency"
---

# Cycle Visibility Design Skill (SK-524) v1.0

## WHAT THIS SKILL PREVENTS

1. **Empty DECIDED fields.** The natural default when capturing output is to
   record the winner. But "Winner: B" alone is not a visibility record —
   it is a result log. A visibility record requires reasoning that references
   the context package. Without it, you cannot verify the decision was correct.

2. **Invisible cycles.** A cycle with no visibility record is a cycle that
   cannot be audited, debugged, or learned from. Its output stands without
   evidence. When a later cycle produces wrong output, you cannot trace which
   earlier decision caused it.

3. **CHANGED field as optional.** Every cycle changes something — a RAG index,
   a graph edge, a DPO triple. A cycle that changed nothing produced no learning.
   Silent empty CHANGED fields mask this failure.

---

## WHEN TO INVOKE

Load before writing the visibility contracts (Step 9 of the flow plan guide).
Load when reviewing a flow plan's visibility section — use the completeness
test in Section 4 to evaluate whether the contracts are sufficient.

---

## SECTION 1 — WHY VISIBILITY IS A MACHINE REQUIREMENT

Visibility records are not optional logs. They are required for three distinct
reasons, each of which breaks a different part of the system if absent:

**Reason 1 — Testing:** You cannot verify a cycle produced the right output
without seeing what the AI was given and what it decided. If you cannot see
the SENT context package, you cannot check whether the AI operated within
correct constraints. If you cannot see the DECIDED reasoning, you cannot
check whether the judge made a defensible choice. Without visibility, test
results are assertions without evidence.

**Reason 2 — Learning:** The CHANGED field is the trigger for the learning
loop (SK-515). When CHANGED is empty, no graph edge update fires, no DPO
triple is stored, no RAG index is updated. The cycle ran but the system is
no wiser afterward. Over many cycles, missing CHANGED fields mean the system
never learns — configuration selection stays at its initial defaults forever.

**Reason 3 — Debugging:** When a cycle produces wrong output, the visibility
record is the only way to trace which input caused the wrong decision. Without
the full SENT context package in the record, debugging requires re-running the
cycle — which may produce different output. Without the DECIDED reasoning, you
cannot determine whether the judge failed or the context package was wrong.

> **The governing rule:**
> A cycle with no visibility record is a cycle that never ran.
> Its output cannot be trusted and its learning cannot be captured.

---

## SECTION 2 — THE 4-FIELD RECORD STRUCTURE

Every cycle emits one visibility record. All 4 fields are required.
An empty field is a **failed record** — not an acceptable output.

### SENT

```
Definition:   The full context package given to the AI for this cycle.
Required:     The complete SK-522 package — all 5 fields with their actual values.
              Not a summary. Not a reference to another document.
Complete means: Every SK-522 field (INTENT, DOMAIN, CONSTRAINTS, PRIOR_ART,
                SUCCESS) is present with the values that were actually used.
Empty fails because: Without SENT, you cannot verify the AI operated within
                     correct constraints. If a test fails, you cannot determine
                     whether the context package or the AI judgment was wrong.
```

### RECEIVED

```
Definition:   Each model's output, labelled and unmodified.
Required:     One entry per model called, labelled A/B/C (shuffled — model
              identity is not revealed in the label until after judgment).
Complete means: N entries where N = number of models called.
                Each entry contains: label, full output, token count.
                "Full output" means the complete text — not a summary.
Empty fails because: Without RECEIVED, you cannot verify multi-model generation
                     ran correctly or that the judge saw all candidates.
```

### DECIDED

```
Definition:   The winner + the judge's reasoning.
Required:     Winner label AND reasoning that references the context package.
Complete means: "Winner: [label] — [reasoning citing at least one criterion
                from the SENT context package that distinguished winner
                from runner-up]"
               PLUS each arbiter's verdict (PASS / CONCERN / BLOCK) and
               the specific criterion evaluated.
Empty fails because: "Winner: B" alone is not complete.
                     The reasoning is what makes the decision auditable.
                     Without it, judge reliability cannot be evaluated over time.
Failing examples:
  ❌ "Winner: B"  (no reasoning)
  ❌ "Winner: B — better quality"  (no criterion reference)
  ✅ "Winner: B — only candidate where CONSTRAINTS.DNA-8 (store before enqueue)
      is respected in the proposed step ordering. Candidates A and C inverted
      the order."
```

### CHANGED

```
Definition:   What in RAG or the decision graph was updated as a result.
Required:     At minimum one entry naming the index updated and the key.
Complete means: "[index name] key [key value] updated with [what changed]"
               Example: "xiigen-rag-patterns key 'user-registration/step-1-credentials'
                          updated — new NODE representation added"
               "Nothing changed" is valid ONLY when explicitly stated with reasoning.
               Example: "CHANGED: nothing — this is a re-run of an existing step,
                          RAG already contains a representation for this domain+step."
Empty without statement fails because: Every cycle produces learning or it doesn't.
                                       Silence cannot distinguish "nothing changed"
                                       from "the CHANGED field was forgotten."
```

---

## SECTION 3 — PER-CYCLE SPECIFICATIONS

What each of the 4 fields contains for each cycle specifically.

### Cycle 1 — Intent to Plan

```
SENT:
  The Cycle 1 context package assembled by SK-520:
  - INTENT: user sentence verbatim
  - DOMAIN: 2-3 sentence domain description
  - CONSTRAINTS: all invariants from state.invariants
  - PRIOR_ART: RAG query string used (or "NO_PRIOR_ART")
  - SUCCESS: valid plan step format definition

RECEIVED:
  [Model A output]: full plan produced by Planner AI
  [Reviewer output]: gap analysis from Plan Reviewer AI
  (Note: Cycle 1 uses Planner + Reviewer, not 3 parallel generators.
   The "received" is the plan + the review, not 3 candidates.)

DECIDED:
  - Plan accepted or rejected
  - If accepted: coverage score, abstraction score, grade
  - If rejected: specific gaps found by reviewer + what Cycle 1 will rerun with
  - Grade: [numeric] vs threshold [numeric]

CHANGED:
  - If accepted: "xiigen-rag-patterns key '[flow-id]/cycle1-plan' updated —
                  plan for [flow intent] added"
  - If rejected: "no update — plan rejected at grade [X], below threshold [Y]"
```

### Cycle 2 — Plan Step to NODE

```
SENT:
  The Cycle 2 context package for THIS step (one record per step):
  - INTENT: plan step verbatim (parameterised from the template)
  - DOMAIN: [Depth N] node in [flow domain] flow
  - CONSTRAINTS: flow invariants + challenger roles for this step type
  - PRIOR_ART: RAG query used for this step type
  - SUCCESS: valid NODE format (structure, intent, constraints, quality)

RECEIVED:
  [Candidate A]: full NODE from generator model A
  [Candidate B]: full NODE from generator model B
  [Candidate C]: full NODE from generator model C
  (Labels shuffled — judge does not know which model produced which)

DECIDED:
  - Winner: [label]
  - Judge reasoning: [reference to NODE field that distinguished winner]
  - Arbiter verdicts: [arbiter name]: PASS/CONCERN/BLOCK — [criterion evaluated]
  - Convergence score: [how similar were the 3 candidates on intent + constraints]

CHANGED:
  - "xiigen-rag-patterns key '[flow-id]/[step-text-hash]/node' updated —
      winning NODE representation added"
  - "decision-graph edge '[archetype]-convergence' confidence updated —
      [direction and magnitude of update per SK-512]"
```

### Cycle 3 — Depth Decision

```
SENT:
  The Cycle 3 context package assembled by SK-521:
  - INTENT: full verified NODE object from Cycle 2
  - DOMAIN: depth level + flow domain
  - CONSTRAINTS: termination bound + sub-flow non-overlap rule
  - PRIOR_ART: RAG query for depth decisions for this NODE type
  - SUCCESS: LEAF/EXPAND verdict format with required justification

RECEIVED:
  [Depth Decider output]: LEAF or EXPAND verdict with justification
  (Single model — no parallel generation at this cycle)

DECIDED:
  - Verdict: LEAF or EXPAND
  - Justification: complexity signal(s) cited with NODE field evidence
    OR "termination depth [N] reached — bound enforced"
  - If EXPAND: sub-flow decomposition (list of proposed sub-node names)

CHANGED:
  - "xiigen-depth-decisions key '[node-type]/depth-[N]' updated —
      [LEAF/EXPAND] decision recorded"
  - "state.cycle3.depth_history updated with this decision"
  - If EXPAND: "new Cycle 1 initiated for sub-flow: [sub-node list]"
```

### Cycle 4 — Leaf to Executor

```
SENT:
  The executor context package (leaf NODE + configuration selection):
  - Leaf NODE full object
  - Selected configuration: which models, which judge, which arbiters,
    which prompt template — chosen by Configuration Selector AI

RECEIVED:
  [Executor A]: full implementation from generator model A
  [Executor B]: full implementation from generator model B
  [Executor C]: full implementation from generator model C
  [Judge verdict]: winner selection + scores + reasoning

DECIDED:
  - Winner executor: [label]
  - Judge reasoning: [reference to NODE constraints that distinguished winner]
  - Arbiter panel verdicts: [each arbiter]: PASS/CONCERN/BLOCK
  - Scores: [per arbiter dimension]

CHANGED:
  - "DPO triple stored: chosen=[label], rejected=[labels], prompt=[hash]"
  - "configuration-performance key '[node-archetype]/[configuration-hash]'
      updated — [quality score] recorded"
  - "decision-graph model-selection edge updated per SK-512"
```

---

## SECTION 4 — COMPLETENESS TEST

One test that verifies the full decision chain is traceable from the records alone.

**The test:** Given only the 4 visibility records from one complete leaf-node
execution (all 4 cycles for one leaf), answer these 4 questions using only
the records — no re-running, no external lookups:

```
Q1: What did the user originally ask?
    Source: Cycle 1 SENT.INTENT
    Fail condition: INTENT is summarised, rephrased, or missing.

Q2: Which model produced the winning executor?
    Source: Cycle 4 RECEIVED labels + Cycle 4 DECIDED winner
    Fail condition: Labels are not present, or winner cannot be matched
                    to a specific model.
    Note: Labels A/B/C are shuffled during judgment. The record must include
          the de-shuffled model identity after the verdict is recorded.

Q3: Why was the depth decision LEAF (not EXPAND)?
    Source: Cycle 3 DECIDED justification
    Fail condition: DECIDED says "LEAF" with no signal reference and no
                    termination-bound statement.

Q4: What changed in the decision graph as a result of this execution?
    Source: All 4 cycles' CHANGED fields
    Fail condition: Any CHANGED field is empty without an explicit
                    "nothing changed" statement with reasoning.
```

If any question cannot be answered: the visibility contract for that cycle
is incomplete. Fix the cycle's CHANGED/DECIDED specification before the
flow plan is marked ready.

This test runs at Step 10 of the flow plan guide (chain review).

---

## ANTI-PATTERNS

**"I'll add DECIDED reasoning when I have more context."**
Found: DECIDED field contains only the winner label.
The reasoning must be written at the time of judgment — not reconstructed later.
Fix: Define what DECIDED must contain in the visibility contract BEFORE
     the cycle runs. The contract is the specification. The runtime record
     fills it. If the contract allows "Winner: [label]" that is what gets produced.

**"CHANGED is not relevant for Cycle 3 — the depth decision doesn't update RAG."**
Found: Cycle 3 visibility contract has no CHANGED specification.
Fix: Section 3 Cycle 3 CHANGED: "xiigen-depth-decisions" index is updated.
     State.cycle3.depth_history is updated. These are real changes.
     Depth decisions that leave no trace cannot improve over time.

**"I write one visibility record for the whole flow."**
Found: Single record covering all steps of a multi-step flow.
Visibility records are per-cycle, per-step. Each step in Cycle 2 gets its
own record. Each depth decision in Cycle 3 gets its own record.
Fix: Multiply the record count by the number of steps/decisions.
     One visibility record per cycle per step processed.

**"The RECEIVED field summarises the model outputs to save space."**
Found: RECEIVED contains bullet summaries of each candidate.
Fix: RECEIVED must contain full unmodified outputs. Summaries bias
     the audit — the auditor sees what the summariser thought was important,
     not what the models actually produced.

---

## SECTION 5 — UNIVERSAL COUNT-HONESTY CORE (from core; applies to ALL review/fix cycles)

The 4-field SENT/RECEIVED(A/B/C)/DECIDED(arbiter)/CHANGED(training-index) form
above is the XIIGen self-building **engine** machinery. Per R5/R6 and the G12
boundary, that ML multi-model-arbiter form is **optional** and applies only to the
multi-SDK generation path (mvp does call 3 SDKs — Anthropic/OpenAI/Google — so
RECEIVED=A/B/C + DECIDED=selection-criterion can be reproduced there as mvp
specificity, NOT as a universal requirement).

What IS universal and portable — required for EVERY review/fix cycle, including a
plain plan-review, code-review, or governance-repair cycle that has no model
arbiter:

1. **A cycle with no visible record is a cycle that never ran.** Every review/fix
   cycle leaves an inspectable record whose outcome is a NON-EMPTY before/after
   delta (what was checked, what changed, or an explicit "no fix needed because…"
   justification). An empty-outcome record is a failed record.

2. **Count honesty — a ledger row is not a cycle.** "We ran N review/fix cycles"
   is valid ONLY when there are N independently-inspectable before/after records
   of that exact type. 50 ledger rows after one real review is ONE review. A
   generated table, a checklist, or a JSON array of rows is not N cycles.

3. **Actor honesty.** "Sub-agent reviewed it" requires a named sub-agent id and
   returned packet. Parent self-review is not a sub-agent review — say the parent
   did it, or say the actor is not proven.

Minimal universal review/fix record (no ML arbiter needed):
```text
cycle_id:
what_was_checked:        (exact plan section / file / claim)
verdict:                 (PASS | NEEDS_FIX)
finding_or_no_fix_reason: (non-empty — empty = failed record)
fix_ref_or_NONE:
recheck_evidence:
reviewer_or_subagent_id_or_PARENT:
```

For mvp, store this through the typed Result + the repo's store; the "non-empty
result" validator is the gate (a cycle that produced nothing did not run).

## INTEGRATION

**What invokes SK-524:**
- Step 9 of the flow plan preparation guide (write visibility contracts)
- Step 10 (chain review) — completeness test from Section 4

**What SK-524 produces:**
- A visibility contract for each cycle (4 contracts per flow plan)
- The completeness test criteria for Step 10

**What uses SK-524's output:**
- The engine runtime — emits records conforming to the contracts
- Step 10 chain review — completeness test verifies contracts are sufficient
- SK-512 (confidence-lifecycle) — CHANGED field triggers edge confidence updates
- SK-515 (learning-loop-closure) — CHANGED field is the learning trigger
- SK-520 (intent-to-plan) — Cycle 1 SENT field is defined by this skill
- SK-521 (depth-decision) — Cycle 3 SENT field is defined by this skill
