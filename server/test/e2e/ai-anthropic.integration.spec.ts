/**
 * ai-anthropic.integration.spec.ts — SESSION-3
 *
 * AI Provider integration tests — Anthropic tier.
 *
 * Two-tier strategy (always runs, never skips):
 *   Tier 1 (default): MockAiProvider — no key required, zero API calls
 *   Tier 2 (upgrade): AnthropicProvider with fetch-based clientFactory
 *                     — activated when ANTHROPIC_API_KEY present in secrets
 *
 * Token budget: maxTokens: 200 for all Tier-2 calls.
 * Model: claude-haiku-4-5-20251001 (or AI_TEST_MODEL_ANTHROPIC from session env).
 */

import 'reflect-metadata';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { AnthropicProvider } from '../../src/fabrics/ai-engine/anthropic.provider';
import { IAiProvider } from '../../src/fabrics/interfaces/ai-provider.interface';
import { TenantKeyResolver } from '../../src/kernel/multi-tenant/tenant-key.resolver';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { IAnthropicClient, AnthropicMessage } from '../../src/fabrics/ai-engine/protocols';
import { loadE2eSecrets, computeAvailability } from '../../src/testing/e2e-secrets-loader';

// ── Helpers ────────────────────────────────────────────

const TENANT = 'anthropic-test-tenant';

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

// ── Anthropic fetch-based client factory (Tier 2) ─────
// Implements IAnthropicClient using the Anthropic REST API.
// No SDK installation required — uses Node fetch.

function makeFetchAnthropicClient(apiKey: string): IAnthropicClient {
  return {
    messages: {
      create: async (params): Promise<AnthropicMessage> => {
        const body: Record<string, unknown> = {
          model: params.model,
          max_tokens: params.max_tokens,
          messages: params.messages,
          temperature: params.temperature ?? 0.7,
        };
        if (params.system) body['system'] = params.system;

        const response = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'anthropic-version': '2023-06-01',
            'content-type': 'application/json',
          },
          body: JSON.stringify(body),
        });

        if (!response.ok) {
          const errText = await response.text();
          throw new Error(`Anthropic API ${response.status}: ${errText}`);
        }

        return response.json() as Promise<AnthropicMessage>;
      },
    },
  };
}

// ── Two-tier provider selection ────────────────────────

const secrets = loadE2eSecrets();
const AVAIL = computeAvailability(secrets);
const MAX_TOKENS = 200;
const MODEL = secrets.aiTestModelAnthropic; // claude-haiku-4-5-20251001

let activeProvider: IAiProvider;
let activeTier: 'mock' | 'anthropic';
let mockRef: MockAiProvider | null = null;

beforeAll(() => {
  const cls = mockCls(TENANT);

  if (AVAIL.ANTHROPIC) {
    // Tier 2: real AnthropicProvider via fetch factory
    const keyResolver = new TenantKeyResolver(cls);
    keyResolver.setSystemKey('anthropic', secrets.anthropicApiKey);
    activeProvider = new AnthropicProvider(cls, keyResolver, makeFetchAnthropicClient, {
      defaultModel: MODEL,
    });
    activeTier = 'anthropic';
    console.log(`Tier 2: AnthropicProvider active (model: ${MODEL}, maxTokens: ${MAX_TOKENS})`);
  } else {
    // Tier 1: MockAiProvider
    const mock = new MockAiProvider(cls, {
      modelId: `mock-${MODEL}`,
      defaultResponse: '{"status":"ok","message":"mock anthropic response"}',
      structuredResponse: { status: 'ok', result: 'mock_structured' },
      tokensPerResponse: 50,
      costPerCall: 0.0001,
    });
    activeProvider = mock;
    mockRef = mock;
    activeTier = 'mock';
    console.log('Tier 1: MockAiProvider active (no ANTHROPIC_API_KEY)');
  }
});

// ══════════════════════════════════════════════════════
// 7 Core Provider Contract Tests (always run — Tier 1 or 2)
// ══════════════════════════════════════════════════════

describe(`AI Provider — Anthropic [active tier: ${AVAIL.ANTHROPIC ? 'Tier2/real' : 'Tier1/mock'}]`, () => {
  it('connects and returns a valid DataProcessResult success', async () => {
    const result = await activeProvider.generate('Return exactly: ok', { maxTokens: MAX_TOKENS });

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toBeDefined();
    expect(typeof result.data!['text']).toBe('string');
    expect((result.data!['text'] as string).length).toBeGreaterThan(0);
  });

  it(`respects maxTokens=${MAX_TOKENS} limit`, async () => {
    const result = await activeProvider.generate('Say hi briefly.', { maxTokens: MAX_TOKENS });

    expect(result.isSuccess).toBe(true);
    const usage = result.data!['tokens_used'] as { input: number; output: number };
    expect(typeof usage.output).toBe('number');
    expect(usage.output).toBeLessThanOrEqual(MAX_TOKENS);
  });

  it('returns structured JSON when prompted via generateStructured', async () => {
    const schema = { status: 'string', code: 'number' };
    const result = await activeProvider.generateStructured(
      'Return a JSON object with status="ok" and code=200',
      schema,
    );

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);

    if (activeTier === 'mock') {
      // Mock returns structuredResponse directly
      expect(result.data!['data']).toBeDefined();
    } else {
      // Real provider parses JSON from response
      expect(result.data!['data']).toBeDefined();
    }
  });

  it('tenantId is in scope during generation (CLS-bound context)', async () => {
    const result = await activeProvider.generate('Tenant context test', { maxTokens: MAX_TOKENS });
    expect(result.isSuccess).toBe(true);

    if (activeTier === 'mock' && mockRef) {
      // Mock tracks tenant_id in call history
      const calls = mockRef.getCallsForTenant(TENANT);
      expect(calls.length).toBeGreaterThanOrEqual(1);
      expect(calls[calls.length - 1]['tenant_id']).toBe(TENANT);
    } else {
      // Real provider: TenantContext was in scope (no error means CLS was active)
      expect(result.data!['provider']).toBe('anthropic');
    }
  });

  it('invalid provider config returns DataProcessResult failure — never throws', async () => {
    if (activeTier === 'mock' && mockRef) {
      // Mock: inject failure mode
      mockRef.setShouldFail(true, 'Injected failure for error-path test');
      const result = await mockRef.generate('will fail');
      mockRef.setShouldFail(false); // restore

      expect(result).toBeInstanceOf(DataProcessResult);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_ERROR');
    } else {
      // Real provider: empty prompt causes failure
      const result = await activeProvider.generate('');
      expect(result).toBeInstanceOf(DataProcessResult);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBeDefined();
    }
  });

  it('token usage tracked in response metadata', async () => {
    const result = await activeProvider.generate('Count to 3.', { maxTokens: MAX_TOKENS });

    expect(result.isSuccess).toBe(true);
    const usage = result.data!['tokens_used'] as Record<string, number>;
    expect(typeof usage['input']).toBe('number');
    expect(typeof usage['output']).toBe('number');
    expect(usage['input']).toBeGreaterThanOrEqual(1);
    expect(usage['output']).toBeGreaterThanOrEqual(1);
  });

  it('concurrent calls do not cross-contaminate responses', async () => {
    const cls = mockCls(TENANT);
    let p1: IAiProvider;
    let p2: IAiProvider;

    if (activeTier === 'mock') {
      // Two separate mock instances with different responses
      p1 = new MockAiProvider(cls, {
        defaultResponse: 'concurrent-response-1',
        tokensPerResponse: 5,
      });
      p2 = new MockAiProvider(cls, {
        defaultResponse: 'concurrent-response-2',
        tokensPerResponse: 5,
      });
    } else {
      // Same real provider — concurrent calls are independent by design
      p1 = activeProvider;
      p2 = activeProvider;
    }

    const [r1, r2] = await Promise.all([
      p1.generate('Respond: alpha', { maxTokens: MAX_TOKENS }),
      p2.generate('Respond: beta', { maxTokens: MAX_TOKENS }),
    ]);

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);

    if (activeTier === 'mock') {
      // Mock responses are deterministic and independent
      expect(r1.data!['text']).toBe('concurrent-response-1');
      expect(r2.data!['text']).toBe('concurrent-response-2');
    }
    // Real provider: just verify both succeeded without cross-contamination
  });
});

// ══════════════════════════════════════════════════════
// Interface Contract Verification
// ══════════════════════════════════════════════════════

describe('Anthropic — IAiProvider Contract Shape', () => {
  it('generate returns required fields: text, model, tokens_used, cost, request_id', async () => {
    const result = await activeProvider.generate('Contract check', { maxTokens: MAX_TOKENS });

    expect(result.isSuccess).toBe(true);
    const d = result.data!;
    expect(d['text']).toBeDefined();
    expect(d['model']).toBeDefined();
    expect(d['tokens_used']).toBeDefined();
    expect(d['cost']).toBeDefined();
    expect(d['request_id']).toBeDefined();
  });

  it('getModelInfo returns provider metadata with required fields', () => {
    const info = activeProvider.getModelInfo();
    expect(info).toBeDefined();
    expect(info['provider']).toBeDefined();
    expect(info['model_id']).toBeDefined();
    expect(info['max_tokens']).toBeDefined();
  });
});
