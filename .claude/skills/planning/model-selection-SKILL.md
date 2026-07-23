---
name: cost-effective-model-selection
sk: SK-425
description: >
  Guides decisions about which AI models to use in arbitration rounds,
  when to drop expensive models, when OSS models can replace flagships,
  and how to interpret model fitness signals from SK-405. Use when
  planning a new flow's model pool or when meta::model-fitness surfaces
  a cost optimization signal.
layer: meta
version: 1.0.0
createdAt: 2026-03-20
requires: []
complements: [SK-422]
---

# CostEffectiveModelSelection [SK-425]

## Purpose

Every arbitration round has a cost. The right model selection minimizes cost
without sacrificing quality. This skill captures the patterns from this
session's discussion of model fitness, OSS replacement signals, and the
three-phase progression from expensive flagships to cost-efficient alternatives.

## When AF-4 RAG Retrieves This Skill

- Planning the model pool for a new flow's sessions
- meta::model-fitness surfaces drop_candidates or oss_readiness
- "Should we keep using GPT-4 for this archetype?"
- "Is DeepSeek good enough to replace Claude here?"
- Budget warning approaching 80%

## Pattern

### Model tiers and default starting pool

```
TIER 1 — FLAGSHIP (expensive, highest capability)
  claude-sonnet-4        → best on Python/TypeScript/event contracts
  gpt-4o                 → strong on structured output and compliance
  
TIER 2 — STANDARD (moderate cost, good quality)
  claude-haiku-4         → faster, cheaper variant of flagship
  gpt-4o-mini            → faster, cheaper GPT variant

TIER 3 — OSS (low cost, growing quality)
  deepseek-coder-33b     → strong on Python/TypeScript (D5 decision)
  codellama-34b          → alternative OSS baseline

Starting pool for new flows: [claude-sonnet, gpt-4o, deepseek-coder]
  → 1 Tier 1 + 1 Tier 1 + 1 Tier 3
  → Mix ensures OSS fitness data accumulates from round 1
```

### Value ratio — the primary fitness signal

```python
value_ratio = composite_score / max(cost_usd, 0.001)
# Units: score-points per dollar
# Example: score=85, cost=$0.15 → ratio=567
# Example: score=83, cost=$0.40 → ratio=208

Interpretation:
  ratio > 500: highly cost-efficient
  ratio 200–500: acceptable
  ratio < 200: low value — drop candidate unless unique contribution
  ratio < 100: definitely drop
```

### OSS replacement signal — three-consecutive rule (CF-793)

```
OSS model is within 5% of flagship on this task type?
  Round N:   gap=4.8% → OSS close
  Round N+1: gap=3.2% → OSS close (2nd consecutive)
  Round N+2: gap=4.1% → OSS close (3rd consecutive) → SIGNAL

Three consecutive task types at <5% gap:
  → meta::model-fitness surfaces OSSReadiness(ready=True)
  → meta::round-controller generates RETRY with OSS-only round
  → If OSS-only round confirms: drop flagship for this archetype

One round at <5%: noise. Do not act.
Two rounds: promising. Continue monitoring.
Three rounds: sufficient evidence. Run OSS-only validation.
```

### When to drop a model mid-session

```
Drop immediately (no rounds needed):
  □ Security HARD_STOP in 2 consecutive rounds (SK-403 protocol)
  □ Model never compiles (score=0 on DNA compliance)

Drop after 3 rounds:
  □ value_ratio < 100 consistently
  □ No unique contribution (never passes an arbiter others don't)
  □ Scores trending downward (REGRESSION pattern for this model)

Never drop based on a single bad round:
  Models have variance. One low round is noise.
```

### Phase progression across the project lifetime

```
Phase 1 (FLOW-01 through FLOW-10):
  Use full pool [claude-sonnet, gpt-4o, deepseek-coder]
  Accumulate fitness data across all archetypes
  Track: which archetype is each model best at?

Phase 2 (after 3+ flows per archetype):
  Switch to archetype-optimized pools:
    ROUTING:      [claude-sonnet, deepseek-coder]  (gpt-4o low value on routing)
    TRANSACTION:  [claude-sonnet, gpt-4o]          (deepseek weaker on financial)
    ORCHESTRATION:[claude-sonnet, deepseek-coder]  (after fitness data confirms)

Phase 3 (after OSS fine-tuning on DPO triples):
  Fine-tuned DeepSeek model (trained on this project's data)
  May be cost-efficient enough for most archetypes
  Run validation sessions before replacing flagship
  Track: does fine-tuned model maintain quality with 0 flagship cost?
```

### Budget allocation guidelines

```
Per task type:  $0.50–$2.00
  Simple (ROUTING, PROCESSING):  $0.50–$1.00
  Complex (TRANSACTION, MIGRATION): $1.50–$2.00

Per flow:       $5.00–$15.00
  Simple (FLOW-01, FLOW-02): $5.00–$8.00
  Complex (FLOW-08, FLOW-10): $10.00–$15.00

Per session:    $30.00–$50.00

Warning at 80% of per-task budget:
  → Drop to single dominant model
  → Inject best candidate as seed
  → One more round maximum

At 100% of per-task budget:
  → HALT, take best available
  → Manual fix is almost always faster than another round
```

### The manual fix signal

```
When should Claude Code just fix it manually instead of spending more?

Indicators that manual fix is better:
  □ Score > 85 with specific, localized violations
     (one or two iron rule violations, not architectural failures)
  □ Violation is mechanical: wrong field name, missing null check,
     wrong HTTP status code
  □ Round 3+ with no improvement above round 2
  □ Cost of next round exceeds manual fix time × hourly rate

Manual fix is NOT better when:
  □ The violation is architectural (wrong pattern entirely)
  □ Multiple interconnected violations (fixing one introduces another)
  □ Score < 70 (structural problems, not surface ones)
```

## Positive Example

```
Round 3 results for T86 PaymentIdempotentCharge:
  claude-sonnet: score=88, cost=$0.18, value_ratio=489
  gpt-4o:        score=72, cost=$0.35, value_ratio=206
  deepseek:      score=65, cost=$0.08, value_ratio=813

Assessment:
  deepseek: highest value_ratio but lowest score
            unique contribution: passes transaction::pci-routing alone
            → KEEP (unique contribution overrides low absolute score)
  
  gpt-4o: low value_ratio (206), no unique contribution vs claude
          → DROP CANDIDATE for round 4
          
  claude-sonnet: highest score, good value ratio
                 → DOMINANT MODEL for round 4

Round 4 config: [claude-sonnet, deepseek-coder]
  Saves $0.35/round vs keeping gpt-4o
  deepseek still contributing unique PCI insight
```

## Negative Example

```
WRONG: Drop deepseek after 1 bad round
  Round 1: deepseek score=45 (model struggled with TRANSACTION archetype)
  → "deepseek is not good for this, drop it"
  
  CORRECT: 1 bad round is noise. Run 3 rounds.
  deepseek at round 3: score=73, unique contribution on PCI check.
  → Keep deepseek, use round 1 data to seed a targeted prompt.

WRONG: Never drop gpt-4o because it's "reliable"
  Round 1–5: gpt-4o scores 70–72 consistently, no unique contribution
  value_ratio=206, claude scores 88
  → gpt-4o is consuming 30% of budget for no unique value
  → Drop it, save $0.35/round
```

## Integration

```
requires:    [] — standalone, invoked by meta::round-controller signals
complements: SK-422 (escalation router — cost data needed for option estimates)
```

## Test

```
Given: 3 rounds of FLOW-07 T82 ConnectionStrengthRebalancer (SCHEDULED)
  claude-sonnet: [82, 85, 88], avg cost $0.16, ratio=537
  gpt-4o: [71, 72, 70], avg cost $0.32, ratio=221
  deepseek: [68, 75, 74], avg cost $0.07, ratio=1057

Expected:
  - deepseek highest value ratio (1057) despite lower score
  - gpt-4o drop candidate (low ratio, no unique contribution vs claude)
  - Round 4 pool: [claude-sonnet, deepseek-coder]
  - OSS signal check: deepseek gap = (88-74)/88 = 15.9% → NOT close yet
  - Continue accumulating fitness data

Failure: dropping deepseek (highest value ratio)
Failure: keeping all 3 models despite gpt-4o drop candidate signal
```
