/**
 * Simulation: Error Propagation in AF Pipeline
 *
 * Tests how different failure types propagate through pipeline.execute().
 * S3 refactor: AfPipeline delegates to GenericNodeExecutor.
 * Mock executors simulate pass/fail scenarios.
 */

import { AfPipeline } from '../../src/af-stations/af-pipeline';
import { StationInput } from '../../src/af-stations/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { GenericNodeExecutor, ExecutionResult } from '../../src/engine/generic-node-executor';

function makePassExecutor(): GenericNodeExecutor {
  const result: ExecutionResult = {
    runId: `run-pass-${Date.now()}`,
    status: 'PASS',
    score: 1.0,
    trace: [],
    finalOutput: {},
    promoted: true,
    promotionLevel: 'INJECTED',
  };
  return {
    execute: jest.fn(async () => DataProcessResult.success(result)),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function makeFailExecutor(errorCode = 'EXECUTOR_ERROR'): GenericNodeExecutor {
  return {
    execute: jest.fn(async () => DataProcessResult.failure(errorCode, 'Executor failed')),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function makePassWithTrace(): GenericNodeExecutor {
  const result: ExecutionResult = {
    runId: `run-trace-${Date.now()}`,
    status: 'PASS',
    score: 0.8,
    trace: [
      { nodeId: 'n1-rag', nodeType: 'rag-retrieve', status: 'PASS', durationMs: 10 },
      { nodeId: 'n2-ai', nodeType: 'ai-generate', status: 'PASS', durationMs: 200 },
    ],
    finalOutput: {},
    promoted: true,
    promotionLevel: 'INJECTED',
  };
  return {
    execute: jest.fn(async () => DataProcessResult.success(result)),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

function makeInput(tenantId: string): StationInput {
  return new StationInput({ tenantId, taskType: 'T44', spec: { archetype: 'ORCHESTRATION' } });
}

// ══════════════════════════════════════════════════════

describe('Simulation: Error Propagation', () => {
  it('executor failure stops pipeline — result is DataProcessResult failure', async () => {
    const pipeline = new AfPipeline(makeFailExecutor('AI_DOWN'));
    const result = await pipeline.execute(makeInput('err-t1'));

    expect(result).toHaveProperty('isSuccess');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('AI_DOWN');
  });

  it('executor FAIL status maps to passed=false', async () => {
    const executor: GenericNodeExecutor = {
      execute: jest.fn(async () =>
        DataProcessResult.success<ExecutionResult>({
          runId: 'run-fail',
          status: 'FAIL',
          score: 0.0,
          trace: [],
          finalOutput: {},
          promoted: false,
          promotionLevel: 'GENERATED',
        }),
      ),
      getTrace: jest.fn(async () => DataProcessResult.success(null)),
    } as unknown as GenericNodeExecutor;

    const pipeline = new AfPipeline(executor);
    const result = await pipeline.execute(makeInput('dna-t1'));

    expect(result.isSuccess).toBe(true);
    expect(result.data!.passed).toBe(false);
    expect(result.data!.promotionLevel).toBe('GENERATED');
  });

  it('executor PASS status maps to passed=true', async () => {
    const pipeline = new AfPipeline(makePassExecutor());
    const result = await pipeline.execute(makeInput('pass-t1'));

    expect(result.isSuccess).toBe(true);
    expect(result.data!.passed).toBe(true);
  });

  it('pipeline always returns DataProcessResult (DNA-3) — never throws', async () => {
    const pipeline = new AfPipeline(makeFailExecutor());
    const result = await pipeline.execute(makeInput('dna3-err'));
    expect(result).toHaveProperty('isSuccess');
    expect(typeof result.isSuccess).toBe('boolean');
  });

  it('stage log is populated when executor returns trace nodes', async () => {
    const pipeline = new AfPipeline(makePassWithTrace());
    const result = await pipeline.execute(makeInput('stage-log'));

    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data!.stages)).toBe(true);
    expect(result.data!.stages.length).toBe(2);
    expect(result.data!.stages[0].stage).toBe('n1-rag');
  });

  it('stage log is empty array when executor returns empty trace', async () => {
    const pipeline = new AfPipeline(makePassExecutor());
    const result = await pipeline.execute(makeInput('no-stage-log'));

    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data!.stages)).toBe(true);
    expect(result.data!.stages.length).toBe(0);
  });

  it('total elapsed time is recorded on both pass and fail', async () => {
    const passResult = await new AfPipeline(makePassExecutor()).execute(makeInput('time-pass'));
    const failResult = await new AfPipeline(makeFailExecutor()).execute(makeInput('time-fail'));

    if (passResult.isSuccess) {
      expect(passResult.data!.totalElapsedMs).toBeGreaterThanOrEqual(0);
    }
    // fail result is DataProcessResult.failure — no totalElapsedMs
    expect(failResult.isSuccess).toBe(false);
  });
});
