---
name: depth-decision
sk_number: SK-521
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-04-01"
contexts: ["web-session", "claude-code"]
description: >
  Governs Cycle 3 of the XIIGen self-building loop: deciding whether a verified
  NODE is a leaf (go to executor generation) or must expand into a sub-flow (recurse
  through Cycle 1 again). Defines 5 observable complexity signals referenced to
  specific NODE fields, the termination bound as a MACHINE constraint (SK-451),
  and assembly rules for the Cycle 3 context package. Load before writing Step 6
  of the flow plan guide. Without this skill, the depth decision has no signals
  to cite and no termination bound, allowing infinite recursion.
triggers:
  - "depth decision"
  - "leaf or expand"
  - "cycle 3"
  - "step 6 flow plan"
  - "should this node expand"
  - "is this a leaf"
  - "termination depth"
  - "sub-flow decomposition"
  - "NODE too complex"
---

# Depth Decision Skill (SK-521) v1.0

## WHAT THIS SKILL PREVENTS

1. **Infinite recursion.** Without a termination bound, the depth decision AI
   can always find reasons to expand. A node at depth 7 is indistinguishable
   from a node at depth 1 without a hard machine-enforced stop.

2. **Arbitrary depth decisions.** Without complexity signals referenced to
   specific NODE fields, the AI's LEAF/EXPAND verdict is untraceble —
   no complexity signal can be cited, no reasoning can be evaluated.

3. **EXPAND verdicts without sub-flow plans.** An EXPAND decision that does
   not produce the next Cycle 1 input leaves the recursion chain broken.
   The sub-flow decomposition is part of the verdict, not a follow-up.

---

## WHEN TO INVOKE

Load before writing the Cycle 3 context package (Step 6 of the flow plan guide).
Load alongside SK-522 — SK-521 governs WHAT to put in each SK-522 field for
Cycle 3. SK-522 governs the field format.

Also load when reviewing a depth decision output — use the verification
checks in Section 5 to evaluate whether the verdict is justified.

---

## SECTION 1 — WHAT THE DEPTH DECISION IS

After Cycle 2 produces a verified NODE, one question must be answered:

**LEAF or EXPAND?**

```
LEAF:   This NODE's intent is specific enough to generate an executor directly.
        → Forward to Cycle 4 (executor generation via the existing AF pipeline)

EXPAND: This NODE contains multiple distinct responsibilities.
        Each responsibility should become its own NODE.
        → Decompose into sub-nodes → each sub-node enters a new Cycle 1
```

**Who makes this decision:** AI (the Depth Decider model).
**What it receives:** the verified NODE + depth context (see Section 4).
**What it produces:** LEAF or EXPAND + justification + (if EXPAND) sub-flow plan.

The depth decision is **not a rule**. It is a judgment that AI makes based on
the NODE's observable properties and prior decisions for similar NODEs.
The complexity signals in Section 2 are what the AI weighs — not prescriptions.

---

## SECTION 2 — THE 5 COMPLEXITY SIGNALS

Observable properties of a NODE that suggest expansion is warranted.
Each signal references a specific NODE field so the verdict is traceable.

No single signal is sufficient to force expansion. The AI weighs the combination.
Signals are weighted by strength — strong signals carry more weight alone.

### SIGNAL 1 — MULTI-RESPONSIBILITY INTENT (weight: moderate)

```
NODE field:  node.intent.purpose
Observable:  The purpose sentence contains more than one distinct action.
Signal words: "and", "then", "as well as", "also", "additionally"
Example:     "Accept credentials AND validate the email AND determine auth path"
             Three distinct actions — strong candidate for expansion.
Counter:     "Accept credentials" alone — single action, no expansion signal.
```

### SIGNAL 2 — MULTIPLE INDEPENDENT INPUT TYPES (weight: strong)

```
NODE field:  node.structure.inputShape
Observable:  More than 3 distinct input types where no two share a schema.
Example:     Inputs: {email, password, ssoToken, inviteCode, tenantId}
             Five inputs — email+password flow, SSO flow, invite flow are
             three independent processing paths → expansion candidate.
Counter:     Inputs: {email, password} — two fields, same schema (credentials).
             Single processing path → no expansion signal.
```

### SIGNAL 3 — MULTIPLE INDEPENDENT FAILURE MODES (weight: strong)

```
NODE field:  node.quality.scoringCriteria
Observable:  More than 2 failure modes that cannot be detected by the same check.
Example:     Failure 1: email already exists (data check)
             Failure 2: SSO token expired (external service check)
             Failure 3: invite code not found (business rule check)
             Three independent checks → three independent responsibilities.
Counter:     Failure 1: email malformed | Failure 2: email too long
             Both caught by the same validation function → not independent.
```

### SIGNAL 4 — CROSS-DOMAIN CONSTRAINTS (weight: moderate)

```
NODE field:  node.constraints
Observable:  Constraints from more than 2 different domain areas.
Domain areas: security, data integrity, scheduling, external services,
              business rules, compliance, tenant isolation.
Example:     Constraint 1: SSO token validated via external provider (security)
             Constraint 2: email uniqueness checked per tenant (data integrity)
             Constraint 3: verification email must be sent within 60s (scheduling)
             Three domain areas → cross-domain NODE → expansion candidate.
Counter:     All constraints are data integrity rules → single domain → no signal.
```

### SIGNAL 5 — HIGH QUALITY THRESHOLD WITH BROAD SCOPE (weight: weak alone)

```
NODE fields: node.quality.acceptanceThreshold + node.intent.purpose
Observable:  Threshold > 0.90 AND purpose covers more than one user-visible outcome.
Example:     Threshold: 0.95 AND purpose: "register the user AND send confirmation"
             High bar + multiple visible outcomes → suggests multiple responsibilities.
Counter:     Threshold: 0.95 AND purpose: "verify email uniqueness"
             High bar but single outcome → threshold is stringency, not scope.
Note:        SIGNAL 5 alone never justifies expansion. It reinforces other signals.
```

---

## SECTION 3 — THE TERMINATION BOUND (MACHINE CONSTRAINT)

The termination bound is classified as **MACHINE** under SK-451.

**Why MACHINE:** Does a tenant changing the termination depth change what
the system guarantees? Yes — a tenant that removes the bound can trigger
infinite recursion, breaking the execution guarantee for all other tenants.
Therefore: tenants cannot override the termination bound.

**Rules:**

```
Default termination depth:  3
Maximum termination depth:  5 (above 5 requires explicit Luba approval)
At depth = termination_depth: verdict is always LEAF — no exceptions.
                               Complexity signals are not evaluated at this depth.
                               The bound is enforced before any AI judgment runs.
```

**How it is declared:**
The flow plan guide Step 6 writes `state.cycle3.termination_depth` before
the context package is written. If the field is empty, Step 6 must stop:
termination depth is not optional.

**Why these defaults:**
- Depth 3 covers: flow → sub-flow → leaf. Three levels is sufficient for most capabilities.
- Depth 5 allows: flow → sub-flow → sub-sub-flow → sub-sub-sub-flow → leaf.
  Any capability requiring more than 4 levels of decomposition is a design error,
  not a depth decision failure.

---

## SECTION 4 — ASSEMBLING THE CYCLE 3 CONTEXT PACKAGE

How to fill each of the 5 SK-522 fields for the depth decision.

### INTENT field
```
Source:  The verified NODE — full object from Cycle 2 output.
Rule:    The NODE is the intent at this level of recursion. Not the user's
         original sentence — that was Cycle 1's INTENT. This cycle's subject
         is the NODE.
Format:  Include all 4 NODE fields: structure, intent, constraints, quality.
         Do not summarise the NODE — include it in full.
```

### DOMAIN field
```
Source:  Current depth level + flow domain.
Format:  "[Depth N] node in [flow domain] flow"
Example: "Depth 2 node in user registration flow"
Rule:    State the depth level explicitly — the Depth Decider must know how
         close to the termination bound it is.
```

### CONSTRAINTS field
```
Source:  Two constraints, always present:
         1. Termination bound: "At depth [N], verdict is always LEAF"
            where N = state.cycle3.termination_depth
         2. Sub-flow coherence: "No two sub-nodes may have overlapping
            intent clauses — each sub-node must cover a distinct user-facing action"
Rule:    These two are machine constraints (SK-451 MACHINE). They cannot be
         overridden by the AI's judgment or by any complexity signal.
```

### PRIOR_ART field
```
Source:  RAG query for similar prior depth decisions.
Format:  "depth decisions for [NODE archetype/domain] nodes at depth [N]"
         where N = current depth level
Example: "depth decisions for authentication nodes at depth 1"
Rule:    The AI uses prior decisions to calibrate — a NODE type that was
         consistently decided LEAF at depth 1 should not be EXPAND at depth 1
         in the next flow. Consistency comes from prior art.
```

### SUCCESS field
```
Source:  Definition of what valid LEAF and EXPAND verdicts look like.
Format:
  LEAF must contain:
    - Verdict: "LEAF"
    - At least one signal checked and found NOT triggered (for each signal
      that was evaluated) OR an explicit statement that current depth =
      termination bound
  EXPAND must contain:
    - Verdict: "EXPAND"
    - At least one signal cited with evidence from the NODE's fields
    - Sub-flow decomposition: a plain-language name for each proposed sub-node,
      each covering a distinct responsibility
      (this decomposition becomes the input to the next Cycle 1)
```

---

## SECTION 5 — VERIFICATION CHECKS

Three checks run on every depth decision output (Step 7 of flow plan guide).

### Check 1 — JUSTIFICATION PRESENT

```
For LEAF verdicts:
  Acceptable: "LEAF — [signal name] checked: [evidence from NODE] — not triggered"
              OR "LEAF — depth = termination_depth ([N]) — bound enforced"
  Failing:    "LEAF" with no signal reference and no depth-bound mention

For EXPAND verdicts:
  Acceptable: "EXPAND — [signal name] triggered: [specific evidence from NODE field]"
              AND sub-flow decomposition present (at least 2 named sub-nodes)
  Failing:    "EXPAND" with no signal reference
  Failing:    "EXPAND — this step is complex" (generic, not field-referenced)

Grade contribution: justification_present = 1 if acceptable, 0 if failing.
```

### Check 2 — TERMINATION BOUND ENFORCED

```
Test: Submit the same NODE to the Depth Decider twice —
      once at normal depth, once at depth = termination_depth.
Expected at termination_depth: LEAF, regardless of complexity signals.
Failing: EXPAND at termination_depth.

This test is run explicitly in the Step 7 test document.
It cannot be implied — it must be stated and executed.
```

### Check 3 — SUB-FLOW NON-OVERLAP (EXPAND only)

```
For each EXPAND verdict: list all proposed sub-node responsibility names.
Test: Do any two names cover the same user-facing action?

Overlap test: For sub-nodes A and B, does removing B break A's coverage?
  If yes → A depends on B → they are not distinct → merge them.
  If no  → they are distinct → keep them separate.

Example failure:
  Sub-node A: "verify email address"
  Sub-node B: "check email uniqueness"
  Both cover email validation → one sub-node, not two.

Example pass:
  Sub-node A: "validate credentials"
  Sub-node B: "create user account record"
  Different user-facing actions → distinct.

Grade contribution: non_overlap = 1 if all sub-nodes distinct, 0 if any overlap.
```

### Grade formula

```
depth_decision_grade = justification_present × non_overlap

Threshold: if justification_present = 0 → decision is NOT usable.
           non_overlap = 0 for LEAF verdicts (not applicable — score as 1).
```

---

## ANTI-PATTERNS

**"This step is complex — EXPAND."**
Found: EXPAND verdict with no signal reference.
The decision cannot be evaluated or learned from.
Fix: Cite at least one of the 5 signals with specific evidence from the NODE.
     If no signal is triggered, the verdict must be LEAF.

**"I set the termination depth to 7 for this flow."**
Found: state.cycle3.termination_depth = 7.
Violates the MACHINE constraint maximum (5).
Fix: Maximum is 5 without explicit Luba approval. Set to 5.
     If genuinely needed above 5, escalate — do not unilaterally override.

**"The sub-flow decomposition will be figured out in the next session."**
Found: EXPAND verdict with "sub-nodes TBD."
The next Cycle 1 cannot start without the sub-flow decomposition.
Fix: Sub-flow decomposition is part of the EXPAND verdict. Produce it now.
     Each sub-node: one plain-language name, one distinct responsibility.

**"I evaluated all 5 signals and they all triggered."**
Found: Verdict lists all 5 signals as triggered for every NODE.
This means the signals are being applied as rules, not weights.
Fix: Re-read Section 2. No single signal is sufficient. Most NODEs will
     trigger 0-2 signals. 5/5 triggered suggests the signal is being
     misread as a mandatory checklist.

---

## INTEGRATION

**What invokes SK-521:**
- Steps 6 and 7 of the flow plan preparation guide (Cycle 3 context + test)

**What SK-521 produces:**
- A completed Cycle 3 context package (5 fields per SK-522)
- Verification checks for Cycle 3 test document (Step 7)
- Complexity signal definitions (used by the Depth Decider AI at runtime)

**What uses SK-521's output:**
- The Depth Decider AI — receives the Cycle 3 context package
- SK-524 (cycle-visibility-design) — the Cycle 3 SENT field is this package
- Cycle 1 (re-entry) — receives the EXPAND sub-flow decomposition as its new INTENT
- Cycle 4 — receives LEAF nodes directly (no SK-521 involvement at that point)
