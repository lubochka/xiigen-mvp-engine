/**
 * PG-First Sequential Persistence Pattern
 * FLOW-22 GAP-22-02: PG-First Sequential Pattern
 * BFA Rules: CF-405
 * Error Correction: E3
 * Design Decision: DD-195
 *
 * Pattern:
 * 1. Write to PG (commit point — success returns here)
 * 2. Async: index to ES (failure → enqueue retry, never fail the operation)
 *
 * NEVER wraps both in a transaction.
 * NEVER fails the operation if ES write fails.
 */

import { DataProcessResult } from '../data-process-result';
import { IQueueService } from '../../fabrics/interfaces/queue.interface';

export interface PgFirstSequentialLogger {
  warn(message: string, context?: Record<string, unknown>): void;
}

export interface PgFirstSequentialOptions<T> {
  /**
   * The PG write operation. This is the commit point.
   * On success, the operation is considered complete.
   */
  pgWrite: () => Promise<DataProcessResult<T>>;

  /**
   * The ES async index operation. Failure does NOT fail the overall operation.
   * Called non-blocking after pgWrite succeeds.
   */
  esIndex: () => Promise<void>;

  /**
   * Idempotency key for the ES retry queue entry.
   * Used if esIndex fails — queues retry with this key.
   */
  esRetryIdempotencyKey: string;

  /**
   * Queue service for ES retry enqueue.
   */
  queueService: IQueueService;

  /**
   * Logger for warning on ES failure.
   */
  logger: PgFirstSequentialLogger;
}

/**
 * Execute PG-first sequential persistence pattern (CF-405, DD-195).
 *
 * Pattern:
 * 1. Write to PG (commit point — success returns here)
 * 2. Async: index to ES (failure → enqueue retry, never fail the operation)
 *
 * NEVER wraps both in a transaction.
 * NEVER fails the operation if ES write fails.
 */
export async function pgFirstSequential<T>(
  options: PgFirstSequentialOptions<T>,
): Promise<DataProcessResult<T>> {
  // Step 1: PG write (commit point)
  const pgResult = await options.pgWrite();
  if (!pgResult.isSuccess) {
    return pgResult; // PG failed — actual failure
  }

  // Step 2: ES index (non-blocking, async retry on failure)
  options.esIndex().catch(async (err: Error) => {
    options.logger.warn('ES indexing failed, enqueuing retry', {
      idempotencyKey: options.esRetryIdempotencyKey,
      error: err.message,
    });
    await options.queueService.enqueue('es-retry-index', {
      idempotencyKey: options.esRetryIdempotencyKey,
      retryAt: new Date().toISOString(),
    });
  });

  // Return success after PG commit — ES is eventual consistency
  return pgResult;
}
