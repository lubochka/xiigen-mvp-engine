---
title: Contract-Driven Testing — Use Real EngineContract Fixtures
impact: CRITICAL
tags: contracts, sample-contracts, fixtures, mocks, integration, level-2
---

## Contract-Driven Testing — Use Real EngineContract Fixtures

**Impact: CRITICAL**

The most reliable integration tests use real EngineContract objects from
`server/src/engine-contracts/sample-contracts.ts` as fixtures — not
hand-crafted objects constructed inline in the test.

The failure mode this rule prevents:

> A test constructs a synthetic `StationInput` with only the fields it
> happens to need. The AF station processes it correctly. Later, the
> EngineContract schema gains a new required field. The station now
> crashes on real input — but the synthetic test still passes because
> it never uses the real contract shape.

---

## The Rule

**For every Level 2 integration test:**

1. Source fixtures from `server/src/engine-contracts/sample-contracts.ts`
2. Do NOT construct `StationInput`, `EngineContract`, or `DataProcessResult`
   objects inline with hand-picked field values
3. If `sample-contracts.ts` does not have the contract variant you need →
   **add the variant to `sample-contracts.ts`** and use it from there
4. Mocks are permitted ONLY for external service boundaries (AI provider,
   database provider) — not for engine-internal data shapes

---

## What Goes in sample-contracts.ts

`sample-contracts.ts` is the canonical fixture library. It contains real
EngineContract instances representing known-valid states of the engine:

```typescript
// server/src/engine-contracts/sample-contracts.ts (example structure)
export const sampleContracts = {
  // Returns a fully-populated StationInput for a given task type + station
  getStationInput(taskType: string, station: string): StationInput { ... },

  // Returns a valid EngineContract for a given flow scenario
  getContract(scenario: 'minimal' | 'full' | 'multi-tenant'): EngineContract { ... },

  // Returns a DataProcessResult in the expected success shape
  getSuccessResult(taskType: string): DataProcessResult<unknown> { ... },
};
```

When a test needs a new variant (e.g., "a StationInput for an ORCHESTRATION
task at iteration 3"):
- Add it to `sample-contracts.ts` with a descriptive name
- Use it from the test via `sampleContracts.getStationInput(...)`
- This makes the variant reusable across all tests that need it

---

## Permitted vs Prohibited Mock Patterns

### ✅ Permitted: Mock external service boundaries

```typescript
// Mocking the AI provider (external boundary) is acceptable
const mockAiProvider: IAiEngineProvider = {
  complete: jest.fn().mockResolvedValue({
    success: true,
    data: { content: 'mocked response', model: 'mock', tokens: 100 }
  })
};
```

```typescript
// Mocking the database provider (external boundary) is acceptable
const mockDbProvider: IDatabaseProvider = {
  search: jest.fn().mockResolvedValue({ success: true, data: [] }),
  store: jest.fn().mockResolvedValue({ success: true, data: { id: 'doc-1' } })
};
```

### ❌ Prohibited: Constructing engine-internal data shapes inline

```typescript
// WRONG — hand-crafted StationInput, not from sample-contracts.ts
const input: StationInput = {
  taskType: 'T-201',
  archetype: 'ORCHESTRATION',
  iteration: 1,
  tenantId: 'test-tenant',
  // ← only fields this test knows about; missing required engine fields
};
```

```typescript
// WRONG — hand-crafted EngineContract inline
const contract: EngineContract = {
  factoryId: 'F-1339',
  taskType: 'T-201',
  // ← missing bfaRegistration, qualityThresholds, etc.
};
```

### ✅ Correct: Use sample-contracts.ts

```typescript
// CORRECT — real fixture from sample-contracts.ts
const input = sampleContracts.getStationInput('T-201', 'af4-rag-context');
const result = await af4.process(input);
expect(result.success).toBe(true);
expect(result.data.skillsActive).toContain('SK-PLAN');
```

---

## When sample-contracts.ts Doesn't Have What You Need

### Add a new variant — do NOT inline it

If you need an ORCHESTRATION StationInput at iteration 3 and `sample-contracts.ts`
only has iteration 1:

```typescript
// In sample-contracts.ts — add the variant
export const sampleContracts = {
  // ... existing variants ...

  getOrchestrationInput(iteration: number = 1): StationInput {
    return {
      taskType: 'T-201',
      archetype: 'ORCHESTRATION',
      iteration,
      tenantId: 'test-tenant-001',
      qualityScores: {
        overall: 0.75,
        test_quality: 0.4,
        spec_adherence: 0.8,
        dna_compliance: 0.9,
        documentation: 0.6
      },
      bfaContext: { flowId: 'FLOW-25', registeredEvents: [] },
      // ... all required fields from the real EngineContract schema
    };
  }
};
```

Then use it:

```typescript
// In your test
const input = sampleContracts.getOrchestrationInput(3);
```

This approach ensures the variant is schema-complete and reusable.

---

## The Sample Contract Completeness Check

Before writing a Level 2 test, ask:

```
For each engine-internal data shape used in this test:
  □ Is it sourced from sample-contracts.ts?
  □ If not in sample-contracts.ts: did I add it there before using it?
  □ Are all required fields present (not just the ones my test needs)?
  □ Does the object match the current EngineContract TypeScript interface?

For each mock in this test:
  □ Is it mocking an external service boundary (AI, DB, Queue, Secrets)?
  □ Is it NOT mocking engine-internal data shapes or AF station behavior?

If any □ is unchecked: fix before declaring the test complete.
```

---

## Integration with Three-Level Verification

This rule applies specifically to **Level 2 — Simulation** tests:

```
Level 1 (Unit):     Mocks permitted widely — isolate the unit
Level 2 (Simulation): ← THIS RULE APPLIES HERE
  - Real fixtures from sample-contracts.ts
  - Mock external boundaries only (AI, DB, Queue providers)
  - NestJS TestingModule with real AF station classes
Level 3 (Contract/E2E): Real containers + real providers via docker-compose.test.yml
```

A test that uses synthetic inline fixtures is NOT a Level 2 test — it is
a Level 1 test with extra NestJS setup overhead. Count it as Level 1 when
filling the three-level-verification routing table.

---

## Worked Example — Refactoring a Synthetic Test to Contract-Driven

**Before (synthetic):**
```typescript
it('af9-judge cross-validates skill selection', async () => {
  const input = {                              // ← hand-crafted
    taskType: 'T-201',
    skillsProposed: ['SK-PLAN', 'SK-TEST'],
    primaryModel: 'claude-opus-4-6',
    crossValidateWith: 'gpt-4o',
  };
  const result = await af9.process(input);
  expect(result.success).toBe(true);
});
```

**After (contract-driven):**
```typescript
it('af9-judge cross-validates skill selection', async () => {
  // Fixture from sample-contracts — all required fields present
  const input = sampleContracts.getStationInput('T-201', 'af9-judge');

  // Mock only the external AI boundary
  mockAiProvider.complete
    .mockResolvedValueOnce({ success: true, data: { content: 'APPROVED: SK-PLAN,SK-TEST', model: 'claude-opus-4-6', tokens: 85 } })
    .mockResolvedValueOnce({ success: true, data: { content: 'CONFIRM: SK-PLAN,SK-TEST', model: 'gpt-4o', tokens: 72 } });

  const result = await af9.process(input);
  expect(result.success).toBe(true);
  // Assert path-specific token — not just success
  expect(result.data.crossValidationModel).toBe('gpt-4o');
  expect(result.data.skillsActive).toEqual(['SK-PLAN', 'SK-TEST']);
});
```

The refactored test:
- Uses a real contract fixture (survives schema evolution)
- Still mocks the AI provider (correct: external boundary)
- Asserts on a path-specific token (`crossValidationModel`) per coverage-vs-execution.md

---

## One-Line Summary

> "Level 2 tests must use real EngineContract fixtures from sample-contracts.ts.
> If the fixture doesn't exist, add it. Never construct engine-internal shapes inline."
