/**
 * GraphMutationProposal — types for Phase 5 governance layer.
 *
 * Lifecycle: PENDING_SCREEN → PENDING_SIMULATION → PENDING_HUMAN → APPROVED|REJECTED
 *   OR: PENDING_SCREEN → REJECTED (screener blocks)
 *
 * V9-002 applies to simulation: simulatorModel MUST differ from proposerModel.
 *   If same model → status: SKIPPED (not CONTESTED or CLEAN).
 */

export type MutationType =
  | 'ADD_EDGE'
  | 'STRENGTHEN_EDGE'
  | 'WEAKEN_EDGE'
  | 'REMOVE_EDGE'
  | 'RETYPE_EDGE';

export type ProposalStatus =
  | 'PENDING_SCREEN'
  | 'PENDING_SIMULATION'
  | 'PENDING_HUMAN'
  | 'APPROVED'
  | 'REJECTED'
  | 'ROLLED_BACK';

export interface GraphMutation {
  type: MutationType;
  fromEntity: string;
  fromType: string;
  relationship: string;
  toEntity: string;
  toType: string;
  confidence: number;
  reasoning: string;
  metadata?: Record<string, unknown>;
}

export interface ScreenerResult {
  passed: boolean;
  blockedBy?: 'IMMUTABLE' | 'DUPLICATE' | 'INSUFFICIENT_EVIDENCE';
  reason?: string;
}

export interface SimulationReport {
  status: 'CLEAN' | 'CONTESTED' | 'SKIPPED';
  simulatorModel: string;
  proposerModel: string;
  reasoning: string;
  crossModel: boolean;
}

export interface ApprovalDecision {
  approved: boolean;
  decidedBy: string; // 'human' | model name
  reason: string;
  decidedAt: string;
}

export interface GraphMutationProposal {
  id: string;
  mutation: GraphMutation;
  proposedBy: string; // model name that produced the evidence
  proposerRunId: string;
  evidenceCount: number;
  status: ProposalStatus;
  screenerResult?: ScreenerResult;
  simulationReport?: SimulationReport;
  approvalDecision?: ApprovalDecision;
  createdAt: string;
}

/** Injection token for EdgeVersioningService. */
export const EDGE_VERSIONING_SERVICE = 'EDGE_VERSIONING_SERVICE';
