/**
 * CrossDesignImpactAnalyzer — T511 [IMPACT_ANALYSIS].
 *
 * Analyzes impact of design changes across the design system: affected components,
 * patterns needing updates, blast radius estimation.
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
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface CrossDesignImpactResult {
  reportId: string;
  specId: string;
  affectedCount: number;
  severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL';
  analyzedAt: string;
}

export class CrossDesignImpactAnalyzer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async analyze(
    tenantId: string,
    specId: string,
    changedTokens: string[],
    changedComponents: string[],
  ): Promise<DataProcessResult<CrossDesignImpactResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Search existing catalog entries that reference changed tokens or components
    const catalogResult = await this.db.searchDocuments('flow31-component-catalog', { tenantId });
    if (!catalogResult.isSuccess)
      return DataProcessResult.failure(catalogResult.errorCode!, catalogResult.errorMessage!);

    let affectedCount = 0;
    for (const entry of catalogResult.data!) {
      const components = (entry['components'] as Array<{ name: string }>) ?? [];
      const affected = components.some((c) => changedComponents.includes(c.name));
      if (affected) affectedCount++;
    }

    const totalChanged = changedTokens.length + changedComponents.length;
    const severity: 'NONE' | 'LOW' | 'MEDIUM' | 'HIGH' | 'CRITICAL' =
      totalChanged === 0
        ? 'NONE'
        : totalChanged <= 2
          ? 'LOW'
          : totalChanged <= 5
            ? 'MEDIUM'
            : totalChanged <= 10
              ? 'HIGH'
              : 'CRITICAL';

    const reportId = randomUUID();
    const analyzedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      reportId,
      tenantId,
      specId,
      changedTokens,
      changedComponents,
      affectedCount,
      severity,
      analyzedAt,
    };

    const stored = await this.db.storeDocument('flow31-impact-reports', doc, reportId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.impact.analyzed', {
      reportId,
      tenantId,
      specId,
      severity,
      analyzedAt,
    });

    return DataProcessResult.success({ reportId, specId, affectedCount, severity, analyzedAt });
  }
}
