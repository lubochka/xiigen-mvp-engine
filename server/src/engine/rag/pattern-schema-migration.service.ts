// server/src/engine/rag/pattern-schema-migration.service.ts
// Backfills missing fields in existing RAG patterns after schema updates.
// CN-31: prevents stage-aware queries from missing old patterns.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-1: uses Record<string, unknown>

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ES_INDEX } from '../../kernel/es-index-constants';

@Injectable()
export class PatternSchemaMigrationService {
  private readonly logger = new Logger(PatternSchemaMigrationService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async backfillMissingFields(
    newFields: Record<string, unknown>,
  ): Promise<DataProcessResult<{ updated: number }>> {
    const fieldNames = Object.keys(newFields);
    // Find patterns missing any of the new fields
    const patterns = await this.db.searchDocuments(ES_INDEX.RAG_PATTERNS, {
      missingFields: fieldNames, // custom filter builder extension
    });
    if (!patterns.isSuccess) {
      return DataProcessResult.failure(patterns.errorCode!, patterns.errorMessage!);
    }

    let updated = 0;
    for (const pattern of patterns.data ?? []) {
      const patternId = pattern['patternId'] as string;
      if (!patternId) continue;
      // Merge new fields into existing pattern
      const updatedDoc = { ...pattern, ...newFields };
      const storeResult = await this.db.storeDocument(ES_INDEX.RAG_PATTERNS, updatedDoc, patternId);
      if (storeResult.isSuccess) updated++;
    }

    this.logger.log(
      `Pattern schema migration: updated ${updated} patterns with fields: ${fieldNames.join(', ')}`,
    );
    return DataProcessResult.success({ updated });
  }
}
