/**
 * FLOW-00.3 Phase B — AF Pipeline result structure tests (post DEV-23 S3 refactor)
 *
 * After the S3 refactor, AfPipeline is a thin wrapper around GenericNodeExecutor.
 * Cost tracking (IAiProvider, CostTracker, SpendGovernor) has been removed from
 * AfPipeline. The pipeline always returns total_cost_usd = 0 and cost_by_model = {}.
 *
 * PCA-1: Pipeline run with passing executor → isSuccess=true, total_cost_usd=0
 * PCA-2: Stages array maps to executor trace nodeIds
 * PCA-3: cost_by_model is always {} (field present, always empty)
 * PCA-4: Executor failure → result.isSuccess=false (DataProcessResult.failure)
 * PCA-5: Successful run → artifactId is a non-empty string
 * PCA-6: Executor failure propagates errorCode to result
 * PCA-7: total_cost_usd field always present and always zero
 * PCA-8: Stage success/elapsedMs/details map correctly from NodeTrace
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { GenericNodeExecutor } from '../../src/engine/generic-node-executor';
import { StationInput } from '../../src/af-stations/base';
import { AfPipeline } from '../../src/af-stations/af-pipeline';

// ── Helpers ───────────────────────────────────────────────────────────────────

const TENANT_ID = 'flow003-pipeline-tenant';

function makeInput(taskType = 'T-TEST'): StationInput {
  return new StationInput({
    tenantId: TENANT_ID,
    taskType,
    spec: { name: 'TestService', purpose: 'unit test' },
  });
}

/** Executor that always returns PASS with optional trace nodes */
function makePassExecutor(
  trace: Array<{
    nodeId: string;
    nodeType?: string;
    status?: 'PASS' | 'FAIL' | 'SKIP';
    durationMs?: number;
    output?: Record<string, unknown>;
  }> = [],
): GenericNodeExecutor {
  const fullTrace = trace.map((n) => ({
    nodeId: n.nodeId,
    nodeType: n.nodeType ?? n.nodeId,
    status: n.status ?? 'PASS',
    durationMs: n.durationMs ?? 10,
    output: n.output,
  }));
  return {
    execute: jest.fn(async () =>
      DataProcessResult.success({
        runId: 'run-pca-test',
        status: 'PASS',
        score: 90,
        trace: fullTrace,
        finalOutput: { code: '// generated' },
        promoted: true,
        promotionLevel: 'MINIMAL',
      }),
    ),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

/** Executor that always returns failure */
function makeFailExecutor(
  errorCode = 'EXECUTOR_FAIL',
  errorMessage = 'executor failed',
): GenericNodeExecutor {
  return {
    execute: jest.fn(async () => DataProcessResult.failure(errorCode, errorMessage)),
    getTrace: jest.fn(async () => DataProcessResult.success(null)),
  } as unknown as GenericNodeExecutor;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AfPipeline — Result Structure [PCA]', () => {
  describe('PCA-1: pipeline run with passing executor returns success', () => {
    it('isSuccess=true and total_cost_usd=0 after run', async () => {
      const pipeline = new AfPipeline(makePassExecutor());
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(true);
      const pr = result.data!;
      expect(pr.total_cost_usd).toBe(0);
    });
  });

  describe('PCA-2: stages array maps to executor trace', () => {
    it('stages correspond to trace nodeIds returned by executor', async () => {
      const trace = [
        { nodeId: 'rag-retrieve', durationMs: 5 },
        { nodeId: 'ai-generate', durationMs: 120 },
        { nodeId: 'validate', durationMs: 8 },
      ];
      const pipeline = new AfPipeline(makePassExecutor(trace));
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(true);
      const pr = result.data!;
      expect(pr.stages).toHaveLength(3);
      expect(pr.stages[0].stage).toBe('rag-retrieve');
      expect(pr.stages[1].stage).toBe('ai-generate');
      expect(pr.stages[2].stage).toBe('validate');
    });

    it('empty trace produces empty stages array', async () => {
      const pipeline = new AfPipeline(makePassExecutor([]));
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(true);
      expect(result.data!.stages).toHaveLength(0);
    });
  });

  describe('PCA-3: cost_by_model is always empty object', () => {
    it('cost_by_model = {} regardless of executor trace', async () => {
      const pipeline = new AfPipeline(makePassExecutor([{ nodeId: 'ai-generate' }]));
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(true);
      const pr = result.data!;
      expect(typeof pr.cost_by_model).toBe('object');
      expect(Object.keys(pr.cost_by_model)).toHaveLength(0);
    });
  });

  describe('PCA-4: executor failure → pipeline returns DataProcessResult.failure', () => {
    it('result.isSuccess=false when executor returns failure', async () => {
      const pipeline = new AfPipeline(makeFailExecutor('AI_DOWN', 'service unavailable'));
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(false);
      expect(result.data).toBeFalsy();
    });
  });

  describe('PCA-5: successful run returns artifactId from executor runId', () => {
    it('artifactId is a non-empty string matching executor runId', async () => {
      const pipeline = new AfPipeline(makePassExecutor());
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(true);
      const pr = result.data!;
      expect(pr.artifactId).toBeDefined();
      expect(typeof pr.artifactId).toBe('string');
      expect(pr.artifactId.length).toBeGreaterThan(0);
      // Should match the runId the mock returns
      expect(pr.artifactId).toBe('run-pca-test');
    });
  });

  describe('PCA-6: executor failure propagates errorCode', () => {
    it('result.errorCode matches executor errorCode on failure', async () => {
      const pipeline = new AfPipeline(makeFailExecutor('BUDGET_EXCEEDED', 'spend limit hit'));
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('BUDGET_EXCEEDED');
      expect(result.errorMessage).toBe('spend limit hit');
    });
  });

  describe('PCA-7: total_cost_usd always present and always zero', () => {
    it('total_cost_usd field is always 0 regardless of executor outcome', async () => {
      const pipeline = new AfPipeline(makePassExecutor());
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(true);
      const pr = result.data!;
      expect(pr).toHaveProperty('total_cost_usd');
      expect(pr).toHaveProperty('cost_by_model');
      expect(pr.total_cost_usd).toBe(0);
    });
  });

  describe('PCA-8: stage fields map correctly from NodeTrace', () => {
    it('stage success/elapsedMs/details come from NodeTrace fields', async () => {
      const trace = [
        {
          nodeId: 'synthesize',
          status: 'PASS' as const,
          durationMs: 250,
          output: { generated: true, tokens: 150 },
        },
        {
          nodeId: 'judge',
          status: 'FAIL' as const,
          durationMs: 30,
        },
      ];
      const pipeline = new AfPipeline(makePassExecutor(trace));
      const result = await pipeline.execute(makeInput());

      expect(result.isSuccess).toBe(true);
      const pr = result.data!;

      const syn = pr.stages.find((s) => s.stage === 'synthesize');
      expect(syn).toBeDefined();
      expect(syn!.success).toBe(true);
      expect(syn!.elapsedMs).toBe(250);
      expect(syn!.details).toEqual({ generated: true, tokens: 150 });

      const judge = pr.stages.find((s) => s.stage === 'judge');
      expect(judge).toBeDefined();
      expect(judge!.success).toBe(false);
      expect(judge!.elapsedMs).toBe(30);
    });
  });

  describe('PCA-9: missing tenantId returns failure (DNA-5)', () => {
    it('pipeline returns failure when tenantId is absent', async () => {
      const pipeline = new AfPipeline(makePassExecutor());
      const input = new StationInput({ tenantId: '', taskType: 'T-TEST', spec: {} });
      const result = await pipeline.execute(input);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_TENANT');
    });
  });
});
