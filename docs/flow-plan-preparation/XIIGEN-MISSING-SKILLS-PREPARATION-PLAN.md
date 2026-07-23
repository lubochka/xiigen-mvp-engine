# MISSING SKILLS PREPARATION — DETAILED PLAN FOR CLAUDE CODE
## Skills to produce: SK-520, SK-521, SK-522, SK-524
## Date: 2026-04-01
## Protocol: XIIGEN-EXECUTION-PROTOCOL.md applies throughout

---

## WHY THESE 4 SKILLS AND IN THIS ORDER

SK-522 defines what a context package IS — the format that SK-520 and SK-521
both produce. Writing SK-522 first means SK-520 and SK-521 are built on a
defined foundation, not guessed at.

SK-520 is the first hard block in the flow plan guide (Step 2). Every flow
plan preparation session stops here until SK-520 exists.

SK-521 is the second hard block (Steps 6-7). No flow can reach Cycle 3 without it.

SK-524 is a soft block (Step 9 has a fallback) but without it the visibility
records are incomplete and the learning loop is broken.

```
Build order:  SK-522 → SK-520 → SK-521 → SK-524
Unblock order: SK-520 → SK-521 → SK-522 → SK-524
```

Build in SK-522 first order — unblocking follows automatically.

---

## STATE FILE: SKILL-PREP-STATE.json

Save to: `/mnt/user-data/outputs/SKILL-PREP-STATE.json`
Read at the start of every session. Write after every step.

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
    }
  },

  "progress_log": [],
  "issues": []
}
```

---

## SKILL FILE FORMAT (MANDATORY — ALL 4 SKILLS)

Every skill file must use this exact format. No deviation.

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

## SKILL 1 OF 4 — SK-522: AI CONTEXT PACKAGE AUTHORING

**File to produce:** `planning--ai-context-package-authoring-SKILL.md`
**Save to:** `/mnt/user-data/outputs/planning--ai-context-package-authoring-SKILL.md`
**Also save to (codebase):** `.claude/skills/planning--ai-context-package-authoring-SKILL.md`

### Step 1A — Read before writing

Read these files in full before writing a single line of SK-522:

```
✅ .claude/skills/planning--session-file-authoring-SKILL.md   (SK-443)
   — understand instruction files: what SK-522 must NOT produce
✅ .claude/skills/planning--convergence-round-design-SKILL.md  (SK-452)
   — the challenger context package is an example of what SK-522 governs
✅ .claude/skills/planning--system-intake-SKILL.md             (SK-454)
   — the domain context package is another example
✅ .claude/skills/planning--output-contract-SKILL.md           (SK-448)
   — success criteria format
```

**Read from state:** nothing — this is the first skill, state starts empty.

**What to understand from the reading before writing:**
After reading, answer these three questions internally:

1. What is the exact difference between SK-443's instruction file and a
   context package? (Instruction file: tells Claude Code what to do step
   by step. Context package: gives AI the context to decide what to do.
   The decision is not in the document.)

2. What fields does SK-452's challenger context package have?
   (The challenger template is the best existing example of a context package.)

3. What is missing from SK-454's domain context package that a Cycle 1
   context package also needs?
   (SK-454 extracts from existing code. Cycle 1 starts from a user sentence.
   The extraction protocol changes but the output format is the same.)

If you cannot answer all three — re-read the files. Do not proceed.

### Step 1B — Write SK-522

SK-522 must contain these sections in this order:

**Section 1: THE FUNDAMENTAL DISTINCTION**
The single most important thing this skill teaches. Two columns:

| Instruction file (SK-443) | Context package (SK-522) |
|--------------------------|------------------------|
| Tells Claude Code: do step 1, then step 2 | Tells AI: here is intent, constraints, context, RAG seeds, success criteria |
| Output is prescribed — Claude Code executes it | Output is decided by AI — context package enables the decision |
| Fails if a step is ambiguous | Fails if a field is missing or mis-filled |
| Used for: session execution | Used for: AI-driven cycles (Cycle 1, 2, 3) |

One-sentence rule at the bottom of this section:
> If the document tells the AI WHAT to produce — it is an instruction file.
> If the document tells the AI WHAT IT NEEDS TO KNOW to decide — it is a context package.

**Section 2: THE 5-FIELD STRUCTURE**
Every context package has exactly these fields. No more. No fewer.

For each field: name, definition, what belongs in it, what does NOT belong in it,
what empty looks like and why it fails.

```
INTENT      — the user's exact request, verbatim. Never rephrased.
              Empty fails because: rephrasing changes scope silently.

DOMAIN      — what the system does for users. 2-3 sentences. No technology names.
              Empty fails because: AI cannot constrain its plan to the domain.

CONSTRAINTS — machine-enforced invariants only. Each stated as a verifiable condition.
              Empty fails because: AI produces unconstrained output that violates rules.

PRIOR_ART   — a RAG query that retrieves relevant prior work. Not the prior work itself.
              Empty is acceptable ONLY when explicitly stated as NO_PRIOR_ART.
              Empty without statement fails because: AI cannot learn from prior cycles.

SUCCESS     — what the output must look like. Format, not content.
              Empty fails because: AI cannot self-evaluate its output.
```

**Section 3: FIELD-BY-FIELD AUTHORING RULES**
For each of the 5 fields: one concrete good example and one concrete bad example.
Examples must be from the registration flow domain — the running example
established in the design vision document.

Good INTENT: `"I need a user registration flow for a NestJS application."`
Bad INTENT:  `"The system should handle user registration and authentication."`
Why bad: rephrased — scope shifted from "registration flow" to "registration
and authentication" — two different scopes.

(Write similar examples for all 5 fields.)

**Section 4: CONTEXT PACKAGE VERIFICATION CHECKLIST**
8 checks. Each returns TRUE or FALSE. All must be TRUE before the package is used.

```
□ INTENT contains the exact user sentence — character-for-character match
□ DOMAIN has no technology names (framework, database, library, API)
□ CONSTRAINTS lists only items that are machine-enforced — not preferences
□ Each constraint is stated as a verifiable condition — not as a description
□ PRIOR_ART is a query string — not a copied document
□ SUCCESS defines output FORMAT — not output content
□ No field references another document ("see X", "per Y")
□ No field contains a step or instruction ("first do X, then do Y")
```

**Section 5: WHAT MAKES A CONTEXT PACKAGE FAIL AT RUNTIME**
5 named failure modes. Each one states: what was in the package, what the AI
did with it, what the wrong output looked like.

Example failure mode:
```
FAILURE: INTENT_REPHRASED
In package: "The system should handle user onboarding."
User said:  "I need a user registration flow."
AI produced: an onboarding flow (correct for what was written)
             not a registration flow (correct for what was meant)
Detection:   Cycle 1 plan reviewer finds coverage gap on "registration"
Fix:         Copy user sentence verbatim. Never paraphrase intent.
```

(Write 4 more failure modes covering the other common mistakes.)

**Section 6: ANTI-PATTERNS + INTEGRATION**
Standard format per skill template above.

### Step 1C — Verify SK-522 answers the questions the flow plan guide asks

The flow plan guide uses SK-522 at Steps 2, 4, and 6. Run these answer tests:

```
ANSWER TEST 1 (Step 2 uses SK-522):
Question: "What are the 5 fields of a Cycle 1 context package?"
Test: Can Claude Code read SK-522 and list all 5 fields with their definitions?
Pass: Yes — Section 2 names all 5 with definitions
Fail: One or more fields missing or undefined

ANSWER TEST 2 (Step 4 uses SK-522):
Question: "How is a Cycle 2 context template different from a Cycle 1 package?"
Test: Does SK-522 explain that the template is a parameterised context package
      that runs once per step — not once per flow?
Pass: Section 2 or 3 addresses parameterisation explicitly
Fail: SK-522 only describes single-use packages

ANSWER TEST 3 (Step 6 uses SK-522):
Question: "What does a Cycle 3 context package look like?"
Test: Does SK-522's structure apply to a package that contains a verified NODE
      as its INTENT field?
Pass: The 5-field structure accommodates a NODE object in INTENT
Fail: INTENT is defined as "user sentence only" — too narrow
```

If any answer test fails: fix the relevant section before saving.

**Expected results for SK-522:**
```
□ File is 200-350 lines
□ YAML frontmatter complete: sk_number=SK-522, all required fields present
□ Section 1 contains the two-column distinction table + one-sentence rule
□ Section 2 names all 5 fields with definition + what-not-to-put + empty-fails-because
□ Section 3 has good/bad examples for all 5 fields from the registration domain
□ Section 4 has exactly 8 verification checks
□ Section 5 has exactly 5 named failure modes with detection + fix
□ All 3 answer tests pass
□ File saved to both output and codebase paths
```

**Bad results — STOP and fix:**
```
❌ Section 2 defines fewer than 5 fields
   → The flow plan guide requires exactly 5. Add the missing fields.
❌ Any field definition says "tell the AI what to do"
   → That is an instruction file, not a context package. Rewrite the field.
❌ Examples use a domain other than user registration
   → Replace with registration domain examples for consistency across all skills.
❌ Answer test 2 fails (parameterisation not covered)
   → Add a note to Section 2: "When a package is used as a template, the
     INTENT field is parameterised — it receives the current step's text
     at runtime, not a fixed user sentence."
❌ File is over 400 lines
   → The skill is too broad. Split into SK-522 (context package authoring)
     and a separate reference file for examples. Keep SKILL.md under 400.
```

**Write to state:**
```
skills.SK-522.status             → "COMPLETE"
skills.SK-522.file               → "planning--ai-context-package-authoring-SKILL.md"
skills.SK-522.sections_verified  → [list of 6 section names]
skills.SK-522.answer_tests_passed → ["ANSWER_TEST_1", "ANSWER_TEST_2", "ANSWER_TEST_3"]
current_skill                    → "SK-520"
current_step                     → 0
```

---

## SKILL 2 OF 4 — SK-520: INTENT TO PLAN

**File to produce:** `planning--intent-to-plan-SKILL.md`
**Save to:** `/mnt/user-data/outputs/planning--intent-to-plan-SKILL.md`
**Also save to (codebase):** `.claude/skills/planning--intent-to-plan-SKILL.md`

### Step 2A — Read before writing

```
✅ planning--ai-context-package-authoring-SKILL.md  (SK-522 — just written)
   — the context package format this skill produces
✅ .claude/skills/planning--requirement-to-flow-SKILL.md  (SK-492)
   — the closest existing skill: understand what it covers and where it stops
✅ .claude/skills/planning--system-intake-SKILL.md        (SK-454)
   — domain context extraction — feeds into the DOMAIN field
✅ .claude/skills/planning--simulation-protocol-SKILL.md  (SK-441)
   — verdict vocabulary: use for the plan reviewer test format
```

**Read from state:**
```
skills.SK-522.status  (must be COMPLETE before starting SK-520)
```

If SK-522 status is not COMPLETE — STOP. SK-520 depends on SK-522's
5-field format. Do not write SK-520 without SK-522 being verified.

### Step 2B — Write SK-520

SK-520 must contain these sections:

**Section 1: WHERE SK-520 STARTS (and where SK-492 stops)**
SK-492 takes a UML diagram or product spec and produces flows with task type IDs.
SK-520 takes a raw user sentence and produces plain-language plan steps with no
task type IDs. The distinction in one sentence:

> SK-492 maps structured requirements to known flow patterns.
> SK-520 extracts structured intent from unstructured natural language.

This section must name the gap SK-520 fills so Claude Code knows when to load
SK-520 instead of SK-492.

**Section 2: PARSING THE USER SENTENCE**
How to extract intent clauses from one sentence.

An intent clause is: one distinct thing the user is asking for.
Example: "I need a user registration flow for a NestJS application"
Clauses: [1] user registration [2] for NestJS

Rules for parsing:
- Every noun phrase that names a capability = one clause
- Infrastructure qualifiers ("for NestJS", "with Redis") = context, not a clause
- Multiple verbs in one sentence = multiple clauses
- Ambiguous clauses must be flagged — do not infer intent, surface the ambiguity

Minimum clause table format:
```
| Clause | Source phrase | Ambiguous? | If ambiguous: question to ask |
|--------|--------------|-----------|-------------------------------|
```

**Section 3: ASSEMBLING THE CYCLE 1 CONTEXT PACKAGE**
How to fill each of the 5 SK-522 fields from the parsed sentence.

For each field: the input source and the assembly rule.

```
INTENT       ← user sentence verbatim. No changes. Copy character by character.

DOMAIN       ← answer "what does this system do for users?"
               Source: domain context (extracted via SK-454 if existing codebase,
               or derived from the flow title if new system)
               Rule: 2-3 sentences. No technology names. Present tense.

CONSTRAINTS  ← invariants from FLOW-XX-PLAN-STATE.json state.invariants
               Rule: copy from state. Do not add new constraints here.
               Every item must be in state before it can appear here.

PRIOR_ART    ← RAG query constructed from intent clauses
               Query format: "prior plans for [clause 1] [clause 2] flow"
               If state.cycle1.plan_steps is empty (first run): "NO_PRIOR_ART"

SUCCESS      ← definition of what a valid plan step looks like for THIS flow
               Must state: ordering requirement, dependency link format,
               abstraction level rule, size range (min steps, max steps)
               Size range must be derived from clause count: min = clause count,
               max = clause count × 3
```

**Section 4: WHAT A VALID PLAN STEP LOOKS LIKE**
The format specification. Three properties every step must have.

```
1. PLAIN LANGUAGE — no technology names, no class names, no IDs
   Good: "Accept the user's email and password"
   Bad:  "Call POST /api/auth/register with email and password payload"

2. SINGLE RESPONSIBILITY — one clause per step
   Good: "Verify the email address is unique in the system"
   Bad:  "Verify the email is unique and create the user record"
   Why: two responsibilities = two steps. Combined steps break Cycle 2
        because convergence runs per step, not per responsibility.

3. DEPENDENCY DECLARED — if this step needs output from a prior step,
   name the prior step explicitly
   Good: "Send a verification email [requires: step 3 — user record created]"
   Bad:  "Send a verification email" (implied dependency, not declared)
```

**Section 5: THE PLAN REVIEWER PROTOCOL**
The Plan Reviewer AI checks the Planner's output. This section defines
what it checks and how it grades.

```
CHECK 1 — COVERAGE
For each intent clause from Section 2: does at least one plan step cover it?
Verdict per clause: COVERED / PARTIAL / MISSING
Plan grade = (COVERED count) / (total clause count)

CHECK 2 — ABSTRACTION
For each step: does it contain a technology name?
The reviewer checks against the technology list derived from the flow domain.
Any technology name found = step fails abstraction check.
Plan fails abstraction if ANY step fails.

CHECK 3 — SINGLE RESPONSIBILITY
For each step: does it describe more than one distinct action?
Signal: "and", "then", "also" in the same step sentence.
Each such word is a candidate split point. The reviewer flags — does not split.

CHECK 4 — DEPENDENCY COMPLETENESS
For each step that references a prior step: does the named prior step exist
in the plan and does it actually produce what is needed?
Missing or wrong dependency reference = DEPENDENCY_GAP.

GRADE FORMULA:
  coverage_score × abstraction_clean × responsibility_clean
  Threshold: stated in state.cycle1.grade_threshold
  Below threshold: plan fails. Cycle 1 reruns with reviewer feedback.
```

**Section 6: ANTI-PATTERNS + INTEGRATION**

**Expected results for SK-520:**
```
□ File is 200-350 lines
□ YAML frontmatter: sk_number=SK-520
□ Section 1 distinguishes SK-520 from SK-492 in one sentence
□ Section 2 clause table format is present and usable
□ Section 3 assembly rules cover all 5 SK-522 fields
□ Section 4 defines all 3 step properties with good/bad examples
□ Section 5 defines all 4 checks with grade formula
□ File saved to both paths
```

**Answer tests for SK-520 (Step 2 of flow plan guide uses it):**
```
ANSWER TEST 1:
Question: "How do I fill the INTENT field in the Cycle 1 context package?"
Pass: Section 3 says "user sentence verbatim — no changes"

ANSWER TEST 2:
Question: "How many plan steps should a 3-clause user sentence produce?"
Pass: Section 3 SUCCESS formula → min=3, max=9 steps

ANSWER TEST 3:
Question: "What does the plan reviewer check?"
Pass: Section 5 names 4 checks with grade formula
```

**Bad results — STOP and fix:**
```
❌ Section 3 does not cover all 5 SK-522 fields
   → Every field needs an assembly rule. Add the missing ones.
❌ Section 4 good/bad examples use a domain other than registration
   → Replace with registration domain examples.
❌ Grade formula references a threshold not in state
   → The threshold is state.cycle1.grade_threshold — set by Step 3 of
     the flow plan guide. The formula reads from state, not from the skill.
     Fix: reference state.cycle1.grade_threshold explicitly.
❌ Answer test 2 fails (size range not derived from clause count)
   → Add the derivation formula: min=clause_count, max=clause_count × 3.
```

**Write to state:**
```
skills.SK-520.status              → "COMPLETE"
skills.SK-520.file                → "planning--intent-to-plan-SKILL.md"
skills.SK-520.sections_verified   → [list of 6 section names]
skills.SK-520.answer_tests_passed → ["ANSWER_TEST_1", "ANSWER_TEST_2", "ANSWER_TEST_3"]
current_skill                     → "SK-521"
current_step                      → 0
```

---

## SKILL 3 OF 4 — SK-521: DEPTH DECISION

**File to produce:** `planning--depth-decision-SKILL.md`
**Save to:** `/mnt/user-data/outputs/planning--depth-decision-SKILL.md`
**Also save to (codebase):** `.claude/skills/planning--depth-decision-SKILL.md`

### Step 3A — Read before writing

```
✅ planning--ai-context-package-authoring-SKILL.md   (SK-522 — written)
   — context package format for Cycle 3
✅ .claude/skills/code-execution--node-convergence-SKILL.md  (SK-435)
   — NODE structure: which fields inform the depth decision
✅ .claude/skills/planning--freedom-machine-classification-SKILL.md  (SK-451)
   — the termination depth is a MACHINE constraint — understand why
✅ .claude/skills/planning--problem-decomposition-SKILL.md   (SK-430)
   — structural analogy: how this skill relates without duplicating
```

**Read from state:**
```
skills.SK-522.status  (must be COMPLETE)
skills.SK-520.status  (must be COMPLETE)
```

### Step 3B — Write SK-521

**Section 1: WHAT THE DEPTH DECISION IS**
After a NODE is verified by Cycle 2, one question must be answered:
is this a LEAF (generate an executor directly) or EXPAND (this NODE contains
multiple distinct responsibilities that each need their own NODE)?

The depth decision is made by AI. It is not a rule. It is a judgment informed
by the NODE's content and prior depth decisions for similar NODEs.

This section must state: who makes this decision (AI), what it receives
(verified NODE + depth context), what it produces (LEAF or EXPAND + justification).

**Section 2: THE COMPLEXITY SIGNALS**
Observable properties of a NODE that suggest expansion is warranted.
Each signal references a specific NODE field.

```
SIGNAL 1 — MULTI-RESPONSIBILITY INTENT
Field:   node.intent.purpose
Trigger: the purpose sentence contains more than one distinct action
         (signal words: "and", "then", "as well as", "also")
Weight:  moderate — present but not sufficient alone

SIGNAL 2 — MULTIPLE INDEPENDENT INPUT TYPES
Field:   node.structure.inputShape
Trigger: more than 3 distinct input types with no shared schema
Weight:  strong — independent inputs suggest independent processing paths

SIGNAL 3 — MULTIPLE INDEPENDENT FAILURE MODES
Field:   node.quality.scoringCriteria
Trigger: more than 2 failure modes that cannot be detected by the same check
Weight:  strong — independent failures = independent responsibilities

SIGNAL 4 — CROSS-DOMAIN CONSTRAINTS
Field:   node.constraints
Trigger: constraints from more than 2 different domain areas
         (e.g. security constraint + data integrity constraint + scheduling constraint)
Weight:  moderate — cross-domain often means cross-responsibility

SIGNAL 5 — HIGH QUALITY THRESHOLD WITH BROAD SCOPE
Field:   node.quality.acceptanceThreshold + node.intent.purpose
Trigger: threshold > 0.90 AND purpose covers more than one user-visible outcome
Weight:  weak alone — requires another signal to justify expansion
```

No single signal forces expansion. The AI weighs the combination.
The skill provides the signals — the AI provides the judgment.

**Section 3: THE TERMINATION BOUND**
The termination bound is a MACHINE constraint (SK-451).
It cannot be overridden by AI judgment.

Rules:
- Every flow plan must declare its termination_depth in
  state.cycle3.termination_depth before Cycle 3 runs
- At depth = termination_depth, the verdict is always LEAF
  regardless of complexity signals
- Default termination depth: 3 (if not declared in state)
- Maximum termination depth: 5 (above 5 requires explicit Luba approval)

This section must explain WHY the bound is a machine constraint:
unbounded recursion produces exponentially growing topologies that cannot
be tested, reviewed, or debugged in finite sessions.

**Section 4: ASSEMBLING THE CYCLE 3 CONTEXT PACKAGE**
How to fill the 5 SK-522 fields for the depth decision.

```
INTENT       ← the verified NODE (full object from Cycle 2 output)
               Not the user sentence — the NODE is the intent at this level.

DOMAIN       ← current depth level + flow domain
               "Depth 2 node in user registration flow"

CONSTRAINTS  ← two constraints always present:
               1. Termination bound from state.cycle3.termination_depth
               2. Sub-flow coherence rule: "no two sub-nodes may have
                  overlapping intent clauses"

PRIOR_ART    ← RAG query: "depth decisions for [archetype] nodes at depth [N]"
               where archetype comes from the NODE's structure

SUCCESS      ← two acceptable outputs:
               LEAF: verdict + at least one signal checked as NOT triggered
               EXPAND: verdict + at least one signal cited as triggered +
                       proposed sub-flow decomposition in plain language
```

**Section 5: VERIFYING THE DEPTH DECISION OUTPUT**
Three checks the flow plan guide runs on every depth decision.

```
CHECK 1 — JUSTIFICATION PRESENT
Acceptable LEAF:   "LEAF — signals 1-5 checked, none triggered"
Acceptable EXPAND: "EXPAND — signals 2 and 3 triggered: [evidence from NODE]"
Failing output:    "LEAF" or "EXPAND" with no signal reference

CHECK 2 — TERMINATION BOUND RESPECTED
At depth = state.cycle3.termination_depth: verdict must be LEAF
Test: pass the same NODE through depth decision at the termination depth.
Expected: LEAF regardless of signals.
Failing: EXPAND at the termination depth.

CHECK 3 — SUB-FLOW NON-OVERLAP (EXPAND only)
Each proposed sub-node names its responsibility in one phrase.
Test: do any two phrases cover the same user-facing action?
If yes: merge those sub-nodes before proceeding.
Failing: "sub-node A: verify email" + "sub-node B: check email uniqueness"
         (both cover email validation — one sub-node, not two)
```

**Section 6: ANTI-PATTERNS + INTEGRATION**

**Expected results for SK-521:**
```
□ File is 200-350 lines
□ YAML frontmatter: sk_number=SK-521
□ Section 2 has exactly 5 named signals, each referencing a specific NODE field
□ Section 3 states default termination depth (3) and maximum (5)
□ Section 4 covers all 5 SK-522 fields with LEAF/EXPAND distinctions
□ Section 5 has exactly 3 checks
□ File saved to both paths
```

**Answer tests for SK-521 (Steps 6-7 of flow plan guide use it):**
```
ANSWER TEST 1:
Question: "What complexity signals tell the AI to expand a NODE?"
Pass: Section 2 lists 5 named signals with NODE field references

ANSWER TEST 2:
Question: "What is the default termination depth?"
Pass: Section 3 states 3

ANSWER TEST 3:
Question: "What must an EXPAND verdict contain?"
Pass: Section 5 check 1 states: verdict + signal cited + sub-flow decomposition
```

**Bad results — STOP and fix:**
```
❌ Complexity signals are rules ("if X then expand")
   → Replace with weighted signals. The AI weighs the combination.
   → No single signal is sufficient. No threshold triggers automatic expansion.
❌ Termination bound not declared as a machine constraint
   → Section 3 must explicitly reference SK-451 MACHINE classification.
❌ Section 4 EXPAND output format does not require sub-flow decomposition
   → EXPAND without a sub-flow plan is an incomplete verdict.
   → The sub-flow decomposition is what feeds the next Cycle 1.
❌ Answer test 3 fails (sub-flow decomposition not required in output)
   → Add to Section 5 check 1: "EXPAND must include proposed sub-flow
     decomposition — plain language names for each sub-node."
```

**Write to state:**
```
skills.SK-521.status              → "COMPLETE"
skills.SK-521.file                → "planning--depth-decision-SKILL.md"
skills.SK-521.sections_verified   → [list of 6 section names]
skills.SK-521.answer_tests_passed → ["ANSWER_TEST_1", "ANSWER_TEST_2", "ANSWER_TEST_3"]
current_skill                     → "SK-524"
current_step                      → 0
```

---

## SKILL 4 OF 4 — SK-524: CYCLE VISIBILITY DESIGN

**File to produce:** `planning--cycle-visibility-design-SKILL.md`
**Save to:** `/mnt/user-data/outputs/planning--cycle-visibility-design-SKILL.md`
**Also save to (codebase):** `.claude/skills/planning--cycle-visibility-design-SKILL.md`

### Step 4A — Read before writing

```
✅ planning--ai-context-package-authoring-SKILL.md    (SK-522 — written)
   — the SENT field in every visibility record is a context package
✅ .claude/skills/code-execution--learning-signal-capture-SKILL.md
   — DPO triple format — the CHANGED field updates this
✅ .claude/skills/planning--output-contract-SKILL.md   (SK-448)
   — output contract pattern — each cycle's visibility record is an output contract
✅ .claude/skills/planning--confidence-lifecycle-design-SKILL.md  (SK-512)
   — what gets updated in the decision graph after each cycle (CHANGED field)
```

**Read from state:**
```
skills.SK-522.status  (must be COMPLETE)
skills.SK-520.status  (must be COMPLETE)
skills.SK-521.status  (must be COMPLETE)
```

### Step 4B — Write SK-524

**Section 1: WHY VISIBILITY IS A MACHINE REQUIREMENT**
The visibility record is not a log. It is the only way to verify that
a cycle produced learning. Without it, three things break:

1. Testing: you cannot check whether the cycle produced the right output
   because you cannot see what the AI was given or what it decided
2. Learning: the CHANGED field is how RAG and the decision graph are updated —
   without it, every cycle runs without improving the system
3. Debugging: when a cycle produces wrong output, the visibility record
   is the only way to trace which input caused the wrong decision

This section must state the rule:
> A cycle with no visibility record is a cycle that never ran.
> Its output cannot be trusted and its learning cannot be captured.

**Section 2: THE 4-FIELD RECORD STRUCTURE**
Every cycle emits one visibility record. All 4 fields are required.
An empty field is a failed record — not an acceptable output.

```
SENT
What: the full context package given to the AI for this cycle
Required: must be the complete SK-522 package — not a summary
Empty fails because: cannot verify the AI received correct inputs
Complete means: all 5 SK-522 fields present with their actual values

RECEIVED
What: each model's output, labelled and unmodified
Required: one entry per model called, labelled A/B/C (shuffled)
Empty fails because: cannot verify multi-model generation ran correctly
Complete means: N entries where N = number of models called, each with
               model label, output content, token count

DECIDED
What: the winner + the judge's reasoning
Required: winner label AND reasoning that references the context package
Empty fails because: cannot verify the judge made a defensible choice
Complete means: "Winner: [label] because [reference to criterion in SENT]"
               "Winner: B" alone is NOT complete — reasoning is required

CHANGED
What: what in RAG or the decision graph was updated as a result
Required: at minimum one entry naming the index updated and the key
Empty fails because: a cycle that changed nothing produced no learning
Complete means: "Updated [index name] key [key value] with [what changed]"
               "Nothing changed" is a valid entry ONLY if explicitly stated
               with reasoning — silent empty field fails
```

**Section 3: PER-CYCLE RECORD SPECIFICATIONS**
What each field contains for each of the 4 cycles specifically.

For Cycle 1 (Intent to Plan):
```
SENT:     The Cycle 1 context package — 5 fields per SK-520
RECEIVED: One plan from the Planner AI + gap analysis from the Plan Reviewer
DECIDED:  The plan accepted/rejected decision + specific gap list
CHANGED:  RAG index "xiigen-rag-patterns" updated with this plan if accepted
```

For Cycle 2 (Step to NODE):
```
SENT:     The Cycle 2 context package for this step — 5 fields per SK-522
RECEIVED: Three NODE candidates labelled A/B/C (shuffled)
DECIDED:  Winning NODE label + judge's reasoning + each arbiter's verdict
CHANGED:  RAG index "xiigen-rag-patterns" updated with winning NODE
          Decision graph edges updated for archetype confidence
```

For Cycle 3 (Depth Decision):
```
SENT:     The Cycle 3 context package — verified NODE + depth context
RECEIVED: LEAF or EXPAND verdict with justification
DECIDED:  Final verdict + signal evidence cited
CHANGED:  RAG index "xiigen-depth-decisions" updated with this decision
          state.cycle3.depth_history updated
```

For Cycle 4 (Leaf to Executor):
```
SENT:     The executor context package — leaf NODE + configuration selection
RECEIVED: Three executor candidates labelled A/B/C (shuffled) + judge verdict
DECIDED:  Winning executor + judge score + arbiter verdicts
CHANGED:  DPO triple stored to training index
          Configuration performance record updated
```

**Section 4: COMPLETENESS TEST**
One test that verifies the full chain is traceable.

> Given only the 4 visibility records from one complete flow execution
> (all 4 cycles for one leaf node), can you reconstruct:
> (a) what the user originally asked?
> (b) which model produced the winning executor?
> (c) why the depth decision was LEAF?
> (d) what changed in the decision graph?
>
> If any of (a)-(d) cannot be answered from the records alone:
> the visibility contract for that cycle is incomplete.

This test is run at Step 10 of the flow plan guide (chain review).

**Section 5: ANTI-PATTERNS + INTEGRATION**

**Expected results for SK-524:**
```
□ File is 200-350 lines
□ YAML frontmatter: sk_number=SK-524
□ Section 1 states the machine requirement rule verbatim
□ Section 2 defines all 4 fields with "empty fails because" for each
□ Section 3 has per-cycle specifications for all 4 cycles
□ Section 4 has the completeness test with 4 verifiable questions
□ File saved to both paths
```

**Answer tests for SK-524 (Step 9 of flow plan guide uses it):**
```
ANSWER TEST 1:
Question: "What are the 4 fields in a visibility record?"
Pass: Section 2 names all 4 with required-content definition

ANSWER TEST 2:
Question: "What does the DECIDED field require beyond naming the winner?"
Pass: Section 2 states "reasoning that references the context package"

ANSWER TEST 3:
Question: "How do I verify my visibility contracts are complete?"
Pass: Section 4 provides the 4-question completeness test
```

**Bad results — STOP and fix:**
```
❌ CHANGED field is described as optional
   → It is required. "Nothing changed" is acceptable only when explicitly
     stated with reasoning. Silent empty field always fails.
❌ Cycle 3 visibility record is missing from Section 3
   → Depth decisions that leave no record are untraceable. Add it.
❌ DECIDED field only requires naming the winner
   → Winner alone is not complete. Reasoning referencing the SENT context
     is required. Update Section 2 DECIDED definition.
❌ Completeness test has fewer than 4 questions
   → Each question covers one cycle. All 4 cycles must be testable.
```

**Write to state:**
```
skills.SK-524.status              → "COMPLETE"
skills.SK-524.file                → "planning--cycle-visibility-design-SKILL.md"
skills.SK-524.sections_verified   → [list of 5 section names]
skills.SK-524.answer_tests_passed → ["ANSWER_TEST_1", "ANSWER_TEST_2", "ANSWER_TEST_3"]
current_skill                     → "DONE"
current_step                      → 0
```

---

## FINAL VERIFICATION — ALL 4 SKILLS COMPLETE

After all 4 skills are written, run this check before declaring the session done.

```
□ SKILL-PREP-STATE.json shows all 4 skills with status=COMPLETE
□ All 4 files exist at /mnt/user-data/outputs/ (verify with ls)
□ All 4 files exist in .claude/skills/ (verify with ls)
□ All 12 answer tests passed (3 per skill × 4 skills)
□ No skill is over 400 lines (verify with wc -l)
□ No skill references another skill by filename — only by SK number
□ The 4 skills are internally consistent:
    SK-520 Section 3 references SK-522's 5-field structure by name
    SK-521 Section 4 references SK-522's 5-field structure by name
    SK-524 Section 3 references SK-520, SK-521 context packages by name
```

If any check fails: fix before reporting complete.

**Print when done:**
```
"SKILL PREPARATION COMPLETE
 SK-522: planning--ai-context-package-authoring-SKILL.md ✅
 SK-520: planning--intent-to-plan-SKILL.md ✅
 SK-521: planning--depth-decision-SKILL.md ✅
 SK-524: planning--cycle-visibility-design-SKILL.md ✅

 Flow plan guide steps now unblocked:
   Step 2: SK-520 ✅
   Steps 6-7: SK-521 ✅
   Steps 2,4,6: SK-522 ✅
   Step 9: SK-524 ✅

 Remaining soft-block: SK-523 (configuration-selection) — Step not yet specified."
```

---

## WHAT TO DO IF CONTEXT RUNS LOW MID-SESSION

Each skill is one independent unit. If context runs low:
1. Save state with current skill status
2. Save the in-progress skill file as PARTIAL (e.g. `planning--intent-to-plan-SKILL-PARTIAL.md`)
3. Print: "Context low. [SK-NNN] at section [N]. Resume: read state, read
   PARTIAL file, continue from section [N]."
4. Stop cleanly

The next session reads state, finds the PARTIAL file, and resumes from the
correct section. No work is lost.

---

## DOCUMENT CHECKLIST

```
□ SKILL-PREP-STATE.json
□ planning--ai-context-package-authoring-SKILL.md   (SK-522)
□ planning--intent-to-plan-SKILL.md                  (SK-520)
□ planning--depth-decision-SKILL.md                  (SK-521)
□ planning--cycle-visibility-design-SKILL.md         (SK-524)
```
