/**
 * StreakManager (T96) — FLOW-05 Phase 1E
 * Single responsibility: compute learning streak in learner's LOCAL timezone.
 *
 * Iron rules:
 *   IR-96-1: userTimezoneOffset (minutes) is REQUIRED — CF-05-2.
 *            Absence → VALIDATION_FAILURE(BUILD_FAILURE severity).
 *   IR-96-2: localDate = Math.floor((utcMs + offsetMin*60000) / 86_400_000)
 *            NEVER toISOString().slice(0,10) — that is UTC midnight, not local.
 *   DNA-8:   storeDocument(streak record) BEFORE streak.updated emitted.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 *
 * FREEDOM keys:
 *   flow05_streak_grace_hours      (default 2)   — hours past local midnight that still extend streak
 *   flow05_streak_multiplier_step  (default 0.1) — points multiplier gain per streak day
 *   flow05_streak_multiplier_max   (default 2.0) — cap on streak multiplier
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const STREAK_INDEX = 'xiigen-streak-records';
const FREEDOM_INDEX = 'freedom_configs';

export interface StreakManagerInput {
  completionId: string;
  userId: string;
  tenantId: string;
  /**
   * CF-05-2 — Minutes east of UTC (negative for west).
   * Required. typeof must be 'number' — absent = VALIDATION_FAILURE.
   */
  userTimezoneOffset: number;
  processedAt?: string;
}

export interface StreakManagerResult {
  streakRecordId: string;
  currentStreak: number;
  longestStreak: number;
  streakMultiplier: number;
  localDateNumber: number;
  idempotent: boolean;
  streakUpdatedAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className StreakManager
 */
@Injectable()
export class StreakManager extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T96',
        serviceName: 'StreakManager',
        flowId: 'FLOW-05',
      }),
    });
  }

  async update(input: StreakManagerInput): Promise<DataProcessResult<StreakManagerResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.completionId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'StreakManager: completionId, userId, and tenantId are required',
        );
      }
      // IR-96-1: userTimezoneOffset must be a number (0 is valid)
      if (typeof input.userTimezoneOffset !== 'number') {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'StreakManager: userTimezoneOffset (minutes east of UTC) is required — CF-05-2',
        );
      }

      const now = input.processedAt ?? new Date().toISOString();
      const utcMs = new Date(now).getTime();

      // ── IR-96-2: local date via integer arithmetic — NEVER ISO slice ────────
      const offsetMs = input.userTimezoneOffset * 60_000;
      const localDateNumber = Math.floor((utcMs + offsetMs) / 86_400_000);

      // ── Read prior streak record ──────────────────────────────────────────
      const priorResult = await this.dbFabric.searchDocuments(STREAK_INDEX, {
        user_id: input.userId,
      });
      const priorRecords = priorResult.isSuccess ? (priorResult.data ?? []) : [];
      const prior = priorRecords.length > 0 ? (priorRecords[0] as Record<string, unknown>) : null;

      const lastLocalDate = prior !== null ? Number(prior['local_date_number'] ?? -1) : -1;
      const lastStreak = prior !== null ? Number(prior['current_streak'] ?? 0) : 0;
      const longestSoFar = prior !== null ? Number(prior['longest_streak'] ?? 0) : 0;

      // ── Same-day idempotency ──────────────────────────────────────────────
      if (prior !== null && localDateNumber === lastLocalDate) {
        return DataProcessResult.success({
          streakRecordId: String(prior['streak_record_id'] ?? ''),
          currentStreak: lastStreak,
          longestStreak: longestSoFar,
          streakMultiplier: Number(prior['streak_multiplier'] ?? 1.0),
          localDateNumber,
          idempotent: true,
          streakUpdatedAt: String(prior['streak_updated_at'] ?? now),
        });
      }

      // ── FREEDOM: grace window ─────────────────────────────────────────────
      const graceHours = await this.readFreedomNumber('flow05_streak_grace_hours', 2);

      // ── Compute new streak ────────────────────────────────────────────────
      let currentStreak: number;

      if (prior === null) {
        // First ever completion
        currentStreak = 1;
      } else if (localDateNumber === lastLocalDate + 1) {
        // Consecutive local day — extend
        currentStreak = lastStreak + 1;
      } else if (
        localDateNumber === lastLocalDate + 2 &&
        this.isWithinGrace(utcMs, localDateNumber, input.userTimezoneOffset, graceHours)
      ) {
        // Missed one local day but within grace window — still extend
        currentStreak = lastStreak + 1;
      } else {
        // Gap too large — reset
        currentStreak = 1;
      }

      const longestStreak = Math.max(longestSoFar, currentStreak);

      // ── FREEDOM: streak multiplier ────────────────────────────────────────
      const multiplierStep = await this.readFreedomNumber('flow05_streak_multiplier_step', 0.1);
      const multiplierMax = await this.readFreedomNumber('flow05_streak_multiplier_max', 2.0);
      const streakMultiplier = Math.min(
        Math.round((1.0 + currentStreak * multiplierStep) * 100) / 100,
        multiplierMax,
      );

      const streakRecordId = `str-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        streak_record_id: streakRecordId,
        completion_id: input.completionId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        current_streak: currentStreak,
        longest_streak: longestStreak,
        streak_multiplier: streakMultiplier,
        local_date_number: localDateNumber,
        user_timezone_offset: input.userTimezoneOffset,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        streak_updated_at: now,
      };

      // DNA-8: store BEFORE emit
      const stored = await this.dbFabric.storeDocument(STREAK_INDEX, doc, streakRecordId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueFabric.enqueue('streak.updated', {
        streakRecordId,
        completionId: input.completionId,
        userId: input.userId,
        tenantId: input.tenantId,
        currentStreak,
        longestStreak,
        streakMultiplier,
        localDateNumber,
        updatedAt: now,
      });

      return DataProcessResult.success({
        streakRecordId,
        currentStreak,
        longestStreak,
        streakMultiplier,
        localDateNumber,
        idempotent: false,
        streakUpdatedAt: now,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'STREAK_MANAGER_ERROR',
        `StreakManager threw: ${String(err)}`,
      );
    }
  }

  /**
   * IR-96-2: Returns true if utcMs falls within graceHours after local midnight of localDate.
   * localMidnightUtc = localDate * 86_400_000 - offsetMin * 60_000
   */
  private isWithinGrace(
    utcMs: number,
    localDate: number,
    offsetMin: number,
    graceHours: number,
  ): boolean {
    const localMidnightUtc = localDate * 86_400_000 - offsetMin * 60_000;
    const hoursIntoDay = (utcMs - localMidnightUtc) / 3_600_000;
    return hoursIntoDay < graceHours;
  }

  private async readFreedomNumber(key: string, defaultVal: number): Promise<number> {
    const cfg = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      task_type: 'xiigen-engine',
      config_key: key,
    });
    if (!cfg.isSuccess || (cfg.data ?? []).length === 0) return defaultVal;
    const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
    return typeof val === 'number' ? val : defaultVal;
  }
}
