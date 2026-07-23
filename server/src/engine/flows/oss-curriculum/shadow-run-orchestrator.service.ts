/**
 * ShadowRunOrchestrator (T598) — FLOW-39 Phase A
 *
 * Submits shadow comparison runs of the winning NODE against configured OSS models.
 * Does NOT await OSS responses — async, non-blocking (IRON-ASYNC).
 *
 * Iron rules:
 *   CF-804: Every shadow run record MUST include ossModel and cycleId fields.
 *   IRON-ASYNC: Shadow run is async — primary cycle must not block awaiting OSS responses.
 *   DNA-8: storeDocument() per shadow run record BEFORE enqueue(ShadowRunsSubmitted).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

const SHADOW_RUNS_INDEX = 'xiigen-shadow-runs';

/** Default OSS models for shadow comparison — overridable via FREEDOM config. */
export const DEFAULT_OSS_MODELS = ['llama3:8b', 'codellama:13b', 'deepseek-coder:6.7b'] as const;

export interface OrchestrateOptions {
  dpoTripleId: string;
  winningNodeId: string;
  curriculumTier: number;
  cycleId: string;
  taskTypeId?: string;
  ossModels?: string[];
}

export interface OrchestrateResult {
  shadowRunIds: string[];
  submittedModels: string[];
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-39
 * @portability MOBILE - no direct tenant context, fabric-only shadow run orchestration
 * @className ShadowRunOrchestrator
 */
@Injectable()
export class ShadowRunOrchestrator extends MicroserviceBase {
  private readonly logger = new Logger(ShadowRunOrchestrator.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T598',
        serviceName: 'ShadowRunOrchestrator',
        flowId: 'FLOW-39',
      }),
    });
  }

  async orchestrate(options: OrchestrateOptions): Promise<DataProcessResult<OrchestrateResult>> {
    try {
      const { dpoTripleId, winningNodeId, curriculumTier, cycleId, taskTypeId, ossModels } =
        options;

      if (!dpoTripleId) {
        return DataProcessResult.failure('MISSING_DPO_TRIPLE_ID', 'dpoTripleId is required');
      }
      if (!winningNodeId) {
        return DataProcessResult.failure('MISSING_WINNING_NODE_ID', 'winningNodeId is required');
      }
      if (!cycleId) {
        return DataProcessResult.failure('MISSING_CYCLE_ID', 'cycleId is required');
      }

      const models = ossModels && ossModels.length > 0 ? ossModels : [...DEFAULT_OSS_MODELS];
      const shadowRunIds: string[] = [];

      // DNA-8: storeDocument per model BEFORE enqueue
      for (const ossModel of models) {
        const shadowRunId = `SR-${dpoTripleId}-${ossModel}-${cycleId}`;

        // CF-804: ossModel + cycleId are REQUIRED fields on every shadow run record
        const shadowRunRecord: Record<string, unknown> = {
          shadowRunId,
          ossModel, // CF-804 required
          cycleId, // CF-804 required
          dpoTripleId,
          winningNodeId,
          curriculumTier,
          taskTypeId: taskTypeId ?? null,
          grade: null,
          status: 'PENDING',
          submittedAt: new Date().toISOString(),
        };

        const storeResult = await this.dbFabric.storeDocument(
          SHADOW_RUNS_INDEX,
          shadowRunRecord,
          shadowRunId,
        );
        if (!storeResult.isSuccess) {
          return DataProcessResult.failure(
            'SHADOW_RUN_STORE_FAILED',
            `Failed to store shadow run for ${ossModel}: ${storeResult.errorMessage ?? 'unknown'}`,
          );
        }

        shadowRunIds.push(shadowRunId);
      }

      // IRON-ASYNC: emit immediately — do NOT await OSS grade responses
      await this.queueFabric.enqueue('ShadowRunsSubmitted', {
        dpoTripleId,
        cycleId,
        shadowRunIds,
        submittedModels: models,
        curriculumTier,
      });

      this.logger.log(
        `ShadowRunOrchestrator: dpoTriple=${dpoTripleId} cycle=${cycleId} submitted ${models.length} shadow runs`,
      );
      return DataProcessResult.success({
        shadowRunIds,
        submittedModels: models,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'SHADOW_RUN_ORCHESTRATOR_ERROR',
        `ShadowRunOrchestrator threw: ${String(err)}`,
      );
    }
  }
}
