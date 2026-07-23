# MISSING SKILLS PREPARATION — DETAILED PLAN FOR CLAUDE CODE
## Skills to produce: SK-522, SK-520, SK-521, SK-524, SK-525
## Version: 2.0 | Date: 2026-04-01
## Changed from v1.0:
##   - Added SK-525 (Meta-Arbiter) as Skill 5 of 5
##   - Updated skill file format with graph RAG metadata fields
##   - Updated state schema with SK-525 entry
##   - Updated build order and final verification
##   - Fixed output paths (Claude Code working directory, not web session path)
## Protocol: XIIGEN-EXECUTION-PROTOCOL-v1.1.md applies throughout

---

## WHY THESE 5 SKILLS AND IN THIS ORDER

SK-522 defines what a context package IS — the format that SK-520 and SK-521
both produce. Writing SK-522 first means SK-520 and SK-521 are built on a
defined foundation, not guessed at.

SK-520 is the first hard block in the flow plan guide (Step 2). Every flow
plan preparation session stops here until SK-520 exists.

SK-521 is the second hard block (Steps 6-7). No flow can reach Cycle 3 without it.

SK-524 is a soft block (Step 9 has a fallback) but without it the visibility
records are incomplete and the learning loop is broken.

SK-525 (Meta-Arbiter) governs what happens when a cycle produces a bad grade.
Without it, failures accumulate with no structured improvement mechanism. It is
written last because it reads execution records that reference all prior skills.

```
Build order:    SK-522 → SK-520 → SK-521 → SK-524 → SK-525
Unblock order:  SK-520 → SK-521 → SK-522 → SK-524 → SK-525
```

Build in SK-522 first order — unblocking follows automatically.

---

## STATE FILE: SKILL-PREP-STATE.json

Save to: `[PROJECT_ROOT]\docs\flow-plan-prep-temp\SKILL-PREP-STATE.json`
Read at the start of every session. Write after every skill.

```json
{
  "session": "SKILL-PREPARATION",
  "current_skill": "",
  "current_step": 0,
  "step_status": "NOT_STARTED",

  "skills": {
    "SK-522": {
      "status": "NOT_STARTED",
      "file": "",
      "sections_verified": [],
      "answer_tests_passed": [],
      "issues": []
    },
    "SK-520": {
      "status": "NOT_STARTED",
      "file": "",
      "sections_verified": [],
      "answer_tests_passed": [],
      "issues": []
    },
    "SK-521": {
      "status": "NOT_STARTED",
      "file": "",
      "sections_verified": [],
      "answer_tests_passed": [],
      "issues": []
    },
    "SK-524": {
      "status": "NOT_STARTED",
      "file": "",
      "sections_verified": [],
      "answer_tests_passed": [],
      "issues": []
    },
    "SK-525": {
      "status": "NOT_STARTED",
      "file": "",
      "sections_verified": [],
      "answer_tests_passed": [],
      "issues": []
    }
  },

  "progress_log": [],
  "issues": []
}
```

---

## SKILL FILE FORMAT (MANDATORY — ALL 5 SKILLS)

Every skill file must use this exact format. The graph RAG fields are NEW
and required — they enable the retrieval mechanism that feeds skills to the
right player at the right decision point.

```markdown
---
name: [skill-name-kebab-case]
sk_number: SK-NNN
version: "1.0.0"
priority: HIGH
load_order: [0=before other work | 1=during | 99=at completion]
category: planning
author: luba
updated: "2026-04-01"
contexts: ["web-session", "claude-code"]
description: >
  [2-4 sentences. What this skill governs. What it prevents.
  When to load it. Written so Claude Code knows whether to load it
  before reading the body.]
triggers:
  - "[phrase that means this skill is needed]"
  - "[another phrase]"

# --- GRAPH RAG FIELDS (required — governs retrieval by player/node/context) ---
player_types:    [executor | arbiter | main_arbiter | escalation_unit |
                  planner | depth_decider | judge | meta_arbiter]
node_types:      [ROUTING | ORCHESTRATION | DATA_PIPELINE |
                  VALIDATION | SCHEDULED | ANY]
decision_point:  [generate | evaluate_node | judge_output | escalate |
                  plan | depth_decide | configure | evaluate_system |
                  propose_improvement]
tree_types:      [ANY | specific-tree-type-name]
relevant_when:
  parent_is:     [node_type | ANY]
  has_siblings:  [node_type | ANY]
  at_depth:      [1 | 2 | leaf | ANY]
  is_leaf:       true | false | ANY
---

# [Skill Title] (SK-NNN) v1.0

## WHAT THIS SKILL PREVENTS
[1-3 specific failure modes. Named. Not generic.]

## WHEN TO INVOKE
[Specific trigger conditions. Loadable in small context.]

## [CORE CONTENT SECTIONS]
[Governed by each skill's spec below]

## ANTI-PATTERNS
[Named wrong approaches. Each one states what was found + what to do instead.]

## INTEGRATION
[What invokes this skill. What this skill produces. What uses its output.
References to other skill SK numbers — never filenames.]
```

Size target: 200-350 lines. Under 200 means the skill is too thin.
Over 400 means it needs to be split.

---

## OUTPUT PATHS (Claude Code — NOT web session paths)

```
Working drafts:  [PROJECT_ROOT]\docs\flow-plan-prep-temp\[filename]
Live skills:     [PROJECT_ROOT]\.claude\skills\[filename]

Save every skill to BOTH locations simultaneously.
/mnt/user-data/outputs/ does NOT exist in Claude Code — never use it.
```

---

## SKILL 1 OF 5 — SK-522: AI CONTEXT PACKAGE AUTHORING

**File to produce:** `planning--ai-context-package-authoring-SKILL.md`
**Save to (both):**
- `[PROJECT_ROOT]\docs\flow-plan-prep-temp\planning--ai-context-package-authoring-SKILL.md`
- `[PROJECT_ROOT]\.claude\skills\planning--ai-context-package-authoring-SKILL.md`

### Step 1A — Read before writing

Read these files in full before writing a single line of SK-522:

```
✅ [PROJECT_ROOT]\.claude\skills\planning--session-file-authoring-SKILL.md (SK-443)
   — understand instruction files: what SK-522 must NOT produce

✅ [PROJECT_ROOT]\.claude\skills\planning--convergence-round-design-SKILL.md (SK-452)
   — the challenger context package is an example of what SK-522 governs

✅ [PROJECT_ROOT]\.claude\skills\planning--system-intake-SKILL.md (SK-454)
   — the domain context package is another example

✅ [PROJECT_ROOT]\.claude\skills\planning--output-contract-SKILL.md (SK-448)
   — success criteria format
```

**Read from state:** nothing — this is the first skill, state starts empty.

**Three questions to answer internally before writing:**

1. What is the exact difference between SK-443's instruction file and a
   context package? (Instruction file: tells Claude Code what to do step
   by step. Context package: gives AI the context to decide what to do.
   The decision is not in the document.)

2. What fields does SK-452's challenger context package have?
   (The challenger template is the best existing example of a context package.)

3. What is missing from SK-454's domain context package that a Cycle 1
   context package also needs?
   (SK-454 extracts from existing code. Cycle 1 starts from a user sentence.)

If you cannot answer all three — re-read the files. Do not proceed.

### Step 1B — Write SK-522

**Graph RAG fields for SK-522:**
```yaml
player_types:   [planner, depth_decider, executor, arbiter]
node_types:     [ANY]
decision_point: [plan, depth_decide, generate, configure]
tree_types:     [ANY]
relevant_when:
  parent_is:    ANY
  at_depth:     ANY
  is_leaf:      ANY
```

**Required sections:**

Section 1: THE FUNDAMENTAL DISTINCTION
  Two-column table: instruction file (SK-443) vs context package (SK-522)
  One-sentence rule: "If the document tells the AI WHAT to produce — instruction file.
  If it tells the AI WHAT IT NEEDS TO KNOW to decide — context package."

Section 2: THE 5-FIELD STRUCTURE
  Fields: INTENT, DOMAIN, CONSTRAINTS, PRIOR_ART, SUCCESS
  For each: definition + what-not-to-put + why-empty-fails
  Note on parameterisation: when used as Cycle 2 template, INTENT receives
  one plan step at runtime — not a fixed user sentence.

Section 3: FIELD-BY-FIELD AUTHORING RULES
  Good/bad example per field — registration flow domain for all examples.

Section 4: VERIFICATION CHECKLIST
  8 boolean checks — all must be TRUE before the package is used.

Section 5: RUNTIME FAILURE MODES
  5 named failures: INTENT_REPHRASED, DOMAIN_SCOPES_THE_STACK,
  CONSTRAINTS_CONTAIN_PREFERENCES, PRIOR_ART_INLINE, SUCCESS_PRESCRIBES_CONTENT
  Each: what was in the package → what AI produced → detection → fix.

Section 6: QUESTION YOURSELF (NEW — required by planning skills audit)
  Every context package must include this section for the AI reading it:
  ```
  QUESTION YOURSELF before returning your output:
  1. Does every intent clause from INTENT appear in at least one output item?
  2. Does any output item contain a technology name? Name it if found.
  3. Does any output item contain "and" where each part could be separate?
  4. If any answer reveals a problem — fix the output before returning it.
  ```
  This section is part of the SUCCESS field definition — not a separate document.
  State explicitly: "The SUCCESS field must include QUESTION YOURSELF guidance
  telling the AI to self-check before returning output."

Section 7: ANTI-PATTERNS + INTEGRATION

**Answer tests (all 3 must pass before saving):**
```
T1: Can Claude Code list all 5 fields with definitions? → Section 2
T2: Does SK-522 cover parameterised templates (Cycle 2)? → Section 2 note
T3: Does the 5-field structure accommodate a NODE object in INTENT? → Section 2
```

**Expected results:**
```
□ File is 200-350 lines
□ YAML frontmatter: sk_number=SK-522, all graph RAG fields present
□ Section 1 contains two-column table + one-sentence rule
□ Section 2 names all 5 fields with definition + what-not-to-put + empty-fails-because
□ Section 3 has good/bad examples for all 5 fields from registration domain
□ Section 4 has exactly 8 verification checks
□ Section 5 has exactly 5 named failure modes
□ Section 6 defines QUESTION YOURSELF guidance as part of SUCCESS field
□ All 3 answer tests pass
□ File saved to both paths
```

**Bad results — STOP and fix:**
```
❌ Section 2 defines fewer than 5 fields → Add missing fields
❌ Graph RAG fields absent from frontmatter → Add before saving
❌ Section 6 missing → QUESTION YOURSELF is mandatory per audit finding
❌ File over 400 lines → Split examples into reference file
```

**Write to state:**
```
skills.SK-522.status              → "COMPLETE"
skills.SK-522.file                → "planning--ai-context-package-authoring-SKILL.md"
skills.SK-522.sections_verified   → [list of 7 section names]
skills.SK-522.answer_tests_passed → ["T1", "T2", "T3"]
current_skill                     → "SK-520"
current_step                      → 0
```

---

## SKILL 2 OF 5 — SK-520: INTENT TO PLAN

**File to produce:** `planning--intent-to-plan-SKILL.md`
**Save to (both):**
- `[PROJECT_ROOT]\docs\flow-plan-prep-temp\planning--intent-to-plan-SKILL.md`
- `[PROJECT_ROOT]\.claude\skills\planning--intent-to-plan-SKILL.md`

### Step 2A — Read before writing

```
✅ docs\flow-plan-prep-temp\planning--ai-context-package-authoring-SKILL.md
   (SK-522 — just written, must be COMPLETE in state)

✅ [PROJECT_ROOT]\.claude\skills\planning--requirement-to-flow-SKILL.md (SK-492)
   — what it covers vs what SK-520 covers (different inputs, different outputs)

✅ [PROJECT_ROOT]\.claude\skills\planning--system-intake-SKILL.md (SK-454)
   — domain extraction feeds the DOMAIN field

✅ [PROJECT_ROOT]\.claude\skills\planning--simulation-protocol-SKILL.md (SK-441)
   — verdict vocabulary for plan reviewer test format
```

**Prerequisite check:** `skills.SK-522.status` must be "COMPLETE" before starting.
If not — STOP. Record in state.issues[]. Do not proceed.

### Step 2B — Write SK-520

**Graph RAG fields for SK-520:**
```yaml
player_types:   [planner]
node_types:     [ANY]
decision_point: [plan]
tree_types:     [ANY]
relevant_when:
  parent_is:    ANY
  at_depth:     [1]
  is_leaf:      false
```

**Required sections:**

Section 1: HOW SK-520 DIFFERS FROM SK-492
  One sentence: "SK-492 maps structured requirements to known flow patterns.
  SK-520 extracts structured intent from unstructured natural language."

Section 2: PARSING THE USER SENTENCE
  Intent clause table format.
  Parsing rules: noun phrase = one clause, infrastructure qualifiers = context not clause,
  multiple verbs = multiple clauses, "and" connecting capabilities = two clauses.
  Size derivation formula: min = max(clause_count, 3) adjusted for domain complexity;
  max = min(clause_count × 3, 12) adjusted for domain complexity.
  State the adjustment reasoning explicitly — do not use defaults without justification.

Section 3: ASSEMBLING THE CYCLE 1 CONTEXT PACKAGE
  Assembly rules for all 5 SK-522 fields from the parsed sentence.
  INTENT: verbatim — character for character.
  DOMAIN: from SK-454 or derived from flow_id; 2-3 sentences; no technology names.
  CONSTRAINTS: copied from state.invariants — do not add new constraints here.
  PRIOR_ART: RAG query string; "NO_PRIOR_ART — first run" when empty.
  SUCCESS: defines step format + size range with reasoning + dependency declaration format.

Section 4: WHAT A VALID PLAN STEP LOOKS LIKE
  3 properties: PLAIN LANGUAGE, SINGLE RESPONSIBILITY, DEPENDENCY DECLARED.
  Good/bad example for each — registration flow domain.

Section 5: THE PLAN REVIEWER PROTOCOL
  4 checks: COVERAGE, ABSTRACTION, SINGLE RESPONSIBILITY, DEPENDENCY COMPLETENESS.
  Grade formula: coverage_score × abstraction_score × (0.5 + 0.5 × responsibility_score)
                 × dependency_score
  Threshold: read from state.cycle1.grade_threshold — not hardcoded in skill.

Section 6: QUESTION YOURSELF (required — Planner AI self-check)
  Add to the SUCCESS field definition: the Planner AI must self-check before returning.
  ```
  QUESTION YOURSELF before returning the plan:
  1. Does every intent clause from INTENT appear as the primary subject
     of at least one plan step? List each clause and its step.
  2. Does any step contain a technology name from the abstraction check list?
     Name it if found.
  3. Does any step contain "and" where each part could be a separate step?
     Flag it if found.
  4. Does any step that depends on a prior step declare that dependency?
  If any answer reveals a problem — fix the plan before returning it.
  ```

Section 7: ANTI-PATTERNS + INTEGRATION

**Answer tests:**
```
T1: How to fill INTENT field → "verbatim — no changes"
T2: Step count for 3-clause sentence → min and max derived with reasoning
T3: What Plan Reviewer checks → 4 named checks with grade formula
```

**Expected results:**
```
□ File is 200-350 lines
□ YAML frontmatter: sk_number=SK-520, all graph RAG fields present
□ Section 1 distinguishes SK-520 from SK-492 in one sentence
□ Section 2 clause table format present + size formula with derivation reasoning
□ Section 3 assembly rules cover all 5 SK-522 fields
□ Section 4 defines 3 step properties with good/bad examples
□ Section 5 defines 4 checks with grade formula
□ Section 6 QUESTION YOURSELF present as part of SUCCESS field definition
□ All 3 answer tests pass
□ File saved to both paths
```

**Bad results — STOP and fix:**
```
❌ Section 3 does not cover all 5 SK-522 fields → Add missing field rules
❌ Size range uses defaults without derivation reasoning → Add reasoning
❌ Section 6 missing → Mandatory per audit — add before saving
❌ Graph RAG fields absent → Add to frontmatter
```

**Write to state:**
```
skills.SK-520.status              → "COMPLETE"
skills.SK-520.file                → "planning--intent-to-plan-SKILL.md"
skills.SK-520.sections_verified   → [list of 7 section names]
skills.SK-520.answer_tests_passed → ["T1", "T2", "T3"]
current_skill                     → "SK-521"
current_step                      → 0
```

---

## SKILL 3 OF 5 — SK-521: DEPTH DECISION

**File to produce:** `planning--depth-decision-SKILL.md`
**Save to (both):**
- `[PROJECT_ROOT]\docs\flow-plan-prep-temp\planning--depth-decision-SKILL.md`
- `[PROJECT_ROOT]\.claude\skills\planning--depth-decision-SKILL.md`

### Step 3A — Read before writing

```
✅ docs\flow-plan-prep-temp\planning--ai-context-package-authoring-SKILL.md (SK-522)
✅ docs\flow-plan-prep-temp\planning--intent-to-plan-SKILL.md (SK-520)
   (both must be COMPLETE in state before starting)

✅ [PROJECT_ROOT]\.claude\skills\code-execution--node-convergence-SKILL.md (SK-435)
   — NODE structure: which fields inform the depth decision

✅ [PROJECT_ROOT]\.claude\skills\planning--freedom-machine-classification-SKILL.md (SK-451)
   — termination bound is MACHINE constraint — understand why

✅ [PROJECT_ROOT]\.claude\skills\planning--problem-decomposition-SKILL.md (SK-430)
   — structural analogy only — do not duplicate
```

**Prerequisite check:** both SK-522 and SK-520 must be COMPLETE in state.

### Step 3B — Write SK-521

**Graph RAG fields for SK-521:**
```yaml
player_types:   [depth_decider]
node_types:     [ANY]
decision_point: [depth_decide]
tree_types:     [ANY]
relevant_when:
  parent_is:    ANY
  at_depth:     ANY
  is_leaf:      ANY
```

**Required sections:**

Section 1: WHAT THE DEPTH DECISION IS
  Who makes it (AI — the Depth Decider model).
  What it receives (verified NODE + depth context package).
  What it produces (LEAF or EXPAND + justification + sub-flow plan if EXPAND).

Section 2: THE 5 COMPLEXITY SIGNALS
  Each signal references a specific NODE field. No single signal is sufficient.
  SIGNAL 1: MULTI-RESPONSIBILITY INTENT (node.intent.purpose) — moderate weight
  SIGNAL 2: MULTIPLE INDEPENDENT INPUT TYPES (node.structure.inputShape) — strong
  SIGNAL 3: MULTIPLE INDEPENDENT FAILURE MODES (node.quality.scoringCriteria) — strong
  SIGNAL 4: CROSS-DOMAIN CONSTRAINTS (node.constraints) — moderate
  SIGNAL 5: HIGH QUALITY THRESHOLD WITH BROAD SCOPE (node.quality + node.intent) — weak alone

Section 3: TERMINATION BOUND (MACHINE CONSTRAINT)
  Default: 3. Maximum: 5 (above 5 requires explicit Luba approval).
  Why MACHINE: tenants cannot override — unbounded recursion breaks execution guarantee.
  At depth = termination_depth: verdict is always LEAF. No exceptions.

Section 4: ASSEMBLING THE CYCLE 3 CONTEXT PACKAGE
  Assembly rules for all 5 SK-522 fields for Cycle 3.
  INTENT: full verified NODE object from Cycle 2 (not the user sentence).
  DOMAIN: "[Depth N] node in [flow domain] flow".
  CONSTRAINTS: termination bound + sub-flow non-overlap rule (both MACHINE).
  PRIOR_ART: "depth decisions for [archetype] nodes at depth [N]".
  SUCCESS: LEAF format (signal checked + not triggered OR depth=bound enforced)
           EXPAND format (signal cited with NODE field evidence + sub-flow decomposition).

Section 5: VERIFICATION CHECKS
  Check 1: JUSTIFICATION PRESENT (LEAF and EXPAND formats — observable, not judgment)
  Check 2: TERMINATION BOUND ENFORCED (test at depth = termination_depth → always LEAF)
  Check 3: SUB-FLOW NON-OVERLAP (EXPAND only — each sub-node covers distinct responsibility)
  Grade formula: justification_present × non_overlap

Section 6: QUESTION YOURSELF (required — Depth Decider AI self-check)
  Add to SUCCESS field definition:
  ```
  QUESTION YOURSELF before returning your verdict:
  1. For LEAF: which signal did you check? State it by name. Was it not triggered?
     OR: state that depth = termination_depth and bound is enforced.
     A verdict with neither is not complete — add the signal check before returning.
  2. For EXPAND: which signal triggered? Cite the specific NODE field and value.
     List each proposed sub-node with its distinct responsibility.
     Do any two sub-nodes cover the same user-facing action? Merge them if yes.
  ```

Section 7: ANTI-PATTERNS + INTEGRATION

**Answer tests:**
```
T1: What signals trigger expansion → 5 named signals with NODE field references
T2: Default termination depth → 3
T3: What EXPAND verdict must contain → verdict + signal cited + sub-flow decomposition
```

**Expected results:**
```
□ File is 200-350 lines
□ YAML frontmatter: sk_number=SK-521, all graph RAG fields present
□ Section 2 has exactly 5 named signals, each with NODE field reference
□ Section 3 states default=3, maximum=5, explains MACHINE classification
□ Section 4 covers all 5 SK-522 fields with LEAF/EXPAND distinctions
□ Section 5 has exactly 3 checks with grade formula
□ Section 6 QUESTION YOURSELF present for both LEAF and EXPAND verdicts
□ All 3 answer tests pass
□ File saved to both paths
```

**Bad results — STOP and fix:**
```
❌ Complexity signals are rules ("if X then expand") → Replace with weighted signals
❌ Termination bound not classified as MACHINE → Add SK-451 classification
❌ EXPAND format does not require sub-flow decomposition → Sub-flow plan is mandatory
❌ Section 6 missing → Add before saving
```

**Write to state:**
```
skills.SK-521.status              → "COMPLETE"
skills.SK-521.file                → "planning--depth-decision-SKILL.md"
skills.SK-521.sections_verified   → [list of 7 section names]
skills.SK-521.answer_tests_passed → ["T1", "T2", "T3"]
current_skill                     → "SK-524"
current_step                      → 0
```

---

## SKILL 4 OF 5 — SK-524: CYCLE VISIBILITY DESIGN

**File to produce:** `planning--cycle-visibility-design-SKILL.md`
**Save to (both):**
- `[PROJECT_ROOT]\docs\flow-plan-prep-temp\planning--cycle-visibility-design-SKILL.md`
- `[PROJECT_ROOT]\.claude\skills\planning--cycle-visibility-design-SKILL.md`

### Step 4A — Read before writing

```
✅ docs\flow-plan-prep-temp\planning--ai-context-package-authoring-SKILL.md (SK-522)
✅ docs\flow-plan-prep-temp\planning--intent-to-plan-SKILL.md (SK-520)
✅ docs\flow-plan-prep-temp\planning--depth-decision-SKILL.md (SK-521)
   (all three must be COMPLETE in state)

✅ [PROJECT_ROOT]\.claude\skills\planning--confidence-lifecycle-design-SKILL.md (SK-512)
   — CHANGED field updates decision graph edges — understand what changes

✅ [PROJECT_ROOT]\.claude\skills\planning--output-contract-SKILL.md (SK-448)
   — output contract pattern — each cycle's record is an output contract

✅ [PROJECT_ROOT]\.claude\skills\planning--learning-loop-closure-SKILL.md (SK-515)
   — CHANGED field is the learning trigger — understand what it feeds
```

**Prerequisite check:** SK-522, SK-520, SK-521 all COMPLETE in state.

### Step 4B — Write SK-524

**Graph RAG fields for SK-524:**
```yaml
player_types:   [executor, arbiter, main_arbiter, planner, depth_decider,
                 judge, meta_arbiter]
node_types:     [ANY]
decision_point: [generate, evaluate_node, plan, depth_decide, evaluate_system]
tree_types:     [ANY]
relevant_when:
  parent_is:    ANY
  at_depth:     ANY
  is_leaf:      ANY
```

**Required sections:**

Section 1: WHY VISIBILITY IS A MACHINE REQUIREMENT
  3 reasons: testing, learning (CHANGED triggers SK-515), debugging.
  Rule: "A cycle with no visibility record is a cycle that never ran."

Section 2: THE 4-FIELD RECORD STRUCTURE
  SENT, RECEIVED, DECIDED, CHANGED.
  For each: required content + empty-fails-because + what "complete" means.
  DECIDED: winner label AND reasoning referencing context package — "Winner: B" alone fails.
  CHANGED: at minimum one entry with index name + key + what changed.
           "Nothing changed" valid only when explicitly stated with reasoning.

Section 3: PER-CYCLE SPECIFICATIONS
  Cycle 1 (Intent to Plan): SENT=SK-520 package; RECEIVED=plan+review;
    DECIDED=accept/reject+gaps; CHANGED=RAG update or rejection reason.
  Cycle 2 (Step to NODE): SENT=SK-522 template for this step; RECEIVED=A/B/C candidates;
    DECIDED=winner+judge reasoning+arbiter verdicts; CHANGED=RAG+graph edge updates.
  Cycle 3 (Depth Decision): SENT=SK-521 package; RECEIVED=LEAF/EXPAND+justification;
    DECIDED=verdict+signal evidence; CHANGED=depth-decisions index+depth_history.
  Cycle 4 (Leaf to Executor): SENT=executor package; RECEIVED=A/B/C executors;
    DECIDED=winner+scores+arbiter verdicts; CHANGED=DPO triple+config performance.

  NEW — Cycle 5 (Meta-Arbiter, when grade < threshold):
    SENT=execution record (full — all 4 prior cycle records + grade + neighborhood)
    RECEIVED=Call 1 proposals (unranked) + Call 2 ranking
    DECIDED=ranked proposals submitted to Luba; escalation flags if any
    CHANGED=proposal nodes added to graph with status=PROPOSED

Section 4: COMPLETENESS TEST
  4 questions answerable from records alone:
  Q1: What did user originally ask? (Cycle 1 SENT.INTENT)
  Q2: Which model produced winning executor? (Cycle 4 RECEIVED labels + DECIDED winner)
  Q3: Why was depth decision LEAF? (Cycle 3 DECIDED justification)
  Q4: What changed in decision graph? (all CHANGED fields)

Section 5: ANTI-PATTERNS + INTEGRATION

**Answer tests:**
```
T1: Name all 4 fields with definitions → Section 2
T2: What DECIDED requires beyond naming winner → reasoning referencing SENT
T3: How to verify completeness → 4-question test in Section 4
```

**Expected results:**
```
□ File is 200-350 lines
□ YAML frontmatter: sk_number=SK-524, all graph RAG fields present
□ Section 1 states machine requirement rule verbatim
□ Section 2 defines all 4 fields with required-content + empty-fails-because
□ Section 3 has per-cycle specifications for all 5 cycles (including Cycle 5)
□ Section 4 has exactly 4 questions in completeness test
□ All 3 answer tests pass
□ File saved to both paths
```

**Bad results — STOP and fix:**
```
❌ CHANGED field described as optional → Required; "nothing changed" must be stated
❌ Cycle 3 or Cycle 5 visibility record missing → All 5 cycles must be covered
❌ DECIDED allows "Winner: B" without reasoning → Reasoning referencing SENT required
```

**Write to state:**
```
skills.SK-524.status              → "COMPLETE"
skills.SK-524.file                → "planning--cycle-visibility-design-SKILL.md"
skills.SK-524.sections_verified   → [list of 5 section names]
skills.SK-524.answer_tests_passed → ["T1", "T2", "T3"]
current_skill                     → "SK-525"
current_step                      → 0
```

---

## SKILL 5 OF 5 — SK-525: META-ARBITER

**File to produce:** `planning--meta-arbiter-SKILL.md`
**Save to (both):**
- `[PROJECT_ROOT]\docs\flow-plan-prep-temp\planning--meta-arbiter-SKILL.md`
- `[PROJECT_ROOT]\.claude\skills\planning--meta-arbiter-SKILL.md`

### Step 5A — Read before writing

```
✅ docs\flow-plan-prep-temp\planning--cycle-visibility-design-SKILL.md (SK-524)
   — the execution record the Meta-Arbiter receives comes from visibility records

✅ [PROJECT_ROOT]\.claude\skills\code-execution--prompt-patch-authoring-SKILL.md (SK-472)
   — PROMPT_PATCH proposals follow SK-472 WRONG/CORRECT format exactly

✅ [PROJECT_ROOT]\.claude\skills\planning--iron-rule-derivation-SKILL.md (SK-449)
   — SKILL_EDIT diagnosis at Step 4 reads skill content against SK-449 quality test

✅ [PROJECT_ROOT]\.claude\skills\planning--escalation-orchestrator-SKILL.md (SK-446)
   — escalation protocol — Meta-Arbiter escalation triggers align with this
```

**Prerequisite check:** SK-522, SK-520, SK-521, SK-524 all COMPLETE in state.

### Step 5B — Write SK-525

**Graph RAG fields for SK-525:**
```yaml
player_types:   [meta_arbiter]
node_types:     [ANY]
decision_point: [evaluate_system, propose_improvement]
tree_types:     [ANY]
relevant_when:
  parent_is:    ANY
  at_depth:     ANY
  is_leaf:      ANY
  grade_below_threshold: true
```

**Required sections:**

Section 1: WHAT THE META-ARBITER IS
  Not evaluating output — evaluating HOW the system produced it.
  Fires on bad grade. Phase 1 scope: PROMPT_PATCH + SKILL_EDIT only.
  Phase 2 (deferred): CONNECTION_CHANGE + RETRIEVAL_CHANGE.
  Two-call architecture: diagnosis (Call 1) → blind ranking (Call 2).
  Nothing applied without explicit Luba approval.

Section 2: THE THREE SITUATIONS
  Situation 1: single bad grade → one proposal.
  Situation 2: same node_type + neighborhood failed N ≥ 3 times → up to 3 ranked proposals.
  Situation 3: grade < threshold AND grade < prior_grade (regression) → REVERT proposal
               ranked first always regardless of ranker scoring.
  Does NOT fire on first-ever execution of a node_type.

Section 3: THE EXECUTION RECORD FORMAT
  Full JSON schema (same as SK-525 v1.0 Section 1).
  Fields: execution_id, grade, threshold, passed, node_type, tree_type,
          neighborhood, retrieval (query + skills_retrieved + skills_expected + gap),
          prompt (hash + sections_present + self_check_present + iron_rules_count),
          model (generators + judge + winner + scores),
          arbiter_verdicts, prior_grades, recent_changes.

Section 4: THE 4-STEP DIAGNOSIS PROTOCOL
  Step 1 — Check retrieval: skills_expected vs skills_retrieved → retrieval gap?
  Step 2 — Check assembly: self_check_present? iron_rules_count sufficient?
  Step 3 — Check prompt effectiveness: arbiter BLOCK? scores clustered or spread?
  Step 4 — Check skill content: regression from recent_changes? missing case? missing skill?
  STOP at first step that identifies the failure layer.
  Step 1 retrieval gap in Phase 1: flag it, note it, continue to Step 2.
  Never produce SKILL_EDIT to compensate for a retrieval gap.

Section 5: PROPOSAL FORMATS
  PROMPT_PATCH: target section + action + evidence + draft (WRONG/CORRECT per SK-472)
                + regression_check + expected_grade_delta + risk_of_regression.
  SKILL_EDIT: target skill + section + action + evidence + draft
              (positive example + negative example) + impact + escalation_required.
  SKILL_ADD: proposed SK number + gap description + draft frontmatter + graph action
             (create PROVISIONAL node with CONTAINS edges to node_types).

Section 6: THE TWO-CALL EXECUTION
  Call 1: diagnosis model (different from failed model) → unranked proposals + diagnosis trace.
  Call 2: ranker model (different from Call 1 model) → ranked proposals + impact scores
          + regression risk. Ranker does NOT see Call 1 reasoning — blind ranking.
  Luba receives: ranked proposals + execution summary + diagnosis trace + escalation flags.

Section 7: ESCALATION TRIGGERS
  Foundational skills (SK-435, SK-442, SK-441, SK-443, SK-449) → always escalate.
  Proposal affects > 5 skills via FEEDS edges → escalate.
  Proposal contradicts DNA-1 through DNA-9 → escalate immediately.
  Same proposal type on same skill 3+ times without approval → escalate the pattern.
  PROMPT_PATCH adding QUESTION YOURSELF → never escalate (always safe).

Section 8: GOOD AND BAD PROPOSAL EXAMPLES
  Good PROMPT_PATCH: single targeted WRONG/CORRECT pair for one arbiter BLOCK.
  Bad PROMPT_PATCH: two issues patched in one proposal (violates SK-472 Rule 0).
  Good SKILL_EDIT: adds missing case to SK-449 based on 4 repeated failures.
  Bad SKILL_EDIT: edits foundational SK-442 based on one bad grade + retrieval gap.

Section 9: ANTI-PATTERNS + INTEGRATION

**Answer tests:**
```
T1: When does the Meta-Arbiter fire? → Situations 1, 2, 3 with conditions
T2: What is the Phase 1 scope? → PROMPT_PATCH + SKILL_EDIT only
T3: Why two calls instead of one? → Blind ranking prevents self-ranking bias;
    same principle as generation blind judging
```

**Expected results:**
```
□ File is 300-400 lines (more complex skill — upper limit raised to 400)
□ YAML frontmatter: sk_number=SK-525, all graph RAG fields present
□ Section 1 states Phase 1 scope and two-call architecture
□ Section 2 defines all 3 situations with precise trigger conditions
□ Section 3 has full execution record JSON schema
□ Section 4 has exactly 4 diagnosis steps in order with stop rule
□ Section 5 has all 3 proposal formats (PROMPT_PATCH, SKILL_EDIT, SKILL_ADD)
□ Section 6 defines two-call execution — different models, blind ranker
□ Section 7 has all 4 escalation triggers
□ Section 8 has good/bad example for PROMPT_PATCH and SKILL_EDIT
□ All 3 answer tests pass
□ File saved to both paths
```

**Bad results — STOP and fix:**
```
❌ Phase 1 scope not stated → Add: PROMPT_PATCH + SKILL_EDIT only
❌ Section 4 allows running all 4 steps before stopping → Add STOP rule at first match
❌ Ranker receives Call 1 reasoning → Blind ranking is mandatory — remove reasoning
❌ Graph RAG fields absent → Add to frontmatter
❌ File over 400 lines → This skill is allowed up to 400 — if still over, split Section 3
   (execution record schema) into a reference file
```

**Write to state:**
```
skills.SK-525.status              → "COMPLETE"
skills.SK-525.file                → "planning--meta-arbiter-SKILL.md"
skills.SK-525.sections_verified   → [list of 9 section names]
skills.SK-525.answer_tests_passed → ["T1", "T2", "T3"]
current_skill                     → "DONE"
current_step                      → 0
```

---

## FINAL VERIFICATION — ALL 5 SKILLS COMPLETE

After all 5 skills are written, run this check before declaring the session done.

```
□ SKILL-PREP-STATE.json shows all 5 skills with status=COMPLETE
□ All 5 draft files exist in docs\flow-plan-prep-temp\ (verify with dir)
□ All 5 files exist in .claude\skills\ (verify with dir)
□ All 15 answer tests passed (3 per skill × 5 skills)
□ SK-522, SK-520, SK-521, SK-524 are 200-350 lines (verify with find /c /v "")
□ SK-525 is 300-400 lines
□ No skill references another skill by filename — only by SK number
□ All 5 skills have graph RAG fields in frontmatter
□ The 5 skills are internally consistent:
    SK-520 Section 3 references SK-522's 5-field structure by name
    SK-521 Section 4 references SK-522's 5-field structure by name
    SK-524 Section 3 references SK-520, SK-521 context packages by name
    SK-524 Section 3 includes Cycle 5 (Meta-Arbiter) visibility record
    SK-525 Section 3 references SK-524 execution record format by name
    SK-525 Section 5 PROMPT_PATCH references SK-472 WRONG/CORRECT format by name
```

If any check fails: fix before reporting complete.

**Print when done:**
```
"SKILL PREPARATION COMPLETE
 SK-522: planning--ai-context-package-authoring-SKILL.md ✅
 SK-520: planning--intent-to-plan-SKILL.md ✅
 SK-521: planning--depth-decision-SKILL.md ✅
 SK-524: planning--cycle-visibility-design-SKILL.md ✅
 SK-525: planning--meta-arbiter-SKILL.md ✅

 Flow plan guide steps now unblocked:
   Step 2:    SK-520 ✅
   Steps 6-7: SK-521 ✅
   Steps 2,4,6: SK-522 ✅
   Step 9:    SK-524 ✅
   Bad grade handling: SK-525 ✅

 Remaining: SK-523 (configuration-selection) — deferred to Phase 2
            SK-525 Phase 2 additions: CONNECTION_CHANGE + RETRIEVAL_CHANGE"
```

---

## WHAT TO DO IF CONTEXT RUNS LOW MID-SESSION

Each skill is one independent unit. If context runs low:

1. Save state to docs\flow-plan-prep-temp\SKILL-PREP-STATE.json
2. Save in-progress skill as [skill-filename]-PARTIAL.md in same directory
3. Print: "Context low. [SK-NNN] at section [N]. Resume: read state, read
   PARTIAL file, continue from section [N]."
4. Stop cleanly

The next session reads state, finds the PARTIAL file, and resumes from the
correct section. No work is lost.

---

## DOCUMENT CHECKLIST

```
□ SKILL-PREP-STATE.json
□ planning--ai-context-package-authoring-SKILL.md  (SK-522)
□ planning--intent-to-plan-SKILL.md                (SK-520)
□ planning--depth-decision-SKILL.md                (SK-521)
□ planning--cycle-visibility-design-SKILL.md       (SK-524)
□ planning--meta-arbiter-SKILL.md                  (SK-525)
```
