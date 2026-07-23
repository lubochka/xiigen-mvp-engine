---
name: planning-dpo-authoring
sk_number: SK-514
version: "1.0.0"
priority: HIGH
load_order: 2
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Extends SK-468 (learning-signal-capture) from code generation to the planning
  layer. Defines three new planning signal types, the GENERATED vs REINFORCEMENT
  distinction, and outcome attribution via RoutingDecisionOutcome. Without this
  skill, planning decisions produce no training signal or produce derived triples
  that contaminate the graduation threshold count.
triggers:
  - "DPO from planning"
  - "ROUTING_DECISION signal"
  - "REINFORCEMENT triple"
  - "outcome attribution"
  - "planning DPO"
  - "cross-layer curriculum"
  - "GENERATED vs REINFORCEMENT"
  - "planning training data"
---

# Planning DPO Authoring (SK-514)

## WHEN TO INVOKE

After SK-513 designs the AI pipeline for a planning decision. When writing
feedback.handler learning_signals for planning topologies. When reviewing
planning DPO triples for V9-002 compliance or graduation threshold counting.

---

## WHAT THIS SKILL PREVENTS

- Planning decisions that produce no training signal (learning opportunity lost)
- Derived triples contaminating graduation threshold count (inflated curriculum)
- `outcomeWasPositive` with no definition (graph learns from undefined signal)
- Cross-layer triples violating V9-002 (they should be exempt as REINFORCEMENT)
- Missing `derivedFrom` on reinforcement triples (provenance chain broken)

---

## THREE NEW PLANNING SIGNAL TYPES

These extend SK-468's existing 9 signal types (which cover code generation only):

```
ROUTING_DECISION:        cycle router chose an action at a score bracket
  When produced: score.handler.complete → CYCLE_ROUTER fires
  Outcome known: Phase F (when final score is available)

CALIBRATION_COMPARISON:  predicted budget vs actual cycles used
  When produced: flow completion
  Outcome known: immediately (actual count is known at completion)

ESCALATION_DECISION:     escalation orchestrator chose an outcome
  When produced: arbiter.panel.complete → ESCALATION_HANDLER fires
  Outcome known: Phase F (did the escalation path improve the score?)
```

---

## GENERATED vs REINFORCEMENT

```
GENERATED:
  - Produced by multi-model pipeline (SK-513's four-role pattern)
  - Satisfies V9-002 (chosen.model ≠ rejected.model)
  - countsTowardThreshold: true
  - Used for fine-tuning corpus AND RAG retrieval
  - derivedFrom: null

REINFORCEMENT:
  - Derived from a GENERATED triple (extracted pattern, not model output)
  - Exempt from V9-002 (no cross-model requirement for derived triples)
  - countsTowardThreshold: false
  - Used for RAG retrieval ONLY (not fine-tuning corpus size)
  - derivedFrom: string (links to source GENERATED triple ID)
```

**DPO schema addition:**
```typescript
interface DpoTriple {
  // ... existing fields ...
  derivedFrom?: string;
  trainingCategory: 'GENERATED' | 'REINFORCEMENT';
  countsTowardThreshold: boolean;
  trainingDataQuality: 'OUTCOME_PENDING' | 'VALIDATED';
}
```

---

## OUTCOME ATTRIBUTION (RoutingDecisionOutcome)

For each routing decision, Phase F RetrospectiveService determines:

```
SUCCESS_WITHIN_BUDGET:   flow reached ACCEPT at or before budget → positive
WASTED_CYCLE:            cycle ran but score delta < 0.05         → negative
ESCALATION_REQUIRED:     budget exhausted without ACCEPT          → negative
```

The outcome updates BOTH:
1. The graph edge weight (via IGraphLearningService.updateEdge())
2. The DPO triple's trainingDataQuality (OUTCOME_PENDING → VALIDATED)

---

## CROSS-LAYER ROUTING

**Direction 1 — Planning → Code-gen reinforcement:**
An ESCALATION_DECISION that identifies a named check gap produces a
REINFORCEMENT triple teaching code generation what that check looks like.
```
source: GENERATED planning triple (ESCALATION_DECISION)
derived: REINFORCEMENT code-gen triple (NAMED_CHECK_REINFORCEMENT)
derivedFrom: source.id
```

**Direction 2 — Code-gen → Planning graph:**
A security arbiter BLOCK on ROUTING candidate strengthens the AVOID edge
in the planning graph. Code-gen observations feed back to planning decisions.
```
event: arbiter.block.recorded
action: IGraphLearningService.updateEdge() on AVOID edge
side effect: REINFORCEMENT triple (CODE_PATTERN_BLOCK_REINFORCEMENT)
```

---

## ANTI-PATTERNS

❌ Both `chosen` and `rejected` from the same model family.
   Single-model DPO is `MONO_MODEL_CALIBRATION` — does NOT count toward threshold.

❌ REINFORCEMENT triple with `countsTowardThreshold: true`.
   Derived triples inflate the graduation count without genuine cross-model validation.

❌ REINFORCEMENT triple without `derivedFrom`.
   Provenance chain is broken — can't trace back to the source GENERATED triple.

❌ GENERATED triple with `trainingDataQuality: 'VALIDATED'` at creation time.
   Outcome is not yet known. Must start as `OUTCOME_PENDING`. Phase F validates.
