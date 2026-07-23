/**
 * Mock AI Provider — deterministic responses for testing.
 * Implements IAiProvider with configurable canned responses.
 *
 * Features: call history tracking, configurable failure mode,
 * token simulation, cost tracking, per-tenant call filtering.
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IAiProvider } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

export interface MockAiProviderOptions {
  modelId?: string;
  defaultResponse?: string;
  structuredResponse?: Record<string, unknown>;
  shouldFail?: boolean;
  failMessage?: string;
  tokensPerResponse?: number;
  costPerCall?: number;
}

@Injectable()
export class MockAiProvider extends IAiProvider {
  private modelId: string;
  private defaultResponse: string;
  private structuredResponse: Record<string, unknown>;
  private shouldFail: boolean;
  private failMessage: string;
  private tokensPerResponse: number;
  private costPerCall: number;
  private readonly _callHistory: Array<Record<string, unknown>> = [];

  constructor(
    private readonly cls: ClsService,
    options?: MockAiProviderOptions,
  ) {
    super();
    this.modelId = options?.modelId ?? 'mock-model-v1';
    this.defaultResponse = options?.defaultResponse ?? 'Mock AI response';
    this.structuredResponse = options?.structuredResponse ?? { result: 'mock_structured' };
    this.shouldFail = options?.shouldFail ?? false;
    this.failMessage = options?.failMessage ?? 'Mock provider error';
    this.tokensPerResponse = options?.tokensPerResponse ?? 50;
    this.costPerCall = options?.costPerCall ?? 0.001;
  }

  private getTenantId(): string | undefined {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      return tenant?.tenantId;
    } catch {
      return undefined;
    }
  }

  async generate(
    prompt: string,
    options?: {
      systemPrompt?: string;
      model?: string;
      maxTokens?: number;
      temperature?: number;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();

    const callRecord: Record<string, unknown> = {
      method: 'generate',
      tenant_id: tenantId,
      prompt,
      system_prompt: options?.systemPrompt,
      model: options?.model ?? this.modelId,
      max_tokens: options?.maxTokens ?? 4096,
      temperature: options?.temperature ?? 0.7,
    };
    this._callHistory.push(callRecord);

    if (this.shouldFail) {
      return DataProcessResult.failure('PROVIDER_ERROR', this.failMessage);
    }

    const usedModel = options?.model ?? this.modelId;
    const maxTok = options?.maxTokens ?? 4096;
    const tokensOut = Math.min(this.tokensPerResponse, maxTok);
    const tokensIn = Math.max(Math.floor(prompt.length / 4), 1);

    return DataProcessResult.success({
      text: this.defaultResponse,
      model: usedModel,
      tokens_used: { input: tokensIn, output: tokensOut },
      cost: this.costPerCall,
      request_id: randomUUID(),
    });
  }

  async generateStructured(
    prompt: string,
    outputSchema: Record<string, unknown>,
    options?: {
      systemPrompt?: string;
      model?: string;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();

    if (
      !outputSchema ||
      typeof outputSchema !== 'object' ||
      Object.keys(outputSchema).length === 0
    ) {
      return DataProcessResult.failure(
        'INVALID_SCHEMA',
        'output_schema must be a non-empty object',
      );
    }

    const callRecord: Record<string, unknown> = {
      method: 'generate_structured',
      tenant_id: tenantId,
      prompt,
      output_schema: outputSchema,
      system_prompt: options?.systemPrompt,
      model: options?.model ?? this.modelId,
    };
    this._callHistory.push(callRecord);

    if (this.shouldFail) {
      return DataProcessResult.failure('PROVIDER_ERROR', this.failMessage);
    }

    const usedModel = options?.model ?? this.modelId;
    const tokensIn = Math.max(Math.floor(prompt.length / 4), 1);

    return DataProcessResult.success({
      data: structuredClone(this.structuredResponse),
      model: usedModel,
      tokens_used: { input: tokensIn, output: this.tokensPerResponse },
      cost: this.costPerCall,
      request_id: randomUUID(),
    });
  }

  getModelInfo(): Record<string, unknown> {
    return {
      provider: 'mock',
      model_id: this.modelId,
      display_name: `Mock (${this.modelId})`,
      max_tokens: 4096,
      context_window: 128_000,
      cost_per_input_token: 0.0,
      cost_per_output_token: this.costPerCall / Math.max(this.tokensPerResponse, 1),
      capabilities: { structured_output: true, mock: true },
      version: 'mock-1.0',
    };
  }

  // ── Testing helpers ─────────────────────────────────

  get callCount(): number {
    return this._callHistory.length;
  }

  get callHistory(): Array<Record<string, unknown>> {
    return [...this._callHistory];
  }

  getCallsForTenant(tenantId: string): Array<Record<string, unknown>> {
    return this._callHistory.filter((c) => c['tenant_id'] === tenantId);
  }

  reset(): void {
    this._callHistory.length = 0;
  }

  setResponse(response: string): void {
    this.defaultResponse = response;
  }

  setStructuredResponse(response: Record<string, unknown>): void {
    this.structuredResponse = response;
  }

  setShouldFail(fail: boolean, message = 'Mock error'): void {
    this.shouldFail = fail;
    this.failMessage = message;
  }
}
