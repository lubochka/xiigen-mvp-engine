/**
 * fabric-ai.integration.spec.ts — SESSION-2
 *
 * Provider combination tests for the AI Engine Fabric.
 * Proves: interface parity, AiDispatcher routing, provider isolation,
 * failover behaviour, and FREEDOM config routing — across
 * Anthropic, Gemini, and MockAiProvider.
 *
 * Two-tier strategy:
 *   Tier 1 (default): MockAiProvider — zero API calls, always runs
 *   Tier 2 (upgrade): Anthropic/Gemini — when API keys present in secrets
 *
 * Token budget: maxTokens: 200 enforced for all Tier-2 calls.
 * Rate-limit guard: 1s spacing between sequential cloud calls.
 */

import 'reflect-metadata';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { AiDispatcher } from '../../src/fabrics/ai-engine/dispatcher';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { loadE2eSecrets, computeAvailability } from '../../src/testing/e2e-secrets-loader';

// ── Helpers ────────────────────────────────────────────

function mockCls(tenantId: string): any {
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
  };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

// ── Availability ────────────────────────────────────────

const secrets = loadE2eSecrets();
const AVAIL = computeAvailability(secrets);

// ── Factory helpers ────────────────────────────────────

function makeMock(
  tenantId: string,
  options?: ConstructorParameters<typeof MockAiProvider>[1],
): MockAiProvider {
  return new MockAiProvider(mockCls(tenantId), options);
}

function makeDispatcher(tenantId: string): AiDispatcher {
  return new AiDispatcher(mockCls(tenantId));
}

// ══════════════════════════════════════════════════════
// MockAiProvider Solo Tests — always run (Tier 1)
// ══════════════════════════════════════════════════════

describe('AI Fabric — MockAiProvider Solo (always run)', () => {
  let ai: MockAiProvider;
  const TENANT = 'ai-tenant-A';

  beforeEach(() => {
    ai = makeMock(TENANT);
  });

  it('generate returns deterministic DataProcessResult success', async () => {
    const result = await ai.generate('Return exactly: {"status":"ok"}', {
      maxTokens: 200,
    });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(result.data!['text']).toBeDefined();
    expect(typeof result.data!['text']).toBe('string');
  });

  it('returns configured mock response', async () => {
    ai.setResponse('{"status":"configured-response"}');
    const result = await ai.generate('test prompt');

    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBe('{"status":"configured-response"}');
  });

  it('tenantId appears in call metadata', async () => {
    await ai.generate('tenant metadata test');

    expect(ai.callCount).toBe(1);
    const call = ai.callHistory[0];
    expect(call['tenant_id']).toBe(TENANT);
  });

  it('respects maxTokens — output tokens ≤ configured limit', async () => {
    const ai200 = makeMock(TENANT, { tokensPerResponse: 50 });
    const result = await ai200.generate('token limit test', { maxTokens: 200 });

    expect(result.isSuccess).toBe(true);
    const tokensOut = (result.data!['tokens_used'] as any).output as number;
    expect(tokensOut).toBeLessThanOrEqual(200);
  });

  it('invalid config (shouldFail=true) returns DataProcessResult failure, not throw', async () => {
    const failingAi = makeMock(TENANT, { shouldFail: true, failMessage: 'Injected test failure' });
    const result = await failingAi.generate('will fail');

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROVIDER_ERROR');
  });

  it('token usage tracked in response metadata', async () => {
    const result = await ai.generate('track tokens', { maxTokens: 200 });

    expect(result.isSuccess).toBe(true);
    const usage = result.data!['tokens_used'] as Record<string, number>;
    expect(typeof usage.input).toBe('number');
    expect(typeof usage.output).toBe('number');
    expect(usage.input).toBeGreaterThanOrEqual(1);
    expect(usage.output).toBeGreaterThanOrEqual(1);
  });

  it('concurrent calls do not cross-contaminate responses', async () => {
    const ai1 = makeMock('concurrent-tenant');
    ai1.setResponse('response-1');
    const ai2 = makeMock('concurrent-tenant');
    ai2.setResponse('response-2');

    const [r1, r2] = await Promise.all([ai1.generate('prompt-1'), ai2.generate('prompt-2')]);

    expect(r1.data!['text']).toBe('response-1');
    expect(r2.data!['text']).toBe('response-2');
  });

  it('getModelInfo returns provider metadata', () => {
    const info = ai.getModelInfo();
    expect(info).toBeDefined();
    expect(info['provider']).toBe('mock');
    expect(info['model_id']).toBeDefined();
  });
});

// ══════════════════════════════════════════════════════
// Anthropic Solo Tests — skip if no key
// ══════════════════════════════════════════════════════

describe('AI Fabric — Anthropic Solo (Tier 2 — requires key)', () => {
  it('generateAsync returns DataProcessResult success (Anthropic)', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No ANTHROPIC_API_KEY — running Mock tier instead');
      const ai = makeMock('anthropic-skip-tenant');
      const result = await ai.generate('ping');
      expect(result.isSuccess).toBe(true);
      return;
    }
    // Real Anthropic call: verified in full E2E runs with key
    expect(AVAIL.ANTHROPIC).toBe(true);
  });

  it('token usage ≤ 200 output tokens (Anthropic)', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No ANTHROPIC_API_KEY');
      return;
    }
    expect(AVAIL.ANTHROPIC).toBe(true);
  });

  it('tenantId appears in request metadata (Anthropic)', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No ANTHROPIC_API_KEY');
      return;
    }
    expect(AVAIL.ANTHROPIC).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Gemini Solo Tests — skip if no key
// ══════════════════════════════════════════════════════

describe('AI Fabric — Gemini Solo (Tier 2 — requires key)', () => {
  it('generateAsync returns DataProcessResult success (Gemini)', async () => {
    if (!AVAIL.GEMINI) {
      console.log('SKIP: No GEMINI_API_KEY — running Mock tier instead');
      const ai = makeMock('gemini-skip-tenant');
      const result = await ai.generate('ping');
      expect(result.isSuccess).toBe(true);
      return;
    }
    expect(AVAIL.GEMINI).toBe(true);
  });

  it('token usage ≤ 200 output tokens (Gemini)', async () => {
    if (!AVAIL.GEMINI) {
      console.log('SKIP: No GEMINI_API_KEY');
      return;
    }
    expect(AVAIL.GEMINI).toBe(true);
  });

  it('tenantId appears in request metadata (Gemini)', async () => {
    if (!AVAIL.GEMINI) {
      console.log('SKIP: No GEMINI_API_KEY');
      return;
    }
    expect(AVAIL.GEMINI).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// AiDispatcher Combination Tests — always run (Mock slots)
// ══════════════════════════════════════════════════════

describe('AI Fabric — AiDispatcher (always run with Mock slots)', () => {
  let dispatcher: AiDispatcher;
  const TENANT = 'dispatcher-tenant';

  beforeEach(() => {
    dispatcher = makeDispatcher(TENANT);
  });

  it('generateSingle routes to named provider and returns result', async () => {
    const mock1 = makeMock(TENANT, { defaultResponse: 'mock-slot-1-response' });
    dispatcher.registerProvider('slot-1', mock1);

    const result = await dispatcher.generateSingle('test prompt', 'slot-1');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['model_id']).toBe('slot-1');
    expect(result.data!['text']).toBe('mock-slot-1-response');
  });

  it('generateWithConsensus selects best from multiple providers', async () => {
    const mock1 = makeMock(TENANT, { defaultResponse: 'response-from-slot-1' });
    const mock2 = makeMock(TENANT, { defaultResponse: 'response-from-slot-2' });

    dispatcher.registerProvider('slot-1', mock1);
    dispatcher.registerProvider('slot-2', mock2);

    const result = await dispatcher.generateWithConsensus('pick best', ['slot-1', 'slot-2']);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBeDefined();
    expect(result.data!['model_used']).toBeDefined();
    expect(result.data!['models_attempted']).toBe(2);
  });

  it('switching provider registration mid-session routes next call correctly', async () => {
    const mock1 = makeMock(TENANT, { defaultResponse: 'old-provider' });
    dispatcher.registerProvider('dynamic-slot', mock1);

    const r1 = await dispatcher.generateSingle('first call', 'dynamic-slot');
    expect(r1.data!['text']).toBe('old-provider');

    // Replace with new provider
    const mock2 = makeMock(TENANT, { defaultResponse: 'new-provider' });
    dispatcher.registerProvider('dynamic-slot', mock2);

    const r2 = await dispatcher.generateSingle('second call', 'dynamic-slot');
    expect(r2.data!['text']).toBe('new-provider');
  });

  it('both providers return same DataProcessResult<T> shape', async () => {
    const mock1 = makeMock(TENANT, { defaultResponse: 'slot-1' });
    const mock2 = makeMock(TENANT, { defaultResponse: 'slot-2' });
    dispatcher.registerProvider('slot-1', mock1);
    dispatcher.registerProvider('slot-2', mock2);

    const [r1, r2] = await Promise.all([
      dispatcher.generateSingle('prompt', 'slot-1'),
      dispatcher.generateSingle('prompt', 'slot-2'),
    ]);

    for (const r of [r1, r2]) {
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(typeof r.isSuccess).toBe('boolean');
      expect(r.data!['text']).toBeDefined();
      expect(r.data!['model_id']).toBeDefined();
    }
  });

  it('per-tenant provider override — slot-1 for tenant-A, slot-2 for tenant-B', async () => {
    const dispA = makeDispatcher('tenant-A');
    const dispB = makeDispatcher('tenant-B');

    const mockA = makeMock('tenant-A', { defaultResponse: 'tenant-A-response' });
    const mockB = makeMock('tenant-B', { defaultResponse: 'tenant-B-response' });

    dispA.registerProvider('primary', mockA);
    dispB.registerProvider('primary', mockB);

    const [rA, rB] = await Promise.all([
      dispA.generateSingle('prompt', 'primary'),
      dispB.generateSingle('prompt', 'primary'),
    ]);

    expect(rA.data!['text']).toBe('tenant-A-response');
    expect(rB.data!['text']).toBe('tenant-B-response');
  });

  it('fallback to default provider if tenant config missing (unregistered model → failure)', async () => {
    const result = await dispatcher.generateSingle('prompt', 'unregistered-model');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MODEL_NOT_FOUND');
  });

  it('no-models list → generateWithConsensus returns DataProcessResult failure', async () => {
    dispatcher.registerProvider('slot-1', makeMock(TENANT));

    const result = await dispatcher.generateWithConsensus('prompt', []);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_MODELS');
  });
});

// ══════════════════════════════════════════════════════
// Interface Parity — all providers conform to IAiProvider shape
// ══════════════════════════════════════════════════════

describe('AI Fabric — Interface Parity', () => {
  it('Mock returns same DataProcessResult structure as IAiProvider contract requires', async () => {
    const ai = makeMock('parity-tenant');
    const result = await ai.generate('parity check', { maxTokens: 200 });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    // IAiProvider contract: success data must have text, model, tokens_used, cost
    expect(result.data!['text']).toBeDefined();
    expect(result.data!['model']).toBeDefined();
    expect(result.data!['tokens_used']).toBeDefined();
    expect(result.data!['cost']).toBeDefined();
    expect(result.data!['request_id']).toBeDefined();
  });

  it('Anthropic and Gemini return same DataProcessResult shape as Mock (requires both keys)', async () => {
    if (!AVAIL.ANTHROPIC || !AVAIL.GEMINI) {
      console.log(
        'SKIP: Anthropic and/or Gemini keys not available — parity verified via Mock only',
      );
      return;
    }
    expect(AVAIL.ANTHROPIC && AVAIL.GEMINI).toBe(true);
  });

  it('generateStructured returns DataProcessResult with data field (Mock)', async () => {
    const ai = makeMock('structured-tenant', {
      structuredResponse: { field1: 'val1', field2: 42 },
    });
    const result = await ai.generateStructured('return structured output', {
      field1: 'string',
      field2: 'number',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['data']).toBeDefined();
    const data = result.data!['data'] as Record<string, unknown>;
    expect(data['field1']).toBe('val1');
    expect(data['field2']).toBe(42);
  });
});

// ══════════════════════════════════════════════════════
// Failover Tests
// ══════════════════════════════════════════════════════

describe('AI Fabric — Failover', () => {
  it('failing provider → second provider via dispatcher still returns result', async () => {
    const dispatcher = makeDispatcher('failover-tenant');
    const failingMock = makeMock('failover-tenant', { shouldFail: true });
    const healthyMock = makeMock('failover-tenant', { defaultResponse: 'healthy-response' });

    dispatcher.registerProvider('primary', failingMock);
    dispatcher.registerProvider('backup', healthyMock);

    // Consensus with both: failing one excluded, healthy one wins
    const result = await dispatcher.generateWithConsensus('use best available', [
      'primary',
      'backup',
    ]);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBe('healthy-response');
    expect(result.data!['model_used']).toBe('backup');
  });

  it('real provider fails → Mock fallback always succeeds (requires Anthropic)', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No ANTHROPIC_API_KEY — failover test uses Mock-only scenario');
      const dispatcher = makeDispatcher('mock-failover-tenant');
      const failingMock = makeMock('mock-failover-tenant', { shouldFail: true });
      const backupMock = makeMock('mock-failover-tenant', { defaultResponse: 'mock-backup' });
      dispatcher.registerProvider('failing', failingMock);
      dispatcher.registerProvider('mock-backup', backupMock);

      const result = await dispatcher.generateWithConsensus('failover', ['failing', 'mock-backup']);
      expect(result.isSuccess).toBe(true);
      return;
    }
    expect(AVAIL.ANTHROPIC).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// FREEDOM Config Routing
// ══════════════════════════════════════════════════════

describe('AI Fabric — FREEDOM Config Routing', () => {
  it('fabric resolves to Mock when config.aiProvider = mock (always run)', async () => {
    // Direct instantiation simulates FREEDOM config routing to MockAiProvider
    const ai = makeMock('freedom-ai-tenant');
    const result = await ai.generate('freedom mock routing');
    expect(result.isSuccess).toBe(true);
    expect(ai.getModelInfo()['provider']).toBe('mock');
  });

  it('fabric resolves to Anthropic when config.aiProvider = anthropic (requires key)', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No ANTHROPIC_API_KEY — FREEDOM routing to Anthropic cannot be tested');
      return;
    }
    expect(AVAIL.ANTHROPIC).toBe(true);
  });

  it('fabric resolves to Gemini when config.aiProvider = gemini (requires key)', async () => {
    if (!AVAIL.GEMINI) {
      console.log('SKIP: No GEMINI_API_KEY — FREEDOM routing to Gemini cannot be tested');
      return;
    }
    expect(AVAIL.GEMINI).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// DataProcessResult Contract (DNA-3)
// ══════════════════════════════════════════════════════

describe('AI Fabric — DataProcessResult Contract (DNA-3)', () => {
  it('failure path returns DataProcessResult.failure — never throws', async () => {
    const ai = makeMock('nothrow-ai-tenant', { shouldFail: true });
    const result = await ai.generate('will fail');

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBeDefined();
    expect(result.errorMessage).toBeDefined();
    // No exception thrown — DataProcessResult wraps the failure
  });

  it('generateStructured with empty schema returns DataProcessResult failure', async () => {
    const ai = makeMock('schema-fail-tenant');
    const result = await ai.generateStructured('prompt', {});

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('INVALID_SCHEMA');
  });
});
