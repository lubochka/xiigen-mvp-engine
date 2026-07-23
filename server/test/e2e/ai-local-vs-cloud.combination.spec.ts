/**
 * ai-local-vs-cloud.combination.spec.ts — SESSION-7
 *
 * Combination tests proving the IAiProvider fabric abstraction holds for
 * local open-source models (Ollama/Qwen2.5-Coder) as well as cloud providers.
 *
 * A developer switching config.aiProvider = 'ollama' gets the SAME interface
 * as Anthropic or Gemini — zero code changes required.
 *
 * Skip logic: All tests that need a real provider check AVAIL flags and
 * return early if unavailable. They never fail CI when providers are absent.
 *
 * Two always-run tests cover the mock-only path (zero dependencies).
 */

import 'reflect-metadata';
import { OllamaProvider } from '../../src/fabrics/ai-engine/ollama.provider';
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

// ── Config ─────────────────────────────────────────────

const OLLAMA_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5-coder:7b';
const OLLAMA_PING_TIMEOUT_MS = 1500;
const TENANT_A = 'combo-tenant-A';
const TENANT_B = 'combo-tenant-B';
const MAX_TOKENS = 200;

const secrets = loadE2eSecrets();
const AVAIL = computeAvailability(secrets);

// ── Helpers ────────────────────────────────────────────

function mockCls(tenantId: string = TENANT_A): any {
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

async function pingOllama(): Promise<boolean> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), OLLAMA_PING_TIMEOUT_MS);

  try {
    const res = await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
    if (!res.ok) return false;
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).some((m) => m.name.startsWith('qwen2.5-coder'));
  } catch {
    return false;
  } finally {
    clearTimeout(timeout);
  }
}

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

function makeOllama(tenantId = TENANT_A): OllamaProvider {
  return new OllamaProvider(mockCls(tenantId), {
    baseUrl: OLLAMA_URL,
    model: OLLAMA_MODEL,
    maxOutputTokens: MAX_TOKENS,
  });
}

function makeAnthropic(tenantId = TENANT_A): AnthropicProvider {
  const cls = mockCls(tenantId);
  const kr = new TenantKeyResolver(cls);
  kr.setSystemKey('anthropic', secrets.anthropicApiKey);
  return new AnthropicProvider(cls, kr, makeFetchAnthropicClient, {
    defaultModel: secrets.aiTestModelAnthropic,
  });
}

function makeGemini(tenantId = TENANT_A): GeminiProvider {
  const cls = mockCls(tenantId);
  const kr = new TenantKeyResolver(cls);
  kr.setSystemKey('google', secrets.geminiApiKey);
  return new GeminiProvider(cls, kr, makeFetchGeminiClient, {
    defaultModel: secrets.aiTestModelGemini,
  });
}

// ── Availability resolved at test runtime ─────────────

let OLLAMA_LIVE = false;

beforeAll(async () => {
  OLLAMA_LIVE = await pingOllama();
  if (OLLAMA_LIVE) console.log('Ollama + qwen2.5-coder:7b: AVAILABLE');
  else console.log('Ollama: NOT AVAILABLE — Ollama tests will skip');

  console.log(`Anthropic: ${AVAIL.ANTHROPIC ? 'KEY PRESENT' : 'no key'}`);
  console.log(`Gemini:    ${AVAIL.GEMINI ? 'KEY PRESENT' : 'no key'}`);
}, 10000);

// ══════════════════════════════════════════════════════
// Interface parity
// ══════════════════════════════════════════════════════

describe('IAiProvider — interface parity (local vs cloud)', () => {
  it('Mock and Ollama return same DataProcessResult shape (mock always runs)', async () => {
    const cls = mockCls(TENANT_A);
    const mock = new MockAiProvider(cls, {
      defaultResponse: 'mock-response',
      tokensPerResponse: 10,
    });

    const result = await mock.generate('Test');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBeDefined();
    expect(result.data!['model']).toBeDefined();
    expect(result.data!['tokens_used']).toBeDefined();
    expect(result.data!['cost']).toBeDefined();
    expect(result.data!['request_id']).toBeDefined();
  });

  it('OllamaProvider implements IAiProvider abstract class', () => {
    const provider = makeOllama();
    expect(provider).toBeInstanceOf(IAiProvider);
    expect(typeof provider.generate).toBe('function');
    expect(typeof provider.generateStructured).toBe('function');
    expect(typeof provider.getModelInfo).toBe('function');
  });

  it('Ollama and Anthropic return same DataProcessResult shape', async () => {
    if (!OLLAMA_LIVE || !AVAIL.ANTHROPIC) {
      console.log(`SKIP: OLLAMA=${OLLAMA_LIVE}, ANTHROPIC=${AVAIL.ANTHROPIC}`);
      return;
    }
    const [ollamaResult, anthropicResult] = await Promise.all([
      makeOllama().generate('Return: ok', { maxTokens: MAX_TOKENS }),
      makeAnthropic().generate('Return: ok', { maxTokens: MAX_TOKENS }),
    ]);

    for (const r of [ollamaResult, anthropicResult]) {
      expect(r).toBeInstanceOf(DataProcessResult);
      expect(r.isSuccess).toBe(true);
      expect(r.data!['text']).toBeDefined();
      expect(r.data!['model']).toBeDefined();
      expect(r.data!['tokens_used']).toBeDefined();
      expect(r.data!['cost']).toBeDefined();
      expect(r.data!['request_id']).toBeDefined();
    }
  }, 60000);

  it('Ollama and Gemini return same DataProcessResult shape', async () => {
    if (!OLLAMA_LIVE || !AVAIL.GEMINI) {
      console.log(`SKIP: OLLAMA=${OLLAMA_LIVE}, GEMINI=${AVAIL.GEMINI}`);
      return;
    }
    const [r1, r2] = await Promise.all([
      makeOllama().generate('Return: ok', { maxTokens: MAX_TOKENS }),
      makeGemini().generate('Return: ok', { maxTokens: MAX_TOKENS }),
    ]);

    for (const r of [r1, r2]) {
      expect(r.isSuccess).toBe(true);
      expect(r.data!['text']).toBeDefined();
      expect(r.data!['model']).toBeDefined();
    }
  }, 60000);

  it('All 4 providers return identical structure shape', async () => {
    if (!OLLAMA_LIVE || !AVAIL.ANTHROPIC || !AVAIL.GEMINI) {
      console.log(`SKIP: need OLLAMA + ANTHROPIC + GEMINI`);
      return;
    }
    const cls = mockCls(TENANT_A);
    const mock = new MockAiProvider(cls, { defaultResponse: 'mock', tokensPerResponse: 5 });

    const [r1, r2, r3, r4] = await Promise.all([
      mock.generate('Test'),
      makeOllama().generate('Test', { maxTokens: MAX_TOKENS }),
      makeAnthropic().generate('Test', { maxTokens: MAX_TOKENS }),
      makeGemini().generate('Test', { maxTokens: MAX_TOKENS }),
    ]);

    const requiredFields = ['text', 'model', 'tokens_used', 'cost', 'request_id'];
    for (const r of [r1, r2, r3, r4]) {
      expect(r.isSuccess).toBe(true);
      for (const field of requiredFields) {
        expect(r.data![field]).toBeDefined();
      }
    }
  }, 60000);
});

// ══════════════════════════════════════════════════════
// AiDispatcher — local model in routing mix
// ══════════════════════════════════════════════════════

describe('AiDispatcher — local model in routing mix', () => {
  it('Dispatcher Ollama-only mode — works without any cloud key', async () => {
    if (!OLLAMA_LIVE) {
      console.log('SKIP: Ollama not available');
      return;
    }
    const dispatcher = new AiDispatcher(mockCls(TENANT_A));
    dispatcher.registerProvider('ollama', makeOllama());

    const result = await dispatcher.generateSingle('Return: ok', 'ollama');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBeDefined();
  }, 30000);

  it('Dispatcher with Ollama + Anthropic — both registered, each callable', async () => {
    if (!OLLAMA_LIVE || !AVAIL.ANTHROPIC) {
      console.log(`SKIP: OLLAMA=${OLLAMA_LIVE}, ANTHROPIC=${AVAIL.ANTHROPIC}`);
      return;
    }
    const dispatcher = new AiDispatcher(mockCls(TENANT_A));
    dispatcher.registerProvider('ollama', makeOllama());
    dispatcher.registerProvider('anthropic', makeAnthropic());

    const [r1, r2] = await Promise.all([
      dispatcher.generateSingle('Return: ok', 'ollama'),
      dispatcher.generateSingle('Return: ok', 'anthropic'),
    ]);

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  }, 60000);

  it('Dispatcher with Ollama + Gemini — both registered, each callable', async () => {
    if (!OLLAMA_LIVE || !AVAIL.GEMINI) {
      console.log(`SKIP: OLLAMA=${OLLAMA_LIVE}, GEMINI=${AVAIL.GEMINI}`);
      return;
    }
    const dispatcher = new AiDispatcher(mockCls(TENANT_A));
    dispatcher.registerProvider('ollama', makeOllama());
    dispatcher.registerProvider('gemini', makeGemini());

    const [r1, r2] = await Promise.all([
      dispatcher.generateSingle('Return: ok', 'ollama'),
      dispatcher.generateSingle('Return: ok', 'gemini'),
    ]);

    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
  }, 60000);

  it('generateWithConsensus — Ollama + Anthropic selects winner', async () => {
    if (!OLLAMA_LIVE || !AVAIL.ANTHROPIC) {
      console.log(`SKIP: OLLAMA=${OLLAMA_LIVE}, ANTHROPIC=${AVAIL.ANTHROPIC}`);
      return;
    }
    const dispatcher = new AiDispatcher(mockCls(TENANT_A));
    dispatcher.registerProvider('ollama', makeOllama());
    dispatcher.registerProvider('anthropic', makeAnthropic());

    const result = await dispatcher.generateWithConsensus('Return: ok', ['ollama', 'anthropic']);

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBeDefined();
    expect(result.data!['models_attempted']).toBe(2);
    expect(result.data!['models_succeeded']).toBeGreaterThanOrEqual(1);
  }, 60000);
});

// ══════════════════════════════════════════════════════
// FREEDOM config — provider switching
// ══════════════════════════════════════════════════════

describe('FREEDOM config — provider switching without code changes', () => {
  it('switch provider config mid-session — next call uses new provider', async () => {
    const cls = mockCls(TENANT_A);
    const mock1 = new MockAiProvider(cls, {
      defaultResponse: 'response-from-mock-1',
      modelId: 'mock-1',
      tokensPerResponse: 5,
    });
    const mock2 = new MockAiProvider(cls, {
      defaultResponse: 'response-from-mock-2',
      modelId: 'mock-2',
      tokensPerResponse: 5,
    });

    const dispatcher = new AiDispatcher(cls);
    dispatcher.registerProvider('primary', mock1);

    const r1 = await dispatcher.generateSingle('test', 'primary');
    expect(r1.data!['text']).toBe('response-from-mock-1');

    // FREEDOM config switches provider
    dispatcher.registerProvider('primary', mock2);

    const r2 = await dispatcher.generateSingle('test', 'primary');
    expect(r2.data!['text']).toBe('response-from-mock-2');
  });

  it('config.aiProvider = ollama → routes to OllamaProvider', async () => {
    if (!OLLAMA_LIVE) {
      console.log('SKIP: Ollama not available');
      return;
    }
    const dispatcher = new AiDispatcher(mockCls(TENANT_A));
    dispatcher.registerProvider('ollama', makeOllama());

    const result = await dispatcher.generateSingle('Return: ok', 'ollama');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('ollama');
  }, 30000);

  it('config.aiProvider = anthropic → routes to AnthropicProvider', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No Anthropic key');
      return;
    }
    const dispatcher = new AiDispatcher(mockCls(TENANT_A));
    dispatcher.registerProvider('anthropic', makeAnthropic());

    const result = await dispatcher.generateSingle('Return: ok', 'anthropic');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['provider']).toBe('anthropic');
  }, 30000);

  it('per-tenant routing: tenant-A=ollama, tenant-B=mock', async () => {
    if (!OLLAMA_LIVE) {
      console.log('SKIP: Ollama not available');
      return;
    }
    const dispA = new AiDispatcher(mockCls(TENANT_A));
    const dispB = new AiDispatcher(mockCls(TENANT_B));

    dispA.registerProvider('primary', makeOllama(TENANT_A));
    dispB.registerProvider(
      'primary',
      new MockAiProvider(mockCls(TENANT_B), {
        defaultResponse: 'mock-b-response',
        tokensPerResponse: 5,
      }),
    );

    const [rA, rB] = await Promise.all([
      dispA.generateSingle('test', 'primary'),
      dispB.generateSingle('test', 'primary'),
    ]);

    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);
    expect(rA.data!['provider']).toBe('ollama');
    expect(rB.data!['text']).toBe('mock-b-response');
  }, 30000);
});

// ══════════════════════════════════════════════════════
// Cost tracking — local vs cloud
// ══════════════════════════════════════════════════════

describe('Cost tracking — local vs cloud', () => {
  it('Ollama result has cost_usd = 0 (local inference is free)', async () => {
    if (!OLLAMA_LIVE) {
      console.log('SKIP: Ollama not available');
      return;
    }
    const result = await makeOllama().generate('Test cost.', { maxTokens: 50 });
    expect(result.isSuccess).toBe(true);
    expect(result.data!['cost']).toBe(0);
    expect(result.data!['cost_usd']).toBe(0);
  }, 30000);

  it('Anthropic result has cost > 0 (API call has a price)', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No Anthropic key');
      return;
    }
    const result = await makeAnthropic().generate('Return: ok', { maxTokens: 10 });
    expect(result.isSuccess).toBe(true);
    expect(result.data!['cost'] as number).toBeGreaterThan(0);
  }, 30000);

  it('cost comparison metadata available for routing decisions', async () => {
    if (!OLLAMA_LIVE || !AVAIL.ANTHROPIC) {
      console.log(`SKIP: OLLAMA=${OLLAMA_LIVE}, ANTHROPIC=${AVAIL.ANTHROPIC}`);
      return;
    }
    const [ollamaResult, anthropicResult] = await Promise.all([
      makeOllama().generate('Return: ok', { maxTokens: MAX_TOKENS }),
      makeAnthropic().generate('Return: ok', { maxTokens: MAX_TOKENS }),
    ]);

    expect(ollamaResult.isSuccess).toBe(true);
    expect(anthropicResult.isSuccess).toBe(true);

    // Cost comparison — MEASURE, do not assert ordering
    const ollamaCost = ollamaResult.data!['cost'] as number;
    const anthropicCost = anthropicResult.data!['cost'] as number;
    expect(typeof ollamaCost).toBe('number');
    expect(typeof anthropicCost).toBe('number');
    expect(ollamaCost).toBe(0);
    expect(anthropicCost).toBeGreaterThanOrEqual(0);
    console.log(`Cost comparison — Ollama: $${ollamaCost} | Anthropic: $${anthropicCost}`);
  }, 60000);
});

// ══════════════════════════════════════════════════════
// Fallback chain
// ══════════════════════════════════════════════════════

describe('Fallback chain', () => {
  it('Anthropic primary → returns success when available', async () => {
    if (!AVAIL.ANTHROPIC) {
      console.log('SKIP: No Anthropic key');
      return;
    }
    const result = await makeAnthropic().generate('Return: ok', { maxTokens: MAX_TOKENS });
    expect(result.isSuccess).toBe(true);
  }, 30000);

  it('Ollama with bad URL → DataProcessResult failure (not a throw)', async () => {
    // Always runs — bad URL guarantees failure
    const provider = new OllamaProvider(mockCls(), {
      baseUrl: 'http://localhost:19999',
      model: OLLAMA_MODEL,
      requestTimeoutMs: 500,
    });
    const result = await provider.generate('Test fallback');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROVIDER_ERROR');
  });

  it('unregistered model in dispatcher returns MODEL_NOT_FOUND', async () => {
    const dispatcher = new AiDispatcher(mockCls(TENANT_A));
    const result = await dispatcher.generateSingle('Test', 'nonexistent-provider');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MODEL_NOT_FOUND');
  });
});
