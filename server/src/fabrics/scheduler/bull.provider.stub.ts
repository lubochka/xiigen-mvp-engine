/**
 * BullSchedulerProvider STUB — ISchedulerService backed by Bull/BullMQ.
 *
 * STUB: @nestjs/bull and bull are not installed. This file documents the
 * interface contract and throws a clear error if instantiated without them.
 *
 * To activate:
 *   npm install @nestjs/bull bull
 *   npm install -D @types/bull
 * Then add to SchedulerModule:
 *   BullModule.registerQueue({ name: 'scheduled-actions' })
 *
 * CF-795: No direct Bull imports in generated services — ISchedulerService only.
 * CF-796: All scheduleDelayed calls MUST pass idempotencyKey.
 *
 * Full implementation (when bull is installed):
 * ─────────────────────────────────────────────────────────────────────────────
 * import { Injectable } from '@nestjs/common';
 * import { InjectQueue } from '@nestjs/bull';
 * import { Queue } from 'bull';
 * import { ISchedulerService } from '../interfaces/scheduler.interface';
 *
 * @Injectable()
 * export class BullSchedulerProvider implements ISchedulerService {
 *   constructor(
 *     @InjectQueue('scheduled-actions') private readonly queue: Queue,
 *   ) {}
 *
 *   async scheduleDelayed(
 *     action: string,
 *     delayMs: number,
 *     payload: Record<string, unknown>,
 *     idempotencyKey?: string,
 *   ): Promise<{ jobId: string }> {
 *     if (idempotencyKey) {
 *       const existing = await this.queue.getJob(idempotencyKey);
 *       if (existing && (await existing.getState()) === 'delayed') {
 *         return { jobId: String(existing.id) };
 *       }
 *     }
 *     const job = await this.queue.add(action, payload, {
 *       delay: delayMs,
 *       jobId: idempotencyKey,
 *       removeOnComplete: true,
 *       removeOnFail: false,
 *     });
 *     return { jobId: String(job.id) };
 *   }
 *
 *   async cancelScheduled(jobId: string): Promise<void> {
 *     const job = await this.queue.getJob(jobId);
 *     if (job) await job.remove();
 *   }
 *
 *   async isScheduled(jobId: string): Promise<boolean> {
 *     const job = await this.queue.getJob(jobId);
 *     if (!job) return false;
 *     const state = await job.getState();
 *     return state === 'delayed' || state === 'waiting';
 *   }
 *
 *   async scheduleRecurring(
 *     action: string,
 *     cronExpression: string,
 *     payload: Record<string, unknown>,
 *     options?: { userId?: string; timezone?: string; idempotencyKey?: string },
 *   ): Promise<{ scheduleId: string }> {
 *     const scheduleId = options?.idempotencyKey ?? `${action}-${Date.now()}`;
 *     await this.queue.add(
 *       action,
 *       { ...payload, _scheduleId: scheduleId, _userId: options?.userId },
 *       {
 *         repeat: { cron: cronExpression, tz: options?.timezone ?? 'UTC' },
 *         jobId: scheduleId,
 *       },
 *     );
 *     return { scheduleId };
 *   }
 *
 *   async cancelRecurring(scheduleId: string): Promise<void> {
 *     const repeatableJobs = await this.queue.getRepeatableJobs();
 *     const job = repeatableJobs.find(j => j.id === scheduleId);
 *     if (job) await this.queue.removeRepeatableByKey(job.key);
 *   }
 * }
 * ─────────────────────────────────────────────────────────────────────────────
 */
import { Injectable } from '@nestjs/common';
import { ISchedulerService } from '../interfaces/scheduler.interface';

@Injectable()
export class BullSchedulerProvider implements ISchedulerService {
  constructor() {
    throw new Error(
      'BullSchedulerProvider requires @nestjs/bull and bull. ' +
        'Run: npm install @nestjs/bull bull\n' +
        'See src/fabrics/scheduler/bull.provider.stub.ts for full implementation.',
    );
  }

  async scheduleDelayed(
    _a: string,
    _d: number,
    _p: Record<string, unknown>,
    _k?: string,
  ): Promise<{ jobId: string }> {
    return { jobId: '' };
  }
  async cancelScheduled(_jobId: string): Promise<void> {
    /* stub */
  }
  async isScheduled(_jobId: string): Promise<boolean> {
    return false;
  }
  async scheduleRecurring(
    _a: string,
    _c: string,
    _p: Record<string, unknown>,
    _o?: Record<string, unknown>,
  ): Promise<{ scheduleId: string }> {
    return { scheduleId: '' };
  }
  async cancelRecurring(_scheduleId: string): Promise<void> {
    /* stub */
  }
}
