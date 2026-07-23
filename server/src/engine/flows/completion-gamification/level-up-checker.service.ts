/**
 * LevelUpChecker (T86) — FLOW-05 Phase 1D
 * Single responsibility: check whether updated points total crosses a level threshold.
 *
 * Iron rules:
 *   IR-86-1: Level thresholds come from FREEDOM config (flow05_level_thresholds) — never
 *            hardcoded. Hardcoded thresholds cannot be tuned without a code deployment.
 *   IR-86-2: No-op path is a success — if no threshold is crossed, return
 *            DataProcessResult.success({levelUp:false}). Not a failure.
 *   IR-86-3: DNA-8 — storeDocument(level record) BEFORE LevelUpDetected emitted.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const LEVELS_INDEX = 'xiigen-user-levels';
const FREEDOM_INDEX = 'freedom_configs';

export interface LevelUpCheckerInput {
  completionId: string;
  userId: string;
  tenantId: string;
  effectiveTotal: number; // points awarded this round (from T85)
  processedAt?: string;
}

export interface LevelUpCheckerResult {
  levelUp: boolean;
  newLevel?: number;
  levelRecordId?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className LevelUpChecker
 */
@Injectable()
export class LevelUpChecker extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T86',
        serviceName: 'LevelUpChecker',
        flowId: 'FLOW-05',
      }),
    });
  }

  async check(input: LevelUpCheckerInput): Promise<DataProcessResult<LevelUpCheckerResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.completionId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'LevelUpChecker: completionId, userId, and tenantId are required',
        );
      }

      // ── Read current cumulative points from ledger ─────────────────────────
      const ledgerQuery = await this.dbFabric.searchDocuments('xiigen-gamification-ledger', {
        user_id: input.userId,
      });
      const entries = ledgerQuery.isSuccess ? (ledgerQuery.data ?? []) : [];
      const cumulativeTotal = entries.reduce((sum, entry) => {
        const e = entry as Record<string, unknown>;
        return sum + (Number(e['effective_total']) || 0);
      }, 0);

      // ── Read current level record ──────────────────────────────────────────
      const levelQuery = await this.dbFabric.searchDocuments(LEVELS_INDEX, {
        user_id: input.userId,
      });
      const currentLevel =
        levelQuery.isSuccess && (levelQuery.data ?? []).length > 0
          ? Number((levelQuery.data![0] as Record<string, unknown>)['level'] ?? 1)
          : 1;

      // ── IR-86-1: Read level thresholds from FREEDOM config ─────────────────
      const thresholds = await this.readThresholds();

      // ── Check if cumulative total crossed a new level threshold ───────────
      // Find the highest level whose threshold <= cumulativeTotal
      const achievedLevel = this.computeLevel(cumulativeTotal, thresholds);

      // ── IR-86-2: No threshold crossed — return success, no emission ────────
      if (achievedLevel <= currentLevel) {
        return DataProcessResult.success({ levelUp: false });
      }

      // ── Level crossed — IR-86-3: storeDocument BEFORE LevelUpDetected emit ─
      const now = input.processedAt ?? new Date().toISOString();
      const levelRecordId = `lv-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        level_record_id: levelRecordId,
        completion_id: input.completionId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        previous_level: currentLevel,
        new_level: achievedLevel,
        cumulative_total: cumulativeTotal,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: now,
      };

      // DNA-8: store BEFORE emit
      const stored = await this.dbFabric.storeDocument(LEVELS_INDEX, doc, levelRecordId);
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueFabric.enqueue('level.up.detected', {
        levelRecordId,
        completionId: input.completionId,
        userId: input.userId,
        tenantId: input.tenantId,
        previousLevel: currentLevel,
        newLevel: achievedLevel,
        processedAt: now,
      });

      return DataProcessResult.success({ levelUp: true, newLevel: achievedLevel, levelRecordId });
    } catch (err) {
      return DataProcessResult.failure(
        'LEVEL_UP_CHECKER_ERROR',
        `LevelUpChecker threw: ${String(err)}`,
      );
    }
  }

  /** Highest level whose points threshold has been reached. Minimum level is 1. */
  private computeLevel(total: number, thresholds: number[]): number {
    let level = 1;
    for (let i = 0; i < thresholds.length; i++) {
      if (total >= thresholds[i]) level = i + 2; // thresholds[0] → level 2, etc.
    }
    return level;
  }

  /**
   * IR-86-1: thresholds from FREEDOM config key flow05_level_thresholds.
   * Expected format: [100, 300, 600, 1000, ...] (points required for each level above 1).
   * Default: [100, 300, 600] → levels 2, 3, 4.
   */
  private async readThresholds(): Promise<number[]> {
    const defaults = [100, 300, 600];
    const cfg = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      task_type: 'xiigen-engine',
      config_key: 'flow05_level_thresholds',
    });
    if (!cfg.isSuccess || (cfg.data ?? []).length === 0) return defaults;
    const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
    if (Array.isArray(val) && val.length > 0) return val.map(Number);
    return defaults;
  }
}
