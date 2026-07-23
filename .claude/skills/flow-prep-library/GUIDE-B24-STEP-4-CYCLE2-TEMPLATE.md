# GUIDE-B24 — How to Produce `FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 34 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-4-CYCLE2-TEMPLATE guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a flow's
state and accepted plan steps, it will produce a correct Cycle 2 template that enables
NODE convergence to produce a verified 4-field NODE for each plan step.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md` is **Step 4 of the 10-step simulation pipeline**.
It produces the template that applies to every plan step when it enters Cycle 2 —
the NODE convergence cycle. The template runs once per plan step, parameterized with
that step's text.

**Position in sequence:**
```
Step 3 → CYCLE 1 TEST  (grades the plan)
Step 4 → CYCLE 2 TEMPLATE (this file — turns each plan step into a NODE)
Step 5 → CYCLE 2 TEST  (grades each NODE)
```

**What Cycle 2 does:**
Each accepted plan step from Cycle 1 becomes the INTENT input for a convergence
session. Three AI models generate NODE candidates in parallel (Fisher-Yates blind
shuffle before judging). The judge selects the winner. The winner is de-shuffled and
stored. The template defines what each model receives and what a valid NODE looks like.

**Critical distinction from Step 2:**
Step 2 (CYCLE1-CONTEXT) produced ONE context package for the entire flow's plan.
Step 4 (CYCLE2-TEMPLATE) produces a TEMPLATE that is parameterized with one plan step
at a time — Cycle 2 runs N times, once per plan step.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-STEP-4-CYCLE2-TEMPLATE.md` — compressed v2 format: VERIFICATION TEMPLATE block, ARBITER PANEL BY STEP TYPE table, NODE STRUCTURE, state write |
| ZIP-11 | PRIMARY | `FLOW-01-STEP-4-CYCLE2-TEMPLATE.md` — rich v1 format: 6 template fields (STEP_TEXT, UPSTREAM_CONTEXT, CHALLENGER_ROLES with 4 decision rules, RAG_QUERY parameterized template, NODE_OUTPUT_FORMAT with all 4 NODE field specs + QUESTION YOURSELF, JUDGE_CRITERIA with 4 checks), SK-443 self-containment verification, expected/bad results |
| ZIP-Project | REFERENCE | `code-execution--node-convergence-SKILL.md` (SK-435) — NODE format (structure, intent, constraints, quality); convergence protocol; challenger role definitions |
| ZIP-Project | REFERENCE | `planning--convergence-round-design-SKILL.md` (SK-452) — challenger role selection by archetype; termination conditions |
| ZIP-Project | REFERENCE | `planning--arbiter-panel-design-SKILL.md` (SK-442) — 7 arbiter roles; minimum panel by archetype |
| ZIP-Project | REFERENCE | `planning--ai-context-package-authoring-SKILL.md` (SK-522) — Cycle 2 INTENT is parameterized (one step at a time) |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md`

**Also updates:** `FLOW-XX-PLAN-STATE.json` with `cycle2.template_file`

---

## THE TWO FORMATS

**v2 compressed (FLOW-09 style — use for new flows):**
Three sections: VERIFICATION TEMPLATE block, ARBITER PANEL BY STEP TYPE table,
NODE STRUCTURE. Step-type table is flow-specific. ~70 lines.

**v1 rich (FLOW-01 style — use for new domains or when challenger rules need documentation):**
6-field template with full challenger decision rules, parameterized RAG query,
NODE_OUTPUT_FORMAT with all 4 field specifications and QUESTION YOURSELF, JUDGE_CRITERIA
with 4 explicit checks, SK-443 self-containment verification.

---

## THE NODE STRUCTURE (4 FIELDS — UNIVERSAL)

Every NODE produced by Cycle 2 must have all 4 fields non-empty:

```
NODE = {
  intent: {
    purpose:        string  — one sentence, what this step does for the user (no tech names)
    scope:          string  — what is included and excluded from this step's responsibility
    outcome:        string  — what state the system is in after this step completes
    invariants:     []      — invariants from state.invariants that apply to this step
    failureModes:   []      — named failure modes specific to this step (min 2, specific)
    domainConcepts: []      — domain terms for RAG seeding
  }
  structure: {
    inputShape:    {} — key inputs this step receives (fields it depends on)
    outputShape:   {} — what this step produces or confirms
    triggers:      [] — event or state change that causes this step to run
    emits:         [] — event or state change this step produces
    dependencies:  [] — prior plan step numbers this step requires
  }
  constraints: [
    // Every state.invariants item that applies to this step, as verifiable conditions
    // Minimum 3 per step: DNA-8 (store before enqueue) + 2 domain-specific
  ]
  quality: {
    scoringCriteria:      [] — criteria specific to this step's behavior (min 2, specific)
    acceptanceThreshold:  0.85
    degradationAcceptable: boolean — false for ROUTING; true for ORCHESTRATION sub-tasks only
  }
}
```

**"Non-empty" rules per field:**
- `intent.failureModes`: Minimum 2 items that are SPECIFIC to this step's domain.
  Generic modes ("system error", "timeout", "failure") do NOT count.
- `constraints`: Must list every state.invariants item that applies to this step.
  Not all invariants — only those this step must enforce. Missing → IronRules arbiter BLOCKS.
- `quality.scoringCriteria`: Must reference something unique to THIS step. Test:
  could this criterion appear word-for-word in a NODE for a completely different step?
  If yes → generic → replace.

---

## HOW TO PRODUCE THE FILE (v2 FORMAT — DEFAULT)

### Step 1 — Read PLAN-STATE.json

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('task_range:', s.task_range);
console.log('domain:', s.domain);
console.log('title:', s.flow_title);
console.log('focus:', s.focus);
"
```

### Step 2 — Derive step types from the flow spec

Read the flow spec and classify each group of plan steps by archetype. The step types
drive the ARBITER PANEL BY STEP TYPE table — the flow-specific part of this document.

**How to derive step types:**
For each intent clause from Step 1/2, determine which archetype its steps require:

| Archetype | When it applies | Arbiter panel |
|-----------|----------------|---------------|
| ROUTING | Single-operation steps: intake, validate, check, gate, record | 4 |
| ORCHESTRATION | Multi-coordination steps: deliver, synchronize, coordinate | 7 |
| DATA_PIPELINE | Transform/aggregate steps: extract, index, analyze | 4 |
| TRANSACTION | Atomic multi-resource steps: purchase, reserve, book | 5 |
| SCHEDULED | Timer-based steps: expiry, timeout, periodic | 4 |

Domain-specific step types may be named differently (e.g., PATTERN_EXTRACTION,
SKILL_INDEXING for FLOW-09). What matters is: which archetype governs each step type,
and what arbiter panel count applies.

### Step 3 — Write the file header

```markdown
# FLOW-XX — STEP 4: CYCLE 2 VERIFICATION TEMPLATE
## Status: COMPLETE
## Skills loaded: code-execution--node-convergence-SKILL.md (SK-435), planning--convergence-round-design-SKILL.md (SK-452), planning--ai-context-package-authoring-SKILL.md (SK-522)
```

### Step 4 — Write the VERIFICATION TEMPLATE block

```markdown
---

## VERIFICATION TEMPLATE

Each plan step from Cycle 1 becomes STEP_TEXT input to this template:

```
STEP_TEXT: [verbatim plan step — no rephrasing]

CONTEXT_PACKAGE:
  INTENT:  Same verbatim user intent from Step 2
  DOMAIN:  FLOW-XX — [Flow human name] — task_range T[NNN]-T[NNN+M]
  CONSTRAINTS: DNA-1 through DNA-9 (same as Step 2)
  PRIOR_ART: Established fabric patterns + archetype carries from prior flows
  SUCCESS:
    node_accepted_when:
      - Implements exactly what STEP_TEXT specifies
      - No DNA violations (auto-checked by DNA validator)
      - grade >= 0.85
      - QUESTION YOURSELF: "Does this NODE introduce a new responsibility
        not in STEP_TEXT? If yes, reject."

GENERATION_PROTOCOL:
  - 3 candidates generated in parallel via Promise.allSettled()
  - Fisher-Yates blind shuffle before arbiter panel sees candidates
  - Arbiter panel size determined by step type (see below)
  - Winner de-shuffled before storage
```
```

### Step 5 — Write the ARBITER PANEL BY STEP TYPE table

This is the flow-specific section. Fill in the step types and arbiter counts derived
from the flow spec. The rule: ROUTING=4, ORCHESTRATION=7, others as listed above.

```markdown
---

## ARBITER PANEL BY STEP TYPE

| Step Type | Arbiter Count |
|-----------|---------------|
| [STEP_TYPE_1] | [4/5/6/7] |
| [STEP_TYPE_2] | [4/5/6/7] |
| Default       | 4           |
```

### Step 6 — Write the NODE STRUCTURE

```markdown
---

## NODE STRUCTURE (4 fields, all required)

```
NODE = {
  intent:    { purpose, scope, outcome }
  structure: { inputShape, outputShape }
  constraints: []
  quality:   { testCriteria[], successGrade }
}
```
```

### Step 7 — Write the STATE WRITE

```markdown
---

## STATE WRITE

```
cycle2.template_file → "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md"
step_status          → "COMPLETE"
```

Apply to PLAN-STATE.json:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.cycle2 = s.cycle2 || {};
s.cycle2.template_file = 'FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md';
s.cycle2.status = 'TEMPLATE_READY';
s.current_step = 4;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. cycle2.template_file:', s.cycle2.template_file);
"
```
```

### Step 8 — Close

```markdown
---

**STEP 4 COMPLETE**
```

---

## HOW TO PRODUCE THE FILE (v1 FORMAT — FOR NEW DOMAINS)

Use v1 when:
- The flow domain is new and challenger role decision rules need explicit documentation
- The flow has step types with complex cross-flow dependency patterns
- The flow has mandatory upstream context declarations that must be stated explicitly

v1 uses 6 template fields instead of the compressed block format:

### v1 STEP_TEXT field

```markdown
### STEP_TEXT

```
[verbatim plan step from Cycle 1 output — character-for-character, no rephrasing]
```

Rule: Copy the step text exactly. No summarizing, clarifying, or adding context.
Failure mode: Reworded STEP_TEXT causes the NODE to solve a different problem than
the plan specified. Plan and NODE become out of sync.
```

### v1 UPSTREAM_CONTEXT field

```markdown
### UPSTREAM_CONTEXT

```
Rule: Include ONLY what prior steps produce that THIS step's constraints depend on.
Do not include everything prior steps produce.

For the first step: UPSTREAM_CONTEXT: "none — this is the first step"

For steps that receive output from prior steps:
  UPSTREAM_CONTEXT: "Step [N] established [specific fact]: [what it is]"

What NOT to include:
  ❌ Everything prior steps produced (too much context = noise)
  ❌ Facts the step could determine itself
  ❌ Implementation details ("Step N called storeDocument()")
  ❌ Technology references ("Step N wrote to Elasticsearch")
```

[State mandatory upstream dependencies for this flow's domain:]
  [e.g., "Verification steps depend on registration steps (account record exists)"]
  [e.g., "Onboarding steps depend on verification completing (status confirmed)"]
```

### v1 CHALLENGER_ROLES field (decision rules — not fixed list)

```markdown
### CHALLENGER_ROLES

```
Decision rule — select challengers per step, not per flow. Apply rules in order.

RULE 1 — DEFAULT (all steps):
  Always include: Domain + Principles + Iron Rules

RULE 2 — IDENTITY/PII (add Security):
  Trigger: step involves [list the PII/sensitive data types for this flow's domain]
  Applies to: [name the step types where this applies]

RULE 3 — CROSS-FLOW DEPENDENCY (add Business):
  Trigger: step emits an event consumed by a step in a different flow, OR receives
           an event emitted by a step in a different flow
  Applies to: [name which step types have cross-flow events, if any]

RULE 4 — ORCHESTRATION (add Completeness + Skills + Prompts):
  Trigger: step's archetype is ORCHESTRATION
  Applies to: [name which step types are ORCHESTRATION archetype]

APPLIED CHALLENGER SELECTION FOR FLOW-XX STEP TYPES:

  [STEP_TYPE_1] steps (Clause N, [ARCHETYPE]):
    Mandatory: Domain + Principles + Iron Rules
    [Add applicable rules]
    Panel: [N] arbiters

  [STEP_TYPE_2] steps (Clause N, ORCHESTRATION):
    Mandatory: Domain + Principles + Iron Rules + Security + Completeness + Skills + Prompts
    Panel: 7 arbiters
```
```

### v1 RAG_QUERY field (parameterized template)

```markdown
### RAG_QUERY

```
Parameterized template — fill [step_text] at runtime:

  "prior NODEs for [step_archetype] capability in [domain-slug]
   [domain-description], step involving [step_text]"

Step archetype per step type:
  [STEP_TYPE_1] → step_archetype = "[ROUTING/DATA_PIPELINE/etc.]"
  [STEP_TYPE_2] → step_archetype = "ORCHESTRATION"

Filter: domain = "[domain-slug]", patternType = "NODE_REPRESENTATION"
Size: top 3 results

If no prior NODEs: "NO_PRIOR_NODES — first run for this step type in this domain"
```
```

### v1 NODE_OUTPUT_FORMAT field (full 4-field specification)

Include all 4 NODE field definitions with "non-empty means..." for each, plus the
QUESTION YOURSELF section with 4 self-check questions (Q1 single responsibility,
Q2 constraint completeness, Q3 quality specificity, Q4 technology neutrality).

See FLOW-01-STEP-4-CYCLE2-TEMPLATE.md lines 220-299 for the complete pattern.

### v1 JUDGE_CRITERIA field (4 checks)

```markdown
### JUDGE_CRITERIA

```
The judge evaluates the NODE representation quality — NOT the executor implementation.

CHECK 1 — TECHNOLOGY NEUTRALITY
  Forbidden: [domain-specific technology list from Step 3]
  Verdict: CLEAN (none found) or VIOLATION (any found) — binary
  VIOLATION → NODE rejected

CHECK 2 — CONSTRAINT COVERAGE
  Does NODE.constraints contain every applicable invariant from state.invariants?
  Method: check each invariant — does THIS step type enforce it? If yes and absent → MISS
  Verdict: COMPLETE or INCOMPLETE — INCOMPLETE → NODE rejected

CHECK 3 — FAILURE MODE SPECIFICITY
  Does intent.failureModes[] contain >= 2 step-specific named modes?
  Generic: "system error", "failure", "timeout" — NOT counted
  Specific: "[DOMAIN_SPECIFIC_FAILURE]" — these count
  Verdict: SPECIFIC or GENERIC — GENERIC → NODE rejected

CHECK 4 — UPSTREAM DEPENDENCY CONSISTENCY
  If UPSTREAM_CONTEXT stated facts from prior steps, does structure.dependencies
  reference those steps?
  Verdict: CONSISTENT or INCONSISTENT — INCONSISTENT → NODE rejected

JUDGE DECISION:
  All 4 PASS → NODE ACCEPTED
  Any FAIL → NODE REJECTED → Cycle 2 reruns for this step only
```
```

---

## KEY RULES

**1. The template is parameterized — one step at a time.**
Unlike Step 2's context package which covers the entire flow, Step 4's template
is filled once per plan step at runtime. The STEP_TEXT field is the only parameter
that changes. Everything else (DOMAIN, CONSTRAINTS, PRIOR_ART, SUCCESS) is constant
across all steps in the flow.

**2. UPSTREAM_CONTEXT limits what prior steps provide.**
The rule: include ONLY what this step's constraints depend on from prior steps.
Including everything prior steps produced introduces noise into the convergence
models' context. A step receiving confirmation that an email is unique doesn't need
to know that a prior step also configured rate limiting.

**3. Challenger roles are decision rules, not a fixed list.**
The same challenger set does NOT apply to every step. A routing step needs 4 arbiters;
an orchestration step needs 7. The decision rules determine which challengers apply
based on what the step does — identity/PII steps add Security, cross-flow event steps
add Business, orchestration steps add Completeness+Skills+Prompts.

**4. The judge checks NODE representation, not executor implementation.**
The judge at Cycle 2 evaluates whether the NODE correctly represents what the plan
step specifies — technology-neutral, constraint-complete, with specific failure modes
and consistent upstream dependencies. The judge does NOT evaluate code quality,
framework choice, or implementation patterns. Those are for Cycle 4.

**5. ARBITER PANEL size drives step quality, not just count.**
ROUTING=4 arbiters is the minimum for safe identity and gate steps. ORCHESTRATION=7
is mandatory because orchestration steps coordinate multiple sub-capabilities and
require completeness, skills coherence, and prompt quality checks that simpler steps
don't need. Using 4 arbiters for an orchestration step leaves 3 quality checks blind.

---

## ACCEPTANCE CRITERIA FOR STEP-4-CYCLE2-TEMPLATE

Before Step 4 is considered complete:

- [ ] File header declares Status: COMPLETE and skills loaded (SK-435 + SK-452 + SK-522)
- [ ] VERIFICATION TEMPLATE block or 6-field template is present
- [ ] STEP_TEXT is defined as verbatim plan step (no rephrasing rule stated)
- [ ] CONTEXT_PACKAGE or DOMAIN field references correct flow title + task range
- [ ] SUCCESS criteria includes "grade >= 0.85" and QUESTION YOURSELF
- [ ] GENERATION_PROTOCOL states 3 parallel candidates, blind shuffle, de-shuffle on win
- [ ] ARBITER PANEL BY STEP TYPE table has at least 2 flow-specific step types
- [ ] NODE STRUCTURE defines all 4 fields (intent, structure, constraints, quality)
- [ ] STATE WRITE updates cycle2.template_file in PLAN-STATE.json

For v1 additionally:
- [ ] CHALLENGER_ROLES are decision rules (4 rules with triggers) — not a fixed list
- [ ] RAG_QUERY is a parameterized template (not a fixed query)
- [ ] NODE_OUTPUT_FORMAT defines "non-empty means" for all 4 NODE fields
- [ ] JUDGE_CRITERIA states 4 checks on NODE representation (not executor)

---

## RELATIONSHIP TO SUBSEQUENT STEPS

- **Step 5 (CYCLE2-TEST):** Defines how to grade each NODE that Cycle 2 produces.
  The 4 NODE fields from the NODE STRUCTURE section become the grade criteria.

- **Step 6 (CYCLE3-CONTEXT):** The accepted NODEs from Cycle 2 feed into Cycle 3's
  depth-decision context. The NODE's intent and structure fields are what Cycle 3
  evaluates for LEAF vs EXPAND decisions.

- **Step 10 (CHAIN-REVIEW):** The C2→C3 boundary check verifies that what Cycle 2
  produces (verified 4-field NODEs) matches what Cycle 3 needs as input. The template
  file is listed in state as `cycle2.template_file`.

---

*End of GUIDE-B24 — FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md*
*List A sources: ZIP-11 (FLOW-01/09 STEP-4-CYCLE2-TEMPLATE examples),*
*project knowledge (SK-435 node-convergence, SK-452 convergence-round-design,*
*SK-442 arbiter-panel-design, SK-522 ai-context-package-authoring)*
*Target B-type: B-24 — FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md*
*Round: 34 of 72*
