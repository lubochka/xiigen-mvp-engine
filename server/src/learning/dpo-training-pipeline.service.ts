// server/src/learning/dpo-training-pipeline.service.ts
// Training pipeline that excludes DEGRADED DPO triples from training queries.
// CN-13: degraded triples (RAG unavailable during generation) must not pollute training data.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-1: uses Record<string, unknown>

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { ES_INDEX } from '../kernel/es-index-constants';

export interface DpoTripleFilters {
  taskTypeId?: string;
  targetStack?: string;
  outputCategory?: string;
}

@Injectable()
export class DpoTrainingPipelineService {
  private readonly logger = new Logger(DpoTrainingPipelineService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async getTrainingTriples(
    options: DpoTripleFilters = {},
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const filter: Record<string, unknown> = {
      ...options,
      ragHealthy: true, // EXCLUDE DEGRADED triples
      qualityFlags: [], // only triples with no quality flags
    };
    const triples = await this.db.searchDocuments(ES_INDEX.DPO_TRIPLES, filter);
    if (!triples.isSuccess) {
      return DataProcessResult.failure(triples.errorCode!, triples.errorMessage!);
    }
    this.logger.log(
      `Training triples query: ${(triples.data ?? []).length} healthy triples returned`,
    );
    return DataProcessResult.success(triples.data ?? []);
  }
}
