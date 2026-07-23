---
name: static-to-graph-topology-refactoring
sk_number: SK-516
version: "1.0.0"
priority: MEDIUM
load_order: 2
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  How to refactor an existing static topology to use graph-backed routing with
  confidence-gated AI fallback. Shows the before/after pattern, the two-step
  feedback mechanism (decision at route time, outcome at Phase F), and the
  five refactoring rules. Depends on SK-517 for IGraphRagService query patterns.
triggers:
  - "refactor this topology"
  - "add graph to existing flow"
  - "static to dynamic"
  - "graph-backed routing"
  - "replace hardcoded branches"
  - "convert route.handler"
---

# Static-to-Graph Topology Refactoring (SK-516)

## WHEN TO INVOKE

When reviewing an existing topology that has static route.handler branching
or hardcoded decision thresholds. When designing a new topology that should
be graph-ready from the start. After SK-511 (entity design) and SK-517
(fabric integration) — this skill uses their patterns.

---

## WHAT THIS SKILL PREVENTS

- Removing route.handler entirely (graph failure = generation stops)
- Adding graph queries without recording the decision (graph never learns)
- Refactoring a genuinely static decision (not everything should learn)
- Recording decision AND outcome inline (outcome is unknown until Phase F)
- Using a nonexistent handler type for graph queries

---

## THE TRANSFORMATION PATTERN

```yaml
BEFORE (static — typical existing flow topology):
  n3: route.handler
    condition: "${n2.score}"
    branches:
      ">=85": "n-pass"
      ">=65": "n-prompt-patch"
      "default": "n-fail"

AFTER (graph-backed):
  n3a: rag-retrieve.handler
    # EXISTING handler type, extended to query decision graph.
    # "graph-query" is NOT a separate handler type.
    # rag-retrieve.handler supports source: "decision-graph" alongside
    # its existing source: "rag-patterns" mode. When source is
    # "decision-graph", it calls IGraphRagService.query().
    # See SK-517 for the injection pattern.
    handler: "rag-retrieve.handler"
    config:
      source: "decision-graph"
      query:
        fromEntity: "${archetype}:${scoreBracket}"
        relationship: "ROUTES_TO"
      minConfidence: "${config.engine.decision.routingThreshold}"

  n3b: route.handler
    # STILL EXISTS — reads from graph result, not hardcoded branches.
    # If graph confidence is below threshold, AI fallback result is used.
    condition: "${n3a.confidence >= threshold ? n3a.graphResult : n3a.aiResult}"
    branches: "${n3a.routingDecision}"

  n3c: feedback.handler
    # STEP 1 of two-step feedback: records DECISION only (not outcome).
    # outcomeClass starts as PENDING — resolved at Phase F.
    learning_signals:
      - type: "ROUTING_DECISION"
        data:
          decisionId: "${uuid}"
          decision: "${n3b.taken}"
          score: "${n2.score}"
          cyclesUsed: "${flow.cycleCount}"
          cycleBudget: "${config.cycleBudget}"
          outcomeClass: "PENDING"

  # ... rest of topology continues ...

  # STEP 2 fires at Phase F retrospective (not inline):
  # For each ROUTING_DECISION with outcomeClass === "PENDING":
  #   Determine outcome: SUCCESS_WITHIN_BUDGET | WASTED_CYCLE | ESCALATION_REQUIRED
  #   Call IGraphLearningService.updateEdge()
  #   Update DPO triple trainingDataQuality → "VALIDATED"
  # See SK-515 retrospective plan template.
```

---

## FIVE REFACTORING RULES

1. Every static route.handler with >2 branches is a refactoring candidate
2. Every hardcoded threshold referenced by >1 flow is a refactoring candidate
3. The graph query runs via `rag-retrieve.handler` with `source: "decision-graph"` BEFORE the route
4. The route.handler STILL EXISTS — it reads from graph result, not from hardcoded branches
5. Feedback is TWO STEPS: inline n3c records decision with `outcomeClass: "PENDING"`, Phase F retrospective resolves outcome and updates graph edge

---

## TWO-STEP FEEDBACK

**Why two steps?** A routing decision at score 0.68 that chooses PROMPT_PATCH
does not know if PROMPT_PATCH was the right action until Phase F determines
whether the score improved. Recording `outcomeWasPositive: true` at decision
time is a lie — the outcome is genuinely unknown.

```
Step 1 (inline, at decision time):
  Record: what action was taken, at what score, in which cycle
  outcomeClass: "PENDING"
  trainingDataQuality: "OUTCOME_PENDING"

Step 2 (Phase F retrospective, after flow completes):
  Determine: SUCCESS_WITHIN_BUDGET / WASTED_CYCLE / ESCALATION_REQUIRED
  Update: graph edge confidence via IGraphLearningService.updateEdge()
  Update: DPO triple trainingDataQuality → "VALIDATED"
  Check:  promoteEdgeIfThresholdMet() for promotion candidates
```

---

## WHAT NOT TO REFACTOR

Not every route.handler needs graph backing:

- Binary pass/fail gates (validate.handler result → pass or stop): STATIC
- DNA invariant routing (BLOCK → remove from pool): IMMUTABLE, not learnable
- Route to different handler types (generate vs convergence): STATIC structure
- Route.handler with exactly 2 branches and clear domain rules: usually FREEDOM CONFIG

Apply SK-510's four-tier test first. Only refactor decisions classified as GRAPH RAG.

---

## ANTI-PATTERNS

❌ Removing the route.handler entirely and replacing it with graph-query.
   The route.handler is the fallback when the graph is unavailable or confidence
   is below threshold. Remove it and graph failure kills generation.

❌ Adding a graph query without a feedback node after the route.
   The graph query retrieves knowledge. The feedback node records the decision.
   Without feedback, the graph provides answers but never receives evidence.

❌ Recording the outcome at decision time instead of Phase F.
   `outcomeClass: "SUCCESS_WITHIN_BUDGET"` written at score.handler.complete
   is a guess, not a measurement. The outcome is only known at Phase F.
