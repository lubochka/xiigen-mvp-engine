/**
 * Grok Provider — IAiProvider implementation for xAI Grok models.
 * Uses native xai-sdk chat pattern: create → append messages → sample.
 * v4: Per-tenant API key resolution via TenantKeyResolver.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { TenantKeyResolver } from '../../kernel/multi-tenant/tenant-key.resolver';
import { IGrokClient, grokSystemMessage, grokUserMessage } from './protocols';
import { ModelProfile, GROK_4, estimateCost } from './base';

export type GrokClientFactory = (apiKey: string) => IGrokClient;

@Injectable()
export class GrokProvider extends IAiProvider {
  private readonly defaultModel: string;
  private readonly profiles: Record<string, ModelProfile>;

  constructor(
    private readonly cls: ClsService,
    private readonly keyResolver: TenantKeyResolver,
    private readonly clientFactory: GrokClientFactory,
    config?: Record<string, unknown>,
  ) {
    super();
    this.defaultModel = (config?.['defaultModel'] as string) ?? 'grok-4';
    this.profiles = (config?.['profiles'] as Record<string, ModelProfile>) ?? {
      'grok-4': GROK_4,
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

  async generate(
    prompt: string,
    options?: { systemPrompt?: string; model?: string; maxTokens?: number; temperature?: number },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenant();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    if (!prompt) return DataProcessResult.failure('MISSING_PROMPT', 'prompt cannot be empty');

    const keyResult = this.keyResolver.requireKey('grok');
    if (!keyResult.isSuccess)
      return DataProcessResult.failure(keyResult.errorCode!, keyResult.errorMessage!);

    const usedModel = options?.model ?? this.defaultModel;
    const profile = this.profiles[usedModel];

    try {
      const client = this.clientFactory(keyResult.data!);
      const chat = client.chat.create({
        model: usedModel,
        max_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      });

      if (options?.systemPrompt) {
        chat.append(grokSystemMessage(options.systemPrompt));
      }
      chat.append(grokUserMessage(prompt));

      const response = await chat.sample();
      const text = response.content ?? '';
      const ti = response.usage.prompt_tokens;
      const to = response.usage.completion_tokens;
      const cost = profile ? estimateCost(profile, ti, to) : 0;

      return DataProcessResult.success({
        text,
        model: usedModel,
        tokens_used: { input: ti, output: to },
        cost,
        request_id: response.id || randomUUID(),
        provider: 'grok',
      });
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Grok error: ${err}`);
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
    const p = this.profiles[this.defaultModel] ?? GROK_4;
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
    const keyResult = this.keyResolver.requireKey('grok');
    if (!keyResult.isSuccess) return DataProcessResult.failure('NO_API_KEY', 'No Grok API key');
    try {
      const client = this.clientFactory(keyResult.data!);
      const chat = client.chat.create({ model: this.defaultModel, max_tokens: 1 });
      chat.append(grokUserMessage('ping'));
      await chat.sample();
      return DataProcessResult.success({ status: 'healthy', provider: 'grok' });
    } catch (err) {
      return DataProcessResult.failure('UNHEALTHY', `Grok health failed: ${err}`);
    }
  }
}
