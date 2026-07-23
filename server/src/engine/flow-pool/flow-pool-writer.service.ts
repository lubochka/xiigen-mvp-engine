/**
 * FlowPoolWriterService — writes and queries the shared flow pool execution context.
 *
 * writeEntry(): non-blocking — failure never fails the calling node.
 * queryEntries(): scoped to runId + tenantId per DNA-5.
 *
 * DNA-3: All methods return DataProcessResult, never throw.
 * DNA-5: All queries include tenantId scope (via AsyncLocalStorage in fabric layer).
 * DNA-8: storeDocument before any emit (no emit here — write-only).
 *
 * SESSION-T581: Flow Pool Writer — shared execution context store.
 */

import { Injectable, Logger, Inject } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { FlowPoolEntry, FlowPoolEntryInput, NODETYPE_TO_PHASE } from './flow-pool-entry.types';

export const FLOW_POOL_INDEX = 'xiigen-flow-pool';

@Injectable()
export class FlowPoolWriterService {
  private readonly logger = new Logger(FlowPoolWriterService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Write a single node execution record to the flow pool.
   * Non-blocking: errors are logged but not propagated to the caller.
   *
   * DNA-3: returns DataProcessResult, never throws.
   * DNA-8: storeDocument is the only write — no emit.
   */
  async writeEntry(input: FlowPoolEntryInput): Promise<DataProcessResult<FlowPoolEntry>> {
    try {
      const entryId = randomUUID();
      const entry: FlowPoolEntry = {
        ...input,
        entryId,
        executedAt: new Date().toISOString(),
      };

      // DNA-8: store before any downstream use
      await this.db.storeDocument(
        FLOW_POOL_INDEX,
        entry as unknown as Record<string, unknown>,
        entryId,
      );

      return DataProcessResult.success(entry);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`FlowPoolWriterService.writeEntry failed: ${msg}`);
      return DataProcessResult.failure('POOL_WRITE_FAILED', msg);
    }
  }

  /**
   * Query pool entries for a specific run, scoped to tenantId (DNA-5).
   * Returns all entries for the run in sequence order.
   *
   * DNA-3: returns DataProcessResult, never throws.
   * DNA-5: runId + tenantId scope — fabric layer applies tenant scope via AsyncLocalStorage.
   */
  async queryEntries(
    runId: string,
    tenantId: string,
    options?: { nodeType?: string; successOnly?: boolean },
  ): Promise<DataProcessResult<FlowPoolEntry[]>> {
    try {
      const filter: Record<string, unknown> = { runId, tenantId };
      if (options?.nodeType) filter['nodeType'] = options.nodeType;
      if (options?.successOnly) filter['success'] = true;

      const result = await this.db.searchDocuments(FLOW_POOL_INDEX, filter);
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'POOL_QUERY_FAILED',
          result.errorMessage ?? 'pool query failed',
        );
      }

      const entries = (result.data ?? []) as unknown as FlowPoolEntry[];
      // Sort by sequenceIndex ascending
      entries.sort((a, b) => (a.sequenceIndex ?? 0) - (b.sequenceIndex ?? 0));

      return DataProcessResult.success(entries);
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : String(err);
      this.logger.error(`FlowPoolWriterService.queryEntries failed: ${msg}`);
      return DataProcessResult.failure('POOL_QUERY_FAILED', msg);
    }
  }

  /**
   * Resolve the execution phase for a node type.
   * Exported as a static helper to avoid re-importing NODETYPE_TO_PHASE.
   */
  static resolvePhase(nodeType: string): import('./flow-pool-entry.types').FlowPoolPhase {
    return NODETYPE_TO_PHASE[nodeType] ?? 'UNKNOWN';
  }
}
