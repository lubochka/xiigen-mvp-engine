/**
 * AchievementGate (T87) — FLOW-05 Phase 1D
 * Single responsibility: history-gated achievement unlock.
 *
 * Iron rules:
 *   IR-87-1: Read xiigen-achievements history BEFORE any storeDocument call.
 *            If (userId, achievementId) already exists → return success({alreadyUnlocked:true}).
 *            Without this check, concurrent GamificationBatchStored events both find no record,
 *            both write, both emit AchievementUnlocked → double notification (silent failure).
 *   IR-87-2: DNA-8 — storeDocument(achievement) BEFORE AchievementUnlocked emitted.
 *   IR-87-3: Achievement criteria from FREEDOM config (flow05_achievement_criteria).
 *            The engine evaluates which achievements are triggered by this completion.
 *            Unknown achievementId is a no-op success — not a failure.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const ACHIEVEMENTS_INDEX = 'xiigen-achievements';
const FREEDOM_INDEX = 'freedom_configs';

export interface AchievementGateInput {
  completionId: string;
  questionnaireId: string;
  userId: string;
  tenantId: string;
  effectiveTotal: number;
  currentStreak: number;
  processedAt?: string;
}

export interface AchievementGateResult {
  evaluated: string[]; // achievementIds evaluated
  unlocked: string[]; // achievementIds newly unlocked
  alreadyHeld: string[]; // achievementIds already owned (SETNX-like skip)
  recordIds: string[]; // ledger record IDs for newly unlocked achievements
}

/** Achievement definition from FREEDOM config. */
interface AchievementCriteria {
  achievementId: string;
  label: string;
  /** Minimum cumulative points required, or null if not points-based. */
  minPoints?: number;
  /** Minimum streak required, or null if not streak-based. */
  minStreak?: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className AchievementGate
 */
@Injectable()
export class AchievementGate extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T87',
        serviceName: 'AchievementGate',
        flowId: 'FLOW-05',
      }),
    });
  }

  async evaluate(input: AchievementGateInput): Promise<DataProcessResult<AchievementGateResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.completionId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'AchievementGate: completionId, userId, and tenantId are required',
        );
      }

      // ── IR-87-3: Read achievement criteria from FREEDOM config ─────────────
      const criteria = await this.readCriteria();
      if (criteria.length === 0) {
        return DataProcessResult.success({
          evaluated: [],
          unlocked: [],
          alreadyHeld: [],
          recordIds: [],
        });
      }

      // ── Determine which achievements are triggered by this batch ───────────
      const triggered = criteria.filter(
        (c) =>
          (c.minPoints === undefined || input.effectiveTotal >= c.minPoints) &&
          (c.minStreak === undefined || input.currentStreak >= c.minStreak),
      );

      if (triggered.length === 0) {
        return DataProcessResult.success({
          evaluated: criteria.map((c) => c.achievementId),
          unlocked: [],
          alreadyHeld: [],
          recordIds: [],
        });
      }

      const now = input.processedAt ?? new Date().toISOString();
      const unlocked: string[] = [];
      const alreadyHeld: string[] = [];
      const recordIds: string[] = [];

      for (const achievement of triggered) {
        // ── IR-87-1: History read BEFORE storeDocument — prevents double unlock ─
        const existing = await this.dbFabric.searchDocuments(ACHIEVEMENTS_INDEX, {
          user_id: input.userId,
          achievement_id: achievement.achievementId,
        });

        if (existing.isSuccess && (existing.data ?? []).length > 0) {
          alreadyHeld.push(achievement.achievementId);
          continue;
        }

        // ── New unlock — IR-87-2: storeDocument BEFORE AchievementUnlocked emit ─
        const achievementRecordId = `ach-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

        const doc: Record<string, unknown> = {
          achievement_record_id: achievementRecordId,
          achievement_id: achievement.achievementId,
          achievement_label: achievement.label,
          completion_id: input.completionId,
          user_id: input.userId,
          tenant_id: input.tenantId,
          effective_total_at_unlock: input.effectiveTotal,
          streak_at_unlock: input.currentStreak,
          connection_type: 'FLOW_SCOPED',
          knowledge_scope: 'PRIVATE',
          unlocked_at: now,
        };

        // DNA-8: store BEFORE emit
        const stored = await this.dbFabric.storeDocument(
          ACHIEVEMENTS_INDEX,
          doc,
          achievementRecordId,
        );
        if (!stored.isSuccess) {
          return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
        }

        await this.queueFabric.enqueue('achievement.unlocked', {
          achievementRecordId,
          achievementId: achievement.achievementId,
          achievementLabel: achievement.label,
          completionId: input.completionId,
          userId: input.userId,
          tenantId: input.tenantId,
          unlockedAt: now,
        });

        unlocked.push(achievement.achievementId);
        recordIds.push(achievementRecordId);
      }

      return DataProcessResult.success({
        evaluated: triggered.map((c) => c.achievementId),
        unlocked,
        alreadyHeld,
        recordIds,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'ACHIEVEMENT_GATE_ERROR',
        `AchievementGate threw: ${String(err)}`,
      );
    }
  }

  /**
   * IR-87-3: Read achievement criteria from FREEDOM config key flow05_achievement_criteria.
   * Default: two baseline achievements — first completion and 3-day streak.
   */
  private async readCriteria(): Promise<AchievementCriteria[]> {
    const defaults: AchievementCriteria[] = [
      { achievementId: 'first-completion', label: 'First Completion', minPoints: 1 },
      { achievementId: 'streak-3', label: '3-Day Streak', minStreak: 3 },
    ];
    const cfg = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      task_type: 'xiigen-engine',
      config_key: 'flow05_achievement_criteria',
    });
    if (!cfg.isSuccess || (cfg.data ?? []).length === 0) return defaults;
    const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
    if (Array.isArray(val) && val.length > 0) return val as AchievementCriteria[];
    return defaults;
  }
}
