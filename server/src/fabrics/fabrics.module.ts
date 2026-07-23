/**
 * FabricsModule — Registers all fabric providers.
 *
 * Phase 2.5: All 6 InMemory providers wired with Symbol injection tokens.
 * Phase 3.5: Added DatabaseModule + QueueModule (registries, resolvers, concrete providers).
 * Phase 4.5: Added AiEngineModule (5 providers, registry, resolver, scorer, cost, budget, dispatcher).
 * Phase 5.4: Added RagModule, SecretsModule, FlowEngineModule — ALL 7 FABRICS COMPLETE.
 *            All P2 Symbol token bindings remain — backward compatible.
 * Z-2: Added Fabric 8 (IScopedMemoryService) — InMemoryProvider default (no Redis required).
 *      Fabric 9 (ICodeRepositoryService) is project-scoped — not registered globally here.
 * Z-4: Added Fabric 10 (ISchedulerService) — InMemoryProvider default (no Bull required).
 *      BullSchedulerProvider and ActionSchedulerProvider stubs available for production.
 * DPO-FIX: Added AI_JUDGE_PROVIDER — second AnthropicProvider using claude-sonnet-4-5 (same
 *          model family as AI_PROVIDER/AI_ENGINE but a separate instance).
 *          Judge uses same model family as generator but separate instance — never receives
 *          generation requests, only evaluation.
 *          Used for blind multi-model judging: receives shuffled Output A/B/C, returns JSON ranking.
 *
 * Dual-injection pattern:
 *   - Symbol tokens (DATABASE_SERVICE, QUEUE_SERVICE, etc.) for fabric-first consumers
 *   - Class references for internal cross-fabric dependencies (e.g., Orchestrator → FlowStore)
 *   - Registries + Resolvers for factory-layer integration (P6)
 */

import { Module, Global } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

// Injection tokens
import {
  DATABASE_SERVICE,
  QUEUE_SERVICE,
  AI_PROVIDER,
  AI_JUDGE_PROVIDER,
  AI_OPENAI_PROVIDER,
  AI_GEMINI_PROVIDER,
  AI_SCOPE_ARBITER,
  RAG_SERVICE,
  FLOW_DEFINITION,
  FLOW_ORCHESTRATOR,
  SECRETS_SERVICE,
  SCOPED_MEMORY_SERVICE,
  SCHEDULER_SERVICE,
  SSE_CONNECTION_POOL,
  type IAiProvider,
} from './interfaces';

// InMemory providers (default — always available)
import { InMemoryDatabaseProvider } from './database/in-memory.provider';
import { InMemoryQueueProvider } from './queue/in-memory.provider';
import { MockAiProvider } from './ai-engine/mock.provider';
import { AnthropicProvider, AnthropicClientFactory } from './ai-engine/anthropic.provider';
import { OpenAiProvider, OpenAiClientFactory } from './ai-engine/openai.provider';
import { GeminiProvider, GeminiClientFactory } from './ai-engine/gemini.provider';
import { TenantKeyResolver } from '../kernel/multi-tenant/tenant-key.resolver';
import { InMemoryRagProvider } from './rag/in-memory.provider';
import { InMemoryFlowStore } from './flow-engine/in-memory-flow-store';
import { InMemoryFlowOrchestrator } from './flow-engine/in-memory-orchestrator';
import { InMemorySecretsProvider } from './secrets/in-memory.provider';
import { VaultSecretsProvider } from './secrets/vault.provider';
import { InMemoryScopedMemoryProvider } from './scoped-memory/in-memory.provider';
import { InMemorySchedulerProvider } from './scheduler/in-memory.provider';
import { DeferredShadowRunProvider } from './shadow-run/deferred-shadow-run.provider';
import { SHADOW_RUN_SERVICE } from './shadow-run/shadow-run.service';
import { DelegatingAiProvider } from './ai-engine/delegating-ai-provider';
import { SkillFaithfulMockProvider } from './ai-engine/providers/skill-faithful-mock.provider';
import { InMemorySseConnectionPool } from './providers/in-memory-sse-connection-pool';

// Abstract class for orchestrator's internal dependency
import { IFlowDefinition } from './interfaces/flow-orchestrator.interface';

// P3.5: Sub-modules with registries, resolvers, concrete providers
import { DatabaseModule } from './database/database.module';
import { QueueModule } from './queue/queue.module';
// P4.5: AI Engine sub-module
import { AiEngineModule } from './ai-engine/ai-engine.module';
// P5.4: RAG, Secrets, Flow Engine sub-modules — completes all 7 fabrics
import { RagModule } from './rag/rag.module';
import { SecretsModule } from './secrets/secrets.module';
import { FlowEngineModule } from './flow-engine/flow-engine.module';
// Graph / Embedding / Planning fabrics (Phase 1+2 — Dynamic AI Decision Architecture)
// NOTE: GRAPH_RAG_SERVICE, EMBEDDING_SERVICE, and planning tokens are now provided
// by GraphModule. FabricsModule re-exports them from its exports[] array.
import { GraphModule } from './graph/graph.module';
// FLOW-01 Phase A0.5: Auth Fabric — ITokenService (JWT per-tenant keys) + IPasswordHasherService (bcryptjs).
// Closes AM-9 (Rule 1 Fabric First). Luba decisions #1/#2/#3 baked in (2026-04-24).
// Only the module is imported + re-exported; individual tokens/providers flow through
// AuthFabricModule's own @Global exports.
import { AuthFabricModule } from './auth/fabric-auth.module';

@Global()
@Module({
  imports: [
    DatabaseModule,
    QueueModule,
    AiEngineModule,
    RagModule,
    SecretsModule,
    FlowEngineModule,
    GraphModule,
    AuthFabricModule,
  ],
  providers: [
    // ── Fabric 1: Database ────────────────────────────
    // Default binding: InMemory. Resolver can swap to ES/PG via config.
    {
      provide: InMemoryDatabaseProvider,
      useFactory: (cls: ClsService) => new InMemoryDatabaseProvider(cls),
      inject: [ClsService],
    },
    { provide: DATABASE_SERVICE, useExisting: InMemoryDatabaseProvider },

    // ── Fabric 2: Queue ───────────────────────────────
    {
      provide: InMemoryQueueProvider,
      useFactory: (cls: ClsService) => new InMemoryQueueProvider(cls),
      inject: [ClsService],
    },
    { provide: QUEUE_SERVICE, useExisting: InMemoryQueueProvider },

    // ── Fabric 3: AI Engine ───────────────────────────
    // Phase A-0: AI_PROVIDER env var removed (BUG-003).
    // Phase B will replace this with ITenantProviderPoolFabric.getPool(tenantId).
    // Until Phase B: MockAiProvider is the default. BOOTSTRAP_ANTHROPIC_KEY seeds byok-keys.
    // defaultResponse is a multi-schema JSON that satisfies planner, reviewer, judge, and arbiter parsers.
    {
      provide: MockAiProvider,
      useFactory: (cls: ClsService) =>
        new MockAiProvider(cls, {
          defaultResponse: JSON.stringify({
            steps: [
              { index: 1, text: 'Mock step one', intClause: 'mock clause', dependencies: [] },
              { index: 2, text: 'Mock step two', intClause: 'mock clause', dependencies: [1] },
            ],
            coverage: [],
            abstractionViolations: [],
            responsibilityFlags: [],
            dependencyGaps: [],
            winner: 'A',
            reasoning: 'Mock judge selects A',
            verdict: 'PASS',
            criterion: 'mock',
            detail: 'mock arbiter pass',
            intent: { purpose: 'mock purpose' },
          }),
          costPerCall: 0.001,
          tokensPerResponse: 50,
        }),
      inject: [ClsService],
    },
    {
      provide: AnthropicProvider,
      useFactory: (cls: ClsService, keyResolver: TenantKeyResolver, mock: MockAiProvider) => {
        if (process.env['AI_PROVIDER'] === 'mock') {
          return process.env['MOCK_MODE'] === 'skill_faithful'
            ? new SkillFaithfulMockProvider('mock-sf')
            : mock;
        }
        const apiKey = process.env['BOOTSTRAP_ANTHROPIC_KEY'] ?? '';
        if (apiKey) keyResolver.setSystemKey('anthropic', apiKey);
        // Fetch-based IAnthropicClient — no SDK install required
        const clientFactory = (key: string) => ({
          messages: {
            create: async (params: Record<string, unknown>) => {
              const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': key,
                  'anthropic-version': '2023-06-01',
                  'content-type': 'application/json',
                },
                body: JSON.stringify(params),
              });
              if (!res.ok) {
                const err = await res.text();
                throw new Error(`Anthropic API error ${res.status}: ${err}`);
              }
              return res.json() as Promise<Record<string, unknown>>;
            },
          },
        });
        return new AnthropicProvider(
          cls,
          keyResolver,
          clientFactory as unknown as AnthropicClientFactory,
        );
      },
      inject: [ClsService, TenantKeyResolver, MockAiProvider],
    },
    // Phase B-3: AI_PROVIDER resolved per-request via DelegatingAiProvider.
    // At every generate() call, reads TenantKeyResolver from AsyncLocalStorage to select
    // the provider the current tenant has keys for. Replaces module-init-time BOOTSTRAP_ check.
    // Injects openai/gemini via their symbol tokens (registered above in this module).
    {
      provide: DelegatingAiProvider,
      useFactory: (
        keyResolver: TenantKeyResolver,
        anthropic: AnthropicProvider,
        openai: IAiProvider | null,
        gemini: IAiProvider | null,
        mock: MockAiProvider,
      ) => new DelegatingAiProvider(keyResolver, anthropic, openai, gemini, mock),
      inject: [
        TenantKeyResolver,
        AnthropicProvider,
        AI_OPENAI_PROVIDER,
        AI_GEMINI_PROVIDER,
        MockAiProvider,
      ],
    },
    { provide: AI_PROVIDER, useExisting: DelegatingAiProvider },

    // ── AI Judge Provider (Node 3 — Claude economy self-judge round participant) ──
    // AnthropicProvider at economy tier (claude-haiku-4-5 default, overridable via env).
    // Participates as Node 3 in TeachingRoundService self-judge loops.
    // No API key → graceful mock degradation (distinct modelId for V9-002 compliance).
    {
      provide: AI_JUDGE_PROVIDER,
      useFactory: (cls: ClsService, keyResolver: TenantKeyResolver) => {
        const apiKey = process.env['BOOTSTRAP_ANTHROPIC_KEY'] ?? '';
        if (!apiKey) {
          return process.env['MOCK_MODE'] === 'skill_faithful'
            ? new SkillFaithfulMockProvider('mock-claude')
            : new MockAiProvider(cls, { modelId: 'mock-claude' });
        }
        keyResolver.setSystemKey('anthropic', apiKey);
        const clientFactory = (key: string) => ({
          messages: {
            create: async (params: Record<string, unknown>) => {
              const res = await fetch('https://api.anthropic.com/v1/messages', {
                method: 'POST',
                headers: {
                  'x-api-key': key,
                  'anthropic-version': '2023-06-01',
                  'content-type': 'application/json',
                },
                body: JSON.stringify(params),
              });
              if (!res.ok) {
                const err = await res.text();
                throw new Error(`Anthropic API error ${res.status}: ${err}`);
              }
              return res.json() as Promise<Record<string, unknown>>;
            },
          },
        });
        return new AnthropicProvider(
          cls,
          keyResolver,
          clientFactory as unknown as AnthropicClientFactory,
          {
            defaultModel: process.env['ANTHROPIC_ECONOMY_MODEL'] ?? 'claude-haiku-4-5',
          },
        );
      },
      inject: [ClsService, TenantKeyResolver],
    },

    // ── AI_OPENAI_PROVIDER (Node 2 — GPT self-judge round participant) ───────────
    // No key → distinct MockAiProvider (modelId: 'mock-openai') for V9-002 compliance.
    {
      provide: AI_OPENAI_PROVIDER,
      useFactory: (cls: ClsService, keyResolver: TenantKeyResolver) => {
        const apiKey = process.env['BOOTSTRAP_OPENAI_KEY'] ?? '';
        if (!apiKey) {
          return process.env['MOCK_MODE'] === 'skill_faithful'
            ? new SkillFaithfulMockProvider('mock-openai')
            : new MockAiProvider(cls, { modelId: 'mock-openai' });
        }
        keyResolver.setSystemKey('openai', apiKey);
        keyResolver.setSystemKey('openai', apiKey);
        const clientFactory = (key: string) => ({
          chat: {
            completions: {
              create: async (params: Record<string, unknown>) => {
                const res = await fetch('https://api.openai.com/v1/chat/completions', {
                  method: 'POST',
                  headers: {
                    Authorization: `Bearer ${key}`,
                    'content-type': 'application/json',
                  },
                  body: JSON.stringify(params),
                });
                if (!res.ok) {
                  const err = await res.text();
                  throw new Error(`OpenAI API error ${res.status}: ${err}`);
                }
                return res.json() as Promise<Record<string, unknown>>;
              },
            },
          },
        });
        const model = process.env['OPENAI_MODEL'] ?? 'gpt-5';
        return new OpenAiProvider(
          cls,
          keyResolver,
          clientFactory as unknown as OpenAiClientFactory,
          { defaultModel: model },
        );
      },
      inject: [ClsService, TenantKeyResolver],
    },

    // ── AI_GEMINI_PROVIDER (Node 1 — Gemini self-judge round participant) ────────
    // No key → distinct MockAiProvider (modelId: 'mock-gemini') for V9-002 compliance.
    {
      provide: AI_GEMINI_PROVIDER,
      useFactory: (cls: ClsService, keyResolver: TenantKeyResolver) => {
        const apiKey = process.env['BOOTSTRAP_GEMINI_KEY'] ?? '';
        if (!apiKey) {
          return process.env['MOCK_MODE'] === 'skill_faithful'
            ? new SkillFaithfulMockProvider('mock-gemini')
            : new MockAiProvider(cls, { modelId: 'mock-gemini' });
        }
        keyResolver.setSystemKey('google', apiKey);
        const clientFactory = (key: string) => ({
          aio: {
            models: {
              generate_content: async (params: Record<string, unknown>) => {
                const model = params['model'] as string;
                const contents = params['contents'] as string;
                const config = (params['config'] as Record<string, unknown>) ?? {};
                const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${key}`;
                const body: Record<string, unknown> = {
                  contents: [{ parts: [{ text: contents }] }],
                  generationConfig: {
                    maxOutputTokens: config['max_output_tokens'] ?? 4096,
                    temperature: config['temperature'] ?? 0.7,
                  },
                };
                if (config['system_instruction']) {
                  body['systemInstruction'] = { parts: [{ text: config['system_instruction'] }] };
                }
                const res = await fetch(url, {
                  method: 'POST',
                  headers: { 'content-type': 'application/json' },
                  body: JSON.stringify(body),
                });
                if (!res.ok) {
                  const err = await res.text();
                  throw new Error(`Gemini API error ${res.status}: ${err}`);
                }
                type GeminiResponse = {
                  candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }>;
                  usageMetadata?: {
                    promptTokenCount?: number;
                    candidatesTokenCount?: number;
                    totalTokenCount?: number;
                    thoughtsTokenCount?: number;
                  };
                };
                const json = (await res.json()) as GeminiResponse;
                const text: string = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? '';
                return {
                  text,
                  usage_metadata: {
                    prompt_token_count: json?.usageMetadata?.promptTokenCount ?? 0,
                    candidates_token_count: json?.usageMetadata?.candidatesTokenCount ?? 0,
                    total_token_count: json?.usageMetadata?.totalTokenCount ?? 0,
                    thoughts_token_count: json?.usageMetadata?.thoughtsTokenCount ?? 0,
                  },
                };
              },
            },
          },
        });
        const model = process.env['GEMINI_MODEL'] ?? 'gemini-2.5-pro';
        return new GeminiProvider(
          cls,
          keyResolver,
          clientFactory as unknown as GeminiClientFactory,
          { defaultModel: model },
        );
      },
      inject: [ClsService, TenantKeyResolver],
    },

    // ── Fabric 4: RAG ─────────────────────────────────
    {
      provide: InMemoryRagProvider,
      useFactory: (cls: ClsService) => new InMemoryRagProvider(cls),
      inject: [ClsService],
    },
    { provide: RAG_SERVICE, useExisting: InMemoryRagProvider },

    // ── Fabric 5: Flow Engine ─────────────────────────
    {
      provide: InMemoryFlowStore,
      useFactory: (cls: ClsService) => new InMemoryFlowStore(cls),
      inject: [ClsService],
    },
    { provide: FLOW_DEFINITION, useExisting: InMemoryFlowStore },
    { provide: IFlowDefinition, useExisting: InMemoryFlowStore },
    {
      provide: InMemoryFlowOrchestrator,
      useFactory: (cls: ClsService, flowStore: InMemoryFlowStore) =>
        new InMemoryFlowOrchestrator(cls, flowStore),
      inject: [ClsService, InMemoryFlowStore],
    },
    { provide: FLOW_ORCHESTRATOR, useExisting: InMemoryFlowOrchestrator },

    // ── Fabric 7: Secrets ─────────────────────────────
    {
      provide: InMemorySecretsProvider,
      useFactory: (cls: ClsService) => new InMemorySecretsProvider(cls),
      inject: [ClsService],
    },
    {
      provide: VaultSecretsProvider,
      useFactory: (cls: ClsService) => new VaultSecretsProvider(cls),
      inject: [ClsService],
    },
    {
      provide: SECRETS_SERVICE,
      useFactory: (
        inMemory: InMemorySecretsProvider,
        vault: VaultSecretsProvider,
      ) => (process.env['SECRETS_PROVIDER'] === 'vault' ? vault : inMemory),
      inject: [InMemorySecretsProvider, VaultSecretsProvider],
    },

    // ── Fabric 8: Scoped Memory (Z-2) ─────────────────
    // Default: InMemory (no Redis required). Swap to RedisProvider in production.
    { provide: InMemoryScopedMemoryProvider, useClass: InMemoryScopedMemoryProvider },
    { provide: SCOPED_MEMORY_SERVICE, useExisting: InMemoryScopedMemoryProvider },

    // ── Fabric 10: Scheduler (Z-4) ────────────────────
    // Default: InMemory (no Bull required). Swap to BullSchedulerProvider in production.
    // ActionSchedulerProvider available for WordPress runtime.
    { provide: InMemorySchedulerProvider, useClass: InMemorySchedulerProvider },
    { provide: SCHEDULER_SERVICE, useExisting: InMemorySchedulerProvider },

    // ── Fabric 11: Shadow Run (S1-07) ─────────────────
    // ES-backed deferred provider for paid-model vs OSS-model comparison tracking.
    { provide: DeferredShadowRunProvider, useClass: DeferredShadowRunProvider },
    { provide: SHADOW_RUN_SERVICE, useExisting: DeferredShadowRunProvider },

    // ── AI_SCOPE_ARBITER (FC-32 / SK-526 / Rule 18) ──────────────────────
    // Dedicated economy-tier provider for the scope_isolation arbiter.
    // Separate token from AI_JUDGE_PROVIDER: two distinct economy-tier calls per panel run.
    // useExisting: AI_JUDGE_PROVIDER until a dedicated model config is warranted.
    { provide: AI_SCOPE_ARBITER, useExisting: AI_JUDGE_PROVIDER },

    // ── Fabric: SSE Connection Pool (FLOW-40) ─────────────────────────────
    // CF-798: pushEvent scoped strictly by tenantId — cross-tenant delivery blocked.
    // Default: InMemory (no Redis required). Swap to RedisConnectionPoolProvider in production.
    { provide: InMemorySseConnectionPool, useClass: InMemorySseConnectionPool },
    { provide: SSE_CONNECTION_POOL, useExisting: InMemorySseConnectionPool },

    // ── Fabrics 12 + 13: Embedding + Graph RAG (Phase 1+2) ────────────────
    // Provided by GraphModule. Re-exported below.
    // Planning tokens (ARBITER_PANEL_HANDLER, CYCLE_ROUTER, etc.) also come from GraphModule.
  ],
  exports: [
    // Symbol tokens (fabric-first consumers use these)
    DATABASE_SERVICE,
    QUEUE_SERVICE,
    AI_PROVIDER,
    AI_JUDGE_PROVIDER,
    AI_OPENAI_PROVIDER,
    AI_GEMINI_PROVIDER,
    AI_SCOPE_ARBITER,
    RAG_SERVICE,
    FLOW_DEFINITION,
    FLOW_ORCHESTRATOR,
    SECRETS_SERVICE,
    SCOPED_MEMORY_SERVICE,
    SCHEDULER_SERVICE,
    // Class references (for direct injection in tests/internal)
    InMemoryDatabaseProvider,
    InMemoryQueueProvider,
    MockAiProvider,
    AnthropicProvider,
    DelegatingAiProvider,
    InMemoryRagProvider,
    InMemoryFlowStore,
    InMemoryFlowOrchestrator,
    InMemorySecretsProvider,
    VaultSecretsProvider,
    InMemoryScopedMemoryProvider,
    InMemorySchedulerProvider,
    // Shadow Run
    SHADOW_RUN_SERVICE,
    DeferredShadowRunProvider,
    // SSE Connection Pool (FLOW-40)
    SSE_CONNECTION_POOL,
    InMemorySseConnectionPool,
    // Graph + Embedding + Planning tokens (Phase 1+2 — Dynamic AI Decision Architecture)
    // Re-export the entire GraphModule so consumers get GRAPH_RAG_SERVICE, EMBEDDING_SERVICE,
    // GRAPH_LEARNING_SERVICE, GRAPH_CONFIG_READER, and all 13 planning tokens.
    GraphModule,
    // FLOW-01 Phase A0.5: Auth Fabric — re-export the whole module so consumers get
    // TOKEN_SERVICE, PASSWORD_HASHER_SERVICE, concrete providers, and both factories.
    AuthFabricModule,
  ],
})
export class FabricsModule {}
