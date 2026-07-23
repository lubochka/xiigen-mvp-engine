/**
 * ollama.provider.spec.ts
 *
 * Unit tests for OllamaProvider — mocked HTTP, no real Ollama required.
 * Verifies IAiProvider contract compliance and Ollama-specific behaviour.
 */

import 'reflect-metadata';
import { OllamaProvider } from './ollama.provider';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../kernel';

// ── Helpers ────────────────────────────────────────────

const TENANT_ID = 'ollama-unit-tenant';

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

function makeOllama(config?: { baseUrl?: string; model?: string; maxOutputTokens?: number }) {
  return new OllamaProvider(mockCls(), config);
}

function makeOllamaChatResponse(text: string, model = 'qwen2.5-coder:7b') {
  return {
    model,
    message: { role: 'assistant', content: text },
    done: true,
    eval_count: 42,
    prompt_eval_count: 15,
    total_duration: 1_200_000_000,
  };
}

// ── Tests ─────────────────────────────────────────────

describe('OllamaProvider — IAiProvider interface compliance', () => {
  it('implements IAiProvider interface', () => {
    const provider = makeOllama();
    expect(provider).toBeInstanceOf(IAiProvider);
    expect(typeof provider.generate).toBe('function');
    expect(typeof provider.generateStructured).toBe('function');
    expect(typeof provider.getModelInfo).toBe('function');
  });
});

describe('OllamaProvider — generate() via /api/chat', () => {
  let fetchSpy: jest.SpyInstance;

  beforeEach(() => {
    fetchSpy = jest.spyOn(global, 'fetch' as any);
  });

  afterEach(() => {
    fetchSpy.mockRestore();
  });

  it('calls /api/chat with correct messages body', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => makeOllamaChatResponse('hello world'),
    } as any);

    const provider = makeOllama({ baseUrl: 'http://localhost:11434', model: 'qwen2.5-coder:7b' });
    await provider.generate('Say hello');

    expect(fetchSpy).toHaveBeenCalledTimes(1);
    const [url, init] = fetchSpy.mock.calls[0] as [string, RequestInit];
    expect(url).toBe('http://localhost:11434/api/chat');
    expect(init.method).toBe('POST');

    const bodyParsed = JSON.parse(init.body as string);
    expect(bodyParsed.model).toBe('qwen2.5-coder:7b');
    expect(bodyParsed.messages).toEqual([{ role: 'user', content: 'Say hello' }]);
    expect(bodyParsed.stream).toBe(false);
  });

  it('wraps response in DataProcessResult success', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => makeOllamaChatResponse('generated response text'),
    } as any);

    const provider = makeOllama();
    const result = await provider.generate('Test prompt');

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBe('generated response text');
    expect(result.data!['provider']).toBe('ollama');
    expect(result.data!['cost']).toBe(0);
    expect(result.data!['cost_usd']).toBe(0);
  });

  it('healthCheck returns false when Ollama unreachable', async () => {
    fetchSpy.mockRejectedValueOnce(new Error('ECONNREFUSED'));

    const provider = makeOllama({ baseUrl: 'http://localhost:19999' });
    const result = await provider.healthCheck();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('UNHEALTHY');
  });

  it('tenantId appears in result metadata', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => makeOllamaChatResponse('response'),
    } as any);

    const provider = makeOllama();
    const result = await provider.generate('Tenant test');

    expect(result.isSuccess).toBe(true);
    expect(result.data!['tenant_id']).toBe(TENANT_ID);
  });

  it('maxOutputTokens passed as num_predict in options', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: true,
      json: async () => makeOllamaChatResponse('short response'),
    } as any);

    const provider = makeOllama({ maxOutputTokens: 200 });
    await provider.generate('Short prompt', { maxTokens: 200 });

    const bodyParsed = JSON.parse(fetchSpy.mock.calls[0][1].body as string);
    expect(bodyParsed.options.num_predict).toBe(200);
  });

  it('nonexistent model returns DataProcessResult failure with MODEL_NOT_FOUND', async () => {
    fetchSpy.mockResolvedValueOnce({
      ok: false,
      status: 404,
      text: async () => 'model "nonexistent:latest" not found',
    } as any);

    const provider = makeOllama({ model: 'nonexistent:latest' });
    const result = await provider.generate('Test');

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MODEL_NOT_FOUND');
  });
});

describe('OllamaProvider — getModelInfo()', () => {
  it('returns required IAiProvider metadata fields', () => {
    const provider = makeOllama({ model: 'qwen2.5-coder:7b' });
    const info = provider.getModelInfo();

    expect(info['provider']).toBe('ollama');
    expect(info['model_id']).toBeDefined();
    expect(info['max_tokens']).toBeDefined();
    expect(info['cost_per_input_token']).toBe(0);
    expect(info['cost_per_output_token']).toBe(0);
  });
});
