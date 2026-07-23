# GUIDE-B25 — How to Produce `FLOW-XX-STEP-5-CYCLE2-TEST.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 35 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-5-CYCLE2-TEST.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-5-CYCLE2-TEST guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a flow's
Step 4 template and state, it will produce a correct Cycle 2 test definition that
grades each NODE before it enters Cycle 3's depth-decision evaluation.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-5-CYCLE2-TEST.md` is **Step 5 of the 10-step simulation pipeline**.
It defines how to grade each NODE produced by Cycle 2 — five checks, a grade formula,
a threshold, a silent failure detection pattern, and a meta-arbiter trigger.

**Position in sequence:**
```
Step 4 → CYCLE 2 TEMPLATE (template for generating NODEs)
Step 5 → CYCLE 2 TEST     (this file — grades each NODE)
Step 6 → CYCLE 3 CONTEXT  (uses accepted NODEs for depth-decision)
```

**What Step 5 grades:**
Each accepted plan step from Cycle 1 enters Cycle 2 and produces a 4-field NODE.
Step 5 defines the grading criteria for those NODEs. The grade must reach 0.85 before
the NODE is seeded to `xiigen-rag-patterns` and before Cycle 3 can evaluate it.

**Key difference from Step 3 (Cycle 1 Test):**
Step 3 graded a plan (plain-language steps). Step 5 grades a NODE (structured
4-field representation). The checks are similar in spirit but different in content:
- Step 3 checked: coverage, abstraction, single responsibility, dependency completeness
- Step 5 checks: convergence, arbiter pass, abstraction, quality specificity (+ I/O contract in v2)

**The silent failure risk:**
The most dangerous NODE defect is a NODE that passes all checks but has generic
quality criteria. A NODE saying "code must be correct and secure" provides no
specific grading signal to Cycle 4. The generated code passes AF-9 with inflated
scores — the DPO triple records quality differences that are arbitrary (style, not
substance). The learning loop trains on corrupted signal. This is SILENT_FAILURE
(SK-441): the engine continues, produces code, stores triples — but the quality
signal is wrong. Check 4/CV4 exists specifically to catch this.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-STEP-5-CYCLE2-TEST.md` — compressed v2 format: grade threshold block, 5 convergence checks table (CV1-CV5), meta-arbiter trigger, state write |
| ZIP-11 | PRIMARY | `FLOW-01-STEP-5-CYCLE2-TEST.md` — rich v1 format: 4-check definitions with observable criteria (convergence with field-level consistency, arbiter per step type, abstraction with technology list, quality specificity with GENERIC vs SPECIFIC examples), SILENT_FAILURE detection section, grade formula with 3 worked examples, threshold handling with max reruns logic |
| ZIP-Project | REFERENCE | `code-execution--node-convergence-SKILL.md` (SK-435) — verdict vocabulary: CONSENSUS_REACHED / DEFERRED_CONSTRAINT / STALLED; convergence_score values (1.0 / 0.7 / 0.0) |
| ZIP-Project | REFERENCE | `planning--simulation-protocol-SKILL.md` (SK-441) — SILENT_FAILURE detection: engine continues but quality signal is corrupted |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-5-CYCLE2-TEST.md`

**Also updates:** `FLOW-XX-PLAN-STATE.json` with `cycle2.status = "TEST_DEFINED"`

---

## THE TWO FORMATS

**v2 compressed (FLOW-09 style — use for new flows):**
Four sections: GRADE THRESHOLD, CONVERGENCE CHECKS table (5 rows CV1-CV5),
META-ARBITER TRIGGER, STATE WRITE. ~48 lines. All checks condensed to table rows.

**v1 rich (FLOW-01 style — use when explicit grading reasoning is needed):**
Full 4-check definitions with observable criteria, per-step-type arbiter PASS criteria,
SILENT_FAILURE section, grade formula with worked examples, threshold handling.

---

## THE GRADE FORMULA

The Cycle 2 grade formula:

```
node_grade = convergence_score × arbiter_pass_fraction × abstraction_score × quality_specific
```

All factors are discrete (not continuous):

| Factor | Values | What causes failure |
|--------|--------|---------------------|
| `convergence_score` | 1.0 (CONSENSUS) / 0.7 (DEFERRED) / 0.0 (STALLED) | All 3 models disagree |
| `arbiter_pass_fraction` | 1.0 (all APPROVED) / 0.0 (any unresolved BLOCK) | Any required arbiter BLOCKS |
| `abstraction_score` | 1.0 (CLEAN) / 0.0 (VIOLATION) | Any technology name in NODE |
| `quality_specific` | 1.0 (≥2 specific) / 0.0 (generic or empty) | Generic quality criteria |

**Key difference from Cycle 1 formula:**
Cycle 1 had a continuous `responsibilityScore` with floor 0.5. Cycle 2 has no
floor component — every factor is binary or three-valued. Either the NODE is
technology-neutral and has specific quality criteria, or it doesn't.

---

## HOW TO PRODUCE THE FILE (v2 FORMAT — DEFAULT)

### Step 1 — Read PLAN-STATE.json

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('task_range:', s.task_range);
console.log('cycle2.template_file:', s.cycle2 && s.cycle2.template_file);
"
```

### Step 2 — Write the file header

```markdown
# FLOW-XX — STEP 5: CYCLE 2 TEST DEFINITION
## Status: COMPLETE
## Skills loaded: code-execution--node-convergence-SKILL.md (SK-435), planning--simulation-protocol-SKILL.md (SK-441)
```

### Step 3 — Write GRADE THRESHOLD

```markdown
---

## GRADE THRESHOLD

```
grade_threshold:     0.85
rerun_on_fail:       true
max_reruns_per_step: 3
```
```

### Step 4 — Write CONVERGENCE CHECKS table

The only flow-specific row is CV2 (DNA compliance — task range) if needed. Otherwise
all rows are universal.

```markdown
---

## CONVERGENCE CHECKS

| Check | Pass condition | Fail verdict |
|-------|---------------|-------------|
| CV1: Panel majority | grade >= 0.85 | RERUN |
| CV2: DNA compliance | Zero DNA violations | RERUN |
| CV3: Step fidelity | NODE implements exactly the STEP_TEXT | RERUN |
| CV4: Responsibility | NODE addresses <= 1 responsibility | RERUN |
| CV5: I/O contract | NODE has defined inputShape and outputShape | RERUN |
```

### Step 5 — Write META-ARBITER TRIGGER

```markdown
---

## META-ARBITER TRIGGER

```
if grade < 0.85 after max_reruns:
  trigger SK-525 Meta-Arbiter
```
```

### Step 6 — Write STATE WRITE

```markdown
---

## STATE WRITE

```
cycle2.status → "TEST_DEFINED"
step_status   → "COMPLETE"
```

Apply to PLAN-STATE.json:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.cycle2 = s.cycle2 || {};
s.cycle2.status = 'TEST_DEFINED';
s.cycle2.grade_criteria = {
  convergence_threshold: 0.85,
  arbiter_pass_required: true,
  abstraction_check: true
};
s.current_step = 5;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. cycle2.status:', s.cycle2.status);
"
```
```

### Step 7 — Close

```markdown
---

**STEP 5 COMPLETE**
```

---

## HOW TO PRODUCE THE FILE (v1 FORMAT — WHEN NEEDED)

Use v1 when:
- The flow domain requires explicit per-arbiter PASS criteria (new domains)
- The SILENT_FAILURE risk for this flow needs explicit documentation
- Quality specificity examples for this flow's domain need to be written out

v1 adds four full check sections after GRADE THRESHOLD:

### v1 CHECK 1 — CONVERGENCE (observable criteria)

```markdown
---

## CHECK 1 — CONVERGENCE

**What "consistent" means (observable — not subjective):**

The 3 candidates (Proposer + 2 challenger models) are consistent when:
- `intent.purpose` across all 3 describes the same user-facing action (same outcome)
- `intent.invariants` across all 3 include the same DNA/BFA patterns for this step
- `structure.triggers` across all 3 name the same trigger condition

**Divergence patterns:**
- 2 say step produces X, 1 says it produces Y → the 1 is challenged, not averaged
- 2 include invariant Z, 1 omits it → the omitting candidate is challenged

**Resolution rule:**
```
Two candidates agree, one disagrees:
  → The one is challenged
  → Proposer updates to majority position
  → If challenge was wrong: Proposer defends → escalate

All three disagree:
  → Escalation Orchestrator activates
  → Upper judge receives all verdicts + conflict description
  → If unresolvable: STALLED → record in state.issues[], stop Cycle 2 for this step
```

**Convergence score:**
```
convergence_score = 1.0 if CONSENSUS_REACHED
convergence_score = 0.7 if DEFERRED_CONSTRAINT (unresolved but provisional)
convergence_score = 0.0 if STALLED
```
Note: three discrete values only. STALLED = 0.0 fails the NODE regardless.
```

### v1 CHECK 2 — ARBITER PASS (per step type)

```markdown
---

## CHECK 2 — ARBITER PASS

Arbiter assignment from `cycle2.challenger_roles_by_step_type` (Step 4 state):

*For [STEP_TYPE_1] steps ([Archetype]):*
```
[Arbiter 1] PASS: [observable pass condition for this arbiter + step type]
[Arbiter 2] PASS: [observable pass condition]
[Arbiter N] PASS: [observable pass condition]
```

*For [STEP_TYPE_2] steps (ORCHESTRATION — all 7 arbiters):*
```
Domain PASS: [criteria]
Completeness PASS: structure.emits contains at least [the key event for this flow's domain]
Skills PASS: No existing RAG pattern is reinvented inline
Prompts PASS: NODE is teachable — intent.purpose is specific enough for independent implementation
[other arbivers]
```

**Arbiter pass score:**
```
arbiter_pass_fraction = 1.0 (all required arbiters APPROVED) or 0.0 (any unresolved BLOCK)
Note: binary. Any unresolved BLOCK fails the NODE entirely.
CHALLENGE resolved as APPROVED in subsequent round: counts as PASS.
```
```

### v1 CHECK 3 — ABSTRACTION

```markdown
---

## CHECK 3 — ABSTRACTION

Technology list (same as Step 3 — must not appear in ANY NODE field):
```
[Domain-specific technology list from Step 3]
```

**Abstraction score: 1.0 (CLEAN) or 0.0 (VIOLATION) — binary.**
Acceptable: capability names (IScopedMemoryService, IDatabase) — NOT technology names.
```

### v1 CHECK 4 — QUALITY SPECIFICITY

```markdown
---

## CHECK 4 — QUALITY SPECIFICITY

**What "specific" means:**
quality.scoringCriteria[] must reference something in THIS NODE's structure or constraints.
Test: could this criterion appear word-for-word in a completely different step's NODE?
  YES → generic → fails
  NO  → specific → passes

**GENERIC (fails):**
  "The code must be correct and secure." — any step
  "Follow best practices for the domain." — any step
  "Timeout behavior must be handled." — any step

**SPECIFIC (passes):**
  "[Specific criterion referencing DNA rule + testable outcome for this step's domain]"
  "[Specific criterion referencing iron rule + failure mode for this step's domain]"
  Example: "The idempotency check runs BEFORE any write (DNA-7) — a test exists
   that verifies calling this step twice produces one record, not two."

**quality_specific score:** 1.0 if ≥2 specific items, 0.0 otherwise — binary.
```

### v1 SILENT_FAILURE DETECTION section

```markdown
---

## SILENT_FAILURE DETECTION (SK-441)

For Cycle 2 NODEs, the highest-risk SILENT_FAILURE pattern:

```
Pattern: NODE passes all checks but quality.scoringCriteria is generic
Risk:    Cycle 4 generator has no specific quality criteria to optimize against
Effect:  Generated code passes AF-9 gate with inflated scores
         DPO triple records: chosen=1.0, rejected=0.5 — quality difference is arbitrary
         Learning loop trains on wrong quality signal for FLOW-XX

Detection: Check 4 (quality_specific = 0.0) catches this.
           This MUST fail at the NODE level — not at code generation time.
Prevention: Require ≥2 specific scoring criteria before NODE is accepted.
```
```

### v1 GRADE FORMULA section (with examples)

```markdown
---

## GRADE FORMULA

```
node_grade = convergence_score × arbiter_pass_fraction × abstraction_score × quality_specific
```

**Example — valid NODE:**
```
  convergence_score = 1.0 (CONSENSUS_REACHED)
  arbiter_pass_fraction = 1.0 (all required arbiters APPROVED)
  abstraction_score = 1.0 (CLEAN)
  quality_specific = 1.0 (2 specific criteria)
  node_grade = 1.0 ✅ ACCEPTED
```

**Example — technology violation:**
```
  abstraction_score = 0.0 ([tech name] found in constraints)
  node_grade = 1.0 × 1.0 × 0.0 × 1.0 = 0.0 ❌ REJECTED
```

**Example — generic quality (SILENT_FAILURE risk):**
```
  quality_specific = 0.0 (only generic criteria)
  node_grade = 0.0 ❌ REJECTED
  Reason: Forces specific quality criteria before NODE enters Cycle 3.
```
```

---

## THE 5 CONVERGENCE CHECKS EXPLAINED

The v2 format compresses these into a table. Here is what each check tests:

| Check | What it verifies | Binary or graded |
|-------|-----------------|-----------------|
| CV1: Panel majority | Arbiter panel reached >= 0.85 grade for this NODE | Binary (0.0 or 1.0) |
| CV2: DNA compliance | Zero DNA violations in the NODE (auto-checked) | Binary |
| CV3: Step fidelity | NODE implements exactly what STEP_TEXT specifies — no added scope | Binary |
| CV4: Responsibility | NODE addresses one responsibility only | Binary |
| CV5: I/O contract | inputShape and outputShape are both populated | Binary |

**CV3 step fidelity is the most common failure mode.**
When a plan step says "Confirm the email address is not already registered," a NODE
that also specifies handling the password complexity check has violated CV3. The NODE
adds scope not in STEP_TEXT — it would require a compound plan step to cover correctly.

**CV2 DNA compliance is auto-checked** by the DNA validator — it does not require
human or AI review. The test document records the expected pass condition; the
validator runs the actual check.

---

## GRADE THRESHOLD AND RERUN LOGIC

```
NODE grade threshold: 0.85

Below 0.85 → NODE REJECTED for this step only (not all steps)
  → Cycle 2 reruns for THIS STEP ONLY
  → Reviewer states which check failed and why
  → Maximum 3 reruns per step (prevents infinite loops)
  → After 3 failures: step marked BLOCKED_AGENT_FAILURE in state → escalate

At or above 0.85 → NODE ACCEPTED
  → NODE seeded to xiigen-rag-patterns as NODE_REPRESENTATION document
  → Proceed to Cycle 3 depth decision for this step (Step 6)
```

Important: the threshold is per-step, not per-flow. A flow with 7 plan steps runs
Cycle 2 seven times. Each run has its own 3-rerun budget. Failing step 3 does not
restart the grading for steps 1, 2, 4, 5, 6, 7.

---

## ACCEPTANCE CRITERIA FOR STEP-5-CYCLE2-TEST

Before Step 5 is considered complete:

- [ ] File header declares Status: COMPLETE and skills loaded (SK-435 + SK-441)
- [ ] GRADE THRESHOLD: grade_threshold = 0.85, rerun_on_fail = true, max_reruns_per_step = 3
- [ ] CONVERGENCE CHECKS table has 5 rows (CV1-CV5) with pass conditions
- [ ] META-ARBITER TRIGGER states SK-525 fires after max_reruns
- [ ] STATE WRITE updates cycle2.status = "TEST_DEFINED"

For v1 additionally:
- [ ] Convergence check defines "consistent" as observable (field-level, not "models agree")
- [ ] Arbiter check lists which arbiters apply per step type with specific PASS criteria
- [ ] Quality specificity check has GENERIC vs SPECIFIC examples from this flow's domain
- [ ] SILENT_FAILURE detection documents the generic quality pattern
- [ ] Grade formula includes at least 2 worked examples

---

## KEY RULES

**1. grade_threshold = 0.85 — same as Cycle 1.**
NODE quality cannot be graded more leniently than plan quality. The threshold must
be the same (0.85) or higher. A lower threshold would allow NODEs that Cycle 4
cannot produce good code from, corrupting the teaching corpus.

**2. Rerun is per-step, not per-flow.**
When a NODE fails, only that step reruns. Other steps' accepted NODEs are not
invalidated. Maximum 3 reruns per step before the step is marked BLOCKED_AGENT_FAILURE.

**3. Convergence is observable field-level consistency — not "models agree".**
"Models agree" is subjective. "All three candidates include CF-1 in constraints" is
observable. The convergence check must state what fields must be consistent across
candidates, not just that consensus was reached.

**4. Generic quality criteria are SILENT_FAILURE.**
A NODE whose quality field says "code must be correct and secure" passes CV1-CV4 in
the v2 format but would fail Check 4 in the v1 format. In v2 format, CV1's "grade >=
0.85" catches this if the arbiter panel includes a Prompts arbiter. For flows where
quality signal corruption is a known risk, use v1 with explicit Check 4.

**5. DEFERRED_CONSTRAINT (convergence = 0.7) can still pass threshold.**
A NODE where one constraint was unresolved but deferred gets convergence_score = 0.7.
With all other factors at 1.0: `0.7 × 1.0 × 1.0 × 1.0 = 0.7`. This is below 0.85.
A DEFERRED_CONSTRAINT NODE fails the grade and requires the deferred constraint to be
resolved before it can be accepted. This is intentional — provisional NODEs should
not become the basis for Cycle 4 code generation.

---

## RELATIONSHIP TO SUBSEQUENT STEPS

- **Step 6 (CYCLE3-CONTEXT):** Receives the accepted NODEs from Cycle 2. The NODE's
  intent and structure fields are what Cycle 3 evaluates for LEAF vs EXPAND decision.
  A NODE that was accepted with `convergence_score = 1.0` and specific quality criteria
  gives Cycle 3 reliable material to evaluate depth.

- **Step 9 (VISIBILITY):** Cycle 2 SENT and DECIDED fields come from the template
  (Step 4) and the grade result (Step 5). The CHANGED field records whether each NODE
  was seeded to `xiigen-rag-patterns`.

- **Step 10 (CHAIN-REVIEW):** Reads `cycle2.status = "TEST_DEFINED"` from state
  to verify Step 5 was completed. The C2→C3 boundary check verifies that accepted
  NODEs (4 fields, convergence confirmed) match Cycle 3's input requirements.

---

*End of GUIDE-B25 — FLOW-XX-STEP-5-CYCLE2-TEST.md*
*List A sources: ZIP-11 (FLOW-01/09 STEP-5-CYCLE2-TEST examples),*
*project knowledge (SK-435 node-convergence verdict vocabulary,*
*SK-441 simulation-protocol SILENT_FAILURE detection)*
*Target B-type: B-25 — FLOW-XX-STEP-5-CYCLE2-TEST.md*
*Round: 35 of 72*
