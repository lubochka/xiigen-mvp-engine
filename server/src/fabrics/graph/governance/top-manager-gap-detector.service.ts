/**
 * TopManagerGapDetectorService — detects graph knowledge gaps and creates mutation proposals.
 *
 * Algorithm (called at Phase F retrospective):
 *   1. Query graph for edges involving this archetype
 *   2. Filter: edges below evidence threshold (observationCount < minEvidence)
 *   3. Skip edges recently rejected (wasRejected check on RejectionReasonService)
 *   4. Classify scope via SK-434 ladder
 *   5. Create GraphMutationProposal (status: PENDING_SCREEN)
 *   6. Store proposal in xiigen-graph-proposals
 *   7. Return proposals for downstream processing
 *
 * Codebase adaptations:
 *   - ELASTICSEARCH_SERVICE → DATABASE_SERVICE
 *   - FREEDOM_CONFIG → GRAPH_CONFIG_READER
 *   - Uses `Date.now()` for ID generation (no uuid import needed)
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { IDatabaseService, DATABASE_SERVICE } from '../../interfaces';
import { IGraphConfigReader, GRAPH_CONFIG_READER } from '../planning/planning-abstracts';
import { GraphMutation, GraphMutationProposal, MutationType } from './mutation-proposal.types';

@Injectable()
export class TopManagerGapDetectorService {
  private readonly logger = new Logger(TopManagerGapDetectorService.name);
  private readonly INDEX = 'xiigen-graph-proposals';

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {}

  async detectAndPropose(params: {
    archetype: string;
    runId: string;
    proposedBy: string; // model name
  }): Promise<GraphMutationProposal[]> {
    const minEvidence = this.config
      ? await this.config.get('engine.governance.minEvidenceCount', 3)
      : 3;
    const rejectWindow = this.config
      ? await this.config.get('engine.governance.rejectionWindowDays', 30)
      : 30;

    // Query edges involving this archetype
    const edgeResult = await this.graphRag.query({
      fromEntity: params.archetype,
    });

    const proposals: GraphMutationProposal[] = [];

    for (const edge of edgeResult.edges) {
      // Skip immutable edges
      if (edge.immutable) continue;

      // Skip if above evidence threshold
      if (edge.observationCount >= minEvidence) continue;

      // Check rejection history
      const rejectCheck = await this.db.searchDocuments(
        'xiigen-graph-rejections',
        {
          fromEntity: edge.fromEntity,
          relationship: edge.relationship,
          toEntity: edge.toEntity,
        },
        1,
      );
      if (rejectCheck.isSuccess && (rejectCheck.data?.length ?? 0) > 0) {
        const lastRejection = rejectCheck.data![0];
        const daysSince =
          (Date.now() - Date.parse(String(lastRejection['rejectedAt'] ?? 0))) / 86_400_000;
        if (daysSince < rejectWindow) {
          this.logger.debug(`Skipping recently rejected edge: ${edge.fromEntity}→${edge.toEntity}`);
          continue;
        }
      }

      const mutationType = this.classifyMutation(
        edge.confidence,
        edge.observationCount,
        minEvidence,
      );
      const scope = this.classifyScope(edge.relationship);

      const mutation: GraphMutation = {
        type: mutationType,
        fromEntity: edge.fromEntity,
        fromType: edge.fromType,
        relationship: edge.relationship,
        toEntity: edge.toEntity,
        toType: edge.toType,
        confidence: edge.confidence,
        reasoning: `Gap detected: observationCount=${edge.observationCount} < minEvidence=${minEvidence}. Scope: ${scope}`,
      };

      const proposal: GraphMutationProposal = {
        id: `proposal-${params.archetype}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        mutation,
        proposedBy: params.proposedBy,
        proposerRunId: params.runId,
        evidenceCount: edge.observationCount,
        status: 'PENDING_SCREEN',
        createdAt: new Date().toISOString(),
      };

      try {
        await this.db.storeDocument(
          this.INDEX,
          proposal as unknown as Record<string, unknown>,
          proposal.id,
        );
        proposals.push(proposal);
        this.logger.log(`Proposal created: ${proposal.id} for ${edge.fromEntity}→${edge.toEntity}`);
      } catch (err) {
        this.logger.warn(
          `Failed to store proposal for ${edge.fromEntity}→${edge.toEntity}: ${err}`,
        );
      }
    }

    return proposals;
  }

  private classifyMutation(
    confidence: number,
    observationCount: number,
    minEvidence: number,
  ): MutationType {
    if (confidence < 0.4) return 'WEAKEN_EDGE';
    if (observationCount === 0) return 'ADD_EDGE';
    if (confidence > 0.85 && observationCount < minEvidence) return 'STRENGTHEN_EDGE';
    return 'STRENGTHEN_EDGE';
  }

  /** SK-434 scope ladder based on relationship type. */
  private classifyScope(relationship: string): string {
    const lc = relationship.toLowerCase();
    if (lc.includes('infra') || lc.includes('provision')) return 'NEW_INFRA';
    if (lc.includes('flow')) return 'NEW_FLOW';
    if (lc.includes('ext')) return 'EXTENSION';
    if (lc.includes('adapt')) return 'ADAPTATION';
    return 'CONVENTION';
  }
}
