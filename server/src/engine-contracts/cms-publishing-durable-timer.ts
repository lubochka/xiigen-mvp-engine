/**
 * FLOW-22 GAP-NEW-92: IDurableTimer Interface + Cancellable Timer
 * BFA Rules: CF-409
 * Error Correction: E4
 * Task Types: T337 (ScheduledPublishTrigger)
 * Factory: F924
 */

import { DataProcessResult } from '../kernel/data-process-result';

export const DURABLE_TIMER_SERVICE = 'DURABLE_TIMER_SERVICE';

export interface IDurableTimer {
  /**
   * Schedule a payload to be delivered at fireAt.
   * Returns timerId for cancellation.
   * Idempotency key prevents duplicate scheduling (DNA-7).
   */
  schedule(
    payload: Record<string, unknown>,
    fireAt: Date,
    options?: {
      idempotencyKey?: string;
      targetQueue?: string;
    },
  ): Promise<
    DataProcessResult<{
      timerId: string;
      scheduledAt: string;
      fireAt: string;
    }>
  >;

  /**
   * Cancel a scheduled timer.
   *
   * CRITICAL (CF-409, E4):
   * If timer has already fired, returns:
   *   DataProcessResult.success({ cancelled: false, alreadyFired: true })
   * NEVER throws on already-fired.
   *
   * If timer not found:
   *   DataProcessResult.failure('TIMER_NOT_FOUND', ...)
   */
  cancel(timerId: string): Promise<
    DataProcessResult<{
      cancelled: boolean;
      alreadyFired: boolean;
    }>
  >;

  /**
   * Get current status of a timer.
   */
  getStatus(timerId: string): Promise<
    DataProcessResult<{
      status: 'pending' | 'fired' | 'cancelled';
      scheduledAt: string;
      fireAt: string;
      firedAt?: string;
      cancelledAt?: string;
    }>
  >;
}
