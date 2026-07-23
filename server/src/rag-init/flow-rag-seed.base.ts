/**
 * FlowRagSeedBase — abstract base class for per-module RAG pattern seeding.
 * P21: Implements IFlowRagSeed. Subclasses provide domain-specific patterns,
 * BFA rules, and design records. seedAll() orchestrates all three in sequence.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-2: buildSearchFilter() used for all existence checks (upsert pattern).
 * Rule 1: No SDK imports — only fabric interfaces.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { buildSearchFilter } from '../kernel/build-search-filter';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IFlowRagSeed } from './flow-rag-seed.interface';
import { ES_INDEX } from '../kernel/es-index-constants';

@Injectable()
export abstract class FlowRagSeedBase implements IFlowRagSeed {
  abstract readonly domainId: string;

  constructor(@Inject(DATABASE_SERVICE) protected readonly db: IDatabaseService) {}

  abstract indexPatterns(): Promise<DataProcessResult<number>>;
  abstract indexBfaRules(): Promise<DataProcessResult<number>>;
  abstract indexDesignRecords(): Promise<DataProcessResult<number>>;

  /**
   * Run all three seeding operations in sequence.
   * DNA-3: propagates first failure encountered; never throws.
   * Returns total count of all indexed documents across all three operations.
   */
  async seedAll(): Promise<DataProcessResult<number>> {
    const patternsResult = await this.indexPatterns();
    if (!patternsResult.isSuccess) {
      return DataProcessResult.failure(
        patternsResult.errorCode ?? 'PATTERNS_FAILED',
        patternsResult.errorMessage ?? 'indexPatterns() failed',
      );
    }

    const bfaResult = await this.indexBfaRules();
    if (!bfaResult.isSuccess) {
      return DataProcessResult.failure(
        bfaResult.errorCode ?? 'BFA_RULES_FAILED',
        bfaResult.errorMessage ?? 'indexBfaRules() failed',
      );
    }

    const designResult = await this.indexDesignRecords();
    if (!designResult.isSuccess) {
      return DataProcessResult.failure(
        designResult.errorCode ?? 'DESIGN_RECORDS_FAILED',
        designResult.errorMessage ?? 'indexDesignRecords() failed',
      );
    }

    const total = (patternsResult.data ?? 0) + (bfaResult.data ?? 0) + (designResult.data ?? 0);
    return DataProcessResult.success(total);
  }

  /**
   * Upsert a RAG pattern document.
   * DNA-2: uses buildSearchFilter() for existence check.
   * Idempotent: if patternId already exists, returns success without re-storing.
   */
  protected async upsertPattern(doc: Record<string, unknown>): Promise<DataProcessResult<string>> {
    const patternId = doc['patternId'] as string;

    const filter = buildSearchFilter({ patternId });
    const searchResult = await this.db.searchDocuments(ES_INDEX.RAG_PATTERNS, filter);

    if (!searchResult.isSuccess) {
      return DataProcessResult.failure(
        searchResult.errorCode ?? 'SEARCH_FAILED',
        searchResult.errorMessage ?? 'Failed to check pattern existence',
      );
    }

    if (searchResult.data && searchResult.data.length > 0) {
      // Already exists — idempotent, skip re-store
      return DataProcessResult.success(patternId);
    }

    const storeResult = await this.db.storeDocument(
      ES_INDEX.RAG_PATTERNS,
      {
        ...doc,
        domainId: this.domainId,
        seededAt: new Date().toISOString(),
      },
      patternId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? `Failed to store pattern ${patternId}`,
      );
    }

    return DataProcessResult.success(patternId);
  }
}
