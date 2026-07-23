/**
 * PointsCalculator (T84) — FLOW-05 Phase 1B
 * Single responsibility: server-side point calculation from stored questionnaire result.
 *
 * Iron rules:
 *   IR-84-1: earnedPoints MUST NOT exist in the input shape — CF-05-1 BUILD_FAILURE.
 *            Points are derived server-side from questionnaireResult.scorePercent.
 *            Any implementation reading earnedPoints from the caller enables point
 *            farming: the client can submit any score it wants.
 *   IR-84-2: Read questionnaireResult.scorePercent from xiigen-questionnaire-results
 *            by questionnaireId. Never trust a scorePercent forwarded in the event.
 *   IR-84-3: Output shape is pointBreakdown{base, bonus, multiplier, total} — NOT a
 *            single number. T85 LedgerUpdater consumes the full breakdown.
 *   IR-84-4: DNA-8 — storeDocument(points calculation record) BEFORE points.calculated emit.
 *   DNA-3:   All methods return DataProcessResult<T> — never throw.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

const QUESTIONNAIRE_RESULTS_INDEX = 'xiigen-questionnaire-results';
const POINTS_CALCULATIONS_INDEX = 'xiigen-points-calculations';
const FREEDOM_INDEX = 'freedom_configs';

/**
 * CF-05-1: earnedPoints is STRUCTURALLY ABSENT from this interface.
 * It is not zero-checked or ignored — the field simply does not exist.
 */
export interface PointsCalculatorInput {
  completionId: string;
  questionnaireId: string;
  userId: string;
  tenantId: string;
  submittedAt?: string;
  // earnedPoints — OMITTED intentionally (CF-05-1). Never add this field.
}

/**
 * IR-84-3: Output is a full breakdown — not a single number.
 * T85 LedgerUpdater consumes the entire breakdown for atomic ledger update.
 */
export interface PointBreakdown {
  base: number; // points for completing the questionnaire
  bonus: number; // bonus points for high score (above threshold)
  multiplier: number; // streak multiplier applied (provided by T96 at ledger merge time)
  total: number; // base + bonus (multiplier applied by T85 at merge time)
}

export interface PointsCalculatorResult {
  pointsCalculationId: string;
  questionnaireId: string;
  userId: string;
  scorePercent: number;
  pointBreakdown: PointBreakdown;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className PointsCalculator
 */
@Injectable()
export class PointsCalculator extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T84',
        serviceName: 'PointsCalculator',
        flowId: 'FLOW-05',
      }),
    });
  }

  async calculate(
    input: PointsCalculatorInput,
  ): Promise<DataProcessResult<PointsCalculatorResult>> {
    try {
      // ── Validate ──────────────────────────────────────────────────────────
      if (!input.completionId || !input.questionnaireId || !input.userId || !input.tenantId) {
        return DataProcessResult.failure(
          'VALIDATION_FAILURE',
          'PointsCalculator: completionId, questionnaireId, userId, and tenantId are required',
        );
      }

      // ── IR-84-2: Read scorePercent from stored questionnaire result ────────
      // Server-side: read from DB, never from event payload (CF-05-1).
      const resultQuery = await this.dbFabric.searchDocuments(QUESTIONNAIRE_RESULTS_INDEX, {
        questionnaire_id: input.questionnaireId,
        user_id: input.userId,
      });
      if (!resultQuery.isSuccess || (resultQuery.data ?? []).length === 0) {
        return DataProcessResult.failure(
          'QUESTIONNAIRE_RESULT_NOT_FOUND',
          `PointsCalculator: no result found for questionnaire ${input.questionnaireId} user ${input.userId}`,
        );
      }
      const resultDoc = resultQuery.data![0] as Record<string, unknown>;
      const scorePercent = Number(resultDoc['score_percent'] ?? 0);

      // ── Read FREEDOM point formula ─────────────────────────────────────────
      const { basePoints, bonusThreshold, bonusPoints } = await this.readFormula();

      // ── Compute pointBreakdown (IR-84-3) ──────────────────────────────────
      const base = basePoints;
      const bonus = scorePercent >= bonusThreshold ? bonusPoints : 0;
      // multiplier is always 1.0 here — T85 applies the streak multiplier from T96 at merge time
      const multiplier = 1.0;
      const total = base + bonus;

      const pointBreakdown: PointBreakdown = { base, bonus, multiplier, total };

      // ── Build calculation record ───────────────────────────────────────────
      const now = input.submittedAt ?? new Date().toISOString();
      const pointsCalculationId = `pc-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;

      const doc: Record<string, unknown> = {
        points_calculation_id: pointsCalculationId,
        completion_id: input.completionId,
        questionnaire_id: input.questionnaireId,
        user_id: input.userId,
        tenant_id: input.tenantId,
        score_percent: scorePercent,
        base_points: base,
        bonus_points: bonus,
        multiplier,
        total_points: total,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        created_at: now,
      };

      // DNA-8: storeDocument BEFORE points.calculated emit (IR-84-4) ─────────
      const stored = await this.dbFabric.storeDocument(
        POINTS_CALCULATIONS_INDEX,
        doc,
        pointsCalculationId,
      );
      if (!stored.isSuccess) {
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      }

      await this.queueFabric.enqueue('points.calculated', {
        pointsCalculationId,
        completionId: input.completionId,
        questionnaireId: input.questionnaireId,
        userId: input.userId,
        tenantId: input.tenantId,
        scorePercent,
        pointBreakdown,
      });

      return DataProcessResult.success({
        pointsCalculationId,
        questionnaireId: input.questionnaireId,
        userId: input.userId,
        scorePercent,
        pointBreakdown,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'POINTS_CALCULATOR_ERROR',
        `PointsCalculator threw: ${String(err)}`,
      );
    }
  }

  /**
   * Read point formula from FREEDOM config.
   * Keys: flow05_points_base, flow05_points_bonus_threshold, flow05_points_bonus
   * Defaults: base=10, threshold=80%, bonus=5
   */
  private async readFormula(): Promise<{
    basePoints: number;
    bonusThreshold: number;
    bonusPoints: number;
  }> {
    const defaults = { basePoints: 10, bonusThreshold: 80, bonusPoints: 5 };
    const cfg = await this.dbFabric.searchDocuments(FREEDOM_INDEX, {
      task_type: 'xiigen-engine',
      config_key: 'flow05_points_formula',
    });
    if (!cfg.isSuccess || (cfg.data ?? []).length === 0) return defaults;

    const val = (cfg.data![0] as Record<string, unknown>)['config_value'];
    if (typeof val === 'object' && val !== null) {
      const v = val as Record<string, unknown>;
      const base = Number(v['base']) || defaults.basePoints;
      const threshold = Number(v['bonus_threshold']) || defaults.bonusThreshold;
      const bonus = Number(v['bonus']) || defaults.bonusPoints;
      return { basePoints: base, bonusThreshold: threshold, bonusPoints: bonus };
    }
    return defaults;
  }
}
