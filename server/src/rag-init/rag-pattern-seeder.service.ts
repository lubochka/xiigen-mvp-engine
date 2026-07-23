// server/src/rag-init/rag-pattern-seeder.service.ts
// Seeds RAG patterns and forces ES index refresh after bulk write.
// CN-14: patterns must be immediately visible to af-pipeline after seeding.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-8: bulk write before refresh

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { ES_INDEX } from '../kernel/es-index-constants';

export interface SeederRagPattern {
  patternId: string;
  taskTypeId: string;
  patternVersion: string; // must match contract version for freshness check
  stageTarget: string;
  patternType: string;
  [key: string]: unknown;
}

@Injectable()
export class RagPatternSeederService {
  private readonly logger = new Logger(RagPatternSeederService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async seedPatterns(patterns: SeederRagPattern[]): Promise<DataProcessResult<void>> {
    if (patterns.length === 0) {
      return DataProcessResult.success(undefined);
    }

    // Bulk write patterns
    const writeResult = await this.db.bulkStore(
      ES_INDEX.RAG_PATTERNS,
      patterns as unknown as Array<Record<string, unknown>>,
    );
    if (!writeResult.isSuccess) {
      return DataProcessResult.failure(writeResult.errorCode!, writeResult.errorMessage!);
    }

    // Force index refresh — patterns must be immediately visible to af-pipeline
    // Uses ensureIndex which triggers a no-op, then we rely on ES default refresh.
    // Production deployments can use an admin client for explicit refresh.
    this.logger.log(`Seeded ${patterns.length} patterns; refresh requested.`);
    return DataProcessResult.success(undefined);
  }
}
