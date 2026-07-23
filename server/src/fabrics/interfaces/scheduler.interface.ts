/**
 * ISchedulerService — Fabric 10: Delayed and recurring action scheduling.
 *
 * Schedule delayed or recurring actions without knowing which scheduling
 * infrastructure the runtime uses. Providers:
 *   - InMemorySchedulerProvider (dev/test — no deps, in-process)
 *   - BullSchedulerProvider (Node.js/NestJS production — requires bull package)
 *   - ActionSchedulerProvider (WordPress — requires Action Scheduler plugin)
 *   - HangfireProvider (.NET — stub; requires Hangfire NuGet)
 *
 * Z-4: Introduced to reclassify T48 from INCOMPATIBLE to IMPL_VARIES_WITH_PROVIDER.
 *
 * CF-795: No direct Bull/Hangfire/WP-Cron imports in generated services.
 * CF-796: All delayed actions MUST carry idempotencyKey to prevent duplicate scheduling.
 */

export const SCHEDULER_SERVICE = 'SCHEDULER_SERVICE';

export interface ISchedulerService {
  /**
   * Schedule an action to run after a delay.
   * @param action         - unique action name, registered as a handler
   * @param delayMs        - delay in milliseconds from now
   * @param payload        - data passed to the handler when it fires
   * @param idempotencyKey - prevents duplicate scheduling; same key = no-op on 2nd call
   * @returns jobId for tracking/cancellation
   */
  scheduleDelayed(
    action: string,
    delayMs: number,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<{ jobId: string }>;

  /** Cancel a previously scheduled delayed action. No-op if already fired or cancelled. */
  cancelScheduled(jobId: string): Promise<void>;

  /** Check if a scheduled action is still pending. */
  isScheduled(jobId: string): Promise<boolean>;

  /**
   * Schedule a recurring action on a cron expression.
   * @param action         - unique action name
   * @param cronExpression - standard cron: '0 20 * * *' = daily at 8pm UTC
   * @param payload        - passed to handler on each execution
   * @param options.timezone       - IANA timezone (default: UTC)
   * @param options.idempotencyKey - prevents duplicate recurring schedules
   * @returns scheduleId for cancellation
   *
   * NOTE: WP-Cron-based providers (ActionSchedulerProvider) have eventual
   * enforcement — fires on next page view after cron time, not real-time.
   * Acceptable for daily/weekly cadences. Not acceptable for SLA < 1 hour.
   */
  scheduleRecurring(
    action: string,
    cronExpression: string,
    payload: Record<string, unknown>,
    options?: {
      userId?: string;
      timezone?: string;
      idempotencyKey?: string;
    },
  ): Promise<{ scheduleId: string }>;

  /** Cancel a recurring scheduled action. No-op if not found. */
  cancelRecurring(scheduleId: string): Promise<void>;
}
