/**
 * RejectionReasonService — Phase 5 rejection tracking + mutation application.
 *
 * storeRejectionReason():
 *   Stores rejection in xiigen-graph-rejections index.
 *   TopManagerGapDetector checks this before re-proposing the same edge.
 *
 * wasRejected():
 *   Check if a specific edge was recently rejected (within window).
 *
 * applyApprovedMutation():
 *   Calls IGraphRagService.upsertEdge() with proposal mutation values.
 *   Updates proposal status to APPROVED in xiigen-graph-proposals.
 *
 * rollback():
 *   Sets edge confidence to 0.0 via IGraphRagService.upsertEdge().
 *   Updates proposal status to ROLLED_BACK.
 *   Zero confidence effectively removes edge from high-confidence queries.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { IDatabaseService, DATABASE_SERVICE } from '../../interfaces';
import { GraphMutationProposal, ApprovalDecision } from './mutation-proposal.types';

@Injectable()
export class RejectionReasonService {
  private readonly logger = new Logger(RejectionReasonService.name);
  private readonly REJECT_INDEX = 'xiigen-graph-rejections';
  private readonly PROPOSAL_INDEX = 'xiigen-graph-proposals';

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {}

  async storeRejectionReason(
    proposal: GraphMutationProposal,
    reason: string,
    decidedBy: string,
  ): Promise<void> {
    const id = `${proposal.id}-rejection-${Date.now()}`;
    await this.db.storeDocument(
      this.REJECT_INDEX,
      {
        proposalId: proposal.id,
        fromEntity: proposal.mutation.fromEntity,
        relationship: proposal.mutation.relationship,
        toEntity: proposal.mutation.toEntity,
        reason,
        decidedBy,
        rejectedAt: new Date().toISOString(),
      },
      id,
    );

    // Update proposal status
    const decision: ApprovalDecision = {
      approved: false,
      decidedBy,
      reason,
      decidedAt: new Date().toISOString(),
    };
    await this.db.storeDocument(
      this.PROPOSAL_INDEX,
      { id: proposal.id, status: 'REJECTED', approvalDecision: decision } as Record<
        string,
        unknown
      >,
      `${proposal.id}-decision`,
    );

    this.logger.log(`Rejection stored for ${proposal.id}: ${reason}`);
  }

  async wasRejected(
    fromEntity: string,
    relationship: string,
    toEntity: string,
    withinDays: number = 30,
  ): Promise<boolean> {
    const result = await this.db.searchDocuments(
      this.REJECT_INDEX,
      { fromEntity, relationship, toEntity },
      1,
    );
    if (!result.isSuccess || !result.data?.length) return false;

    const lastRejection = result.data[0];
    const rejectedAt = String(lastRejection['rejectedAt'] ?? 0);
    const daysSince = (Date.now() - Date.parse(rejectedAt)) / 86_400_000;
    return daysSince < withinDays;
  }

  async applyApprovedMutation(proposal: GraphMutationProposal, decidedBy: string): Promise<void> {
    const m = proposal.mutation;

    await this.graphRag.upsertEdge({
      fromEntity: m.fromEntity,
      fromType: m.fromType,
      relationship: m.relationship,
      toEntity: m.toEntity,
      toType: m.toType,
      confidence: m.confidence,
      reasoning: m.reasoning,
      metadata: m.metadata,
      immutable: false,
    });

    const decision: ApprovalDecision = {
      approved: true,
      decidedBy,
      reason: `Approved: ${m.reasoning}`,
      decidedAt: new Date().toISOString(),
    };

    await this.db.storeDocument(
      this.PROPOSAL_INDEX,
      { id: proposal.id, status: 'APPROVED', approvalDecision: decision } as Record<
        string,
        unknown
      >,
      `${proposal.id}-decision`,
    );

    this.logger.log(`Mutation applied: ${m.fromEntity}→${m.relationship}→${m.toEntity}`);
  }

  async rollback(proposal: GraphMutationProposal): Promise<void> {
    const m = proposal.mutation;

    // Set confidence to 0.0 — effectively removes edge from active queries
    await this.graphRag.upsertEdge({
      fromEntity: m.fromEntity,
      fromType: m.fromType,
      relationship: m.relationship,
      toEntity: m.toEntity,
      toType: m.toType,
      confidence: 0.0,
      reasoning: `Rolled back: ${m.reasoning}`,
      immutable: false,
    });

    await this.db.storeDocument(
      this.PROPOSAL_INDEX,
      { id: proposal.id, status: 'ROLLED_BACK', rolledBackAt: new Date().toISOString() } as Record<
        string,
        unknown
      >,
      `${proposal.id}-rollback`,
    );

    this.logger.log(`Mutation rolled back: ${m.fromEntity}→${m.relationship}→${m.toEntity}`);
  }
}
