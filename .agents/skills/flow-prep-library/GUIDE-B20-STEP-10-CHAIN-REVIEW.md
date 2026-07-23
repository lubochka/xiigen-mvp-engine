# GUIDE-B20 — How to Produce `FLOW-XX-STEP-10-CHAIN-REVIEW.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 30 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-10-CHAIN-REVIEW.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-10-CHAIN-REVIEW guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a completed
9-step flow plan, it will produce a correct chain review that verifies the entire
simulation pipeline is connected end-to-end before execution begins.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-10-CHAIN-REVIEW.md` is the **final gate document** of the flow plan
preparation sequence. It is Step 10 of 10 in the simulation pipeline — the step that
walks every boundary between cycles, verifies no gaps exist, confirms all prior
documents were produced, and issues the `READY_FOR_EXECUTION` verdict that unlocks
Phase A of the implementation plan.

**Position in the 10-step sequence:**

```
Step 1:  FLOW-XX-STEP-1-INVARIANTS.md          ← design invariants
Step 2:  FLOW-XX-STEP-2-CYCLE1-CONTEXT.md      ← Cycle 1 context package
Step 3:  FLOW-XX-STEP-3-CYCLE1-TEST.md         ← Cycle 1 test definition
Step 4:  FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md     ← Cycle 2 NODE template
Step 5:  FLOW-XX-STEP-5-CYCLE2-TEST.md         ← Cycle 2 test definition
Step 6:  FLOW-XX-STEP-6-CYCLE3-CONTEXT.md      ← Cycle 3 context package
Step 7:  FLOW-XX-STEP-7-CYCLE3-TEST.md         ← Cycle 3 test definition
Step 8:  FLOW-XX-STEP-8-HANDOFF-CONTRACT.md    ← executor handoff contract
Step 9:  FLOW-XX-STEP-9-VISIBILITY.md          ← visibility contracts
Step 10: FLOW-XX-STEP-10-CHAIN-REVIEW.md       ← this file (final gate)
```

**Consumer:** The design co-architect (Claude.ai) who authored Steps 1-9, and
the implementation plan which references the chain verdict.

**Output:** Updates `FLOW-XX-PLAN-STATE.json` with
`chain_review.verdict = "READY_FOR_EXECUTION"` and the full documents_produced list.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-01-STEP-10-CHAIN-REVIEW.md` — richest version (11KB): full task description, inputs from state, chain verification table with detailed notes, missing skills audit, documents produced audit, step status audit, SK-524 completeness test, SILENT_FAILURE check, chain verdict, expected results section, bad results section, full state write, issue inventory |
| ZIP-11 | COMPARISON | `FLOW-09-STEP-10-CHAIN-REVIEW.md` — compressed mature version (2.8KB): same structure, condensed for flows where all checks pass cleanly |
| ZIP-11 | COMPARISON | `FLOW-02-STEP-10-CHAIN-REVIEW.md` — intermediate, shows compressed but complete structure |
| ZIP-11 | STATE | `FLOW-09-PLAN-STATE.json` — the state file the chain review reads from and writes to (shows state schema: cycle1/2/3 status, executor_handoff, visibility_contracts, chain_review, meta_arbiter, missing_skills, documents_produced) |
| ZIP-01 | PRIMARY | `XIIGEN-FLOW-DOCUMENT-AUTHORING-GUIDE-v1.15.md` — SK-441 (simulation-protocol), SK-448 (output-contract): defines verdict vocabulary (WORKS/PARTIAL/BREAKS/WRONG/SILENT_FAILURE), chain boundary format, SILENT_FAILURE detection |

**Key insight from comparison:** FLOW-01 uses the full verbose format because it was
the first flow through the pipeline. FLOW-02 through FLOW-N use the compressed format
because the chain rows are all WORKS once the pattern is established. For new flows,
use the FLOW-01 format as the template but fill it with flow-specific content — the
chain is only as good as the flow-specific evaluation of each boundary.

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-10-CHAIN-REVIEW.md`

**Also updates:** `docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json`

---

## THE CHAIN REVIEW STRUCTURE

Every STEP-10-CHAIN-REVIEW file has this skeleton:

```
1. File header (Status + Skills loaded)
2. TASK description (what this step does)
3. SKILLS LOADED THIS STEP (SK-441 + SK-448)
4. INPUTS FROM STATE (what was read from PLAN-STATE.json)
5. CHAIN VERIFICATION TABLE (6 boundary rows)
6. MISSING SKILLS AUDIT
7. DOCUMENTS PRODUCED AUDIT (9 step files + 1 state file)
8. STEP STATUS AUDIT (Steps 1-9 must all be COMPLETE)
9. SK-524 COMPLETENESS TEST (5 questions)
10. SILENT_FAILURE CHECK
11. CHAIN VERDICT (READY_FOR_EXECUTION or GAPS_FOUND)
12. EXPECTED RESULTS
13. BAD RESULTS — STOP AND FIX
14. STATE WRITE (chain_review.verdict, documents_produced)
15. ISSUE INVENTORY
16. STEP COMPLETE WHEN
```

---

## HOW TO PRODUCE THE FILE

### Step 1 — Read the PLAN-STATE.json First

Before writing anything, read `FLOW-XX-PLAN-STATE.json` to extract the actual
state values. The chain review must reference real filenames from state, not
placeholder names.

```bash
# Read actual file names from state before authoring
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('cycle1.context_package_file:', s.cycle1.context_package_file);
console.log('cycle2.template_file:', s.cycle2.template_file);
console.log('cycle3.context_package_file:', s.cycle3.context_package_file);
console.log('executor_handoff.handoff_file:', s.executor_handoff.handoff_file);
console.log('visibility_contracts.status:', s.visibility_contracts.status);
console.log('missing_skills:', JSON.stringify(s.missing_skills));
console.log('documents_produced count:', s.documents_produced.length);
console.log('meta_arbiter.trigger_threshold:', s.meta_arbiter.trigger_threshold);
"
```

### Step 2 — Write the File Header

```markdown
# FLOW-XX — STEP 10: CHAIN REVIEW
## Status: COMPLETE
## Skills loaded: planning--simulation-protocol-SKILL.md (SK-441), planning--output-contract-SKILL.md (SK-448)
## State read: cycle1.context_package_file, cycle2.template_file, cycle3.context_package_file, executor_handoff, visibility_contracts.per_cycle, meta_arbiter.trigger_threshold, missing_skills
```

### Step 3 — Write the TASK section

```markdown
---

## TASK

Walk the full chain once. For each boundary between cycles, verify that
everything Cycle N+1 needs as input is produced by Cycle N. If any link
has a gap — something required downstream that is not produced upstream —
record it and fix the context package for the producing cycle before
calling the plan complete.
```

### Step 4 — Write SKILLS LOADED THIS STEP

```markdown
---

## SKILLS LOADED THIS STEP

- ✅ planning--simulation-protocol-SKILL.md (SK-441)
  — Step table format for chain verification; verdict vocabulary
    (WORKS / PARTIAL / BREAKS / WRONG / SILENT_FAILURE); gap format with
    root_cause, symptom_test, fix_class; SILENT_FAILURE detection.

- ✅ planning--output-contract-SKILL.md (SK-448)
  — Output contract verification pattern; specification gate — "does this
    deliverable match what was originally requested?"; two-file minimum rule.
```

### Step 5 — Write INPUTS FROM STATE

```markdown
---

## INPUTS FROM STATE

```
cycle1.context_package_file:    "[FLOW-XX-STEP-2-CYCLE1-CONTEXT.md]"  → produces plan steps
cycle2.template_file:           "[FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md]" → produces verified NODEs
cycle3.context_package_file:    "[FLOW-XX-STEP-6-CYCLE3-CONTEXT.md]"  → produces LEAF/EXPAND verdicts
executor_handoff.handoff_file:  "[FLOW-XX-STEP-8-HANDOFF-CONTRACT.md]" → produces iron rules + contracts + checklists
visibility_contracts.per_cycle: { cycle1, cycle2, cycle3, cycle4, cycle5_meta_arbiter }
missing_skills:                 [list from state — ideally empty]
```
```

### Step 6 — Write the CHAIN VERIFICATION TABLE

This is the core of the file. Evaluate each boundary by reading the actual
Step documents. Do not fill this in from memory — read the documents first.

```markdown
---

## CHAIN VERIFICATION TABLE

Each boundary evaluated against what the upstream cycle produces vs.
what the downstream cycle requires. Verdict vocabulary per SK-441.

| Boundary  | What Cycle N produces | What Cycle N+1 needs | Verdict | Notes |
|-----------|-----------------------|----------------------|---------|-------|
| C1 → C2   | Plan steps (text, one per step) | STEP_TEXT in Cycle 2 template | [WORKS/PARTIAL/BREAKS] | [Flow-specific evaluation] |
| C2 → C3   | Verified NODE (4-field object) | NODE + depth context for Cycle 3 | [WORKS/PARTIAL/BREAKS] | [Flow-specific evaluation] |
| C3 → C4   | Leaf NODE (LEAF verdict confirmed) | Iron rules + I/O contract + arbiter checklist | [WORKS/PARTIAL/BREAKS] | [Flow-specific evaluation] |
| C4 → AF   | Executor implementation | Phase B genesis prompt input | [WORKS/PARTIAL/BREAKS] | [Flow-specific evaluation] |
| Any → V   | Cycle output | Visibility SENT field (5 cycles) | [WORKS/PARTIAL/BREAKS] | [Flow-specific evaluation] |
| Bad grade | Execution record (any cycle) | SK-525 diagnosis input | [WORKS/PARTIAL/BREAKS] | [Flow-specific evaluation] |

**All 6 chain rows: [WORKS / GAPS FOUND — see below].**
```

**How to evaluate each boundary:**

| Boundary | What to check in the Step documents |
|----------|-------------------------------------|
| C1 → C2 | Step 2 (CYCLE1-CONTEXT.md): does it produce plan step text? Does Step 4 (CYCLE2-TEMPLATE.md) accept STEP_TEXT as input? |
| C2 → C3 | Step 4 (CYCLE2-TEMPLATE.md): does it produce a 4-field NODE? Does Step 6 (CYCLE3-CONTEXT.md) receive the full NODE? |
| C3 → C4 | Step 6 (CYCLE3-CONTEXT.md): does it produce a LEAF verdict with NODE? Does Step 8 (HANDOFF-CONTRACT.md) accept the LEAF NODE for iron rule derivation? |
| C4 → AF | Step 8 (HANDOFF-CONTRACT.md): do the iron rules map to EngineContract.ironRules[]? Does the implementation plan's Session B use these? |
| Any → V | Step 9 (VISIBILITY.md): does it define SENT fields for all 5 cycles? Do cycle 1-4 SENT fields reference the correct context packages? |
| Bad grade | Step 9 (VISIBILITY.md): does Cycle 5 SENT contain all SK-525 Section 3 required fields? (trigger_cycle, bad_grade, prior_grades, context_package, model_outputs, judge_verdict, skill_ids_used, neighborhood) |

**Verdict vocabulary (SK-441):**

| Verdict | Meaning |
|---------|---------|
| WORKS | Upstream produces exactly what downstream needs |
| PARTIAL | Upstream produces most of what downstream needs — gap is minor and fixable in this step |
| BREAKS | Critical mismatch — upstream does not produce what downstream requires. Execution will fail |
| WRONG | Upstream produces something but it is incorrect — will produce wrong results silently |
| SILENT_FAILURE | Upstream produces the shape but wrong semantics — passes checks, corrupts data |

**If any row is PARTIAL, BREAKS, WRONG, or SILENT_FAILURE:** Do NOT write
`READY_FOR_EXECUTION`. Write the gap instead using this format:

```markdown
### GAP: [Boundary] — [What is missing]

**Root cause:** [Why the upstream step doesn't produce what downstream needs]
**Symptom test:** [How the failure would manifest in execution]
**Fix class:** [CONTEXT_PACKAGE_EDIT | STEP_REWRITE | NEW_STEP_REQUIRED]

**Fix:** [Exact change needed in which step document]
```

Then fix the upstream step document before writing the chain verdict.

### Step 7 — Write the MISSING SKILLS AUDIT

```markdown
---

## MISSING SKILLS AUDIT

```
State.missing_skills: [paste value from state — ideally []]

Skills required:
  SK-520 (intent-to-plan)                — [EXISTS/MISSING]
  SK-521 (depth-decision)                — [EXISTS/MISSING]
  SK-522 (AI context package authoring)  — [EXISTS/MISSING]
  SK-524 (cycle-visibility-design)       — [EXISTS/MISSING]
  SK-525 (meta-arbiter)                  — [EXISTS/MISSING]

[No step is BLOCKED_PENDING_SKILL. | These steps are blocked: ...]
```
```

**If any skill is MISSING:** Stop. Do not write READY_FOR_EXECUTION. The skill
must be created before execution begins. A blocked step with no skill available
will generate incorrect output that corrupts the teaching corpus.

### Step 8 — Write the DOCUMENTS PRODUCED AUDIT

Read the actual filesystem to verify each file exists. Do not rely on memory.

```markdown
---

## DOCUMENTS PRODUCED AUDIT

Verifying all 9 output files exist at their stated paths:

| # | File | Status |
|---|------|--------|
| 1 | FLOW-XX-STEP-1-INVARIANTS.md                 | [✅ EXISTS / ❌ MISSING] |
| 2 | FLOW-XX-STEP-2-CYCLE1-CONTEXT.md             | [✅ EXISTS / ❌ MISSING] |
| 3 | FLOW-XX-STEP-3-CYCLE1-TEST.md                | [✅ EXISTS / ❌ MISSING] |
| 4 | FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md            | [✅ EXISTS / ❌ MISSING] |
| 5 | FLOW-XX-STEP-5-CYCLE2-TEST.md                | [✅ EXISTS / ❌ MISSING] |
| 6 | FLOW-XX-STEP-6-CYCLE3-CONTEXT.md             | [✅ EXISTS / ❌ MISSING] |
| 7 | FLOW-XX-STEP-7-CYCLE3-TEST.md                | [✅ EXISTS / ❌ MISSING] |
| 8 | FLOW-XX-STEP-8-HANDOFF-CONTRACT.md           | [✅ EXISTS / ❌ MISSING] |
| 9 | FLOW-XX-STEP-9-VISIBILITY.md                 | [✅ EXISTS / ❌ MISSING] |

State reference: FLOW-XX-PLAN-STATE.json                    | [✅ EXISTS / ❌ MISSING] |

Total: 9 step documents + 1 state file. [All present. / N missing.]
```

**If any document is MISSING:** Stop. Do not write READY_FOR_EXECUTION. The missing
step must be authored before the chain review can pass.

### Step 9 — Write the STEP STATUS AUDIT

```markdown
---

## STEP STATUS AUDIT

All prior steps must be COMPLETE or BLOCKED (none IN_PROGRESS):

```
Step 1: cycle1.status — "[TEST_DEFINED]" (COMPLETE via step 3)
Step 2: cycle1.context_package_file populated → [COMPLETE/INCOMPLETE]
Step 3: cycle1.grade_threshold = [0.85] → [COMPLETE/INCOMPLETE]
Step 4: cycle2.template_file populated → [COMPLETE/INCOMPLETE]
Step 5: cycle2.status = "[TEST_DEFINED]" → [COMPLETE/INCOMPLETE]
Step 6: cycle3.context_package_file populated → [COMPLETE/INCOMPLETE]
Step 7: cycle3.status = "[TEST_DEFINED]" → [COMPLETE/INCOMPLETE]
Step 8: executor_handoff.status = "[HANDOFF_CONTRACT_READY]" → [COMPLETE/INCOMPLETE]
Step 9: visibility_contracts.status = "[CONTRACTS_DEFINED]" → [COMPLETE/INCOMPLETE]

[No step is IN_PROGRESS. | These steps are IN_PROGRESS: ...]
```
```

### Step 10 — Write the SK-524 COMPLETENESS TEST

This test verifies that the 5 fundamental questions about the flow's simulation
can be answered from the visibility records alone — without reading execution logs.

```markdown
---

## SK-524 COMPLETENESS TEST — APPLIED TO CONTRACTS

Verifying the 5 questions can be answered from the visibility records alone:

```
Q1: What did the user originally ask?
    Answer: Available in [Cycle 1 SENT.INTENT / Step 1 invariants / ...].
    Contract: [COMPLETE / INCOMPLETE — what is missing]

Q2: Which model produced the winning executor?
    Answer: Available in Cycle 4 DECIDED (de-shuffled model name required).
    Contract: [COMPLETE / INCOMPLETE]

Q3: Why was the depth decision LEAF (not EXPAND)?
    Answer: Available in Cycle 3 DECIDED (signal evaluation or termination bound).
    Contract: [COMPLETE / INCOMPLETE]

Q4: What changed in the decision graph?
    Answer: Available in all 4 cycles' CHANGED fields.
    Contract: [COMPLETE / INCOMPLETE]

Q5: If a cycle produced a bad grade, what proposals were generated?
    Answer: Available in Cycle 5 DECIDED (ranked proposals) and CHANGED (PROPOSED nodes).
    Pass condition: if no bad grade occurred — "Cycle 5 did not fire: all grades ≥ 0.85"
    Contract: [COMPLETE / INCOMPLETE]

All 5 questions: [ANSWERABLE. Completeness test: PASS. / Q[N] UNANSWERABLE: ...]
```
```

### Step 11 — Write the SILENT_FAILURE CHECK

```markdown
---

## SILENT_FAILURE CHECK (SK-441)

[State the identified SILENT_FAILURE risks from prior steps and their mitigation status.]

The chain has [one/N/no] identified SILENT_FAILURE risk(s):

```
Risk: [name of risk — e.g., "LEAF verdict with no justification"]
Chain impact: [how this would corrupt the execution or DPO triple]

Mitigation already in place:
  [Step N test: what gate catches this and prevents chain from proceeding]

Risk status: [MITIGATED / UNMITIGATED — requires fix]
```

[No new SILENT_FAILURE risks found in the chain. | New risk found: ...]
```

**Known SILENT_FAILURE patterns to check (from SK-441):**
- LEAF verdict with no justification — chain proceeds with under-expanded NODE
- Empty CHANGED field in any cycle — decision graph stalls without visible reason
- Cycle 5 SENT missing SK-525 Section 3 fields — meta-arbiter receives incomplete record
- grade_threshold missing from cycle1 state — Cycle 1 produces no pass/fail signal

### Step 12 — Write the CHAIN VERDICT

```markdown
---

## CHAIN VERDICT

```
All 6 boundaries: [WORKS (including bad-grade → SK-525 row) / GAPS_FOUND — N gaps].
All [10] documents: [present / N missing].
All skills: [present (missing_skills = []) / N missing].
No step [IN_PROGRESS / N steps in progress].
Completeness test: [PASS (5 questions, Q5 covers Meta-Arbiter) / FAIL].
SILENT_FAILURE risk: [MITIGATED / UNMITIGATED].

VERDICT: [READY_FOR_EXECUTION / GAPS_FOUND]
```
```

**The two possible verdicts:**
- `READY_FOR_EXECUTION` — all checks pass; Phase A of the implementation plan can begin
- `GAPS_FOUND` — one or more checks failed; gaps must be fixed and chain re-reviewed

### Step 13 — Write EXPECTED RESULTS and BAD RESULTS

```markdown
---

## EXPECTED RESULTS

- ✅ Every row in chain table reaches WORKS (6 rows including bad-grade row)
- ✅ Bad grade row: execution record in Cycle 5 SENT contains all SK-525 Section 3 required fields
- ✅ missing_skills is empty — no steps are BLOCKED_PENDING_SKILL
- ✅ documents_produced lists all 9 step output files — each verified present
- ✅ No step has status IN_PROGRESS
- ✅ chain_review.verdict = "READY_FOR_EXECUTION"

---

## BAD RESULTS — STOP AND FIX

[For each check that failed, record the finding and fix here:]

- ❌ [Chain row X shows BREAKS or PARTIAL] — [FOUND/NOT FOUND]: [if found: what is the gap and fix]
- ❌ [Bad grade row is BREAKS] — [FOUND/NOT FOUND]: [if found: which SK-525 field is missing]
- ❌ [missing_skills non-empty] — [FOUND/NOT FOUND]: [if found: which skills are missing]
- ❌ [documents_produced has fewer than 9 entries] — [FOUND/NOT FOUND]: [if found: which files are missing]
- ❌ [Step status IN_PROGRESS] — [FOUND/NOT FOUND]: [if found: which step is incomplete]
```

### Step 14 — Write the STATE WRITE

```markdown
---

## STATE WRITE

```
chain_review.gaps    → [[] if no gaps / [list of gaps found]]
chain_review.verdict → "[READY_FOR_EXECUTION / GAPS_FOUND]"
documents_produced   → [
    "FLOW-XX-STEP-1-INVARIANTS.md",
    "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "FLOW-XX-STEP-3-CYCLE1-TEST.md",
    "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md",
    "FLOW-XX-STEP-5-CYCLE2-TEST.md",
    "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md",
    "FLOW-XX-STEP-7-CYCLE3-TEST.md",
    "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md",
    "FLOW-XX-STEP-9-VISIBILITY.md",
    "FLOW-XX-STEP-10-CHAIN-REVIEW.md"
  ]
current_step         → 10
step_status          → "COMPLETE"
```

Apply to FLOW-XX-PLAN-STATE.json using:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.chain_review = {
  gaps: [],
  verdict: 'READY_FOR_EXECUTION'
};
s.documents_produced = [
  'FLOW-XX-STEP-1-INVARIANTS.md',
  'FLOW-XX-STEP-2-CYCLE1-CONTEXT.md',
  'FLOW-XX-STEP-3-CYCLE1-TEST.md',
  'FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md',
  'FLOW-XX-STEP-5-CYCLE2-TEST.md',
  'FLOW-XX-STEP-6-CYCLE3-CONTEXT.md',
  'FLOW-XX-STEP-7-CYCLE3-TEST.md',
  'FLOW-XX-STEP-8-HANDOFF-CONTRACT.md',
  'FLOW-XX-STEP-9-VISIBILITY.md',
  'FLOW-XX-STEP-10-CHAIN-REVIEW.md'
];
s.current_step = 10;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. verdict:', s.chain_review.verdict);
"
```
```

### Step 15 — Write ISSUE INVENTORY and closing lines

```markdown
---

## ISSUE INVENTORY

| Issue | Severity | Root cause | Fix or Escalate |
|-------|----------|-----------|----------------|
| [any issues found during review] | [INFO/MEDIUM/HIGH] | [cause] | [fix or N/A] |
| (none found) | — | — | — |

---

## STEP COMPLETE WHEN

Chain table has no BREAKS, verdict is written, all 9 documents are listed
in state, and final state is saved. ✅ **STEP 10 COMPLETE**

---

**FLOW-XX FLOW PLAN PREPARATION: ALL 10 STEPS COMPLETE**
**Chain verdict: READY_FOR_EXECUTION**
```

---

## THE PLAN-STATE.json SCHEMA

The chain review reads from and writes to `FLOW-XX-PLAN-STATE.json`. Understanding
the schema is required to correctly populate the INPUTS FROM STATE section.

```json
{
  "flowId": "FLOW-XX",
  "flow_title": "[Flow human name]",
  "task_range": "T[NNN]-T[NNN+M]",
  "domain": "[Domain description]",
  "security_sensitive": false,
  "guide_version": "v2",
  "current_step": 10,
  "step_status": "COMPLETE",

  "cycle1": {
    "status": "TEST_DEFINED",
    "context_package_file": "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "grade_threshold": 0.85
  },
  "cycle2": {
    "status": "TEST_DEFINED",
    "template_file": "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md"
  },
  "cycle3": {
    "status": "TEST_DEFINED",
    "context_package_file": "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md"
  },
  "executor_handoff": {
    "status": "HANDOFF_CONTRACT_READY",
    "handoff_file": "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md"
  },
  "visibility_contracts": {
    "status": "CONTRACTS_DEFINED",
    "per_cycle": {
      "cycle1": "DEFINED",
      "cycle2": "DEFINED",
      "cycle3": "DEFINED",
      "cycle4": "DEFINED",
      "cycle5_meta_arbiter": "DEFINED"
    }
  },
  "chain_review": {
    "gaps": [],
    "verdict": "READY_FOR_EXECUTION"
  },
  "meta_arbiter": {
    "trigger_threshold": 0.85,
    "skill": "SK-525"
  },
  "missing_skills": [],
  "documents_produced": [
    "FLOW-XX-STEP-1-INVARIANTS.md",
    "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md",
    "FLOW-XX-STEP-3-CYCLE1-TEST.md",
    "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md",
    "FLOW-XX-STEP-5-CYCLE2-TEST.md",
    "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md",
    "FLOW-XX-STEP-7-CYCLE3-TEST.md",
    "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md",
    "FLOW-XX-STEP-9-VISIBILITY.md",
    "FLOW-XX-STEP-10-CHAIN-REVIEW.md"
  ],
  "prepared_at": "YYYY-MM-DD"
}
```

---

## ACCEPTANCE CRITERIA FOR STEP-10-CHAIN-REVIEW

Before the chain review is considered complete:

- [ ] PLAN-STATE.json was read before authoring (not templated from memory)
- [ ] File header declares Status: COMPLETE and skills loaded
- [ ] INPUTS FROM STATE section uses actual filenames from state (not placeholders)
- [ ] Chain verification table has all 6 boundary rows evaluated
- [ ] Each row evaluated by reading the actual Step documents (not assumed WORKS)
- [ ] Bad-grade row (Cycle 5 SK-525) explicitly evaluated
- [ ] MISSING SKILLS AUDIT checks all 5 required skills against state
- [ ] DOCUMENTS PRODUCED AUDIT verifies each of 9 files exists
- [ ] STEP STATUS AUDIT confirms all 9 prior steps are COMPLETE (not IN_PROGRESS)
- [ ] SK-524 COMPLETENESS TEST answers all 5 questions explicitly
- [ ] SILENT_FAILURE CHECK identifies risks from prior steps and their mitigation
- [ ] CHAIN VERDICT is READY_FOR_EXECUTION (or GAPS_FOUND with gaps documented)
- [ ] STATE WRITE command updates PLAN-STATE.json with verdict and documents_produced
- [ ] File closes with "ALL 10 STEPS COMPLETE" and chain verdict

---

## KEY RULES

**1. Read the Step documents before evaluating the chain.**
The chain rows cannot be filled in from memory. Read STEP-2, STEP-4, STEP-6, STEP-8,
and STEP-9 to verify what each cycle actually produces and what it receives.

**2. The bad-grade row is mandatory.**
The `Bad grade → SK-525 input` row must be evaluated in every chain review. If the
bad-grade row is skipped or marked "N/A", the meta-arbiter system has no verified
input contract and the ML improvement loop is broken silently.

**3. WORKS is the only acceptable final state for all 6 rows.**
PARTIAL is acceptable only as a temporary note during authoring — it must be resolved
before writing the CHAIN VERDICT. If any row cannot reach WORKS, the chain review
writes GAPS_FOUND and fixes the upstream document first.

**4. The state write must be applied, not just documented.**
The node script in STATE WRITE must actually run. The PLAN-STATE.json must be updated
with `chain_review.verdict = "READY_FOR_EXECUTION"` before the implementation plan
is allowed to reference the chain review as complete.

**5. FLOW-01 format vs compressed format.**
FLOW-01 uses the full verbose format because the chain was being established for the
first time. For subsequent flows, the compressed format (FLOW-09 style) is acceptable
if all checks pass cleanly. Use the full format any time a gap or issue is found —
the full format provides the investigation trail that explains what went wrong.

---

## RELATIONSHIP TO THE IMPLEMENTATION PLAN

The implementation plan (GUIDE-B17) checks in its Preamble section:

```markdown
Prerequisites verified:
  ✅ FLOW-XX-PLAN-STATE.json: chain_review.verdict = "READY_FOR_EXECUTION"
```

If this check fails, Phase A of the implementation plan must not begin. The chain
review is the gate between "the simulation pipeline is designed" and "Claude Code
is authorized to start building services."

---

*End of GUIDE-B20 — FLOW-XX-STEP-10-CHAIN-REVIEW.md*
*List A sources: ZIP-11 (FLOW-01/02/09 STEP-10-CHAIN-REVIEW examples, FLOW-09-PLAN-STATE.json),*
*ZIP-01 (AUTHORING-GUIDE v1.15 — SK-441 simulation-protocol, SK-448 output-contract)*
*Target B-type: B-20 — FLOW-XX-STEP-10-CHAIN-REVIEW.md*
*Round: 30 of 72*
