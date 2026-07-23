---
name: algorithm-as-service
sk_number: SK-497
version: "1.0.0"
priority: HIGH
load_order: 1
category: planning
layer: product
author: luba
updated: "2026-03-26"
contexts: ["web-session", "claude-code"]
description: >
  Five distinct algorithm classes appear in the UMLs: matching, ranking,
  personalization, temporal weight decay, and gamification. Each requires
  a specific architectural pattern in XIIGen — different from ROUTING,
  ORCHESTRATION, or DATA_PIPELINE archetypes. This skill encodes how to
  design an algorithm-based service as a task type: where the weights live,
  how the model trains, what the iron rules are, and how it fits the AF pipeline.
triggers:
  - "ranking algorithm"
  - "matching algorithm"
  - "scoring weights"
  - "recommendation engine"
  - "feed personalization"
  - "gamification service"
  - "temporal decay"
  - "ML scoring"
  - "weight calculation"
  - "algorithm task type"
---

# Algorithm-as-Service Pattern (SK-497)

## WHAT THIS SKILL PREVENTS

Hardcoding algorithm weights as machine constants when they are FREEDOM config
(the T65 error class applied to ML scoring). Building ranking services with no
test strategy for score correctness. Designing algorithms that can't learn from
feedback. Missing the connection between the algorithm's output and the XIIGen
DPO training loop.

---

## THE FIVE ALGORITHM CLASSES

### Class 1 — WEIGHTED_SCORING (most common)

**Pattern:** Takes N input signals, applies weights, produces a composite score.
**Examples:** Post distribution scoring, friend connection matching, event feed ranking.

```
CompositeScore = Signal1 × W1 + Signal2 × W2 + ... + SignalN × WN
where W1..WN are FREEDOM config values that sum to ~1.0
```

**Task type archetype:** DATA_PIPELINE (transforms inputs to a score output)
**Iron rules:**
- `scoring_weights_from_freedom_config` (score-0): weights must be `config.get(key, default)`
- `weights_sum_to_one`: verify W1+W2+...+WN ≈ 1.0 at startup (allow ±0.05 tolerance)
- `score_range_zero_to_one`: output must be clamped to [0.0, 1.0]
- `score_denominator_not_zero`: guard division-by-zero when all signals are absent

**FREEDOM config keys pattern:**
```
scoring.[domain].[signal]Weight: default_value
e.g.: scoring.postDistribution.matchWeight: 0.25
```

**Test strategy:**
```typescript
// MACHINE constant test: weights must NOT be hardcoded
it('should read match weight from FREEDOM config, not hardcode', () => {
  const customWeight = 0.40;  // different from default 0.25
  mockConfig.set('scoring.postDistribution.matchWeight', customWeight);
  const score = calculator.compute(signals);
  expect(score).toBeCloseTo(customWeight * signals.match + ...);
  // config.get() version: score changes with config
  // hardcoded version: score stays at 0.25 × signal regardless of config
});
```

**DPO training value:** HIGH — weight configuration is the most common operator
customization. A model that learns "weights are FREEDOM config" generalizes correctly
to all future ranking task types.

---

### Class 2 — TEMPORAL_DECAY (time-sensitive ranking)

**Pattern:** Score decreases as time since the event increases. Used in feed
ranking, event participation weight adjustment, content freshness.

**Example from UML:** Event participation tracking
```
Week prior:    maxAttendanceWeight
Day of:        increasedBoost
Post-event:    decayFunction(timeSinceEvent)
```

**Task type archetype:** SCHEDULED (runs periodically to update decayed scores)
**Iron rules:**
- `decay_function_from_freedom_config` (score-0): decay rate must be configurable
- `decay_never_below_floor`: score has a minimum floor (e.g., 0.05) — never 0
- `decay_idempotent`: running decay twice on same input = same result
- `decay_timestamp_from_event`: always use event timestamp, never `Date.now()` directly

**FREEDOM config keys:**
```
scoring.decay.[domain].halfLifeHours: 24
scoring.decay.[domain].floor: 0.05
scoring.decay.[domain].boost.dayOf: 1.5
```

**Test strategy:**
```typescript
it('should apply decay based on configurable half-life, not hardcoded rate', () => {
  const shortHalfLife = 1;  // 1 hour for test
  mockConfig.set('scoring.decay.event.halfLifeHours', shortHalfLife);
  const score24hLater = decay.compute(baseScore, eventTime, now + 24 * 3600 * 1000);
  // With 1h half-life: score should be ~baseScore × (0.5)^24 ≈ near floor
  expect(score24hLater).toBeLessThan(baseScore * 0.01);
  expect(score24hLater).toBeGreaterThanOrEqual(0.05);  // floor holds
});
```

---

### Class 3 — RECOMMENDATION (ML model + feedback loop)

**Pattern:** Learns from user behavior (clicks, purchases, completions) to improve
future recommendations. The ML model updates over time.

**Task type archetype:** ORCHESTRATION (coordinates signal collection, model update, output)
**Iron rules:**
- `training_data_via_fabric` (score-0): IMLService for model updates, not direct SDK
- `recommendation_personalized_not_global`: output must be per-user, not the same for all
- `feedback_loop_wired`: feedback.handler must capture implicit signals (click, skip)

**Key distinction from WEIGHTED_SCORING:** The weights CHANGE based on feedback.
WEIGHTED_SCORING has static (but configurable) weights. RECOMMENDATION has adaptive weights.

**FREEDOM config keys:**
```
ml.recommendation.[domain].modelId: "default-v1"
ml.recommendation.[domain].minSignalsForPersonalization: 10
ml.recommendation.[domain].fallbackStrategy: "popular" | "recent" | "random"
```

**Connection to XIIGen DPO loop:**
The community platform's recommendation ML model (IMLService.updateModel) is
architecturally separate from XIIGen's code generation DPO loop. See D-ML-001.
Do NOT wire IMLService to `xiigen-training-data` index.

---

### Class 4 — MATCHING (multi-criteria similarity)

**Pattern:** Takes two entities and computes similarity across N dimensions.
Used in friend suggestions, business matching, event recommendations.

**Task type archetype:** DATA_PIPELINE
**Iron rules:**
- `match_score_symmetric`: match(A,B) == match(B,A) for all inputs
- `match_score_bounded`: score ∈ [0.0, 1.0]
- `match_weights_from_freedom_config` (score-0): each dimension weight is FREEDOM config
- `match_never_self`: entity never matches itself (guard: if sourceId == targetId return 0.0)

**Iron rule for the symmetric test:**
```typescript
it('should produce symmetric scores', () => {
  const scoreAB = matcher.compute(memberA, memberB);
  const scoreBA = matcher.compute(memberB, memberA);
  expect(Math.abs(scoreAB - scoreBA)).toBeLessThan(0.001);
});
```

---

### Class 5 — GAMIFICATION (points + levels + achievements)

**Pattern:** Awards points for actions, computes level from total points, unlocks
achievements based on milestone events.

**Task type archetype:** DATA_PIPELINE (or best-effort OBSERVER)
**Iron rules:**
- `points_via_fabric` (score-0): IGamificationService.awardPoints(), never direct DB write
- `points_idempotent`: same action + idempotency key = same points, not doubled
- `achievement_check_after_award`: check achievements after every point award
- `level_computed_not_stored`: level is derived from total points, never stored independently

**FREEDOM config keys:**
```
gamification.points.[action]: default_value
gamification.levels.thresholds: [100, 500, 1000, 5000]  // FREEDOM array
```

---

## FLOW DESIGN CHECKLIST FOR ALGORITHM TASK TYPES

Before designing any algorithm-class task type:

```
1. Classify the algorithm (WEIGHTED_SCORING / TEMPORAL_DECAY / RECOMMENDATION /
   MATCHING / GAMIFICATION)
2. Register all weight/rate FREEDOM config keys before Phase A
3. Add scoring_weights_from_freedom_config (or equivalent) as iron rule at score-0
4. Write the MACHINE constant negative test (config variant produces DIFFERENT result)
5. Design the feedback loop: what user action signals model improvement?
6. Connect to IMLService if Class 3; connect to IGamificationService if Class 5
7. Add weights_sum_to_one guard if Class 1
```

---

## FC-32 CONNECTION

The `scoring_weights_from_freedom_config` named check from XIIGEN-VISION-ALIGNMENT-PLAN
I-2 maps to Classes 1, 4, and partially 2. Apply it to every task type where the
algorithm computes a composite score. The named check pattern (detecting decimal
literals in scoring contexts) should be refined using the Class 1 multi-weight
summation pattern as the discriminator — not every decimal literal, only those
appearing in weighted combinations.
