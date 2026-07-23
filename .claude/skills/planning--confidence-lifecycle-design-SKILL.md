---
name: confidence-lifecycle-design
sk_number: SK-512
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
layer: dynamic-decision-architecture
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  The complete confidence lifecycle for graph edges: seeding formula, learning
  mechanics, promotion thresholds, decay protection, and AI graduation trigger.
  Consolidates what was previously scattered across six documents. Covers edge
  lifecycle (SEED → OPTIONAL → PROMOTED → REQUIRED) within the confidence model.
triggers:
  - "initial confidence"
  - "how does this learn"
  - "promotion threshold"
  - "decay window"
  - "confidence formula"
  - "graduation trigger"
  - "M3 planning"
  - "edge lifecycle"
  - "when does AI stop"
---

# Confidence Lifecycle Design (SK-512)

## WHEN TO INVOKE

After SK-511 designs graph entities. Before any edge is seeded. Before writing
any RetrospectiveService measurement plan. This skill is the single source of
truth for all confidence-related formulas and thresholds.

---

## WHAT THIS SKILL PREVENTS

- All edges seeded at equal confidence (throws away prior knowledge)
- Confidence updates without decay protection (5 outliers override 30 good runs)
- Promotion thresholds hardcoded in TypeScript (must be FREEDOM config)
- AI pipeline that never graduates (cost never decreases)
- AI pipeline that graduates too early (wrong decisions at high confidence)

---

## PHASE 1 — SEEDING

Initial confidence comes from evidence, not guesswork:

```
Source                                 → Initial confidence
Skill author judgment (no evidence)    → 0.1
Flow history (N validated flows)       → min(0.8, 0.1 + N × 0.04)
  ROUTING (24 flows):     0.1 + 0.96  → capped at 0.8
  CONVERGENCE (1 flow):   0.1 + 0.04  = 0.14
  ALGORITHM (0 flows):    0.1
Architectural invariant                → 1.0, immutable: true
```

Never seed at 1.0 unless immutable. Always room to learn.

---

## PHASE 2 — LEARNING (per observation)

```
outcomeWasPositive: true  → confidence += delta
outcomeWasPositive: false → confidence -= delta

Default deltas (FREEDOM config, not hardcoded):
  engine.graph.confidenceDelta = 0.05     (standard edges)
  AVOID edges: +0.06 per violation        (stronger — violations are clear signals)
  PREFERRED_MODEL edges: ±0.03            (slower — model changes are higher risk)
```

What constitutes "positive" and "negative" is decision-specific — see SK-515
for outcome attribution design per decision type.

---

## PHASE 3 — PROMOTION

```
OPTIONAL_ARBITER  → PROMOTED_ARBITER   at observationCount ≥ optionalToPromotedThreshold
PROMOTED_ARBITER  → REQUIRES_MINIMUM   at observationCount ≥ promotedToRequiredThreshold

FREEDOM config keys (never hardcoded):
  engine.graph.optionalToPromotedThreshold  default: 3
  engine.graph.promotedToRequiredThreshold  default: 5
```

`promoteEdgeIfThresholdMet()` fires at Phase F for every archetype that ran.
Returns `'PROMOTED' | 'REQUIRED' | 'UNCHANGED'` — logged by RetrospectiveService.

---

## PHASE 4 — DECAY PROTECTION

```
Decay window: max(5, floor(currentObservationCount / 4))
  — grows with accumulated evidence, not fixed at bootstrap time
  — edge with 50 observations: window = 12 (harder to override)
  — edge with 3 observations:  window = 5  (minimum, still protected)

Snapshot constraint (mandatory):
  |currentWeight - max(snapshots[].weight)| ≤ 0.2
  UNLESS evidenceSinceSnapshot > snapshot.flowCount

Effect: 5 outlier runs cannot move weight more than ±0.2 from the
        highest historical snapshot. Only proportional counter-evidence
        (more observations than the snapshot accumulated) can override.
```

---

## PHASE 5 — GRADUATION (M3 for planning decisions)

```
When confidence ≥ engine.decision.confidenceThreshold (FREEDOM config):
  → Bypass AI pipeline entirely
  → Read graph edge directly
  → No DPO triple produced (nothing to learn — the graph is confident)
  → Cost drops to zero for this decision

Risk-tier thresholds:
  LOW RISK  (model selection, cycle budget):      0.75
  MEDIUM    (arbiter panel, check selection):      0.85
  HIGH RISK (score routing, escalation):           0.95
  NEVER     (architectural invariants):            1.0, immutable: true
```

This is M3 applied to planning decisions: start with cloud AI for all decisions,
graduate to graph lookup for confident decisions, graduate fully when the graph
covers the entire decision space.

---

## IMMUTABLE EDGE LIST (architectural invariants)

```typescript
const INVARIANT_EDGES = [
  { from: 'ARBITER_ROLE:key_principles', property: 'isolated', value: true },
  { from: 'SCORE_BRACKET:STRUCTURAL', to: 'STOP_STRUCTURAL', type: 'TRIGGERS_ACTION' },
  { from: 'BLOCK_VERDICT', to: 'REMOVE_FROM_POOL', type: 'FORCES' },
];
// These get confidence: 1.0, immutable: true. No learning. No decay. No promotion.
```

---

## ANTI-PATTERNS

❌ Hardcoding promotion thresholds in TypeScript instead of FREEDOM config.
   `if (observationCount >= 5)` is a FREEDOM violation. Use `config.get()`.

❌ Seeding all edges at 0.1 regardless of evidence.
   A ROUTING archetype validated by 24 flows deserves 0.8, not 0.1.

❌ Setting confidence delta too large (0.2 per observation).
   3 outlier runs would shift confidence by 0.6 — past any reasonable threshold.

❌ Setting confidence delta too small (0.001 per observation).
   Would take 500 runs to reach promotion threshold. Learning stalls.

❌ Applying decay protection to AVOID edges.
   AVOID edges should strengthen monotonically from violations. A violation is
   never an "outlier" — it's always evidence that the anti-pattern is real.
