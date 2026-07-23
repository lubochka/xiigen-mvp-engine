# Parallel Wave Protocol — Multi-Model Routing

## Routing Decision

| Quality Score | Routing | Rationale |
|--------------|---------|-----------|
| `score < 0.7` | Parallel wave (Claude + cross-validate simultaneously) | Low confidence → second opinion needed before committing |
| `score ≥ 0.7` | Single model (Claude only) | High confidence → skip cross-validation overhead |

## Parallel Wave Flow

```
score < 0.7:

  AF-4 selects blocks
       ↓
  ┌────────────────┬──────────────────────┐
  │ PRIMARY        │ CROSS_VALIDATE       │
  │ Claude         │ GPT-4o / Gemini      │
  │ Advises blocks │ Judges selection     │
  │ (async)        │ (async)              │
  └────────┬───────┴──────────┬───────────┘
           │                  │
           └────────┬─────────┘
                    ↓
             Both complete →
             Compare results →
             Judge outcome drives selection
```

## Single Model Flow (score ≥ 0.7)

```
score ≥ 0.7:

  AF-4 selects blocks → AF-1 Genesis (Claude only, no judge call)
  → AF-11 records (no cross-validation scoreDelta)
```

## Why This Matters for Performance

Cross-validation adds one additional model call per generation. For high-volume tenants running many generation cycles, this overhead is significant. The parallel wave protocol routes only uncertain cases through the more expensive path.

At `score = 0.9`, cross-validation would almost always ACCEPT anyway — the overhead is wasted. At `score = 0.5`, cross-validation catches edge cases that the primary model misses due to selection bias.

## The 0.7 Threshold

This threshold is a **product decision** (MACHINE constant). Do NOT change it without Luba's approval.

The value `0.7` was chosen because:
- Below 0.7: the primary model's selections show statistically higher REJECT rates in effectiveness history
- Above 0.7: single-model selections have similar quality outcomes to cross-validated selections

If effectiveness data suggests this threshold should change, log an AVOIDED-PRODUCT-DECISION entry and escalate.

## Implementation Pattern

```typescript
async function routeSkillSelection(
  input: StationInput,
  blocks: SkillBlock[]
): Promise<SkillBlock[]> {
  const qualityScore = input.dna_compliance * 0.4 + input.test_quality * 0.3 + ...;

  if (qualityScore >= 0.7) {
    // Single model path
    return blocks; // already selected, no judge needed
  }

  // Parallel wave path
  const [advisorResult, judgeResult] = await Promise.all([
    this.primaryModel.advise(blocks, input),
    this.crossValidateModel.judge(blocks, input)
  ]);

  if (judgeResult.verdict === 'REJECT') {
    // Re-select once with feedback
    return this.reselect(blocks, judgeResult.reason, input);
  }

  return advisorResult.blocks;
}
```

Note: `Promise.all()` + AsyncLocalStorage warning — in Node 18, tenant context does NOT automatically propagate into `Promise.all()` children. Pass `tenantId` explicitly or use `nestjs-cls` ClsService. See [mental-debug/rules/tenant-scope-leak.md].
