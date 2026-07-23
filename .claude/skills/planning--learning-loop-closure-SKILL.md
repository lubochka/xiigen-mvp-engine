---
name: learning-loop-closure
sk_number: SK-515
version: "1.0.0"
priority: HIGH
load_order: 2
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  How to design the complete feedback circuit for any LEARNABLE decision:
  decision made → outcome observed → edge updated → promotion checked.
  Closes what SK-468 leaves open — SK-468 covers WHICH signals to emit,
  this skill covers HOW a component learns from its own decisions over time.
triggers:
  - "how does this learn from outcomes"
  - "learning loop"
  - "retrospective plan"
  - "outcome validation"
  - "feedback timing"
  - "when is outcome known"
  - "OUTCOME_PENDING"
  - "updateEdge trigger"
---

# Learning Loop Closure (SK-515)

## WHEN TO INVOKE

After SK-512 (confidence lifecycle) and SK-514 (planning DPO) are applied.
When designing the Phase F retrospective for any flow with LEARNABLE decisions.
Required for every flow that contains Q3 or Q4 decisions from SK-510.

---

## WHAT THIS SKILL PREVENTS

- Decisions that produce DPO triples but never update graph weights
- Missing retrospective plan (Phase F exists but measures nothing)
- Edge updates with no ground truth (`outcomeWasPositive` undefined)
- Promotion that never fires (nobody calls `promoteEdgeIfThresholdMet()` at Phase F)
- Pre-graph flows that accumulate evidence into the void

---

## THE FOUR-EVENT LEARNING LOOP

```
1. Decision made    → CYCLE_ROUTER chooses action at score.handler.complete
                      Records decision with outcomeClass: "PENDING"

2. Outcome observed → Phase F RetrospectiveService determines
                      SUCCESS_WITHIN_BUDGET / WASTED_CYCLE / ESCALATION_REQUIRED

3. Edge updated     → IGraphLearningService.updateEdge()
                      adjusts weight, increments observationCount

4. Promotion check  → promoteEdgeIfThresholdMet()
                      upgrades OPTIONAL → PROMOTED → REQUIRED if threshold crossed
```

Every LEARNABLE decision must complete all four events. A decision that only
does steps 1-2 (records and classifies) but skips 3-4 (update and promote)
produces training data that never improves the graph.

---

## RETROSPECTIVE PLAN TEMPLATE

**Required for every flow with LEARNABLE decisions.**
Add to the flow's Phase A design artifacts:

```json
{
  "retrospectivePlan": {
    "edgeUpdates": [
      {
        "from": "ARCHETYPE:ROUTING",
        "rel": "ROUTES_TO",
        "to": "PROMPT_PATCH",
        "outcomeField": "scoreImproved",
        "positiveIf": "> 0.05",
        "confidenceDelta": 0.05
      }
    ],
    "promotionCandidates": [
      {
        "from": "ARCHETYPE:ROUTING",
        "rel": "OPTIONAL_ARBITER",
        "to": "security"
      }
    ],
    "driftChecks": [
      {
        "entity": "SCORE_BRACKET:50-64",
        "metric": "averageCyclesUsed",
        "driftThreshold": "> 2.0"
      }
    ]
  }
}
```

Without this plan, Phase F runs but learns nothing.

---

## PRE-GRAPH DISCOVERY RULE

Flows designed BEFORE Phase 0 completes (FLOW-01..24) may reference
promotion candidates or edge updates for graph edges that don't exist yet.
At Phase F, `promoteEdgeIfThresholdMet()` for a nonexistent edge returns
`UNCHANGED` silently — evidence is lost.

**Rule:** For flows designed before graph deployment, the retrospective plan
must include a discovery step: before checking promotion candidates, call
`IGraphLearningService.addDiscoveredEdge()` for any edge in the plan that
doesn't exist in the graph. This registers the edge at confidence 0.60 so
subsequent observations accumulate toward promotion. Without this step,
pre-graph flows produce evidence that is never recorded.

---

## FEEDBACK TIMING

```
Decision type        When decision is recorded     When outcome is known
Routing decisions    score.handler.complete         Phase F (final score known)
Panel selection      arbiter-panel.handler launch   After panel completes (violation caught?)
Budget prediction    Phase A session start          Flow completion (actual count known)
Edge weight update   —                              Phase F retrospective
Promotion check      —                              Immediately after edge weight update
```

The gap between "decision recorded" and "outcome known" is the critical period.
During this gap, the DPO triple has `trainingDataQuality: 'OUTCOME_PENDING'`.
Phase F flips it to `VALIDATED` when the outcome is attributed.

---

## ANTI-PATTERNS

❌ Recording decision AND outcome at the same time.
   The outcome of a routing decision is NOT known when the decision is made.
   It's known at Phase F when the final score is available.

❌ Missing the retrospective plan entirely.
   "Phase F will figure it out" → Phase F has nothing to measure.
   The plan must exist at Phase A design time, not Phase F execution time.

❌ Retrospective plan references edges that don't exist and doesn't discover them.
   For pre-Phase-0 flows: `addDiscoveredEdge()` before `promoteEdgeIfThresholdMet()`.

❌ `promoteEdgeIfThresholdMet()` called with wrong `currentRelationship` value.
   The method reads the CURRENT type from the graph, not the ORIGINAL type.
   An edge already promoted to PROMOTED_ARBITER must be passed as PROMOTED_ARBITER,
   not OPTIONAL_ARBITER.
