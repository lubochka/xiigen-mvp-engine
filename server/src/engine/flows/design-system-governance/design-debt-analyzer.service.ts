/**
 * DesignDebtAnalyzer — T498 [IMPACT_ANALYSIS].
 *
 * Analyzes accumulated design debt: inconsistencies, deprecated patterns,
 * accessibility violations, orphaned tokens. Debt score 0.0–1.0.
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

export interface DesignDebtResult {
  reportId: string;
  specId: string;
  debtScore: number;
  issues: string[];
  analyzedAt: string;
}

const DEFAULT_THRESHOLDS = {
  maxDeprecatedPatterns: 3,
  maxOrphanedTokens: 5,
  maxAccessibilityViolations: 0,
};

export class DesignDebtAnalyzer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
    private readonly freedom: IFreedom,
  ) {}

  async analyze(
    tenantId: string,
    specId: string,
    debtMetrics: {
      deprecatedPatterns: number;
      orphanedTokens: number;
      accessibilityViolations: number;
      inconsistencyCount: number;
    },
  ): Promise<DataProcessResult<DesignDebtResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Read thresholds from FREEDOM config
    const configResult = await this.freedom.get('flow31_debt_thresholds');
    const thresholds = configResult.isSuccess
      ? { ...DEFAULT_THRESHOLDS, ...(configResult.data as Record<string, unknown>) }
      : DEFAULT_THRESHOLDS;

    const issues: string[] = [];
    if (debtMetrics.deprecatedPatterns > (thresholds['maxDeprecatedPatterns'] as number)) {
      issues.push(`${debtMetrics.deprecatedPatterns} deprecated patterns exceed limit`);
    }
    if (debtMetrics.orphanedTokens > (thresholds['maxOrphanedTokens'] as number)) {
      issues.push(`${debtMetrics.orphanedTokens} orphaned tokens exceed limit`);
    }
    if (
      debtMetrics.accessibilityViolations > (thresholds['maxAccessibilityViolations'] as number)
    ) {
      issues.push(`${debtMetrics.accessibilityViolations} accessibility violations found`);
    }

    // Debt score = weighted sum normalized to 0–1
    const maxPossible = 100;
    const rawDebt =
      debtMetrics.deprecatedPatterns * 10 +
      debtMetrics.orphanedTokens * 5 +
      debtMetrics.accessibilityViolations * 20 +
      debtMetrics.inconsistencyCount * 3;
    const debtScore = Math.min(rawDebt / maxPossible, 1.0);

    const reportId = randomUUID();
    const analyzedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      reportId,
      tenantId,
      specId,
      debtScore,
      issues,
      debtMetrics,
      analyzedAt,
    };

    const stored = await this.db.storeDocument('flow31-debt-reports', doc, reportId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.debt.analyzed', {
      reportId,
      tenantId,
      specId,
      debtScore,
      analyzedAt,
    });

    return DataProcessResult.success({ reportId, specId, debtScore, issues, analyzedAt });
  }
}
