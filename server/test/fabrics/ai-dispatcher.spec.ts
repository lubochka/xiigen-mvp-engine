/**
 * P4.4 — AiDispatcher Tests.
 *
 * generateWithConsensus: parallel execution, scoring, best selection,
 *   partial failure, all fail, timeout, custom rubric, unregistered models.
 * generateSingle: success, model not found, provider error.
 * registerProvider / unregisterProvider: dynamic add/remove.
 * healthCheck: all healthy, partial unhealthy.
 * DNA-5: no tenant → failure.
 * DNA-3: all paths return DataProcessResult.
 */

import { AiDispatcher } from '../../src/fabrics/ai-engine/dispatcher';
import { OutputScorer } from '../../src/fabrics/ai-engine/scoring';
import { IAiProvider } from '../../src/fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── Helpers ──────────────────────────────────────────

const TENANT_ID = 'dispatcher-tenant';

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

function mockClsEmpty() {
  return { get: jest.fn().mockReturnValue(undefined) } as any;
}

/** Create a mock IAiProvider that returns configurable text. */
function makeMockProvider(
  text: string,
  opts?: { cost?: number; delayMs?: number; shouldFail?: boolean; failMessage?: string },
): IAiProvider {
  const cost = opts?.cost ?? 0.01;
  const delayMs = opts?.delayMs ?? 0;
  const shouldFail = opts?.shouldFail ?? false;
  const failMessage = opts?.failMessage ?? 'Provider failed';

  return {
    generate: jest.fn().mockImplementation(async () => {
      if (delayMs > 0) await new Promise((r) => setTimeout(r, delayMs));
      if (shouldFail) return DataProcessResult.failure('PROVIDER_ERROR', failMessage);
      return DataProcessResult.success({
        text,
        model: 'mock',
        tokens_used: { input: 10, output: 20 },
        cost,
      });
    }),
    generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({ data: {} })),
    getModelInfo: jest.fn().mockReturnValue({ model: 'mock' }),
    healthCheck: jest.fn().mockResolvedValue(DataProcessResult.success({ status: 'ok' })),
  } as any;
}

// ── Tests ────────────────────────────────────────────

describe('AiDispatcher', () => {
  let dispatcher: AiDispatcher;
  const cls = mockCls(TENANT_ID);

  beforeEach(() => {
    dispatcher = new AiDispatcher(cls, new OutputScorer(), { timeoutSeconds: 5 });
    jest.useRealTimers();
  });

  afterEach(() => {
    // Clean up any lingering timers from timeout tests
    jest.clearAllTimers();
  });

  // ── generateWithConsensus ──────────────────────────

  describe('generateWithConsensus', () => {
    it('should run 2 models and select best by score', async () => {
      dispatcher.registerProvider('model-a', makeMockProvider('Short'));
      dispatcher.registerProvider(
        'model-b',
        makeMockProvider(
          'A much longer and more detailed response that should score higher on quality and length criteria.',
          { cost: 0.02 },
        ),
      );

      const result = await dispatcher.generateWithConsensus('Write code', ['model-a', 'model-b']);

      expect(result.isSuccess).toBe(true);
      expect(result.data!['models_attempted']).toBe(2);
      expect(result.data!['models_succeeded']).toBe(2);
      expect(result.data!['text']).toBeDefined();
      expect(result.data!['model_used']).toBeDefined();
      expect(result.data!['scores']).toBeDefined();
      expect(result.data!['all_outputs']).toBeDefined();
      expect(typeof result.data!['cost']).toBe('number');

      // Best should be model-b (longer text scores higher)
      expect(result.data!['model_used']).toBe('model-b');
    });

    it('should succeed when 1 of 2 models fails', async () => {
      dispatcher.registerProvider('good', makeMockProvider('Valid output'));
      dispatcher.registerProvider('bad', makeMockProvider('', { shouldFail: true }));

      const result = await dispatcher.generateWithConsensus('Generate', ['good', 'bad']);

      expect(result.isSuccess).toBe(true);
      expect(result.data!['models_succeeded']).toBe(1);
      expect(result.data!['models_attempted']).toBe(2);
      expect(result.data!['text']).toBe('Valid output');
    });

    it('should fail when all models fail', async () => {
      dispatcher.registerProvider(
        'fail-a',
        makeMockProvider('', { shouldFail: true, failMessage: 'Error A' }),
      );
      dispatcher.registerProvider(
        'fail-b',
        makeMockProvider('', { shouldFail: true, failMessage: 'Error B' }),
      );

      const result = await dispatcher.generateWithConsensus('Generate', ['fail-a', 'fail-b']);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ALL_MODELS_FAILED');
      expect(result.errorMessage).toContain('Error A');
      expect(result.errorMessage).toContain('Error B');
    });

    it('should handle timeout on slow model while fast model succeeds', async () => {
      // Create dispatcher with very short timeout
      const fastDispatcher = new AiDispatcher(cls, new OutputScorer(), { timeoutSeconds: 0.1 });
      fastDispatcher.registerProvider('fast', makeMockProvider('Fast response'));
      fastDispatcher.registerProvider('slow', makeMockProvider('Slow response', { delayMs: 500 }));

      const result = await fastDispatcher.generateWithConsensus('Generate', ['fast', 'slow']);

      expect(result.isSuccess).toBe(true);
      expect(result.data!['models_succeeded']).toBeGreaterThanOrEqual(1);
      expect(result.data!['text']).toBe('Fast response');
    });

    it('should use custom judge rubric', async () => {
      dispatcher.registerProvider('model-a', makeMockProvider('Short'));
      dispatcher.registerProvider(
        'model-b',
        makeMockProvider('Also short but has DataProcessResult and tenant_id'),
      );

      const result = await dispatcher.generateWithConsensus('Generate', ['model-a', 'model-b'], {
        judgeRubric: { dna_compliance: 1.0 },
      });

      expect(result.isSuccess).toBe(true);
      // model-b has DNA keywords → higher dna_compliance score
      expect(result.data!['model_used']).toBe('model-b');
    });

    it('should filter out unregistered model IDs', async () => {
      dispatcher.registerProvider('real', makeMockProvider('Output'));

      const result = await dispatcher.generateWithConsensus('Generate', [
        'real',
        'ghost-model',
        'phantom',
      ]);

      expect(result.isSuccess).toBe(true);
      expect(result.data!['models_attempted']).toBe(1); // only 'real'
    });

    it('should fail when all requested models are unregistered', async () => {
      const result = await dispatcher.generateWithConsensus('Generate', ['ghost-a', 'ghost-b']);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_VALID_MODELS');
    });

    it('should fail with empty model list', async () => {
      const result = await dispatcher.generateWithConsensus('Generate', []);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_MODELS');
    });

    it('should fail with empty prompt', async () => {
      dispatcher.registerProvider('model', makeMockProvider('Output'));

      const result = await dispatcher.generateWithConsensus('', ['model']);

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PROMPT');
    });

    it('should aggregate total cost from all models', async () => {
      dispatcher.registerProvider('m1', makeMockProvider('Output 1', { cost: 0.05 }));
      dispatcher.registerProvider('m2', makeMockProvider('Output 2', { cost: 0.03 }));

      const result = await dispatcher.generateWithConsensus('Generate', ['m1', 'm2']);

      expect(result.isSuccess).toBe(true);
      expect(result.data!['cost']).toBeCloseTo(0.08);
    });

    it('should run 3 models in parallel', async () => {
      const startTime = Date.now();

      dispatcher.registerProvider('m1', makeMockProvider('Response 1', { delayMs: 50 }));
      dispatcher.registerProvider(
        'm2',
        makeMockProvider('Response 2 is longer and better', { delayMs: 50 }),
      );
      dispatcher.registerProvider(
        'm3',
        makeMockProvider('Response 3 is the longest and should score highest overall', {
          delayMs: 50,
        }),
      );

      const result = await dispatcher.generateWithConsensus('Generate', ['m1', 'm2', 'm3']);

      const elapsed = Date.now() - startTime;
      expect(result.isSuccess).toBe(true);
      expect(result.data!['models_succeeded']).toBe(3);
      // Should run in parallel — total time ~50ms, not ~150ms
      expect(elapsed).toBeLessThan(500);
    });

    it('should pass systemPrompt to all providers', async () => {
      const provider = makeMockProvider('Output');
      dispatcher.registerProvider('model', provider);

      await dispatcher.generateWithConsensus('Generate', ['model'], { systemPrompt: 'Be a coder' });

      expect(provider.generate as jest.Mock).toHaveBeenCalledWith(
        'Generate',
        expect.objectContaining({ systemPrompt: 'Be a coder' }),
      );
    });
  });

  // ── generateSingle ─────────────────────────────────

  describe('generateSingle', () => {
    it('should run a single model and return result', async () => {
      dispatcher.registerProvider('claude', makeMockProvider('Hello from Claude'));

      const result = await dispatcher.generateSingle('Generate', 'claude');

      expect(result.isSuccess).toBe(true);
      expect(result.data!['text']).toBe('Hello from Claude');
      expect(result.data!['model_id']).toBe('claude');
    });

    it('should fail when model is not registered', async () => {
      const result = await dispatcher.generateSingle('Generate', 'nonexistent');

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MODEL_NOT_FOUND');
    });

    it('should propagate provider error', async () => {
      dispatcher.registerProvider(
        'fail',
        makeMockProvider('', {
          shouldFail: true,
          failMessage: 'API Error',
        }),
      );

      const result = await dispatcher.generateSingle('Generate', 'fail');

      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_ERROR');
    });

    it('should fail with empty prompt', async () => {
      dispatcher.registerProvider('model', makeMockProvider('Output'));
      const result = await dispatcher.generateSingle('', 'model');
      expect(result.errorCode).toBe('MISSING_PROMPT');
    });

    it('should pass systemPrompt option', async () => {
      const provider = makeMockProvider('Output');
      dispatcher.registerProvider('model', provider);

      await dispatcher.generateSingle('Generate', 'model', { systemPrompt: 'Be concise' });

      expect(provider.generate as jest.Mock).toHaveBeenCalledWith(
        'Generate',
        expect.objectContaining({ systemPrompt: 'Be concise' }),
      );
    });
  });

  // ── Provider management ────────────────────────────

  describe('registerProvider / unregisterProvider', () => {
    it('should register and list providers', () => {
      dispatcher.registerProvider('m1', makeMockProvider(''));
      dispatcher.registerProvider('m2', makeMockProvider(''));
      expect(dispatcher.registeredModels).toContain('m1');
      expect(dispatcher.registeredModels).toContain('m2');
      expect(dispatcher.registeredModels.length).toBe(2);
    });

    it('should unregister a provider', () => {
      dispatcher.registerProvider('m1', makeMockProvider(''));
      expect(dispatcher.unregisterProvider('m1')).toBe(true);
      expect(dispatcher.registeredModels).not.toContain('m1');
    });

    it('should return false when unregistering non-existent provider', () => {
      expect(dispatcher.unregisterProvider('ghost')).toBe(false);
    });

    it('should overwrite on re-register', () => {
      const p1 = makeMockProvider('v1');
      const p2 = makeMockProvider('v2');
      dispatcher.registerProvider('model', p1);
      dispatcher.registerProvider('model', p2);
      expect(dispatcher.registeredModels.length).toBe(1);
    });
  });

  // ── healthCheck ────────────────────────────────────

  describe('healthCheck', () => {
    it('should return healthy when all providers are healthy', async () => {
      dispatcher.registerProvider('m1', makeMockProvider(''));
      dispatcher.registerProvider('m2', makeMockProvider(''));

      const result = await dispatcher.healthCheck();
      expect(result.isSuccess).toBe(true);
      expect(result.data!['status']).toBe('healthy');
      expect((result.data!['models'] as any)['m1']).toBe(true);
      expect((result.data!['models'] as any)['m2']).toBe(true);
    });

    it('should return failure when some providers are unhealthy', async () => {
      const healthy = makeMockProvider('');
      const sick = makeMockProvider('');
      (sick as any).healthCheck = jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('UNHEALTHY', 'sick'));

      dispatcher.registerProvider('healthy', healthy);
      dispatcher.registerProvider('sick', sick);

      const result = await dispatcher.healthCheck();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PARTIAL_UNHEALTHY');
    });

    it('should return failure when no providers registered', async () => {
      const result = await dispatcher.healthCheck();
      expect(result.isSuccess).toBe(false);
    });

    it('should handle healthCheck that throws', async () => {
      const prov = makeMockProvider('');
      (prov as any).healthCheck = jest.fn().mockRejectedValue(new Error('boom'));
      dispatcher.registerProvider('broken', prov);

      const result = await dispatcher.healthCheck();
      expect(result.isSuccess).toBe(false);
    });
  });

  // ── DNA-5: no tenant context ──────────────────────

  describe('DNA-5: no tenant context', () => {
    it('generateWithConsensus should fail without tenant', async () => {
      const noTenantDispatcher = new AiDispatcher(mockClsEmpty());
      noTenantDispatcher.registerProvider('m', makeMockProvider(''));

      const result = await noTenantDispatcher.generateWithConsensus('test', ['m']);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });

    it('generateSingle should fail without tenant', async () => {
      const noTenantDispatcher = new AiDispatcher(mockClsEmpty());
      noTenantDispatcher.registerProvider('m', makeMockProvider(''));

      const result = await noTenantDispatcher.generateSingle('test', 'm');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });
  });

  // ── DNA-3: DataProcessResult ───────────────────────

  describe('DNA-3: all methods return DataProcessResult', () => {
    it('every method returns DataProcessResult', async () => {
      dispatcher.registerProvider('m', makeMockProvider('output'));

      const results = await Promise.all([
        dispatcher.generateWithConsensus('test', ['m']),
        dispatcher.generateSingle('test', 'm'),
        dispatcher.healthCheck(),
      ]);

      for (const r of results) {
        expect(r).toBeInstanceOf(DataProcessResult);
      }
    });
  });
});
