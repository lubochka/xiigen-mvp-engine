/**
 * FLOW-22 GAP-NEW-93: PublishSaga DUAL Entry Type Executor
 * BFA Rules: CF-412
 * Error Correction: E2
 * Task Types: T338 (PublishRollback)
 * Factory: F925
 * Dependency: GAP-NEW-94 (ICdnSnapshotService must exist for eligibility check)
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const PUBLISH_ROLLBACK_EXECUTOR = 'PUBLISH_ROLLBACK_EXECUTOR';

export interface IRollbackEligibility {
  eligible: boolean;
  reason?: string;
  snapshotId?: string;
  snapshotAge?: number; // days
}

export interface IPublishRollbackExecutor {
  /**
   * Entry A: Saga compensation (automatic).
   * Called when T336 saga enters FAILED state after snapshot captured.
   * NO permission check required (internal system action).
   * NO audit log entry (compensation is system behaviour, not user action).
   */
  executeCompensation(
    publishJobId: string,
  ): Promise<DataProcessResult<{ rolledBack: boolean; snapshotId: string }>>;

  /**
   * Entry B: User-initiated rollback.
   * Called by user request after successful publish.
   * REQUIRES permission check (publish:rollback).
   * REQUIRES F940 audit log entry — mandatory.
   *
   * CF-412: This entry path MUST exist (E2 correction).
   */
  executeUserRollback(
    publishJobId: string,
    userId: string,
    permissionToken: string,
  ): Promise<DataProcessResult<{ rolledBack: boolean; snapshotId: string }>>;

  /**
   * Check if rollback is eligible for this publish job.
   * Used by BOTH entry paths.
   * Returns ineligible if:
   *   - No snapshot captured (CF-408)
   *   - Snapshot expired (FREEDOM: publish.snapshot.ttlDays)
   *   - Publish job not in COMPLETED or FAILED state
   */
  checkEligibility(publishJobId: string): Promise<DataProcessResult<IRollbackEligibility>>;
}
