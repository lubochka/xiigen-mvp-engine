# GUIDE-B45 — How to Produce `FLOW-XX-STEP-9-VISIBILITY.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 55 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-9-VISIBILITY.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-9-VISIBILITY guidance: one of the 50 guidance files that
constitute the library. When Claude Code applies this guidance, it will produce a
correct FLOW-XX-STEP-9-VISIBILITY.md that defines the complete visibility contracts
for all five simulation cycles, ensuring every AI round has a machine-readable
record of what was sent, received, decided, and changed.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-9-VISIBILITY.md` is the **Cycle Visibility Contracts** document —
Step 9 in the 10-step simulation pipeline. It defines what information is captured
when each of the five AI cycles in the design simulation completes.

**Important clarification:** Despite the name "visibility," this document is NOT
about UI/UX role visibility or screen access control. It is about **AI cycle
observability** — the machine record of what each AI cycle sent, received, decided,
and changed. The document answers: "if a cycle produced wrong output, how do you
trace which input caused it?"

**Position in the simulation pipeline:**
```
STEP-8-HANDOFF-CONTRACT.md    → defines what the executor receives
STEP-9-VISIBILITY.md          → this file — defines what each cycle records
STEP-10-CHAIN-REVIEW.md       → final verification gate
```

**Governed by:** SK-524 (planning--cycle-visibility-design-SKILL.md) + SK-525
(planning--meta-arbiter-SKILL.md) + SK-448 (planning--output-contract-SKILL.md).

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-15 | PRIMARY (§4 guard mechanisms, §5 visibility levels) | `XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md` §4 (Role Relationship Types — used when defining who can see cycle outputs) + §5 (Visibility Mechanism Levels — 4 levels: Route/Screen/Panel/Field, plus RAG-Level) |
| ZIP-15 | PRIMARY (§1 role taxonomy) | §1 role taxonomy — identifies which roles receive cycle outputs (ROLE-PLATFORM-ADMIN can see all cycle records; ROLE-1 cannot) |
| ZIP-14 | PRIMARY | `states-and-variants.md` — state machine vocabulary for cycle states (PENDING, SENT, RECEIVED, DECIDED, CHANGED) |
| ZIP-14 | REFERENCE | `ux-guidelines.csv`, SKILL.md P2+P8+P9 — UX interaction guidelines for how visibility records are displayed |
| ZIP-17 | PRIMARY | `FLOW-09/FLOW-09-STEP-9-VISIBILITY.md` — compact production example: 5 cycles in SENT/RECEIVED/DECIDED/CHANGED format, COMPLETENESS TEST (Q1-Q5), STATE WRITE |
| ZIP-17 | PRIMARY | `FLOW-01/FLOW-01-STEP-9-VISIBILITY.md` (27KB, richest) — extended example with WHY VISIBILITY IS MACHINE REQUIRED (3 reasons), SKILLS LOADED, INPUTS FROM STATE, detailed per-field specifications |
| ZIP-17 | REFERENCE | `docs/ux-review/UX-REVIEW-ROLLUP.md` — **FP-4 evidence**: human-interaction-gate and meta-flow-engine flows showed DNA-engine principle cards instead of intended UI to tenant users (17 of 23 PNGs affected). This establishes why INTERNAL_ONLY guard declarations are mandatory in visibility contracts |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-9-VISIBILITY.md`

---

## THE FIVE CYCLES AND WHAT EACH RECORDS

Every STEP-9-VISIBILITY.md defines contracts for the same five cycles:

| Cycle | Name | What it records |
|-------|------|----------------|
| Cycle 1 | Intent to Plan | Planner AI received the intent context package; produced plan steps; reviewer graded |
| Cycle 2 | Convergence | 3 candidates generated per plan step; arbiter panel voted; winner selected |
| Cycle 3 | Depth Decision | Each NODE evaluated for LEAF vs EXPAND; termination bound applied |
| Cycle 4 | Executor | LEAF NODE → executor code generated; arbiter checklist applied; DPO triple stored |
| Cycle 5 | Meta-Arbiter | Fires only on bad grade (< trigger_threshold); generates ranked fix proposals for Luba |

---

## THE FOUR-FIELD RECORD STRUCTURE (SK-524)

Every cycle produces a visibility record with exactly four fields. This structure
is the same for all five cycles:

```
SENT:     [full context given to the AI — what it received as input]
RECEIVED: [each model's output, labelled — full text, not summarized]
DECIDED:  [winner and reasoning — not just the winner, the why]
CHANGED:  [what in RAG or the decision graph was updated as a result]
```

**Why all four fields are mandatory (SK-524 Section 1):**

1. **Testing** — without SENT, you cannot verify the AI operated within correct
   constraints. Without DECIDED reasoning, you cannot check whether the judge was
   defensible.

2. **Learning** — CHANGED is the trigger for the learning loop (SK-515). Empty
   CHANGED means no graph edge update fires, no DPO triple is stored. The cycle
   ran but the system learned nothing.

3. **Debugging** — when wrong output appears, the visibility record is the only
   way to trace which input caused it. Without it, debugging requires re-running,
   which may produce different output.

> A cycle with no visibility record is a cycle that never ran.

---

## COMPLETE DOCUMENT STRUCTURE

```markdown
# FLOW-XX — STEP 9: CYCLE VISIBILITY CONTRACTS
## Status: COMPLETE
## Skills loaded: planning--cycle-visibility-design-SKILL.md (SK-524),
##                planning--meta-arbiter-SKILL.md (SK-525),
##                planning--output-contract-SKILL.md (SK-448)

---

## [Optional: TASK section explaining what Step 9 produces]

## [Optional: SKILLS LOADED THIS STEP with ✅ per skill]

## [Optional: INPUTS FROM STATE — reads from PLAN-STATE.json]

## [Optional: WHY VISIBILITY IS MACHINE REQUIRED]

---

## CYCLE 1 VISIBILITY — PLANNER

```
SENT:
  verbatim_user_intent: "[user sentence verbatim]"
  context_package_file: "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md"
  skills_loaded: [SK-520, SK-522]

RECEIVED:
  model_response: "[AI planner output — plan steps for T[NNN]-T[NNN+M]]"
  model_id: "[de-shuffled model name]"
  grade_from_reviewer: "[0.0 – 1.0]"

DECIDED:
  plan_accepted: "[true/false]"
  plan_steps: "[list of accepted plan steps]"
  grade: "[final grade >= 0.85 or rerun triggered]"

CHANGED:
  "[Cycle 1 produced N plan steps covering T[NNN]-T[NNN+M]]"
```

---

## CYCLE 2 VISIBILITY — CONVERGENCE

```
SENT:
  step_text: "[verbatim plan step from Cycle 1]"
  template_file: "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md"
  candidates_generated: 3
  shuffle_applied: true

RECEIVED:
  call_1_unranked: "[3 candidates A/B/C before arbiter sees them]"
  call_2_ranked: "[arbiter panel verdicts]"
  arbiter_count: "[4 or 7 depending on step type]"

DECIDED:
  winning_candidate: "[de-shuffled candidate letter]"
  model: "[de-shuffled model name]"
  convergence_score: "[majority vote fraction]"
  node_accepted: "[true/false]"

CHANGED:
  "[NODE verified for step: {step_text summary}]"
```

---

## CYCLE 3 VISIBILITY — DEPTH DECISION

```
SENT:
  node_under_evaluation: "[verified NODE object from Cycle 2]"
  context_package_file: "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md"
  current_depth: "[0-5]"
  termination_bound: 3

RECEIVED:
  model_response: "[LEAF or EXPAND verdict with justification]"
  signals_evaluated: "[list of 5 signals with pass/fail]"

DECIDED:
  verdict: "LEAF | EXPAND"
  justification: "[non-empty — required for any grade > 0]"
  termination_bound_applied: "[true if depth >= bound]"

CHANGED:
  "[NODE assigned LEAF verdict — enters Cycle 4]"
  "[Or: NODE expanded into N sub-flows]"
```

---

## CYCLE 4 VISIBILITY — EXECUTOR

```
SENT:
  leaf_node: "[LEAF NODE from Cycle 3]"
  handoff_contract: "FLOW-XX-STEP-8-HANDOFF-CONTRACT.md"

RECEIVED:
  generated_executor: "[executor code from AI generator]"
  arbiter_checklist_results: "[12-item checklist pass/fail]"

DECIDED:
  executor_accepted: "[true/false]"
  model: "[de-shuffled model name]"
  dpo_triple_stored: "[true/false]"

CHANGED:
  "[Executor generated for NODE: {node summary}]"
  "[DPO triple stored with score {grade}]"
```

---

## CYCLE 5 VISIBILITY — META-ARBITER (fires on bad grade only)

```
SENT (full execution record — SK-525 Section 3):
  trigger_cycle: "[1 | 2 | 3 | 4]"
  bad_grade: "[grade that triggered Meta-Arbiter]"
  prior_grades: "[list of prior grades for this node/step]"
  context_package: "[context package from triggering cycle]"
  model_outputs: "[all model outputs from triggering cycle]"
  judge_verdict: "[judge output if applicable]"
  skill_ids_used: "[skills active in triggering cycle]"
  neighborhood: "[adjacent nodes in decision graph]"

RECEIVED:
  call_1_unranked: "[unranked fix proposals from SK-525 Call 1]"
  call_2_ranked: "[ranked proposals from SK-525 Call 2 blind ranking]"

DECIDED:
  ranked_proposals: "[ranked proposals submitted to Luba for review]"
  escalation_flags: "[ESCALATE_TO_HUMAN if no proposal confidence >= 0.7]"
  meta_cycle_grade: "[grade of Meta-Arbiter decision]"

CHANGED:
  "[PROPOSED graph nodes added for each fix proposal]"
  "[Or: 'Cycle 5 did not fire — all grades >= 0.85']"
```

---

## COMPLETENESS TEST (SK-524 Section 4)

```
Q1: What did the user originally ask?          -> Cycle 1 SENT.verbatim_user_intent. PASS.
Q2: Which model produced the winning executor? -> Cycle 4 DECIDED.model. PASS.
Q3: Why was the depth decision LEAF?           -> Cycle 3 DECIDED.justification. PASS.
Q4: What changed in the decision graph?        -> All 4 cycles CHANGED fields. PASS.
Q5: If a cycle produced a bad grade, what proposals were generated?
    -> Cycle 5 DECIDED.ranked_proposals + CHANGED.PROPOSED graph nodes.
    Pass condition: if no bad grade — "Cycle 5 did not fire: all grades >= 0.85".
    PASS.

All 5 questions: ANSWERABLE. Completeness test: PASS.
```

---

## STATE WRITE

```
visibility_contracts.status   → "CONTRACTS_DEFINED"
visibility_contracts.per_cycle → { cycle1: "DEFINED", cycle2: "DEFINED", cycle3: "DEFINED", cycle4: "DEFINED", cycle5_meta_arbiter: "DEFINED" }
step_status                   → "COMPLETE"
```

---

**STEP 9 COMPLETE**
```

---

## ZIP-15 INTEGRATION: ROLE-LEVEL VISIBILITY OF CYCLE RECORDS

While STEP-9-VISIBILITY.md is primarily about AI cycle observability, the visibility
records themselves are subject to role-based access control. ZIP-15 §5 defines four
visibility mechanism levels — these apply to who can see cycle records:

### Level 1: Route-Level Visibility
The `/admin/cycles/` route is unavailable to ROLE-1 (tenant users). Cycle records
are INTERNAL to the platform — they are never surfaced in the tenant-facing UI.

### Level 3: Panel-Level Visibility
Within admin dashboards, cycle records panels are only visible to:
- ROLE-PLATFORM-ADMIN: full cycle record access (all 4 fields)
- ROLE-TENANT-ADMIN: DECIDED + CHANGED only (not SENT — contains raw AI prompts)

### FP-4 / INTERNAL_ONLY Guard Check (NEW — from UX-REVIEW-ROLLUP)

**Finding:** ZIP-17 UX-REVIEW-ROLLUP §5 shows that `human-interaction-gate` and
`meta-flow-engine` flows displayed DNA-engine principle cards (INTERNAL_ONLY content)
to tenant users. 17 of 23 PNGs were affected.

**Required check in STEP-9-VISIBILITY.md:**
For each cycle, explicitly declare whether its output can appear in tenant-visible UI:

```
CYCLE 4 INTERNAL_ONLY check:
  executor_code: INTERNAL_ONLY — generated TypeScript is never shown in tenant UI
  arbiter_checklist: INTERNAL_ONLY — pass/fail details are platform-internal
  dpo_triple: INTERNAL_ONLY — training signal, never exposed to tenant
  grade_value: TENANT_VISIBLE_AGGREGATE — overall score visible in admin UI only

CYCLE 5 INTERNAL_ONLY check:
  full execution record: INTERNAL_ONLY — contains raw AI outputs
  ranked proposals: PLATFORM_ADMIN_ONLY — submitted to Luba, not tenant
  escalation_flag: TENANT_VISIBLE_SIMPLIFIED — "review required" status only
```

**Rule:** Any cycle output that contains AI-generated code, raw model outputs,
DNA principle content, or platform-internal identifiers is INTERNAL_ONLY.
It must never appear in tenant-facing UI, regardless of the route.

This check prevents the FP-4 class of finding where engine-internal cards
are accidentally surfaced through shared template rendering.

---

## COMPLETENESS TEST (5 QUESTIONS)

The completeness test (SK-524 Section 4) verifies that all five questions can be
answered from the visibility records alone:

| Question | Answered by |
|----------|------------|
| Q1: What did the user originally ask? | Cycle 1 SENT.verbatim_user_intent |
| Q2: Which model produced the winning executor? | Cycle 4 DECIDED.model |
| Q3: Why was the depth decision LEAF? | Cycle 3 DECIDED.justification |
| Q4: What changed in the decision graph? | All 4 cycles CHANGED fields |
| Q5: If a cycle produced bad grade, what proposals? | Cycle 5 DECIDED.ranked_proposals |

**Q5 special case:** If no cycle produced a bad grade, Cycle 5 CHANGED field
must contain: `"Cycle 5 did not fire — all grades >= 0.85"`. This explicit
statement confirms the Meta-Arbiter was considered, not forgotten.

---

## HOW TO PRODUCE THE FILE

### Step 1 — Read PLAN-STATE.json for cycle file references

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json'));
console.log('Cycle 1 context package:', s.cycle1?.context_package_file);
console.log('Cycle 2 template file:  ', s.cycle2?.template_file);
console.log('Cycle 3 context package:', s.cycle3?.context_package_file);
console.log('Executor handoff file:  ', s.executor_handoff?.handoff_file);
console.log('Meta arbiter threshold: ', s.meta_arbiter?.trigger_threshold || 0.85);
"
```

### Step 2 — Fill in cycle file references

Replace placeholders in each cycle's SENT block with actual file references
from PLAN-STATE.json. The file names are the only flow-specific values —
the record format itself is the same across all flows.

### Step 3 — Apply FP-4 INTERNAL_ONLY check

For each cycle, declare which outputs are INTERNAL_ONLY vs TENANT_VISIBLE.
This is mandatory per the UX-REVIEW-ROLLUP FP-4 finding.

### Step 4 — Complete the completeness test

Fill in each Q1-Q5 answer by tracing through the records. If any answer
cannot be found in the records, the cycle contract is incomplete.

### Step 5 — Write STATE.json update

```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json'));
s.visibility_contracts = {
  status: 'CONTRACTS_DEFINED',
  per_cycle: {
    cycle1: 'DEFINED', cycle2: 'DEFINED', cycle3: 'DEFINED',
    cycle4: 'DEFINED', cycle5_meta_arbiter: 'DEFINED'
  }
};
s.step_status = 'COMPLETE';
s.current_step = 9;
fs.writeFileSync('docs/sessions/FLOW-XX/FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE updated: step 9 complete');
"
```

---

## ACCEPTANCE CRITERIA

Before FLOW-XX-STEP-9-VISIBILITY.md is considered complete:

- [ ] Header shows: STEP 9, CYCLE VISIBILITY CONTRACTS, Status: COMPLETE, skills loaded
- [ ] All 5 cycles present (Cycle 1 through Cycle 5)
- [ ] Each cycle has all 4 fields: SENT, RECEIVED, DECIDED, CHANGED
- [ ] Cycle 5 CHANGED explicitly states "did not fire" OR lists proposals
- [ ] COMPLETENESS TEST present with all 5 Q/A pairs
- [ ] STATE WRITE section shows `visibility_contracts.status: "CONTRACTS_DEFINED"`
- [ ] FP-4 INTERNAL_ONLY check present for Cycles 4 and 5
- [ ] PLAN-STATE.json updated with `current_step: 9`

---

## KEY RULES

**1. STEP-9-VISIBILITY.md is about AI cycle observability, not UI role visibility.**
The file name is misleading. It documents what each AI simulation cycle records —
not which users can see which screens. For UI/UX role visibility, see GUIDE-B49
(FLOW-XX-ROLE-SCREEN-MATRIX.md) which uses ZIP-15 §1-§3 role taxonomy.

**2. All four fields are mandatory — no empty DECIDED or CHANGED fields.**
An empty DECIDED field means the record is a lie. Something was decided but not
recorded. An empty CHANGED field means the system learned nothing from the cycle.

**3. Cycle 5 must always have a CHANGED field entry.**
Even if Cycle 5 did not fire, CHANGED must state: "Cycle 5 did not fire — all
grades >= 0.85." This explicit acknowledgment confirms the Meta-Arbiter was
considered and is different from a missing entry.

**4. The INTERNAL_ONLY check prevents the FP-4 class of UX failure.**
ZIP-17's UX-REVIEW-ROLLUP shows 17 of 23 PNGs in two flows displayed engine-internal
content (DNA principle cards) to tenant users. The INTERNAL_ONLY declarations in
Step 9 are the design-time gate that prevents this at the visibility contract level.

**5. Verbatim user intent in Cycle 1 SENT is character-for-character.**
No summarizing. The verbatim intent is what SK-524 requires: the exact words the
user wrote, preserved so future debugging can verify what the AI was given.

---

*End of GUIDE-B45 — FLOW-XX-STEP-9-VISIBILITY.md*
*List A sources: ZIP-15 ALL SECTIONS (XIIGEN-ROLE-SCREEN-ARCHITECTURE-GUIDE.md —*
*§4 role relationship types, §5 visibility mechanism levels for cycle output access control),*
*ZIP-14 (states-and-variants.md — state vocabulary, ux-guidelines.csv — display guidelines),*
*ZIP-17 (FLOW-09 STEP-9-VISIBILITY.md compact example, FLOW-01 STEP-9-VISIBILITY.md extended,*
*UX-REVIEW-ROLLUP.md §5 FP-4 evidence — INTERNAL_ONLY check requirement)*
*Governed by: SK-524, SK-525, SK-448*
*Target B-type: B-45 — FLOW-XX-STEP-9-VISIBILITY.md*
*Round: 55 of 72*
