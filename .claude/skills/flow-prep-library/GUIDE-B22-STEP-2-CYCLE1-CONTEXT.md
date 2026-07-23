# GUIDE-B22 — How to Produce `FLOW-XX-STEP-2-CYCLE1-CONTEXT.md`
## Library guidance file — FLOW-PREP-LIBRARY-MASTER-PLAN v6.1-FINAL
## Produced: Round 32 | Phase 4 (Guidance File Authoring)
## Date: 2026-04-20

---

## FINAL GOAL (re-read before authoring any FLOW-XX-STEP-2-CYCLE1-CONTEXT.md):
> "Taking the produced library as a result of this plan run — same size as list B —
> and applying on new flow specs, we will get proper list B for this flow."

This file is the STEP-2-CYCLE1-CONTEXT guidance: one of the 50 guidance files that
together constitute the library. When Claude Code applies this guidance to a new
flow's state and spec, it will produce a correct Cycle 1 context package that enables
the Planner AI to produce a valid plan without hallucinating scope.

---

## WHAT THIS FILE IS

`FLOW-XX-STEP-2-CYCLE1-CONTEXT.md` is **Step 2 of the 10-step simulation pipeline**.
It produces the 5-field SK-522 context package that the Cycle 1 Planner AI receives.
The Planner AI produces a plan using only this document — it must be self-contained.

**Position in sequence:**
```
Step 1 → INVARIANTS (anchors constraints)
Step 2 → CYCLE 1 CONTEXT (this file — tells the Planner AI what to plan)
Step 3 → CYCLE 1 TEST (grades the plan)
...
```

**What the Planner AI does with this package:**
It produces a set of ordered plain-language plan steps — one per responsibility
in the flow. Each step names a user-facing action, has no technology names, and
declares its dependency on prior steps if needed. The Planner AI does NOT implement
anything — it decomposes the intent into actionable steps at user-action level.

**The single most important rule:**
> The INTENT field must be the user's sentence verbatim — character for character.
> No rephrasing. No additions. No paraphrasing.
>
> Any change to INTENT causes the Planner AI to plan for what was written, not what
> was meant. Scope drift is invisible at authoring time but produces wrong plans.

---

## LIST A SOURCES FOR THIS GUIDANCE FILE

| ZIP | Role | Specific files |
|-----|------|----------------|
| ZIP-11 | PRIMARY | `FLOW-09-STEP-2-CYCLE1-CONTEXT.md` — compressed v2 format: 5-field package inside code block, QUESTION YOURSELF inline, state write |
| ZIP-11 | PRIMARY | `FLOW-01-STEP-2-CYCLE1-CONTEXT.md` — rich v1 format: full SK-522/SK-520 execution with intent clause analysis, step range derivation, 3 plan step properties with good/bad examples, QUESTION YOURSELF with 4 checks, SK-443 self-containment verification, expected/bad results |
| ZIP-11 | COMPARISON | `FLOW-03-STEP-2-CYCLE1-CONTEXT.md`, `FLOW-07-STEP-2-CYCLE1-CONTEXT.md` — show compressed format for different domains |
| ZIP-01 | PRIMARY | `XIIGEN-DESIGN-ARCHITECT-SESSION-GUIDE-v1.7.md` §Q4 — output contract definition: "one sentence describing what done looks like for this round" — applies to authoring the SUCCESS field |
| ZIP-Project | PRIMARY | `planning--ai-context-package-authoring-SKILL.md` (SK-522) — defines the 5-field structure: INTENT (verbatim), DOMAIN (2-3 sentences, no tech names), CONSTRAINTS (from state.invariants only), PRIOR_ART (RAG query string), SUCCESS (what a valid plan step looks like) |
| ZIP-Project | PRIMARY | `planning--intent-to-plan-SKILL.md` (SK-520) — governs intent clause parsing, step size range derivation, QUESTION YOURSELF format, abstraction level requirements |
| ZIP-Project | REFERENCE | `planning--session-file-authoring-SKILL.md` (SK-443) — 7 self-containment checks that the context package must pass: no cross-references, no undefined variables, no unfilled placeholders |

---

## OUTPUT FILE SPECIFICATION

**Target path:** `docs/sessions/FLOW-XX/FLOW-XX-STEP-2-CYCLE1-CONTEXT.md`

**Also updates:** `FLOW-XX-PLAN-STATE.json` with `cycle1.context_package_file`

---

## THE TWO FORMATS

**v2 compressed (FLOW-09 style — use for new flows):**
Presents the complete 5-field package inside a single code block with QUESTION
YOURSELF inline. Short, dense, immediately executable.

**v1 rich (FLOW-01 style — use when explicit reasoning is needed):**
Includes intent clause analysis table, step size range derivation, 3 plan step
properties with good/bad examples, QUESTION YOURSELF section with 4 explicit
checks, SK-443 self-containment verification, expected results, bad results.
Use v1 for flows with unusual intent structure, ambiguous clauses, or new domains.

---

## THE 5-FIELD SK-522 STRUCTURE

Every context package has exactly these 5 fields — no more, no fewer:

| Field | Source | Rule |
|-------|--------|------|
| INTENT | `user_intent` from PLAN-STATE.json | **Verbatim — character for character. No changes.** |
| DOMAIN | Flow spec + task range | 2-3 sentences. No technology names (no Redis, Elasticsearch, NestJS, etc.) |
| CONSTRAINTS | `state.invariants` (all 4 lists) | Copy from state. Do not invent new constraints here. |
| PRIOR_ART | RAG query string | Write the query, not the result. Format: "prior plans for [clause keywords] [domain type] flow" |
| SUCCESS | Derived from clause count + complexity | What a valid plan step looks like: 3 properties + size range + QUESTION YOURSELF |

---

## HOW TO PRODUCE THE FILE (v2 FORMAT — DEFAULT)

### Step 1 — Read PLAN-STATE.json

Before authoring, extract the values the file depends on:

```bash
node -e "
const s = JSON.parse(require('fs').readFileSync('FLOW-XX-PLAN-STATE.json'));
console.log('user_intent:', s.user_intent);
console.log('flow_id:', s.flowId);
console.log('task_range:', s.task_range);
console.log('domain:', s.domain);
console.log('focus:', s.focus || 'not set — read from flow spec');
console.log('invariants DNA count:', (s.non_negotiables || []).length);
"
```

### Step 2 — Parse the intent clauses (SK-520 Section 2)

Before writing the package, identify the distinct capabilities in the user intent.
This drives the SUCCESS field size range.

| # | Clause | Source phrase | Ambiguous? |
|---|--------|--------------|-----------|
| 1 | [first capability] | "[exact phrase]" | No |
| 2 | [second capability] | "[exact phrase]" | No |

Step size range derivation:
- Formula min: `max(clause_count, 3)` — adjust upward for domain complexity, state reasoning
- Formula max: `min(clause_count × 3, 12)` — adjust for complexity, state reasoning
- Example (3 clauses, medium complexity): min=5, max=9

### Step 3 — Write the file header

```markdown
# FLOW-XX — STEP 2: CYCLE 1 CONTEXT PACKAGE
## Status: COMPLETE
## Skills loaded: planning--intent-to-plan-SKILL.md (SK-520), planning--ai-context-package-authoring-SKILL.md (SK-522)
```

### Step 4 — Write the TASK section

```markdown
---

## TASK

Produce the 5-field SK-522 context package that Cycle 1 (Planner) will receive.
```

### Step 5 — Write the CONTEXT PACKAGE

The package is presented as a single code block. Every field is required.

```markdown
---

## CONTEXT PACKAGE

```
INTENT:
  verbatim_user_intent: "[paste user_intent from state VERBATIM — no changes]"

  QUESTION YOURSELF:
    - Does this intent contain every task type that needs a plan step?
    - Is the domain specific enough that the AI will not hallucinate scope?
    - If you removed one clause, would a step be lost?
    Answer: [Yes/No + brief justification — e.g., "Yes — T[NNN]-T[NNN+M] named, domain explicit, focus areas enumerated."]

DOMAIN:
  flow_id:      FLOW-XX
  title:        [Flow human name]
  task_range:   T[NNN]-T[NNN+M]
  focus:        [2-3 focus keywords from flow spec — same as Step 1 FLOW IDENTITY]
  domain:       [Domain family — e.g., XIIGen Community Platform — Social]
  depth_level:  0  (root — no parent node)

CONSTRAINTS:
  - DNA-1: Record<string, unknown> — no typed entity classes
  - DNA-2: BuildSearchFilter — no hand-built query DSL
  - DNA-3: DataProcessResult<T> — no throw for business logic
  - DNA-4: MicroserviceBase — all services extend base
  - DNA-5: AsyncLocalStorage tenant scope — no tenantId param
  - DNA-6: DynamicController — no entity-specific controllers
  - DNA-7: Idempotency keys on all queue consumers
  - DNA-8: storeDocument() before enqueue()
  - DNA-9: CloudEvents envelope for inter-service events
  - BFA cross-flow validation required before deployment
  [Add any flow-specific BFA or iron rules from Step 1 here]

PRIOR_ART: "prior plans for [focus-keyword-1] [focus-keyword-2] [domain-type] flow"

SUCCESS:
  plan_accepted_when:
    - Every task type in T[NNN]-T[NNN+M] has >= 1 dedicated plan step
    - Each step scoped to one responsibility (single task type per step)
    - No step uses direct SDK imports
    - No step creates entity-specific controllers
    - Grade >= 0.85 from Plan Reviewer (SK-520 Section 5)
```
```

### Step 6 — Write the STATE WRITE

```markdown
---

## STATE WRITE

```
cycle1.context_package_file → "FLOW-XX-STEP-2-CYCLE1-CONTEXT.md"
step_status                 → "COMPLETE"
```

Apply to PLAN-STATE.json:
```bash
node -e "
const fs = require('fs');
const s = JSON.parse(fs.readFileSync('FLOW-XX-PLAN-STATE.json'));
s.cycle1 = s.cycle1 || {};
s.cycle1.context_package_file = 'FLOW-XX-STEP-2-CYCLE1-CONTEXT.md';
s.cycle1.status = 'CONTEXT_PACKAGE_READY';
s.current_step = 2;
s.step_status = 'COMPLETE';
fs.writeFileSync('FLOW-XX-PLAN-STATE.json', JSON.stringify(s, null, 2));
console.log('STATE written. cycle1.status:', s.cycle1.status);
"
```
```

### Step 7 — Close

```markdown
---

**STEP 2 COMPLETE**
```

---

## HOW TO PRODUCE THE FILE (v1 FORMAT — WHEN NEEDED)

Use v1 when any of these apply:
- Intent clauses are ambiguous and need explicit parsing
- The domain is new and needs a longer domain field
- Flow-specific BFA rules introduce non-standard constraints

v1 adds these sections before the CONTEXT PACKAGE:

### Additional section: SKILLS LOADED THIS STEP

```markdown
---

## SKILLS LOADED THIS STEP

- ✅ planning--intent-to-plan-SKILL.md (SK-520)
  — governs content rules for each field: INTENT verbatim, DOMAIN 2-3 sentences no tech names,
    CONSTRAINTS from state.invariants only, PRIOR_ART as query string, SUCCESS with step
    properties, size range, and dependency format.

- ✅ planning--ai-context-package-authoring-SKILL.md (SK-522)
  — 5-field structure, field-by-field authoring rules, verification checklist.
    The fundamental distinction: context package vs instruction file.

- ✅ planning--session-file-authoring-SKILL.md (SK-443)
  — 7 self-containment checks applied to this context package before sending.

- ✅ planning--system-intake-SKILL.md (SK-454)
  — domain field extraction from existing artifacts.
```

### Additional section: INTENT CLAUSE ANALYSIS

```markdown
---

## INTENT CLAUSE ANALYSIS (SK-520 Section 2 — required before writing)

Sentence: "[verbatim user intent]"

| # | Clause | Source phrase | Ambiguous? |
|---|--------|--------------|-----------|
| 1 | [clause] | "[source phrase]" | No |
| 2 | [clause] | "[source phrase]" | No |

Clause count: **[N]**

Step size derivation:
- Formula min: max([N], 3) = [result]
- Domain adjustment: [reasoning for adjustment] — **minimum raised/kept to [M]**
- Formula max: min([N]×3, 12) = [result]
- Domain adjustment: [reasoning] — **maximum [raised/kept/stays] at [M]**
- Final range: **[min]–[max] steps**
```

### v1 CONTEXT PACKAGE: Full property definitions

In v1, the SUCCESS field includes explicit 3-property definitions with good/bad
examples and the full QUESTION YOURSELF section:

**Field: SUCCESS_FORMAT** (expanded for v1):

```markdown
### SUCCESS_FORMAT

A valid plan step for this flow satisfies all three properties. The Planner AI
must produce steps that pass all three checks.

**Property 1 — PLAIN LANGUAGE**
The step names a user-facing action. No technology names, framework names, database
names, library names, class names, method names, or API paths.

```
Good: "[plain language example for this flow's domain]"
Bad:  "[technology-laden example that would be invalid]"
      — contains [technology name]
```

**Property 2 — SINGLE RESPONSIBILITY**
One step names exactly one distinct user-facing action.

```
Good: "[example with single action]"
Bad:  "[example with two actions combined with 'and']"
      — two actions ([action 1] + [action 2])

Split rule: if each part makes sense as a standalone step — split.
```

**Property 3 — DEPENDENCY DECLARED**
If a step requires output from a prior step, the prior step is named explicitly.

```
Good: "[step description]
       [requires: Step N — [what is needed from step N]]"
Bad:  "[same step description without the requires clause]"
      (when a prior step creates what this step uses)
```

**Size constraint:** The plan must contain between **[min] and [max] steps** (inclusive).

---

**QUESTION YOURSELF** *(Planner AI: verify these before returning your plan)*

```
Q1 — COVERAGE: Does each intent clause have >= 1 step that names it as primary subject?
     Clause 1: "[exact clause text]"
     Clause 2: "[exact clause text]"
     Failing: any clause with no step addressing it → revise.

Q2 — SINGLE RESPONSIBILITY: Does every step contain exactly one user-facing action?
     Check each step for "and", "then", "also", "as well as".
     If each part could stand alone → split.

Q3 — SIZE: Does the plan contain between [min] and [max] steps?
     Fewer than [min] → at least one clause is missing or collapsed.
     More than [max] → steps are at implementation level, not user-action level.

Q4 — ABSTRACTION: Does any step text contain a technology name, class name, method
     name, or API path?
     Forbidden: [list relevant tech names for this domain].
     If found → replace with what the system does for the user, in plain language.
```
```

### v1 additional section: SK-443 SELF-CONTAINMENT CHECKS

```markdown
---

## SK-443 SELF-CONTAINMENT CHECKS

Running checks 1-7 against this context package:

1. **No cross-references** — no "see PLAN.md", "per SK-NNN" phrases ✅
2. **No undefined variables** — no `${VAR}` shell-style variables ✅
3. **No principle references** — no "apply P17" phrases; constraints quoted inline ✅
4. **No unfilled placeholders** — no `<PLACEHOLDER>` patterns ✅
5. **Gate commands are literal** — no "verify that" English descriptions ✅
6. **No mid-document skill references** — skills were loaded before, not referenced during ✅
7. **No partial API call bodies** — no API calls in a context package document ✅

All 7 checks: **0 hits** ✅
```

---

## FIELD-BY-FIELD AUTHORING RULES

### INTENT field — verbatim copy rule

```
Source:  user_intent from PLAN-STATE.json
Test:    character-by-character comparison
Failure: ANY word added, removed, or changed = scope drift

Anti-patterns:
  ❌ "When a new user registers, verify their email."
     — shortened (missing clauses)
  ❌ "Handle user registration and email verification."
     — paraphrased (loses specificity)
  ✅ "When a new user registers for the XIIGen community platform, verify their
      email address before granting access, and deliver onboarding materials..."
     — verbatim
```

### DOMAIN field — no technology names

```
Source:  Flow spec domain description + task type context
Format:  2-3 sentences describing what the system does for users, not how it does it
Test:    Read aloud — does it sound like a product description or a tech spec?
         "Product description" = PASS. "Tech spec" = rewrite.

Anti-patterns:
  ❌ "This flow uses Elasticsearch to query user records and Redis for rate limiting."
     — technology names
  ❌ "T47 registers users, T48 handles email verification."
     — task type IDs (forbidden in DOMAIN field)
  ✅ "This flow manages the lifecycle of a new member joining the platform:
      accepting their credentials, confirming they control the email address
      they provided, and ensuring they receive materials to begin using the platform."
     — describes what happens for users, no tech names
```

### CONSTRAINTS field — copy from state only

```
Source:  state.invariants (all 4 lists: dna_rules, bfa_rules, iron_rules, machine_constraints)
Test:    Every item in CONSTRAINTS has a corresponding entry in state.invariants
Failure: Any item not in state.invariants

Anti-patterns:
  ❌ Adding a new constraint not in state.invariants (fix: add to Step 1 first)
  ❌ Omitting a BFA rule that applies to this domain
  ✅ Exact copy of all 9 DNA rules + flow-specific BFA rules from Step 1
```

### PRIOR_ART field — query string, not content

```
Source:  Construct from clause keywords + domain type
Format:  "prior plans for [keyword1] [keyword2] [domain-type] flow"
Test:    Is this a search query or copied plan content?
Failure: Copied plan content (replace with the query string)

Examples:
  ✅ "prior plans for user-registration email-verification onboarding community-platform flow"
  ✅ "prior plans for rag-pattern-extraction skill-indexing knowledge-graph engine-intelligence flow"
  ✅ "prior plans for friend-request social-feed ab-testing social-platform flow"
  ❌ "See FLOW-01 Steps 1-5 for the registration pattern" — copied reference
  ❌ "Step 1: Accept credentials. Step 2: ..." — copied plan
```

### SUCCESS field — defines output shape, not how to produce it

```
Source:  Derived from clause count and domain complexity
Content:
  - Step properties (what makes a step valid)
  - Size range with reasoning
  - QUESTION YOURSELF self-check list

Anti-patterns:
  ❌ "First check coverage, then verify abstraction, finally confirm size."
     — procedural language (remove — SUCCESS defines output shape)
  ❌ "Steps must be good quality."
     — non-binary criterion
  ✅ "Every task type in T[N]-T[M] has >= 1 dedicated plan step"
     — binary (yes/no check against the task range)
```

---

## ACCEPTANCE CRITERIA FOR STEP-2-CYCLE1-CONTEXT

Before Step 2 is considered complete:

- [ ] File header declares Status: COMPLETE and skills loaded (SK-520 + SK-522)
- [ ] TASK section describes the 5-field package purpose
- [ ] INTENT field is verbatim from `user_intent` in PLAN-STATE.json
- [ ] QUESTION YOURSELF answers confirm task range coverage
- [ ] DOMAIN uses flow_id, title, task_range, focus, domain — no technology names
- [ ] CONSTRAINTS lists all 9 DNA rules + flow-specific BFA/iron rules
- [ ] PRIOR_ART is a query string (not copied content, not a reference)
- [ ] SUCCESS declares what a valid plan step looks like with binary acceptance criteria
- [ ] Grade threshold >= 0.85 is stated in SUCCESS
- [ ] STATE WRITE updates `cycle1.context_package_file` in PLAN-STATE.json
- [ ] SK-443 self-containment checks run (v1) or implicitly satisfied (v2)

---

## KEY RULES

**1. INTENT verbatim is non-negotiable.**
The INTENT field must match `user_intent` from PLAN-STATE.json character for character.
This is not a style choice — the Planner AI plans for exactly what it reads. Any
rewording silently changes what the Planner plans for.

**2. DOMAIN has no technology names.**
"Elasticsearch", "Redis", "NestJS", "BullMQ", "Anthropic", "TypeScript" do not appear
in the DOMAIN field. They also must not appear as task type IDs (T47, T48) or class
names (UserService). The DOMAIN field describes what the system does for users, in
plain language.

**3. CONSTRAINTS is a copy of state.invariants — nothing more.**
If a constraint belongs in the CONSTRAINTS field, it must already be in state.invariants.
If it's not there, add it to Step 1 first. The CONSTRAINTS field does not introduce
new constraints — it makes the existing state.invariants explicit to the Planner AI.

**4. PRIOR_ART is always a query string.**
Never copy plan content into PRIOR_ART. The field tells the Planner AI: "when you
need inspiration, query the RAG index with these keywords." It is a retrieval hint,
not pre-filled content.

**5. SUCCESS defines output shape, not procedure.**
The SUCCESS field tells the Planner AI what a valid step looks like and what
acceptance criteria the plan must meet. It never says "first do X, then check Y."
Every criterion in SUCCESS must be binary — true or false when evaluated against the plan.

---

## RELATIONSHIP TO SUBSEQUENT STEPS

- **Step 3 (CYCLE1-TEST):** Uses the SUCCESS field criteria to build the pass/fail
  grade formula. The clause table from INTENT drives coverage checks.

- **Step 4 (CYCLE2-TEMPLATE):** The DOMAIN field carries forward unchanged into the
  Cycle 2 template. The flow_id, task_range, and domain fields are reused.

- **Step 10 (CHAIN-REVIEW):** Reads `cycle1.context_package_file` from state to
  verify this step was completed. The C1→C2 boundary check verifies that the file
  listed here exists and produces plan steps in the right format.

---

*End of GUIDE-B22 — FLOW-XX-STEP-2-CYCLE1-CONTEXT.md*
*List A sources: ZIP-11 (FLOW-01/03/07/09 STEP-2 examples),*
*ZIP-01 (DESIGN-ARCHITECT-GUIDE v1.7 §Q4 — output contract),*
*project knowledge (SK-522, SK-520, SK-443)*
*Target B-type: B-22 — FLOW-XX-STEP-2-CYCLE1-CONTEXT.md*
*Round: 32 of 72*
