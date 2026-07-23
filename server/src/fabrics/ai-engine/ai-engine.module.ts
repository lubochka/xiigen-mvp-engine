/**
 * AiEngineModule — NestJS module for the AI Engine Fabric.
 *
 * Registers:
 *   - AiProviderRegistry (with all 5 providers: Mock + 4 real)
 *   - AiFabricResolver (config-driven model→provider routing)
 *   - OutputScorer, CostTracker, TokenBudget
 *   - AiDispatcher (wired with scorer)
 *
 * Default: Mock provider. Config switches to real providers.
 * Real providers require TenantKeyResolver for per-tenant API keys.
 *
 * Phase 4.5: Full wiring. Does NOT break FabricsModule's Symbol token bindings.
 */

import { Module, Global } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { TenantKeyResolver } from '../../kernel/multi-tenant/tenant-key.resolver';

import { MockAiProvider } from './mock.provider';
import { AnthropicProvider, AnthropicClientFactory } from './anthropic.provider';
import { OpenAiProvider, OpenAiClientFactory } from './openai.provider';
import { GeminiProvider, GeminiClientFactory } from './gemini.provider';
import { GrokProvider, GrokClientFactory } from './grok.provider';
import { AiProviderRegistry } from './provider-registry';
import { AiFabricResolver, AiResolverConfig } from './fabric-resolver';
import { AiProviderType, CLAUDE_OPUS, CLAUDE_SONNET, GPT_5, GEMINI_2_5_PRO, GROK_4 } from './base';
import { OutputScorer } from './scoring';
import { CostTracker } from './cost-tracker';
import { TokenBudget } from './token-budget';
import { AiDispatcher } from './dispatcher';

/** Default resolver config — uses Mock, no overrides. */
const DEFAULT_AI_RESOLVER_CONFIG: AiResolverConfig = {
  defaultProvider: AiProviderType.MOCK,
};

@Global()
@Module({
  providers: [
    // ── Tenant Key Resolution (needed by all AI providers) ──
    {
      provide: TenantKeyResolver,
      useFactory: (cls: ClsService) => new TenantKeyResolver(cls),
      inject: [ClsService],
    },

    // ── Supporting Infrastructure ─────────────────────
    {
      provide: OutputScorer,
      useFactory: () => new OutputScorer(),
    },
    {
      provide: CostTracker,
      useFactory: () => new CostTracker(),
    },
    {
      provide: TokenBudget,
      useFactory: (tracker: CostTracker) => new TokenBudget(tracker),
      inject: [CostTracker],
    },

    // ── Provider Registry ────────────────────────────
    {
      provide: AiProviderRegistry,
      useFactory: (cls: ClsService, keyResolver: TenantKeyResolver) => {
        const registry = new AiProviderRegistry();

        // Mock provider (always available — no API key needed)
        registry.register(AiProviderType.MOCK, async () => new MockAiProvider(cls), [], {
          description: 'Mock AI provider for dev/test',
        });

        // Anthropic (Claude) — requires API key via TenantKeyResolver
        registry.register(
          AiProviderType.ANTHROPIC,
          async (config) => {
            const clientFactory = config['clientFactory'] as AnthropicClientFactory | undefined;
            if (!clientFactory) {
              // Default: create a factory that would use real SDK (placeholder)
              return new AnthropicProvider(
                cls,
                keyResolver,
                (_key) => {
                  throw new Error(
                    'AnthropicProvider requires a clientFactory in config. ' +
                      'Set AI_PROVIDER=mock for dev or provide a real client factory.',
                  );
                },
                config,
              );
            }
            return new AnthropicProvider(cls, keyResolver, clientFactory, config);
          },
          [CLAUDE_OPUS, CLAUDE_SONNET],
          { description: 'Anthropic Claude provider' },
        );

        // OpenAI (GPT)
        registry.register(
          AiProviderType.OPENAI,
          async (config) => {
            const clientFactory = config['clientFactory'] as OpenAiClientFactory | undefined;
            if (!clientFactory) {
              return new OpenAiProvider(
                cls,
                keyResolver,
                (_key) => {
                  throw new Error('OpenAiProvider requires a clientFactory in config.');
                },
                config,
              );
            }
            return new OpenAiProvider(cls, keyResolver, clientFactory, config);
          },
          [GPT_5],
          { description: 'OpenAI GPT provider' },
        );

        // Google (Gemini)
        registry.register(
          AiProviderType.GOOGLE,
          async (config) => {
            const clientFactory = config['clientFactory'] as GeminiClientFactory | undefined;
            if (!clientFactory) {
              return new GeminiProvider(
                cls,
                keyResolver,
                (_key) => {
                  throw new Error('GeminiProvider requires a clientFactory in config.');
                },
                config,
              );
            }
            return new GeminiProvider(cls, keyResolver, clientFactory, config);
          },
          [GEMINI_2_5_PRO],
          { description: 'Google Gemini provider' },
        );

        // Grok (xAI)
        registry.register(
          AiProviderType.GROK,
          async (config) => {
            const clientFactory = config['clientFactory'] as GrokClientFactory | undefined;
            if (!clientFactory) {
              return new GrokProvider(
                cls,
                keyResolver,
                (_key) => {
                  throw new Error('GrokProvider requires a clientFactory in config.');
                },
                config,
              );
            }
            return new GrokProvider(cls, keyResolver, clientFactory, config);
          },
          [GROK_4],
          { description: 'xAI Grok provider' },
        );

        return registry;
      },
      inject: [ClsService, TenantKeyResolver],
    },

    // ── Fabric Resolver ──────────────────────────────
    {
      provide: AiFabricResolver,
      useFactory: (registry: AiProviderRegistry) => {
        // TODO: Read config from environment/config service in P7
        return new AiFabricResolver(DEFAULT_AI_RESOLVER_CONFIG, registry);
      },
      inject: [AiProviderRegistry],
    },

    // ── AiDispatcher ─────────────────────────────────
    {
      provide: AiDispatcher,
      useFactory: (cls: ClsService, scorer: OutputScorer, costTracker: CostTracker) => {
        return new AiDispatcher(cls, scorer, { timeoutSeconds: 30 }, costTracker);
      },
      inject: [ClsService, OutputScorer, CostTracker],
    },
  ],
  exports: [
    TenantKeyResolver,
    AiProviderRegistry,
    AiFabricResolver,
    OutputScorer,
    CostTracker,
    TokenBudget,
    AiDispatcher,
  ],
})
export class AiEngineModule {}
