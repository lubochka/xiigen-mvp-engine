# GUIDE-B23 — How to Produce `FLOW-XX-STEP-3-CYCLE1-TEST.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 33 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-3-CYCLE1-TEST.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-3-CYCLE1-TEST guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a flow's
Step 2 output and PLAN-STATE.json, it will produce a correct Cycle 1 test definition
that grades the Planner AI's plan before execution begins.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-3-CYCLE1-TEST.md` is **Step 3 of the 10-step simulation pipeline**.
It defines how to grade the plan produced by the Cycle 1 Planner AI — four checks,
a grade formula, a threshold, and a meta-arbiter trigger for persistent failures.

**Position in sequence:**
```
Step 2 → CYCLE 1 CONTEXT (tells Planner AI what to plan)
Step 3 → CYCLE 1 TEST   (this file — grades what the Planner produced)
Step 4 → CYCLE 2 TEMPLATE (uses accepted plan steps as input)
```

**Why it exists:**
The Planner AI produces a plan from the context package (Step 2). Without a grading
mechanism, any plan passes — including plans that skip intent clauses, use technology
names, combine responsibilities into single steps, or have broken step dependencies.
Step 3 defines the four checks and the grade formula that rejects bad plans before
Cycle 2 consumes them.

**The critical insight:**
> A plan that passes all four checks can still score below 0.85 if clauses are PARTIAL
> rather than COVERED. The grade formula combines four sub-scores multiplicatively —
> a failure in abstraction (any technology name) multiplies the entire grade by 0,
> regardless of how well coverage and responsibility scored.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-STEP-3-CYCLE1-TEST.md` — compressed v2 format: grade threshold block, 4-check table, grade formula, meta-arbiter trigger, state write |
| ZIP-11 | PRIMARY | `FLOW-01-STEP-3-CYCLE1-TEST.md` — rich v1 format: full 4-check definitions with COVERED/PARTIAL/MISSING verdicts, per-clause pass criteria, technology list, grade formula with examples, mandatory dependency rule, full threshold handling |
| ZIP-11 | COMPARISON | `FLOW-03-STEP-3-CYCLE1-TEST.md` — confirms compressed format consistency across flows |
| ZIP-Project | REFERENCE | `planning--simulation-protocol-SKILL.md` (SK-441) — verdict vocabulary: WORKS/PARTIAL/BREAKS/WRONG/SILENT_FAILURE; coverage/abstraction/responsibility/dependency check definitions |
| ZIP-Project | REFERENCE | `planning--intent-to-plan-SKILL.md` (SK-520) — Section 5 grade formula; Plan Reviewer AI role; rerun-on-fail logic |

**Size pattern observed:** All v2 flows (FLOW-03 through FLOW-N) use identical
compressed format (57 lines). FLOW-01 uses the rich v1 format (379 lines). For new
flows, use v2. Use v1 only when clause analysis is genuinely ambiguous or when
specific mandatory dependencies need explicit documentation.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-3-CYCLE1-TEST.md`

**Also updates:** `FLOW-XX-PLAN-STATE.json` with `cycle1.grade_threshold = 0.85`

---

## THE TWO FORMATS

**v2 compressed (FLOW-09 style — use for new flows):**
Four sections: GRADE THRESHOLD block, PLAN REVIEWER CHECKS table, GRADE FORMULA,
META-ARBITER TRIGGER, STATE WRITE. Total ~57 lines. Task-range-specific only in the
Coverage check row.

**v1 rich (FLOW-01 style — when explicit grading reasoning is needed):**
Full per-clause coverage analysis with COVERED/PARTIAL/MISSING criteria per clause,
acceptance scenarios from SK-499, domain-specific technology list for abstraction
check, grade formula with worked examples, mandatory dependency declaration.

---

## HOW TO PRODUCE THE FILE (v2 FORMAT — DEFAULT)

### Step 1 — Read from PLAN-STATE.json

Only one value needs to be confirmed before authoring:

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('task_range:', s.task_range);    // needed for C1 Coverage check
console.log('cycle1.status:', s.cycle1 && s.cycle1.status);
"
```

### Step 2 — Write the file header

```markdown
# FLOW-XX — STEP 3: CYCLE 1 TEST DEFINITION
## Status: COMPLETE
## Skills loaded: planning--simulation-protocol-SKILL.md (SK-441), planning--output-contract-SKILL.md (SK-448)
```

### Step 3 — Write the GRADE THRESHOLD block

```markdown
---

## GRADE THRESHOLD

```
grade_threshold: 0.85
rerun_on_fail:   true
max_reruns:      3
```
```

The threshold is always 0.85. `rerun_on_fail: true` and `max_reruns: 3` are also
fixed — they apply to every flow. Do not vary these values.

### Step 4 — Write the PLAN REVIEWER CHECKS table

The only flow-specific value is the task range in C1 Coverage:

```markdown
---

## PLAN REVIEWER CHECKS (SK-520 Section 5)

| Check | Pass condition | Fail action |
|-------|---------------|-------------|
| C1: Coverage | Every task type in T[NNN]-T[NNN+M] has >= 1 plan step | Rerun with coverage gap noted |
| C2: Abstraction | No step names a provider SDK | Rerun with anti-pattern flagged |
| C3: Responsibility | Each step scoped to <= 1 task type | Rerun with split instruction |
| C4: Dependency | Steps ordered correctly | Rerun with reordering instruction |
```

### Step 5 — Write the GRADE FORMULA

```markdown
---

## GRADE FORMULA (SK-520 Section 5)

```
grade = coverageScore x abstractionScore x (0.5 + 0.5 x responsibilityScore) x dependencyScore
```
```

### Step 6 — Write the META-ARBITER TRIGGER

```markdown
---

## META-ARBITER TRIGGER

```
if grade < 0.85 after max_reruns:
  trigger SK-525 Meta-Arbiter
  send full execution record (cycle=1, bad_grade, prior_grades, context_package, model_outputs)
```
```

### Step 7 — Write the STATE WRITE

```markdown
---

## STATE WRITE

```
cycle1.status          → "TEST_DEFINED"
cycle1.grade_threshold → 0.85
step_status            → "COMPLETE"
```

Apply to PLAN-STATE.json:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.cycle1 = s.cycle1 || {};
s.cycle1.status = 'TEST_DEFINED';
s.cycle1.grade_threshold = 0.85;
s.meta_arbiter = s.meta_arbiter || {};
s.meta_arbiter.trigger_threshold = 0.85;
s.meta_arbiter.skill = 'SK-525';
s.current_step = 3;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. cycle1.grade_threshold:', s.cycle1.grade_threshold);
"
```
```

### Step 8 — Close

```markdown
---

**STEP 3 COMPLETE**
```

---

## HOW TO PRODUCE THE FILE (v1 FORMAT — WHEN NEEDED)

Use v1 when any of these apply:
- Intent clauses are ambiguous and need per-clause COVERED/PARTIAL/MISSING criteria
- The domain requires a flow-specific technology list (not just "provider SDK")
- The flow has mandatory dependencies that must be explicitly stated

v1 adds these sections after GRADE THRESHOLD:

### Additional section: TASK

```markdown
---

## TASK

Define how to verify that the Planner AI produced a valid Cycle 1 plan for FLOW-XX.
Four checks: coverage (every intent clause maps to at least one plan step), abstraction
(no step names a technology), single responsibility (no step combines two actions), and
dependency completeness (all declared step dependencies exist and are correct).
```

### Additional section: INTENT CLAUSE TABLE (from Step 2)

```markdown
---

## INTENT CLAUSES (from Step 2 — reproduced for reviewer use)

| # | Clause | Source phrase | Coverage verdict options |
|---|--------|--------------|--------------------------|
| 1 | [clause name] | "[source phrase]" | COVERED / PARTIAL / MISSING |
| 2 | [clause name] | "[source phrase]" | COVERED / PARTIAL / MISSING |
| N | [clause name] | "[source phrase]" | COVERED / PARTIAL / MISSING |
```

### Additional section: ACCEPTANCE SCENARIOS

```markdown
---

## ACCEPTANCE SCENARIOS (SK-499 — clause coverage test cases)

| Scenario | Clause | Type | Plan must include a step that enables this |
|----------|--------|------|-------------------------------------------|
| S-01 | 1-N | Happy path | [full happy path scenario for this flow] |
| S-02 | N | Guard: [name] | [guard condition that the plan must handle] |
| ...  | | | |
```

**How to derive acceptance scenarios:**
Read the flow spec. For each intent clause, identify:
1. The happy-path scenario (what happens when everything works)
2. Guard conditions (what the plan must handle when things go wrong)

Each acceptance scenario becomes a concrete "what the plan must address" criterion
in the per-clause coverage check below.

### v1 full CHECK 1 — COVERAGE definition

```markdown
---

## CHECK 1 — COVERAGE

**Verdict per clause:**
```
COVERED (score: 1.0):  The clause is the primary subject of >= 1 plan step.
                       The step must address the main scenario AND >= 1 guard condition.

PARTIAL (score: 0.5):  The clause is addressed as a side effect. Or: happy path
                       is addressed but all guard conditions are absent.

MISSING (score: 0.0):  No plan step addresses this clause at all.
```

**Coverage score formula:**
```
coverage_score = sum(clause_verdicts) / N
  where: COVERED → 1.0, PARTIAL → 0.5, MISSING → 0.0
         N = number of clauses
```

**Per-clause check criteria:**

*Clause 1 — [clause name]:*
- COVERED if: [explicit criteria from acceptance scenarios]
- PARTIAL if: [partial coverage definition]
- MISSING if: [no coverage definition]

*Clause N — [clause name]:*
- COVERED if: ...
```

### v1 full CHECK 2 — ABSTRACTION definition

```markdown
---

## CHECK 2 — ABSTRACTION

**Technology list for FLOW-XX (domain-specific — all must be absent from all steps):**
```
Framework names:   [list relevant frameworks for this domain]
Database names:    [list relevant databases]
Queue systems:     [list relevant queues]
Library names:     [list relevant libraries]
Cloud providers:   AWS, GCP, Azure, Cloudflare
Code artifacts:    any class name, any method name, any API path,
                   any task type ID (T[NNN]-T[NNN+M])
```

**Verdict per step:**
```
CLEAN (score: 1):    No item from the technology list appears in the step text.
VIOLATION (score: 0): At least one item from the technology list appears.
```

**Abstraction score:**
```
abstraction_score = 1 if ALL steps CLEAN
abstraction_score = 0 if ANY step has VIOLATION
```
Note: binary. A single technology name multiplies entire grade by 0.
```

### v1 full CHECK 3 — SINGLE RESPONSIBILITY definition

```markdown
---

## CHECK 3 — SINGLE RESPONSIBILITY

**Signal words (candidate split points):** "and", "then", "also", "as well as"

**Split point rules:**
```
IS a split point when each part can stand alone as a complete user-facing action.
NOT a split point when:
  → "and" connects two properties of the same action
     Example: "Accept email address and password" → same action (credentials)
  → "and" describes the content of one delivery action
     Example: "Deliver workspace setup, tutorial, and invitation" → one delivery
```

**Responsibility score:**
```
responsibility_score = 1 - (COMPOUND_count / total_steps)
```
Note: not binary. 1 COMPOUND step in 6 → score = 0.83. Reviewer flags, does NOT split.
```

### v1 full CHECK 4 — DEPENDENCY COMPLETENESS definition

```markdown
---

## CHECK 4 — DEPENDENCY COMPLETENESS

**Verdict per reference:**
```
VALID:   Named step exists and produces what the current step claims to need.
BROKEN:  Named step exists but does NOT produce what is claimed.
MISSING: "requires: Step N" declared but Step N does not exist in the plan.
```

**Dependency score:**
```
dependency_score = 1 if ALL references VALID (or no references exist)
dependency_score = 0 if ANY reference is BROKEN or MISSING
```
Note: binary.

[If flow has mandatory dependencies:]
**Mandatory dependency for FLOW-XX:**
[Name the specific dependency that must be declared — e.g., Clause 3 must declare
Clause 2 as a prerequisite. If missing, Check 4 fails regardless of other checks.]
```

### v1 GRADE FORMULA with examples

```markdown
---

## GRADE FORMULA

```
plan_grade = coverage_score
           × abstraction_score
           × (0.5 + 0.5 × responsibility_score)
           × dependency_score
```

**Example — acceptable plan:**
```
  All N clauses COVERED → coverage_score = 1.0
  All steps CLEAN → abstraction_score = 1.0
  0 COMPOUND steps → responsibility_score = 1.0
  All dependencies VALID → dependency_score = 1.0
  plan_grade = 1.0 × 1.0 × 1.0 × 1.0 = 1.0 ✅ ACCEPTED
```

**Example — plan with abstraction violation:**
```
  All clauses COVERED → coverage_score = 1.0
  1 step names [technology] → abstraction_score = 0
  plan_grade = 1.0 × 0 × (anything) × (anything) = 0.0 ❌ REJECTED
```

**Example — plan with partial coverage:**
```
  Clause 2 PARTIAL → coverage_score = (1.0 + 0.5 + 1.0) / 3 = 0.83
  All steps CLEAN → abstraction_score = 1.0
  1 COMPOUND step in 7 → responsibility_score = 0.86
  dependency_score = 1.0
  plan_grade = 0.83 × 1.0 × (0.5 + 0.5 × 0.86) × 1.0 = 0.83 × 0.93 = 0.77 ❌ REJECTED
```
```

---

## THE GRADE FORMULA — UNDERSTANDING THE STRUCTURE

The formula is:

```
grade = coverageScore × abstractionScore × (0.5 + 0.5 × responsibilityScore) × dependencyScore
```

Four components, three of them binary, one continuous:

| Component | Type | Effect of failure |
|-----------|------|-------------------|
| `coverageScore` | Continuous (0.0–1.0) | Partial coverage reduces grade proportionally |
| `abstractionScore` | Binary (0 or 1) | Any tech name → grade = 0 |
| `(0.5 + 0.5 × responsibilityScore)` | Continuous (0.5–1.0) | Compound steps reduce grade; worst case is 0.5 (never 0) |
| `dependencyScore` | Binary (0 or 1) | Any broken dependency → grade = 0 |

The responsibility component has a floor of 0.5 — even if every step is COMPOUND,
the grade is halved rather than zeroed. This is intentional: compound steps are a
quality problem, not a correctness failure. Abstraction and dependency failures ARE
correctness failures (technology names lock implementations; broken dependencies
mean Cycle 2 cannot execute in order) — hence their binary treatment.

The threshold is 0.85. A plan where all clauses are COVERED, all steps are CLEAN,
and one dependency is missing will score 0.0 (dependency binary × 0 = 0).

---

## META-ARBITER TRIGGER — WHEN IT FIRES

The meta-arbiter (SK-525) fires when the Planner AI has been given 3 reruns and
still cannot produce a plan above 0.85. At that point, a human diagnosis is needed.

The execution record sent to SK-525 must contain:
- `cycle` = 1
- `bad_grade` = the grade on the last attempt
- `prior_grades` = all grades from prior attempts
- `context_package` = the full Step 2 document (what the Planner received)
- `model_outputs` = all plan attempts from all reruns

This is why Step 9 (VISIBILITY.md) must define a Cycle 5 SENT field that includes
all these fields — the chain review (Step 10) verifies that this is correctly set up.

---

## ACCEPTANCE CRITERIA FOR STEP-3-CYCLE1-TEST

Before Step 3 is considered complete:

- [ ] File header declares Status: COMPLETE and skills loaded (SK-441 + SK-448)
- [ ] GRADE THRESHOLD block: threshold = 0.85, rerun_on_fail = true, max_reruns = 3
- [ ] PLAN REVIEWER CHECKS table has all 4 checks (C1-C4) with pass conditions
- [ ] C1 Coverage references the correct task range T[NNN]-T[NNN+M]
- [ ] GRADE FORMULA is stated (exactly as shown — not paraphrased)
- [ ] META-ARBITER TRIGGER states SK-525 fires after max_reruns with full execution record
- [ ] STATE WRITE updates cycle1.grade_threshold = 0.85 and cycle1.status = "TEST_DEFINED"

For v1 format additionally:
- [ ] All N intent clauses from Step 2 are listed with per-clause COVERED/PARTIAL/MISSING criteria
- [ ] Technology list is domain-specific (not generic)
- [ ] Grade formula includes at least 2 worked examples
- [ ] Mandatory dependencies are stated if the flow has cross-clause prerequisites

---

## KEY RULES

**1. The grade threshold is always 0.85.**
Do not vary this value per flow. The threshold is a system constant that governs
when a plan is accepted for Cycle 2 consumption. Changing it per flow would make
the grade meaning inconsistent across the flow library.

**2. Abstraction failure is binary and multiplies by 0.**
A single technology name in any step produces `abstraction_score = 0`, which
multiplies the entire grade by 0 regardless of how well coverage and responsibility
scored. This is intentional — technology names in plan steps pre-scope Cycle 2
NODE convergence to specific implementations, corrupting the AI-driven model.

**3. max_reruns = 3 is fixed.**
After 3 reruns below threshold, the problem is not the Planner AI's output quality —
it's either the context package (Step 2) or a systemic gap. SK-525 meta-arbiter
diagnosis is required. Allowing more reruns without human review just burns cycles.

**4. C1 Coverage check is the only flow-specific row.**
The task range `T[NNN]-T[NNN+M]` in C1 is the only thing that changes across flows.
All other rows (C2 Abstraction, C3 Responsibility, C4 Dependency) have the same pass
condition and fail action for every flow.

**5. STATE WRITE must set both cycle1.grade_threshold and meta_arbiter.trigger_threshold.**
Both are 0.85. They are stored separately because the chain review (Step 10)
reads them independently: `cycle1.grade_threshold` confirms Step 3 ran, and
`meta_arbiter.trigger_threshold` confirms SK-525 is configured for this flow.

---

## RELATIONSHIP TO SUBSEQUENT STEPS

- **Step 4 (CYCLE2-TEMPLATE):** Consumes the plan steps that passed the Cycle 1 test.
  The task range from C1 Coverage becomes the task decomposition input.

- **Step 9 (VISIBILITY):** Defines the Cycle 5 SENT field that contains the SK-525
  execution record. The fields required by the meta-arbiter trigger in Step 3 must
  all appear in the Cycle 5 SENT specification.

- **Step 10 (CHAIN-REVIEW):** Reads `cycle1.status = "TEST_DEFINED"` and
  `cycle1.grade_threshold = 0.85` from state to verify Step 3 was completed.

---

*End of GUIDE-B23 — FLOW-XX-STEP-3-CYCLE1-TEST.md*
*List A sources: ZIP-11 (FLOW-01/03/09 STEP-3 examples),*
*project knowledge (SK-441 simulation-protocol, SK-520 intent-to-plan §Section 5)*
*Target B-type: B-23 — FLOW-XX-STEP-3-CYCLE1-TEST.md*
*Round: 33 of 72*
