# FLOW-00.3: COST PIPELINE WIRING — REFERENCE PLAN v1
## Prerequisites: FLOW-00.2 complete, FLOW-35 complete
## Date: 2026-03-22
## flow-completeness-checker v1.5: V0-MODE ✅ V0-SCOPE ✅ (infrastructure flow — V1-V31 N/A)

---

## WHY THIS FLOW EXISTS

The AF pipeline generates code but is blind to what it costs. Three breaks
in the data chain mean no cost data flows from API responses to budget
enforcement, feedback loops, or session reports.

Without this flow, FLOW-01 Phase B calls `afPipeline.run()` three times
with no cost tracking, no budget enforcement, and no cost data in the
ExecutionLog or SESSION-BRIEF. The SpendGovernor sits empty. The learning
loop optimizes for quality but ignores cost. The model-selection skill
(SK-425) cannot calculate value_ratio because cost_usd is always 0.

This flow wires the chain end-to-end: Provider → CostTracker → Pipeline →
SpendGovernor → AF-11 → ExecutionLog.

---

## SCOPE DISCIPLINE (P13)

```
stackTargets:  ['node-nestjs']
clientTargets: []       ← no client work, pure backend wiring

This is infrastructure wiring — no new task types, no new factories,
no event schemas, no topology, no client screens.
```

## IMPLEMENTATION MODE (P12)

```
implementationMode: "manual"
implementationModeReason: "Wiring the AF pipeline internals. Cannot use the
  AF pipeline to generate code that modifies the AF pipeline itself."
```

---

## STATE.json

```json
{
  "flow_id": "FLOW-00.3",
  "flow_name": "Cost Pipeline Wiring",
  "parallel_wave": null,
  "wave": null,
  "current_phase": "session-0",
  "completed_phases": [],
  "test_baseline": 4429,
  "stackTargets": ["node-nestjs"],
  "clientTargets": [],
  "implementationMode": "manual",
  "implementationModeReason": "Wiring AF pipeline internals — cannot self-generate."
}
```

---

## THE THREE BREAKS (from code audit 2026-03-22)

```
BREAK 1: Dispatcher → CostTracker
  WHERE:  fabrics/ai-engine/dispatcher.ts
  WHAT:   Dispatcher calculates totalCost from provider responses.
          Returns cost in result. Never calls CostTracker.record().
          CostTracker.record(tenantId, modelId, tokensIn, tokensOut, cost)
          is never called by anyone. The Map stays empty.
  PROOF:  grep -c "CostTracker\|costTracker" dispatcher.ts → 0
          CostTracker not in dispatcher constructor.

BREAK 2: AF Pipeline → SpendGovernor
  WHERE:  af-stations/af-pipeline.ts
  WHAT:   Pipeline orchestrates 11 stations. Returns PipelineResult with
          stages[]. Zero references to cost, tokens, budget, CostTracker,
          TokenBudget, or SpendGovernor. Station results contain cost data
          (from dispatcher) but pipeline ignores it entirely.
  PROOF:  grep -c "cost\|token\|budget\|spend" af-pipeline.ts → 0

BREAK 3: AF-11 → Cost Metrics
  WHERE:  af-stations/af11-feedback.ts
  WHAT:   FeedbackStation.buildFeedback() captures: score, passed,
          generation_step_count, review_issue_count, score_count, code_length.
          Does NOT capture: cost_usd, tokens_in, tokens_out, model_id.
          Learning loop is blind to cost → cannot calculate value_ratio
          → SK-425 model-selection cannot route to cheaper models.
  PROOF:  grep -c "cost\|token" af11-feedback.ts → 0
```

---

## WHAT THIS FLOW PRODUCES

```
After FLOW-00.3, the following chain works end-to-end:

  Anthropic/OpenAI/Gemini/Grok provider
    → response.usage.input_tokens + output_tokens
    → estimateCost(profile, ti, to) = USD
    → Dispatcher returns { cost, tokens_used: { input, output } }
    → CostTracker.record(tenantId, modelId, ti, to, cost)     ← BREAK 1 FIXED
    → AF Pipeline reads cost from station outputs
    → Accumulates per-run cost in PipelineResult
    → SpendGovernor.checkSpend() before each AI station        ← BREAK 2 FIXED
    → SpendGovernor.recordRoundCost() after each AI station
    → AF-11 captures cost_usd, tokens_in, tokens_out, model_id ← BREAK 3 FIXED
    → PipelineResult includes total_cost_usd + cost_by_model
    → ExecutionLog.ai_cost populated from PipelineResult
    → SESSION-BRIEF reports cost to Luba
```

---

## ARTIFACT NUMBERS

```
No new task types (T-xxx).
No new factories (F-xxxx).
No new BFA rules (CF-xxx).
No new families.
No new event schemas.

Modified files only:
  fabrics/ai-engine/dispatcher.ts          ← inject CostTracker, call record()
  af-stations/af-pipeline.ts               ← inject CostTracker + SpendGovernor, accumulate cost
  af-stations/af11-feedback.ts             ← add cost fields to feedback record
  af-stations/base.ts                      ← add cost fields to StationOutput (optional)
  
New files:
  test/flow003/dispatcher-cost-wiring.spec.ts
  test/flow003/pipeline-cost-accumulation.spec.ts
  test/flow003/af11-cost-feedback.spec.ts
  test/flow003/cost-chain-e2e.spec.ts      ← full chain integration test
```

---

## PHASE STRUCTURE (3 phases)

```
Phase A: WIRE — Dispatcher → CostTracker
  Inject CostTracker into AiDispatcher constructor.
  After each provider.generate() call: costTracker.record().
  After generateWithConsensus completes: costTracker recorded per model.
  Tests: 6 unit tests for cost recording.
  Gate: npm test ≥ 4435 (+6), 0 tsc errors.

Phase B: WIRE — AF Pipeline → SpendGovernor + cost accumulation
  Inject CostTracker + SpendGovernorService into AfPipeline constructor.
  Add cost accumulation to PipelineResult: total_cost_usd, cost_by_model.
  Add StageLog.cost_usd field (per-stage cost).
  Before each AI station: spendGovernor.checkSpend() → HALT if exceeded.
  After each AI station: spendGovernor.recordRoundCost().
  TokenBudget.checkBudget() before each AI station (pre-flight).
  Tests: 8 unit tests for cost accumulation + spend halt.
  Gate: npm test ≥ 4443 (+8), 0 tsc errors.

Phase C: WIRE — AF-11 cost feedback + E2E chain test
  Add cost_usd, tokens_in, tokens_out, model_id to AF-11 feedback record.
  Add cost fields to FeedbackStats (avg_cost_per_run, total_cost).
  Write E2E chain test: mock provider → dispatcher → pipeline → AF-11 →
    verify CostTracker has data, SpendGovernor received cost,
    AF-11 feedback includes cost, PipelineResult includes total_cost_usd.
  Tests: 4 unit + 1 e2e for cost feedback + chain.
  Gate: npm test ≥ 4448 (+5), 0 tsc errors.
```

---

## PHASE A — WIRE: Dispatcher → CostTracker

### What changes

**dispatcher.ts** — 3 changes:
1. Add `CostTracker` to constructor injection
2. In `runWithTimeout()`: after successful provider.generate(), extract `tokens_used` and `cost` from result, call `this.costTracker.record(tenantId, modelId, tokensIn, tokensOut, cost)`
3. In `generateSingle()`: same recording after successful call

**ai-engine.module.ts** — 1 change:
1. Update `AiDispatcher` factory to inject `CostTracker`

### What to test

```
DCW-1: generateSingle() with mock provider → CostTracker has 1 record
DCW-2: generateWithConsensus() with 3 models → CostTracker has 3 records
DCW-3: One model fails in consensus → CostTracker has records for successes only
DCW-4: Verify tenantId from CLS flows to CostTracker record
DCW-5: Verify cost = estimateCost(profile, tokensIn, tokensOut) matches
DCW-6: getTenantUsage() returns correct by_model breakdown after consensus
```

### Gate

```bash
cd server && npx tsc --noEmit       # 0 errors
cd server && npm test                # ≥ 4435
cd server && npx jest test/flow003/dispatcher-cost-wiring.spec.ts --verbose
```

---

## PHASE B — WIRE: AF Pipeline → SpendGovernor

### What changes

**af-pipeline.ts** — 4 changes:
1. Add `CostTracker` and `SpendGovernorService` to constructor
2. Add `total_cost_usd` and `cost_by_model` fields to `PipelineResult`
3. Add `cost_usd` field to `StageLog`
4. Before each AI-dependent stage (SYNTHESIS, JUDGMENT): call `spendGovernor.checkSpend()`. If HALT → return early with `passed: false` and best-so-far result. After each stage: read cost from CostTracker delta, call `spendGovernor.recordRoundCost()`.

**base.ts** (StationOutput) — 1 change:
1. Add optional `cost_usd?: number` and `tokens_used?: { input: number; output: number }` to StationOutput data convention (documentation, not type change — data is `Record<string, unknown>`)

### What to test

```
PCA-1: Pipeline run with mock provider → PipelineResult.total_cost_usd > 0
PCA-2: Pipeline run → each StageLog that used AI has cost_usd > 0
PCA-3: Pipeline run → cost_by_model has entries for each model used
PCA-4: SpendGovernor HALT: set limit=$0.01, run pipeline → pipeline returns
       passed: false with reason 'BUDGET_EXCEEDED'
PCA-5: SpendGovernor HALT returns best-so-far (not empty result)
PCA-6: TokenBudget pre-flight: set per-request cap to 1 → pipeline returns
       failure before any AI call
PCA-7: Pipeline with no AI stations (inventory only) → total_cost_usd = 0
PCA-8: Cost accumulates across SYNTHESIS + JUDGMENT stages correctly
```

### Gate

```bash
cd server && npx tsc --noEmit       # 0 errors
cd server && npm test                # ≥ 4443
cd server && npx jest test/flow003/pipeline-cost-accumulation.spec.ts --verbose
```

---

## PHASE C — WIRE: AF-11 Cost Feedback + E2E Chain

### What changes

**af11-feedback.ts** — 3 changes:
1. `buildFeedback()`: add `cost_usd`, `tokens_in`, `tokens_out`, `model_id` from input metadata or generation results
2. `FeedbackStats`: add `total_cost_usd`, `avg_cost_per_run`
3. `getStats()`: compute cost aggregates

### What to test

```
ACF-1: AF-11 feedback record includes cost_usd when generation ran
ACF-2: AF-11 feedback record has cost_usd = 0 when no generation
ACF-3: FeedbackStats.avg_cost_per_run calculated correctly over 5 records
ACF-4: FeedbackStats.total_cost_usd is sum of all runs

E2E-1: Full chain test (cost-chain-e2e.spec.ts):
  Setup: mock Anthropic provider returning { usage: { input_tokens: 100, output_tokens: 50 } }
  Run: afPipeline.run() for a test task type
  Verify:
    ✓ CostTracker.getTenantUsage(tenantId).totalCost > 0
    ✓ CostTracker.getTenantUsage(tenantId).byModel['claude-sonnet-4-5'] exists
    ✓ PipelineResult.total_cost_usd > 0
    ✓ PipelineResult.cost_by_model has entries
    ✓ PipelineResult.stages.some(s => s.cost_usd > 0)
    ✓ AF-11 feedback for this task type includes cost_usd > 0
    ✓ SpendGovernor session has accumulatedCostUsd > 0
```

### Gate

```bash
cd server && npx tsc --noEmit       # 0 errors
cd server && npm test                # ≥ 4448
cd server && npx jest test/flow003/ --verbose  # all FLOW-00.3 tests pass
```

---

## FREEDOM CONFIG KEYS (new)

```
spend_limit_usd_per_task_type:  5.00    ← max USD per single task type generation
spend_limit_usd_per_flow:       25.00   ← max USD per flow execution (all phases)
spend_limit_usd_per_session:    50.00   ← max USD per Claude Code session
per_request_max_tokens:         32000   ← max tokens per single AI call (existing)

Model pricing (existing in base.ts, now also in FREEDOM for override):
  claude-opus-4-5:    { input: 0.000015, output: 0.000075 }
  claude-sonnet-4-5:  { input: 0.000003, output: 0.000015 }
  gpt-5.2:            { input: 0.000010, output: 0.000030 }
  gemini-2.5-pro:     { input: 0.000007, output: 0.000021 }
  grok-4:             { input: 0.000003, output: 0.000015 }
```

---

## POST-FLOW-00.3 VERIFICATION

After all 3 phases complete, this script verifies the chain works:

```bash
# Verify CostTracker is injected in Dispatcher
grep "CostTracker" server/src/fabrics/ai-engine/dispatcher.ts | grep -v import
# Expected: this.costTracker in constructor, this.costTracker.record() in method

# Verify AF Pipeline references cost
grep -c "cost\|CostTracker\|SpendGovernor" server/src/af-stations/af-pipeline.ts
# Expected: > 0 (was 0 before FLOW-00.3)

# Verify AF-11 captures cost
grep "cost_usd\|tokens_in\|tokens_out" server/src/af-stations/af11-feedback.ts
# Expected: present in buildFeedback()

# Verify PipelineResult has cost fields
grep "total_cost_usd\|cost_by_model" server/src/af-stations/af-pipeline.ts
# Expected: both present in PipelineResult interface

# Run the full chain E2E test
cd server && npx jest test/flow003/cost-chain-e2e.spec.ts --verbose
```

---

## EXECUTION ORDER UPDATE

```
BEFORE:
  → FLOW-00.2 (stack coupling base)
  → FLOW-34 (marketplace plugin adapters)
  → FLOW-01 re-review → ...

AFTER:
  → FLOW-00.2 (stack coupling base)
  → FLOW-00.3 (cost pipeline wiring)          ← NEW
  → FLOW-34 (marketplace plugin adapters)
  → FLOW-01 re-review → ...
  → FLOW-01 execution (Wave 0) — af-pipeline mode (now with cost tracking)
```

---

## METRICS AVAILABLE AFTER FLOW-00.3

After this flow, every `afPipeline.run()` call produces:

```typescript
// PipelineResult (returned to caller)
{
  total_cost_usd: 0.0847,              // sum of all AI calls in this run
  cost_by_model: {
    'claude-sonnet-4-5': 0.0423,       // AF-1 genesis
    'gpt-5.2': 0.0212,                 // AF-6 code review
    'gemini-2.5-pro': 0.0212,          // AF-9 judge
  },
  stages: [
    { stage: 'INVENTORY', cost_usd: 0, ... },
    { stage: 'SYNTHESIS', cost_usd: 0.0423, ... },
    { stage: 'JUDGMENT',  cost_usd: 0.0424, ... },
  ],
}

// CostTracker (queryable any time)
costTracker.getTenantUsage('tenant-1') → {
  totalCost: 0.0847,
  totalTokensIn: 4200,
  totalTokensOut: 1800,
  callCount: 3,
  byModel: { 'claude-sonnet-4-5': { totalCost: 0.0423, callCount: 1, ... }, ... }
}

// SpendGovernor (enforces limits)
spendGovernor.checkSpend(session) → { verdict: 'CONTINUE' | 'HALT' }

// AF-11 Feedback (learning loop)
feedbackStation.getStats('T47') → {
  average_score: 82.5,
  avg_cost_per_run: 0.0847,            // NEW
  total_cost_usd: 0.2541,              // NEW (across 3 runs)
  count: 3,
}

// SK-425 value_ratio (now calculable)
value_ratio = 82.5 / 0.0847 = 974     // score-points per dollar
// → "highly cost-efficient" (ratio > 500)

// ExecutionLog (written by Claude Code after gate)
{
  ai_cost: {
    total_usd: 0.2541,
    by_model: { 'claude-sonnet-4-5': 0.1269, 'gpt-5.2': 0.0636, ... },
    rounds_run: 3,
    final_decision: 'ACCEPT'
  }
}
```

---

## SESSION FILES TO PRODUCE

```
FLOW-00.3-STATE.json

SESSION-FLOW-00.3-A.md    ← Wire Dispatcher → CostTracker
SESSION-FLOW-00.3-B.md    ← Wire Pipeline → SpendGovernor + cost accumulation
SESSION-FLOW-00.3-C.md    ← Wire AF-11 + E2E chain test

docs/FLOW-00.3-REFERENCE.md  ← this document
```
