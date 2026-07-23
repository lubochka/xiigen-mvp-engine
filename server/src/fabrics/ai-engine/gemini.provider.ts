/**
 * Gemini Provider — IAiProvider implementation for Google Gemini models.
 * Uses google-genai SDK pattern: system prompt via config (not concatenated).
 * v4: Per-tenant API key resolution via TenantKeyResolver.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IAiProvider, AiModelRole } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { TenantKeyResolver } from '../../kernel/multi-tenant/tenant-key.resolver';
import { IGeminiClient, GeminiGenerateContentConfig } from './protocols';
import {
  ModelProfile,
  GEMINI_2_5_PRO,
  GEMINI_2_5_FLASH,
  GEMINI_2_5_FLASH_LITE,
  GEMINI_TIER_DEFAULTS,
  roleToTier,
  estimateCost,
} from './base';

export type GeminiClientFactory = (apiKey: string) => IGeminiClient;

@Injectable()
export class GeminiProvider extends IAiProvider {
  private readonly defaultModel: string;
  private readonly profiles: Record<string, ModelProfile>;

  constructor(
    private readonly cls: ClsService,
    private readonly keyResolver: TenantKeyResolver,
    private readonly clientFactory: GeminiClientFactory,
    config?: Record<string, unknown>,
  ) {
    super();
    this.defaultModel = (config?.['defaultModel'] as string) ?? 'gemini-2.5-pro';
    this.profiles = (config?.['profiles'] as Record<string, ModelProfile>) ?? {
      'gemini-2.5-pro': GEMINI_2_5_PRO,
      'gemini-2.5-flash': GEMINI_2_5_FLASH,
      'gemini-2.5-flash-lite': GEMINI_2_5_FLASH_LITE,
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
    return GEMINI_TIER_DEFAULTS[tier];
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

    const keyResult = this.keyResolver.requireKey('google');
    if (!keyResult.isSuccess)
      return DataProcessResult.failure(keyResult.errorCode!, keyResult.errorMessage!);

    const usedModel = options?.model ?? this.selectModelForRole(options?.role) ?? this.defaultModel;
    const profile = this.profiles[usedModel];

    try {
      const client = this.clientFactory(keyResult.data!);
      const config: GeminiGenerateContentConfig = {
        max_output_tokens: options?.maxTokens ?? 4096,
        temperature: options?.temperature ?? 0.7,
      };
      if (options?.systemPrompt) {
        config.system_instruction = options.systemPrompt;
      }

      const response = await client.aio.models.generate_content({
        model: usedModel,
        contents: prompt,
        config,
      });

      const text = response.text ?? '';
      const ti = response.usage_metadata.prompt_token_count;
      const to = response.usage_metadata.candidates_token_count;
      const thinking = response.usage_metadata.thoughts_token_count ?? 0;
      const cost = profile ? estimateCost(profile, ti, to, thinking) : 0;

      return DataProcessResult.success({
        text,
        model: usedModel,
        tokens_used: { input: ti, output: to, thinking },
        cost,
        request_id: randomUUID(),
        provider: 'google',
      });
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Gemini error: ${err}`);
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
    const p = this.profiles[this.defaultModel] ?? GEMINI_2_5_PRO;
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
    const keyResult = this.keyResolver.requireKey('google');
    if (!keyResult.isSuccess) return DataProcessResult.failure('NO_API_KEY', 'No Google API key');
    try {
      const client = this.clientFactory(keyResult.data!);
      await client.aio.models.generate_content({
        model: this.defaultModel,
        contents: 'ping',
        config: { max_output_tokens: 1 },
      });
      return DataProcessResult.success({ status: 'healthy', provider: 'google' });
    } catch (err) {
      return DataProcessResult.failure('UNHEALTHY', `Gemini health failed: ${err}`);
    }
  }
}
