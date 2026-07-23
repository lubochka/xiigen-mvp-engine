/**
 * Execution model types for the generic-node-executor.
 *
 * DD-220 (GAP-M5): Adds HYBRID_SYNC_ASYNC model for T369 (QuizGradingGate).
 * Grading runs synchronously (in HTTP response); gamification fires asynchronously.
 */

export type ExecutionModel = 'SYNC' | 'ASYNC' | 'BATCH' | 'HYBRID_SYNC_ASYNC';

export type AsyncPhaseErrorHandler = 'LOG_AND_IGNORE' | 'RETRY' | 'DLQ';

export interface HybridSyncAsyncConfig {
  executionModel: 'HYBRID_SYNC_ASYNC';

  syncPhase: {
    /**
     * Step names that run synchronously and contribute to the HTTP response.
     * Execution stops at first failure.
     */
    steps: string[];
  };

  asyncPhase: {
    /**
     * Step names that run asynchronously after the sync response is returned.
     * Failure in async phase does NOT affect the HTTP response.
     */
    steps: string[];

    /**
     * How to handle async phase errors:
     * LOG_AND_IGNORE: Log error, continue (best-effort)
     * RETRY: Retry with exponential backoff
     * DLQ: Push failed job to dead letter queue
     */
    errorHandler: AsyncPhaseErrorHandler;
    maxRetries?: number; // Used when errorHandler = 'RETRY'
    dlqName?: string; // Used when errorHandler = 'DLQ'
  };
}
