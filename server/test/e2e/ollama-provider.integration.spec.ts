/**
 * ollama-provider.integration.spec.ts — SESSION-6
 *
 * OllamaProvider integration tests against real Ollama Docker container.
 *
 * Availability detection:
 *   AVAIL.OLLAMA — Ollama server reachable at http://localhost:11434
 *   AVAIL.QWEN   — qwen2.5-coder:7b model is pulled and available
 *
 * If Ollama is not running: tests log SKIP and return early (never fail CI).
 * If qwen2.5-coder:7b not pulled: coding quality tests skip.
 *
 * Start: docker compose -f docker-compose.yml -f docker-compose.test.yml \
 *          --profile local-llm up -d
 *        bash scripts/pull-ollama-models.sh
 */

import 'reflect-metadata';
import { OllamaProvider } from '../../src/fabrics/ai-engine/ollama.provider';
import { IAiProvider } from '../../src/fabrics/interfaces/ai-provider.interface';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── Config ─────────────────────────────────────────────

const OLLAMA_URL = process.env['OLLAMA_BASE_URL'] ?? 'http://localhost:11434';
const MODEL = 'qwen2.5-coder:7b';
const TENANT_ID = 'ollama-integration-tenant';
const MAX_TOKENS = 200;
const OLLAMA_PROBE_TIMEOUT_MS = 1500;

// ── Helpers ────────────────────────────────────────────

function mockCls(tenantId: string = TENANT_ID): any {
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

async function fetchOllamaTags(): Promise<Response | null> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OLLAMA_PROBE_TIMEOUT_MS);
  try {
    return await fetch(`${OLLAMA_URL}/api/tags`, { signal: controller.signal });
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function pingOllama(): Promise<boolean> {
  const res = await fetchOllamaTags();
  if (!res) {
    return false;
  }
  return res.ok;
}

async function qwenModelAvailable(): Promise<boolean> {
  try {
    const res = await fetchOllamaTags();
    if (!res?.ok) return false;
    const data = (await res.json()) as { models?: Array<{ name: string }> };
    return (data.models ?? []).some((m) => m.name === MODEL || m.name.startsWith('qwen2.5-coder'));
  } catch {
    return false;
  }
}

let OLLAMA_UP = false;
let QWEN_UP = false;

beforeAll(async () => {
  OLLAMA_UP = await pingOllama();
  if (OLLAMA_UP) {
    QWEN_UP = await qwenModelAvailable();
    console.log(`Ollama: UP | qwen2.5-coder:7b: ${QWEN_UP ? 'AVAILABLE' : 'NOT PULLED'}`);
  } else {
    console.log(`Ollama: DOWN (${OLLAMA_URL}) — all tests will skip`);
  }
}, 10000);

function makeProvider(model = MODEL): OllamaProvider {
  return new OllamaProvider(mockCls(), {
    baseUrl: OLLAMA_URL,
    model,
    maxOutputTokens: MAX_TOKENS,
  });
}

// ══════════════════════════════════════════════════════
// Docker connectivity
// ══════════════════════════════════════════════════════

describe('OllamaProvider — Docker connectivity', () => {
  it('connects to Ollama on localhost:11434', async () => {
    if (!OLLAMA_UP) {
      console.log('SKIP: Ollama not running');
      return;
    }
    const provider = makeProvider();
    const result = await provider.healthCheck();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['status']).toBe('healthy');
  });

  it('lists available models via /api/tags', async () => {
    if (!OLLAMA_UP) {
      console.log('SKIP: Ollama not running');
      return;
    }
    const provider = makeProvider();
    const result = await provider.healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(Array.isArray(result.data!['available_models'])).toBe(true);
  });

  it('qwen2.5-coder:7b model is available after pull', async () => {
    if (!OLLAMA_UP) {
      console.log('SKIP: Ollama not running');
      return;
    }
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not pulled — run scripts/pull-ollama-models.sh');
      return;
    }
    const provider = makeProvider();
    const result = await provider.healthCheck();
    expect(result.isSuccess).toBe(true);
    expect(result.data!['model_available']).toBe(true);
  });
});

// ══════════════════════════════════════════════════════
// Generation via IAiProvider
// ══════════════════════════════════════════════════════

describe('OllamaProvider — generation via IAiProvider', () => {
  it('generate() returns DataProcessResult success', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('Return exactly: ok', { maxTokens: MAX_TOKENS });
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(typeof result.data!['text']).toBe('string');
    expect((result.data!['text'] as string).length).toBeGreaterThan(0);
  }, 30000);

  it('response contains generated text (non-empty)', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('Say hello in one word.', { maxTokens: MAX_TOKENS });
    expect(result.isSuccess).toBe(true);
    expect((result.data!['text'] as string).length).toBeGreaterThan(0);
  }, 30000);

  it('token usage tracked (eval_count from Ollama)', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('Count to 5.', { maxTokens: MAX_TOKENS });
    expect(result.isSuccess).toBe(true);
    const usage = result.data!['tokens_used'] as Record<string, number>;
    expect(typeof usage['output']).toBe('number');
    expect(usage['output']).toBeGreaterThan(0);
  }, 30000);

  it(`maxOutputTokens=${MAX_TOKENS} respected (num_predict)`, async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('Write a very long story.', { maxTokens: MAX_TOKENS });
    expect(result.isSuccess).toBe(true);
    const usage = result.data!['tokens_used'] as Record<string, number>;
    expect(usage['output']).toBeLessThanOrEqual(MAX_TOKENS + 10); // small tolerance for model overrun
  }, 30000);

  it('tenantId appears in result metadata', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('Tenant test', { maxTokens: MAX_TOKENS });
    expect(result.isSuccess).toBe(true);
    expect(result.data!['tenant_id']).toBe(TENANT_ID);
  }, 30000);

  it('latency_ms tracked in result', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('Say hi.', { maxTokens: MAX_TOKENS });
    expect(result.isSuccess).toBe(true);
    expect(typeof result.data!['latency_ms']).toBe('number');
    expect(result.data!['latency_ms'] as number).toBeGreaterThan(0);
  }, 30000);
});

// ══════════════════════════════════════════════════════
// TypeScript coding quality
// ══════════════════════════════════════════════════════

describe('OllamaProvider — TypeScript coding quality', () => {
  it('generates valid TypeScript for simple function', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate(
      'Write a TypeScript function that adds two numbers. Return only the function, no explanation.',
      { maxTokens: MAX_TOKENS },
    );
    expect(result.isSuccess).toBe(true);
    const text = result.data!['text'] as string;
    // Should contain TypeScript keywords
    expect(text.toLowerCase()).toMatch(/function|const|=>/);
  }, 30000);

  it('generates NestJS-style service skeleton', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate(
      'Write a minimal NestJS service class skeleton with @Injectable() decorator. TypeScript only.',
      { maxTokens: MAX_TOKENS },
    );
    expect(result.isSuccess).toBe(true);
    // Quality check — not a strict assertion, just verify it generated code
    const text = result.data!['text'] as string;
    expect(text.length).toBeGreaterThan(20);
  }, 30000);

  it('generates React component skeleton', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate(
      'Write a minimal React functional component in TypeScript. One component only.',
      { maxTokens: MAX_TOKENS },
    );
    expect(result.isSuccess).toBe(true);
    const text = result.data!['text'] as string;
    expect(text.length).toBeGreaterThan(20);
  }, 30000);
});

// ══════════════════════════════════════════════════════
// Error handling
// ══════════════════════════════════════════════════════

describe('OllamaProvider — error handling', () => {
  it('nonexistent model returns DataProcessResult failure', async () => {
    if (!OLLAMA_UP) {
      console.log('SKIP: Ollama not running');
      return;
    }
    const provider = makeProvider('nonexistent-model:latest');
    const result = await provider.generate('Test');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBeDefined();
  }, 15000);

  it('Ollama down returns DataProcessResult failure — never throws', async () => {
    // Always runs — uses a deliberately bad URL
    const provider = new OllamaProvider(mockCls(), {
      baseUrl: 'http://localhost:19999',
      model: MODEL,
      requestTimeoutMs: 500,
    });
    const result = await provider.generate('Test unreachable');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PROVIDER_ERROR');
  });

  it('empty prompt returns DataProcessResult failure', async () => {
    if (!OLLAMA_UP) {
      console.log('SKIP: Ollama not running');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('');
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_PROMPT');
  });
});

// ══════════════════════════════════════════════════════
// IAiProvider contract shape
// ══════════════════════════════════════════════════════

describe('OllamaProvider — IAiProvider contract shape', () => {
  it('implements IAiProvider abstract class', () => {
    const provider = makeProvider();
    expect(provider).toBeInstanceOf(IAiProvider);
  });

  it('getModelInfo returns required fields', () => {
    const provider = makeProvider();
    const info = provider.getModelInfo();
    expect(info['provider']).toBe('ollama');
    expect(info['model_id']).toBeDefined();
    expect(info['max_tokens']).toBeDefined();
    expect(info['cost_per_input_token']).toBe(0);
    expect(info['cost_per_output_token']).toBe(0);
  });

  it('cost_usd is always 0 — local inference is free', async () => {
    if (!QWEN_UP) {
      console.log('SKIP: qwen2.5-coder:7b not available');
      return;
    }
    const provider = makeProvider();
    const result = await provider.generate('Quick test.', { maxTokens: 50 });
    expect(result.isSuccess).toBe(true);
    expect(result.data!['cost']).toBe(0);
    expect(result.data!['cost_usd']).toBe(0);
  }, 30000);
});
