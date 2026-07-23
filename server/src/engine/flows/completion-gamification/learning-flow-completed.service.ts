/**
 * LearningFlowCompleted (T98) — FLOW-05 Phase 1F
 * Single responsibility: completion gate for Branch A of the gamification pipeline.
 *
 * Iron rules:
 *   IR-98-1: This service is triggered by GamificationBatchStored (Branch A ONLY).
 *            NEVER wire to MLAdaptationCompleted or SocialDistributionCompleted.
 *            Branches B and C are time-decoupled — waiting for them violates <1s UX SLA.
 *   IR-98-2: DNA-8 — storeDocument(completion summary) BEFORE learning.flow.completed emitted.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *
 * Machine constant: COMPLETION_GATE_BRANCH = 'BRANCH_A_ONLY' — never from config.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const COMPLETIONS_INDEX = 'xiigen-learning-flow-completions';

/** Machine constant: this gate fires on Branch A only — never configurable. */
const COMPLETION_GATE_BRANCH = 'BRANCH_A_ONLY' as const;

export interface LearningFlowCompletedInput {
  completionId: string;
  questionnaireId: string;
  userId: string;
  tenantId: string;
  /** From T85 GamificationBatchStored payload. */
  ledgerEntryId: string;
  effectiveTotal: number;
  /** From T86 LevelUpChecker output (may be absent if no level-up occurred). */
  levelUp?: boolean;
  newLevel?: number;
  /** From T87 AchievementGate output (may be empty). */
  unlockedAchievements?: string[];
  processedAt?: string;
}

export interface LearningFlowCompletedResult {
  completionSummaryId: string;
  eventEmitted: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className LearningFlowCompleted
 */
@Injectable()
export class LearningFlowCompleted extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T98',
        serviceName: 'LearningFlowCompleted',
        flowId: 'FLOW-05',
      }),
    });
  }

  async complete(
    input: LearningFlowCompletedInput,
  ): Promise<DataProcessResult<LearningFlowCompletedResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.completionId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'LearningFlowCompleted: completionId, userId, and tenantId are required',
        );
      }
      if (!input.ledgerEntryId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'LearningFlowCompleted: ledgerEntryId is required (must come from GamificationBatchStored)',
        );
      }

      const now = input.processedAt ?? new Date().toISOString();
      const completionSummaryId = `lfc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        completion_summary_id: completionSummaryId,
        completion_id: input.completionId,
        questionnaire_id: input.questionnaireId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        ledger_entry_id: input.ledgerEntryId,
        effective_total: input.effectiveTotal,
        level_up: input.levelUp ?? false,
        new_level: input.newLevel ?? null,
        unlocked_achievements: input.unlockedAchievements ?? [],
        // IR-98-1: document which branch triggered this gate
        completion_gate_branch: COMPLETION_GATE_BRANCH,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        completed_at: now,
      };

      // IR-98-2 / DNA-8: store BEFORE emit
      const stored = await this.dbFabric.storeDocument(COMPLETIONS_INDEX, doc, completionSummaryId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueFabric.enqueue('learning.flow.completed', {
        completionSummaryId,
        completionId: input.completionId,
        questionnaireId: input.questionnaireId,
        userId: input.userId,
        tenantId: input.tenantId,
        ledgerEntryId: input.ledgerEntryId,
        effectiveTotal: input.effectiveTotal,
        levelUp: input.levelUp ?? false,
        newLevel: input.newLevel ?? null,
        unlockedAchievements: input.unlockedAchievements ?? [],
        completedAt: now,
      });

      return DataProcessResult.success({ completionSummaryId, eventEmitted: true });
    } catch (err) {
      return DataProcessResult.failure(
        'LEARNING_FLOW_COMPLETED_ERROR',
        `LearningFlowCompleted threw: ${String(err)}`,
      );
    }
  }
}
