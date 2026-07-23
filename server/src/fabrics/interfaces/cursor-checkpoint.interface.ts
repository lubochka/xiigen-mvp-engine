/**
 * ICursorCheckpointService
 * FLOW-14 — EP-4 Saga Cycle cursor durability.
 * CF-193: cursor values must be monotonically increasing.
 * Used by T190 (EtlSyncJob) and T192 (EtlBackfillJob) for crash recovery.
 */
export interface ICursorCheckpointService {
  /**
   * Persists the current cursor position for a given job.
   * Called as the final step of the EP-4 saga cycle (commit_cursor phase).
   */
  saveCheckpoint(jobId: string, cursor: string, metadata?: Record<string, unknown>): Promise<void>;

  /**
   * Loads the last saved cursor for a job.
   * Returns null if no checkpoint exists (first run).
   */
  loadCheckpoint(
    jobId: string,
  ): Promise<{ cursor: string; metadata?: Record<string, unknown> } | null>;

  /**
   * Validates that newCursor is strictly greater than the last saved cursor.
   * CF-193: backward cursor movement is prohibited.
   * Returns true if monotonic, false if regression detected.
   */
  validateMonotonic(jobId: string, newCursor: string): Promise<boolean>;

  /**
   * Removes the checkpoint for a job (used after successful backfill completion).
   */
  clearCheckpoint(jobId: string): Promise<void>;
}
