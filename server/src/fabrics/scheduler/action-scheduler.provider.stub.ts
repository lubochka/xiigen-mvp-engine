/**
 * ActionSchedulerProvider — ISchedulerService for WordPress Action Scheduler.
 *
 * STUB: Full implementation requires a PHP bridge or WordPress REST API bridge.
 * This stub logs scheduling requests and returns synthetic IDs.
 *
 * Production integration pattern:
 *   1. The WordPress plugin must expose a REST endpoint: POST /wp-json/xiigen/v1/scheduler/schedule
 *   2. ActionSchedulerProvider calls that endpoint via IHttpBridgeService
 *   3. The WordPress plugin calls as_schedule_single_action() internally
 *
 * Eventual enforcement note:
 *   Action Scheduler fires hooks on WP cron ticks (triggered by page loads or real cron).
 *   For TTL windows < 1 hour, this provider is degraded — use BullSchedulerProvider.
 *   For daily/weekly TTL windows (e.g. 24h email verification), this is acceptable.
 *
 * CF-795: No direct WP-Cron or Action Scheduler imports in Node.js services.
 * CF-796: All scheduleDelayed calls MUST pass idempotencyKey.
 */
import { Injectable, Logger } from '@nestjs/common';
import { ISchedulerService } from '../interfaces/scheduler.interface';

@Injectable()
export class ActionSchedulerProvider implements ISchedulerService {
  private readonly logger = new Logger(ActionSchedulerProvider.name);

  async scheduleDelayed(
    action: string,
    delayMs: number,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<{ jobId: string }> {
    const fireAt = new Date(Date.now() + delayMs).toISOString();
    this.logger.log(
      `[STUB] Would call as_schedule_single_action('${action}', ${fireAt}) ` +
        `via WordPress REST API. Idempotency: ${idempotencyKey ?? 'none'}`,
    );
    // Stub returns synthetic jobId based on idempotencyKey for testability
    return { jobId: idempotencyKey ?? `stub-${action}-${Date.now()}` };
  }

  async cancelScheduled(jobId: string): Promise<void> {
    this.logger.log(
      `[STUB] Would call as_unschedule_action() for jobId: ${jobId} ` + `via WordPress REST API.`,
    );
  }

  async isScheduled(jobId: string): Promise<boolean> {
    this.logger.log(
      `[STUB] Would call as_next_scheduled_action() for: ${jobId} ` +
        `via WordPress REST API. Returns false (stub).`,
    );
    return false;
  }

  async scheduleRecurring(
    action: string,
    cronExpression: string,
    _payload: Record<string, unknown>,
    options?: { userId?: string; timezone?: string; idempotencyKey?: string },
  ): Promise<{ scheduleId: string }> {
    const scheduleId = options?.idempotencyKey ?? `${action}-recurring`;
    this.logger.log(
      `[STUB] Would call as_schedule_recurring_action('${action}', cron='${cronExpression}') ` +
        `via WordPress REST API. NOTE: WP-Cron has eventual enforcement — fires on page load.`,
    );
    return { scheduleId };
  }

  async cancelRecurring(scheduleId: string): Promise<void> {
    this.logger.log(
      `[STUB] Would call as_unschedule_action() for recurring: ${scheduleId} ` +
        `via WordPress REST API.`,
    );
  }
}
