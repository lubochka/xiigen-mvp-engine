# GUIDE-B27 — How to Produce `FLOW-XX-STEP-7-CYCLE3-TEST.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 37 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-7-CYCLE3-TEST.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-7-CYCLE3-TEST guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a flow's
Step 6 output and state, it will produce a correct Cycle 3 test definition that grades
each LEAF/EXPAND depth decision before the chain can proceed.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-7-CYCLE3-TEST.md` is **Step 7 of the 10-step simulation pipeline**.
It defines how to verify that the Depth Decider AI produced a valid depth decision
for each NODE — five checks, a grade formula, a silent failure detection pattern,
and gates for consistency and termination bound enforcement.

**Position in sequence:**
```
Step 6 → CYCLE 3 CONTEXT (sends each NODE to Depth Decider)
Step 7 → CYCLE 3 TEST    (this file — grades each LEAF/EXPAND decision)
Step 8 → HANDOFF CONTRACT (uses LEAF NODEs only)
```

**What Step 7 grades:**
After Cycle 3 produces a LEAF or EXPAND verdict for each NODE, Step 7 determines
whether that verdict is valid. The key question: did the Depth Decider cite evidence
from the NODE, or did it just assert a verdict without reasoning?

**Why justification is the most important check:**
An unjustified LEAF verdict where the NODE should have been EXPAND causes a
SILENT_FAILURE (SK-441): the multi-responsibility NODE enters Cycle 4 directly,
the generator produces code covering all responsibilities in one file, the code
passes AF-9 (no specific criterion catches over-responsibility), and the DPO triple
is stored with score 1.0 — but the design is wrong. Requiring justification catches
every such case before it corrupts the training corpus.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-STEP-7-CYCLE3-TEST.md` — compressed v2 format: grade threshold + formula, 5 depth decision checks table (D1-D5), SILENT_FAILURE risk block, state write |
| ZIP-11 | PRIMARY | `FLOW-01-STEP-7-CYCLE3-TEST.md` — rich v1 format: 3 check definitions (justification with 3 options, consistency with run protocol, termination bound enforcement test), sub-flow coherence with overlap test, grade formula with gate distinction, SILENT_FAILURE pattern, threshold handling |
| ZIP-Project | REFERENCE | `planning--depth-decision-SKILL.md` (SK-521) — Section 5 verification checks; grade formula: justification_present × non_overlap; 3 verdict options for justification |
| ZIP-Project | REFERENCE | `planning--simulation-protocol-SKILL.md` (SK-441) — SILENT_FAILURE: LEAF with no justification where EXPAND was needed |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-7-CYCLE3-TEST.md`

**Also updates:** `FLOW-XX-PLAN-STATE.json` with `cycle3.status = "TEST_DEFINED"`

---

## THE TWO FORMATS

**v2 compressed (FLOW-09 style — use for new flows):**
Four sections: GRADE THRESHOLD, DEPTH DECISION CHECKS table (5 rows D1-D5),
SILENT_FAILURE RISK block, STATE WRITE. ~48 lines.

**v1 rich (FLOW-01 style — when explicit grading reasoning is needed):**
Three full check definitions with observable criteria, sub-flow coherence overlap test,
grade formula with gate distinction, SILENT_FAILURE detection section, threshold.

---

## THE GRADE FORMULA

```
depth_decision_grade = justification_present × non_overlap
```

Where:
- `justification_present`: 1 (justified) or 0 (unjustified) — binary
- `non_overlap`: 1 (all sub-nodes distinct, or LEAF so N/A) or 0 (sub-nodes overlap)

**Critical architectural rule:** Consistency and termination bound enforcement are
GATES, not grade factors:
- `consistency_score = 0.0` → escalate, do not proceed, do not grade
- `bound_enforced = 0` → BLOCKING, halt ALL depth decisions, do not proceed to Step 8

This means a depth decision that fails the consistency check or the termination bound
test is not "graded 0" — it is halted at a higher level before the grade formula runs.

---

## HOW TO PRODUCE THE FILE (v2 FORMAT — DEFAULT)

### Step 1 — Read PLAN-STATE.json

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('cycle3.context_package_file:', s.cycle3 && s.cycle3.context_package_file);
console.log('cycle3.termination_depth:', s.cycle3 && s.cycle3.termination_depth);
"
```

### Step 2 — Write the file header

```markdown
# FLOW-XX — STEP 7: CYCLE 3 TEST DEFINITION
## Status: COMPLETE
## Skills loaded: planning--depth-decision-SKILL.md (SK-521), planning--simulation-protocol-SKILL.md (SK-441)
```

### Step 3 — Write the GRADE THRESHOLD block

```markdown
---

## GRADE THRESHOLD

```
grade_threshold: 0.85
grade_formula:   justification_present x non_overlap
rerun_on_fail:   true
```
```

### Step 4 — Write the DEPTH DECISION CHECKS table

```markdown
---

## DEPTH DECISION CHECKS

| Check | Pass condition | Fail action |
|-------|---------------|------------|
| D1: Verdict present | verdict is "LEAF" or "EXPAND" | Rerun |
| D2: Justification | justification_present = 1 (non-empty string) | Rerun — SILENT_FAILURE risk |
| D3: Signal evaluation | >= 1 of 5 signals evaluated and documented | Rerun |
| D4: Sub-flow non-overlap (EXPAND only) | Sub-flows address distinct responsibilities | Rerun |
| D5: Termination bound compliance | If depth >= bound -> LEAF required | Rerun |
```

### Step 5 — Write the SILENT_FAILURE RISK block

```markdown
---

## SILENT_FAILURE RISK

```
Risk: LEAF verdict with empty justification.
Mitigation: D2 check — justification_present = 0 -> grade = 0 -> Cycle 3 reruns.
Status: MITIGATED.
```
```

### Step 6 — Write the STATE WRITE

```markdown
---

## STATE WRITE

```
cycle3.status → "TEST_DEFINED"
step_status   → "COMPLETE"
```

Apply to PLAN-STATE.json:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.cycle3 = s.cycle3 || {};
s.cycle3.status = 'TEST_DEFINED';
s.current_step = 7;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. cycle3.status:', s.cycle3.status);
"
```
```

### Step 7 — Close

```markdown
---

**STEP 7 COMPLETE**
```

---

## HOW TO PRODUCE THE FILE (v1 FORMAT — WHEN NEEDED)

Use v1 when:
- The flow has step types that are genuinely ambiguous between LEAF and EXPAND
- The termination bound test needs explicit documentation (new system deployments)
- Sub-flow coherence examples from this flow's domain are needed

v1 adds three full check definitions and the sub-flow coherence section:

### v1 CHECK 1 — JUSTIFICATION PRESENT

```markdown
---

## CHECK 1 — JUSTIFICATION PRESENT

**Three valid justification options:**

Option A (LEAF via termination bound):
```
Output contains explicit: "depth = [N] = termination_depth — bound enforced — verdict: LEAF"
→ justification_present = 1
```

Option B (LEAF via no signals):
```
Output evaluates all 5 signals against specific NODE fields, finds none triggered.
For each signal: names signal, cites NODE field value, states why NOT triggered.
Example: "S1 checked: intent.purpose = '[purpose text]' — no 'and'/'then' — S1 NOT triggered"
→ justification_present = 1 when all 5 signals evaluated
```

Option C (EXPAND via signals):
```
Output cites at least 1 signal with evidence from specific NODE field.
Example: "S1 triggered: intent.purpose = '[purpose text]' — [N] distinct outcomes — S1 triggered"
AND includes sub_flow_decomposition (minimum 2 named sub-nodes).
→ justification_present = 1
```

**Failing justification (justification_present = 0):**
```
"LEAF — this step is straightforward."      → no signal, no bound cited
"EXPAND — this step is complex."            → no signal referenced
"LEAF — single responsibility."             → assertion without NODE evidence
```

**justification_present:** 1 (any valid option) or 0 (failing pattern) — binary.
A verdict with justification_present = 0 cannot be learned from.
```

### v1 CHECK 2 — CONSISTENCY

```markdown
---

## CHECK 2 — CONSISTENCY

Run the same Cycle 3 context package twice with different random seeds.

```
Acceptable: LEAF + LEAF → consistent → passes (consistency_score = 1.0)
Acceptable: EXPAND + EXPAND (same sub-nodes) → consistent → passes (1.0)
Review:     EXPAND + EXPAND (different sub-nodes) → same verdict, different decomposition →
             flag for human review (consistency_score = 0.5)
Failing:    LEAF + EXPAND → inconsistent → reject both → (consistency_score = 0.0)
             → Escalate: Luba decides. Do not attempt a third run.
             → Record in state.issues[]: step, runs, both verdicts.
```

**consistency_score:** 1.0 / 0.5 / 0.0 — three values.
consistency_score = 0.0 → GATE: escalate, do not grade.
```

### v1 CHECK 3 — TERMINATION BOUND ENFORCEMENT

```markdown
---

## CHECK 3 — TERMINATION BOUND ENFORCEMENT

This test verifies the MACHINE constraint — mandatory, not optional.

**Test procedure:**
```
1. Take a NODE with signals suggesting EXPAND.
2. Submit twice:
   Run A: current_depth = 1 (normal — signals apply)
   Run B: current_depth = [termination_depth] (bound — signals suppressed)
3. Expected:
   Run A: any verdict based on signal evaluation (LEAF or EXPAND acceptable)
   Run B: LEAF always, regardless of Run A
4. Failing:
   Run B produces EXPAND → MACHINE CONSTRAINT VIOLATED
   → BLOCKING: do not proceed to Step 8.
   → Record: "MACHINE CONSTRAINT VIOLATION — termination bound not enforced"
```

**bound_enforced:** 1 (Run B = LEAF) or 0 (Run B = EXPAND) — binary.
bound_enforced = 0 → BLOCKING all depth decisions until fixed.
```

### v1 SUB-FLOW COHERENCE (EXPAND only)

```markdown
---

## SUB-FLOW COHERENCE (EXPAND only — SK-521 Check 3)

For each EXPAND verdict, apply the overlap test to each sub-node pair:

```
For sub-nodes A and B:
  Question: If B is removed, can A stand alone as a complete user-facing responsibility?
  YES (A stands alone) → A and B are distinct → keep separate → PASS
  NO (A requires B)    → A and B share responsibility → merge → sub-flow count decreases

Passing example:
  A: "[domain action 1 — self-contained]"
  B: "[domain action 2 — self-contained]"
  → Removing B leaves A complete → distinct → PASS

Failing example:
  A: "[domain action requiring B's output]"
  B: "[precondition for A]"
  → Removing B makes A incomplete → they are one responsibility → merge

non_overlap = 1 if all sub-node pairs are distinct
non_overlap = 0 if any pair overlaps
```
```

### v1 GRADE FORMULA section

```markdown
---

## GRADE FORMULA

```
depth_decision_grade = justification_present × non_overlap

Where:
  justification_present: 1 (justified) or 0 (unjustified) — binary
  non_overlap: 1 (sub-nodes distinct, or LEAF) or 0 (any sub-nodes overlap)

Consistency and bound enforcement are GATES (not grade factors):
  consistency_score = 0.0 → escalate (do not compute grade)
  bound_enforced = 0 → BLOCKING all decisions (do not compute grade)
```

**Grade threshold:** 0.85 (same as all cycles)

Below 0.85 → verdict REJECTED, Cycle 3 reruns for this step (max 3 reruns)
At/above 0.85 → verdict ACCEPTED:
  LEAF → forward NODE to Cycle 4 (executor generation, Step 8)
  EXPAND → use sub_flow_decomposition as INTENT for new Cycle 1 at depth+1
```

### v1 SILENT_FAILURE DETECTION section

```markdown
---

## SILENT_FAILURE DETECTION (SK-441)

```
Pattern: LEAF verdict with no justification where NODE should have been EXPAND.
Effect:  Multi-responsibility NODE enters Cycle 4.
         Generator produces code covering all responsibilities in one file.
         Code may pass AF-9 (no criterion catches over-responsibility).
         DPO triple stored with score 1.0 — but design is wrong.

Detection:
  justification_present = 0 → Check 1 fails → grade = 0 → Cycle 3 reruns.
  Every unjustified LEAF is a SILENT_FAILURE risk. Requiring justification catches all.

Prevention:
  justification_present = 1 is required before any LEAF verdict is accepted.
```
```

---

## THE 5 DEPTH DECISION CHECKS EXPLAINED

The v2 format compresses these into a table. Here is what each check tests:

| Check | What it verifies | Gate or grade factor |
|-------|-----------------|---------------------|
| D1: Verdict present | Output contains "LEAF" or "EXPAND" literal | Grade factor (no verdict = grade 0) |
| D2: Justification | Non-empty justification citing signal or bound | Grade factor — binary |
| D3: Signal evaluation | ≥1 of 5 signals evaluated and documented | Grade factor |
| D4: Sub-flow non-overlap | EXPAND sub-nodes don't share responsibility | Grade factor (EXPAND only) |
| D5: Termination bound | depth ≥ bound → LEAF enforced | GATE (failure = BLOCKING) |

**D5 is a GATE, not a grade factor.**
Unlike D1-D4 which contribute to the grade formula, D5 is a correctness test for the
MACHINE constraint. If D5 fails (termination bound not enforced), ALL depth decisions
are invalidated until the constraint is fixed. No grade is computed.

---

## ACCEPTANCE CRITERIA FOR STEP-7-CYCLE3-TEST

Before Step 7 is considered complete:

- [ ] File header declares Status: COMPLETE and skills loaded (SK-521 + SK-441)
- [ ] GRADE THRESHOLD block: threshold = 0.85, formula = justification_present × non_overlap
- [ ] DEPTH DECISION CHECKS table has 5 rows (D1-D5) with pass conditions
- [ ] D2 (Justification) is labeled as SILENT_FAILURE risk
- [ ] D5 (Termination bound) is labeled as a gate (not just a rerun)
- [ ] SILENT_FAILURE RISK block identifies the unjustified LEAF pattern
- [ ] STATE WRITE updates cycle3.status = "TEST_DEFINED"

For v1 additionally:
- [ ] Justification check defines 3 valid options (bound, no-signals, signal-cited)
- [ ] Consistency check defines run protocol and consistency_score = 0.0 escalation
- [ ] Termination bound test documents Run A/Run B procedure
- [ ] Sub-flow coherence defines the "can A stand alone without B?" overlap test
- [ ] Grade formula distinguishes gates from grade factors

---

## KEY RULES

**1. Justification_present = 0 produces grade = 0 — always.**
An unjustified depth decision (LEAF or EXPAND without evidence from NODE fields or
termination bound citation) cannot be verified, cannot be learned from, and may
silently corrupt the training corpus if EXPAND was warranted. The check is binary —
any justification from the 3 valid options passes; generic assertions fail.

**2. Consistency check is a gate, not a grade factor.**
If two independent runs produce LEAF and EXPAND for the same NODE, the NODE's
complexity is genuinely ambiguous. No grade is computed. This cannot be resolved
by running a third time to "break the tie" — that produces a third independent
judgment that may disagree with both. Escalate to Luba.

**3. Termination bound enforcement is a BLOCKING gate.**
If the Depth Decider produces EXPAND at termination depth, the MACHINE constraint
is violated. No depth decision for ANY step proceeds until fixed. This is not a
rerun scenario — it's a system correctness failure.

**4. Sub-flow coherence uses the remove-one test.**
For each pair of sub-nodes in an EXPAND verdict: can A stand alone if B is removed?
"Stand alone" means A's stated responsibility is complete and doesn't require B's
output or precondition. If not → merge A and B → re-evaluate whether EXPAND is
still justified with the merged sub-node.

**5. max_reruns = 3 for Cycle 3 — same as Cycle 2.**
After 3 failed depth decisions for a step, the step is marked BLOCKED_AGENT_FAILURE.
SK-525 meta-arbiter fires with the full execution record.

---

## RELATIONSHIP TO SUBSEQUENT STEPS

- **Step 8 (HANDOFF-CONTRACT):** Receives only LEAF NODEs. An EXPAND verdict sends
  the sub-flow decomposition back to a new Cycle 1 (at depth+1), not to Step 8.
  Step 8 documents what LEAF NODEs need for executor generation.

- **Step 10 (CHAIN-REVIEW):** The C3→C4 boundary check verifies that Cycle 3 produces
  LEAF NODEs with the right structure for Step 8. The `cycle3.status = "TEST_DEFINED"`
  state entry confirms Step 7 was completed. The SILENT_FAILURE check in Step 10
  references the Step 7 D2 check as the mitigation for the unjustified-LEAF pattern.

---

*End of GUIDE-B27 — FLOW-XX-STEP-7-CYCLE3-TEST.md*
*List A sources: ZIP-11 (FLOW-01/09 STEP-7-CYCLE3-TEST examples),*
*project knowledge (SK-521 depth-decision §Section 5 verification,*
*SK-441 simulation-protocol SILENT_FAILURE detection)*
*Target B-type: B-27 — FLOW-XX-STEP-7-CYCLE3-TEST.md*
*Round: 37 of 72*
