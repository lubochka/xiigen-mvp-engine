/**
 * Simulation: Concurrent AF Pipeline Execution
 *
 * Tests that two tenants can run the full AF pipeline simultaneously
 * via Promise.all without state contamination.
 *
 * This fills the gap in af-pipeline-e2e.spec.ts which tests single-tenant
 * execution only. Concurrent execution is the production pattern.
 *
 * S3 refactor: AfPipeline delegates to GenericNodeExecutor.
 * Mock executors simulate concurrent execution behaviour.
 */

import { AfPipeline } from '../../src/af-stations/af-pipeline';
import { StationInput } from '../../src/af-stations/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { GenericNodeExecutor } from '../../src/engine/generic-node-executor';

// ── Helpers ────────────────────────────────────────────

function createPipeline(_tenantId: string): AfPipeline {
  const mockExecutor: GenericNodeExecutor = {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: `run-${_tenantId}-${Date.now()}`,
        status: 'PASS',
        score: 90,
        trace: [],
        finalOutput: {},
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
  return new AfPipeline(mockExecutor);
}

function makeInput(tenantId: string): StationInput {
  return new StationInput({
    tenantId,
    taskType: 'T44',
    spec: { archetype: 'ORCHESTRATION', description: 'Concurrent sim test' },
  });
}

// ══════════════════════════════════════════════════════
// Concurrent Execution
// ══════════════════════════════════════════════════════

describe('Simulation: Concurrent AF Pipeline — DNA-5 isolation', () => {
  it('should run two tenants simultaneously without error', async () => {
    const [resultA, resultB] = await Promise.all([
      createPipeline('sim-tenant-a').execute(makeInput('sim-tenant-a')),
      createPipeline('sim-tenant-b').execute(makeInput('sim-tenant-b')),
    ]);

    expect(resultA.isSuccess).toBe(true);
    expect(resultB.isSuccess).toBe(true);
  });

  it('tenant-A enrichedInput should not contain tenant-B tenantId', async () => {
    const [resultA, resultB] = await Promise.all([
      createPipeline('concurrent-a').execute(makeInput('concurrent-a')),
      createPipeline('concurrent-b').execute(makeInput('concurrent-b')),
    ]);

    expect(resultA.data!.enrichedInput.tenantId).toBe('concurrent-a');
    expect(resultB.data!.enrichedInput.tenantId).toBe('concurrent-b');
    expect(resultA.data!.enrichedInput.tenantId).not.toBe(resultB.data!.enrichedInput.tenantId);
  });

  it('each concurrent result should have its own stage log (no shared state)', async () => {
    const [resultA, resultB] = await Promise.all([
      createPipeline('stage-a').execute(makeInput('stage-a')),
      createPipeline('stage-b').execute(makeInput('stage-b')),
    ]);

    // Each run has its own stages array
    const stagesA = resultA.data!.stages;
    const stagesB = resultB.data!.stages;
    expect(Array.isArray(stagesA)).toBe(true);
    expect(Array.isArray(stagesB)).toBe(true);
    // They are not the same reference
    expect(stagesA).not.toBe(stagesB);
  });

  it('should handle 3 concurrent tenants', async () => {
    const tenants = ['t-alpha', 't-beta', 't-gamma'];
    const results = await Promise.all(
      tenants.map((tid) => createPipeline(tid).execute(makeInput(tid))),
    );

    results.forEach((result, i) => {
      expect(result.isSuccess).toBe(true);
      expect(result.data!.enrichedInput.tenantId).toBe(tenants[i]);
    });
  });

  it('each concurrent result is an independent DataProcessResult (DNA-3)', async () => {
    const [r1, r2] = await Promise.all([
      createPipeline('dna3-t1').execute(makeInput('dna3-t1')),
      createPipeline('dna3-t2').execute(makeInput('dna3-t2')),
    ]);

    expect(r1).toBeInstanceOf(DataProcessResult);
    expect(r2).toBeInstanceOf(DataProcessResult);
    expect(r1).not.toBe(r2); // separate objects
  });

  it('missing tenantId fails immediately — does not affect concurrent valid run', async () => {
    const validPipeline = createPipeline('concurrent-valid');
    const invalidInput = new StationInput({ tenantId: '', taskType: 'T44', spec: {} });
    const validInput = makeInput('concurrent-valid');

    const [invalid, valid] = await Promise.all([
      validPipeline.execute(invalidInput),
      createPipeline('concurrent-valid').execute(validInput),
    ]);

    expect(invalid.isSuccess).toBe(false);
    expect(invalid.errorCode).toBe('MISSING_TENANT');
    expect(valid.isSuccess).toBe(true); // concurrent valid run unaffected
  });
});

// ══════════════════════════════════════════════════════
// Pass rate tracking under concurrent load
// ══════════════════════════════════════════════════════

describe('Simulation: Concurrent pass rate tracking', () => {
  it('each pipeline tracks its own runCount independently', async () => {
    const pipelineA = createPipeline('rate-a');
    const pipelineB = createPipeline('rate-b');

    await Promise.all([
      pipelineA.execute(makeInput('rate-a')),
      pipelineA.execute(makeInput('rate-a')),
      pipelineB.execute(makeInput('rate-b')),
    ]);

    expect(pipelineA.runCount).toBe(2);
    expect(pipelineB.runCount).toBe(1);
  });
});
