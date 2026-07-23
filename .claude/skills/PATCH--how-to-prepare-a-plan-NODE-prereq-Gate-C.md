# PATCH: how-to-prepare-a-plan-SKILL.md — NODE Prereq + Gate C Decisions
## Applies to: planning--how-to-prepare-a-plan-SKILL.md
## Version: v1.0.3 | Date: 2026-03-24
## Source: XIIGEN-SKILLS-GAP-DOCUMENT.md — EDIT 2

---

## HOW TO APPLY

**Addition A** — insert before Phase A content (after implementationMode declaration):
**Addition B** — insert after existing Gate C description:
**Addition C** — insert in Phase A exit gate:

---

## ADDITION A: PHASE A PREREQUISITE — NODE CONVERGENCE

Insert before the "Phase A content" section:

```
PHASE A PREREQUISITE: NODE CONVERGENCE

Before writing any Phase A session content, define the NODE for
each capability this flow will generate.

For each task type (T-XXX) with capabilityRouting[].decision = FLOW:
  □ structure: inputShape, outputShape, dependencies, triggers, emits
  □ intent: purpose (one sentence, plain language, NO stack names),
            invariants[], failureModes[], domainConcepts[]
  □ constraints: iron rules in CF-N format
  □ quality: scoringCriteria[], acceptanceThreshold, degradationConditions

The NODE is written in the FLOW-XX-REFERENCE-PLAN.md.
Session files reference the NODE. They do NOT restate it.

Until convergence.handler infrastructure exists (Task 7 — pre-FLOW-01):
  Build NODEs manually in REFERENCE-PLAN.md using the node: field template.
  Capture design reasoning as DESIGN_REASONING signals manually at Gate C.

Gate: every task type with decision=FLOW has a complete NODE representation
before Phase A is marked COMPLETE.
```

---

## ADDITION B: GATE C — ARCHITECTURE-DECISIONS.JSON

Insert after the existing Gate C (human approval) description:

```
GATE C ADDITIONAL REQUIRED OUTPUT: FLOW-XX-ARCHITECTURE-DECISIONS.json

Before session files are produced, produce FLOW-XX-ARCHITECTURE-DECISIONS.json.

Required entries — one for each of these that occurred in this session:
  □ Any Q1-Q4 classification where the answer was non-obvious
  □ Any capability reclassification (INCOMPATIBLE → IMPL_VARIES_WITH_PROVIDER,
    MANUAL → FLOW, SERVICE → FLOW)
  □ Any wave assignment (if non-obvious — more than one valid wave would work)
  □ Any iron rule derived from domain analysis (not copied from a template)
  □ Any fabric interface introduced to replace a hardcoded dependency
  □ Any cross-flow dependency identified that could produce a BFA conflict

Each entry uses the DESIGN_REASONING triple format:
  (inline excerpt — no cross-reference needed at Gate C execution):
  {
    "type": "DESIGN_REASONING",
    "index": "xiigen-rag-patterns",
    "data": {
      "patternId": "arch-decision::{flowId}::{decisionId}",
      "patternType": "ARCHITECTURE_DECISION",
      "context": "{description of the planning situation}",
      "finalRepresentation": "{what was decided}",
      "teachingPoint": "{one sentence: what future sessions should learn}",
      "principleApplied": "{M1-M5, P1-P22 or CF-N reference}",
      "qualityScore": 0.85,
      "tier": "SEED"
    }
  }
  Full schema with challenges/resolutions: code-execution--learning-signal-capture-SKILL.md
  (this cross-ref is acceptable in planning patches — not in Claude Code SESSION-N.md files)

SEEDING: ARCHITECTURE-DECISIONS.json is seeded to xiigen-rag-patterns with
patternType: ARCHITECTURE_DECISION at the START of Phase A seeding.
Do NOT defer seeding to Phase F. Future planning sessions need these decisions
immediately — not after the entire flow completes.

⛔ Gate C does NOT pass without ARCHITECTURE-DECISIONS.json present.
```

---

## ADDITION C: PHASE A EXIT GATE — STACK PORTABILITY

Insert in Phase A exit gate section:

```
PHASE A EXIT GATE — STACK PORTABILITY CHECK

For each task type where stackProfiles contains more than one stack:
  □ stackProfile entry exists for each listed target stack
  □ At least one stack has tier: IMPL_VARIES or IMPL_VARIES_WITH_PROVIDER
    (if ALL stacks are CONCEPT_NEUTRAL or INCOMPATIBLE, review whether
    INCOMPATIBLE classifications are at the right abstraction level)
  □ No stack has tier: INCOMPATIBLE without a documented mitigation
  □ The genesis prompt Section 4 (or equivalent) exists for each
    non-INCOMPATIBLE stack

If any capability has only one stack profile (primary only):
  → FLAG for review: was multi-stack considered and found unnecessary?
  → Document the answer. "Single-stack by design" is acceptable.
  → "Single-stack because we didn't check" is a P14 violation.
```
