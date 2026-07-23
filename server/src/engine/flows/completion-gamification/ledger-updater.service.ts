/**
 * LedgerUpdater (T85) — FLOW-05 Phase 1C
 * Single responsibility: atomic gamification ledger update merging T84 + T96 outputs.
 *
 * Iron rules:
 *   IR-85-1: incrementAndRecord() is ONE atomic DB operation — not a separate
 *            read-then-increment-then-write sequence. Two writes create a race window:
 *            concurrent completions read the same balance, both increment, last write wins
 *            and points are lost. ONE storeDocument call embeds the increment in the record.
 *   IR-85-2: DNA-8 — storeDocument(ledger entry) BEFORE GamificationBatchStored emitted.
 *            If the process crashes after emit, T86/T87/T98 receive GamificationBatchStored
 *            for a ledger entry that does not exist.
 *   IR-85-3: Streak multiplier from T96 applied here at merge time.
 *            T84 outputs multiplier=1.0 (placeholder). T85 reads streakMultiplier from T96
 *            output and applies it: effectiveTotal = (base + bonus) * streakMultiplier.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *   DNA-5:   tenantId from input — no direct CLS access in this service.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const LEDGER_INDEX = 'xiigen-gamification-ledger';

/** Point breakdown forwarded from T84. */
export interface PointBreakdownInput {
  base: number;
  bonus: number;
  multiplier: number; // T84 sets this to 1.0 — T85 overrides with streakMultiplier
  total: number;
}

/** Streak data forwarded from T96. */
export interface StreakDataInput {
  currentStreak: number;
  longestStreak: number;
  streakUpdatedAt: string;
  /** Multiplier applied to (base + bonus) — 1.0 baseline, >1.0 on active streak. */
  streakMultiplier: number;
}

export interface LedgerUpdaterInput {
  completionId: string;
  questionnaireId: string;
  userId: string;
  tenantId: string;
  pointBreakdown: PointBreakdownInput;
  streakData: StreakDataInput;
  processedAt?: string;
}

export interface LedgerUpdaterResult {
  ledgerEntryId: string;
  effectiveTotal: number; // (base + bonus) * streakMultiplier — applied by T85
  pointBreakdown: PointBreakdownInput & { effectiveTotal: number };
  streakSnapshot: StreakDataInput;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className LedgerUpdater
 */
@Injectable()
export class LedgerUpdater extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T85',
        serviceName: 'LedgerUpdater',
        flowId: 'FLOW-05',
      }),
    });
  }

  async update(input: LedgerUpdaterInput): Promise<DataProcessResult<LedgerUpdaterResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.completionId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'LedgerUpdater: completionId, userId, and tenantId are required',
        );
      }
      if (!input.pointBreakdown || !input.streakData) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'LedgerUpdater: pointBreakdown and streakData are required',
        );
      }

      // ── IR-85-3: Apply streak multiplier from T96 at merge time ──────────
      const { base, bonus } = input.pointBreakdown;
      const { streakMultiplier, currentStreak } = input.streakData;
      // Round to nearest integer — gamification points are whole numbers
      const effectiveTotal = Math.round((base + bonus) * streakMultiplier);

      // ── IR-85-1: ONE atomic storeDocument — no separate read-then-write ──
      const now = input.processedAt ?? new Date().toISOString();
      const ledgerEntryId = `le-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        ledger_entry_id: ledgerEntryId,
        completion_id: input.completionId,
        questionnaire_id: input.questionnaireId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        // Points breakdown
        base_points: base,
        bonus_points: bonus,
        streak_multiplier: streakMultiplier,
        effective_total: effectiveTotal,
        // Streak snapshot
        current_streak: currentStreak,
        longest_streak: input.streakData.longestStreak,
        streak_updated_at: input.streakData.streakUpdatedAt,
        // Metadata
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE GamificationBatchStored emit (IR-85-2) ──
      const stored = await this.dbFabric.storeDocument(LEDGER_INDEX, doc, ledgerEntryId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      const enrichedBreakdown = {
        base,
        bonus,
        multiplier: streakMultiplier, // actual multiplier applied (from T96)
        total: base + bonus,
        effectiveTotal,
      };

      await this.queueFabric.enqueue('gamification.batch.stored', {
        ledgerEntryId,
        completionId: input.completionId,
        questionnaireId: input.questionnaireId,
        userId: input.userId,
        tenantId: input.tenantId,
        effectiveTotal,
        pointBreakdown: enrichedBreakdown,
        streakSnapshot: input.streakData,
        processedAt: now,
      });

      return DataProcessResult.success({
        ledgerEntryId,
        effectiveTotal,
        pointBreakdown: enrichedBreakdown,
        streakSnapshot: input.streakData,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'LEDGER_UPDATER_ERROR',
        `LedgerUpdater threw: ${String(err)}`,
      );
    }
  }
}
