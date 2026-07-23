/**
 * AI Engine Fabric — AiDispatcher (Parallel Multi-Model + Consensus).
 * Implements IAiDispatcher from fabrics/interfaces.
 *
 * AF-5 (Multi-model orchestration): runs competing models in parallel.
 * AF-10 (Merge): scores outputs via OutputScorer, selects best.
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 *     Per-model timeout via Promise.race.
 *     Dynamic provider registration/unregistration.
 */

import { Injectable, Optional } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { IAiDispatcher, IAiProvider } from '../interfaces/ai-provider.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { OutputScorer } from './scoring';
import { CostTracker } from './cost-tracker';

@Injectable()
export class AiDispatcher extends IAiDispatcher {
  private readonly providers = new Map<string, IAiProvider>();
  private readonly scorer: OutputScorer;
  private readonly timeoutMs: number;

  constructor(
    private readonly cls: ClsService,
    @Optional() scorer?: OutputScorer,
    @Optional() config?: { timeoutSeconds?: number },
    @Optional() private readonly costTracker?: CostTracker,
  ) {
    super();
    this.scorer = scorer ?? new OutputScorer();
    this.timeoutMs = (config?.timeoutSeconds ?? 30) * 1000;
  }

  /** Record cost to CostTracker using tenant from CLS. Silently no-ops if costTracker absent. */
  private recordCost(modelId: string, data: Record<string, unknown>): void {
    if (!this.costTracker) return;
    const tenantResult = this.getTenant();
    const tenantId = tenantResult.data?.tenantId ?? 'unknown';
    const tokensIn = (data['tokens_used'] as Record<string, number> | undefined)?.input ?? 0;
    const tokensOut = (data['tokens_used'] as Record<string, number> | undefined)?.output ?? 0;
    const cost = (data['cost'] as number) ?? 0;
    this.costTracker.record(tenantId, modelId, tokensIn, tokensOut, cost);
  }

  // ── Provider management ────────────────────────────

  registerProvider(modelId: string, provider: IAiProvider): void {
    this.providers.set(modelId, provider);
  }

  unregisterProvider(modelId: string): boolean {
    return this.providers.delete(modelId);
  }

  get registeredModels(): string[] {
    return Array.from(this.providers.keys());
  }

  // ── Tenant resolution ──────────────────────────────

  private getTenant(): DataProcessResult<TenantContext> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  // ── IAiDispatcher Implementation ───────────────────

  async generateWithConsensus(
    prompt: string,
    modelIds: string[],
    options?: {
      systemPrompt?: string;
      judgeRubric?: Record<string, unknown>;
    },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenant();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }

    if (!prompt) {
      return DataProcessResult.failure('MISSING_PROMPT', 'prompt required');
    }
    if (!modelIds || modelIds.length === 0) {
      return DataProcessResult.failure('NO_MODELS', 'model_ids list is empty');
    }

    // Filter to registered models
    const validIds = modelIds.filter((id) => this.providers.has(id));
    if (validIds.length === 0) {
      return DataProcessResult.failure(
        'NO_VALID_MODELS',
        `None of [${modelIds.join(', ')}] are registered. Available: [${this.registeredModels.join(', ')}]`,
      );
    }

    // Run all models in parallel with per-model timeout
    const tasks = validIds.map((mid) => this.runWithTimeout(mid, prompt, options?.systemPrompt));
    const settled = await Promise.allSettled(tasks);

    // Collect outputs
    const allOutputs: Array<Record<string, unknown>> = [];
    for (let i = 0; i < validIds.length; i++) {
      const mid = validIds[i];
      const result = settled[i];

      if (result.status === 'rejected') {
        allOutputs.push({ model_id: mid, text: '', error: String(result.reason), cost: 0 });
      } else {
        const dpr = result.value;
        if (dpr.isSuccess) {
          const entry = { ...dpr.data! };
          entry['model_id'] = mid;
          allOutputs.push(entry);
        } else {
          allOutputs.push({ model_id: mid, text: '', error: dpr.errorMessage, cost: 0 });
        }
      }
    }

    // Filter successful (non-empty text)
    const successful = allOutputs.filter((o) => {
      const text = o['text'];
      return typeof text === 'string' && text.length > 0;
    });

    if (successful.length === 0) {
      const errors = allOutputs.map((o) => o['error'] ?? 'unknown');
      return DataProcessResult.failure(
        'ALL_MODELS_FAILED',
        `All ${validIds.length} models failed. Errors: [${errors.join('; ')}]`,
      );
    }

    // Score and select best
    const rubric = options?.judgeRubric as Record<string, number> | undefined;
    const scored = this.scorer.scoreOutputs(successful, rubric);
    const best = scored[0] ?? successful[0];

    const totalCost = allOutputs.reduce((sum, o) => sum + ((o['cost'] as number) ?? 0), 0);

    return DataProcessResult.success({
      text: best['text'],
      model_used: best['model_id'],
      scores: scored,
      all_outputs: allOutputs,
      cost: totalCost,
      models_attempted: validIds.length,
      models_succeeded: successful.length,
    });
  }

  async generateSingle(
    prompt: string,
    modelId: string,
    options?: { systemPrompt?: string },
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenant();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }

    if (!prompt) {
      return DataProcessResult.failure('MISSING_PROMPT', 'prompt required');
    }

    const provider = this.providers.get(modelId);
    if (!provider) {
      return DataProcessResult.failure(
        'MODEL_NOT_FOUND',
        `Model '${modelId}' not registered. Available: [${this.registeredModels.join(', ')}]`,
      );
    }

    const result = await provider.generate(prompt, {
      systemPrompt: options?.systemPrompt,
    });

    if (result.isSuccess) {
      const data = { ...result.data! };
      data['model_id'] = modelId;
      this.recordCost(modelId, data);
      return DataProcessResult.success(data);
    }
    return result;
  }

  // ── Health Check ──────────────────────────────────

  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    const results: Record<string, boolean> = {};

    for (const [mid, prov] of this.providers.entries()) {
      const providerWithHealth = prov as unknown as Record<string, unknown>;
      if (typeof providerWithHealth['healthCheck'] === 'function') {
        try {
          const h = await (
            providerWithHealth['healthCheck'] as () => Promise<{ isSuccess?: boolean } | boolean>
          )();
          results[mid] = (h as { isSuccess?: boolean })?.isSuccess ?? Boolean(h);
        } catch {
          results[mid] = false;
        }
      } else {
        results[mid] = true;
      }
    }

    const allHealthy = Object.keys(results).length > 0 && Object.values(results).every((v) => v);

    if (allHealthy) {
      return DataProcessResult.success({ status: 'healthy', models: results });
    }
    return DataProcessResult.failure(
      'PARTIAL_UNHEALTHY',
      `Some models unhealthy: ${JSON.stringify(results)}`,
    );
  }

  // ── Internal: run with timeout ─────────────────────

  private async runWithTimeout(
    modelId: string,
    prompt: string,
    systemPrompt?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const provider = this.providers.get(modelId);
    if (!provider) {
      return DataProcessResult.failure('MODEL_NOT_FOUND', `${modelId} not registered`);
    }

    let timeoutHandle: ReturnType<typeof setTimeout> | null = null;
    try {
      const generatePromise = provider.generate(prompt, { systemPrompt });

      const timeoutPromise = new Promise<DataProcessResult<Record<string, unknown>>>(
        (_, reject) => {
          // Store reference so we can cancel the timer when generatePromise wins
          // the race — without this the 30s timer outlives the test worker.
          timeoutHandle = setTimeout(() => {
            reject(new Error(`Model ${modelId} timed out after ${this.timeoutMs}ms`));
          }, this.timeoutMs);
        },
      );

      const result = await Promise.race([generatePromise, timeoutPromise]);
      if (result.isSuccess && result.data) {
        this.recordCost(modelId, result.data);
      }
      return result;
    } catch (err) {
      return DataProcessResult.failure('PROVIDER_ERROR', `Model ${modelId} error: ${err}`);
    } finally {
      if (timeoutHandle !== null) clearTimeout(timeoutHandle);
    }
  }
}
