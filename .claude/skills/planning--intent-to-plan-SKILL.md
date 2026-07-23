---
name: intent-to-plan
sk_number: SK-520
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-04-01"
contexts: ["web-session", "claude-code"]
description: >
  Governs Cycle 1 of the XIIGen self-building loop: turning a raw user sentence
  into an ordered plain-language plan. Defines intent clause parsing, assembly
  rules for all 5 SK-522 context package fields, what a valid plan step looks like,
  and the Plan Reviewer protocol with grade formula. Load before writing the Cycle 1
  context package (Step 2 of the flow plan guide). Without this skill, the Cycle 1
  package is assembled by guesswork and the plan steps contain technology names.
triggers:
  - "cycle 1 context"
  - "intent to plan"
  - "user sentence to plan"
  - "planner AI"
  - "plan reviewer"
  - "step 2 flow plan"
  - "turn user request into plan"
  - "extract intent clauses"
  - "what plan steps"
---

# Intent-to-Plan Skill (SK-520) v1.0

## WHAT THIS SKILL PREVENTS

1. **Technology names in plan steps.** The natural default when planning a
   "NestJS registration flow" is to write "create NestJS service for registration."
   That is a technology-scoped step, not a plain-language step. The Cycle 1 output
   must be infrastructure-neutral — the technology decision happens later, not here.

2. **Scope drift from sentence to package.** The INTENT field must be the user's
   sentence verbatim. Every paraphrase changes scope. This skill provides the rule
   that prevents it.

3. **Steps that combine responsibilities.** A step containing "and" usually contains
   two steps. Combined responsibilities break Cycle 2 because convergence runs
   per step — a step covering two things produces a NODE covering two things,
   which the depth decision will always expand, adding unnecessary depth.

---

## WHEN TO INVOKE

Load before writing the Cycle 1 context package (Step 2 of the flow plan guide).
Load alongside SK-522 — this skill governs WHAT to put in each SK-522 field for
Cycle 1. SK-522 governs the field format. SK-520 governs the Cycle 1 content.

---

## SECTION 1 — HOW SK-520 DIFFERS FROM SK-492

SK-492 (requirement-to-flow) takes a UML diagram, product description, or
requirements document and produces: a list of flows needed, the task types
within each flow, and execution order. Its input is a structured artifact.
Its output contains task type IDs.

> **SK-492 maps structured requirements to known flow patterns.**
> **SK-520 extracts structured intent from unstructured natural language.**

SK-520 input: one raw user sentence with no structure.
SK-520 output: ordered plain-language plan steps with no task type IDs.

When to use SK-492: you have a UML diagram or product spec.
When to use SK-520: you have a user sentence and nothing else.

Do not use SK-492 when the user has not provided a structured artifact.
Do not use SK-520 after SK-492 has already produced flows — the task types
from SK-492 feed Cycle 4, not Cycle 1.

---

## SECTION 2 — PARSING THE USER SENTENCE

An **intent clause** is one distinct capability the user is requesting.
Parse the user sentence to identify all intent clauses before writing
anything else.

### Parsing rules

| Signal | What it means |
|--------|--------------|
| Every noun phrase naming a capability | One clause |
| Infrastructure qualifiers ("for NestJS", "with Redis", "on AWS") | Context — not a clause |
| Multiple verbs in one sentence | One clause per verb if the verbs describe distinct actions |
| "and" connecting two capabilities | Two clauses |
| Ambiguous phrase that could mean two things | Flag as ambiguous — do not infer |

### Clause table (fill this before writing the context package)

| # | Clause | Source phrase in sentence | Ambiguous? | If ambiguous: question to ask |
|---|--------|--------------------------|-----------|------------------------------|
| 1 | | | | |

### Example — registration flow

Sentence: "I need a user registration flow for a NestJS application."

| # | Clause | Source phrase | Ambiguous? | Question |
|---|--------|--------------|-----------|---------|
| 1 | user registration | "user registration flow" | No | — |
| 2 | NestJS application | "for a NestJS application" | Context only — not a clause | — |

Result: 1 clause. Formula:
- minimum steps = max(clause_count, 3), adjusted upward for known domain complexity — state the reasoning explicitly
- maximum steps = min(clause_count × 3, 12), adjusted for complexity — state the reasoning explicitly

Correct derivation for 1-clause "user registration" with known complexity:
- min steps = max(1, 3) = **3** (formula result)
- domain adjustment: registration always covers intake, validate, create, confirm — minimum raised to **4** (stated explicitly)
- max steps = min(1×3, 12) = 3 (formula result)
- domain adjustment: registration is medium complexity — maximum raised to **8** (stated explicitly)

State the reasoning. Do not use default ranges without justification.

---

## SECTION 3 — ASSEMBLING THE CYCLE 1 CONTEXT PACKAGE

How to fill each of the 5 SK-522 fields from the parsed sentence and state.

### INTENT field
```
Source:  The user's sentence — verbatim
Rule:    Copy character-by-character. No changes. No additions.
Test:    Compare INTENT field to user's sentence. Every character must match.
Failure: Any word added, removed, or changed = scope drift.
```

### DOMAIN field
```
Source:  Domain context extracted via SK-454 if existing codebase exists.
         If no codebase: derive from flow_id and clause list.
Rule:    2-3 sentences. No technology names.
         Describe: what the system does for users, what domain rules apply,
         what makes this domain specific (e.g. per-tenant uniqueness vs global).
Test:    Read DOMAIN aloud. Does it sound like a product description?
         Or a technology spec? Technology spec = rewrite.
```

### CONSTRAINTS field
```
Source:  state.invariants — all four lists: dna_rules, bfa_rules,
         iron_rules_from_prior_runs, machine_constraints.
Rule:    Copy from state. Do not add new constraints here.
         If a constraint is not in state.invariants, it does not belong here.
         If it belongs here, add it to state.invariants in Step 1 first.
Test:    Every item in CONSTRAINTS has a corresponding entry in state.invariants.
         Any orphan constraint = run Step 1 again.
```

### PRIOR_ART field
```
Source:  RAG query constructed from the clause list.
Rule:    Write a query string, not a result.
         Format: "prior plans for [clause text] [domain type]"
         Example: "prior plans for user-registration multi-tenant SaaS"
         If state.cycle1.plan_steps is empty AND this is first run:
           → Field value: "NO_PRIOR_ART — first run for this flow"
Test:    Is this a query string? Or copied content?
         Copied content = replace with the query.
```

### SUCCESS field
```
Source:  Derived from the clause list and flow complexity.
Rule:    Define what a valid plan step looks like for THIS flow.
         Must state:
           - Ordering requirement (steps are ordered)
           - Dependency link format (if step depends on prior step, name it)
           - Abstraction level rule (no technology names, no class names, no IDs)
           - Size range with reasoning (derived from clause count and complexity)
Test:    Given a plan step, can you check each SUCCESS criterion as TRUE/FALSE?
         If any criterion requires judgment rather than binary check = too vague.
```

---

## SECTION 4 — WHAT A VALID PLAN STEP LOOKS LIKE

Every plan step produced by the Planner AI must satisfy all 3 properties.

### Property 1 — PLAIN LANGUAGE

The step names a user-facing action. No technology names, class names, API paths,
or task type IDs.

```
Good: "Accept the user's email address and password"
Bad:  "Call POST /api/auth/register with email and password payload"
      — contains an API path (technology)

Good: "Verify the email address is not already registered in this tenant"
Bad:  "Query the users index in Elasticsearch for email uniqueness"
      — contains a technology name (Elasticsearch)

Good: "Create the user account record"
Bad:  "Instantiate UserService and call createDocument()"
      — contains class names and method names
```

### Property 2 — SINGLE RESPONSIBILITY

One step = one distinct user-facing action. "And", "then", "also" in the same
step sentence is a candidate split point.

```
Good: "Send a verification email to the provided address"
Bad:  "Send a verification email and update the user's status to pending"
      — two actions (send email + update status)

Good: "Mark the user's email as verified"
Bad:  "Verify the email link and activate the account and log the event"
      — three actions

Split rule: If you can draw a line between two parts of the sentence
            and each part makes sense alone — split the step.
```

### Property 3 — DEPENDENCY DECLARED

If this step needs output from a prior step, name the prior step explicitly.
Implied dependencies cause Cycle 2 NODE convergence failures — challengers
cannot evaluate a NODE whose input is undefined.

```
Good: "Send a verification email [requires: Step 3 — user account record created]"
Bad:  "Send a verification email" (when Step 3 creates the email address used here)

Dependency test: Could this step run as the first step in the flow?
  If yes → no dependency declaration needed.
  If no  → what does it need? Name the step that produces it.
```

---

## SECTION 5 — THE PLAN REVIEWER PROTOCOL

The Plan Reviewer AI verifies the Planner's output. This section defines
all 4 checks and the grade formula the flow plan guide uses.

### Check 1 — COVERAGE

For each intent clause identified in Section 2: does at least one plan step
explicitly address it?

```
Verdict per clause: COVERED | PARTIAL | MISSING
COVERED:  The clause is the primary subject of at least one step
PARTIAL:  The clause is mentioned but as a side effect of another step
MISSING:  No step addresses this clause at all

Plan grade contribution: COVERED = 1.0 | PARTIAL = 0.5 | MISSING = 0.0
Coverage score = sum of clause verdicts / number of clauses
```

### Check 2 — ABSTRACTION

For each step: does it contain a technology name?

```
Technology list (derive for this flow — state it explicitly in the test doc):
  framework names: NestJS, Express, Spring, Django, Rails
  database names: Elasticsearch, Redis, PostgreSQL, MongoDB
  library names: SendGrid, Twilio, Stripe, Passport
  cloud providers: AWS, GCP, Azure
  [add domain-specific names for this flow]

Verdict: CLEAN | VIOLATION
CLEAN:     No item from the technology list appears in the step
VIOLATION: At least one item appears

Plan fails abstraction if ANY step has VIOLATION.
Abstraction score = 1 if all steps CLEAN, 0 if any VIOLATION.
```

### Check 3 — SINGLE RESPONSIBILITY

For each step: does it describe more than one distinct action?

```
Signal words: "and", "then", "also", "as well as", "additionally"
Each signal word is a candidate split point.

Verdict: SINGLE | COMPOUND
SINGLE:   Step has at most one signal word AND both parts are inseparable
COMPOUND: Step has a signal word where each part could stand alone

The reviewer flags COMPOUND steps — does NOT split them.
The plan fails if more than 20% of steps are COMPOUND.
Responsibility score = 1 - (COMPOUND count / total steps)
```

### Check 4 — DEPENDENCY COMPLETENESS

For each step that references a prior step: does the named step exist,
and does it produce what this step claims to need?

```
Verdict per reference: VALID | BROKEN | MISSING
VALID:   Named step exists and produces the required output
BROKEN:  Named step exists but does not produce what is claimed
MISSING: Reference says "requires step N" but step N does not exist

Plan fails if any reference is BROKEN or MISSING.
Dependency score = 1 if all references VALID, 0 if any BROKEN or MISSING.
```

### Grade Formula

```
plan_grade = coverage_score
           × abstraction_score
           × (0.5 + 0.5 × responsibility_score)
           × dependency_score

Threshold: state.cycle1.grade_threshold (set in Step 3 of flow plan guide)
Below threshold: plan REJECTED — Cycle 1 reruns with reviewer feedback.
Above threshold: plan ACCEPTED — proceed to Cycle 2.

Note: abstraction_score and dependency_score are binary (0 or 1).
A single technology name or broken dependency fails the plan entirely.
```

---

## ANTI-PATTERNS

**"I know what the steps should be for a registration flow."**
Found: INTENT rephrased + plan steps match a standard registration pattern.
The Planner AI reproduced known patterns, not the user's specific request.
Fix: Check INTENT field against user sentence character-by-character.
     Then check whether the plan steps address the user's specific clauses.

**"The coverage check passed with 100% on the first run."**
Found: Every clause is COVERED — plan looks perfect.
This is suspicious if the PRIOR_ART field was non-empty and non-query.
100% first-run coverage often means the AI read an answer.
Fix: Verify PRIOR_ART is a query string. Re-run with NO_PRIOR_ART and
     check whether the same plan is produced.

**"I wrote the dependency declarations for the AI — it doesn't need to."**
Found: Step document pre-fills all dependency references before the Planner runs.
This pre-scopes what the Planner can produce.
Fix: Dependency declarations are produced by the Planner AI, not pre-written.
     The SUCCESS field defines the format. The Planner fills the content.

**"The abstraction check uses a fixed global technology list."**
Found: Technology list is the same for every flow regardless of domain.
A "Stripe" reference is a violation for a user registration flow but
not for a payments flow.
Fix: Derive the technology list from the flow domain and clause context.
     State it explicitly in the Cycle 1 test document (Step 3).

---

## INTEGRATION

**What invokes SK-520:**
- Step 2 of the flow plan preparation guide (write Cycle 1 context package)
- Step 3 (write Cycle 1 test) — grade formula comes from Section 5

**What SK-520 produces:**
- A completed Cycle 1 context package (5 fields per SK-522)
- A clause table (input to Step 3 test document)
- A size range with reasoning (goes into SUCCESS field + Step 3)

**What uses SK-520's output:**
- The Planner AI — receives the Cycle 1 context package
- SK-524 (cycle-visibility-design) — the Cycle 1 SENT field is this package
- Step 3 of the flow plan guide — coverage check uses the clause table
- SK-521 (depth-decision) — the plan steps produced by Cycle 1 become
  the inputs to Cycle 2, which produces the NODEs that Cycle 3 evaluates

---

## UNIVERSAL STANDARD ADDENDUM — INTENT comes from the CURRENT unquoted instruction (quote-boundary) (ported from llm_mvp_core)

> Added by the Universal-Skills refresh (UpdateUniversalSkills). Source standard:
> `llm_mvp_core/docs/skills/intent-to-plan-SKILL.md` + the current-task-anchor
> pattern. SK-520 already enforces verbatim INTENT, infrastructure-neutral steps,
> the clause table, "and"=two steps, and clause-split. The missing universal bit:
> WHICH text is the verbatim INTENT when the message also contains quoted/pasted
> context. Quoted transcripts, attachments, and old plans are EVIDENCE, not the task.

### Quote-boundary rule for the INTENT field

The INTENT field is the user's CURRENT UNQUOTED sentence — not a task-like phrase
found inside a quote, attachment, old plan, benchmark, or prior assistant answer.

```
QUOTE_DELIMITER_PARSE (run before filling INTENT):
  detected_quote_marker      = <"Цитата:" / fenced block / transcript / angle-quote>
  quoted_span_status         = evidence_text_only
  detected_real_task_marker  = <"Вот задание!!!" / "Задание:" / current unquoted assignment>
  real_task_span             = only the unquoted text after the real-task marker
  may_execute_from_quote     = false
INTENT = exact characters of real_task_span. A clause may NOT be created from
evidence_text_only unless the user restates it in the current unquoted message.
```

### Current-task anchor (write before the clause table)

```
CURRENT TASK:    <the current unquoted instruction, verbatim>
NOT THE TASK:    <tempting but forbidden: continue a quoted/old/benchmark task>
EVIDENCE-ONLY:   <quoted transcripts, attachments, old plans, sub-agent packets>
```

### Technology qualifiers are context, never clauses (restated)

Framework/library/cloud names ("for a NestJS application", "with Redis", "standalone
React component") are context-qualifiers, not intent clauses. They do not raise the
clause count and must not appear in plan steps (Section 4, Property 1). For this mvp
project the stacks that show up as qualifiers-only are NestJS, React, and FastAPI.
