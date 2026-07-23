/**
 * InMemorySchedulerProvider — ISchedulerService for tests and local dev.
 *
 * No Bull, no Action Scheduler, no Hangfire required.
 * Scheduled jobs are tracked in-memory with setTimeout().
 * Jobs fire in-process after the specified delay.
 *
 * Limitations vs production providers:
 *   - Jobs are lost on process restart (no persistence)
 *   - Not suitable for multi-process setups
 *   - Idempotency is in-memory only
 *
 * DNA-3: All methods return promises (consistent with production providers).
 */
import { Injectable } from '@nestjs/common';
import { ISchedulerService } from '../interfaces/scheduler.interface';

interface ScheduledJob {
  jobId: string;
  action: string;
  delayMs: number;
  payload: Record<string, unknown>;
  scheduledAt: number;
  timer: ReturnType<typeof setTimeout>;
  fired: boolean;
}

interface RecurringJob {
  scheduleId: string;
  action: string;
  cronExpression: string;
  payload: Record<string, unknown>;
  options?: { userId?: string; timezone?: string; idempotencyKey?: string };
}

@Injectable()
export class InMemorySchedulerProvider implements ISchedulerService {
  private readonly jobs = new Map<string, ScheduledJob>();
  private readonly recurringJobs = new Map<string, RecurringJob>();
  private idempotencyIndex = new Map<string, string>(); // idempotencyKey → jobId

  async scheduleDelayed(
    action: string,
    delayMs: number,
    payload: Record<string, unknown>,
    idempotencyKey?: string,
  ): Promise<{ jobId: string }> {
    // CF-796: idempotency check — same key returns existing job
    if (idempotencyKey) {
      const existingId = this.idempotencyIndex.get(idempotencyKey);
      if (existingId) {
        const existing = this.jobs.get(existingId);
        if (existing && !existing.fired) {
          return { jobId: existingId };
        }
        // Existing job already fired — allow re-scheduling
        this.idempotencyIndex.delete(idempotencyKey);
      }
    }

    const jobId =
      idempotencyKey ?? `inmem-${action}-${Date.now()}-${Math.random().toString(36).slice(2)}`;

    const timer = setTimeout(() => {
      const job = this.jobs.get(jobId);
      if (job) job.fired = true;
      // In-memory: action handler invocation is outside the scope of this provider.
      // Tests that need to observe firing should mock setTimeout or use jest.useFakeTimers().
    }, delayMs);

    const job: ScheduledJob = {
      jobId,
      action,
      delayMs,
      payload,
      scheduledAt: Date.now(),
      timer,
      fired: false,
    };

    this.jobs.set(jobId, job);
    if (idempotencyKey) this.idempotencyIndex.set(idempotencyKey, jobId);

    return { jobId };
  }

  async cancelScheduled(jobId: string): Promise<void> {
    const job = this.jobs.get(jobId);
    if (job) {
      clearTimeout(job.timer);
      this.jobs.delete(jobId);
      // Clean idempotency index
      for (const [key, id] of this.idempotencyIndex.entries()) {
        if (id === jobId) {
          this.idempotencyIndex.delete(key);
          break;
        }
      }
    }
  }

  async isScheduled(jobId: string): Promise<boolean> {
    const job = this.jobs.get(jobId);
    return !!job && !job.fired;
  }

  async scheduleRecurring(
    action: string,
    cronExpression: string,
    payload: Record<string, unknown>,
    options?: { userId?: string; timezone?: string; idempotencyKey?: string },
  ): Promise<{ scheduleId: string }> {
    const scheduleId = options?.idempotencyKey ?? `${action}-${Date.now()}`;
    // In-memory provider does not execute cron expressions (no process loop).
    // Records the registration for test assertion purposes.
    this.recurringJobs.set(scheduleId, { scheduleId, action, cronExpression, payload, options });
    return { scheduleId };
  }

  async cancelRecurring(scheduleId: string): Promise<void> {
    this.recurringJobs.delete(scheduleId);
  }

  // ── Test utilities ─────────────────────────────────────────────────────────

  /** Return all pending (not yet fired) scheduled jobs. Test utility. */
  getPendingJobs(): ScheduledJob[] {
    return [...this.jobs.values()].filter((j) => !j.fired);
  }

  /** Return all registered recurring jobs. Test utility. */
  getRecurringJobs(): RecurringJob[] {
    return [...this.recurringJobs.values()];
  }

  /** Clear all jobs and recurring schedules. Test utility. */
  clear(): void {
    for (const job of this.jobs.values()) clearTimeout(job.timer);
    this.jobs.clear();
    this.recurringJobs.clear();
    this.idempotencyIndex.clear();
  }
}
