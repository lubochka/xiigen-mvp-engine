---
title: Pipeline Function Coverage — AF Stations and Fabric Providers
impact: HIGH
tags: coverage, af-stations, fabric-providers, guard-chain, pipeline, integration
---

## Pipeline Function Coverage — AF Stations and Fabric Providers

**Impact: HIGH**

Tests can cover individual AF stations in isolation while leaving their
interconnections untested. Coverage tools report a high percentage because
every station's code runs in some test, but the CHAIN — the path from one
station's output to the next station's input — is never exercised together.

This is especially common when:
- `af-stations/*.ts` tests use mock `StationInput` objects that bypass
  upstream station logic (the real upstream would have set different fields)
- `fabrics/**/*.ts` tests run providers in isolation but never through the
  fabric resolution path the AF station uses at runtime
- Guard conditions inside a station are always satisfied by hand-crafted
  fixtures, so the rejection branch has no coverage

---

## The Station Coverage Matrix

For each AF station in a phase or fix, fill this table:

```
Station        | Input source in test    | Real input source   | Match?
---------------|-------------------------|---------------------|-------
af2-planning   | hand-crafted StationInput | af1-genesis output | ❌ gap
af4-rag-context| sample-contracts fixture | af2-planning output | ✅
af9-judge      | direct judge mock        | af4 + af11 output   | ❌ gap
af11-feedback  | score=0.7 hard-coded    | af9-judge result    | ❌ gap
```

A "❌ gap" row means: the station is covered in isolation, but the chain
from its real upstream is never exercised. A test failure in the real chain
would not be caught by the existing suite.

---

## The Fabric Provider Coverage Matrix

For each fabric provider touched in a phase, fill this table:

```
Fabric path                     | Unit test? | Integration test? | Docker test?
--------------------------------|------------|-------------------|-------------
DATABASE → ElasticsearchProvider| ✅          | ✅                 | ✅
DATABASE → InMemoryDatabase     | ✅          | ✅                 | ❌ (in-proc)
QUEUE → InMemoryQueue           | ✅          | ✅                 | ❌ (in-proc)
QUEUE → SqsQueueProvider        | ✅          | ❌ gap             | ✅ LocalStack
AI ENGINE → MockAiProvider      | ✅          | ✅                 | ❌ (in-proc)
```

A missing integration test for a docker-tested provider means the provider's
contract is tested at Level 3 (Docker) but never at Level 2 (NestJS module).
A Level 3 failure will not point to the contract mismatch — only a Level 2
test can isolate that.

---

## Guard Chain Coverage

AF stations often stack multiple guard conditions before executing their
main logic:

```typescript
// Example: af4-rag-context.ts guard chain
if (!input.taskType) return DataProcessResult.failure('NO_TASK_TYPE');
if (input.iteration > MAX_ITERATIONS) return DataProcessResult.failure('MAX_ITER');
if (!input.qualityScores?.overall) return DataProcessResult.failure('NO_QUALITY');
// → main skill selection logic
```

Each guard creates a distinct branch. A test suite that only reaches the
"main logic" path has zero coverage of the guard-rejection branches.

### Guard Chain Audit Procedure

For every AF station modified or created this phase:

1. List every early-return guard condition (in order)
2. Confirm a test exists that reaches EXACTLY that guard and no earlier
3. Confirm the test asserts on the specific failure code, not just `success: false`

```
Guard                          | Test exists? | Asserts specific code?
-------------------------------|-------------|----------------------
NO_TASK_TYPE                   | ✅           | result.error === 'NO_TASK_TYPE' ✅
MAX_ITER (iteration > 5)       | ❌           | —
NO_QUALITY (no qualityScores)  | ✅           | result.error === 'NO_QUALITY' ✅
```

Any row with "❌ Test exists?" = uncovered branch. Declare it explicitly
in the phase report rather than claiming "X% coverage."

---

## Pipeline Integration Test Pattern

A pipeline integration test exercises **two or more AF stations in sequence**
using real engine contracts as the glue:

```typescript
// ✅ Pipeline integration — exercises the chain af2 → af4
it('af4 receives planning output in expected shape', async () => {
  const planningInput = sampleContracts.getStationInput('T-201', 'af2-planning');
  const planningResult = await af2.process(planningInput);
  expect(planningResult.success).toBe(true);

  // Feed af2 output to af4 — real chain, not a synthetic af4 input
  const ragInput = planningResult.data as StationInput;
  const ragResult = await af4.process(ragInput);
  expect(ragResult.success).toBe(true);
  expect(ragResult.data.skillsActive.length).toBeGreaterThan(0);
});
```

Contrast with the anti-pattern:

```typescript
// ❌ Isolation test only — af4 never receives real planning output
it('af4 selects skills for ORCHESTRATION', async () => {
  const input: StationInput = {
    taskType: 'T-201',
    archetype: 'ORCHESTRATION',
    iteration: 1,
    qualityScores: { overall: 0.8, test_quality: 0.3 }
    // ← hand-crafted; upstream af2 might produce different fields
  };
  const result = await af4.process(input);
  expect(result.data.skillsActive).toContain('SK-PLAN');
});
```

The isolation test is valuable but does NOT replace the pipeline test.
Both must exist for genuine integration coverage.

---

## Worked Example — Fabric Coverage Gap

**Phase adds tests for af4-rag-context skill selection. Is fabric coverage complete?**

```
New tests:
  T1: skill selection via InMemoryDatabaseProvider (mock fixtures)
  T2: skill selection via ElasticsearchProvider (sample-contracts.ts)
  T3: guard check — iteration > MAX_ITERATIONS

Coverage matrix result:
  af4-rag: InMemoryDatabaseProvider path: 0 → 1 (+1) — covered
  af4-rag: ElasticsearchProvider path:    0 → 1 (+1) — covered ✓
  af4-rag: iteration guard:               0 → 1 (+1) — NEW guard coverage ✓
  af4-rag: chain from af2-planning:       0 → 0 ( 0) — STILL GAP ← problem

Conclusion: fabric providers have unit + integration coverage.
  But no test exercises af4 with real af2-planning output.
  A shape change in af2's output would not be caught by this suite.
  Add one pipeline integration test (af2 → af4) to close the gap.
```

---

## End-of-Phase Coverage Checklist

```
□ Station coverage matrix filled for every AF station touched
□ Fabric provider matrix filled for every fabric touched
□ Guard chain audit: every early-return branch has a test
□ At least one pipeline integration test for each adjacent-station pair modified
□ No test uses a hand-crafted StationInput where real upstream output differs materially
□ Coverage delta table (from coverage-vs-execution.md) cross-references this matrix

If any box is unchecked: document the gap explicitly in STATE-Pn.json gaps[].
```

---

## One-Line Summary

> "Station isolation tests are necessary but not sufficient.
> Every adjacent-station pair and every fabric path needs a chain test."
