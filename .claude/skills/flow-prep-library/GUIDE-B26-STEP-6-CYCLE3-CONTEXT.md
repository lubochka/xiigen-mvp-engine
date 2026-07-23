# GUIDE-B26 — How to Produce `FLOW-XX-STEP-6-CYCLE3-CONTEXT.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 36 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-6-CYCLE3-CONTEXT.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-6-CYCLE3-CONTEXT guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a flow's
accepted NODEs, it will produce a correct Cycle 3 context package that enables the
Depth Decider AI to make defensible LEAF vs EXPAND decisions.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-6-CYCLE3-CONTEXT.md` is **Step 6 of the 10-step simulation pipeline**.
It produces the context package that the Cycle 3 Depth Decider AI receives for each
accepted NODE from Cycle 2. The Depth Decider must decide: is this NODE a leaf
(can be implemented directly) or must it expand into sub-nodes?

**Position in sequence:**
```
Step 5 → CYCLE 2 TEST     (grades each NODE)
Step 6 → CYCLE 3 CONTEXT  (this file — sends each NODE to Depth Decider)
Step 7 → CYCLE 3 TEST     (grades each depth decision)
```

**What Cycle 3 does:**
Each verified NODE from Cycle 2 enters Cycle 3 individually. The Depth Decider AI
evaluates the NODE against 5 complexity signals and declares: LEAF (implement
directly) or EXPAND (decompose into sub-nodes, which become the INTENT for a new
Cycle 1 run at greater depth).

**The core difference from Step 2 (Cycle 1 context):**
Step 2's INTENT was the user's verbatim sentence.
Step 6's INTENT is the verified NODE object from Cycle 2 — the full 4-field structure.
The Depth Decider evaluates the NODE, not the original user intent.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-STEP-6-CYCLE3-CONTEXT.md` — compressed v2 format: CONTEXT PACKAGE block, 5 COMPLEXITY SIGNALS table, TERMINATION BOUND block, state write |
| ZIP-11 | PRIMARY | `FLOW-01-STEP-6-CYCLE3-CONTEXT.md` — rich v1 format: termination depth reasoning, flow-specific complexity signal table with NODE field mappings, full CYCLE 3 CONTEXT PACKAGE (6 fields including INTENT NODE format, DOMAIN depth template, 2 MACHINE CONSTRAINTS, parameterized PRIOR_ART, SUCCESS with LEAF/EXPAND formats + QUESTION YOURSELF), SK-522 verification, expected/bad results |
| ZIP-Project | REFERENCE | `planning--depth-decision-SKILL.md` (SK-521) — 5 complexity signals (each references a specific NODE field); termination bound as MACHINE constraint; LEAF/EXPAND verdict vocabulary; Cycle 3 field assembly rules |
| ZIP-Project | REFERENCE | `code-execution--node-convergence-SKILL.md` (SK-435) — NODE format used as Cycle 3 INTENT |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-6-CYCLE3-CONTEXT.md`

**Also updates:** `FLOW-XX-PLAN-STATE.json` with `cycle3.context_package_file` and
`cycle3.termination_depth`

---

## THE 5 COMPLEXITY SIGNALS — UNIVERSAL

The same 5 signals apply to all flows. Each references a specific NODE field so the
evaluation is observable, not subjective:

| Signal | NODE field | Triggers EXPAND when |
|--------|-----------|---------------------|
| S1: Multi-purpose intent | `node.intent.purpose` | Contains 2+ independent outcomes connected by "and", "then", or "also" |
| S2: Multiple independent input types | `node.structure.inputShape` | More than 3 distinct input types where no two share a schema |
| S3: Independent failure modes | `node.quality.scoringCriteria` | More than 2 failure modes with divergent handling mechanisms |
| S4: Cross-domain constraints | `node.constraints` | Constraints span more than 2 domain areas (security + data + scheduling + external + business + tenant) |
| S5: High threshold + broad scope | `node.quality.acceptanceThreshold` + `node.intent.purpose` | Threshold > 0.90 AND purpose covers more than one user-visible outcome (weak — never sufficient alone) |

**Rules for signal evaluation:**
- All 5 signals must be evaluated for every non-terminal NODE (LEAF without evaluating
  all 5 signals is rejected — Step 7 Check 2 specifically enforces this)
- At termination bound: no signal evaluation — verdict is always LEAF
- A single signal triggers a possibility for EXPAND, not a mandate. The Depth Decider
  must cite the signal evidence AND conclude that expansion adds structural value.
- S5 alone is never sufficient — it must combine with at least one other signal

---

## THE TERMINATION BOUND — MACHINE CONSTRAINT

```
default_depth:  3
max_depth:      5
```

The termination bound is a MACHINE constraint — not configurable per tenant or per
flow. At depth = termination_bound, the verdict is always LEAF. No signal evaluation
runs. Justification format: "depth = [N] = termination_depth — bound enforced."

**Why MACHINE?** If one tenant's flow expands beyond the termination bound, it creates
a recursive decomposition that blocks all other tenants' execution on the same engine.
The bound prevents infinite recursion across the entire platform.

**Choosing termination_depth:**
Most flows use the default of 3. Use a higher value (4 or 5) only when the flow spec
explicitly contains capabilities that require 4+ levels of decomposition. Document
the reasoning in state (see FLOW-01's reasoning example above).

---

## HOW TO PRODUCE THE FILE (v2 FORMAT — DEFAULT)

### Step 1 — Determine termination depth

```bash
# Read from state or determine from flow spec
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('title:', s.flow_title);
console.log('task_range:', s.task_range);
console.log('focus:', s.focus);
// Default: 3. Only increase if flow has capabilities requiring 4+ decomposition levels.
"
```

### Step 2 — Write the file header

```markdown
# FLOW-XX — STEP 6: CYCLE 3 CONTEXT PACKAGE
## Status: COMPLETE
## Skills loaded: planning--depth-decision-SKILL.md (SK-521), code-execution--node-convergence-SKILL.md (SK-435)
```

### Step 3 — Write the CONTEXT PACKAGE block

```markdown
---

## CONTEXT PACKAGE

```
INTENT:
  node_under_evaluation: "[verified NODE object from Cycle 2]"
  decision_required: "LEAF or EXPAND"
  QUESTION YOURSELF:
    - Does this NODE have a single, concrete responsibility?
    - Can it be implemented without decomposition?
    - Would expansion add value or just add depth?
    Answer: Evaluate against 5 complexity signals below.

DOMAIN:
  flow_id:           FLOW-XX
  title:             [Flow human name]
  depth_level:       "[current depth — 0 at root]"
  termination_bound: [3 / 4 / 5] (MACHINE constraint — default 3, max 5)

CONSTRAINTS:
  - MACHINE CONSTRAINT: if current_depth >= termination_depth -> LEAF verdict, no AI call
  - DNA-1 through DNA-9 still apply to any sub-nodes if EXPAND
  - Sub-flows from EXPAND must not overlap in responsibility
  - Justification required for every verdict (empty = grade 0)

PRIOR_ART:
  - [Reference to which prior flow established the LEAF/EXPAND protocol]
  - Termination bound = [N] validated across [prior flows]

SUCCESS:
  verdict_accepted_when:
    - LEAF: single responsibility confirmed, justification present, depth <= termination_bound
    - EXPAND: 2+ complexity signals triggered, sub-flow decomposition non-overlapping
    - Grade >= 0.85 (justification_present x non_overlap)
```
```

### Step 4 — Write the 5 COMPLEXITY SIGNALS table

```markdown
---

## 5 COMPLEXITY SIGNALS (SK-521 Section 2)

| Signal | NODE Field | Triggers EXPAND when |
|--------|-----------|---------------------|
| S1: Multi-purpose intent | intent.purpose | Contains 2+ independent outcomes |
| S2: Compound input shape | structure.inputShape | Requires data from 2+ independent sources |
| S3: Independent failure modes | quality.scoringCriteria | Contains more than 2 independent failure modes with divergent handling |
| S4: Multiple quality criteria | quality.testCriteria | 4+ unrelated test criteria |
| S5: Sub-flow naming | intent.outcome | Outcome names a process that is itself a flow |
```

### Step 5 — Write the TERMINATION BOUND block

```markdown
---

## TERMINATION BOUND (MACHINE constraint)

```
default_depth:  3
max_depth:      5
if current_depth >= termination_bound:
  verdict = LEAF (no AI call)
  justification = "depth = {n} = terminationDepth — bound enforced"
```
```

### Step 6 — Write the STATE WRITE

```markdown
---

## STATE WRITE

```
cycle3.context_package_file → "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md"
step_status                 → "COMPLETE"
```

Apply to PLAN-STATE.json:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.cycle3 = s.cycle3 || {};
s.cycle3.context_package_file = 'FLOW-XX-STEP-6-CYCLE3-CONTEXT.md';
s.cycle3.termination_depth = 3;
s.cycle3.complexity_signals = [
  'S1: node.intent.purpose — multi-responsibility (and/then/also)',
  'S2: node.structure.inputShape — more than 3 distinct input types',
  'S3: node.quality.scoringCriteria — more than 2 independent failure modes',
  'S4: node.constraints — constraints from more than 2 domain areas',
  'S5: node.quality.acceptanceThreshold > 0.90 + intent.purpose covers multiple outcomes'
];
s.cycle3.status = 'CONTEXT_PACKAGE_READY';
s.current_step = 6;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. cycle3.termination_depth:', s.cycle3.termination_depth);
"
```
```

### Step 7 — Close

```markdown
---

**STEP 6 COMPLETE**
```

---

## HOW TO PRODUCE THE FILE (v1 FORMAT — FOR NEW DOMAINS)

Use v1 when:
- The flow has step types that are genuinely ambiguous between LEAF and EXPAND
- The domain requires flow-specific signal calibration (custom observable evidence)
- The flow's NODEs are likely to trigger EXPAND (orchestration-heavy flows)

v1 adds before the CONTEXT PACKAGE:

### v1 TERMINATION DEPTH REASONING

```markdown
---

## TERMINATION DEPTH

```
cycle3.termination_depth = [3/4/5]

Reasoning:
  [Flow title] has [N] intent clauses, [archetype list] archetypes.
  - [Archetype type] steps: [why LEAF is expected — single responsibility]
  - [Archetype type] steps: [why EXPAND might be needed — complexity]
  - Depth [N] covers: [flow name] plan step → sub-flow → leaf
  - [Justification for choosing this termination depth]
```
```

### v1 FLOW-SPECIFIC COMPLEXITY SIGNAL CALIBRATION

```markdown
---

## COMPLEXITY SIGNALS FOR FLOW-XX NODES

Per SK-521, 5 observable signals. Applied to [flow domain]:

| Signal | NODE field | Observable for FLOW-XX |
|--------|-----------|------------------------|
| S1: Multi-responsibility intent | node.intent.purpose | [Domain-specific example] |
| S2: Multiple independent input types | node.structure.inputShape | [Domain-specific example] |
| S3: Multiple independent failure modes | node.quality.scoringCriteria | [Domain-specific examples for this flow's domain] |
| S4: Cross-domain constraints | node.constraints | [What cross-domain means for this flow] |
| S5: High threshold + broad scope | node.quality.acceptanceThreshold + node.intent.purpose | [When S5 would trigger for this domain] |

**FLOW-XX node depth predictions (informational — not binding):**

| Plan step type | Expected depth decision | Signals likely triggered |
|----------------|------------------------|--------------------------|
| [step type 1] | LEAF | [signals unlikely — why] |
| [step type 2] | LEAF or EXPAND | [signals possible — which ones] |
```

### v1 full CYCLE 3 CONTEXT PACKAGE

v1 replaces the compact block with expanded sections for each SK-522 field:

**INTENT field (v1):**
```markdown
### INTENT

```
[The verified NODE from Cycle 2 — full object, all 4 fields]

Rule: include the full NODE — do not summarize.
The Depth Decider evaluates the NODE fields directly.
A summary cannot be evaluated against complexity signals.

Runtime fill format:
{
  "nodeId":   "[flowId]::[stepNumber]",
  "structure": { inputShape, outputShape, triggers, emits, dependencies },
  "intent":   { purpose, invariants, failureModes, domainConcepts },
  "constraints": [...],
  "quality":  { scoringCriteria, acceptanceThreshold, degradationAcceptable }
}
```
```

**DOMAIN field (v1):**
```markdown
### DOMAIN

```
Template: "Depth [N] node in FLOW-XX [flow domain description]"

Where [N] = current depth (1 for plan steps, 2 for sub-nodes, etc.)

Why depth level matters: Depth Decider calibrates decisions against termination_bound.
A node at depth N is (termination_bound - N) levels from the bound.
At depth 2 with bound=3: EXPAND creates depth-3 nodes that can never expand further.
```
```

**CONSTRAINTS field (v1) — 2 MACHINE constraints:**
```markdown
### CONSTRAINTS

```
CONSTRAINT A — TERMINATION BOUND (MACHINE):
  At depth [termination_depth], verdict is always LEAF.
  Complexity signals not evaluated when current_depth = termination_depth.
  Bound enforced BEFORE AI makes judgment.
  Why MACHINE: changing the bound for one tenant allows infinite recursion that
  blocks all other tenants.

CONSTRAINT B — SUB-FLOW COHERENCE (MACHINE):
  In any EXPAND verdict, no two sub-nodes may cover the same user-facing action.
  Test: removing sub-node B must not break sub-node A's coverage.
  Why MACHINE: overlapping sub-nodes produce duplicate plan steps in the next
  Cycle 1 → duplicate NODEs in Cycle 2 → broken dependency graph downstream.
```
```

**PRIOR_ART field (v1) — parameterized query:**
```markdown
### PRIOR_ART

```
Parameterised RAG query:
  "depth decisions for [node_archetype] nodes at depth [current_depth] in
   [domain slug] domain"

Where:
  node_archetype = archetype of the NODE under evaluation (ROUTING/ORCHESTRATION/etc.)
  current_depth  = depth of the current NODE (1 for first-level plan steps)

If no prior depth decisions exist:
  "NO_PRIOR_ART — first depth decision for this archetype at this depth"
```
```

**SUCCESS field (v1) — LEAF/EXPAND formats with QUESTION YOURSELF:**
```markdown
### SUCCESS

```
LEAF verdict format:
  {
    "verdict": "LEAF",
    "justification": ONE OF:
      A: "depth = [N] = termination_depth — bound enforced — no signal evaluation"
      B: "Signals evaluated:
            S1 [multi-responsibility]: checked — NOT triggered ([evidence from purpose])
            S2 [multiple input types]: checked — NOT triggered ([evidence from inputShape])
            S3 [failure modes]: checked — NOT triggered ([evidence from scoringCriteria])
            S4 [cross-domain]: checked — NOT triggered ([evidence from constraints])
            S5 [threshold+scope]: checked — NOT triggered ([evidence])
          No signals triggered — verdict: LEAF"
  }
  All 5 signals must be evaluated for Option B.

EXPAND verdict format:
  {
    "verdict": "EXPAND",
    "justification": "Signal [S-number] triggered:
                       Evidence: [specific text from NODE field — field name cited]
                       Conclusion: [N] distinct responsibilities",
    "sub_flow_decomposition": [
      { "name": "[plain-language name]",
        "responsibility": "[one sentence — what this sub-node does for user]"
      },
      ...  (minimum 2 entries)
    ]
  }
  EXPAND without sub_flow_decomposition is NOT a valid verdict.
  sub_flow_decomposition becomes the INTENT for the next Cycle 1.
```

---

**QUESTION YOURSELF** *(Depth Decider AI: verify before returning verdict)*

```
Q1 — TERMINATION BOUND FIRST: Is current_depth = termination_depth?
     YES → verdict is LEAF, state bound enforced, skip Q2-Q4.
     NO → proceed to Q2.

Q2 — SIGNAL EVIDENCE: Have I evaluated all 5 signals against specific NODE fields?
     S1: intent.purpose — "and"/"then" connecting distinct actions?
     S2: structure.inputShape — more than 3 distinct input types?
     S3: quality.scoringCriteria — more than 2 independent failure modes?
     S4: constraints — span more than 2 domain areas?
     S5: acceptanceThreshold > 0.90 AND multiple outcomes in purpose?
     LEAF without evaluating all 5 → justification rejected.

Q3 — JUSTIFICATION TRACEABLE: Can the cited NODE field value be verified?
     If justification references a field value not in the actual NODE → revise.

Q4 — EXPAND COHERENCE (if EXPAND): Does sub_flow_decomposition have ≥2 entries
     where removing one doesn't break the other's coverage?
     If not → they share responsibility → merge → re-evaluate whether EXPAND is valid.
```
```

---

## ACCEPTANCE CRITERIA FOR STEP-6-CYCLE3-CONTEXT

Before Step 6 is considered complete:

- [ ] File header declares Status: COMPLETE and skills loaded (SK-521 + SK-435)
- [ ] CONTEXT PACKAGE block (or 5-field template) is present
- [ ] INTENT references the verified NODE from Cycle 2 (not the user's original intent)
- [ ] DOMAIN includes `termination_bound` value as a MACHINE constraint
- [ ] CONSTRAINTS lists both MACHINE constraints (termination bound + sub-flow coherence)
- [ ] PRIOR_ART is a parameterized query (not copied content)
- [ ] SUCCESS defines LEAF and EXPAND verdict formats with justification structure
- [ ] 5 COMPLEXITY SIGNALS table is present (each references specific NODE field)
- [ ] TERMINATION BOUND block states default_depth and the LEAF enforcement rule
- [ ] STATE WRITE updates `cycle3.context_package_file` and `cycle3.termination_depth`

For v1 additionally:
- [ ] Termination depth reasoning is documented
- [ ] Flow-specific complexity signal calibration is present
- [ ] EXPAND verdict format requires `sub_flow_decomposition` inline
- [ ] QUESTION YOURSELF has 4 questions (Q1 termination first, Q2 signal evidence, Q3 traceability, Q4 EXPAND coherence)

---

## KEY RULES

**1. INTENT in Cycle 3 is the NODE — not the original user intent.**
Step 2 used the user's verbatim sentence as INTENT. Step 6 uses the full verified NODE
object as INTENT. The Depth Decider evaluates the NODE, not what the user originally
asked. The full 4-field NODE must be present — not a summary.

**2. Termination bound is enforced BEFORE signal evaluation.**
At depth = termination_depth, the verdict is always LEAF and no complexity signals are
evaluated. Q1 of QUESTION YOURSELF enforces this ordering. A Depth Decider that
evaluates signals and then declares LEAF "because of the termination bound" has
processed in the wrong order — Step 7 will catch this.

**3. EXPAND requires sub_flow_decomposition inline.**
An EXPAND verdict without listing the proposed sub-nodes is not valid. The
sub_flow_decomposition becomes the INTENT for the next Cycle 1 run (at depth+1). If
the sub-nodes aren't listed, the next Cycle 1 has no INTENT — the chain breaks.

**4. S5 alone is never sufficient for EXPAND.**
S5 (high threshold + broad scope) is a weak signal — it can appear in a well-designed
single-responsibility NODE. It must combine with at least one other signal to justify
EXPAND. The guidance marks this explicitly in the signal table.

**5. Sub-flow coherence test: remove-one-check.**
For each pair of sub-nodes in an EXPAND verdict: if removing sub-node B leaves sub-node
A incomplete, they share a responsibility and should be merged. This test is Q4 of
QUESTION YOURSELF and is enforced in Step 7's Check 3.

---

## RELATIONSHIP TO SUBSEQUENT STEPS

- **Step 7 (CYCLE3-TEST):** Grades the LEAF/EXPAND decisions. The grade formula uses:
  `justification_present × non_overlap × signal_consistency`. The complexity signals
  from Step 6 state are the reference against which signal_consistency is evaluated.

- **Step 8 (HANDOFF-CONTRACT):** Only receives NODEs with LEAF verdicts. NODEs with
  EXPAND verdicts go back to Cycle 1 at greater depth. Step 8 derives the executor
  handoff from LEAF NODEs only.

- **Step 10 (CHAIN-REVIEW):** The C3→C4 boundary check verifies that Cycle 3 produces
  LEAF NODEs with verified structures that Step 8 can use. The context package file
  listed in `cycle3.context_package_file` is what the chain review validates.

---

*End of GUIDE-B26 — FLOW-XX-STEP-6-CYCLE3-CONTEXT.md*
*List A sources: ZIP-11 (FLOW-01/09 STEP-6-CYCLE3-CONTEXT examples),*
*project knowledge (SK-521 depth-decision-SKILL — 5 complexity signals,*
*termination bound, LEAF/EXPAND verdict vocabulary)*
*Target B-type: B-26 — FLOW-XX-STEP-6-CYCLE3-CONTEXT.md*
*Round: 36 of 72*
