/**
 * BootstrapFromDocumentsService (T601) — FLOW-45 Phase A
 *
 * Seeds patterns from history-seeds/ to the appropriate indices.
 *
 * seedArchPhilosophy():
 *   Seeds arch-philosophy.json → xiigen-architecture-philosophy.
 *   CF-803: must run before any flow execution.
 *   CF-804: ARCH_PATTERN records must have knowledgeScope=GLOBAL.
 *
 * seedFlowCorpus(slug):
 *   Seeds {slug}-design-corpus.json → two indices by patternType:
 *     DESIGN_REASONING → xiigen-planning-decisions
 *     ARCH_PATTERN     → xiigen-rag-patterns
 *   Phase 7 corpus validation reads designReasoningCount from the result.
 *
 * DNA-3: returns DataProcessResult<T>, never throws.
 * DNA-8: storeDocument is the only operation — no enqueue needed for seed patterns.
 * DNA-5: tenantId from MASTER_TENANT_ID — not passed to fabric methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { MASTER_TENANT_ID } from './bootstrap-seeder.service';
import * as path from 'path';
import * as fs from 'fs';

const ARCH_PHILOSOPHY_INDEX = 'xiigen-architecture-philosophy';
const PLANNING_DECISIONS_INDEX = 'xiigen-planning-decisions';
const RAG_PATTERNS_INDEX = 'xiigen-rag-patterns';

export interface BootstrapFromDocumentsResult {
  patternsSeeded: number;
  patternsFailed: number;
}

export interface SeedFlowCorpusResult {
  flowId: string;
  designReasoningCount: number;
  archPatternCount: number;
  failedCount: number;
}

@Injectable()
export class BootstrapFromDocumentsService {
  private readonly logger = new Logger(BootstrapFromDocumentsService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Seed all ARCH_PATTERN records from arch-philosophy.json to the architecture index.
   * Idempotent — uses patternId as the document ID.
   */
  async seedArchPhilosophy(): Promise<DataProcessResult<BootstrapFromDocumentsResult>> {
    try {
      const seedFile = path.join(__dirname, 'history-seeds', 'arch-philosophy.json');
      const rawPatterns = this.loadSeedFile(seedFile);

      if (rawPatterns === null) {
        return DataProcessResult.failure(
          'SEED_FILE_NOT_FOUND',
          `arch-philosophy.json not found at ${seedFile}`,
        );
      }

      let patternsSeeded = 0;
      let patternsFailed = 0;

      for (const pattern of rawPatterns) {
        const patternId = String(pattern['patternId'] ?? '');
        if (!patternId) {
          patternsFailed++;
          continue;
        }

        // CF-804: ensure GLOBAL knowledgeScope
        const document: Record<string, unknown> = {
          ...pattern,
          knowledgeScope: 'GLOBAL', // CF-804: always GLOBAL
          connectionType: 'FLOW_SCOPED',
          tenantId: MASTER_TENANT_ID,
          seededAt: new Date().toISOString(),
        };

        const result = await this.db.storeDocument(ARCH_PHILOSOPHY_INDEX, document, patternId);
        if (result.isSuccess) {
          patternsSeeded++;
        } else {
          this.logger.warn(
            `BootstrapFromDocumentsService: failed to seed ${patternId}: ${result.errorMessage ?? 'unknown'}`,
          );
          patternsFailed++;
        }
      }

      this.logger.log(
        `BootstrapFromDocumentsService: complete — seeded=${patternsSeeded} failed=${patternsFailed}`,
      );
      return DataProcessResult.success({ patternsSeeded, patternsFailed });
    } catch (err) {
      return DataProcessResult.failure(
        'BOOTSTRAP_FROM_DOCUMENTS_ERROR',
        `BootstrapFromDocumentsService threw: ${String(err)}`,
      );
    }
  }

  /**
   * Seed a flow's design corpus from history-seeds/{slug}-design-corpus.json.
   *
   * Routes by patternType:
   *   DESIGN_REASONING → xiigen-planning-decisions  (retrieved during planning phases)
   *   ARCH_PATTERN     → xiigen-rag-patterns        (retrieved during convergence rounds)
   *
   * Idempotent — uses patternId as the document ID.
   * Phase 7 reads designReasoningCount and archPatternCount from the result.
   */
  async seedFlowCorpus(flowId: string): Promise<DataProcessResult<SeedFlowCorpusResult>> {
    try {
      if (!flowId) {
        return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
      }

      const filename = `${flowId.toLowerCase()}-design-corpus.json`;
      const seedFile = path.join(__dirname, 'history-seeds', filename);
      const rawPatterns = this.loadSeedFile(seedFile);

      if (rawPatterns === null) {
        return DataProcessResult.failure(
          'SEED_FILE_NOT_FOUND',
          `${filename} not found at ${seedFile}`,
        );
      }

      let designReasoningCount = 0;
      let archPatternCount = 0;
      let failedCount = 0;

      for (const pattern of rawPatterns) {
        const patternId = String(pattern['patternId'] ?? '');
        const patternType = String(pattern['patternType'] ?? '');

        if (!patternId) {
          failedCount++;
          continue;
        }

        // Route by patternType — each type belongs in a different retrieval index
        let targetIndex: string;
        if (patternType === 'DESIGN_REASONING') {
          targetIndex = PLANNING_DECISIONS_INDEX;
        } else if (
          patternType === 'ARCH_PATTERN' ||
          patternType === 'RAG_PATTERN' ||
          patternType === 'RAG'
        ) {
          targetIndex = RAG_PATTERNS_INDEX;
        } else {
          this.logger.warn(
            `BootstrapFromDocumentsService.seedFlowCorpus: unknown patternType '${patternType}' for ${patternId} — skipping`,
          );
          failedCount++;
          continue;
        }

        const document: Record<string, unknown> = {
          ...pattern,
          knowledgeScope: 'GLOBAL',
          connectionType: 'FLOW_SCOPED',
          tenantId: MASTER_TENANT_ID,
          seededAt: new Date().toISOString(),
        };

        const result = await this.db.storeDocument(targetIndex, document, patternId);
        if (result.isSuccess) {
          if (patternType === 'DESIGN_REASONING') {
            designReasoningCount++;
          } else {
            archPatternCount++;
          }
        } else {
          this.logger.warn(
            `BootstrapFromDocumentsService.seedFlowCorpus: failed to seed ${patternId}: ${result.errorMessage ?? 'unknown'}`,
          );
          failedCount++;
        }
      }

      this.logger.log(
        `BootstrapFromDocumentsService.seedFlowCorpus(${flowId}): ` +
          `designReasoning=${designReasoningCount} archPattern=${archPatternCount} failed=${failedCount}`,
      );
      return DataProcessResult.success({
        flowId,
        designReasoningCount,
        archPatternCount,
        failedCount,
      });
    } catch (err) {
      return DataProcessResult.failure(
        'SEED_FLOW_CORPUS_ERROR',
        `seedFlowCorpus(${flowId}) threw: ${String(err)}`,
      );
    }
  }

  private loadSeedFile(filePath: string): Array<Record<string, unknown>> | null {
    try {
      if (!fs.existsSync(filePath)) return null;
      const raw = fs.readFileSync(filePath, 'utf-8');
      return JSON.parse(raw) as Array<Record<string, unknown>>;
    } catch {
      return null;
    }
  }
}
