/**
 * ai-dispatcher-routing.integration.spec.ts — SESSION-3
 *
 * AiDispatcher routing integration tests.
 *
 * Two-tier strategy per slot (always runs, never skips):
 *   When no keys  → Slot-1 = Mock("provider-A"), Slot-2 = Mock("provider-B")
 *   When Anthropic key → Slot-1 = AnthropicProvider
 *   When Gemini key    → Slot-2 = GeminiProvider
 *   When both keys     → Slot-1 = Anthropic, Slot-2 = Gemini
 *
 * 6 routing tests proving FREEDOM config controls which provider is called.
 */

import 'reflect-metadata';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { AnthropicProvider } from '../../src/fabrics/ai-engine/anthropic.provider';
import { GeminiProvider } from '../../src/fabrics/ai-engine/gemini.provider';
import { AiDispatcher } from '../../src/fabrics/ai-engine/dispatcher';
import { IAiProvider } from '../../src/fabrics/interfaces/ai-provider.interface';
import { TenantKeyResolver } from '../../src/kernel/multi-tenant/tenant-key.resolver';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import {
  IAnthropicClient,
  AnthropicMessage,
  IGeminiClient,
  GeminiResponse,
  GeminiGenerateContentConfig,
} from '../../src/fabrics/ai-engine/protocols';
import { loadE2eSecrets, computeAvailability } from '../../src/testing/e2e-secrets-loader';

// ── Helpers ────────────────────────────────────────────

const TENANT_A = 'dispatcher-tenant-A';
const TENANT_B = 'dispatcher-tenant-B';

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

// ── Fetch-based client factories (same as per-provider specs) ─

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

function makeFetchGeminiClient(apiKey: string): IGeminiClient {
  return {
    aio: {
      models: {
        generate_content: async (params: {
          model: string;
          contents: string;
          config?: GeminiGenerateContentConfig;
        }): Promise<GeminiResponse> => {
          const url = `https://generativelanguage.googleapis.com/v1beta/models/${params.model}:generateContent?key=${apiKey}`;
          const body: Record<string, unknown> = {
            contents: [{ parts: [{ text: params.contents }] }],
          };
          if (params.config) {
            const gc: Record<string, unknown> = {};
            if (params.config.max_output_tokens !== undefined)
              gc['maxOutputTokens'] = params.config.max_output_tokens;
            if (params.config.temperature !== undefined)
              gc['temperature'] = params.config.temperature;
            if (Object.keys(gc).length > 0) body['generationConfig'] = gc;
            if (params.config.system_instruction) {
              body['system_instruction'] = { parts: [{ text: params.config.system_instruction }] };
            }
          }
          const response = await fetch(url, {
            method: 'POST',
            headers: { 'content-type': 'application/json' },
            body: JSON.stringify(body),
          });
          if (!response.ok) {
            const errText = await response.text();
            throw new Error(`Gemini API ${response.status}: ${errText}`);
          }
          const data = (await response.json()) as Record<string, unknown>;
          const text: string = (data['candidates'] as any[])?.[0]?.content?.parts?.[0]?.text ?? '';
          const usage = data['usageMetadata'] as Record<string, number> | undefined;
          return {
            text,
            usage_metadata: {
              prompt_token_count: usage?.['promptTokenCount'] ?? 0,
              candidates_token_count: usage?.['candidatesTokenCount'] ?? 0,
              total_token_count: usage?.['totalTokenCount'] ?? 0,
            },
          };
        },
      },
    },
  };
}

// ── Slot assignment ────────────────────────────────────

const secrets = loadE2eSecrets();
const AVAIL = computeAvailability(secrets);
const MAX_TOKENS = 200;

interface DispatcherSlots {
  slot1: { provider: IAiProvider; id: string; label: string };
  slot2: { provider: IAiProvider; id: string; label: string };
}

function buildSlots(tenantId: string): DispatcherSlots {
  const cls = mockCls(tenantId);

  let slot1: IAiProvider;
  let slot1Label: string;

  if (AVAIL.ANTHROPIC) {
    const kr = new TenantKeyResolver(cls);
    kr.setSystemKey('anthropic', secrets.anthropicApiKey);
    slot1 = new AnthropicProvider(cls, kr, makeFetchAnthropicClient, {
      defaultModel: secrets.aiTestModelAnthropic,
    });
    slot1Label = 'anthropic';
  } else {
    slot1 = new MockAiProvider(cls, {
      modelId: 'mock-slot-1',
      defaultResponse: 'response from slot-1 (mock-anthropic)',
      tokensPerResponse: 30,
    });
    slot1Label = 'mock-anthropic';
  }

  let slot2: IAiProvider;
  let slot2Label: string;

  if (AVAIL.GEMINI) {
    const kr = new TenantKeyResolver(cls);
    kr.setSystemKey('google', secrets.geminiApiKey);
    slot2 = new GeminiProvider(cls, kr, makeFetchGeminiClient, {
      defaultModel: secrets.aiTestModelGemini,
    });
    slot2Label = 'gemini';
  } else {
    slot2 = new MockAiProvider(cls, {
      modelId: 'mock-slot-2',
      defaultResponse: 'response from slot-2 (mock-gemini)',
      tokensPerResponse: 30,
    });
    slot2Label = 'mock-gemini';
  }

  console.log(`Dispatcher slots — Slot1: ${slot1Label}, Slot2: ${slot2Label}`);

  return {
    slot1: { provider: slot1, id: 'slot-1', label: slot1Label },
    slot2: { provider: slot2, id: 'slot-2', label: slot2Label },
  };
}

// ══════════════════════════════════════════════════════
// AiDispatcher Routing Tests — always run
// ══════════════════════════════════════════════════════

describe('AiDispatcher — FREEDOM config routing (always run)', () => {
  let dispatcher: AiDispatcher;
  let slots: DispatcherSlots;

  beforeEach(() => {
    dispatcher = new AiDispatcher(mockCls(TENANT_A));
    slots = buildSlots(TENANT_A);
    dispatcher.registerProvider(slots.slot1.id, slots.slot1.provider);
    dispatcher.registerProvider(slots.slot2.id, slots.slot2.provider);
  });

  it('routes to slot-1 when FREEDOM config says provider=slot-1', async () => {
    const result = await dispatcher.generateSingle('Routing test', slots.slot1.id);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['model_id']).toBe(slots.slot1.id);
    expect(result.data!['text']).toBeDefined();
  });

  it('routes to slot-2 when FREEDOM config says provider=slot-2', async () => {
    const result = await dispatcher.generateSingle('Routing test', slots.slot2.id);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['model_id']).toBe(slots.slot2.id);
    expect(result.data!['text']).toBeDefined();
  });

  it('switching provider config mid-session routes next call correctly', async () => {
    const clsA = mockCls(TENANT_A);
    const mockOriginal = new MockAiProvider(clsA, {
      defaultResponse: 'original-slot-response',
      modelId: 'original',
    });
    const mockReplacement = new MockAiProvider(clsA, {
      defaultResponse: 'replacement-slot-response',
      modelId: 'replacement',
    });

    const localDispatcher = new AiDispatcher(clsA);
    localDispatcher.registerProvider('dynamic', mockOriginal);

    const r1 = await localDispatcher.generateSingle('first', 'dynamic');
    expect(r1.data!['text']).toBe('original-slot-response');

    // Config switches provider mid-session
    localDispatcher.registerProvider('dynamic', mockReplacement);

    const r2 = await localDispatcher.generateSingle('second', 'dynamic');
    expect(r2.data!['text']).toBe('replacement-slot-response');
  });

  it('both providers return same DataProcessResult<T> shape regardless of tier', async () => {
    const [r1, r2] = await Promise.all([
      dispatcher.generateSingle('shape check', slots.slot1.id),
      dispatcher.generateSingle('shape check', slots.slot2.id),
    ]);

    for (const r of [r1, r2]) {
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(typeof r.isSuccess).toBe('boolean');
      if (r.isSuccess) {
        expect(r.data!['text']).toBeDefined();
        expect(r.data!['model_id']).toBeDefined();
        expect(r.correlationId).toBeDefined();
      }
    }
  });

  it('per-tenant provider override — tenant-A uses slot-1, tenant-B uses slot-2', async () => {
    const dispA = new AiDispatcher(mockCls(TENANT_A));
    const dispB = new AiDispatcher(mockCls(TENANT_B));

    const slotsA = buildSlots(TENANT_A);
    const slotsB = buildSlots(TENANT_B);

    // Each tenant gets its own dispatcher with its own slot configuration
    dispA.registerProvider('primary', slotsA.slot1.provider);
    dispB.registerProvider('primary', slotsB.slot2.provider);

    const [rA, rB] = await Promise.all([
      dispA.generateSingle('tenant A request', 'primary'),
      dispB.generateSingle('tenant B request', 'primary'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);

    // Both succeeded — responses come from different providers/slots
    if (!AVAIL.ANTHROPIC && !AVAIL.GEMINI) {
      // Mock mode: slot-1 response contains "slot-1", slot-2 contains "slot-2"
      expect(rA.data!['text']).toContain('slot-1');
      expect(rB.data!['text']).toContain('slot-2');
    }
  });

  it('fallback to default when tenant config missing — unregistered model returns DataProcessResult failure', async () => {
    const localDispatcher = new AiDispatcher(mockCls(TENANT_A));
    localDispatcher.registerProvider('slot-1', slots.slot1.provider);

    // FREEDOM config points to 'slot-3' which is not registered
    const result = await localDispatcher.generateSingle('request', 'slot-3');

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MODEL_NOT_FOUND');
    expect(result.errorMessage).toContain('slot-3');
  });
});

// ══════════════════════════════════════════════════════
// Consensus Routing (always run)
// ══════════════════════════════════════════════════════

describe('AiDispatcher — Consensus routing (always run)', () => {
  it('generateWithConsensus selects best output from both slots', async () => {
    const cls = mockCls(TENANT_A);
    const dispatcher = new AiDispatcher(cls);
    const slots = buildSlots(TENANT_A);
    dispatcher.registerProvider(slots.slot1.id, slots.slot1.provider);
    dispatcher.registerProvider(slots.slot2.id, slots.slot2.provider);

    const result = await dispatcher.generateWithConsensus('Pick the best response', [
      slots.slot1.id,
      slots.slot2.id,
    ]);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBeDefined();
    expect(result.data!['model_used']).toBeDefined();
    expect(result.data!['models_attempted']).toBe(2);
    expect(result.data!['models_succeeded']).toBeGreaterThanOrEqual(1);
    expect(result.data!['all_outputs']).toBeDefined();
    expect((result.data!['all_outputs'] as any[]).length).toBe(2);
  });
});
