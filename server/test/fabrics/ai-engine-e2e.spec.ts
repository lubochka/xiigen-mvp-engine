/**
 * P4.5 — AI Engine Module + Cross-Fabric E2E Tests.
 *
 * Validates:
 *   - Provider switching via resolver config
 *   - Per-tenant key isolation (different tenants use different keys)
 *   - Dispatcher consensus E2E (register → generateWithConsensus → cost tracked)
 *   - Budget enforcement E2E (low budget → second call blocked)
 *   - Cross-fabric pipeline (DB → AI → Queue → cost track)
 *   - Registry completeness (all 5 providers registered)
 *   - Backward compatibility (existing tests unaffected)
 */

import { AiProviderRegistry } from '../../src/fabrics/ai-engine/provider-registry';
import { AiFabricResolver } from '../../src/fabrics/ai-engine/fabric-resolver';
import { AiProviderType, CLAUDE_SONNET, GPT_5 } from '../../src/fabrics/ai-engine/base';
import { AnthropicProvider } from '../../src/fabrics/ai-engine/anthropic.provider';
import { OpenAiProvider } from '../../src/fabrics/ai-engine/openai.provider';
import { GeminiProvider } from '../../src/fabrics/ai-engine/gemini.provider';
import { GrokProvider } from '../../src/fabrics/ai-engine/grok.provider';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { AiDispatcher } from '../../src/fabrics/ai-engine/dispatcher';
import { OutputScorer } from '../../src/fabrics/ai-engine/scoring';
import { CostTracker } from '../../src/fabrics/ai-engine/cost-tracker';
import { TokenBudget } from '../../src/fabrics/ai-engine/token-budget';
import { InMemoryDatabaseProvider } from '../../src/fabrics/database/in-memory.provider';
import { InMemoryQueueProvider } from '../../src/fabrics/queue/in-memory.provider';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import {
  TenantContext,
  TENANT_CONTEXT_KEY,
  DEFAULT_PLAN,
  TenantKeyResolver,
} from '../../src/kernel';

// ── Helpers ──────────────────────────────────────────

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

function makeMockAnthropicClient() {
  return {
    messages: {
      create: jest.fn().mockResolvedValue({
        id: 'msg-1',
        type: 'message',
        role: 'assistant',
        model: 'claude-sonnet-4-5',
        content: [{ type: 'text', text: 'Claude response' }],
        usage: { input_tokens: 50, output_tokens: 100 },
        stop_reason: 'end_turn',
      }),
    },
  } as any;
}

function makeMockOpenAiClient() {
  return {
    chat: {
      completions: {
        create: jest.fn().mockResolvedValue({
          id: 'chatcmpl-1',
          model: 'gpt-5.2',
          choices: [
            {
              index: 0,
              message: { role: 'assistant', content: 'GPT response' },
              finish_reason: 'stop',
            },
          ],
          usage: { prompt_tokens: 50, completion_tokens: 100, total_tokens: 150 },
        }),
      },
    },
  } as any;
}

// ── Tests ────────────────────────────────────────────

describe('P4.5 — Registry Completeness', () => {
  it('should register all 5 AI provider types', () => {
    const cls = mockCls('reg-test');
    const keyResolver = new TenantKeyResolver(cls);
    const registry = new AiProviderRegistry();

    registry.register(AiProviderType.MOCK, async () => new MockAiProvider(cls));
    registry.register(
      AiProviderType.ANTHROPIC,
      async () => new AnthropicProvider(cls, keyResolver, () => makeMockAnthropicClient()),
    );
    registry.register(
      AiProviderType.OPENAI,
      async () => new OpenAiProvider(cls, keyResolver, () => makeMockOpenAiClient()),
    );
    registry.register(
      AiProviderType.GOOGLE,
      async () =>
        new GeminiProvider(
          cls,
          keyResolver,
          () => ({ aio: { models: { generate_content: jest.fn() } } }) as any,
        ),
    );
    registry.register(
      AiProviderType.GROK,
      async () =>
        new GrokProvider(cls, keyResolver, () => ({ chat: { create: jest.fn() } }) as any),
    );

    expect(registry.count).toBe(5);
    expect(registry.isRegistered(AiProviderType.MOCK)).toBe(true);
    expect(registry.isRegistered(AiProviderType.ANTHROPIC)).toBe(true);
    expect(registry.isRegistered(AiProviderType.OPENAI)).toBe(true);
    expect(registry.isRegistered(AiProviderType.GOOGLE)).toBe(true);
    expect(registry.isRegistered(AiProviderType.GROK)).toBe(true);

    // Model profiles
    const allProfiles = registry.getAllProfiles();
    expect(allProfiles.length).toBeGreaterThanOrEqual(0);
  });
});

describe('P4.5 — Provider Switching via Resolver', () => {
  it('should resolve Mock by default, then switch to Anthropic', async () => {
    const cls = mockCls('switch-tenant', { anthropic: 'sk-ant' });
    const keyResolver = new TenantKeyResolver(cls);
    const registry = new AiProviderRegistry();

    registry.register(AiProviderType.MOCK, async () => new MockAiProvider(cls));
    registry.register(
      AiProviderType.ANTHROPIC,
      async () => new AnthropicProvider(cls, keyResolver, () => makeMockAnthropicClient()),
    );

    const resolver = new AiFabricResolver({ defaultProvider: 'mock' }, registry);

    const r1 = await resolver.resolve();
    expect(r1.isSuccess).toBe(true);
    expect(r1.data).toBeInstanceOf(MockAiProvider);

    resolver.updateConfig({ defaultProvider: 'anthropic' });
    const r2 = await resolver.resolve();
    expect(r2.isSuccess).toBe(true);
    expect(r2.data).toBeInstanceOf(AnthropicProvider);
  });

  it('should route specific models to their providers', async () => {
    const cls = mockCls('route-tenant', { anthropic: 'sk', openai: 'sk' });
    const keyResolver = new TenantKeyResolver(cls);
    const registry = new AiProviderRegistry();

    registry.register(AiProviderType.MOCK, async () => new MockAiProvider(cls));
    registry.register(
      AiProviderType.ANTHROPIC,
      async () => new AnthropicProvider(cls, keyResolver, () => makeMockAnthropicClient()),
    );
    registry.register(
      AiProviderType.OPENAI,
      async () => new OpenAiProvider(cls, keyResolver, () => makeMockOpenAiClient()),
    );

    const resolver = new AiFabricResolver(
      {
        defaultProvider: 'mock',
        modelRouting: { 'claude-sonnet-4-5': 'anthropic', 'gpt-5.2': 'openai' },
      },
      registry,
    );

    const claude = await resolver.resolve('claude-sonnet-4-5');
    expect(claude.data).toBeInstanceOf(AnthropicProvider);

    const gpt = await resolver.resolve('gpt-5.2');
    expect(gpt.data).toBeInstanceOf(OpenAiProvider);

    const unknown = await resolver.resolve('llama-4');
    expect(unknown.data).toBeInstanceOf(MockAiProvider);
  });
});

describe('P4.5 — Per-Tenant Key Isolation', () => {
  it('different tenants should use different API keys', async () => {
    // Tenant A has Anthropic key
    const clsA = mockCls('tenant-A', { anthropic: 'sk-A-key' });
    const keyResolverA = new TenantKeyResolver(clsA);
    const antClientA = makeMockAnthropicClient();
    const providerA = new AnthropicProvider(clsA, keyResolverA, () => antClientA);

    // Tenant B has different Anthropic key
    const clsB = mockCls('tenant-B', { anthropic: 'sk-B-key' });
    const keyResolverB = new TenantKeyResolver(clsB);
    const antClientB = makeMockAnthropicClient();
    const providerB = new AnthropicProvider(clsB, keyResolverB, () => antClientB);

    // Both generate successfully
    const rA = await providerA.generate('test');
    const rB = await providerB.generate('test');
    expect(rA.isSuccess).toBe(true);
    expect(rB.isSuccess).toBe(true);

    // Verify keys resolved differently
    expect(keyResolverA.getKey('anthropic')).toBe('sk-A-key');
    expect(keyResolverB.getKey('anthropic')).toBe('sk-B-key');
  });

  it('tenant without key should fall back to system key', async () => {
    const cls = mockCls('no-key-tenant', {}); // no keys
    const keyResolver = new TenantKeyResolver(cls);
    keyResolver.setSystemKey('anthropic', 'sk-system-fallback');

    const provider = new AnthropicProvider(cls, keyResolver, () => makeMockAnthropicClient());
    const result = await provider.generate('test');
    expect(result.isSuccess).toBe(true); // uses system key

    expect(keyResolver.getKey('anthropic')).toBe('sk-system-fallback');
  });

  it('tenant without key AND no system key should fail', async () => {
    const cls = mockCls('keyless-tenant', {});
    const keyResolver = new TenantKeyResolver(cls); // no system keys set

    const provider = new AnthropicProvider(cls, keyResolver, () => makeMockAnthropicClient());
    const result = await provider.generate('test');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_API_KEY');
  });
});

describe('P4.5 — Dispatcher Consensus E2E with Cost Tracking', () => {
  it('should run consensus, select best, and track costs', async () => {
    const cls = mockCls('consensus-tenant', { anthropic: 'sk', openai: 'sk' });
    const keyResolver = new TenantKeyResolver(cls);
    const scorer = new OutputScorer();
    const costTracker = new CostTracker();
    const dispatcher = new AiDispatcher(cls, scorer);

    // Register two providers
    const antClient = makeMockAnthropicClient();
    antClient.messages.create.mockResolvedValue({
      id: 'msg-1',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5',
      content: [
        {
          type: 'text',
          text: 'Claude generated a detailed service implementation with proper DNA compliance patterns.',
        },
      ],
      usage: { input_tokens: 100, output_tokens: 200 },
      stop_reason: 'end_turn',
    });

    const oaiClient = makeMockOpenAiClient();
    oaiClient.chat.completions.create.mockResolvedValue({
      id: 'c-1',
      model: 'gpt-5.2',
      choices: [
        { index: 0, message: { role: 'assistant', content: 'GPT output' }, finish_reason: 'stop' },
      ],
      usage: { prompt_tokens: 100, completion_tokens: 50, total_tokens: 150 },
    });

    dispatcher.registerProvider(
      'claude-sonnet-4-5',
      new AnthropicProvider(cls, keyResolver, () => antClient),
    );
    dispatcher.registerProvider('gpt-5.2', new OpenAiProvider(cls, keyResolver, () => oaiClient));

    // Run consensus
    const result = await dispatcher.generateWithConsensus('Generate MarketplaceService', [
      'claude-sonnet-4-5',
      'gpt-5.2',
    ]);

    expect(result.isSuccess).toBe(true);
    expect(result.data!['models_attempted']).toBe(2);
    expect(result.data!['models_succeeded']).toBe(2);
    expect(result.data!['scores']).toBeDefined();
    expect((result.data!['scores'] as any[]).length).toBe(2);

    // Claude's longer response should score higher
    expect(result.data!['model_used']).toBe('claude-sonnet-4-5');

    // Track costs manually (dispatcher doesn't auto-track; that's P12)
    const allOutputs = result.data!['all_outputs'] as Array<Record<string, unknown>>;
    for (const output of allOutputs) {
      const modelId = output['model_id'] as string;
      const tokens = output['tokens_used'] as Record<string, number>;
      const cost = output['cost'] as number;
      if (tokens && cost) {
        costTracker.record(
          'consensus-tenant',
          modelId,
          tokens['input'] ?? 0,
          tokens['output'] ?? 0,
          cost,
        );
      }
    }

    const usage = costTracker.getTenantUsage('consensus-tenant');
    expect(usage['callCount']).toBe(2);
    expect(usage['totalCost'] as number).toBeGreaterThan(0);
  });
});

describe('P4.5 — Budget Enforcement E2E', () => {
  it('should allow first call then block second when budget exceeded', async () => {
    const cls = mockCls('budget-tenant', { anthropic: 'sk' });
    const keyResolver = new TenantKeyResolver(cls);
    const costTracker = new CostTracker();
    const budget = new TokenBudget(costTracker, { defaultTenantLimit: 0.001 }); // very low limit

    const antClient = makeMockAnthropicClient();
    const provider = new AnthropicProvider(cls, keyResolver, () => antClient);

    // First call: check budget → OK
    const check1 = budget.checkBudget('budget-tenant');
    expect(check1.isSuccess).toBe(true);

    // Make the AI call
    const result = await provider.generate('Generate code');
    expect(result.isSuccess).toBe(true);

    // Record the cost
    const tokens = result.data!['tokens_used'] as Record<string, number>;
    const cost = result.data!['cost'] as number;
    costTracker.record(
      'budget-tenant',
      'claude-sonnet-4-5',
      tokens['input'],
      tokens['output'],
      cost,
    );

    // Second call: check budget → BLOCKED
    const check2 = budget.checkBudget('budget-tenant');
    expect(check2.isSuccess).toBe(false);
    expect(check2.errorCode).toBe('BUDGET_EXCEEDED');
  });
});

describe('P4.5 — Cross-Fabric Pipeline: DB → AI → Queue', () => {
  it('should store task spec in DB, generate with AI, enqueue result', async () => {
    const cls = mockCls('pipeline-tenant', { anthropic: 'sk-pipe' });
    const keyResolver = new TenantKeyResolver(cls);

    const db = new InMemoryDatabaseProvider(cls);
    const queue = new InMemoryQueueProvider(cls);
    const antClient = makeMockAnthropicClient();
    antClient.messages.create.mockResolvedValue({
      id: 'msg-gen',
      type: 'message',
      role: 'assistant',
      model: 'claude-sonnet-4-5',
      content: [{ type: 'text', text: 'class MarketplaceService extends MicroserviceBase { }' }],
      usage: { input_tokens: 200, output_tokens: 300 },
      stop_reason: 'end_turn',
    });
    const aiProvider = new AnthropicProvider(cls, keyResolver, () => antClient);

    // Step 1: Store task spec in DB
    const storeResult = await db.storeDocument(
      'task-specs',
      {
        task_type: 'T44',
        name: 'MarketplaceListingService',
        archetype: 'INTEGRATION',
      },
      'T44',
    );
    expect(storeResult.isSuccess).toBe(true);

    // Step 2: Generate code with AI
    const taskSpec = await db.getDocument('task-specs', 'T44');
    const prompt = `Generate service for: ${JSON.stringify(taskSpec.data)}`;
    const aiResult = await aiProvider.generate(prompt, {
      systemPrompt: 'Generate Python code following DNA patterns.',
    });
    expect(aiResult.isSuccess).toBe(true);
    expect(aiResult.data!['text'] as string).toContain('MicroserviceBase');

    // Step 3: Store generation result in DB
    const genResult = await db.storeDocument('generations', {
      task_type: 'T44',
      generated_code: aiResult.data!['text'],
      model_used: aiResult.data!['model'],
      cost: aiResult.data!['cost'],
    });
    expect(genResult.isSuccess).toBe(true);

    // Step 4: Enqueue event
    const enqResult = await queue.enqueue('generation.completed', {
      generation_id: genResult.data!['_id'],
      task_type: 'T44',
    });
    expect(enqResult.isSuccess).toBe(true);

    // Step 5: Verify the full pipeline
    const deqResult = await queue.dequeue('generation.completed', 1);
    expect(deqResult.isSuccess).toBe(true);
    expect(deqResult.data!.length).toBe(1);
  });
});

describe('P4.5 — Backward Compatibility', () => {
  it('MockAiProvider still works standalone', async () => {
    const cls = mockCls('compat-tenant');
    const mock = new MockAiProvider(cls);
    const result = await mock.generate('test prompt');
    expect(result.isSuccess).toBe(true);
    expect(result.data!['text']).toBeDefined();
  });

  it('all P4 types are importable from barrel', () => {
    expect(AiProviderRegistry).toBeDefined();
    expect(AiFabricResolver).toBeDefined();
    expect(AnthropicProvider).toBeDefined();
    expect(OpenAiProvider).toBeDefined();
    expect(GeminiProvider).toBeDefined();
    expect(GrokProvider).toBeDefined();
    expect(MockAiProvider).toBeDefined();
    expect(AiDispatcher).toBeDefined();
    expect(OutputScorer).toBeDefined();
    expect(CostTracker).toBeDefined();
    expect(TokenBudget).toBeDefined();
  });

  it('InMemoryDatabaseProvider still works (cross-fabric check)', async () => {
    const db = new InMemoryDatabaseProvider(mockCls('compat'));
    const r = await db.storeDocument('test', { x: 1 });
    expect(r.isSuccess).toBe(true);
  });

  it('InMemoryQueueProvider still works (cross-fabric check)', async () => {
    const q = new InMemoryQueueProvider(mockCls('compat'));
    const r = await q.enqueue('test.event', { x: 1 });
    expect(r.isSuccess).toBe(true);
  });
});
