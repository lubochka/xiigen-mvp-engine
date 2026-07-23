/**
 * Anthropic Provider — IAiProvider implementation for Claude models.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * v4: Per-tenant API key resolution via TenantKeyResolver.
 *     No tenant_id parameter. Reads TenantContext from CLS.
 *
 * DNA: DataProcessResult (3), tenant from CLS (5), dict payloads (1).
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IAiProvider, AiModelRole } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { TenantKeyResolver } from '../../kernel/multi-tenant/tenant-key.resolver';
import { IAnthropicClient } from './protocols';
import {
  ModelProfile,
  CLAUDE_OPUS,
  CLAUDE_SONNET,
  ANTHROPIC_TIER_DEFAULTS,
  roleToTier,
  estimateCost,
} from './base';

/** Factory that creates an IAnthropicClient from an API key. */
export type AnthropicClientFactory = (apiKey: string) => IAnthropicClient;

@Injectable()
export class AnthropicProvider extends IAiProvider {
  private readonly defaultModel: string;
  private readonly profiles: Record<string, ModelProfile>;

  constructor(
    private readonly cls: ClsService,
    private readonly keyResolver: TenantKeyResolver,
    private readonly clientFactory: AnthropicClientFactory,
    config?: Record<string, unknown>,
  ) {
    super();
    this.defaultModel = (config?.['defaultModel'] as string) ?? 'claude-sonnet-4-5';
    this.profiles = (config?.['profiles'] as Record<string, ModelProfile>) ?? {
      'claude-opus-4-5': CLAUDE_OPUS,
      'claude-sonnet-4-5': CLAUDE_SONNET,
    };
  }

  private getTenant(): DataProcessResult<TenantContext> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  /** Map role hint → env-var-backed tier model string. */
  private selectModelForRole(role?: AiModelRole): string | undefined {
    if (!role) return undefined;
    const tier = roleToTier(role);
    return ANTHROPIC_TIER_DEFAULTS[tier];
  }

  async generate(
    prompt: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
      role?: AiModelRole;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenant();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);

    if (!prompt) return DataProcessResult.failure('MISSING_PROMPT', 'prompt cannot be empty');

    const keyResult = this.keyResolver.requireKey('anthropic');
    if (!keyResult.isSuccess)
      return DataProcessResult.failure(keyResult.errorCode!, keyResult.errorMessage!);

    const usedModel = options?.model ?? this.selectModelForRole(options?.role) ?? this.defaultModel;
    const profile = this.profiles[usedModel];

    try {
      const client = this.clientFactory(keyResult.data!);
      const params: {
        model: string;
        max_tokens: number;
        messages: Array<{ role: string; content: string }>;
        temperature: number;
        system?: string;
      } = {
        model: usedModel,
        max_tokens: options?.maxTokens ?? 4096,
        messages: [{ role: 'user', content: prompt }],
        temperature: options?.temperature ?? 0.7,
      };
      if (options?.systemPrompt) params.system = options.systemPrompt;

      const response = await client.messages.create(params);
      const text = response.content
        .filter((b) => b.type === 'text' && b.text)
        .map((b) => b.text!)
        .join('');

      const ti = response.usage.input_tokens;
      const to = response.usage.output_tokens;
      const cost = profile ? estimateCost(profile, ti, to) : 0;

      return DataProcessResult.success({
        text,
        model: response.model,
        tokens_used: { input: ti, output: to },
        cost,
        request_id: response.id,
        provider: 'anthropic',
      });
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Anthropic error: ${err}`);
    }
  }

  async generateStructured(
    prompt: string,
    outputSchema: Record<string, unknown>,
    options?: { systemPrompt?: string; model?: string },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenant();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);

    if (!prompt) return DataProcessResult.failure('MISSING_PROMPT', 'prompt cannot be empty');
    if (!outputSchema || typeof outputSchema !== 'object') {
      return DataProcessResult.failure('INVALID_SCHEMA', 'outputSchema must be a non-empty object');
    }

    const schemaInstruction = `Respond ONLY with valid JSON matching: ${JSON.stringify(outputSchema)}`;
    const fullSystem = options?.systemPrompt
      ? `${options.systemPrompt}\n${schemaInstruction}`
      : schemaInstruction;

    const result = await this.generate(prompt, { ...options, systemPrompt: fullSystem });
    if (!result.isSuccess) return result;

    try {
      let raw = (result.data!['text'] as string).trim();
      if (raw.startsWith('```')) {
        raw = raw
          .split('\n')
          .slice(1)
          .join('\n')
          .replace(/```\s*$/, '')
          .trim();
      }
      const parsed = JSON.parse(raw);
      return DataProcessResult.success({
        data: parsed,
        model: result.data!['model'],
        tokens_used: result.data!['tokens_used'],
        cost: result.data!['cost'],
        request_id: result.data!['request_id'],
      });
    } catch (err) {
      return DataProcessResult.failure('PARSE_ERROR', `Failed to parse structured output: ${err}`);
    }
  }

  getModelInfo(): Record<string, unknown> {
    const profile = this.profiles[this.defaultModel] ?? CLAUDE_SONNET;
    return {
      provider: profile.provider,
      model_id: profile.modelId,
      display_name: profile.displayName,
      max_tokens: profile.maxTokens,
      context_window: profile.contextWindow,
      role: profile.role,
    };
  }

  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    const keyResult = this.keyResolver.requireKey('anthropic');
    if (!keyResult.isSuccess) {
      return DataProcessResult.failure('NO_API_KEY', 'No Anthropic API key for health check');
    }
    try {
      const client = this.clientFactory(keyResult.data!);
      await client.messages.create({
        model: this.defaultModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'ping' }],
      });
      return DataProcessResult.success({ status: 'healthy', provider: 'anthropic' });
    } catch (err) {
      return DataProcessResult.failure('UNHEALTHY', `Anthropic health failed: ${err}`);
    }
  }
}
