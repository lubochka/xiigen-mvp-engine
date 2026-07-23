/**
 * InMemorySchedulerProvider tests — ISchedulerService.
 * No Bull/Action Scheduler required. Tests verify the scheduling contract.
 *
 * Z-4: CF-795 (no direct Bull imports) and CF-796 (idempotency key) validation.
 */
import { InMemorySchedulerProvider } from './in-memory.provider';
import { ISchedulerService } from '../interfaces/scheduler.interface';

describe('InMemorySchedulerProvider (ISchedulerService)', () => {
  let svc: InMemorySchedulerProvider & ISchedulerService;

  beforeEach(() => {
    svc = new InMemorySchedulerProvider();
  });

  afterEach(() => {
    svc.clear();
  });

  // ── scheduleDelayed ────────────────────────────────────────────────────────

  it('scheduleDelayed returns a jobId', async () => {
    const result = await svc.scheduleDelayed('email-verify-expire', 86_400_000, { userId: 'u1' });
    expect(result.jobId).toBeDefined();
    expect(typeof result.jobId).toBe('string');
    expect(result.jobId.length).toBeGreaterThan(0);
  });

  it('scheduleDelayed job is pending immediately after scheduling', async () => {
    const { jobId } = await svc.scheduleDelayed('test-action', 10_000, {});
    expect(await svc.isScheduled(jobId)).toBe(true);
  });

  it('scheduleDelayed returns same jobId for same idempotencyKey (CF-796)', async () => {
    const r1 = await svc.scheduleDelayed('test', 1_000, {}, 'idem-key-1');
    const r2 = await svc.scheduleDelayed('test', 1_000, {}, 'idem-key-1');
    expect(r1.jobId).toBe(r2.jobId);
  });

  it('scheduleDelayed uses idempotencyKey as jobId when provided', async () => {
    const key = 'verify-expire-user-abc';
    const { jobId } = await svc.scheduleDelayed('email-verify-expire', 1_000, {}, key);
    expect(jobId).toBe(key);
  });

  it('scheduleDelayed different idempotencyKeys produce different jobs', async () => {
    const r1 = await svc.scheduleDelayed('test', 1_000, {}, 'key-a');
    const r2 = await svc.scheduleDelayed('test', 1_000, {}, 'key-b');
    expect(r1.jobId).not.toBe(r2.jobId);
  });

  it('scheduleDelayed without idempotencyKey generates unique jobIds', async () => {
    const r1 = await svc.scheduleDelayed('test', 1_000, {});
    const r2 = await svc.scheduleDelayed('test', 1_000, {});
    expect(r1.jobId).not.toBe(r2.jobId);
  });

  // ── cancelScheduled ────────────────────────────────────────────────────────

  it('cancelScheduled removes a pending job', async () => {
    const { jobId } = await svc.scheduleDelayed('cancel-me', 10_000, {});
    await svc.cancelScheduled(jobId);
    expect(await svc.isScheduled(jobId)).toBe(false);
  });

  it('cancelScheduled is a no-op for missing jobId', async () => {
    await expect(svc.cancelScheduled('nonexistent')).resolves.not.toThrow();
  });

  it('getPendingJobs excludes cancelled jobs', async () => {
    const { jobId } = await svc.scheduleDelayed('action', 10_000, {});
    await svc.cancelScheduled(jobId);
    const pending = svc.getPendingJobs();
    expect(pending.find((j) => j.jobId === jobId)).toBeUndefined();
  });

  // ── isScheduled ────────────────────────────────────────────────────────────

  it('isScheduled returns false for unknown jobId', async () => {
    expect(await svc.isScheduled('unknown-job')).toBe(false);
  });

  it('isScheduled returns true for scheduled job', async () => {
    const { jobId } = await svc.scheduleDelayed('check-me', 10_000, {});
    expect(await svc.isScheduled(jobId)).toBe(true);
  });

  // ── scheduleRecurring ──────────────────────────────────────────────────────

  it('scheduleRecurring returns a scheduleId', async () => {
    const result = await svc.scheduleRecurring('daily-job', '0 8 * * *', {});
    expect(result.scheduleId).toBeDefined();
    expect(typeof result.scheduleId).toBe('string');
  });

  it('scheduleRecurring uses idempotencyKey as scheduleId when provided', async () => {
    const key = 'daily-summary-tenant-1';
    const { scheduleId } = await svc.scheduleRecurring(
      'daily',
      '0 8 * * *',
      {},
      { idempotencyKey: key },
    );
    expect(scheduleId).toBe(key);
  });

  it('scheduleRecurring is visible in getRecurringJobs()', async () => {
    await svc.scheduleRecurring(
      'weekly-report',
      '0 9 * * MON',
      { type: 'weekly' },
      { idempotencyKey: 'weekly-1' },
    );
    const recurring = svc.getRecurringJobs();
    const job = recurring.find((j) => j.scheduleId === 'weekly-1');
    expect(job).toBeDefined();
    expect(job!.action).toBe('weekly-report');
  });

  // ── cancelRecurring ────────────────────────────────────────────────────────

  it('cancelRecurring removes a recurring job', async () => {
    const { scheduleId } = await svc.scheduleRecurring(
      'cancel-this',
      '0 8 * * *',
      {},
      { idempotencyKey: 'cancel-1' },
    );
    await svc.cancelRecurring(scheduleId);
    const recurring = svc.getRecurringJobs();
    expect(recurring.find((j) => j.scheduleId === scheduleId)).toBeUndefined();
  });

  it('cancelRecurring is a no-op for missing scheduleId', async () => {
    await expect(svc.cancelRecurring('nonexistent')).resolves.not.toThrow();
  });

  // ── clear (test utility) ───────────────────────────────────────────────────

  it('clear removes all pending jobs', async () => {
    await svc.scheduleDelayed('job1', 10_000, {});
    await svc.scheduleDelayed('job2', 10_000, {});
    svc.clear();
    expect(svc.getPendingJobs()).toHaveLength(0);
  });

  it('clear removes all recurring jobs', async () => {
    await svc.scheduleRecurring('recurring1', '0 8 * * *', {});
    svc.clear();
    expect(svc.getRecurringJobs()).toHaveLength(0);
  });
});
