# XIIGEN — ARCHITECTURAL DECISION ADDENDUM
## Appended to: XIIGEN-SESSION-LOAD-PLAN-v3.md
## Date: 2026-04-01
## Status: MANDATORY READ — governs every implementation and planning decision

---

## THE GOVERNING QUESTION FOR EVERY DECISION

> **"Am I making this decision for the AI, or am I giving the AI the minimum
> it needs to make the decision itself?"**

If the answer is "I am making it" — stop. Rewrite the context package.
If the answer is "I am giving it boundaries and letting it discover" — proceed.

This is not optional design philosophy. It is the difference between XIIGen
learning and XIIGen transcribing. Every prompt, every context package field,
every test assertion must pass this question before it ships.

---

## THE TWO FAILURE MODES (and how to detect each)

### Failure Mode A — Over-Prescription (feeding the AI)

**What it looks like:**
The context package is so complete that the three generators produce identical
NODEs on round 1. Convergence score = 1.0 immediately. No genuine disagreement.

**What it produces:**
- DPO triple is stored but the chosen and rejected candidates are identical in
  structure — only wording differs. This records style preference, not capability
  understanding.
- RAG index accumulates NODEs that are copies of the context package.
- Graph confidence edges never move because every decision is obvious from the
  first call — nothing is learned.

**The signal:** convergence score = 1.0 on round 1, every run, for every step.

**The cause:** DOMAIN, CONSTRAINTS, or PRIOR_ART already contains the answer.
The generators are reading the domain description, copying it into intent.purpose,
renaming the DNA constraints into the constraints field, and returning.
They did not reason. They transcribed.

---

### Failure Mode B — Under-Prescription (AI cannot resolve)

**What it looks like:**
Context package is too sparse. Generators produce incompatible NODEs — one
structural, one implementation plan, one service spec. Arbiters cannot resolve
within max_rounds.

**What it produces:**
- Session stalls. No accepted NODE. DPO triple is stored but the "chosen" was a
  forced selection from incompatible candidates — the system never learned what
  a valid NODE for this domain looks like.

**The signal:** convergence score never reaches 0.85 within max_rounds.

---

### The Only Pattern That Produces Learning

```
Score starts below 0.85
     ↓
Rounds 2-4: arbiters challenge, generators refine
     ↓
Score reaches ≥ 0.85 at round 2, 3, or 4
```

This is genuine inference. The three generators had real disagreement. The
arbiters surfaced it. The CONVERGENCE_SESSION training signal captured which
resolution was correct. The DPO triple records meaningful difference: this
understanding of the capability won over that understanding.

**This is the only pattern that produces planning intelligence learning.**

---

## THE THREE-SIGNAL TEST: "IS XIIGEN ACTUALLY LEARNING?"

Run this test after every 5 flow plan sessions. If any signal fails,
the context packages are over-prescriptive and must be reduced.

### Signal 1 — Derivation Independence

**Measure:** How much of `intent.purpose` in the produced NODE appears
verbatim (or near-verbatim) in the context package?

```
Test: Take the DOMAIN field from the context package.
      Take intent.purpose from the produced NODE.
      Count shared noun phrases.

Pass: < 30% of intent.purpose words are present in DOMAIN
Fail: > 60% of intent.purpose is copy-pasted from DOMAIN
      → DOMAIN is over-specified. Remove capability descriptions.
        DOMAIN should say what the system does for users, not what this step does.
```

### Signal 2 — Constraint Originality

**Measure:** Did `constraints[]` in the produced NODE add anything beyond the
DNA rules already listed in the context package CONSTRAINTS field?

```
Test: List constraints[] from the produced NODE.
      Cross-reference with the CONSTRAINTS field in the sent context package.
      Count constraints in NODE that are not in the sent CONSTRAINTS field.

Pass: At least 1 domain-specific constraint added by the AI
      (e.g., "email uniqueness per tenant" — not in the DNA rules list)
Fail: Zero new constraints. NODE.constraints = DNA rule list.
      → AI added nothing. Context package already contained all constraints.
        The AI is enforcing, not reasoning.
```

### Signal 3 — Arbiter Disagreement Rate

**Measure:** How often did at least one arbiter raise a CONCERN or BLOCK on
round 1, before the NODE was accepted?

```
Test: Count round-1 arbiter verdicts across 10 NODE convergence sessions.
      Count sessions where ALL arbiters passed on round 1.

Pass: < 40% of sessions have all-PASS on round 1
      (meaning: 60%+ of sessions required at least one revision)
Fail: > 70% of sessions are all-PASS on round 1
      → Arbiters have nothing to challenge. Context package already answered
        every question the arbiters would have asked.
        The arbiters are rubber-stamping, not evaluating.
```

**If all three signals fail simultaneously:** the context packages are acting
as instruction files. The AI is reading them and complying. It is not reasoning.
This is the core failure mode the entire redesign was meant to prevent.

---

## WHAT THIS MEANS FOR CLOSING GAP-4 (recursive spawn)

Before wiring the recursive spawn, this question must be answered:

> **Is the sub-flow context package assembled by derivation or by prescription?**

When the EXPAND verdict produces sub-node texts and a new Cycle 1 runs for
each sub-node — how is the DOMAIN field for the sub-flow context package populated?

### LEGITIMATE (derivation):
```
Parent flow DOMAIN: "Users register on the XIIGen community platform.
                     The system validates their identity and grants access."
Sub-flow DOMAIN:    Same domain description — carries forward unchanged.
Sub-flow INTENT:    The sub-node text verbatim ("Set up the member's workspace")
```
The sub-flow AI reasons from the step text against the same domain.
It does not know what the parent NODE decided.

### PRESCRIPTION (failure):
```
Sub-flow DOMAIN:    Parent DOMAIN + parent NODE.intent.purpose + parent constraints
Sub-flow INTENT:    "Workspace setup as part of: [parent NODE content]"
```
The sub-flow AI is being told what the parent decided and is filling in detail.
It is not reasoning from the step text. It is elaborating a given answer.

### The architectural test:

> **Can the sub-flow Planner AI produce a valid plan from the step text and
> domain description alone, without seeing the parent NODE?**

**YES** → recursive loop produces genuine inference at each depth level.
          Each sub-flow reasons independently. The depth adds understanding.

**NO** → recursion is feeding each sub-flow the answer it is supposed to discover.
         The depth adds verbosity, not learning. The convergence score will be
         high at every level because the answer is pre-supplied at every level.

**Implementation rule for closing GAP-4:**
When spawning a new Cycle 1 for a sub-node, the context package must contain:
```
INTENT:      sub-node text verbatim (from EXPAND sub-flow decomposition)
DOMAIN:      SAME domain description as parent — not the parent NODE content
CONSTRAINTS: SAME invariants as parent — DNA + BFA rules, no parent NODE constraints
PRIOR_ART:   RAG query for plans for this sub-node type — not the parent plan
SUCCESS:     SAME format definition as parent — not narrowed by parent choices
```

What must NOT be in the sub-flow context package:
```
❌ parent NODE.intent.purpose
❌ parent NODE.constraints (only invariants carry forward, not derived constraints)
❌ parent plan steps (the AI must discover the sub-plan, not extend the parent plan)
❌ depth level (depth is a constraint on recursion, not context for planning)
```

---

## ONGOING MONITORING: "DOES XIIGEN LEARN OR DO WE FEED IT?"

After every flow plan session that produces new visibility records, run:

```
VISIBILITY REVIEW CHECKLIST

For each Cycle 2 convergence session in the records:

□ convergence_score on round 1: was it < 0.85?
  YES → real disagreement occurred → DPO signal is genuine
  NO  → check for over-prescription (Signal 1 + 2)

□ arbiter verdicts on round 1: any CONCERN or BLOCK?
  YES → arbiters found something to challenge → evaluation is real
  NO  → check Signal 3 (arbiter disagree rate)

□ CHANGED field: does it name a specific RAG key that was updated?
  YES → learning record exists → future runs can retrieve this decision
  NO  → CHANGED is empty or generic → no learning captured

For each Cycle 3 depth decision in the records:

□ Depth decision on same node type: has it varied across sessions?
  VARIES → graph is learning → confidence edges are moving
  SAME EVERY TIME → either always obvious (check prescriptiveness)
                    or always stalls (check underspecification)

□ justification: does it cite a specific NODE field with a specific value?
  YES → traceable decision → can be learned from
  NO  → "LEAF — single responsibility" without evidence → not traceable
```

If the review shows: round-1 convergence always high, arbiters always pass,
CHANGED always empty, depth always same — **XIIGen is not learning. We are feeding it.**

The fix is not in the code. The fix is in the context packages. Reduce them.
Remove domain capability descriptions. Leave only: what must always hold
(constraints), what this step is for (INTENT verbatim), and what success looks
like (format, not content). Let the AI fill the rest.

---

## THE RULE THAT GOVERNS ALL CONTEXT PACKAGE AUTHORING

```
CONSTRAINTS field:   "What must always hold" — state as verifiable conditions
DOMAIN field:        "What the system does for users" — 2-3 sentences, no capabilities
INTENT field:        The user sentence or step text verbatim — not interpreted
PRIOR_ART field:     A query string — not copied prior work
SUCCESS field:       What the output format looks like — not what the content should be

Every field that narrows what the AI can produce
is a field that reduces what the AI can learn.

The goal is the minimum context that makes correct output possible.
Not the maximum context that makes correct output guaranteed.
```

---

## HOW TO VERIFY THIS DECISION IN A RUNNING SYSTEM

The system is working correctly when you observe:

```
1. Different user intents produce structurally different NODEs
   (not just different wording of the same structure)

2. The same user intent run twice produces NODEs that converge to the same
   structure but may differ in specific failure modes and quality criteria
   (showing the AI reasons consistently but not identically)

3. Arbiter disagreement on round 1 decreases over time for the same node type
   (showing the graph has learned what makes a good NODE for this domain)

4. Depth decisions for the same node type become more consistent over time
   (showing the recursion terminates at the right level more reliably)

5. PRIOR_ART retrieval starts influencing convergence
   (prior NODEs appear in round 2 context when round 1 was challenged)
```

The system is NOT working correctly when you observe:

```
1. Every convergence session completes in 1 round
   (over-prescription — nothing to learn)

2. The same user intent always produces the same NODE across sessions
   (context package contains the answer)

3. CHANGED field is empty or says "nothing changed" in most sessions
   (no learning is being captured)

4. Depth decisions are identical across all node types
   (depth decider is using the context package default, not the NODE signals)
```
