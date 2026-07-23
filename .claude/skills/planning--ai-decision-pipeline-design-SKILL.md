---
name: ai-decision-pipeline-design
sk_number: SK-513
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  How to design any decision that runs through IAIDecisionPipeline. The planning
  AI pipeline mirrors the code generation pipeline: N blind implementors from
  different model families, specialized arbiters, graph-provided context, and
  V9-002 compliance. Fires after SK-510 classifies a decision as AI PIPELINE (Q4).
triggers:
  - "wire through AI pipeline"
  - "AI-arbitrated decision"
  - "IAIDecisionPipeline"
  - "V9-002 for planning"
  - "how does the AI decide"
  - "implementor-arbiter pattern"
  - "planning AI pipeline"
  - "multi-model decision"
---

# AI Decision Pipeline Design (SK-513)

## WHEN TO INVOKE

After SK-510 classifies a decision as AI PIPELINE (Q4). Before writing any
component that calls `IAIDecisionPipeline.decide()`. Also applies when
confidence is below threshold and the Graph RAG path falls back to AI.

---

## WHAT THIS SKILL PREVENTS

- `ai.decide()` single call returning both chosen and rejected from same model
  (V9-002 violation — single-model pseudo-DPO)
- Planning AI pipeline structurally different from code-gen pipeline (two separate
  systems when one architecture serves both)
- AI pipeline that always runs regardless of confidence (cost never decreases)
- Decisions that use AI but produce no DPO triple (learning opportunity lost)

---

## THE FOUR ROLES

The planning pipeline mirrors code generation with four roles:

**1. Implementors** — N models propose decision candidates independently.
```
Minimum: 2 implementors from DIFFERENT model families
Protocol: blind, shuffled, labeled A/B/C (model attribution stripped before arbiters)
Output: structured decision in a defined schema (not free-text)
Example: Implementor A (Claude) proposes PROMPT_PATCH for score 0.68 on ROUTING.
         Implementor B (Gemini) proposes REGENERATE for the same situation.
```

**2. Arbiters** — challenge each candidate against iron rules from the graph.
```
Roles: graph-queried, not hardcoded (ARCHETYPE → REQUIRES_ARBITER edges)
key_principles arbiter runs ISOLATED (P20)
blockSemantics: ANY_BLOCK_CLASS_REJECTS
BLOCK verdict → candidate removed from pool (DNA invariant)
```

**3. Context** — provides graph traversal results + historical DPO triples.
```
NOT an AI model — this role queries IGraphRagService
Provides: relevant edges, anti-pattern AVOID edges, historical outcomes
Context injection: into each implementor's prompt as structured data
```

**4. Manager (upper judge)** — selects the winner when arbiters disagree.
```
Model: different family from both implementors if possible
Winner = chosen (with modelUsed)
Strongest alternative = rejected (with modelUsed)
V9-002 enforcement: chosen.modelFamily ≠ rejected.modelFamily
```

---

## V9-002 COMPLIANCE FOR PLANNING DECISIONS

```
RULE: chosen.model ≠ rejected.model (different model families)

Implementation:
  1. Implementor A (Claude-family) proposes decision DA
  2. Implementor B (Gemini-family) proposes decision DB
  3. Upper judge (from non-winning family) selects winner
  4. Winner → chosen { decision, reasoning, modelUsed: 'claude-sonnet-4-20250514' }
  5. Runner-up → rejected { decision, reasoning, modelUsed: 'gemini-2.0-flash' }

If only one model family available:
  → Pipeline still runs (single implementor)
  → DPO triple marked: trainingCategory = 'MONO_MODEL_CALIBRATION'
  → countsTowardThreshold: false (insufficient cross-model validation)
```

---

## WHEN AI ACTIVATES

```
Graph edge confidence ≥ tier threshold → GRAPH LOOKUP (no AI, no cost, no DPO)
Graph edge confidence < tier threshold → AI PIPELINE ACTIVATES

Tier thresholds (from SK-512):
  LOW RISK:   0.75
  MEDIUM:     0.85
  HIGH RISK:  0.95
```

---

## DPO TRIPLE STRUCTURE

Every AI pipeline activation produces a DPO triple:

```typescript
{
  category: 'ROUTING_DECISION' | 'CALIBRATION_COMPARISON' | 'ESCALATION_DECISION',
  trainingCategory: 'GENERATED',
  countsTowardThreshold: true,
  curriculumTier: 1,             // planning decisions = highest strategic value
  chosen: { decision, reasoning, modelUsed },
  rejected: { decision, reasoning, modelUsed },
  teachingPoint: string,
  trainingDataQuality: 'OUTCOME_PENDING',  // upgraded to VALIDATED at Phase F
}
```

---

## ANTI-PATTERNS

❌ Single `ai.decide()` call returning both chosen and rejected.
   Both sides from the same model = confirmation bias, not genuine evaluation.

❌ Hardcoding arbiter roles in the pipeline configuration.
   Arbiter roles come from graph edges. The panel grows as edges promote.

❌ AI pipeline that runs for every decision regardless of confidence.
   The entire purpose of the graph is to make AI unnecessary for confident decisions.

❌ Free-text output from implementors.
   Every implementor must return a structured schema. Free-text can't be compared.
