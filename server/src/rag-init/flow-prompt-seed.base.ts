/**
 * FlowPromptSeedBase — abstract base class for per-module prompt seeding.
 * P22: Implements IFlowPromptSeed. Subclasses provide domain-specific prompts.
 *
 * DNA-3: All methods return DataProcessResult — never throw.
 * DNA-2: buildSearchFilter() used for all existence checks (upsert pattern).
 * Rule 1: No SDK imports — only fabric interfaces.
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { buildSearchFilter } from '../kernel/build-search-filter';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IFlowPromptSeed } from './flow-prompt-seed.interface';

@Injectable()
export abstract class FlowPromptSeedBase implements IFlowPromptSeed {
  abstract readonly domainId: string;

  constructor(@Inject(DATABASE_SERVICE) protected readonly db: IDatabaseService) {}

  abstract seedPrompts(): Promise<DataProcessResult<number>>;

  /**
   * Upsert a prompt document.
   * DNA-2: uses buildSearchFilter() for existence check.
   * Idempotent: if promptId already exists, returns success without re-storing.
   * Adds standard metadata fields: version, isDefault, isActive, timestamps, updatedBy.
   */
  protected async upsertPrompt(doc: Record<string, unknown>): Promise<DataProcessResult<string>> {
    const promptId = doc['promptId'] as string;

    const filter = buildSearchFilter({ promptId });
    const searchResult = await this.db.searchDocuments('xiigen-prompts', filter);

    if (!searchResult.isSuccess) {
      return DataProcessResult.failure(
        searchResult.errorCode ?? 'SEARCH_FAILED',
        searchResult.errorMessage ?? 'Failed to check prompt existence',
      );
    }

    if (searchResult.data && searchResult.data.length > 0) {
      // Already exists — idempotent, skip re-store
      return DataProcessResult.success(promptId);
    }

    const now = new Date().toISOString();
    const storeResult = await this.db.storeDocument(
      'xiigen-prompts',
      {
        ...doc,
        domainId: this.domainId,
        version: 1,
        isDefault: true,
        isActive: true,
        createdAt: now,
        updatedAt: now,
        updatedBy: 'system',
      },
      promptId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        storeResult.errorCode ?? 'STORE_FAILED',
        storeResult.errorMessage ?? `Failed to store prompt ${promptId}`,
      );
    }

    return DataProcessResult.success(promptId);
  }
}
