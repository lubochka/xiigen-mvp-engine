export type ShadowRunStatus =
  | 'PENDING_LOCAL_MODEL'
  | 'ACTIVE'
  | 'GRADUATED'
  | 'REGRESSION'
  | 'STALLED';

export interface ShadowRunRecord {
  taskTypeId: string;
  flowId: string;
  status: ShadowRunStatus;
  paidModelScore?: number;
  ossScore?: number;
  gapScore?: number; // paidModelScore - ossScore, null if ossScore not yet available
  flowsInPending: number;
  stalledAfterFlows: number;
  recordedAt: string;
}

export interface ShadowRunGapResult {
  taskTypeId: string;
  status: ShadowRunStatus;
  gapScore: number | 'UNKNOWN' | 'STALLED';
}

/**
 * IShadowRunService — fabric interface for shadow run tracking.
 * Records paid-model vs OSS-model comparison scores.
 * NEVER throws — all methods return DataProcessResult.
 */
export abstract class IShadowRunService {
  /**
   * Record a shadow run attempt for a task type.
   * Increments flowsInPending counter. Transitions to STALLED when threshold exceeded.
   */
  abstract recordAttempt(params: {
    taskTypeId: string;
    flowId: string;
    paidModelScore?: number;
    ossScore?: number;
  }): Promise<ShadowRunRecord>;

  /**
   * Get gap score for a task type.
   * Returns 'UNKNOWN' when status is PENDING_LOCAL_MODEL.
   * Returns 'STALLED' when flowsInPending > stalledAfterFlows threshold.
   * NEVER throws.
   */
  abstract getGapScore(taskTypeId: string): Promise<ShadowRunGapResult>;

  /**
   * Get all shadow runs for a flow.
   */
  abstract getFlowSummary(flowId: string): Promise<ShadowRunRecord[]>;
}

export const SHADOW_RUN_SERVICE = 'SHADOW_RUN_SERVICE';
