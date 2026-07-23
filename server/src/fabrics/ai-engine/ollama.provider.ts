/**
 * Ollama Provider — IAiProvider implementation for local Ollama models.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * Uses Ollama REST API (/api/chat — instruct-model format with messages array).
 * No API key required. Cost is always $0.00 — local inference.
 *
 * DNA: DataProcessResult (3), tenant from CLS (5), dict payloads (1).
 *
 * Phase 6: Open-source LLM integration.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IAiProvider, AiModelRole } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

/** Ollama /api/chat response shape. */
interface OllamaChatResponse {
  model: string;
  message: { role: string; content: string };
  done: boolean;
  eval_count?: number;
  prompt_eval_count?: number;
  total_duration?: number;
}

const DEFAULT_OLLAMA_REQUEST_TIMEOUT_MS = 60_000;

export interface OllamaConfig {
  /** Ollama server base URL. Default: http://localhost:11434 */
  baseUrl?: string;
  /** Model name to use, e.g. 'qwen2.5-coder:7b'. Default: 'qwen2.5-coder:7b' */
  model?: string;
  /** Maximum tokens to generate (num_predict). Default: 2048 */
  maxOutputTokens?: number;
  /** Request timeout for Ollama HTTP calls. Default: 60000ms */
  requestTimeoutMs?: number;
}

@Injectable()
export class OllamaProvider extends IAiProvider {
  private readonly baseUrl: string;
  private readonly model: string;
  private readonly maxOutputTokens: number;
  private readonly requestTimeoutMs: number;

  constructor(
    private readonly cls: ClsService,
    config?: OllamaConfig,
  ) {
    super();
    this.baseUrl = (config?.baseUrl ?? 'http://localhost:11434').replace(/\/$/, '');
    this.model = config?.model ?? 'qwen2.5-coder:7b';
    this.maxOutputTokens = config?.maxOutputTokens ?? 2048;
    this.requestTimeoutMs = config?.requestTimeoutMs ?? DEFAULT_OLLAMA_REQUEST_TIMEOUT_MS;
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

    const usedModel = options?.model ?? this.model;
    const numPredict = options?.maxTokens ?? this.maxOutputTokens;

    const messages: Array<{ role: string; content: string }> = [];
    if (options?.systemPrompt) {
      messages.push({ role: 'system', content: options.systemPrompt });
    }
    messages.push({ role: 'user', content: prompt });

    const body: Record<string, unknown> = {
      model: usedModel,
      messages,
      stream: false,
      options: {
        num_predict: numPredict,
        ...(options?.temperature !== undefined && { temperature: options.temperature }),
      },
    };

    const startMs = Date.now();

    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/chat`, {
        method: 'POST',
        headers: { 'content-type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!response.ok) {
        const errText = await response.text();
        if (response.status === 404 && errText.includes('model')) {
          return DataProcessResult.failure(
            'MODEL_NOT_FOUND',
            `Ollama model not found: ${usedModel}`,
          );
        }
        return DataProcessResult.failure(
          'PROVIDER_ERROR',
          `Ollama API ${response.status}: ${errText}`,
        );
      }

      const data = (await response.json()) as OllamaChatResponse;
      const latencyMs = Date.now() - startMs;
      const text = data.message?.content ?? '';
      const inputTokens = data.prompt_eval_count ?? 0;
      const outputTokens = data.eval_count ?? 0;

      return DataProcessResult.success({
        text,
        model: data.model ?? usedModel,
        model_id: usedModel,
        tokens_used: { input: inputTokens, output: outputTokens },
        cost: 0,
        cost_usd: 0,
        request_id: randomUUID(),
        provider: 'ollama',
        latency_ms: latencyMs,
        tenant_id: tenantResult.data!.tenantId,
      });
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Ollama error: ${this.formatFetchError(err)}`);
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

    const schemaInstruction = `Respond ONLY with valid JSON matching this schema: ${JSON.stringify(outputSchema)}`;
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
        cost: 0,
        cost_usd: 0,
        request_id: result.data!['request_id'],
      });
    } catch (err) {
      return DataProcessResult.failure('PARSE_ERROR', `Failed to parse structured output: ${err}`);
    }
  }

  getModelInfo(): Record<string, unknown> {
    return {
      provider: 'ollama',
      model_id: this.model,
      display_name: `Ollama / ${this.model}`,
      max_tokens: this.maxOutputTokens,
      context_window: 32768,
      role: AiModelRole.PRIMARY,
      cost_per_input_token: 0,
      cost_per_output_token: 0,
      base_url: this.baseUrl,
    };
  }

  /** Check if Ollama is reachable and the configured model exists. */
  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      const response = await this.fetchWithTimeout(`${this.baseUrl}/api/tags`);
      if (!response.ok) {
        return DataProcessResult.failure(
          'UNHEALTHY',
          `Ollama unreachable: HTTP ${response.status}`,
        );
      }
      const data = (await response.json()) as { models?: Array<{ name: string }> };
      const models = (data.models ?? []).map((m) => m.name);
      const hasModel = models.some(
        (m) => m === this.model || m.startsWith(this.model.split(':')[0]),
      );
      return DataProcessResult.success({
        status: 'healthy',
        provider: 'ollama',
        base_url: this.baseUrl,
        model: this.model,
        model_available: hasModel,
        available_models: models,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'UNHEALTHY',
        `Ollama health check failed: ${this.formatFetchError(err)}`,
      );
    }
  }

  private async fetchWithTimeout(url: string, init?: RequestInit): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.requestTimeoutMs);
    try {
      return await fetch(url, { ...init, signal: controller.signal });
    } finally {
      clearTimeout(timer);
    }
  }

  private formatFetchError(err: unknown): string {
    if (err instanceof Error && err.name === 'AbortError') {
      return `request timed out after ${this.requestTimeoutMs}ms`;
    }
    return err instanceof Error ? err.message : String(err);
  }
}
