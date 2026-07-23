---
name: pipeline-position-check
sk_number: SK-528
version: "1.0.0"
priority: CRITICAL
load_order: 0
category: planning
author: luba
updated: "2026-04-07"
contexts: ["web-session", "claude-code"]
description: >
  Enforces pipeline-first reasoning before any GENERATION or PLANNING session.
  Three sections: (1) Q0 detection — forces the model to state what a stage
  receives, produces, who consumes it, and what the consumer needs before
  touching a single file; (2) CONTEXT_INSUFFICIENT signal — precise format
  for surfacing a gap with a concrete, answerable escalation request;
  (3) resolution protocol — how the session halts, what Luba must provide,
  and what gate must pass before the session resumes. Detection without
  resolution is the same failure in a different form. Both are required.
triggers:
  - "Q0 pipeline position"
  - "before any GENERATION session"
  - "before any PLANNING session"
  - "what does this stage produce"
  - "what does the consumer need"
  - "CONTEXT_INSUFFICIENT"
  - "pipeline contract"
  - "downstream consumer"
  - "what flows between stages"
  - "consumer requirement unknown"
  - "context not sufficient to proceed"
  - "under-constrained for"
---

# Pipeline Position Check (SK-528) v1.0

## WHY THIS SKILL EXISTS

XIIGen is a compiler. It takes a large problem, splits it into stages, and
each stage produces output that feeds the next. The quality of the final
output depends on every stage producing the right shape for its downstream
consumer — not just locally correct output.

The systematic failure this skill prevents: a model implementing or planning
a stage without knowing what its downstream consumer needs from it. This
produces work that compiles, passes tests, and is globally useless.

The canonical example from FLOW-01's first live run: Cycle 1 produced a
10-step plan with grade 1.00. Correct by every local measure. But Cycle 2
received those steps, all three providers converged on round 1, and the
DPO triples were noise. No one asked "what does Cycle 2 need from a plan
step to produce genuine disagreement?" That question would have changed
what Cycle 1 was required to produce.

A node that requests its own context before generating is more valuable
than a node that generates from insufficient context and produces noise.
This skill operationalises that principle for GENERATION and PLANNING
sessions run by Claude Code.

---

## SECTION 1 — Q0 DETECTION PROTOCOL

Run before Q1 in the SESSION-START GATE for all GENERATION and PLANNING
sessions. Answer all four parts explicitly in session output before any
file is read or any code is written. Do not proceed to Q1 until all four
are answered.

```
Q0a — RECEIVES
  What exact data does the stage this session implements receive as input?
  State: source stage or external caller, field names, required shape.
  Example: "convergence.handler receives a plan step (string) from
  CycleChainService after Cycle 1 completes."

Q0b — PRODUCES
  What exact data does this stage produce as output?
  State: field names, required shape, storage destination.
  Example: "convergence.handler produces a NODE spec {structure, intent,
  constraints, quality} stored as a CYCLE-4 PENDING_IMPLEMENTATION record."

Q0c — CONSUMER
  Which stage or component consumes this output?
  What does the consumer do with it?
  Example: "CYCLE-4 record consumed by Claude Code, which reads it via
  GET /api/cycle-4/pending and implements the NODE as a NestJS service."

Q0d — CONSUMER REQUIREMENT (the critical question)
  What does the consumer NEED from this output to do its job?
  Not what the output contains — what the consumer requires it to contain
  to produce quality downstream signal.

  Answer this from the consumer's perspective, not the producer's.
  "It needs a NODE spec" is not an answer.
  "It needs constraints specific to THIS step that give a challenger
  something real to attack — generic DNA rules that apply to every flow
  equally give Claude Code nothing to work with" is an answer.

  If this cannot be stated with specificity → CONTEXT_INSUFFICIENT.
  Halt. Do not proceed to Q1. See Section 2.
```

**The gate rule:** If Q0d produces "I'm not sure" or a generic restatement
of the output fields, the session is not ready to start. The model does not
know what problem it is solving. Proceeding produces locally correct,
globally useless work.

---

## SECTION 2 — CONTEXT_INSUFFICIENT SIGNAL

When Q0d cannot be answered with specificity, emit a structured
CONTEXT_INSUFFICIENT signal. This is not a failure. It is the correct
behavior. The session halts here and waits for resolution (Section 3).

**Signal format — all fields required:**

```
CONTEXT_INSUFFICIENT

stage:    [which stage this session is implementing or planning]
gap:      [what specific information is missing — not vague, not "more context"]
consumer: [which downstream stage is affected]
impact:   [what quality failure will occur if this proceeds without resolution]
          [be specific: "DPO triples will converge on round 1 and be noise"
           not "quality may be degraded"]
request:  [concrete answerable questions Luba can respond to in one message]
          [each question maps to a specific field in the context package]
          [minimum 3 questions, maximum 6]
          [each question must be answerable without a follow-up]
```

**Example — Cycle 2 under-constrained context package:**

```
CONTEXT_INSUFFICIENT

stage:    convergence.handler — Cycle 2 context package for step 3 of FLOW-01
gap:      Context package contains only three generic DNA constraints (no typed
          models, return DataProcessResult, tenant via ALS). These apply equally
          to every step of every flow. Three providers given this context will
          produce nearly identical outputs — there is nothing domain-specific
          to disagree about.
consumer: CYCLE-4 (Claude Code implementing the NODE) and OssCurriculumRunner
          (seeding from DPO winners)
impact:   Round 1 scores will be 9.2/9.1 or similar — providers converge
          immediately. Stagnation fires at round 1. DPO triples will have
          chosen.score ≈ rejected.score — no meaningful training signal.
          Claude Code receives a NODE spec with generic constraints and
          will guess at the implementation details.
request:
  For step 3 "Create the user record with unverified status and store it":
  1. What can go wrong with this step that is specific to user registration
     (not generic to all storage operations)?
  2. What must the stored record contain beyond the user fields — what
     downstream stages expect to read from it?
  3. What is the failure behavior when the store fails — is it retryable,
     is there an idempotency requirement?
  4. What downstream contract does this step fulfill — which stage reads
     the record this step creates, and what does it need from it?
```

**What makes a request concrete:**
- Each question maps to a named field in the NODE spec or context package
- Each question is answerable by Luba in one sentence without follow-up
- The answers together close the gap stated in the `gap` field

**What makes a request too vague (do not emit these):**
```
❌ "Please provide more context about user registration"
❌ "What are the business rules for this step?"
❌ "Can you clarify what the output should look like?"
```

These shift the work of specifying the context back to Luba without
narrowing the gap. The model knows the gap — it must name it precisely.

---

## SECTION 3 — RESOLUTION PROTOCOL

**Step 1 — Session halts**

After emitting CONTEXT_INSUFFICIENT, the session halts completely.
No files are read. No code is written. No plans are proposed.
State explicitly: "Session halted. Awaiting context resolution."

**Step 2 — Luba provides resolution**

Luba responds to the concrete questions in the `request` field.
One sentence per question is sufficient. No specific format required.

**Step 3 — Resumption gate**

Before resuming, verify each answer closes the gap:

```
Resumption gate — all must pass:

□ Each question in `request` has a specific answer
  (not "it depends" or "use your judgment")
□ The answers together close the `gap` stated in the signal
□ Q0d can now be answered with specificity using the answers
□ The context package for the affected stage can be updated with
  concrete domain-specific constraints from the answers

If any gate item fails → re-emit CONTEXT_INSUFFICIENT with the
remaining gap. Do not proceed until all gate items pass.
```

**Step 4 — Context package update**

Before writing any code, update the context package with the resolved
information. State which fields were updated and how.

For Cycle 2: the updated context package for the step must contain at
minimum one constraint specific to this step that does not appear in
any other step's context package. If all constraints are still identical
across steps after resolution, the gap is not closed.

**Step 5 — Session resumes**

Proceed to Q1. The pipeline position is now known and the context is
sufficient. The session scope is defined by the resolved context, not
by what was originally assumed.

---

## XIIGEN PIPELINE DATA CONTRACTS (canonical — load before Q0)

Consumer requirement for each stage in the 4-cycle chain. Use this table
to answer Q0d. If the answer from this table is insufficient for the specific
step being worked on, emit CONTEXT_INSUFFICIENT with a concrete request.

```
STAGE          CONSUMER REQUIREMENT
──────────────────────────────────────────────────────────────────────────────
Cycle 1        Cycle 2 needs plan steps specific enough that three AI models
(Planner)      will make DIFFERENT choices about how to fulfil each step.

               A generic step gives providers nothing to disagree about.
               Round 1 convergence = useless DPO triple.

               Required of each plan step:
               - One isolatable responsibility (not two bundled together)
               - Domain-specific — describes a consequence unique to this
                 domain, not a generic operation
               - Specific enough that "how to fulfil this" has multiple
                 valid approaches a model could genuinely choose between
               - Zero technology names

               CONTEXT_INSUFFICIENT if:
               - userIntent too vague to produce isolatable steps
               - Domain failure modes unknown

──────────────────────────────────────────────────────────────────────────────
Cycle 2        CYCLE-4 (Claude Code) needs a NODE spec with:
(Convergence)  - constraints specific to THIS step, not generic DNA rules
               - quality definition specific to THIS step: what does 0.95
                 look like here, not generically across all flows
               - structure that captures the real I/O shape for this domain

               DPO triple validity requires:
               - round 1 scores 6.5–8.0 (9.5+ means over-prescribed context)
               - chosen.model ≠ rejected.model (V9-002)
               - score trend rising across rounds
               - stagnation at ~round 12–15, not round 1

               OssCurriculumRunner seeds from chosen.score ≥ 8.5. Those
               scores must reflect genuine difficulty — not a trivially
               satisfied generic constraint.

               CONTEXT_INSUFFICIENT if:
               - context package contains only generic DNA rules
               - all steps receive identical constraints
               - no domain-specific failure modes in the context
               - no prior art or RAG patterns for this archetype

──────────────────────────────────────────────────────────────────────────────
Cycle 3        CYCLE-4 receives only LEAF NODEs.
(Depth)        Needs verdict justified against named signals, not a blank
               LEAF because nothing triggered.

               CONTEXT_INSUFFICIENT if:
               - NODE constraints too vague to evaluate complexity signals
               - nodeIntent does not distinguish this step from siblings

──────────────────────────────────────────────────────────────────────────────
CYCLE-4        Grade ≥ 0.95 required. NODE spec must be specific enough
(Claude Code)  that implementation does not require guessing.

               Cross-flow hidden dependencies must be honored:
               - FLOW-01 T49: MUST emit "OnboardingCompleted" exactly
                 (FLOW-08 ListingDiscoveryEngine consumes this event name)

               CONTEXT_INSUFFICIENT if:
               - NODE spec constraints are generic template rules
               - Quality definition absent or generic
               - Cross-flow event name ambiguous
──────────────────────────────────────────────────────────────────────────────
```

---

## PIPELINE CONTRACT CHECK (before every ⛔ STOP)

After FC-32, before declaring the session done:

```
□ Q0a verified: input shape received matches what was declared
□ Q0b verified: output shape produced matches what was declared
□ Q0c verified: consumer can receive this output (no interface mismatch)
□ Q0d verified: consumer requirement is met by what was produced
               If not → do NOT stop. Surface gap. Resolve. Then stop.
```

Passing test count is necessary but not sufficient.
A session that produces locally correct work failing Q0d has produced
noise, not a deliverable.

---

## ANTI-PATTERNS

```
❌ Implementing a stage without stating Q0d first
   "Fix the Cycle 1 → Cycle 2 handoff" — what shape does Cycle 2
   need the plan steps in, and why? Unknown → emit CI before touching files.

❌ Proposing solutions before the problem space is understood
   Proposing response size reduction, async queuing, RAG retrieval
   when the actual question is whether three models will genuinely
   disagree. Different problem space entirely.

❌ Accepting "looks correct" as done
   Plan steps that look well-formed but give providers nothing domain-
   specific to disagree about are not correct for Cycle 2's purposes.

❌ Vague CONTEXT_INSUFFICIENT requests
   "Please provide more context" shifts the specification burden to
   Luba without narrowing the gap. State it precisely.

❌ Resuming without updating the context package
   Answers received, session resumes, context package never updated.
   Same gap recurs at generation time. Section 3 Step 4 prevents this.

❌ Treating three generic DNA constraints as sufficient context
   DNA-3, DNA-4, DNA-8 are necessary for every step of every flow.
   They give providers nothing domain-specific to disagree about.
   They are a floor, not a context package.
```

---

## INTEGRATION

```
Load at:     SESSION-START GATE Q0 — before Q1
             Mandatory: GENERATION, PLANNING
             Recommended: INVESTIGATION (when investigating unexpected output)

Produces:    Pipeline position declaration (Q0a–Q0d)
             CONTEXT_INSUFFICIENT signal with concrete resolution request
             Resumption gate verification before session continues

Prevents:    Locally correct, globally useless implementations
             Proposing solutions before the problem space is understood
             Cycle 2 convergence on round 1 from under-constrained context
             DPO triples that are noise

References:  HOW-TO-USE-SKILLS v3.2.0 (Q0 + check 6)
             XIIGEN-SESSION-LOAD-PLAN Rule 20
             planning--convergence-round-design-SKILL.md (SK-452)
             code-execution--node-convergence-SKILL.md (SK-435)

SK-527: module-isolation-arbiter (FC-33) — pending
SK-528: this skill
Next available SK: SK-529
```

---

## G08 universal addition from llm_mvp_core — CONTEXT_INSUFFICIENT is a HARD block, generic stage framing

The Q0 stage-contract and the `CONTEXT_INSUFFICIENT` signal above are the universal core. This
block pins the two universal points the mapping flags: the flag must HARD-block synthesis, and
the skill applies to ordinary mvp stages, not only the 4-cycle ML pipeline.

### A. CONTEXT_INSUFFICIENT halts synthesis — it is not a soft note

When Q0d cannot be answered with specificity, emission of `CONTEXT_INSUFFICIENT` HALTS the
session: no files read, no code written, no plan proposed (Section 3 Step 1). It is a gate,
not an advisory comment appended while work continues. A session that emits
`CONTEXT_INSUFFICIENT` and then keeps generating has not used this skill — it has decorated a
guess. Resumption requires the resumption gate (Section 3 Step 3) to pass.

### B. Generic stage framing for mvp (not only the ML cycle chain)

The "stage" whose position you declare is any mvp pipeline position, e.g.:

```
- a NestJS service that receives a request and produces output another service/controller consumes;
- a RAG sidecar step that receives a query from the Node RAG fabric and returns retrieval the
  fabric consumes (the consumer requirement = the shape the fabric expects back);
- a React data hook that receives API output and produces view-model state a component consumes.
```

Q0a (RECEIVES) / Q0b (PRODUCES) / Q0c (CONSUMER) / Q0d (CONSUMER REQUIREMENT) apply unchanged.
If the Node↔sidecar request/response contract is unknown, Q0d fails → `CONTEXT_INSUFFICIENT`.

### C. Verify (mvp)

```
Q0a/Q0b shape verified : read the producer + consumer call sites (.ts) / Pydantic models (.py).
Pipeline contract check : npx jest --testPathPattern=<stage>  → green is necessary, NOT sufficient;
                          a green stage that fails Q0d has produced noise, not a deliverable.
```

### Note-only (NOT ported — stays in G12, R5)

The canonical 4-cycle ML data-contract table (Cycle 1–4 DPO/depth consumer requirements) is a
`llm_mvp_core` topology and stays there; mvp uses the generic stage framing above.
