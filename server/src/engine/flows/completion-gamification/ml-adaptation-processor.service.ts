import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

// MACHINE — neverFromConfig: these modules are always excluded from ML adaptation
const PROTECTED_MODULES: readonly string[] = ['core-onboarding', 'mandatory-compliance'];

export interface MLAdaptationProcessorInput {
  requestId: string;
  userId: string;
  tenantId: string;
  recommendedModules: string[];
  processedAt?: string;
}

export interface MLAdaptationProcessorResult {
  applied: boolean;
  reason?: 'COUNT_CEILING' | 'ALL_PROTECTED' | 'TOO_RECENT';
  adaptationRecordId?: string;
  appliedModules?: string[];
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className MLAdaptationProcessor
 */
@Injectable()
export class MLAdaptationProcessor extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T89',
        serviceName: 'MLAdaptationProcessor',
        flowId: 'FLOW-05',
      }),
    });
  }

  async process(
    input: MLAdaptationProcessorInput,
  ): Promise<DataProcessResult<MLAdaptationProcessorResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.requestId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'requestId is required');
      }
      if (!input.userId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'userId is required');
      }
      if (!input.tenantId) {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'tenantId is required');
      }

      // ── FREEDOM config ────────────────────────────────────────────────────
      const maxChanges = await this.readFreedomNumber(
        'freedom_configs',
        'flow05_ml_max_changes',
        5,
      );
      const cooldownDays = await this.readFreedomNumber(
        'freedom_configs',
        'flow05_ml_cooldown_days',
        7,
      );

      // ── Guard 1 — Count ceiling (IR-89-1) ────────────────────────────────
      if (input.recommendedModules.length > maxChanges) {
        return DataProcessResult.success({ applied: false, reason: 'COUNT_CEILING' });
      }

      // ── Guard 2 — Protected modules (IR-89-2) ────────────────────────────
      const modules = input.recommendedModules.filter((m) => !PROTECTED_MODULES.includes(m));
      if (modules.length === 0) {
        return DataProcessResult.success({ applied: false, reason: 'ALL_PROTECTED' });
      }

      // ── Guard 3 — Recency cooldown (IR-89-3) ─────────────────────────────
      const lastAdaptationResult = await this.dbFabric.searchDocuments('xiigen-ml-adaptations', {
        user_id: input.userId,
      });
      if (lastAdaptationResult.isSuccess && (lastAdaptationResult.data ?? []).length > 0) {
        const lastRecord = lastAdaptationResult.data![0] as Record<string, unknown>;
        const lastAdaptedAt = lastRecord['adapted_at'];
        if (typeof lastAdaptedAt === 'string') {
          // Use input.processedAt as the cooldown reference clock — matches
          // the clock used for the stored `adapted_at` field below, so the
          // cooldown window is computed against a deterministic, caller-supplied time.
          const utcNow = input.processedAt ? new Date(input.processedAt).getTime() : Date.now();
          const daysSinceLast = (utcNow - new Date(lastAdaptedAt).getTime()) / 86400000;
          if (daysSinceLast < cooldownDays) {
            return DataProcessResult.success({ applied: false, reason: 'TOO_RECENT' });
          }
        }
      }

      // ── All guards pass — store then emit (DNA-8) ─────────────────────────
      const adaptationRecordId = `mla-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
      const now = input.processedAt ?? new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument('xiigen-ml-adaptations', {
        adaptation_record_id: adaptationRecordId,
        request_id: input.requestId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        applied_modules: modules,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        adapted_at: now,
      });

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          storeResult.errorCode ?? 'STORE_FAILURE',
          storeResult.errorMessage ?? 'Failed to store ML adaptation record',
        );
      }

      await this.queueFabric.enqueue('ml.adaptation.completed', {
        adaptationRecordId,
        requestId: input.requestId,
        userId: input.userId,
        tenantId: input.tenantId,
        appliedModules: modules,
        adaptedAt: now,
      });

      return DataProcessResult.success({
        applied: true,
        adaptationRecordId,
        appliedModules: modules,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      return DataProcessResult.failure('ML_ADAPTATION_PROCESSOR_ERROR', message);
    }
  }

  private async readFreedomNumber(index: string, key: string, defaultVal: number): Promise<number> {
    const cfg = await this.dbFabric.searchDocuments(index, {
      task_type: 'xiigen-engine',
      config_key: key,
    });
    if (!cfg.isSuccess || (cfg.data ?? []).length === 0) return defaultVal;
    const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
    return typeof val === 'number' ? val : defaultVal;
  }
}
