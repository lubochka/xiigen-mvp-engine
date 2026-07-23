/**
 * FlowQualityGate — T400 [GUARD].
 *
 * Quality gate that blocks flow deployment if quality metrics are below thresholds.
 * Thresholds read from FREEDOM config (key: flow26_quality_thresholds).
 * Hard stop on QUALITY_GATE_FAILED — no bypass.
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

export interface QualityGateResult {
  gateId: string;
  flowId: string;
  passed: boolean;
  score: number;
  checkedAt: string;
}

const DEFAULT_THRESHOLDS = {
  minTestCoverage: 0.8,
  minDnaScore: 1.0,
  minBfaScore: 1.0,
};

export class FlowQualityGate {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async evaluate(
    tenantId: string,
    flowId: string,
    metrics: { testCoverage: number; dnaScore: number; bfaScore: number },
  ): Promise<DataProcessResult<QualityGateResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Read thresholds from FREEDOM config
    const configResult = await this.freedom.get('flow26_quality_thresholds');
    const thresholds = configResult.isSuccess
      ? { ...DEFAULT_THRESHOLDS, ...(configResult.data as Record<string, unknown>) }
      : DEFAULT_THRESHOLDS;

    const minTestCoverage =
      (thresholds['minTestCoverage'] as number) ?? DEFAULT_THRESHOLDS.minTestCoverage;
    const minDnaScore = (thresholds['minDnaScore'] as number) ?? DEFAULT_THRESHOLDS.minDnaScore;
    const minBfaScore = (thresholds['minBfaScore'] as number) ?? DEFAULT_THRESHOLDS.minBfaScore;

    const failures: string[] = [];
    if (metrics.testCoverage < minTestCoverage)
      failures.push(`testCoverage ${metrics.testCoverage} < ${minTestCoverage}`);
    if (metrics.dnaScore < minDnaScore)
      failures.push(`dnaScore ${metrics.dnaScore} < ${minDnaScore}`);
    if (metrics.bfaScore < minBfaScore)
      failures.push(`bfaScore ${metrics.bfaScore} < ${minBfaScore}`);

    if (failures.length > 0) {
      return DataProcessResult.failure(
        'QUALITY_GATE_FAILED',
        `Quality gate failed: ${failures.join('; ')}`,
      );
    }

    const score = (metrics.testCoverage + metrics.dnaScore + metrics.bfaScore) / 3;
    const gateId = randomUUID();
    const checkedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      gateId,
      tenantId,
      flowId,
      passed: true,
      score,
      metrics,
      checkedAt,
    };

    const stored = await this.db.storeDocument('flow26-quality-gates', doc, gateId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.quality.passed', { gateId, tenantId, flowId, score, checkedAt });

    return DataProcessResult.success({ gateId, flowId, passed: true, score, checkedAt });
  }
}
