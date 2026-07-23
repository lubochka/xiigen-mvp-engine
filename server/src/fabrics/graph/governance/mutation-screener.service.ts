/**
 * MutationScreenerService — Phase 5 pre-simulation screener.
 *
 * Three checks (in order):
 *   1. IMMUTABLE: target edge is immutable → BLOCK
 *   2. DUPLICATE: same from/to pair exists under different relationship name → BLOCK
 *   3. INSUFFICIENT_EVIDENCE: evidenceCount < minEvidenceThreshold → BLOCK
 *
 * Updates proposal status to PENDING_SIMULATION (pass) or REJECTED (block).
 * Updates stored proposal document in xiigen-graph-proposals.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { IDatabaseService, DATABASE_SERVICE } from '../../interfaces';
import { IGraphConfigReader, GRAPH_CONFIG_READER } from '../planning/planning-abstracts';
import { GraphMutationProposal, ScreenerResult } from './mutation-proposal.types';

@Injectable()
export class MutationScreenerService {
  private readonly logger = new Logger(MutationScreenerService.name);
  private readonly INDEX = 'xiigen-graph-proposals';

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {}

  async screen(proposal: GraphMutationProposal): Promise<ScreenerResult> {
    const minEvidence = this.config
      ? await this.config.get('engine.governance.minEvidenceCount', 3)
      : 3;

    // CHECK 1: Immutable conflict
    const existing = await this.graphRag.query({
      fromEntity: proposal.mutation.fromEntity,
      relationship: proposal.mutation.relationship,
      toEntity: proposal.mutation.toEntity,
    });
    if (existing.edges[0]?.immutable) {
      const result: ScreenerResult = {
        passed: false,
        blockedBy: 'IMMUTABLE',
        reason: `Edge ${proposal.mutation.fromEntity}→${proposal.mutation.relationship}→${proposal.mutation.toEntity} is immutable`,
      };
      await this.updateProposalStatus(proposal.id, 'REJECTED', result);
      return result;
    }

    // CHECK 2: Duplicate under different relationship name
    const allEdges = await this.graphRag.query({
      fromEntity: proposal.mutation.fromEntity,
      toEntity: proposal.mutation.toEntity,
    });
    const duplicateEdge = allEdges.edges.find(
      (e) =>
        e.relationship !== proposal.mutation.relationship &&
        e.toEntity === proposal.mutation.toEntity,
    );
    if (duplicateEdge) {
      const result: ScreenerResult = {
        passed: false,
        blockedBy: 'DUPLICATE',
        reason: `Duplicate edge exists as ${duplicateEdge.relationship} — use existing relationship name`,
      };
      await this.updateProposalStatus(proposal.id, 'REJECTED', result);
      return result;
    }

    // CHECK 3: Insufficient evidence
    if (proposal.evidenceCount < minEvidence) {
      const result: ScreenerResult = {
        passed: false,
        blockedBy: 'INSUFFICIENT_EVIDENCE',
        reason: `evidenceCount=${proposal.evidenceCount} < minEvidence=${minEvidence}`,
      };
      await this.updateProposalStatus(proposal.id, 'REJECTED', result);
      return result;
    }

    // All checks passed
    const result: ScreenerResult = { passed: true };
    await this.updateProposalStatus(proposal.id, 'PENDING_SIMULATION', result);
    this.logger.log(`Proposal ${proposal.id} passed screening`);
    return result;
  }

  private async updateProposalStatus(
    proposalId: string,
    status: GraphMutationProposal['status'],
    screenerResult: ScreenerResult,
  ): Promise<void> {
    try {
      await this.db.storeDocument(
        this.INDEX,
        { id: proposalId, status, screenerResult, screenedAt: new Date().toISOString() } as Record<
          string,
          unknown
        >,
        `${proposalId}-screen`,
      );
    } catch (err) {
      this.logger.warn(`Failed to update proposal ${proposalId} status: ${err}`);
    }
  }
}
