/**
 * DpoToRagPromoter — FLOW-38 Phase A bootstrap
 *
 * Reads high-scoring DPO triples from xiigen-training-data (score ≥ 8.5)
 * and promotes their chosen output as RAG patterns to xiigen-rag-patterns.
 *
 * Phase A scope: promotion scan only. No AI generation.
 *
 * DNA-3: returns DataProcessResult<T>, never throws.
 * DNA-8: storeDocument before any emit.
 * DNA-5: tenantId from options — written to pattern document, not passed to fabric methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';

const TRAINING_INDEX = 'xiigen-training-data';
const RAG_INDEX = 'xiigen-rag-patterns';

/** Minimum self-judge score (0–10 scale) to qualify for promotion. */
const PROMOTION_THRESHOLD = 8.5;

export interface PromoteOptions {
  tenantId: string;
}

export interface PromoteResult {
  promoted: number;
  skipped: number;
}

@Injectable()
export class DpoToRagPromoter {
  private readonly logger = new Logger(DpoToRagPromoter.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Scan all DPO triples and promote qualifying ones to xiigen-rag-patterns.
   * Idempotent: re-running overwrites existing PROMOTED_ documents.
   */
  async promote(options: PromoteOptions): Promise<DataProcessResult<PromoteResult>> {
    try {
      const { tenantId } = options;

      const readResult = await this.db.searchDocuments(
        TRAINING_INDEX,
        { tenantId, knowledgeScope: 'PRIVATE' },
        1000,
      );
      if (!readResult.isSuccess) {
        return DataProcessResult.failure(
          'PROMOTER_READ_FAILED',
          `Failed to read ${TRAINING_INDEX}: ${readResult.errorMessage ?? 'unknown'}`,
        );
      }

      const triples = readResult.data ?? [];
      let promoted = 0;
      let skipped = 0;

      for (const record of triples) {
        const tripleId = String(record['tripleId'] ?? record['id'] ?? '');
        const score = typeof record['score'] === 'number' ? (record['score'] as number) : 0;
        const chosen = String(record['chosen'] ?? '');
        const flowId = String(record['flowId'] ?? '');

        if (!tripleId || !chosen || score < PROMOTION_THRESHOLD) {
          skipped++;
          continue;
        }

        const patternId = `PROMOTED-${tripleId}`;
        const pattern: Record<string, unknown> = {
          id: patternId,
          patternId,
          patternType: 'PROMOTED_DPO',
          flowId,
          teachingPoint: chosen,
          qualityScore: score / 10, // normalize 0–10 → 0–1
          promotedFrom: tripleId,
          promotionScore: score,
          connectionType: 'FLOW_SCOPED',
          tenantId,
          createdAt: new Date().toISOString(),
          tags: ['dpo-promoted', flowId].filter(Boolean),
        };

        // DNA-8: storeDocument before any downstream operation
        const storeResult = await this.db.storeDocument(RAG_INDEX, pattern, patternId);
        if (storeResult.isSuccess) {
          promoted++;
        } else {
          this.logger.warn(
            `DpoToRagPromoter: failed to store ${patternId}: ${storeResult.errorMessage ?? 'unknown'}`,
          );
          skipped++;
        }
      }

      this.logger.log(`DpoToRagPromoter: complete — promoted=${promoted} skipped=${skipped}`);
      return DataProcessResult.success({ promoted, skipped });
    } catch (err) {
      return DataProcessResult.failure('PROMOTER_ERROR', `DpoToRagPromoter threw: ${String(err)}`);
    }
  }
}
