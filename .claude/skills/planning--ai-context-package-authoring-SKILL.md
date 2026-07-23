---
name: ai-context-package-authoring
sk_number: SK-522
version: "1.0.0"
priority: HIGH
load_order: 0
category: planning
author: luba
updated: "2026-04-01"
contexts: ["web-session", "claude-code"]
description: >
  Governs the production of AI context packages — the documents that give AI
  players what they need to make decisions in Cycles 1, 2, and 3 of the XIIGen
  self-building loop. Defines the 5-field structure (INTENT, DOMAIN, CONSTRAINTS,
  PRIOR_ART, SUCCESS), field-by-field authoring rules, and a verification checklist.
  Load before writing any context package for any cycle. Without this skill,
  context packages default back to instruction files, defeating the AI-driven model.
triggers:
  - "context package"
  - "cycle 1 context"
  - "cycle 2 context"
  - "cycle 3 context"
  - "planner AI receives"
  - "depth decider receives"
  - "what the AI receives"
  - "prepare the package"
  - "context package authoring"
---

# AI Context Package Authoring Skill (SK-522) v1.0

## WHAT THIS SKILL PREVENTS

1. **Instruction files masquerading as context packages.** The natural default when
   writing "what the AI receives" is to write steps: "First do X, then check Y."
   That is an instruction file (SK-443). A context package never prescribes steps.

2. **Empty or missing fields.** A context package with an empty CONSTRAINTS field
   runs without boundaries. A missing PRIOR_ART field runs without learning from
   prior cycles. Either failure produces unverifiable output.

3. **Intent drift.** Rephrasing the user's sentence in the INTENT field changes
   scope silently. The AI solves what was written, not what was meant.

---

## WHEN TO INVOKE

Load before writing any context package for any cycle. Specifically:
- Before writing the Cycle 1 context package (Step 2 of flow plan guide)
- Before writing the Cycle 2 context template (Step 4)
- Before writing the Cycle 3 context package (Step 6)

Also load when reviewing a context package someone else wrote — use the
verification checklist in Section 4 to evaluate it.

---

## SECTION 1 — THE FUNDAMENTAL DISTINCTION

The most important thing this skill teaches is the difference between an
instruction file (SK-443) and a context package (SK-522).

| Instruction file (SK-443) | Context package (SK-522) |
|--------------------------|-------------------------|
| Tells Claude Code: do step 1, then step 2 | Tells AI: here is intent, constraints, context, RAG seeds, success criteria |
| Output is prescribed — Claude Code executes it | Output is decided by AI — context package enables the decision |
| Fails if a step is ambiguous | Fails if a field is missing or mis-filled |
| Claude Code is the actor | AI is the actor |
| Self-containment check: can Claude Code run this alone? | Self-containment check: can AI make a defensible decision from this alone? |
| Used for: session execution (FLOW-XX-SESSION-N.md) | Used for: AI-driven cycles (Cycle 1, 2, 3) |

**The one-sentence rule:**
> If the document tells the AI WHAT to produce — it is an instruction file.
> If the document tells the AI WHAT IT NEEDS TO KNOW to decide — it is a context package.

Test: remove all field labels. Read the document. Does it sound like a recipe
(do this, then do that) or like a briefing (here is the situation, here are
the boundaries, here is what success looks like)? A recipe is an instruction
file. A briefing is a context package.

---

## SECTION 2 — THE 5-FIELD STRUCTURE

Every context package has exactly these 5 fields. No more. No fewer.
If a field is absent, the package is incomplete and must not be used.

When used as a **template** (Cycle 2 runs once per plan step), the INTENT
field is parameterised — it receives the current step's text at runtime,
not a fixed user sentence. All other fields remain constant across steps.

### INTENT

| | |
|--|--|
| **Definition** | The exact thing this AI call is trying to understand or decide |
| **What belongs** | For Cycle 1: the user's sentence verbatim. For Cycle 2: the plan step verbatim. For Cycle 3: the verified NODE (full object). |
| **What does NOT belong** | Rephrasing, summary, interpretation, clarification |
| **Empty fails because** | The AI solves what is written. If INTENT is empty, the AI invents the problem. If INTENT is rephrased, the AI solves a different problem than the user meant. |

### DOMAIN

| | |
|--|--|
| **Definition** | What the system does for its users, in 2–3 sentences |
| **What belongs** | Business capabilities, user-facing behaviours, domain rules |
| **What does NOT belong** | Technology names (frameworks, databases, libraries), class names, API paths |
| **Empty fails because** | Without domain context, the AI produces generic output unconstrained by what the system actually does. A registration flow for a social platform is different from one for a bank — the domain makes that distinction. |

### CONSTRAINTS

| | |
|--|--|
| **Definition** | Machine-enforced invariants — things that must hold regardless of what any AI decides |
| **What belongs** | DNA rules (9 patterns), BFA conflict rules for this domain, iron rules from prior runs. Each stated as a verifiable condition. |
| **What does NOT belong** | Preferences, quality goals, technology choices, FREEDOM config items |
| **Empty fails because** | The AI produces unconstrained output that violates rules the system must always enforce. A generated plan that violates DNA-8 (store before enqueue) fails regardless of how good the plan looks. |

### PRIOR_ART

| | |
|--|--|
| **Definition** | A RAG query that retrieves relevant prior work — NOT the prior work itself |
| **What belongs** | A parameterised query string: "prior plans for [flow type] [domain]", "depth decisions for [archetype] at depth [N]", etc. |
| **What does NOT belong** | Copied documents, pasted prior plans, inline examples from prior runs |
| **Empty is acceptable ONLY when** | Explicitly stated as `NO_PRIOR_ART` with reasoning. Silent empty field is a failure. |
| **Empty fails because** | The AI cannot learn from prior cycles if it cannot retrieve them. The first cycle has no prior art — that is acceptable. Every subsequent cycle does — not querying it means the system never improves. |

### SUCCESS

| | |
|--|--|
| **Definition** | What the output must look like — format and structure, not content |
| **What belongs** | Output shape, required sections, size constraints, abstraction level rules, what "complete" means for this output |
| **What does NOT belong** | Expected content, prescribed answers, example outputs that bound what the AI can produce |
| **Empty fails because** | Without a success definition, the AI cannot self-evaluate. The judge cannot grade. The step cannot be marked COMPLETE. |

---

## SECTION 3 — FIELD-BY-FIELD AUTHORING RULES (REGISTRATION FLOW DOMAIN)

For each field: one good example and one bad example from the user registration
flow domain.

### INTENT

**Good:**
```
INTENT: "I need a user registration flow for a NestJS application."
```
Why good: exact user sentence, unchanged, no interpretation added.

**Bad:**
```
INTENT: "The system should handle user registration and authentication."
```
Why bad: "authentication" was not in the user's sentence. The scope expanded.
The AI will produce a plan that covers both registration AND authentication —
more than the user asked for, and different from what the session is testing.

### DOMAIN

**Good:**
```
DOMAIN: A multi-tenant SaaS platform where businesses manage their own users.
        New users register with email or SSO credentials. Email uniqueness is
        enforced per tenant, not globally.
```
Why good: describes user-facing behaviour, states a domain rule (uniqueness per
tenant), no technology names.

**Bad:**
```
DOMAIN: A NestJS application backed by Elasticsearch, with Redis for session
        management and SendGrid for transactional email.
```
Why bad: entirely technology names. The AI now assumes these are constraints
and will produce a plan that presupposes this stack — preventing any
infrastructure-neutral plan.

### CONSTRAINTS

**Good:**
```
CONSTRAINTS:
- Email uniqueness checked before user record created (DNA-3, CF-47)
- User record stored before verification email enqueued (DNA-8)
- No tenant ID passed as parameter — read from AsyncLocalStorage (DNA-5)
- All service methods return DataProcessResult<T> — no throws (DNA-3)
```
Why good: each item is a verifiable condition with a rule reference. Any generated
plan step can be checked against these.

**Bad:**
```
CONSTRAINTS:
- Security must be handled correctly
- Email handling must be correct
- Must follow best practices
```
Why bad: none of these are verifiable. "Correctly" and "best practices" require
human judgment — they are quality criteria, not machine-enforceable constraints.

### PRIOR_ART

**Good:**
```
PRIOR_ART: "prior plans for user-registration flow multi-tenant domain"
```
Why good: a query string the RAG system executes at runtime. The AI retrieves
the actual documents — they are not in the package.

**Bad:**
```
PRIOR_ART:
  FLOW-01 produced these steps:
  Step 1: Accept credentials
  Step 2: Verify email uniqueness
  ...
```
Why bad: the prior plan is copied inline. The package is now an instruction file —
it tells the AI what the answer should look like. The AI will reproduce the prior
plan rather than deciding independently.

### SUCCESS

**Good:**
```
SUCCESS: A valid plan step:
- Is a single plain-language sentence
- Names one distinct user-facing action
- Contains no technology name, class name, or task type ID
- If it depends on a prior step, names that step explicitly
- The full plan has between 4 and 10 steps for this flow
```
Why good: describes output format and structure. The AI knows what shape its
output must take. The judge can check each criterion as TRUE or FALSE.

**Bad:**
```
SUCCESS: The plan should look like FLOW-01's output with steps like
         "Accept credentials", "Verify email", "Create user record".
```
Why bad: prescribes content. The AI will reproduce these steps rather than
deciding what steps this specific request requires. The output is copied,
not discovered.

---

## SECTION 4 — VERIFICATION CHECKLIST

Run before using any context package. All 8 must be TRUE.

```
□ INTENT contains the exact source text — character-for-character match
  (for Cycle 1: user sentence; for Cycle 2: plan step; for Cycle 3: NODE object)

□ DOMAIN has no technology names (framework, database, library, API, service name)

□ CONSTRAINTS lists only machine-enforced invariants — not preferences or goals

□ Each constraint is stated as a verifiable condition — not as a description

□ PRIOR_ART is a query string OR explicitly states NO_PRIOR_ART with reasoning
  (copying prior documents inline fails this check)

□ SUCCESS defines output FORMAT — not output content or expected answers

□ No field references another document ("see X", "per Y", "as in Z")

□ No field contains a step or instruction ("first do X", "then check Y",
  "start by doing Z")
```

If any check returns FALSE: fix the field before using the package.
A failing context package produces unverifiable AI output.

---

## SECTION 5 — RUNTIME FAILURE MODES

Five named failure modes. Each states what was in the package, what the AI
produced, how to detect it, and how to fix it.

### FAILURE MODE 1: INTENT_REPHRASED

```
In package INTENT: "The system should handle user onboarding."
User said:         "I need a user registration flow."
AI produced:       An onboarding flow — correct for what was written,
                   wrong for what was asked.
Detection:         Cycle 1 Plan Reviewer finds zero coverage of "registration"
                   — a coverage gap on the original user sentence.
Fix:               Copy the user sentence verbatim into INTENT. Never paraphrase.
```

### FAILURE MODE 2: DOMAIN_SCOPES_THE_STACK

```
In package DOMAIN: "A NestJS application with Redis and Elasticsearch."
AI produced:       Plan steps that presuppose NestJS service structure and
                   Redis caching — not infrastructure-neutral.
Detection:         Abstraction check in Cycle 1 test finds technology names
                   in plan steps ("NestJS service", "cache in Redis").
Fix:               Describe what the system does for users. Remove all
                   technology names from DOMAIN.
```

### FAILURE MODE 3: CONSTRAINTS_CONTAIN_PREFERENCES

```
In package CONSTRAINTS: "Security must be handled correctly."
AI produced:       A plan that passes constraint check because "correctly"
                   is unverifiable — any plan can claim to handle security
                   correctly.
Detection:         During Cycle 2 arbiter check, security arbiter has no
                   specific rule to evaluate — reports CONTEXT_INSUFFICIENT.
Fix:               Replace preferences with verifiable conditions:
                   "SSO token validated via external provider before identity
                   created (DNA-7)" — a failing check exists if this is wrong.
```

### FAILURE MODE 4: PRIOR_ART_INLINE

```
In package PRIOR_ART: [copied 47 lines from FLOW-01 plan]
AI produced:       A plan nearly identical to FLOW-01's — even for a
                   different infrastructure context.
Detection:         Cycle 1 convergence score is 1.0 — all three generators
                   produced the same plan. Perfect convergence on first attempt
                   means the AI read an answer, not decided one.
Fix:               Replace inline content with a RAG query string.
                   "NO_PRIOR_ART" if no prior work exists.
```

### FAILURE MODE 5: SUCCESS_PRESCRIBES_CONTENT

```
In package SUCCESS: "Steps should be: accept credentials, verify email,
                    create user record, send verification, deliver onboarding."
AI produced:       Exactly those 5 steps, in that order, regardless of
                   what the user's actual request required.
Detection:         Plan Reviewer finds 100% coverage — but the plan is
                   correct for the example, not for the request.
Fix:               Replace expected content with format rules:
                   "Between 4 and 10 steps. Each step names one user-facing
                   action. No technology names. Dependencies declared."
```

---

## ANTI-PATTERNS

**"I'll fill in PRIOR_ART later."**
Found: PRIOR_ART field empty, not marked NO_PRIOR_ART.
Fix: Fill now or mark NO_PRIOR_ART with one sentence of reasoning.
     An empty field cannot be distinguished from a forgotten field.

**"The CONSTRAINTS field repeats the invariants section."**
Found: CONSTRAINTS is a copy of state.invariants — added nothing specific
       to this package's cycle or domain.
Fix: CONSTRAINTS is a copy of state.invariants. That is correct.
     The package makes invariants explicit — it does not add new ones.
     If this feels redundant, the state.invariants section is incomplete.

**"I added step-by-step instructions to the SUCCESS field to be helpful."**
Found: SUCCESS contains "first check X, then verify Y, finally produce Z."
Fix: SUCCESS defines what the output looks like, not how to produce it.
     Remove all procedural language. State only: shape, required sections,
     size constraints, abstraction level.

**"I wrote the context package for Cycle 2 as one document covering all steps."**
Found: Single package with all plan steps listed in INTENT.
Fix: Cycle 2 runs independently per step. INTENT is parameterised — one
     step text at a time. Write a template, not a complete package.
     The template's INTENT field is: "[verbatim plan step — filled at runtime]"

---

## INTEGRATION

**What invokes SK-522:**
- SK-520 (intent-to-plan) invokes SK-522 to assemble the Cycle 1 context package
- SK-521 (depth-decision) invokes SK-522 to assemble the Cycle 3 context package
- Steps 2, 4, and 6 of the flow plan preparation guide require SK-522

**What SK-522 produces:**
- A verified context package for one cycle, ready for AI consumption

**What uses SK-522's output:**
- SK-435 (node-convergence) — receives Cycle 2 context packages
- SK-521 (depth-decision) — receives Cycle 3 context packages
- The Planner AI — receives Cycle 1 context packages
- SK-524 (cycle-visibility-design) — the SENT field in every visibility record
  is the context package produced by SK-522

---

## Universal Bits (UUS G07) — instruction vs context, 5 fields, mvp consumers (RAG/LLM SDK)

These are the universal cross-project bits this skill must carry (imported from core via the universal-skills mapping), TS-adapted for the mvp stack (NestJS + React, Jest/Playwright). The `DataProcessResult<T>` domain wrapper is the mvp convention; the core `OperationResult<T>` stays in `llm_mvp_core`.

### Instruction file vs context package, exactly 5 fields (universal)

The portable core: an **instruction file tells the actor WHAT to produce**; a **context package tells the actor WHAT IT NEEDS TO KNOW to decide**. A context package has **exactly 5 fields** — **INTENT** (verbatim, never rephrased), **DOMAIN** (what the system does for users, **no technology names**), **CONSTRAINTS** (only machine-enforced invariants), **PRIOR_ART** (a RAG query string or an explicit `NO_PRIOR_ART` with reasoning — never inline copied work), **SUCCESS** (output *form*, not content). Run the 8-check verification before use. These are present above; this is the portable statement.

### CONSTRAINTS and consumers mapped to the mvp stack

- **CONSTRAINTS** = "every service method returns a typed `DataProcessResult<T>` / throws a typed error" instead of the core `OperationResult<T>` invariant. Each constraint stays a verifiable condition with a rule reference.
- **Who consumes the package**: mvp context packages feed **LLM calls (Anthropic / OpenAI / Google SDK)** and the **FastAPI RAG sidecar** — not a `ContinuousLearningPipeline` / `DomainModelRegistry` / `IncrementalTrainer`. Those ML constructs are **not portable (G12)**; do not carry them into mvp examples. Reorient any inherited example onto a NestJS service + RAG retrieval.

### DOMAIN must be scrubbed of technology and source-class names

The most common mvp failure is leaving `.NET` class names or stack names in DOMAIN. Verify DOMAIN names only user-facing behaviour and domain rules — no framework, database, library, API path, or source class name (no leftover core/.NET identifiers).
