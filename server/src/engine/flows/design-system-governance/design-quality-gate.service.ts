/**
 * DesignQualityGate — T499 [GUARD].
 *
 * Hard gate: block design pipeline if overall quality score below FREEDOM config
 * thresholds. DESIGN_QUALITY_GATE_FAILED — no bypass.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

interface IFreedom {
  get(key: string): Promise<DataProcessResult<Record<string, unknown>>>;
}

export interface DesignQualityGateResult {
  gateId: string;
  specId: string;
  passed: boolean;
  checkedAt: string;
}

const DEFAULT_THRESHOLDS = {
  minQualityScore: 0.7,
  maxDebtScore: 0.3,
};

export class DesignQualityGate {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async evaluate(
    tenantId: string,
    specId: string,
    scores: { qualityScore: number; debtScore: number },
  ): Promise<DataProcessResult<DesignQualityGateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    const configResult = await this.freedom.get('flow31_quality_thresholds');
    const thresholds = configResult.isSuccess
      ? { ...DEFAULT_THRESHOLDS, ...(configResult.data as Record<string, unknown>) }
      : DEFAULT_THRESHOLDS;

    const minQuality = thresholds['minQualityScore'] as number;
    const maxDebt = thresholds['maxDebtScore'] as number;

    if (scores.qualityScore < minQuality) {
      return DataProcessResult.failure(
        'DESIGN_QUALITY_GATE_FAILED',
        `Quality score ${scores.qualityScore} below minimum ${minQuality}`,
      );
    }
    if (scores.debtScore > maxDebt) {
      return DataProcessResult.failure(
        'DESIGN_QUALITY_GATE_FAILED',
        `Debt score ${scores.debtScore} exceeds maximum ${maxDebt}`,
      );
    }

    const gateId = randomUUID();
    const checkedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      gateId,
      tenantId,
      specId,
      passed: true,
      scores,
      checkedAt,
    };

    const stored = await this.db.storeDocument('flow31-quality-gates', doc, gateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.quality.passed', { gateId, tenantId, specId, checkedAt });

    return DataProcessResult.success({ gateId, specId, passed: true, checkedAt });
  }
}
