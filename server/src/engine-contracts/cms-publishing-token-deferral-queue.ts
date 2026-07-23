/**
 * FLOW-22 GAP-NEW-96: Design Token Deferral Queue Interface
 * BFA Rules: CF-402, CF-424
 * Error Correction: E5
 * Task Types: T341, T342 (via T336 Stage 5)
 * Factory: F934
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const TOKEN_DEFERRAL_QUEUE = 'TOKEN_DEFERRAL_QUEUE';

export interface TokenDeferralEntry {
  queueEntryId: string;
  tokenId: string;
  tokenName: string;
  previousValue: Record<string, unknown>;
  newValue: Record<string, unknown>;
  enqueuedAt: string; // ISO-8601
  workspaceId: string;
}

export interface ITokenDeferralQueue {
  /**
   * Enqueue a token update for deferred propagation.
   * Called exclusively by T341 (DesignTokenUpdatePropagation).
   * MUST NOT trigger propagation — only queues.
   *
   * CF-402: structural write point.
   */
  enqueueUpdate(
    tokenId: string,
    tokenName: string,
    previousValue: Record<string, unknown>,
    newValue: Record<string, unknown>,
  ): Promise<DataProcessResult<{ queueEntryId: string; depth: number }>>;

  /**
   * Drain all pending token updates from the queue.
   * Called EXCLUSIVELY by T336 Stage 5 (PostDeployStage).
   * No other caller may invoke drain().
   *
   * Idempotent: calling drain() twice returns empty on second call.
   * CF-402: structural drain point.
   * CF-424: must be called after T336 deploy completes.
   */
  drain(): Promise<
    DataProcessResult<{
      entries: TokenDeferralEntry[];
      drainedCount: number;
      drainedAt: string;
    }>
  >;

  /**
   * Get current queue depth (for monitoring, not drain logic).
   */
  getDepth(): Promise<DataProcessResult<{ depth: number }>>;

  /**
   * Peek at queue without consuming (for health checks).
   */
  peek(limit?: number): Promise<DataProcessResult<{ entries: TokenDeferralEntry[] }>>;

  /**
   * Clear the queue without consuming (for workspace reset).
   * Use with caution — clears all pending token updates.
   */
  clear(): Promise<DataProcessResult<{ clearedCount: number }>>;
}
