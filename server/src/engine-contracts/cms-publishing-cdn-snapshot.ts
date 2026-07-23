/**
 * FLOW-22 GAP-NEW-94: CDN Snapshot Service
 * BFA Rules: CF-408
 * Task Types: T336, T338
 * Factory: F928
 * Impact if unresolved: T338 rollback BREAKS entirely
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const CDN_SNAPSHOT_SERVICE = 'CDN_SNAPSHOT_SERVICE';

export interface ICdnSnapshot {
  snapshotId: string;
  workspaceId: string;
  publishJobId: string;
  capturedAt: string; // ISO-8601
  cdnEndpoint: string;
  contentManifest: string[]; // list of CDN object keys included
  sizeBytes: number;
}

export interface ICdnSnapshotService {
  /**
   * Capture current CDN state as a snapshot.
   * MUST be called in T336 Stage 2 BEFORE any build or deploy.
   * CF-408: Without this, rollback is ineligible.
   *
   * Returns snapshotId which must be stored in F931 saga state.
   */
  captureCdnSnapshot(
    workspaceId: string,
    publishJobId: string,
  ): Promise<
    DataProcessResult<{
      snapshotId: string;
      capturedAt: string;
      objectCount: number;
    }>
  >;

  /**
   * Verify a snapshot exists and is not expired.
   * Used by T338 checkEligibility (check-15).
   *
   * age: number of days since capture
   * expired: computed against FREEDOM publish.snapshot.ttlDays
   */
  verifySnapshot(snapshotId: string): Promise<
    DataProcessResult<{
      exists: boolean;
      age: number; // days since capturedAt
      capturedAt: string;
      expired: boolean;
    }>
  >;

  /**
   * Restore CDN to snapshot state.
   * Called by T338 Entry A (compensation) and Entry B (user-initiated).
   * Must be atomic — partial restore must be detectable.
   */
  restoreFromSnapshot(
    snapshotId: string,
    workspaceId: string,
  ): Promise<
    DataProcessResult<{
      restoredAt: string;
      objectsRestored: number;
    }>
  >;

  /**
   * Purge a snapshot (after TTL or explicit cleanup).
   * Once purged, rollback is no longer possible.
   */
  purgeSnapshot(snapshotId: string): Promise<DataProcessResult<void>>;

  /**
   * List snapshots for a workspace (for user-initiated rollback UI).
   */
  listSnapshots(
    workspaceId: string,
    limit?: number,
  ): Promise<DataProcessResult<{ snapshots: ICdnSnapshot[]; hasMore: boolean }>>;
}
