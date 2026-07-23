---
name: node-design-review
sk_number: SK-437
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
author: luba
updated: "2026-03-24"
contexts: ["web-session", "claude-code"]
description: >
  Reviews a NODE representation before generation starts. Four checks:
  intent completeness, constraint integrity, quality measurability, and
  stack profile coverage. Different from plan-review (which checks phase
  structure) — this checks whether the verified understanding of a capability
  is correct and complete enough for generation to succeed.
triggers:
  - "review this NODE"
  - "is this NODE correct"
  - "NODE review"
  - "before Phase B generation"
  - "after convergence"
  - "check node representation"
  - "node ready for generation"
---

# Node Design Review Skill v1.0

## WHEN TO INVOKE

After `convergence.handler` completes (or after manual NODE construction).
Before Phase B generation begins. Before any genesis prompt is written.

**Input:** NodeRepresentation JSON or the `node:` block from REFERENCE-PLAN.md
**Output:** NODE-REVIEW report with READY_FOR_GENERATION | NEEDS_REVISION | ESCALATE_TO_PLANNING

---

## CHECK 1: INTENT COMPLETENESS

```
□ purpose: one sentence, plain language, NO stack terminology
□ invariants[]: covers what must always be true about behavior —
  NOT about implementation details
□ failureModes[]: non-empty, covers all exit paths from the happy path
□ domainConcepts[]: non-empty, names the abstract concepts this implements
```

**Red flags — fail immediately:**
```
✗ purpose contains: "NestJS", "WordPress", "@Injectable", "extends", "TypeScript"
  → Rewrite: "validates email ownership and issues access token upon confirmation"

✗ invariants reference libraries: "Bull/BullMQ must be used for TTL enforcement"
  → Rewrite: "token expiry must be enforced by a scheduled mechanism"
  → Move the library choice to stackProfiles[stack].implementationNotes

✗ failureModes is empty
  → At minimum: "upstream timeout", "idempotency key collision", "scheduler unavailable"

✗ domainConcepts is empty or has only one item
  → Registration flow example: ["idempotency check", "rate limiting concept",
    "token generation", "outbox-before-queue", "event emission"]
```

---

## CHECK 2: CONSTRAINT INTEGRITY

```
□ Each constraint in CF-N format (not prose)
□ No constraint is implementation-specific ("must use @Throttle()")
□ Each constraint answers: "if this is violated, what breaks?"
□ Cross-flow constraints registered in BFA (CF-N rule exists in BFA index)
```

**Red flags:**
```
✗ Constraint says "must" without specifying the failure consequence
  → "token must be revoked before replacement" is good
  → "token handling must be correct" is not a constraint

✗ Constraint duplicates a DNA pattern (DNA patterns are universal — don't repeat)
  → "outbox before queue" is DNA-8. Referencing DNA-8 is sufficient.
  → Adding a redundant per-node constraint is noise.

✗ Cross-flow constraint not in BFA registry
  → "ChangeEmailRequested must use same correlationId as original registration"
  → Must appear as CF-N in BFA rules, not just as a node constraint
```

---

## CHECK 3: QUALITY CRITERIA MEASURABILITY

```
□ Each criterion is objectively checkable by AF-9 (no human interpretation needed)
□ acceptanceThreshold is a number (not a description like "high quality")
□ degradationConditions are explicit and bounded
□ scoringCriteria[] aligns with topology qualityGates[]
```

**Red flags:**
```
✗ "code should be clean" → not measurable
  → Replace with: "no DNA violations in AF-9 check" + specific score threshold

✗ acceptanceThreshold missing
  → Add: "acceptanceThreshold": 0.82

✗ degradationConditions says "maybe" or "depends"
  → Must be explicit: "when ISchedulerService provider is action_scheduler,
    accept eventual TTL enforcement (within 60s of scheduled time)"
```

---

## CHECK 4: STACK PROFILE COVERAGE

For each target stack, one of:

```
tier: IMPL_VARIES             → implementationNotes filled
tier: IMPL_VARIES_WITH_PROVIDER → fabricInterface name specified
tier: CONCEPT_NEUTRAL         → explanation of why no adaptation needed
tier: INCOMPATIBLE            → mitigation field present + abstraction-level review documented
```

**The INCOMPATIBLE review question (must be answered for each INCOMPATIBLE stack):**

```
"Is this incompatibility at the mechanism level or the design level?"

Mechanism level: Bull/BullMQ not available on WordPress
→ Is there another mechanism that achieves the same concept?
→ If yes: introduce fabric interface → reclassify as IMPL_VARIES_WITH_PROVIDER
→ Example: ISchedulerService — resolves to Bull (NestJS) or Action Scheduler (WordPress)

Design level: The concept itself cannot exist in this environment
→ Document: which domain concept is impossible and why
→ Keep INCOMPATIBLE but document in NODE.intent.domainConcepts[]
→ Example: genuine real-time WebSocket push not possible in WordPress serverless
```

**Red flags:**
```
✗ INCOMPATIBLE without mitigation field
  → Always ask the mechanism vs design question first

✗ Single-stack NODE (only primary stack, no alternatives considered)
  → At minimum: check whether any concepts are CONCEPT_NEUTRAL
  → Most registration/verification/notification flows have IMPL_VARIES concepts

✗ Implementation notes referencing framework-specific APIs in the neutral sections
  → "Section 1 (neutral): use @Injectable() and extend MicroserviceBase"
  → This is not neutral — it's NestJS-specific. Move to Section 4 / stackProfiles.
```

---

## REVIEW OUTPUT FORMAT

```json
{
  "taskTypeId": "T47",
  "reviewTimestamp": "2026-03-24T...",
  "checks": {
    "intentCompleteness": {
      "verdict": "PASS | FAIL | WARNING",
      "issues": ["${specific field path}: ${what needs to change}"]
    },
    "constraintIntegrity": {
      "verdict": "PASS | FAIL | WARNING",
      "issues": []
    },
    "qualityMeasurability": {
      "verdict": "PASS | FAIL | WARNING",
      "issues": []
    },
    "stackProfileCoverage": {
      "verdict": "PASS | FAIL | WARNING",
      "issues": ["php-wordpress: INCOMPATIBLE without abstraction-level review"]
    }
  },
  "overallVerdict": "READY_FOR_GENERATION | NEEDS_REVISION | ESCALATE_TO_PLANNING",
  "mandatoryFixes": ["${list of FAIL items that block generation}"],
  "advisoryFixes": ["${list of WARNING items — don't block but should address}"]
}
```

**Verdict rules:**
- `READY_FOR_GENERATION`: all 4 checks PASS or WARNING only
- `NEEDS_REVISION`: any check FAIL — fix before Phase B
- `ESCALATE_TO_PLANNING`: INCOMPATIBLE without abstraction-level review, OR intent.purpose contains stack terminology that can't be fixed without redesign

---

## INTEGRATION

```
Invoke after:  convergence.handler completes (or manual NODE build)
Invoke before: Phase B generation, Phase A gate sign-off
Produces:      NODE-REVIEW-{taskTypeId}.json
Gate:          READY_FOR_GENERATION required before Phase B
References:    code-execution--node-convergence-SKILL.md (builds the NODE)
               planning--plan-review-SKILL.md FC-23/24/25 (plan-level checks)
```
