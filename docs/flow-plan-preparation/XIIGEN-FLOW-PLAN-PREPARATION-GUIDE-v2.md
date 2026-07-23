# HOW TO PREPARE FLOW PLANS — MASTER GUIDE
## Version: 2.1 | For: Claude Code execution in small context
## Date: 2026-04-01
## Changed from v2.0:
##   - Step 3: corrected skill to planning--output-contract-SKILL.md (SK-448) — was SK-499
##   - Step 4: added bad-result guards for wrong NODE field names, FLOW-01 arbiter carry,
##             and threshold < 0.85
##   - Step 5: added bad-result guards for convergence_score_threshold naming and CV1
##             fraction-vs-grade confusion, and meta-arbiter trigger wording
##   - Step 6: added bad-result guard for S3 signal referencing non-existent behaviour.steps
##   - Step 8: corrected skill to planning--convergence-round-design-SKILL.md (SK-452) — was SK-442
## Governs: all flow plan preparation sessions (FLOW-01 through FLOW-09 and beyond)
## Changed from v1.0:
##   - Fixed output paths (Claude Code paths, not /mnt/user-data/outputs/)
##   - Renamed PRIOR_PLANS → PRIOR_ART (consistent with SK-522)
##   - SK-520, SK-521, SK-522, SK-524 marked as NOW EXISTING (written in prep plan)
##   - SK-525 (Meta-Arbiter) added to state schema and Step 10 chain review
##   - QUESTION YOURSELF added to Steps 2, 4, 6 context package requirements
##   - Step 5 grade threshold check added (Meta-Arbiter trigger)
##   - Step 9 updated: 5 visibility records (Cycle 1-4 + Cycle 5 Meta-Arbiter)
##   - Step 10 chain row added for bad-grade → Meta-Arbiter
##   - Skill gap summary updated: SK-520/521/522/524 now exist; SK-525 added
##   - progress_log added to state schema

---

## HOW TO USE THIS DOCUMENT

This document has three parts:

**Part 1 — The session_state.json schema.**
Every step reads from it. Every step writes to it. Claude Code must save it
after every step before doing anything else. This is the only memory that
survives between sessions.

**Part 2 — The step document template.**
Every step in the plan preparation process produces one document using this
template. No step produces anything else until this document is complete.

**Part 3 — The 10 step specifications.**
For each step: which skills to load (by reading the file — not naming it),
what to read from state, what to write to state, what good looks like,
what bad looks like, and when the step is done.

---

## PART 1 — SESSION_STATE.JSON SCHEMA

One file per flow being planned. Named: `FLOW-XX-PLAN-STATE.json`
Saved to: `[PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-PLAN-STATE.json`
Read at the start of every step before any other action.

**PATH RULE: `/mnt/user-data/outputs/` does NOT exist in Claude Code.
Use `[PROJECT_ROOT]\docs\flow-plan-prep-temp\` for all outputs.**

```json
{
  "flow_id": "FLOW-XX",
  "flow_title": "",
  "current_step": 0,
  "step_status": "NOT_STARTED",

  "user_intent": "",

  "invariants": {
    "dna_rules": [],
    "bfa_rules": [],
    "iron_rules_from_prior_runs": [],
    "machine_constraints": []
  },

  "cycle1": {
    "status": "PENDING",
    "context_package_file": "",
    "grade_threshold": null,
    "plan_reviewer_gaps": [],
    "plan_steps": []
  },

  "cycle2": {
    "status": "PENDING",
    "template_file": "",
    "challenger_roles_by_step_type": {},
    "rag_query_template": "",
    "grade_criteria": {
      "convergence_threshold": null,
      "arbiter_pass_required": true,
      "abstraction_check": true
    }
  },

  "cycle3": {
    "status": "PENDING",
    "context_package_file": "",
    "termination_depth": null,
    "complexity_signals": [],
    "depth_history": []
  },

  "executor_handoff": {
    "status": "PENDING",
    "iron_rules_from_nodes": [],
    "input_output_contracts": [],
    "arbiter_checklists": [],
    "existing_session_files": []
  },

  "visibility_contracts": {
    "status": "PENDING",
    "per_cycle": {}
  },

  "meta_arbiter": {
    "status": "PENDING",
    "trigger_threshold": null,
    "proposals_file": "",
    "last_grade": null,
    "prior_grades": []
  },

  "chain_review": {
    "status": "PENDING",
    "gaps": [],
    "verdict": ""
  },

  "missing_skills": [],
  "issues": [],
  "documents_produced": [],
  "progress_log": []
}
```

**RULE: If `current_step` in state does not match the step you are about to
run — STOP. Read state. Resume from the correct step. Do not re-run completed steps.**

**RULE: If `missing_skills` is non-empty — STOP. Report which skills are missing
and which steps are blocked. Do not proceed past a step that requires a missing skill.**

---

## PART 2 — STEP DOCUMENT TEMPLATE

Every step produces exactly one document in this format.
The document is self-contained — executable with no references to other documents.
File name: `FLOW-XX-STEP-N-[NAME].md`
Save to: `[PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-N-[NAME].md`

```markdown
# FLOW-XX — STEP N: [STEP NAME]
## Status: IN_PROGRESS
## Skills loaded: [list each skill file read at start of this step]
## State read: [list each key read from FLOW-XX-PLAN-STATE.json]

---

## TASK
[One paragraph. What this step does. What it produces. No step list — that is
in the execution below. No references to other documents.]

---

## SKILLS LOADED THIS STEP
[For each skill: filename + one sentence confirming it is the right skill
for this step. Example:
  ✅ planning--node-convergence-SKILL.md (SK-435 v2.0.0)
     — governs NODE format and convergence input assembly for Cycle 2.]

---

## INPUTS FROM STATE
[Exact keys read from FLOW-XX-PLAN-STATE.json, with their current values
as of this step. If a required key is empty or missing: STOP. Record in ISSUE INVENTORY.]

---

## EXECUTION
[The work this step actually does. Structured as observable actions,
not instructions. What is assembled, what is queried from RAG,
what the AI receives, what it must return.]

---

## EXPECTED RESULTS
[Specific, checkable outputs. Each item is either TRUE or FALSE — no judgment.]

---

## BAD RESULTS — STOP AND FIX
[Specific failure patterns. Each one names what was found and what it means.]

---

## STATE WRITE
[Exact keys written to FLOW-XX-PLAN-STATE.json after this step.]

---

## ISSUE INVENTORY
| Issue | Severity | Root cause | Fix or Escalate |
|-------|----------|-----------|----------------|

---

## STEP COMPLETE WHEN
[Single condition. Either TRUE or FALSE. No partial completion.]
```

---

## PART 3 — THE 10 STEP SPECIFICATIONS

---

### STEP 1 — EXTRACT INVARIANTS

**Skills to load (read the files — do not name them):**
```
[PROJECT_ROOT]\.claude\skills\planning--system-intake-SKILL.md          (SK-454)
[PROJECT_ROOT]\.claude\skills\planning--freedom-machine-classification-SKILL.md (SK-451)
[PROJECT_ROOT]\.claude\skills\planning--solution-scope-gate-SKILL.md    (SK-434)
```

**Task:**
Find every constraint that must hold for this flow regardless of what any AI
decides. Three sources: DNA patterns (always apply), BFA conflict rules for
this flow's domain, and iron rules found during prior simulation or live runs.
Classify each as MACHINE (cannot change) or FREEDOM (can be configured per tenant).
Only MACHINE constraints go into the invariants list. FREEDOM items are noted
separately — they inform context packages but are not constraints.

**Read from state:**
```
flow_id
flow_title
user_intent  (must be non-empty — if empty, STOP: Step 1 cannot run)
```

**Expected results:**
```
□ invariants.dna_rules contains all 9 DNA patterns (no partial list)
□ invariants.bfa_rules contains only rules that apply to this flow's domain
  (not all BFA rules in the system)
□ invariants.machine_constraints contains only items that cannot change
  at runtime — no technology names, no provider names
□ Every item in all four invariant lists is stated as a verifiable condition,
  not as a description
□ FREEDOM items are listed separately in a freedom_notes field (not in invariants)
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-1-INVARIANTS.md
```

**Bad results — STOP and fix:**
```
❌ Technology name in invariants (e.g. "must use Redis for idempotency")
   → Replace with the mechanism: "idempotency check before any write (DNA-7)"
❌ BFA rule that applies to all flows, not this flow
   → Remove it — global rules are already in DNA patterns
❌ Invariant stated as a description ("email handling must be correct")
   → Replace with verifiable condition ("email uniqueness checked before
     user record created — CF-1")
❌ user_intent is empty
   → STOP. Ask for the user sentence before proceeding.
```

**Write to state:**
```
invariants.dna_rules           → [list of 9 DNA patterns as verifiable conditions]
invariants.bfa_rules           → [list of applicable BFA rules for this domain]
invariants.iron_rules_from_prior_runs → [list from prior simulation/live runs]
invariants.machine_constraints → [list of additional MACHINE constraints found]
current_step                   → 1
step_status                    → "COMPLETE"
```

**Step complete when:** All four invariant lists are non-empty, every item
is a verifiable condition with no technology names, and state is saved.

---

### STEP 2 — WRITE THE CYCLE 1 CONTEXT PACKAGE

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\planning--intent-to-plan-SKILL.md         (SK-520)
[PROJECT_ROOT]\.claude\skills\planning--ai-context-package-authoring-SKILL.md (SK-522)
[PROJECT_ROOT]\.claude\skills\planning--session-file-authoring-SKILL.md (SK-443)
[PROJECT_ROOT]\.claude\skills\planning--system-intake-SKILL.md          (SK-454)
```

**Task:**
Produce the context package the Planner AI receives for Cycle 1. Exactly five
fields per SK-522: INTENT, DOMAIN, CONSTRAINTS, PRIOR_ART, SUCCESS.
The document is self-contained. What goes in each field is governed by SK-520.
The SUCCESS field must include a QUESTION YOURSELF section instructing the
Planner AI to self-check its output before returning it.

**Read from state:**
```
user_intent    (INTENT field source — verbatim)
invariants     (CONSTRAINTS field source)
flow_id        (for RAG query construction)
```

**Expected results:**
```
□ Document has exactly 5 fields: INTENT, DOMAIN, CONSTRAINTS, PRIOR_ART,
  SUCCESS — no more, no fewer
  (NOTE: field was previously named PRIOR_PLANS — now PRIOR_ART per SK-522)
□ INTENT field contains user_intent verbatim — word for word, unchanged
□ DOMAIN is 2-3 sentences maximum — no technology names
□ CONSTRAINTS lists only items from invariants in state — nothing added
□ PRIOR_ART is a RAG query string, not a copied document
  (if no prior art exists for this flow type, field states: "NO_PRIOR_ART")
□ SUCCESS defines what a valid plan step looks like AND contains:
  QUESTION YOURSELF section with at least 4 self-check questions for the
  Planner AI to verify before returning its plan
□ SK-443 checks 1-7 all return 0 hits on this document
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-2-CYCLE1-CONTEXT.md
```

**Bad results — STOP and fix:**
```
❌ INTENT was reworded
   → Revert. The original sentence is the contract. Rephrasing changes scope.
❌ DOMAIN names a framework, database, or library
   → Remove the name. Describe what the system does for users only.
❌ CONSTRAINTS contains something not in state.invariants
   → Remove it or run Step 1 again to capture it properly.
❌ PRIOR_ART contains a copied plan
   → Replace with the RAG query that retrieves it. AI retrieves at runtime.
❌ SUCCESS_FORMAT contains an example with a technology name
   → Remove the name. The format describes shape, not content.
❌ QUESTION YOURSELF section missing from SUCCESS field
   → Required. Planner AI must self-check before returning. Add it per SK-520 Section 6.
❌ Any SK-443 check returns hits
   → Crystallize the gap before continuing (SK-443 Step 2 protocol).
```

**Write to state:**
```
cycle1.context_package_file  → "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md"
cycle1.status                → "CONTEXT_PACKAGE_READY"
current_step                 → 2
step_status                  → "COMPLETE"
```

**Step complete when:** Document passes all SK-443 checks, SUCCESS field includes
QUESTION YOURSELF, and state is saved.

---

### STEP 3 — WRITE THE CYCLE 1 TEST

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\planning--simulation-protocol-SKILL.md         (SK-441)
[PROJECT_ROOT]\.claude\skills\planning--output-contract-SKILL.md             (SK-448)
```

**Task:**
Define how you verify that the Planner AI produced a valid plan. Four checks:
coverage (every intent clause maps to at least one step), abstraction (no step
names a technology), single responsibility (no step combines two actions),
dependency completeness (all declared dependencies exist and are correct).
State the grade formula and threshold explicitly.
Also define the Meta-Arbiter trigger threshold — the grade below which SK-525
fires after execution.

**Read from state:**
```
user_intent              (source of coverage check — parse intent clauses from here)
cycle1.context_package_file  (to verify SUCCESS field is testable)
invariants               (to verify constraints are not leaking into plan steps)
```

**Expected results:**
```
□ Coverage check lists every distinct intent clause from user_intent
  (parse them before writing the test — list them explicitly)
□ Each clause has a named check: "does at least one step cover this clause?"
□ Abstraction check defines what "technology name" means for this flow
  (list the specific names that must NOT appear — domain-specific, not generic)
□ Single responsibility check defines signal words ("and", "then", "also")
  and the split rule
□ Dependency completeness check verifies declared dependencies are valid
□ Size range is stated: minimum N steps, maximum M steps
  (derived from flow complexity — state the reasoning)
□ Grade formula is stated per SK-520 Section 5
□ Threshold is stated: below [X] the plan fails and Cycle 1 reruns
□ Meta-Arbiter trigger threshold stated: grade at which SK-525 fires
  (typically same as grade threshold — set in state.meta_arbiter.trigger_threshold)
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-3-CYCLE1-TEST.md
```

**Bad results — STOP and fix:**
```
❌ Coverage check is generic ("does the plan cover the user's request?")
   → Parse user_intent into individual clauses. Name each one. Check each one.
❌ Technology list is empty
   → Every flow has forbidden technology names. List them from domain context.
❌ Grade threshold is missing
   → State a number. No threshold means the test cannot reject a bad plan.
❌ Meta-Arbiter trigger threshold not stated
   → Required. Add to test and write to state.meta_arbiter.trigger_threshold.
❌ Size range was not derived — just stated as "3-12"
   → Reason about this flow's complexity. Use SK-520 Section 2 size formula.
```

**Write to state:**
```
cycle1.grade_threshold              → [number: e.g. 0.85]
cycle1.status                       → "TEST_DEFINED"
meta_arbiter.trigger_threshold      → [number: typically same as grade_threshold]
current_step                        → 3
step_status                         → "COMPLETE"
```

**Step complete when:** Every coverage clause is named, grade formula is stated
with threshold, Meta-Arbiter trigger threshold written to state, and state is saved.

---

### STEP 4 — WRITE THE CYCLE 2 CONTEXT TEMPLATE

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\code-execution--node-convergence-SKILL.md     (SK-435)
[PROJECT_ROOT]\.claude\skills\planning--convergence-round-design-SKILL.md   (SK-452)
[PROJECT_ROOT]\.claude\skills\planning--arbiter-panel-design-SKILL.md       (SK-442)
[PROJECT_ROOT]\.claude\skills\planning--ai-context-package-authoring-SKILL.md (SK-522)
```

**Task:**
Write the template that applies to every plan step when it enters Cycle 2.
This template runs once per plan step — INTENT is parameterised (receives
one step text at runtime). It defines what the convergence receives and what
a valid NODE output looks like. The SUCCESS field must include a QUESTION
YOURSELF section for the Node Generator AI.

**Read from state:**
```
invariants               (constraint layer — present in every NODE)
cycle1.plan_steps        (may be empty — derive step types from flow_title + user_intent)
flow_id                  (for RAG query context)
```

**Expected results:**
```
□ Template has these 6 fields: STEP_TEXT, UPSTREAM_CONTEXT, CHALLENGER_ROLES,
  RAG_QUERY, NODE_OUTPUT_FORMAT, JUDGE_CRITERIA
  (Note: this template extends SK-522. Mapping:
   STEP_TEXT = INTENT parameterised; UPSTREAM_CONTEXT + CHALLENGER_ROLES =
   DOMAIN + CONSTRAINTS elaborated for convergence; RAG_QUERY = PRIOR_ART;
   NODE_OUTPUT_FORMAT + JUDGE_CRITERIA = SUCCESS split for convergence)
□ STEP_TEXT is defined as: verbatim plan step from Cycle 1 — no rephrasing
□ UPSTREAM_CONTEXT rule is stated: only what THIS step's constraints depend
  on from prior steps — not everything prior steps produced
□ CHALLENGER_ROLES is a decision rule, not a fixed list:
  "if step involves [X] → add [Y] challenger" — stated for each condition
□ RAG_QUERY is a parameterised query including flow domain + step type
□ NODE_OUTPUT_FORMAT defines all 4 fields (structure, intent, constraints,
  quality) with "non-empty means..." for each
□ JUDGE_CRITERIA checks NODE representation quality — not executor implementation
□ NODE_OUTPUT_FORMAT SUCCESS section includes QUESTION YOURSELF:
  Node Generator AI must self-check before returning its NODE candidate
□ SK-443 checks 1-7 return 0 hits on this document
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md
```

**Bad results — STOP and fix:**
```
❌ CHALLENGER_ROLES is a fixed list (e.g. "domain, security, principles always")
   → Replace with a decision rule per step type. Fixed list ignores step content.
❌ RAG_QUERY retrieves all prior NODEs with no filter
   → Add flow domain filter. Irrelevant prior NODEs bias the judge.
❌ NODE_OUTPUT_FORMAT quality field says "describe risks"
   → Too vague. State: "names at least one failure mode specific to this step
     type — not a generic risk statement"
❌ JUDGE_CRITERIA checks implementation quality
   → Judge checks representation quality only. Implementation is Cycle 4.
❌ QUESTION YOURSELF section missing from NODE_OUTPUT_FORMAT
   → Required. Node Generator AI must self-check before returning. Add it.
❌ UPSTREAM_CONTEXT includes everything prior steps produce
   → Reduce to only what THIS step's constraints require.
❌ NODE uses 'behaviour' field instead of 'constraints'
   → Canonical NODE has exactly 4 fields: structure, intent, constraints, quality.
     'behaviour' does not exist. Replace with:
     NODE = { structure: { inputShape, outputShape }, intent: { purpose, scope, outcome },
              constraints: { ironRules[], dnaRules[] }, quality: { testCriteria[], successGrade } }
❌ Arbiter table uses FLOW-01 step types (REGISTRATION / VERIFICATION / ONBOARDING)
   → Table must be derived from this flow's domain. Replace with step types specific
     to the current flow's task range and focus areas.
❌ SUCCESS node_accepted_when threshold is < 0.85
   → Cycle 2 grade threshold must be >= 0.85 (same gate as Cycle 1). State:
     "grade >= 0.85 from arbiter panel" — not a majority vote fraction.
```

**Write to state:**
```
cycle2.template_file                 → "FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md"
cycle2.challenger_roles_by_step_type → {derived decision rules}
cycle2.rag_query_template            → {parameterised query string}
cycle2.status                        → "TEMPLATE_READY"
current_step                         → 4
step_status                          → "COMPLETE"
```

**Step complete when:** Document passes SK-443 checks, challenger roles are
decision rules, QUESTION YOURSELF present in NODE_OUTPUT_FORMAT, state saved.

---

### STEP 5 — WRITE THE CYCLE 2 TEST

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\code-execution--node-convergence-SKILL.md     (SK-435)
[PROJECT_ROOT]\.claude\skills\planning--simulation-protocol-SKILL.md        (SK-441)
```

**Task:**
Define how you verify that the three model outputs converged on a valid NODE
and the judge made a defensible choice. Four checks: convergence, arbiter pass,
abstraction, quality specificity. State the grade formula, threshold, and the
Meta-Arbiter trigger condition for Cycle 2 failures.

**Read from state:**
```
cycle2.template_file                  (to align test with what the template produces)
cycle2.challenger_roles_by_step_type  (to verify arbiter check covers right arbiters)
invariants                            (to verify NODE constraints include all invariants)
meta_arbiter.trigger_threshold        (to align Cycle 2 Meta-Arbiter trigger)
```

**Expected results:**
```
□ Convergence check defines "consistent" as an observable property:
  "intent clauses match across all three candidates" — not "they agree"
□ Convergence check names what a divergence looks like:
  "two candidates say X, one says Y — the one is challenged, not averaged"
□ Arbiter check lists which arbiters apply per step type and what PASS means
□ Abstraction check defines specific terms that must not appear
  (same list as Step 3 — consistent across cycles)
□ Quality specificity check: "quality field references something in the NODE's
  own structure or constraints, not a generic risk"
□ Grade formula: convergence_score × arbiter_pass_fraction × abstraction_clean
□ Threshold stated: below [X] the NODE is rejected and Cycle 2 reruns
□ Meta-Arbiter trigger condition stated: if grade < meta_arbiter.trigger_threshold,
  SK-525 fires after this cycle's execution record is written
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-5-CYCLE2-TEST.md
```

**Bad results — STOP and fix:**
```
❌ Convergence check says "models agree"
   → Not observable. State what specific fields must match across candidates.
❌ Arbiter check is "all arbiters pass"
   → Which arbiters? The set varies by step type. Name the check per type.
❌ Quality check is missing
   → The quality field is the most commonly empty. It must be checked explicitly.
❌ Meta-Arbiter trigger condition missing
   → Required. State when SK-525 fires for Cycle 2 bad grades.
❌ Grade threshold is lower than Cycle 1 threshold
   → NODE quality gate should be at least as strict as plan quality gate.
❌ Field named 'convergence_score_threshold' instead of 'grade_threshold'
   → Use 'grade_threshold: 0.85'. The convergence_score is an input to the grade
     formula — the threshold applies to the grade, not the raw convergence score.
❌ CV1 pass condition stated as ">=50% arbiter votes" (a count fraction, not a grade)
   → State: "grade >= 0.85". The grade is the scalar output of the formula, not
     the raw vote count.
❌ Meta-Arbiter trigger condition uses convergence_score instead of grade
   → State: "if grade < 0.85 after max_reruns: trigger SK-525 Meta-Arbiter"
```

**Write to state:**
```
cycle2.grade_criteria.convergence_threshold → [number]
cycle2.grade_criteria.arbiter_pass_required → true
cycle2.grade_criteria.abstraction_check     → true
cycle2.status                               → "TEST_DEFINED"
current_step                                → 5
step_status                                 → "COMPLETE"
```

**Step complete when:** All four checks defined, grade formula and threshold stated,
Meta-Arbiter trigger stated, and state is saved.

---

### STEP 6 — WRITE THE CYCLE 3 CONTEXT PACKAGE

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\planning--depth-decision-SKILL.md          (SK-521)
[PROJECT_ROOT]\.claude\skills\code-execution--node-convergence-SKILL.md  (SK-435)
```

**Task:**
Write what the Depth Decider AI receives when a verified NODE arrives for
depth classification. The package includes the NODE, depth history from RAG,
current depth level, and the complexity signals. Also states the hard
termination bound. The SUCCESS field must include a QUESTION YOURSELF section
for the Depth Decider AI.

**Read from state:**
```
cycle2.template_file         (to know what the NODE contains)
invariants.machine_constraints  (termination depth is a machine constraint)
flow_id                      (for RAG depth history query)
```

**Expected results:**
```
□ Package contains 5 SK-522 fields: INTENT (verified NODE), DOMAIN (depth + flow),
  CONSTRAINTS (termination bound + non-overlap rule), PRIOR_ART (depth history query),
  SUCCESS (LEAF/EXPAND verdict format)
□ INTENT is the full verified NODE object — not the user sentence
□ DEPTH_HISTORY_QUERY is parameterised: domain + archetype + depth level
□ COMPLEXITY_SIGNALS are derived from NODE fields — each references a specific
  NODE property (not a generic rule)
□ TERMINATION_BOUND is a number — stated as a MACHINE constraint
□ EXPAND format requires sub-flow decomposition as part of the verdict
□ SUCCESS field includes QUESTION YOURSELF for the Depth Decider AI:
  must verify justification cites a signal or termination bound before returning
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-6-CYCLE3-CONTEXT.md
```

**Bad results — STOP and fix:**
```
❌ COMPLEXITY_SIGNALS are generic ("step is too complex")
   → Replace with NODE field references per SK-521 Section 2
❌ TERMINATION_BOUND is missing
   → A missing bound means infinite recursion is possible. State the number.
❌ EXPAND format does not define sub-flow decomposition
   → EXPAND must produce a sub-flow input for Cycle 1. Define the format.
❌ QUESTION YOURSELF section missing from SUCCESS field
   → Required per audit. Depth Decider must self-check before returning.
❌ S3 signal references 'behaviour.steps' — a field that does not exist in canonical NODE
   → 'behaviour' is not a NODE field. S3 must reference a field that exists:
     "S3: Branch behaviour | quality.scoringCriteria | Contains more than 2 independent
     failure modes with divergent handling"
```

**Write to state:**
```
cycle3.context_package_file  → "FLOW-XX-STEP-6-CYCLE3-CONTEXT.md"
cycle3.termination_depth     → [number]
cycle3.complexity_signals    → [list of NODE field references]
cycle3.status                → "CONTEXT_PACKAGE_READY"
current_step                 → 6
step_status                  → "COMPLETE"
```

**Step complete when:** Termination bound is a number, complexity signals reference
NODE fields, QUESTION YOURSELF present, and state is saved.

---

### STEP 7 — WRITE THE CYCLE 3 TEST

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\planning--depth-decision-SKILL.md          (SK-521)
[PROJECT_ROOT]\.claude\skills\planning--simulation-protocol-SKILL.md     (SK-441)
```

**Task:**
Define how you verify the depth decision was correct. Three checks: justification
(did the AI reference something specific in the NODE?), consistency (does the
same NODE produce the same decision on re-run?), termination bound enforcement
(at termination_depth the verdict is always LEAF).

**Read from state:**
```
cycle3.context_package_file   (to align test with what the package produces)
cycle3.complexity_signals     (to verify justification check covers right signals)
cycle3.termination_depth      (to verify depth bound enforcement is tested)
meta_arbiter.trigger_threshold (to state when SK-525 fires for Cycle 3 failures)
```

**Expected results:**
```
□ Justification check: AI output contains at least one signal reference
  (LEAF: signal checked + not triggered OR depth = termination bound stated)
  (EXPAND: signal cited with NODE field evidence + sub-flow decomposition present)
□ Consistency check: LEAF/EXPAND verdict identical across two runs with
  different random seeds
  (define acceptable variance: "LEAF in run 1 + EXPAND in run 2 = FAIL")
□ Depth bound test: at termination_depth, verdict is always LEAF
  regardless of NODE content — tested explicitly, not implied
□ Sub-flow coherence check (EXPAND only): no two sub-nodes cover the same
  user-facing action — overlap test defined
□ Grade formula: justification_present (1/0) × consistency_score (0-1)
□ Meta-Arbiter trigger condition stated for Cycle 3 failures
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-7-CYCLE3-TEST.md
```

**Bad results — STOP and fix:**
```
❌ Consistency check not defined
   → State run conditions and comparison rule. An untestable check is not a check.
❌ Depth bound enforcement not tested
   → Machine constraint. Its enforcement must be tested explicitly.
❌ Sub-flow coherence not defined for EXPAND case
   → A sub-flow with overlapping responsibilities will loop. Test for it.
❌ Meta-Arbiter trigger condition missing
   → Required. State when SK-525 fires for Cycle 3 failures.
```

**Write to state:**
```
cycle3.status          → "TEST_DEFINED"
current_step           → 7
step_status            → "COMPLETE"
```

**Step complete when:** All three checks defined with observable criteria, depth
bound test present, Meta-Arbiter trigger stated, and state is saved.

---

### STEP 8 — WRITE THE EXECUTOR HANDOFF CONTRACT

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\code-execution--node-convergence-SKILL.md           (SK-435)
[PROJECT_ROOT]\.claude\skills\planning--convergence-round-design-SKILL.md         (SK-452)
[PROJECT_ROOT]\.claude\skills\code-execution--flow-implementation-guide-SKILL.md
```

**Task:**
Define the contract between Cycle 3 (a leaf NODE) and Cycle 4 (executor
generation via the existing AF pipeline). Three mappings: NODE constraints
→ iron rules for genesis prompt, NODE structure → input/output contract,
NODE quality criteria → arbiter checklist. The handoff contract also states
the Meta-Arbiter trigger for Cycle 4 bad grades.

**Read from state:**
```
invariants                   (iron rules must include all invariants)
cycle2.grade_criteria        (executor quality threshold ≥ NODE quality threshold)
executor_handoff.existing_session_files  (Phase B-F files — NOT rewritten)
meta_arbiter.trigger_threshold           (Cycle 4 trigger condition)
```

**Expected results:**
```
□ Iron rules mapping: for each NODE constraint type, the corresponding
  iron rule format for the genesis prompt is defined
□ Input/output contract mapping: NODE structure.inputShape →
  executor's expected inputs; NODE structure.outputShape →
  executor's expected outputs
□ Arbiter mapping: each quality criterion from NODE quality field maps
  to a named arbiter check in the existing Phase E arbiter panel
□ Mapping is complete: every NODE field that affects quality has a
  corresponding check in the existing session files
□ Meta-Arbiter trigger condition stated: if Cycle 4 grade < trigger_threshold,
  SK-525 fires with the Cycle 4 execution record
□ No new session files created — only this handoff contract document
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-8-HANDOFF-CONTRACT.md
```

**Bad results — STOP and fix:**
```
❌ Mapping creates new gates in existing Phase B-F files
   → Do not modify existing files. The handoff contract defines what
     the existing gates receive — not new gates.
❌ Iron rules derived from NODEs duplicate existing DNA rules
   → DNA rules are already enforced. NODE iron rules are domain-specific only.
❌ Arbiter mapping has items with no corresponding Phase E check
   → Either Phase E panel needs a new arbiter (record as issue), or the
     NODE quality criterion is too vague (fix the template).
❌ Meta-Arbiter trigger condition missing
   → Required. Cycle 4 is the most expensive cycle. Bad grade must trigger
     SK-525 to prevent repeated expensive failures.
```

**Write to state:**
```
executor_handoff.iron_rules_from_nodes    → [mapping format]
executor_handoff.input_output_contracts   → [mapping format]
executor_handoff.arbiter_checklists       → [mapping to Phase E]
executor_handoff.status                   → "HANDOFF_CONTRACT_READY"
current_step                              → 8
step_status                               → "COMPLETE"
```

**Step complete when:** All three mappings complete, Meta-Arbiter trigger stated,
no new session files created, and state is saved.

---

### STEP 9 — WRITE THE VISIBILITY CONTRACTS

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\planning--cycle-visibility-design-SKILL.md (SK-524)
[PROJECT_ROOT]\.claude\skills\planning--meta-arbiter-SKILL.md            (SK-525)
[PROJECT_ROOT]\.claude\skills\planning--output-contract-SKILL.md         (SK-448)
```

**Task:**
For each of the 5 cycles (Cycles 1-4 + Cycle 5 Meta-Arbiter), define the
visibility record that is emitted when that cycle completes. Four fields per
record: SENT, RECEIVED, DECIDED, CHANGED. The Cycle 5 record covers what
the Meta-Arbiter receives, what proposals it produces, and what changes in
the graph when a proposal is submitted to Luba.

**Read from state:**
```
cycle1.context_package_file       (SENT in Cycle 1 record)
cycle2.template_file              (SENT in Cycle 2 record)
cycle3.context_package_file       (SENT in Cycle 3 record)
executor_handoff.handoff_file     (SENT in Cycle 4 record)
meta_arbiter.trigger_threshold    (Cycle 5 fires below this grade)
```

**Expected results:**
```
□ One visibility record definition per cycle (5 total — Cycles 1-4 + Cycle 5)
□ Each record defines SENT, RECEIVED, DECIDED, CHANGED
□ SENT field for each cycle references the correct context package
□ RECEIVED defines how many model outputs are expected and their labels
□ DECIDED requires reasoning — "winner = A" alone fails for all cycles
□ CHANGED defines at minimum: which RAG index was updated and what key
  ("Nothing changed" valid ONLY when explicitly stated with reasoning)
□ Cycle 5 SENT: full execution record (all 4 prior records + grade + neighborhood)
□ Cycle 5 RECEIVED: Call 1 proposals (unranked) + Call 2 ranked proposals
□ Cycle 5 DECIDED: ranked proposals submitted to Luba + escalation flags
□ Cycle 5 CHANGED: proposal nodes added to graph with status=PROPOSED
□ Completeness test defined per SK-524 Section 4 (4 questions answerable
  from records alone — now covers 5 cycles)
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-9-VISIBILITY.md
```

**Bad results — STOP and fix:**
```
❌ Only 4 visibility records (Cycle 5 missing)
   → Cycle 5 (Meta-Arbiter) is required. A bad grade with no visibility record
     cannot be diagnosed. Add Cycle 5 specification.
❌ DECIDED field allows "winner = A" without reasoning
   → Require: winner + reference to at least one criterion from context package.
❌ CHANGED is empty or optional
   → Required. "Nothing changed" must be stated explicitly with reasoning.
❌ Cycle 5 CHANGED does not reference graph proposal nodes
   → SK-525 proposals are stored as PROPOSED nodes in the graph. State this.
```

**Write to state:**
```
visibility_contracts.per_cycle   → {cycle1: {...}, cycle2: {...},
                                     cycle3: {...}, cycle4: {...},
                                     cycle5_meta_arbiter: {...}}
visibility_contracts.status      → "CONTRACTS_DEFINED"
current_step                     → 9
step_status                      → "COMPLETE"
```

**Step complete when:** Five visibility record definitions present, every
DECIDED field requires reasoning, Cycle 5 Meta-Arbiter record included, state saved.

---

### STEP 10 — REVIEW THE CHAIN

**Skills to load:**
```
[PROJECT_ROOT]\.claude\skills\planning--simulation-protocol-SKILL.md    (SK-441)
[PROJECT_ROOT]\.claude\skills\planning--output-contract-SKILL.md        (SK-448)
```

**Task:**
Walk the full chain once. For each boundary between cycles, verify that
everything Cycle N+1 needs as input is produced by Cycle N. Includes the
Meta-Arbiter boundary: when a cycle produces a bad grade, does the execution
record contain everything SK-525 needs to diagnose and propose?

**Read from state:**
```
cycle1.context_package_file     (produces: plan steps)
cycle2.template_file            (receives: plan step; produces: verified NODE)
cycle3.context_package_file     (receives: verified NODE; produces: LEAF/EXPAND)
executor_handoff                (receives: leaf NODE; produces: executors)
visibility_contracts.per_cycle  (spans all 5 cycles)
meta_arbiter.trigger_threshold  (grade that triggers Cycle 5)
missing_skills                  (if non-empty: note which steps are blocked)
```

**Chain step table (complete this table — every row must reach WORKS):**
```
| Boundary    | What Cycle N produces        | What Cycle N+1 needs           | Gap? |
|-------------|------------------------------|-------------------------------|------|
| C1 → C2     | plan step (text)             | STEP_TEXT in template         | ?    |
| C2 → C3     | verified NODE                | NODE + depth context          | ?    |
| C3 → C4     | leaf NODE                    | iron rules + contract         | ?    |
| C4 → AF     | executor                     | Phase B input                 | ?    |
| Any → V     | cycle output                 | visibility SENT field         | ?    |
| Bad grade   | execution record (all cycles)| SK-525 diagnosis input        | ?    |
```

**Expected results:**
```
□ Every row in the chain table reaches WORKS
□ Bad grade row: execution record contains all fields from SK-525 Section 3
□ Every missing_skills entry has a named step blocked by it
□ documents_produced in state lists all 9 output files — verify each exists
□ No step in steps 1-9 has status IN_PROGRESS — all COMPLETE or blocked
□ chain_review.verdict is "READY_FOR_EXECUTION" or lists named gaps
□ File saved to [PROJECT_ROOT]\docs\flow-plan-prep-temp\FLOW-XX-STEP-10-CHAIN-REVIEW.md
□ Final FLOW-XX-PLAN-STATE.json saved with chain_review.verdict populated
```

**Bad results — STOP and fix:**
```
❌ Any chain row shows BREAKS or PARTIAL
   → Fix the producing cycle's context package. Re-run that step.
❌ Bad grade row is BREAKS (execution record missing SK-525 required fields)
   → Update the visibility contracts (Step 9) to include all SK-525 Section 3 fields.
❌ missing_skills is non-empty and no steps are marked blocked
   → Mark every step that requires a missing skill as BLOCKED_PENDING_SKILL.
❌ documents_produced has fewer than 9 entries
   → A step was completed without saving its output file. Identify and recover.
❌ Any step status is IN_PROGRESS
   → Resume and complete before chain review.
```

**Write to state:**
```
chain_review.gaps      → [list of gaps found, empty if none]
chain_review.verdict   → "READY_FOR_EXECUTION" | "BLOCKED: [named gaps]"
documents_produced     → [list of all 9 output files with paths]
current_step           → 10
step_status            → "COMPLETE"
```

**Step complete when:** Chain table has no BREAKS including the bad-grade row,
verdict is written, all 9 documents listed in state, and final state is saved.

---

## SKILL STATUS SUMMARY

Skills required by steps in this guide and their current status.

| Skill | Required by | Status | What it governs |
|-------|------------|--------|----------------|
| SK-520 intent-to-plan | Steps 2, 3, 4 | ✅ EXISTS | Cycle 1 context package assembly + Plan Reviewer |
| SK-521 depth-decision | Steps 6, 7 | ✅ EXISTS | Complexity signals, LEAF/EXPAND decision, termination |
| SK-522 AI context package authoring | Steps 2, 4, 6 | ✅ EXISTS | 5-field format, QUESTION YOURSELF, verification |
| SK-524 cycle-visibility-design | Step 9 | ✅ EXISTS | Visibility record structure for all 5 cycles |
| SK-525 meta-arbiter | Steps 3, 5, 7, 8, 9, 10 | ✅ EXISTS | Bad grade diagnosis, proposal generation, blind ranking |
| SK-523 configuration-selection | (Cycle 4 runtime — not in this guide) | ⚠️ MISSING | How model/prompt selection improves over time |

**If any ✅ skill file is not found at its expected path:**
1. Check `[PROJECT_ROOT]\.claude\skills\` — the file may not have been copied there
2. Check `[PROJECT_ROOT]\docs\flow-plan-prep-temp\` — it may be in the working directory
3. If not found in either location: add to `state.missing_skills` and STOP

**When a step hits a missing skill (SK-523 or any other):**
1. Add the skill name to `state.missing_skills`
2. Set `step_status` = "BLOCKED_PENDING_SKILL"
3. Save state
4. Report: "Step N is blocked. Required skill SK-XXX does not exist."
5. Do not approximate with training knowledge.

---

## DOCUMENT CHECKLIST (all 10 steps complete)

```
□ FLOW-XX-PLAN-STATE.json                     (updated after every step)
□ FLOW-XX-STEP-1-INVARIANTS.md                (Step 1)
□ FLOW-XX-STEP-2-CYCLE1-CONTEXT.md            (Step 2)  ← includes QUESTION YOURSELF
□ FLOW-XX-STEP-3-CYCLE1-TEST.md               (Step 3)  ← includes Meta-Arbiter trigger
□ FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md           (Step 4)  ← includes QUESTION YOURSELF
□ FLOW-XX-STEP-5-CYCLE2-TEST.md               (Step 5)  ← includes Meta-Arbiter trigger
□ FLOW-XX-STEP-6-CYCLE3-CONTEXT.md            (Step 6)  ← includes QUESTION YOURSELF
□ FLOW-XX-STEP-7-CYCLE3-TEST.md               (Step 7)  ← includes Meta-Arbiter trigger
□ FLOW-XX-STEP-8-HANDOFF-CONTRACT.md          (Step 8)  ← includes Meta-Arbiter trigger
□ FLOW-XX-STEP-9-VISIBILITY.md                (Step 9)  ← 5 cycles including Cycle 5
□ FLOW-XX-STEP-10-CHAIN-REVIEW.md             (Step 10) ← includes bad-grade chain row
```
