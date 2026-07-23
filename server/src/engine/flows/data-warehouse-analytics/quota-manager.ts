/**
 * T187 QuotaManager [INLINE SERVICE]
 * FLOW-13: Data Warehouse & Analytics
 *
 * CRITICAL: T187 is an INLINE SERVICE — F426 does NOT exist.
 * This class is instantiated directly in T173 QueryExecutionEngine constructor.
 * It is NOT registered as a NestJS provider. Do NOT @Inject() it.
 *
 * Iron rules:
 *   IR-1: T187 is INLINE — no factory ID, no @Inject(), no F426.
 *   IR-2: check() MUST run BEFORE warehouse read (enforced by T173 multiLayerSecurityGate layer 1).
 *   IR-3: recordUsage() MUST be called AFTER successful query execution.
 *   IR-4: Quota exceeded → emit QueryFailed with reason=quota_exceeded, return immediately.
 */

import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';

const QUOTA_INDEX = 'xiigen-warehouse-quotas';
const QUOTA_USAGE_INDEX = 'xiigen-warehouse-quota-usage';

export class QuotaManager {
  constructor(
    private readonly db: IDatabaseService,
    private readonly queue: IQueueService,
    private readonly tenantId: string,
  ) {}

  /**
   * Check quota before warehouse read. IR-2: MUST run at layer 1 before executeQuery.
   * Returns failure if quota exceeded.
   */
  async check(
    queryId: string,
    queryType: string,
  ): Promise<DataProcessResult<{ allowed: boolean }>> {
    const quotaResult = await this.db.searchDocuments(QUOTA_INDEX, {
      tenantId: this.tenantId,
    });

    if (!quotaResult.isSuccess || (quotaResult.data ?? []).length === 0) {
      // No quota record — allow (default unlimited)
      return DataProcessResult.success({ allowed: true });
    }

    const quota = quotaResult.data![0] as Record<string, unknown>;
    const maxQueriesPerDay = (quota['maxQueriesPerDay'] as number) ?? 0;

    if (maxQueriesPerDay === 0) {
      return DataProcessResult.success({ allowed: true });
    }

    // Check current usage
    const today = new Date().toISOString().slice(0, 10);
    const usageResult = await this.db.searchDocuments(QUOTA_USAGE_INDEX, {
      tenantId: this.tenantId,
      usageDate: today,
    });

    const usage = usageResult.isSuccess ? (usageResult.data ?? []) : [];
    const usedToday = (usage[0] as Record<string, unknown>)?.['queryCount'] ?? 0;

    if ((usedToday as number) >= maxQueriesPerDay) {
      await this.queue.enqueue('QueryFailed', {
        tenantId: this.tenantId,
        queryId,
        queryType,
        reason: 'quota_exceeded',
        failedAt: new Date().toISOString(),
      });
      return DataProcessResult.failure('QUOTA_EXCEEDED', 'Daily query quota exceeded');
    }

    return DataProcessResult.success({ allowed: true });
  }

  /**
   * Record usage AFTER successful query execution. IR-3.
   * Emits QueryQuotaUpdated when quota limit changes.
   */
  async recordUsage(queryId: string): Promise<void> {
    const today = new Date().toISOString().slice(0, 10);
    const usageId = `quota-usage-${this.tenantId}-${today}`;

    const usageResult = await this.db.searchDocuments(QUOTA_USAGE_INDEX, {
      tenantId: this.tenantId,
      usageDate: today,
    });

    const currentCount =
      usageResult.isSuccess && (usageResult.data ?? []).length > 0
        ? (((usageResult.data![0] as Record<string, unknown>)['queryCount'] as number) ?? 0)
        : 0;

    await this.db.storeDocument(
      QUOTA_USAGE_INDEX,
      {
        usageId,
        tenantId: this.tenantId,
        usageDate: today,
        queryCount: currentCount + 1,
        lastQueryId: queryId,
        updatedAt: new Date().toISOString(),
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      },
      usageId,
    );
  }
}
