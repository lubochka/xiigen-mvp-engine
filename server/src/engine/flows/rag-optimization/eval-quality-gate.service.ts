/**
 * EvalQualityGate — T454 GUARD service for FLOW-29.
 *
 * Hard-stop on hallucination/coverage below threshold.
 * QUALITY_GATE_FAILED is a hard stop — no override on this service.
 *
 * Iron rules:
 *   CF-476:     tenantId required — UNSCOPED_QUERY on missing
 *   DNA-3:      All methods return DataProcessResult<T> — never throw
 *   DNA-8:      storeDocument() BEFORE enqueue() when gate fails
 *   THRESHOLDS: from FREEDOM config — never hardcoded
 *   HARD_STOP:  QUALITY_GATE_FAILED — no override
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

// ── Shapes ──────────────────────────────────────────────────────────────────

export interface QualityGateResult {
  readonly passed: boolean;
  readonly hallucinationRate: number;
  readonly coverageScore: number;
  readonly hallucinationThreshold: number;
  readonly coverageThreshold: number;
}

// ── Constants ────────────────────────────────────────────────────────────────

const GATE_INDEX = 'flow29-quality-gates';
const GATE_EVENT = 'eval.quality.gate.result';
const DEFAULT_HALLUCINATION_LIMIT = 0.1; // max 10% hallucination
const DEFAULT_COVERAGE_MIN = 0.7; // min 70% coverage

// ── Service ──────────────────────────────────────────────────────────────────

@Injectable()
export class EvalQualityGate {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
  ) {}

  /**
   * Check hallucination rate and coverage score against thresholds.
   *
   * Returns QUALITY_GATE_FAILED if either score breaches threshold — hard stop.
   * DNA-8: storeDocument() BEFORE enqueue().
   */
  async evaluate(
    tenantId: string,
    hallucinationRate: number,
    coverageScore: number,
    sessionId?: string,
  ): Promise<DataProcessResult<QualityGateResult>> {
    if (!tenantId || tenantId.trim() === '') {
      return DataProcessResult.failure('UNSCOPED_QUERY', 'CF-476: tenantId is required');
    }
    if (typeof hallucinationRate !== 'number' || hallucinationRate < 0 || hallucinationRate > 1) {
      return DataProcessResult.failure(
        'INVALID_HALLUCINATION_RATE',
        'hallucinationRate must be 0–1',
      );
    }
    if (typeof coverageScore !== 'number' || coverageScore < 0 || coverageScore > 1) {
      return DataProcessResult.failure('INVALID_COVERAGE_SCORE', 'coverageScore must be 0–1');
    }

    // Read thresholds from FREEDOM config
    const configResult = await this.db.searchDocuments('flow29-eval-thresholds', {
      tenant_id: tenantId,
      active: true,
    });
    const config =
      configResult.isSuccess && (configResult.data ?? []).length > 0 ? configResult.data![0] : null;

    const hallucinationThreshold =
      (config?.['hallucination_limit'] as number | undefined) ?? DEFAULT_HALLUCINATION_LIMIT;
    const coverageThreshold =
      (config?.['coverage_min'] as number | undefined) ?? DEFAULT_COVERAGE_MIN;

    const hallucinationPass = hallucinationRate <= hallucinationThreshold;
    const coveragePass = coverageScore >= coverageThreshold;
    const passed = hallucinationPass && coveragePass;

    const gateId = `gate-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
    const recordedAt = new Date().toISOString();

    const doc: Record<string, unknown> = {
      gate_id: gateId,
      tenant_id: tenantId,
      session_id: sessionId ?? null,
      hallucination_rate: hallucinationRate,
      coverage_score: coverageScore,
      hallucination_threshold: hallucinationThreshold,
      coverage_threshold: coverageThreshold,
      passed,
      recorded_at: recordedAt,
    };

    // ✅ DNA-8: storeDocument() BEFORE enqueue()
    const stored = await this.db.storeDocument(GATE_INDEX, doc, gateId);
    if (!stored.isSuccess) {
      return DataProcessResult.failure(
        stored.errorCode ?? 'STORAGE_FAILED',
        stored.errorMessage ?? 'Failed to store quality gate result',
      );
    }

    await this.queue.enqueue(GATE_EVENT, {
      gate_id: gateId,
      tenant_id: tenantId,
      passed,
      recorded_at: recordedAt,
    });

    if (!passed) {
      return DataProcessResult.failure(
        'QUALITY_GATE_FAILED',
        `Quality gate failed: hallucination=${hallucinationRate} (limit=${hallucinationThreshold}), coverage=${coverageScore} (min=${coverageThreshold})`,
      );
    }

    return DataProcessResult.success({
      passed,
      hallucinationRate,
      coverageScore,
      hallucinationThreshold,
      coverageThreshold,
    });
  }
}
