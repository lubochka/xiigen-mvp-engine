/**
 * OpenAI Provider — IAiProvider implementation for GPT models.
 * v4: Per-tenant API key resolution via TenantKeyResolver.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IAiProvider, AiModelRole } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { TenantKeyResolver } from '../../kernel/multi-tenant/tenant-key.resolver';
import { IOpenAiClient } from './protocols';
import {
  ModelProfile,
  GPT_4O,
  GPT_4_1,
  GPT_5,
  OPENAI_TIER_DEFAULTS,
  roleToTier,
  estimateCost,
} from './base';

export type OpenAiClientFactory = (apiKey: string) => IOpenAiClient;

@Injectable()
export class OpenAiProvider extends IAiProvider {
  private readonly defaultModel: string;
  private readonly profiles: Record<string, ModelProfile>;

  constructor(
    private readonly cls: ClsService,
    private readonly keyResolver: TenantKeyResolver,
    private readonly clientFactory: OpenAiClientFactory,
    config?: Record<string, unknown>,
  ) {
    super();
    this.defaultModel = (config?.['defaultModel'] as string) ?? 'gpt-5';
    this.profiles = (config?.['profiles'] as Record<string, ModelProfile>) ?? {
      'gpt-4o': GPT_4O,
      'gpt-4.1': GPT_4_1,
      'gpt-5': GPT_5,
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
    return OPENAI_TIER_DEFAULTS[tier];
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

    const keyResult = this.keyResolver.requireKey('openai');
    if (!keyResult.isSuccess)
      return DataProcessResult.failure(keyResult.errorCode!, keyResult.errorMessage!);

    const usedModel = options?.model ?? this.selectModelForRole(options?.role) ?? this.defaultModel;
    const profile = this.profiles[usedModel];

    try {
      const client = this.clientFactory(keyResult.data!);
      const messages: Array<{ role: string; content: string }> = [];
      if (options?.systemPrompt) messages.push({ role: 'system', content: options.systemPrompt });
      messages.push({ role: 'user', content: prompt });

      const response = await client.chat.completions.create({
        model: usedModel,
        messages,
        max_completion_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      });

      const text = response.choices[0]?.message?.content ?? '';
      const ti = response.usage.prompt_tokens;
      const to = response.usage.completion_tokens;
      const reasoningTokens = response.usage.completion_tokens_details?.reasoning_tokens ?? 0;
      const cost = profile ? estimateCost(profile, ti, to) : 0;

      return DataProcessResult.success({
        text,
        model: response.model,
        tokens_used: { input: ti, output: to, reasoning: reasoningTokens },
        cost,
        request_id: response.id,
        provider: 'openai',
      });
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `OpenAI error: ${err}`);
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
    if (!outputSchema || typeof outputSchema !== 'object')
      return DataProcessResult.failure('INVALID_SCHEMA', 'outputSchema must be a non-empty object');

    const si = `Respond ONLY with valid JSON matching: ${JSON.stringify(outputSchema)}`;
    const fs = options?.systemPrompt ? `${options.systemPrompt}\n${si}` : si;

    const result = await this.generate(prompt, { ...options, systemPrompt: fs });
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
      return DataProcessResult.success({
        data: JSON.parse(raw),
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
    const p = this.profiles[this.defaultModel] ?? GPT_5;
    return {
      provider: p.provider,
      model_id: p.modelId,
      display_name: p.displayName,
      max_tokens: p.maxTokens,
      context_window: p.contextWindow,
      role: p.role,
    };
  }

  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    const keyResult = this.keyResolver.requireKey('openai');
    if (!keyResult.isSuccess) return DataProcessResult.failure('NO_API_KEY', 'No OpenAI API key');
    try {
      const client = this.clientFactory(keyResult.data!);
      await client.chat.completions.create({
        model: this.defaultModel,
        messages: [{ role: 'user', content: 'ping' }],
        max_completion_tokens: 1,
      });
      return DataProcessResult.success({ status: 'healthy', provider: 'openai' });
    } catch (err) {
      return DataProcessResult.failure('UNHEALTHY', `OpenAI health failed: ${err}`);
    }
  }
}
