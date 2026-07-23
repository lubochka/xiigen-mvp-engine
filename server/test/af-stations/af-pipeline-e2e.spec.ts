/**
 * AfPipeline tests — GenericNodeExecutor delegation path.
 *
 * AfPipeline is a thin wrapper that converts StationInput → EngineContract + inputs
 * and delegates to GenericNodeExecutor. These tests verify:
 *   - DNA-5: tenantId required
 *   - delegation: executor.execute() is called with correct args
 *   - result mapping: ExecutionResult → PipelineResult
 *   - run tracking: runCount + passRate
 *   - executor failure propagates correctly
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { AfPipeline } from '../../src/af-stations/af-pipeline';
import { StationInput } from '../../src/af-stations/base';
import { GenericNodeExecutor, ExecutionResult } from '../../src/engine/generic-node-executor';

// ── Mock GenericNodeExecutor ──────────────────────────────────────────────────

function makePassingResult(overrides?: Partial<ExecutionResult>): ExecutionResult {
  return {
    runId: 'run-001',
    status: 'PASS',
    score: 0.9,
    trace: [
      {
        nodeId: 'n1',
        nodeType: 'rag-retrieve',
        status: 'PASS',
        durationMs: 10,
        output: { data: {} },
      },
      {
        nodeId: 'n2',
        nodeType: 'ai-generate',
        status: 'PASS',
        durationMs: 50,
        output: { data: {} },
      },
    ],
    finalOutput: { code: '// generated' },
    promoted: true,
    promotionLevel: 'INJECTED',
    ...overrides,
  };
}

function makeFailingResult(): ExecutionResult {
  return {
    runId: 'run-002',
    status: 'FAIL',
    trace: [
      {
        nodeId: 'n1',
        nodeType: 'ai-generate',
        status: 'FAIL',
        durationMs: 20,
        errorCode: 'AI_FAILED',
      },
    ],
    finalOutput: undefined,
    promoted: false,
  };
}

function mockExecutor(
  result: DataProcessResult<ExecutionResult>,
): jest.Mocked<GenericNodeExecutor> {
  return {
    execute: jest.fn().mockResolvedValue(result),
    getTrace: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
  } as unknown as jest.Mocked<GenericNodeExecutor>;
}

function makeInput(
  overrides?: Partial<ConstructorParameters<typeof StationInput>[0]>,
): StationInput {
  return new StationInput({
    taskType: 'T001',
    tenantId: 'tenant-a',
    spec: { description: 'Build an inventory service' },
    ...overrides,
  });
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AfPipeline — GenericNodeExecutor delegation', () => {
  it('DNA-5: returns MISSING_TENANT when tenantId is absent', async () => {
    const executor = mockExecutor(DataProcessResult.success(makePassingResult()));
    const pipeline = new AfPipeline(executor);

    const input = makeInput({ tenantId: undefined });
    const result = await pipeline.execute(input);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
    expect(executor.execute).not.toHaveBeenCalled();
  });

  it('delegates to executor.execute() with contract and inputs', async () => {
    const executor = mockExecutor(DataProcessResult.success(makePassingResult()));
    const pipeline = new AfPipeline(executor);

    await pipeline.execute(makeInput());

    expect(executor.execute).toHaveBeenCalledTimes(1);
    const [contract, inputs, options] = (executor.execute as jest.Mock).mock.calls[0];
    expect(contract.taskTypeId).toBe('T001');
    expect(contract.flowId).toBe('af-pipeline');
    expect(inputs.taskType).toBe('T001');
    expect(options.tenantId).toBe('tenant-a');
  });

  it('maps PASS result to PipelineResult with passed=true', async () => {
    const executor = mockExecutor(DataProcessResult.success(makePassingResult()));
    const pipeline = new AfPipeline(executor);

    const result = await pipeline.execute(makeInput());

    expect(result.isSuccess).toBe(true);
    expect(result.data!.passed).toBe(true);
    expect(result.data!.artifactId).toBe('run-001');
    expect(result.data!.promotionLevel).toBe('INJECTED');
    expect(result.data!.stages).toHaveLength(2);
    expect(result.data!.errors).toHaveLength(0);
  });

  it('maps FAIL result to PipelineResult with passed=false and errors', async () => {
    const executor = mockExecutor(DataProcessResult.success(makeFailingResult()));
    const pipeline = new AfPipeline(executor);

    const result = await pipeline.execute(makeInput());

    expect(result.isSuccess).toBe(true);
    expect(result.data!.passed).toBe(false);
    expect(result.data!.errors).toContain('AI_FAILED');
    expect(result.data!.stages[0].success).toBe(false);
  });

  it('propagates executor failure as DataProcessResult.failure', async () => {
    const executor = mockExecutor(DataProcessResult.failure('EXECUTOR_ERROR', 'executor exploded'));
    const pipeline = new AfPipeline(executor);

    const result = await pipeline.execute(makeInput());

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EXECUTOR_ERROR');
  });

  it('runCount increments on each execute call', async () => {
    const executor = mockExecutor(DataProcessResult.success(makePassingResult()));
    const pipeline = new AfPipeline(executor);

    expect(pipeline.runCount).toBe(0);
    await pipeline.execute(makeInput());
    await pipeline.execute(makeInput());
    expect(pipeline.runCount).toBe(2);
  });

  it('passRate tracks pass/fail ratio correctly', async () => {
    const passResult = DataProcessResult.success(makePassingResult());
    const failResult = DataProcessResult.success(makeFailingResult());

    const executor = {
      execute: jest
        .fn()
        .mockResolvedValueOnce(passResult)
        .mockResolvedValueOnce(passResult)
        .mockResolvedValueOnce(failResult),
    } as unknown as jest.Mocked<GenericNodeExecutor>;

    const pipeline = new AfPipeline(executor);
    await pipeline.execute(makeInput());
    await pipeline.execute(makeInput());
    await pipeline.execute(makeInput());

    expect(pipeline.passRate).toBeCloseTo(2 / 3, 5);
  });

  it('passRate is 0 before any executions', () => {
    const executor = mockExecutor(DataProcessResult.success(makePassingResult()));
    const pipeline = new AfPipeline(executor);
    expect(pipeline.passRate).toBe(0);
  });

  it('stage logs map node traces correctly', async () => {
    const executor = mockExecutor(DataProcessResult.success(makePassingResult()));
    const pipeline = new AfPipeline(executor);

    const result = await pipeline.execute(makeInput());
    const stages = result.data!.stages;

    expect(stages[0].stage).toBe('n1');
    expect(stages[0].success).toBe(true);
    expect(stages[0].elapsedMs).toBe(10);
    expect(stages[1].stage).toBe('n2');
    expect(stages[1].success).toBe(true);
  });

  it('enrichedInput in result equals the input passed in', async () => {
    const executor = mockExecutor(DataProcessResult.success(makePassingResult()));
    const pipeline = new AfPipeline(executor);
    const input = makeInput();

    const result = await pipeline.execute(input);
    expect(result.data!.enrichedInput).toBe(input);
  });
});
