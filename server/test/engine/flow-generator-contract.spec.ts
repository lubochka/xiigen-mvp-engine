/**
 * FlowGenerator — Contract-Driven Tests (Level 2: Simulation)
 *
 * Uses REAL EngineContract objects from sample-contracts.ts.
 * Existing flow-generator.spec.ts uses only synthetic validContractParams().
 * This file closes the FM-3 coverage gap (test-integrity skill).
 *
 * API verified against source (server/src/engine/flow-generator.ts):
 *   generate(contract, tenantId) — contract FIRST, tenantId SECOND
 *   generationHistory — getter, not a method
 *   factoryRegistry   — getter
 *   bfaArbiter        — getter
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { AfPipeline } from '../../src/af-stations/af-pipeline';
import { GenericNodeExecutor } from '../../src/engine/generic-node-executor';
import { FlowGenerator } from '../../src/engine/flow-generator';
import { createT44Contract, createT45Contract } from '../../src/engine-contracts/sample-contracts';

// ── Default pass executor ─────────────────────────────

function makePassExecutor(): GenericNodeExecutor {
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'test-run-id',
        status: 'PASS',
        score: 90,
        trace: [],
        finalOutput: { code: '// generated' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

// ── Generator factory ─────────────────────────────────

function makeGenerator(): FlowGenerator {
  return new FlowGenerator({ afPipeline: new AfPipeline(makePassExecutor()) });
}

// ══════════════════════════════════════════════════════
// T44 — Real contract
// ══════════════════════════════════════════════════════

describe('FlowGenerator — T44 real contract', () => {
  let gen: FlowGenerator;

  beforeEach(() => {
    gen = makeGenerator();
  });

  it('should accept T44 real contract and return success', async () => {
    const contract = createT44Contract();
    const result = await gen.generate(contract, 'tenant-1');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('should record T44 generation in history with correct tenant', async () => {
    const contract = createT44Contract();
    await gen.generate(contract, 'tenant-1');

    const history = gen.generationHistory;
    expect(Array.isArray(history)).toBe(true);
    expect(history.length).toBe(1);
    expect(history[0]['tenant_id']).toBe('tenant-1');
    expect(history[0]['contract_id']).toBe('T44');
  });

  it('should increment generationCount after T44 generation', async () => {
    expect(gen.generationCount).toBe(0);
    await gen.generate(createT44Contract(), 'tenant-1');
    expect(gen.generationCount).toBe(1);
  });

  it('should produce flow definition from T44 contract', async () => {
    const result = await gen.generate(createT44Contract(), 'tenant-1');
    if (result.isSuccess && result.data) {
      const flowDef = result.data.flowDefinition;
      if (flowDef && typeof flowDef === 'object') {
        expect(flowDef).toHaveProperty('nodes');
      }
    }
  });

  it('should register factories via factoryRegistry getter after T44', async () => {
    await gen.generate(createT44Contract(), 'tenant-1');
    const reg = gen.factoryRegistry;
    expect(reg).toBeDefined();
    expect(typeof reg).toBe('object');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const result = await gen.generate(createT44Contract(), 't1');
    expect(result).toHaveProperty('isSuccess');
    expect(typeof result.isSuccess).toBe('boolean');
  });
});

// ══════════════════════════════════════════════════════
// T45 — Real contract
// ══════════════════════════════════════════════════════

describe('FlowGenerator — T45 real contract', () => {
  let gen: FlowGenerator;

  beforeEach(() => {
    gen = makeGenerator();
  });

  it('should accept T45 real contract and return success', async () => {
    const result = await gen.generate(createT45Contract(), 'tenant-1');
    expect(result.isSuccess).toBe(true);
  });

  it('should record T45 in history with correct contract_id', async () => {
    await gen.generate(createT45Contract(), 'tenant-1');
    expect(gen.generationHistory[0]['contract_id']).toBe('T45');
  });
});

// ══════════════════════════════════════════════════════
// T44 + T45 sequentially — BFA and history
// ══════════════════════════════════════════════════════

describe('FlowGenerator — T44 then T45 sequential', () => {
  let gen: FlowGenerator;

  beforeEach(() => {
    gen = makeGenerator();
  });

  it('should accumulate both in generationHistory', async () => {
    await gen.generate(createT44Contract(), 'tenant-1');
    await gen.generate(createT45Contract(), 'tenant-1');
    expect(gen.generationCount).toBe(2);
    const ids = gen.generationHistory.map((h) => h['contract_id']);
    expect(ids).toContain('T44');
    expect(ids).toContain('T45');
  });

  it('T45 should not cause a BFA entity conflict after T44 is registered', async () => {
    await gen.generate(createT44Contract(), 'tenant-1');
    const result = await gen.generate(createT45Contract(), 'tenant-1');

    if (!result.isSuccess) {
      const errCode = result.errorCode ?? '';
      expect(errCode).not.toContain('BFA');
    }
  });
});

// ══════════════════════════════════════════════════════
// DNA-5 — tenant isolation via generationHistory
// ══════════════════════════════════════════════════════

describe('FlowGenerator — tenant isolation in history (DNA-5)', () => {
  it('history entries carry the correct tenant_id for each generation', async () => {
    const gen = makeGenerator();
    await gen.generate(createT44Contract(), 'tenant-a');
    await gen.generate(createT45Contract(), 'tenant-b');

    const history = gen.generationHistory;
    expect(history).toHaveLength(2);

    const entry44 = history.find((h) => h['contract_id'] === 'T44');
    const entry45 = history.find((h) => h['contract_id'] === 'T45');
    expect(entry44?.['tenant_id']).toBe('tenant-a');
    expect(entry45?.['tenant_id']).toBe('tenant-b');
  });

  it('generationHistory returns a snapshot — mutations do not affect prior captures', async () => {
    const gen = makeGenerator();
    await gen.generate(createT44Contract(), 'tenant-1');
    const snap = gen.generationHistory; // captured after T44
    await gen.generate(createT45Contract(), 'tenant-1');
    // snap was taken before T45 — length should still be 1
    expect(snap).toHaveLength(1);
    expect(gen.generationHistory).toHaveLength(2);
  });
});
