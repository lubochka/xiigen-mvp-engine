---
name: archetype-failure-map
sk_number: UNASSIGNED
version: "1.0.0"
priority: HIGH
load_order: 2
category: planning
author: luba
updated: "2026-06-29"
contexts: ["web-session", "claude-code"]
description: >
  Before implementing any capability class, declare a score-bracket action table and a
  per-capability failure map: the expected cycle-1 score, the common first-cycle failure,
  the iron rule that fixes it, and the escalation trigger. Knowing the expected failure in
  advance stops the team from treating a normal cycle-1 score as a crisis, and stops it from
  escalating before the cycle budget is spent. The inversion pattern (a correct score of 0 on
  cycle 1) is named so a low first score is read as a signal, not a defect.
triggers:
  - "archetype failure map"
  - "what score should cycle 1 produce"
  - "expected cycle-1 score"
  - "when to escalate this capability"
  - "score bracket action"
  - "is this score a pass"
  - "before implementing this capability"
  - "capability failure template"
---

# Archetype Failure Map Skill

Declares, before a capability is implemented, what its first-cycle score is expected to be,
what failure that score most likely represents, the fix, and the escalation trigger. Without
this map, every cycle-1 score is interpreted ad hoc: a normal 0.62 looks like a failure, a
suspicious 0.95 looks like success, and escalation happens either too early or too late.

> **MVP note (note-only).** The ML archetypes (`HybridRetriever`, `IncrementalTrainer`,
> `ContinuousLearningPipeline`, multi-generate DPO arbiter) named in the core reference are
> **reference-only here**. By R5/R6 those models and their training stay in `llm_mvp_core`
> and are consumed through a manifest; this MVP does not implement or score them locally.
> The active capability classes for the MVP are NestJS domain services/providers and React
> pages, and the brackets below are measured with the MVP's own tooling, not a training runner.

## When to Invoke

- Before writing the genesis prompt or first implementation of any capability class.
- Before reading a cycle-1 score, so the score is compared to an expectation declared earlier.
- Before any decision to escalate a capability to a human or to a full rewrite.

## Step 1 — Declare the Score-Bracket Action Table

For every capability, the same bracket table governs what a score means and what action it
triggers. Declare it before cycle 1 so no score is interpreted ad hoc.

| Score bracket | Verdict | Required action |
|---|---|---|
| ≥ 0.85 | PASS | Accept the cycle. No patch. Move to the next capability. |
| 0.70 – 0.84 | NEAR-PASS | One targeted patch on the single lowest sub-score (see prompt-patch-authoring Rule 0). |
| 0.60 – 0.69 | PATCH | Patch the bottleneck; re-run within the cycle budget. |
| < 0.60 | STRUCTURAL_FAILURE | Stop patching. The genesis/implementation has misunderstood the capability — rewrite the relevant section, do not keep patching. |

Brackets are measured in this MVP with concrete tooling, never "looks fine":

- build / type gate: `npm run build` (server and client) returns 0 errors;
- unit gate: `npx jest <path>` reports an exact `N passed, 0 failed`;
- e2e / UI gate: `npx playwright test <spec>` passes the named scenario.

The score for a code capability is the fraction of its declared sub-checks (iron rules,
DNA checks, role/scope checks) that pass under these gates — not a subjective rating.

## Step 2 — Write the Per-Capability Failure Map

Before implementation, fill one row per capability:

```
Capability:           [name / task type]
Expected cycle-1:     [bracket — e.g. NEAR-PASS 0.70–0.84]
Common failure:       [the single most likely first-cycle miss]
Fix (iron rule):      [the CF-N rule or named check that closes it — see iron-rule-derivation]
Escalate trigger:     [the exact condition that ends the cycle budget and calls a human]
```

Worked example (MVP NestJS capability):

```
Capability:           Flow-01 UserRegistrationInitiator (T47)
Expected cycle-1:     NEAR-PASS (0.70–0.84)
Common failure:       email-uniqueness check missing before write → duplicate user records
Fix (iron rule):      CF-1 (email uniqueness MUST be verified BEFORE user record creation)
Escalate trigger:     2 patches on the same sub-score with no movement, OR score < 0.60
```

Worked example (MVP React page capability):

```
Capability:           Flow-29 tenant-facing dashboard page
Expected cycle-1:     NEAR-PASS (0.70–0.84)
Common failure:       wrong grammar for a tenant-facing surface (SK-539 UX-30) / missing role guard
Fix (iron rule):      declare grammar type + role guard before JSX; FC-18 audit trail per page
Escalate trigger:     Playwright scenario still failing after the cycle budget, OR STRUCTURAL_FAILURE
```

## Step 3 — Apply the Inversion Pattern

A score of 0 on cycle 1 can be the correct, expected result, not a defect. When the capability
deliberately starts from a vague (principles-only) prompt to extract genuine model understanding,
a low first score is the signal that the prompt left room — exactly what produces high-value
training data in the core loop (prompt-patch-authoring Rule 2 specificity table). Declare in the
failure map whether a low cycle-1 score is expected-good (inversion) or a real miss, so the team
does not "fix" a score that was meant to be low.

## Cycle-Budget Discipline

Never escalate a multi-pattern capability before its cycle budget is exhausted. The escalate
trigger in the failure map is a condition (budget spent, or two patches with no movement, or
STRUCTURAL_FAILURE), never a feeling that progress is slow. A capability with remaining budget
and a known bottleneck is patched, not escalated.

## Anti-Patterns

```
❌ Reading a cycle-1 score with no pre-declared expected bracket — every score then looks
   like a surprise; a normal NEAR-PASS is mistaken for failure.
❌ Treating a score of 0 as automatic failure when the failure map declared it an inversion.
❌ Escalating before the cycle budget is spent (or before two no-movement patches).
❌ Standing up ML archetypes (HybridRetriever / IncrementalTrainer) locally in the MVP —
   they are note-only; the models live in llm_mvp_core and are consumed via manifest.
❌ A "bracket" expressed as "looks good" instead of an exact jest/playwright count.
```

## Integration

```
Invoke before: genesis prompt / first implementation of any capability class
Pairs with:    iron-rule-derivation (the "fix" column names a CF-N rule)
               prompt-patch-authoring (Rule 0 bottleneck + Rule 2 specificity/inversion)
               audit-protocol (Point 7 gate thresholds expressed as jest/playwright counts)
Feeds into:    plan-review (capability rows have declared expected score + escalate trigger)
Single source: registered in the unified HOW-TO-USE-SKILLS.md, replacing the scattered
               FLOW-DESIGN-SKILL-INDEX / flow-design-check-catalog AUTH/PORTABILITY addenda
               as the one per-archetype score→action map.
```
