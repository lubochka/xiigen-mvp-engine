/**
 * ArchPhilosophyRetriever (T602) — FLOW-45 Phase B
 *
 * Retrieves ARCH_PATTERN records from xiigen-architecture-philosophy.
 * Optionally filters by patternType.
 *
 * CF-804: only GLOBAL-scoped patterns are returned.
 * DNA-3: returns DataProcessResult<T>, never throws.
 * DNA-5: no tenantId param — scope from AsyncLocalStorage.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

const ARCH_PHILOSOPHY_INDEX = 'xiigen-architecture-philosophy';

export interface ArchPhilosophyRetrievalOptions {
  patternType?: string;
}

export interface ArchPhilosophyRetrievalResult {
  patterns: Array<Record<string, unknown>>;
  totalReturned: number;
}

@Injectable()
export class ArchPhilosophyRetriever {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Retrieve seeded ARCH_PATTERN records, optionally filtered by patternType.
   * CF-804: result is always filtered to knowledgeScope=GLOBAL.
   */
  async retrieve(
    options: ArchPhilosophyRetrievalOptions = {},
  ): Promise<DataProcessResult<ArchPhilosophyRetrievalResult>> {
    try {
      const filter: Record<string, unknown> = { knowledgeScope: 'GLOBAL' };
      if (options.patternType) {
        filter['patternType'] = options.patternType;
      }

      const result = await this.db.searchDocuments(ARCH_PHILOSOPHY_INDEX, filter);
      if (!result.isSuccess) {
        return DataProcessResult.failure(
          'ARCH_PHILOSOPHY_RETRIEVAL_FAILED',
          result.errorMessage ?? 'Database retrieval failed',
        );
      }

      const patterns = (result.data as Array<Record<string, unknown>>) ?? [];
      return DataProcessResult.success({ patterns, totalReturned: patterns.length });
    } catch (err) {
      return DataProcessResult.failure(
        'ARCH_PHILOSOPHY_RETRIEVER_ERROR',
        `ArchPhilosophyRetriever threw: ${String(err)}`,
      );
    }
  }
}
