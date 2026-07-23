/**
 * FLOW-00.3 Phase A — Dispatcher → CostTracker wiring tests
 *
 * DCW-1: generateSingle() with mock provider → CostTracker has 1 record
 * DCW-2: generateWithConsensus() with 3 models → CostTracker has 3 records
 * DCW-3: One model fails in consensus → CostTracker has records for successes only
 * DCW-4: Verify tenantId from CLS flows to CostTracker record
 * DCW-5: Verify cost matches provider response cost field
 * DCW-6: getTenantUsage() returns correct by_model breakdown after consensus
 */

import { AiDispatcher } from '../../src/fabrics/ai-engine/dispatcher';
import { OutputScorer } from '../../src/fabrics/ai-engine/scoring';
import { CostTracker } from '../../src/fabrics/ai-engine/cost-tracker';
import { IAiProvider } from '../../src/fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── Helpers ──────────────────────────────────────────────────────────────────

const TENANT_ID = 'flow003-test-tenant';

function mockCls(tenantId: string = TENANT_ID) {
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

function makeMockProvider(opts?: {
  text?: string;
  cost?: number;
  tokensIn?: number;
  tokensOut?: number;
  shouldFail?: boolean;
  failMessage?: string;
}): IAiProvider {
  const {
    text = 'mock response',
    cost = 0.05,
    tokensIn = 100,
    tokensOut = 50,
    shouldFail = false,
    failMessage = 'Provider failed',
  } = opts ?? {};

  return {
    generate: jest.fn().mockImplementation(async () => {
      if (shouldFail) {
        return DataProcessResult.failure('PROVIDER_ERROR', failMessage);
      }
      return DataProcessResult.success({
        text,
        model: 'mock',
        tokens_used: { input: tokensIn, output: tokensOut },
        cost,
      });
    }),
    generateStructured: jest.fn().mockResolvedValue(DataProcessResult.success({ data: {} })),
    getModelInfo: jest.fn().mockReturnValue({ model: 'mock' }),
    healthCheck: jest.fn().mockResolvedValue(DataProcessResult.success({ status: 'ok' })),
  } as any;
}

function makeDispatcher(costTracker: CostTracker, cls = mockCls()): AiDispatcher {
  return new AiDispatcher(cls, new OutputScorer(), { timeoutSeconds: 5 }, costTracker);
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('AiDispatcher — Cost Wiring [DCW]', () => {
  let costTracker: CostTracker;

  beforeEach(() => {
    costTracker = new CostTracker();
  });

  describe('DCW-1: generateSingle records cost', () => {
    it('calls CostTracker.record() once after successful generateSingle()', async () => {
      const dispatcher = makeDispatcher(costTracker);
      dispatcher.registerProvider(
        'model-a',
        makeMockProvider({ cost: 0.05, tokensIn: 100, tokensOut: 50 }),
      );

      const result = await dispatcher.generateSingle('test prompt', 'model-a');

      expect(result.isSuccess).toBe(true);
      const usage = costTracker.getTenantUsage(TENANT_ID) as Record<string, any>;
      expect(usage.callCount).toBe(1);
      expect(usage.totalCost).toBeCloseTo(0.05);
      expect(usage.totalTokensIn).toBe(100);
      expect(usage.totalTokensOut).toBe(50);
    });
  });

  describe('DCW-2: generateWithConsensus records per model', () => {
    it('CostTracker has 3 records after consensus with 3 models', async () => {
      const dispatcher = makeDispatcher(costTracker);
      dispatcher.registerProvider('model-a', makeMockProvider({ text: 'answer A', cost: 0.01 }));
      dispatcher.registerProvider('model-b', makeMockProvider({ text: 'answer B', cost: 0.02 }));
      dispatcher.registerProvider('model-c', makeMockProvider({ text: 'answer C', cost: 0.03 }));

      const result = await dispatcher.generateWithConsensus('test prompt', [
        'model-a',
        'model-b',
        'model-c',
      ]);

      expect(result.isSuccess).toBe(true);
      const usage = costTracker.getTenantUsage(TENANT_ID) as Record<string, any>;
      expect(usage.callCount).toBe(3);
      expect(usage.totalCost).toBeCloseTo(0.06);
    });
  });

  describe('DCW-3: failed model skipped in consensus', () => {
    it('CostTracker has 2 records when 1 of 3 models fails', async () => {
      const dispatcher = makeDispatcher(costTracker);
      dispatcher.registerProvider('model-a', makeMockProvider({ text: 'answer A', cost: 0.01 }));
      dispatcher.registerProvider('model-b', makeMockProvider({ shouldFail: true }));
      dispatcher.registerProvider('model-c', makeMockProvider({ text: 'answer C', cost: 0.03 }));

      const result = await dispatcher.generateWithConsensus('test prompt', [
        'model-a',
        'model-b',
        'model-c',
      ]);

      expect(result.isSuccess).toBe(true);
      const usage = costTracker.getTenantUsage(TENANT_ID) as Record<string, any>;
      // Only 2 successful models → 2 cost records
      expect(usage.callCount).toBe(2);
      expect(usage.totalCost).toBeCloseTo(0.04);
    });
  });

  describe('DCW-4: tenantId from CLS flows to CostTracker', () => {
    it('record() receives tenantId from AsyncLocalStorage context', async () => {
      const tenantId = 'specific-tenant-abc';
      const dispatcher = makeDispatcher(costTracker, mockCls(tenantId));
      dispatcher.registerProvider('model-x', makeMockProvider({ cost: 0.07 }));

      await dispatcher.generateSingle('prompt', 'model-x');

      // Should have data under the specific tenant ID, not 'unknown'
      const usageForTenant = costTracker.getTenantUsage(tenantId) as Record<string, any>;
      expect(usageForTenant.callCount).toBe(1);
      expect(usageForTenant.totalCost).toBeCloseTo(0.07);

      // Should NOT have data under 'unknown'
      const usageUnknown = costTracker.getTenantUsage('unknown') as Record<string, any>;
      expect(usageUnknown.callCount).toBe(0);
    });
  });

  describe('DCW-5: cost matches provider response cost field', () => {
    it('recorded cost equals provider response cost field', async () => {
      const dispatcher = makeDispatcher(costTracker);
      const exactCost = 0.0847;
      dispatcher.registerProvider('model-y', makeMockProvider({ cost: exactCost }));

      await dispatcher.generateSingle('prompt', 'model-y');

      const usage = costTracker.getTenantUsage(TENANT_ID) as Record<string, any>;
      expect(usage.totalCost).toBeCloseTo(exactCost, 6);
    });
  });

  describe('DCW-6: getTenantUsage returns by_model breakdown after consensus', () => {
    it('getTenantUsage().byModel has entries for each model after consensus', async () => {
      const dispatcher = makeDispatcher(costTracker);
      dispatcher.registerProvider(
        'claude-sonnet',
        makeMockProvider({ text: 'claude result', cost: 0.03 }),
      );
      dispatcher.registerProvider('gpt-5', makeMockProvider({ text: 'gpt result', cost: 0.05 }));

      await dispatcher.generateWithConsensus('prompt', ['claude-sonnet', 'gpt-5']);

      const usage = costTracker.getTenantUsage(TENANT_ID) as Record<string, any>;
      const byModel = usage.byModel as Record<string, any>;
      expect(byModel['claude-sonnet']).toBeDefined();
      expect(byModel['claude-sonnet'].totalCost).toBeCloseTo(0.03);
      expect(byModel['gpt-5']).toBeDefined();
      expect(byModel['gpt-5'].totalCost).toBeCloseTo(0.05);
      expect(usage.totalCost).toBeCloseTo(0.08);
    });
  });
});
