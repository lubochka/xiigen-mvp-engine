# HOW TO PREPARE FLOW PLANS — MASTER GUIDE
## For: Claude Code execution in small context
## Date: 2026-04-01
## Governs: all flow plan preparation sessions (FLOW-01 through FLOW-09 and beyond)

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
Saved to: `/mnt/user-data/outputs/FLOW-XX-PLAN-STATE.json` after every step.
Read at the start of every step before any other action.

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
    "complexity_signals": []
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

  "chain_review": {
    "status": "PENDING",
    "gaps": [],
    "verdict": ""
  },

  "missing_skills": [],

  "issues": [],

  "documents_produced": []
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
as of this step. Example:
  user_intent: "I need a user registration flow for a NestJS application"
  invariants.dna_rules: [list]
If a required key is empty or missing: STOP. Record in ISSUE INVENTORY.]

---

## EXECUTION
[The work this step actually does. Structured as observable actions,
not instructions. What is assembled, what is queried from RAG,
what the AI receives, what it must return.]

---

## EXPECTED RESULTS
[Specific, checkable outputs. Each item is either TRUE or FALSE — no judgment.
Example:
  □ context_package has exactly 5 fields: INTENT, DOMAIN, CONSTRAINTS,
    PRIOR_ART, SUCCESS_FORMAT
  □ INTENT field contains the user_intent verbatim — unchanged
  □ No technology name appears in any field
  □ CONSTRAINTS references only items in invariants from state
  □ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-N-[NAME].md]

---

## BAD RESULTS — STOP AND FIX
[Specific failure patterns. Each one names what was found and what it means.
Example:
  ❌ INTENT field was reworded — means the plan will solve a different problem
     than the user asked. Fix: revert to verbatim user_intent from state.
  ❌ CONSTRAINTS contains a technology name — means Cycle 1 is pre-scoped.
     Fix: replace with the underlying invariant the technology enforces.
  ❌ More than 12 plan steps produced — means Cycle 1 is too granular.
     Fix: merge steps that share the same intent clause.]

---

## STATE WRITE
[Exact keys written to FLOW-XX-PLAN-STATE.json after this step.
Each key listed with its new value or value type.]

---

## ISSUE INVENTORY
| Issue | Severity | Root cause | Fix or Escalate |
|-------|----------|-----------|----------------|

---

## STEP COMPLETE WHEN
[Single condition. Either TRUE or FALSE. No partial completion.
Example: All EXPECTED RESULTS checked TRUE and state saved.]
```

---

## PART 3 — THE 10 STEP SPECIFICATIONS

---

### STEP 1 — EXTRACT INVARIANTS

**Skills to load (read these files before any other action):**
```
planning--system-intake-SKILL.md          (SK-454)
planning--freedom-machine-classification-SKILL.md  (SK-451)
planning--solution-scope-gate-SKILL.md    (SK-434)
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
□ FREEDOM items are listed separately in a FREEDOM_NOTES field (not in invariants)
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
invariants.dna_rules       → [list of 9 DNA patterns as verifiable conditions]
invariants.bfa_rules       → [list of applicable BFA rules for this domain]
invariants.machine_constraints → [list of additional MACHINE constraints found]
current_step               → 1
step_status                → "COMPLETE"
```

**Step complete when:** All four invariant lists are non-empty, every item
is a verifiable condition with no technology names, and state is saved.

---

### STEP 2 — WRITE THE CYCLE 1 CONTEXT PACKAGE

**Skills to load:**
```
⚠️  SK-520 (intent-to-plan) — REQUIRED. Not yet written.
    If missing: add "SK-520" to state.missing_skills and STOP.
    Record: "Step 2 blocked — SK-520 does not exist."

planning--session-file-authoring-SKILL.md  (SK-443)
  — self-containment rules apply to context packages as well as session files
planning--system-intake-SKILL.md           (SK-454)
  — domain field extraction protocol
```

**Task:**
Produce the context package the Planner AI receives for Cycle 1. Exactly five
fields. The document is self-contained — no references, no variables undefined
in the document itself. What goes in each field is governed by SK-520.

**Read from state:**
```
user_intent              (INTENT field source — verbatim)
invariants               (CONSTRAINTS field source)
flow_id                  (for RAG query construction)
```

**Expected results:**
```
□ Document has exactly 5 fields: INTENT, DOMAIN, CONSTRAINTS, PRIOR_ART,
  SUCCESS_FORMAT — no more, no fewer
□ INTENT field contains user_intent verbatim — word for word, unchanged
□ DOMAIN is 2-3 sentences maximum — no technology names
□ CONSTRAINTS lists only items from invariants in state — nothing added
□ PRIOR_ART is a RAG query string, not a copied document
  (if no prior plans exist for this flow type, field states: "NO_PRIOR_ART")
□ SUCCESS_FORMAT defines what a valid plan step looks like
  (ordered, plain language, dependency link if applicable, no technology names)
□ SK-443 checks 1-7 all return 0 hits on this document
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-2-CYCLE1-CONTEXT.md
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

**Step complete when:** Document passes all SK-443 checks and state is saved.

---

### STEP 3 — WRITE THE CYCLE 1 TEST

**Skills to load:**
```
planning--simulation-protocol-SKILL.md         (SK-441)
qa--user-journey-acceptance-testing-SKILL.md   (SK-499)
```

**Task:**
Define how you verify that the Planner AI produced a valid plan. Three checks:
coverage (every intent clause in the user sentence maps to at least one step),
abstraction (no step names a technology), size (step count is in range).
State the grade threshold explicitly — below this threshold the plan is rejected
and Cycle 1 reruns.

**Read from state:**
```
user_intent              (source of coverage check — parse intent clauses from here)
cycle1.context_package_file  (to verify SUCCESS_FORMAT is testable)
invariants               (to verify constraints are not leaking into plan steps)
```

**Expected results:**
```
□ Coverage check lists every distinct intent clause from user_intent
  (parse them before writing the test — list them explicitly)
□ Each clause has a named check: "does step N cover this clause?"
□ Abstraction check defines what "technology name" means for this flow
  (list the technology names that must NOT appear — be specific)
□ Size range is stated: minimum N steps, maximum M steps
  (derived from flow complexity — state the reasoning)
□ Grade formula is stated: (clauses covered / total clauses) × (1 if abstraction
  clean) × (1 if size in range)
□ Threshold is stated: below [X] the plan fails and Cycle 1 reruns
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-3-CYCLE1-TEST.md
```

**Bad results — STOP and fix:**
```
❌ Coverage check is generic ("does the plan cover the user's request?")
   → Parse user_intent into individual clauses. Name each one. Check each one.
❌ Technology list is empty
   → Every flow has forbidden technology names. List them from domain context.
❌ Grade threshold is missing
   → State a number. No threshold means the test cannot reject a bad plan.
❌ Size range was not derived — just stated as "3-12"
   → Reason about this flow's complexity. A 3-step minimum for a flow with
     5 distinct intent clauses is wrong.
```

**Write to state:**
```
cycle1.grade_threshold       → [number: e.g. 0.85]
cycle1.status                → "TEST_DEFINED"
current_step                 → 3
step_status                  → "COMPLETE"
```

**Step complete when:** Every coverage clause is named, grade formula is stated
with threshold, and state is saved.

---

### STEP 4 — WRITE THE CYCLE 2 CONTEXT TEMPLATE

**Skills to load:**
```
code-execution--node-convergence-SKILL.md      (SK-435)
  — NODE format + input path for plan-step-as-input (not pre-authored contract)
planning--convergence-round-design-SKILL.md    (SK-452)
  — challenger role selection by step type
planning--arbiter-panel-design-SKILL.md        (SK-442)
  — arbiter selection and isolation rules

⚠️  SK-522 (AI context package authoring) — REQUIRED. Not yet written.
    If missing: add "SK-522" to state.missing_skills.
    Proceed with SK-443 self-containment rules as substitute — note the gap.
```

**Task:**
Write the template that applies to every plan step when it enters Cycle 2.
This template runs once per step. It defines what the convergence receives
(the plan step + upstream context + challenger roles + RAG query) and what
a valid NODE output looks like. The template is flow-specific but
step-type-agnostic — it applies to any step this flow produces.

**Read from state:**
```
invariants               (constraint layer — present in every NODE)
cycle1.plan_steps        (to check: does the template cover the step types
                          that Cycle 1 produces? May be empty at this point —
                          if empty, derive from flow_title and user_intent)
flow_id                  (for RAG query context)
```

**Expected results:**
```
□ Template has these fields: STEP_TEXT, UPSTREAM_CONTEXT, CHALLENGER_ROLES,
  RAG_QUERY, NODE_OUTPUT_FORMAT, JUDGE_CRITERIA
□ STEP_TEXT is defined as: verbatim plan step from Cycle 1 — no rephrasing
□ UPSTREAM_CONTEXT rule is stated: only what upstream steps produce that
  THIS step's constraints depend on — nothing else
□ CHALLENGER_ROLES is a decision rule, not a fixed list:
  "if step involves [X] → add [Y] challenger" — stated for each condition
  that applies to this flow domain
□ RAG_QUERY template is a parameterised query:
  "find prior NODEs where domain=[this flow domain] and step_type=[step type]"
□ NODE_OUTPUT_FORMAT defines all 4 fields: structure, intent, constraints,
  quality — with "non-empty means..." for each
□ JUDGE_CRITERIA states what the judge checks in the NODE representation
  (not in the executor — that is Cycle 4)
□ SK-443 checks 1-7 return 0 hits on this document
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md
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
❌ UPSTREAM_CONTEXT includes everything prior steps produce
   → Reduce to only what THIS step's constraints require. More context = more
     noise for the convergence models.
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
decision rules (not a fixed list), and state is saved.

---

### STEP 5 — WRITE THE CYCLE 2 TEST

**Skills to load:**
```
code-execution--node-convergence-SKILL.md      (SK-435)
  — Step 5 verification checklist — use directly
planning--simulation-protocol-SKILL.md         (SK-441)
  — verdict vocabulary: WORKS / PARTIAL / BREAKS / SILENT_FAILURE
```

**Task:**
Define how you verify that the three model outputs converged on a valid NODE
and the judge made a defensible choice. Four checks: convergence (are the
three candidates consistent on intent and constraints?), arbiter pass (did
assigned arbiters approve?), abstraction (is the NODE technology-neutral?),
quality specificity (does the quality field say something specific about THIS
step?). State what each check accepts and what it rejects.

**Read from state:**
```
cycle2.template_file         (to align test with what the template produces)
cycle2.challenger_roles_by_step_type  (to verify arbiter check covers the
                              right arbiters for each step type)
invariants                   (to verify NODE constraints include all invariants)
```

**Expected results:**
```
□ Convergence check defines "consistent" as an observable property:
  "intent clauses match across all three candidates" — not "they agree"
□ Convergence check names what a divergence looks like:
  "two candidates say X, one says Y — the one is challenged, not averaged"
□ Arbiter check lists which arbiters apply per step type (from
  cycle2.challenger_roles_by_step_type) and what PASS means for each
□ Abstraction check defines the specific terms that must not appear
  (same list as Step 3 — consistent across cycles)
□ Quality specificity check states: "the quality field references something
  in the NODE's own structure or constraints, not a generic risk"
□ Grade formula: convergence score × arbiter pass fraction × abstraction clean
□ Threshold stated: below [X] the NODE is rejected and Cycle 2 reruns
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-5-CYCLE2-TEST.md
```

**Bad results — STOP and fix:**
```
❌ Convergence check says "models agree"
   → Not observable. State what specific fields must match across candidates.
❌ Arbiter check is "all arbiters pass"
   → Which arbiters? The set varies by step type. Name the check per type.
❌ Quality check is missing
   → The quality field is the most commonly empty. It must be checked explicitly.
❌ Grade threshold is lower than Cycle 1 threshold
   → NODE quality gate should be at least as strict as plan quality gate.
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

**Step complete when:** All four checks are defined with observable criteria,
grade formula and threshold are stated, and state is saved.

---

### STEP 6 — WRITE THE CYCLE 3 CONTEXT PACKAGE

**Skills to load:**
```
⚠️  SK-521 (depth-decision) — REQUIRED. Not yet written.
    If missing: add "SK-521" to state.missing_skills.
    Do not proceed — Cycle 3 context cannot be correctly authored without
    the depth-decision skill. Record: "Step 6 blocked — SK-521 does not exist."

code-execution--node-convergence-SKILL.md  (SK-435)
  — NODE format re-read: what fields inform the depth decision
```

**Task:**
Write what the Depth Decider AI receives when a verified NODE arrives for
depth classification. The package includes the NODE, depth history from RAG,
current depth level, and the complexity signals that indicate expansion
is warranted. Also states the hard termination bound — the depth at which
expansion always stops regardless of what the AI decides.

**Read from state:**
```
cycle2.template_file         (to know what the NODE contains — depth context
                              is derived from NODE fields)
invariants.machine_constraints  (termination depth is a machine constraint —
                              it must be stated here)
flow_id                      (for RAG depth history query)
```

**Expected results:**
```
□ Package contains: VERIFIED_NODE, DEPTH_HISTORY_QUERY, CURRENT_DEPTH,
  COMPLEXITY_SIGNALS, TERMINATION_BOUND
□ DEPTH_HISTORY_QUERY is parameterised: retrieves prior depth decisions
  for NODEs in the same domain and step type
□ COMPLEXITY_SIGNALS are derived from NODE fields — each signal references
  a specific NODE property (not a generic rule)
□ TERMINATION_BOUND is a number — stated as a machine constraint
□ Output format is defined: LEAF or EXPAND. If EXPAND: what sub-flow
  decomposition looks like (becomes input to a new Cycle 1)
□ Justification requirement is stated: the AI must reference at least one
  complexity signal or depth history entry in its reasoning
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-6-CYCLE3-CONTEXT.md
```

**Bad results — STOP and fix:**
```
❌ COMPLEXITY_SIGNALS are generic ("step is too complex")
   → Replace with NODE field references: "intent contains more than one
     responsibility clause" or "structure lists more than 3 input types"
❌ TERMINATION_BOUND is missing
   → A missing bound means infinite recursion is possible. State the number.
❌ Output format does not define what EXPAND looks like
   → EXPAND must produce a sub-flow input for Cycle 1. Define the format.
❌ Justification not required
   → Without required justification, depth decisions are not traceable.
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

**Step complete when:** Termination bound is stated as a number, complexity
signals reference NODE fields, and state is saved.

---

### STEP 7 — WRITE THE CYCLE 3 TEST

**Skills to load:**
```
⚠️  SK-521 (depth-decision) — REQUIRED. Not yet written.
    If missing: STOP. Step 7 is also blocked.

planning--simulation-protocol-SKILL.md    (SK-441)
  — consistency check format
```

**Task:**
Define how you verify the depth decision was correct. Two checks: justification
(did the AI reference something specific in the NODE?) and consistency (does the
same NODE produce the same decision on re-run?). State what re-run means —
it means running the same Cycle 3 context package with the same NODE twice
with different random seeds and comparing the LEAF/EXPAND verdict.

**Read from state:**
```
cycle3.context_package_file   (to align test with what the package produces)
cycle3.complexity_signals     (to verify justification check covers the right signals)
cycle3.termination_depth      (to verify depth bound enforcement is tested)
```

**Expected results:**
```
□ Justification check: AI output contains at least one reference to a
  complexity signal from the context package — or an explicit statement
  that no complexity signals were met (LEAF decision)
□ Consistency check: LEAF/EXPAND verdict is identical across two runs
  (define acceptable variance: "LEAF in run 1 + EXPAND in run 2 = FAIL")
□ Depth bound test: at termination_depth, the verdict is always LEAF
  regardless of NODE content — tested explicitly
□ Sub-flow coherence check (if EXPAND): each sub-node covers a distinct
  responsibility — no overlap test defined
□ Grade formula: justification_present (1/0) × consistency_score (0-1)
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-7-CYCLE3-TEST.md
```

**Bad results — STOP and fix:**
```
❌ Consistency check not defined
   → An undefinable test is not a test. State run conditions and comparison rule.
❌ Depth bound enforcement not tested
   → The termination bound is a machine constraint. Its enforcement must be tested.
❌ Sub-flow coherence not defined for EXPAND case
   → A sub-flow with overlapping responsibilities will loop. Test for it.
```

**Write to state:**
```
cycle3.status          → "TEST_DEFINED"
current_step           → 7
step_status            → "COMPLETE"
```

**Step complete when:** Both checks defined with observable criteria, depth
bound test present, and state is saved.

---

### STEP 8 — WRITE THE EXECUTOR HANDOFF CONTRACT

**Skills to load:**
```
code-execution--node-convergence-SKILL.md           (SK-435)
  — Genesis Prompt Derivation section — this defines the handoff
planning--arbiter-panel-design-SKILL.md             (SK-442)
  — arbiter mapping from NODE constraints to executor arbiter panel
code-execution--flow-implementation-guide-SKILL.md
  — existing phase gates (Phase B through F) — what the handoff feeds into
```

**Task:**
Define the contract between Cycle 3 (a leaf NODE) and Cycle 4 (executor
generation via the existing AF pipeline). Three mappings: NODE constraints
→ iron rules for generation, NODE structure → input/output contract, NODE
quality criteria → arbiter checklist. These mappings make the existing
session files (Phase B through F) usable without modification.

**Read from state:**
```
invariants                   (iron rules must include all invariants)
cycle2.grade_criteria        (executor quality threshold must be at least as
                              strict as NODE quality threshold)
executor_handoff.existing_session_files  (list existing Phase B-F files —
                              these are NOT rewritten, only fed)
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
□ No new session files created — only this handoff contract document
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-8-HANDOFF-CONTRACT.md
```

**Bad results — STOP and fix:**
```
❌ Mapping creates new gates in the existing Phase B-F files
   → Do not modify existing files. The handoff contract defines what
     the existing gates receive — not new gates.
❌ Iron rules derived from NODEs duplicate existing DNA rules
   → DNA rules are already enforced by the system. The NODE's iron rules
     are only the constraints specific to this step's domain.
❌ Arbiter mapping has items with no corresponding Phase E check
   → Either the Phase E arbiter panel needs a new arbiter (record as issue),
     or the NODE quality criterion is too vague to be tested (fix the template).
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

**Step complete when:** All three mappings are complete, no new session files
created, and state is saved.

---

### STEP 9 — WRITE THE VISIBILITY CONTRACTS

**Skills to load:**
```
⚠️  SK-524 (cycle-visibility-design) — REQUIRED. Not yet written.
    If missing: add "SK-524" to state.missing_skills.
    Proceed with the basic format below as substitute — note the gap.

planning--output-contract-SKILL.md   (SK-448)
  — output contract verification pattern
```

**Task:**
For each of the 4 cycles, define the visibility record that is emitted when
that cycle completes. Four fields in every record: SENT (full context given
to AI), RECEIVED (each model's output, labelled), DECIDED (winner and
reasoning — not just the winner), CHANGED (what in RAG or the decision graph
was updated). Define what COMPLETE means for each field — an empty DECIDED
field is a failed record, not an acceptable output.

**Read from state:**
```
cycle1.context_package_file     (SENT in Cycle 1 record)
cycle2.template_file            (SENT in Cycle 2 record)
cycle3.context_package_file     (SENT in Cycle 3 record)
executor_handoff.handoff_file   (SENT in Cycle 4 record)
```

**Expected results:**
```
□ One visibility record definition per cycle (4 total)
□ Each record defines SENT, RECEIVED, DECIDED, CHANGED
□ SENT field for each cycle references the correct context package
□ RECEIVED defines how many model outputs are expected and their labels
□ DECIDED requires reasoning — "winner = A" alone fails
□ CHANGED defines at minimum: which RAG index was updated and what key
□ Completeness test defined: can you reconstruct the full decision path
  from the 4 records alone without re-running?
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-9-VISIBILITY.md
```

**Bad results — STOP and fix:**
```
❌ DECIDED field allows "winner = A" without reasoning
   → Require: winner + reference to at least one criterion from the
     context package that distinguished winner from runner-up.
❌ CHANGED is empty or optional
   → Every cycle updates something. If nothing changed, that is itself
     a signal that the cycle produced no learning. Make CHANGED required.
❌ Visibility record for Cycle 3 is missing
   → Depth decisions that leave no record are untraceable. All 4 cycles
     must have visibility records.
```

**Write to state:**
```
visibility_contracts.per_cycle   → {cycle1: {...}, cycle2: {...},
                                     cycle3: {...}, cycle4: {...}}
visibility_contracts.status      → "CONTRACTS_DEFINED"
current_step                     → 9
step_status                      → "COMPLETE"
```

**Step complete when:** Four visibility record definitions are present, every
DECIDED field requires reasoning, and state is saved.

---

### STEP 10 — REVIEW THE CHAIN

**Skills to load:**
```
planning--simulation-protocol-SKILL.md    (SK-441)
  — step table format for chain verification
planning--output-contract-SKILL.md        (SK-448)
  — output contract verification
```

**Task:**
Walk the full chain once. For each boundary between cycles, verify that
everything Cycle N+1 needs as input is produced by Cycle N. If any link
has a gap — something required downstream that is not produced upstream —
record it and fix the context package for the producing cycle before
calling the plan complete.

**Read from state:**
```
cycle1.context_package_file     (produces: plan steps)
cycle2.template_file            (receives: plan step; produces: verified NODE)
cycle3.context_package_file     (receives: verified NODE; produces: LEAF/EXPAND)
executor_handoff                (receives: leaf NODE; produces: iron rules +
                                 contracts + arbiter checklists)
visibility_contracts.per_cycle  (spans all cycles)
missing_skills                  (if non-empty: chain review must note which
                                 steps are PENDING_SKILL and cannot be verified)
```

**Chain step table (complete this table — every row must reach WORKS):**
```
| Boundary | What Cycle N produces | What Cycle N+1 needs | Gap? |
|----------|----------------------|---------------------|------|
| C1 → C2  | plan step (text)     | STEP_TEXT in template | ? |
| C2 → C3  | verified NODE        | NODE + depth context  | ? |
| C3 → C4  | leaf NODE            | iron rules + contract | ? |
| C4 → AF  | executor             | Phase B input         | ? |
| Any → V  | cycle output         | visibility SENT field | ? |
```

**Expected results:**
```
□ Every row in the chain table reaches WORKS
□ Every missing_skills entry has a named step blocked by it
□ documents_produced in state lists all 9 output files produced in
  Steps 1-9 — verify each file exists at its stated path
□ No step in steps 1-9 has status IN_PROGRESS — all are COMPLETE or blocked
□ chain_review.verdict is "READY_FOR_EXECUTION" or lists named gaps
□ File saved to /mnt/user-data/outputs/FLOW-XX-STEP-10-CHAIN-REVIEW.md
□ Final FLOW-XX-PLAN-STATE.json saved with chain_review.verdict populated
```

**Bad results — STOP and fix:**
```
❌ Any chain row shows BREAKS or PARTIAL
   → Fix the producing cycle's context package. Re-run that step.
   → Do not proceed to execution with a broken chain.
❌ missing_skills is non-empty and no steps are marked blocked
   → Missing skills silently skip the steps that need them.
   → Mark every step that requires a missing skill as BLOCKED_PENDING_SKILL.
❌ documents_produced has fewer than 9 entries
   → A step was completed without saving its output file.
   → Identify the step, recover or re-run it.
❌ Any step status is IN_PROGRESS
   → A step was started and not finished.
   → Resume and complete it before chain review.
```

**Write to state:**
```
chain_review.gaps      → [list of gaps found, empty if none]
chain_review.verdict   → "READY_FOR_EXECUTION" | "BLOCKED: [named gaps]"
documents_produced     → [list of all 9 output files with paths]
current_step           → 10
step_status            → "COMPLETE"
```

**Step complete when:** Chain table has no BREAKS, verdict is written, all
9 documents are listed in state, and final state is saved.

---

## SKILL GAP SUMMARY

The following skills are required by steps in this guide but do not yet exist.
Every step that requires them will STOP and add the skill to missing_skills.

| Skill | Required by | What it governs |
|-------|------------|----------------|
| SK-520 intent-to-plan | Steps 2, 4 | The 5-field context package format for Cycle 1 |
| SK-521 depth-decision | Steps 6, 7 | Complexity signals, LEAF/EXPAND decision, termination |
| SK-522 AI context package authoring | Steps 2, 4, 6 | Context packages vs instruction files |
| SK-524 cycle-visibility-design | Step 9 | Visibility record structure per cycle |
| SK-523 configuration-selection | (not in this guide — needed for Cycle 4 runtime) | How model/prompt selection improves over time |

**When a step hits a missing skill:**
1. Add the skill name to `state.missing_skills`
2. Set `step_status` = "BLOCKED_PENDING_SKILL"
3. Save state
4. Report: "Step N is blocked. Required skill SK-XXX does not exist.
   Steps N through M cannot complete until SK-XXX is written."
5. Do not attempt the step with an approximation. The skill exists to prevent
   the wrong approximation from being used.

---

## DOCUMENT CHECKLIST (all 10 steps complete)

```
□ FLOW-XX-PLAN-STATE.json                     (updated after every step)
□ FLOW-XX-STEP-1-INVARIANTS.md                (Step 1)
□ FLOW-XX-STEP-2-CYCLE1-CONTEXT.md            (Step 2)
□ FLOW-XX-STEP-3-CYCLE1-TEST.md               (Step 3)
□ FLOW-XX-STEP-4-CYCLE2-TEMPLATE.md           (Step 4)
□ FLOW-XX-STEP-5-CYCLE2-TEST.md               (Step 5)
□ FLOW-XX-STEP-6-CYCLE3-CONTEXT.md            (Step 6)  ← blocked if SK-521 missing
□ FLOW-XX-STEP-7-CYCLE3-TEST.md               (Step 7)  ← blocked if SK-521 missing
□ FLOW-XX-STEP-8-HANDOFF-CONTRACT.md          (Step 8)
□ FLOW-XX-STEP-9-VISIBILITY.md                (Step 9)  ← blocked if SK-524 missing
□ FLOW-XX-STEP-10-CHAIN-REVIEW.md             (Step 10)
```
