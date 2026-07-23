/**
 * RagQualitySeedsService — FLOW-38 Phase A bootstrap
 *
 * Seeds 5 FLOW_DESIGN RAG patterns to xiigen-rag-patterns.
 * These patterns teach future convergence runs about the FLOW-38
 * learning loop design principles and constraints.
 *
 * Manual bootstrap only (per bootstrap-boundary contract).
 *
 * DNA-3: returns DataProcessResult<T>, never throws.
 * DNA-8: storeDocument before any emit.
 * DNA-5: tenantId from MASTER_TENANT_ID — not passed to fabric methods.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

const RAG_INDEX = 'xiigen-rag-patterns';

const FLOW38_RAG_SEEDS = [
  {
    patternId: 'FLOW-38-DESIGN-001',
    patternType: 'FLOW_DESIGN',
    flowId: 'FLOW-38',
    teachingPoint:
      'The learning loop closes at RAG retrieval: DPO triples with self-judge score ≥ 8.5 are promoted to xiigen-rag-patterns as PROMOTED_DPO patterns. Future convergence runs retrieve these patterns and benefit from prior high-quality outputs. The loop: generate → judge → store triple → promote → retrieve in next run.',
    positiveExample:
      '// score >= 8.5 → promote chosen output as RAG pattern\n// qualityScore = score / 10 (normalizes 0–10 to 0–1)\n// tags: ["dpo-promoted", flowId]',
    negativeExample:
      '// WRONG: promote all DPO triples regardless of score\n// Low-quality triples in RAG index degrade convergence context\n// Result: noise signal instead of learning signal',
    tags: ['rag-quality-feedback', 'dpo-promotion', 'learning-loop'],
    connectionType: 'FLOW_SCOPED',
    tenantId: MASTER_TENANT_ID,
  },
  {
    patternId: 'FLOW-38-DESIGN-002',
    patternType: 'FLOW_DESIGN',
    flowId: 'FLOW-38',
    teachingPoint:
      'RAG retrieve must run BEFORE convergence for each plan step. The step text is the semantic query. If rag.search() fails or returns empty, convergence continues with ragResults="NO_PRIOR_NODES" — it never blocks the chain. This ensures the learning loop enhances quality without creating a hard dependency.',
    positiveExample:
      '// ragResult = await ragRetrieve.handle(ragCtx({ query: stepText }))\n// if (!ragResult.isSuccess) → continue with "NO_PRIOR_NODES"\n// convergenceCtx.inputs.ragResults = JSON.stringify(patterns)',
    negativeExample:
      '// WRONG: fail the convergence step if RAG retrieve fails\n// RAG is a quality enhancement, not a prerequisite\n// Result: convergence fails on empty RAG index → first run always breaks',
    tags: ['rag-quality-feedback', 'rag-retrieve-wiring', 'cycle-chain'],
    connectionType: 'FLOW_SCOPED',
    tenantId: MASTER_TENANT_ID,
  },
  {
    patternId: 'FLOW-38-DESIGN-003',
    patternType: 'FLOW_DESIGN',
    flowId: 'FLOW-38',
    teachingPoint:
      'Every convergence step must record a retrieval outcome to xiigen-rag-retrieval-outcomes (DNA-8). The outcome records which pattern IDs were retrieved, whether the step was accepted, and what grade it received. These outcomes are the raw signal for the FLOW-38 qualityScore update cycle.',
    positiveExample:
      '// storeDocument("xiigen-rag-retrieval-outcomes", { patternIds, accepted, grade, stepText, runId })\n// Store outcome BEFORE returning from the convergence step\n// Outcome recorded even for rejected steps',
    negativeExample:
      '// WRONG: only record outcome for accepted steps\n// Rejected steps with retrieved patterns are negative training signal\n// Omitting rejected outcomes underestimates pattern quality decay',
    tags: ['rag-quality-feedback', 'retrieval-outcomes', 'dna-8'],
    connectionType: 'FLOW_SCOPED',
    tenantId: MASTER_TENANT_ID,
  },
  {
    patternId: 'FLOW-38-DESIGN-004',
    patternType: 'FLOW_DESIGN',
    flowId: 'FLOW-38',
    teachingPoint:
      'qualityScore normalization: self-judge scores are 0–10; qualityScore stored in xiigen-rag-patterns is 0–1. The conversion is qualityScore = score / 10. The RagRetrieveHandler noise filter uses qualityScore >= 0.5 — this corresponds to self-judge score >= 5.0. The promotion threshold 8.5/10 = 0.85 qualityScore ensures only top-tier outputs enter the RAG index.',
    positiveExample:
      '// self-judge score 8.5 → qualityScore 0.85\n// RagRetrieveHandler filter: qualityScore >= 0.5 (corresponds to score >= 5.0)\n// Promotion threshold: score >= 8.5 → only top 15% of outputs promoted',
    negativeExample:
      '// WRONG: store raw 0–10 score as qualityScore\n// RagRetrieveHandler threshold 0.5 would only retrieve score >= 5 if stored as 0–1\n// But if stored as 0–10: qualityScore=8.5 passes filter 8.5 >= 0.5 (always true) → no filtering',
    tags: ['rag-quality-feedback', 'score-normalization', 'quality-score'],
    connectionType: 'FLOW_SCOPED',
    tenantId: MASTER_TENANT_ID,
  },
  {
    patternId: 'FLOW-38-DESIGN-005',
    patternType: 'FLOW_DESIGN',
    flowId: 'FLOW-38',
    teachingPoint:
      'The FLOW-38 learning loop is the read-back from FLOW-37: FLOW-37 produces capability gap signals that identify missing patterns; FLOW-38 closes the loop by promoting high-quality DPO outputs back into the RAG index. The retrieval outcome index (xiigen-rag-retrieval-outcomes) is Phase A infrastructure — Phase B+ generates the qualityScore update topology via cycle-chain/run.',
    positiveExample:
      '// Phase A: DpoToRagPromoter + outcome recording (bootstrap)\n// Phase B+: RagQualityUpdater topology (generated by AI via cycle-chain)\n// The Phase A infrastructure provides the raw data Phase B reads',
    negativeExample:
      '// WRONG: skip Phase A bootstrap and go directly to Phase B topology\n// Phase B topology reads from xiigen-rag-retrieval-outcomes\n// Without Phase A, the index does not exist — Phase B topology has no data to read',
    tags: ['rag-quality-feedback', 'bootstrap-boundary', 'flow-38-architecture'],
    connectionType: 'FLOW_SCOPED',
    tenantId: MASTER_TENANT_ID,
  },
];

export interface SeedResult {
  ragPatternsSeeded: number;
}

@Injectable()
export class RagQualitySeedsService extends MicroserviceBase {
  private readonly logger = new Logger(RagQualitySeedsService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'FLOW-38-SEEDS',
        serviceName: 'RagQualitySeedsService',
        flowId: 'FLOW-38',
      }),
    });
  }

  async seed(): Promise<DataProcessResult<SeedResult>> {
    try {
      let ragPatternsSeeded = 0;

      for (const seed of FLOW38_RAG_SEEDS) {
        const result = await this.dbFabric.storeDocument(
          RAG_INDEX,
          { ...seed, createdAt: new Date().toISOString() } as Record<string, unknown>,
          seed.patternId,
        );
        if (result.isSuccess) {
          ragPatternsSeeded++;
        } else {
          this.logger.warn(
            `RagQualitySeedsService: failed to seed ${seed.patternId}: ${result.errorMessage ?? 'unknown'}`,
          );
        }
      }

      this.logger.log(`RagQualitySeedsService: complete — ragPatterns=${ragPatternsSeeded}`);
      return DataProcessResult.success({ ragPatternsSeeded });
    } catch (err) {
      return DataProcessResult.failure(
        'SEEDS_ERROR',
        `RagQualitySeedsService threw: ${String(err)}`,
      );
    }
  }
}
