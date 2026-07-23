/**
 * CurriculumTierAssigner (T597) — FLOW-39 Phase A
 *
 * Assigns a curriculum tier to a DPO triple based on the task type's archetype.
 *
 * Iron rules:
 *   CF-803: CurriculumTierAssigner MUST run BEFORE any DPO triple is marked VALIDATED.
 *           Tier assignment is a required field, not optional metadata.
 *   IRON-TIER-MAP: Archetype-to-tier mapping is MACHINE constant — never read from config.
 *                  ROUTING=1, DATA_PIPELINE=2, PROCESSING=3, ORCHESTRATION=4, SCHEDULED=5.
 *   DNA-7: Idempotency key checked BEFORE any tier write — same triple = same tier.
 *   DNA-8: storeDocument() BEFORE enqueue(CurriculumTierAssigned).
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

const TIERS_INDEX = 'xiigen-curriculum-tiers';

/** IRON-TIER-MAP: this mapping is MACHINE — never from config. */
export const ARCHETYPE_TIER_MAP: Record<string, number> = {
  ROUTING: 1,
  DATA_PIPELINE: 2,
  PROCESSING: 3,
  ORCHESTRATION: 4,
  SCHEDULED: 5,
} as const;

export interface AssignTierOptions {
  dpoTripleId: string;
  taskTypeId: string;
  archetype: string;
}

export interface AssignTierResult {
  dpoTripleId: string;
  curriculumTier: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-39
 * @portability MOBILE - no direct tenant context, fabric-only persistence and queueing
 * @className CurriculumTierAssigner
 */
@Injectable()
export class CurriculumTierAssigner extends MicroserviceBase {
  private readonly logger = new Logger(CurriculumTierAssigner.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T597',
        serviceName: 'CurriculumTierAssigner',
        flowId: 'FLOW-39',
      }),
    });
  }

  async assign(options: AssignTierOptions): Promise<DataProcessResult<AssignTierResult>> {
    try {
      const { dpoTripleId, taskTypeId, archetype } = options;

      if (!dpoTripleId) {
        return DataProcessResult.failure('MISSING_DPO_TRIPLE_ID', 'dpoTripleId is required');
      }
      if (!archetype) {
        return DataProcessResult.failure('MISSING_ARCHETYPE', 'archetype is required');
      }

      // IRON-TIER-MAP: mapping is MACHINE — read from constant, never from config
      const curriculumTier = ARCHETYPE_TIER_MAP[archetype.toUpperCase()];
      if (curriculumTier === undefined) {
        return DataProcessResult.failure(
          'UNKNOWN_ARCHETYPE',
          `Archetype "${archetype}" is not in IRON-TIER-MAP. Valid: ${Object.keys(ARCHETYPE_TIER_MAP).join(', ')}`,
        );
      }

      // DNA-7: idempotency — check before any write
      const idempotencyKey = `tier-assign-${dpoTripleId}`;
      const existingCheck = await this.dbFabric.searchDocuments(TIERS_INDEX, { idempotencyKey }, 1);
      if (existingCheck.isSuccess && (existingCheck.data ?? []).length > 0) {
        const existing = existingCheck.data![0] as Record<string, unknown>;
        this.logger.log(
          `CurriculumTierAssigner: dpoTriple ${dpoTripleId} already assigned tier ${existing['curriculumTier']} — returning existing`,
        );
        return DataProcessResult.success(existing['assignResult'] as AssignTierResult);
      }

      const assignResult: AssignTierResult = { dpoTripleId, curriculumTier };

      const tierRecord: Record<string, unknown> = {
        idempotencyKey,
        dpoTripleId,
        taskTypeId,
        archetype,
        curriculumTier,
        assignResult,
        assignedAt: new Date().toISOString(),
      };

      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.dbFabric.storeDocument(TIERS_INDEX, tierRecord, dpoTripleId);
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'TIER_STORE_FAILED',
          `Failed to store curriculum tier for ${dpoTripleId}: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      await this.queueFabric.enqueue('CurriculumTierAssigned', {
        dpoTripleId,
        taskTypeId,
        curriculumTier,
      });

      this.logger.log(
        `CurriculumTierAssigner: dpoTriple=${dpoTripleId} archetype=${archetype} tier=${curriculumTier}`,
      );
      return DataProcessResult.success(assignResult);
    } catch (err) {
      return DataProcessResult.failure(
        'TIER_ASSIGNER_ERROR',
        `CurriculumTierAssigner threw: ${String(err)}`,
      );
    }
  }
}
