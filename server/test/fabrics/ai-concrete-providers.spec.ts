/**
 * P4.2 — Concrete AI Provider Tests.
 *
 * Tests AnthropicProvider, OpenAiProvider, GeminiProvider, GrokProvider.
 * Each uses mock protocol clients + mock TenantKeyResolver.
 * Shared pattern: generate, generateStructured, getModelInfo, healthCheck,
 * per-tenant key resolution, DNA-3/DNA-5 compliance.
 */

import {
  AnthropicProvider,
  AnthropicClientFactory,
} from '../../src/fabrics/ai-engine/anthropic.provider';
import { OpenAiProvider, OpenAiClientFactory } from '../../src/fabrics/ai-engine/openai.provider';
import { GeminiProvider, GeminiClientFactory } from '../../src/fabrics/ai-engine/gemini.provider';
import { GrokProvider, GrokClientFactory } from '../../src/fabrics/ai-engine/grok.provider';
import {
  IAnthropicClient,
  IOpenAiClient,
  IGeminiClient,
  IGrokClient,
} from '../../src/fabrics/ai-engine/protocols';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  DEFAULT_PLAN,
  TenantKeyResolver,
} from '../../src/kernel';

// ── Shared Helpers ───────────────────────────────────

const TENANT_ID = 'ai-test-tenant';

function mockCls(tenantId: string, apiKeys: Record<string, string> = {}) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys,
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

function makeKeyResolver(cls: any, systemKeys?: Record<string, string>): TenantKeyResolver {
  const resolver = new TenantKeyResolver(cls);
  if (systemKeys) resolver.setSystemKeys(systemKeys);
  return resolver;
}

// ── Mock SDK Clients ─────────────────────────────────

function mockAnthropicClient(): any {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        id: 'msg-ant-1',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        content: [{ type: 'text', text: 'Hello from Claude' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn',
      }),
    },
  };
}

function mockOpenAiClient(): any {
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          id: 'chatcmpl-1',
          model: 'gpt-5.2',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'Hello from GPT' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
        }),
      },
    },
  };
}

function mockGeminiClient(): any {
  return {
    aio: {
      models: {
        generate_content: jest.fn().mockResolvedValue({
          text: 'Hello from Gemini',
          usage_metadata: {
            prompt_token_count: 10,
            candidates_token_count: 20,
            total_token_count: 30,
          },
        }),
      },
    },
  };
}

function mockGrokClient(): any {
  const mockChat = {
    append: jest.fn(),
    sample: jest.fn().mockResolvedValue({
      content: 'Hello from Grok',
      id: 'grok-1',
      usage: { prompt_tokens: 10, completion_tokens: 20 },
    }),
  };
  return {
    chat: {
      create: jest.fn().mockReturnValue(mockChat),
    },
  } as any;
}

// ── Anthropic Provider Tests ─────────────────────────

describe('AnthropicProvider', () => {
  let client: any;
  let provider: AnthropicProvider;
  const cls = mockCls(TENANT_ID, { anthropic: 'sk-ant-tenant' });
  const keyResolver = makeKeyResolver(cls);

  beforeEach(() => {
    client = mockAnthropicClient();
    const factory: AnthropicClientFactory = () => client;
    provider = new AnthropicProvider(cls, keyResolver, factory);
  });

  describe('generate', () => {
    it('should generate text and return tokens + cost', async () => {
      const r = await provider.generate('Write code');
      expect(r.isSuccess).toBe(true);
      expect(r.data!['text']).toBe('Hello from Claude');
      expect(r.data!['model']).toBe('claude-sonnet-4-5');
      expect((r.data!['tokens_used'] as any).input).toBe(10);
      expect((r.data!['tokens_used'] as any).output).toBe(20);
      expect(r.data!['cost']).toBeGreaterThan(0);
      expect(r.data!['provider']).toBe('anthropic');
    });

    it('should pass system prompt', async () => {
      await provider.generate('test', { systemPrompt: 'You are a coder' });
      expect(client.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ system: 'You are a coder' }),
      );
    });

    it('should pass custom model', async () => {
      await provider.generate('test', { model: 'claude-opus-4-5' });
      expect(client.messages.create).toHaveBeenCalledWith(
        expect.objectContaining({ model: 'claude-opus-4-5' }),
      );
    });

    it('should fail with missing prompt', async () => {
      const r = await provider.generate('');
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('MISSING_PROMPT');
    });

    it('should fail when SDK throws (DNA-3)', async () => {
      client.messages.create.mockRejectedValue(new Error('Rate limited'));
      const r = await provider.generate('test');
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('PROVIDER_ERROR');
      expect(r.errorMessage).toContain('Rate limited');
    });
  });

  describe('generateStructured', () => {
    it('should parse JSON from response', async () => {
      client.messages.create.mockResolvedValue({
        id: 'msg-2',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        content: [{ type: 'text', text: '{"result": "success"}' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn',
      });
      const r = await provider.generateStructured('test', { type: 'object' });
      expect(r.isSuccess).toBe(true);
      expect((r.data!['data'] as any).result).toBe('success');
    });

    it('should strip markdown fences', async () => {
      client.messages.create.mockResolvedValue({
        id: 'msg-3',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        content: [{ type: 'text', text: '```json\n{"x": 1}\n```' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn',
      });
      const r = await provider.generateStructured('test', { type: 'object' });
      expect(r.isSuccess).toBe(true);
      expect((r.data!['data'] as any).x).toBe(1);
    });

    it('should fail on invalid JSON', async () => {
      client.messages.create.mockResolvedValue({
        id: 'msg-4',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        content: [{ type: 'text', text: 'not json at all' }],
        usage: { input_tokens: 10, output_tokens: 20 },
        stop_reason: 'end_turn',
      });
      const r = await provider.generateStructured('test', { type: 'object' });
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('PARSE_ERROR');
    });

    it('should fail with invalid schema', async () => {
      const r = await provider.generateStructured('test', null as any);
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('INVALID_SCHEMA');
    });
  });

  describe('per-tenant key resolution', () => {
    it('should fail when tenant has no API key', async () => {
      const noKeyCls = mockCls(TENANT_ID, {}); // no anthropic key
      const noKeyResolver = makeKeyResolver(noKeyCls);
      const noKeyProvider = new AnthropicProvider(noKeyCls, noKeyResolver, () => client);
      const r = await noKeyProvider.generate('test');
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('NO_API_KEY');
    });

    it('should use system fallback key when tenant has none', async () => {
      const noKeyCls = mockCls(TENANT_ID, {});
      const fallbackResolver = makeKeyResolver(noKeyCls, { anthropic: 'sk-system-fallback' });
      const fbProvider = new AnthropicProvider(noKeyCls, fallbackResolver, () => client);
      const r = await fbProvider.generate('test');
      expect(r.isSuccess).toBe(true); // Uses system key
    });
  });

  describe('DNA-5: no tenant', () => {
    it('should fail without tenant context', async () => {
      const noTenantProvider = new AnthropicProvider(
        mockClsEmpty(),
        makeKeyResolver(mockClsEmpty()),
        () => client,
      );
      const r = await noTenantProvider.generate('test');
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('NO_TENANT');
    });
  });

  describe('getModelInfo', () => {
    it('should return model metadata', () => {
      const info = provider.getModelInfo();
      expect(info['provider']).toBe('anthropic');
      expect(info['model_id']).toBe('claude-sonnet-4-5');
    });
  });

  describe('healthCheck', () => {
    it('should return healthy on success', async () => {
      const r = await provider.healthCheck();
      expect(r.isSuccess).toBe(true);
      expect(r.data!['provider']).toBe('anthropic');
    });

    it('should fail when SDK throws', async () => {
      client.messages.create.mockRejectedValue(new Error('Connection refused'));
      const r = await provider.healthCheck();
      expect(r.isSuccess).toBe(false);
      expect(r.errorCode).toBe('UNHEALTHY');
    });
  });
});

// ── OpenAI Provider Tests ────────────────────────────

describe('OpenAiProvider', () => {
  let client: any;
  let provider: OpenAiProvider;
  const cls = mockCls(TENANT_ID, { openai: 'sk-oai-tenant' });
  const keyResolver = makeKeyResolver(cls);

  beforeEach(() => {
    client = mockOpenAiClient();
    const factory: OpenAiClientFactory = () => client;
    provider = new OpenAiProvider(cls, keyResolver, factory);
  });

  it('should generate text', async () => {
    const r = await provider.generate('Write code');
    expect(r.isSuccess).toBe(true);
    expect(r.data!['text']).toBe('Hello from GPT');
    expect(r.data!['model']).toBe('gpt-5.2');
    expect(r.data!['provider']).toBe('openai');
  });

  it('should pass system prompt as first message', async () => {
    await provider.generate('test', { systemPrompt: 'Be concise' });
    const msgs = client.chat.completions.create.mock.calls[0][0].messages;
    expect(msgs[0]).toEqual({ role: 'system', content: 'Be concise' });
    expect(msgs[1]).toEqual({ role: 'user', content: 'test' });
  });

  it('should handle structured output with markdown fence', async () => {
    client.chat.completions.create.mockResolvedValue({
      id: 'c-2',
      model: 'gpt-5.2',
      choices: [
        {
          index: 0,
          message: { role: 'assistant', content: '```json\n{"ok":true}\n```' },
          finish_reason: 'stop',
        },
      ],
      usage: { prompt_tokens: 10, completion_tokens: 20, total_tokens: 30 },
    });
    const r = await provider.generateStructured('test', { type: 'object' });
    expect(r.isSuccess).toBe(true);
    expect((r.data!['data'] as any).ok).toBe(true);
  });

  it('should fail with no API key', async () => {
    const noKeyCls = mockCls(TENANT_ID, {});
    const p = new OpenAiProvider(noKeyCls, makeKeyResolver(noKeyCls), () => client);
    const r = await p.generate('test');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('NO_API_KEY');
  });

  it('should fail without tenant (DNA-5)', async () => {
    const p = new OpenAiProvider(mockClsEmpty(), makeKeyResolver(mockClsEmpty()), () => client);
    expect((await p.generate('test')).errorCode).toBe('NO_TENANT');
  });

  it('should handle SDK error (DNA-3)', async () => {
    client.chat.completions.create.mockRejectedValue(new Error('Quota exceeded'));
    const r = await provider.generate('test');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('PROVIDER_ERROR');
  });

  it('healthCheck should succeed', async () => {
    expect((await provider.healthCheck()).isSuccess).toBe(true);
  });

  it('getModelInfo should return GPT metadata', () => {
    expect(provider.getModelInfo()['model_id']).toBe('gpt-5');
  });
});

// ── Gemini Provider Tests ────────────────────────────

describe('GeminiProvider', () => {
  let client: any;
  let provider: GeminiProvider;
  const cls = mockCls(TENANT_ID, { google: 'AIza-tenant-key' });
  const keyResolver = makeKeyResolver(cls);

  beforeEach(() => {
    client = mockGeminiClient();
    const factory: GeminiClientFactory = () => client;
    provider = new GeminiProvider(cls, keyResolver, factory);
  });

  it('should generate text', async () => {
    const r = await provider.generate('Write code');
    expect(r.isSuccess).toBe(true);
    expect(r.data!['text']).toBe('Hello from Gemini');
    expect(r.data!['model']).toBe('gemini-2.5-pro');
    expect(r.data!['provider']).toBe('google');
  });

  it('should pass system prompt via config.system_instruction', async () => {
    await provider.generate('test', { systemPrompt: 'Be creative' });
    const call = client.aio.models.generate_content.mock.calls[0][0];
    expect(call.config?.system_instruction).toBe('Be creative');
  });

  it('should handle structured output', async () => {
    client.aio.models.generate_content.mockResolvedValue({
      text: '{"items": [1,2,3]}',
      usage_metadata: { prompt_token_count: 5, candidates_token_count: 10, total_token_count: 15 },
    });
    const r = await provider.generateStructured('test', { type: 'object' });
    expect(r.isSuccess).toBe(true);
    expect((r.data!['data'] as any).items).toEqual([1, 2, 3]);
  });

  it('should fail with no API key', async () => {
    const noKeyCls = mockCls(TENANT_ID, {});
    const p = new GeminiProvider(noKeyCls, makeKeyResolver(noKeyCls), () => client);
    expect((await p.generate('test')).errorCode).toBe('NO_API_KEY');
  });

  it('should fail without tenant (DNA-5)', async () => {
    const p = new GeminiProvider(mockClsEmpty(), makeKeyResolver(mockClsEmpty()), () => client);
    expect((await p.generate('test')).errorCode).toBe('NO_TENANT');
  });

  it('should handle SDK error (DNA-3)', async () => {
    client.aio.models.generate_content.mockRejectedValue(new Error('Quota'));
    expect((await provider.generate('test')).errorCode).toBe('PROVIDER_ERROR');
  });

  it('healthCheck should succeed', async () => {
    expect((await provider.healthCheck()).isSuccess).toBe(true);
  });

  it('getModelInfo should return Gemini metadata', () => {
    expect(provider.getModelInfo()['model_id']).toBe('gemini-2.5-pro');
    expect(provider.getModelInfo()['context_window']).toBe(1_000_000);
  });
});

// ── Grok Provider Tests ──────────────────────────────

describe('GrokProvider', () => {
  let client: any;
  let mockChat: any;
  let provider: GrokProvider;
  const cls = mockCls(TENANT_ID, { grok: 'xai-tenant-key' });
  const keyResolver = makeKeyResolver(cls);

  beforeEach(() => {
    mockChat = {
      append: jest.fn(),
      sample: jest.fn().mockResolvedValue({
        content: 'Hello from Grok',
        id: 'grok-resp-1',
        usage: { prompt_tokens: 10, completion_tokens: 20 },
      }),
    };
    client = { chat: { create: jest.fn().mockReturnValue(mockChat) } } as any;
    const factory: GrokClientFactory = () => client;
    provider = new GrokProvider(cls, keyResolver, factory);
  });

  it('should generate text using chat.create → append → sample', async () => {
    const r = await provider.generate('Write code');
    expect(r.isSuccess).toBe(true);
    expect(r.data!['text']).toBe('Hello from Grok');
    expect(r.data!['provider']).toBe('grok');

    // Verify chat API pattern
    expect(client.chat.create).toHaveBeenCalledWith(expect.objectContaining({ model: 'grok-4' }));
    expect(mockChat.append).toHaveBeenCalledWith(
      expect.objectContaining({ role: 'user', content: 'Write code' }),
    );
    expect(mockChat.sample).toHaveBeenCalled();
  });

  it('should append system message before user message', async () => {
    await provider.generate('test', { systemPrompt: 'Be helpful' });
    const calls = mockChat.append.mock.calls;
    expect(calls[0][0]).toEqual({ role: 'system', content: 'Be helpful' });
    expect(calls[1][0]).toEqual({ role: 'user', content: 'test' });
  });

  it('should handle structured output', async () => {
    mockChat.sample.mockResolvedValue({
      content: '{"status":"ok"}',
      id: 'g-2',
      usage: { prompt_tokens: 5, completion_tokens: 10 },
    });
    const r = await provider.generateStructured('test', { type: 'object' });
    expect(r.isSuccess).toBe(true);
    expect((r.data!['data'] as any).status).toBe('ok');
  });

  it('should fail with no API key', async () => {
    const noKeyCls = mockCls(TENANT_ID, {});
    const p = new GrokProvider(noKeyCls, makeKeyResolver(noKeyCls), () => client);
    expect((await p.generate('test')).errorCode).toBe('NO_API_KEY');
  });

  it('should fail without tenant (DNA-5)', async () => {
    const p = new GrokProvider(mockClsEmpty(), makeKeyResolver(mockClsEmpty()), () => client);
    expect((await p.generate('test')).errorCode).toBe('NO_TENANT');
  });

  it('should handle SDK error (DNA-3)', async () => {
    mockChat.sample.mockRejectedValue(new Error('Service unavailable'));
    expect((await provider.generate('test')).errorCode).toBe('PROVIDER_ERROR');
  });

  it('healthCheck should succeed', async () => {
    expect((await provider.healthCheck()).isSuccess).toBe(true);
  });

  it('getModelInfo should return Grok metadata', () => {
    expect(provider.getModelInfo()['model_id']).toBe('grok-4');
  });
});

// ── Cross-Provider DNA Compliance ────────────────────

describe('P4.2 — All providers return DataProcessResult (DNA-3)', () => {
  it('every provider method returns DataProcessResult instance', async () => {
    const cls = mockCls(TENANT_ID, {
      anthropic: 'k',
      openai: 'k',
      google: 'k',
      grok: 'k',
    });
    const kr = makeKeyResolver(cls);

    const antClient = mockAnthropicClient();
    const oaiClient = mockOpenAiClient();
    const gemClient = mockGeminiClient();
    const grkChat = {
      append: jest.fn(),
      sample: jest.fn().mockResolvedValue({
        content: 'x',
        id: '1',
        usage: { prompt_tokens: 1, completion_tokens: 1 },
      }),
    };
    const grkClient = { chat: { create: jest.fn().mockReturnValue(grkChat) } } as any;

    const providers = [
      new AnthropicProvider(cls, kr, () => antClient),
      new OpenAiProvider(cls, kr, () => oaiClient),
      new GeminiProvider(cls, kr, () => gemClient),
      new GrokProvider(cls, kr, () => grkClient),
    ];

    for (const p of providers) {
      const results = await Promise.all([
        p.generate('test'),
        p.generateStructured('test', { type: 'object' }),
      ]);
      for (const r of results) {
        expect(r).toBeInstanceOf(DataProcessResult);
      }
    }
  });
});
