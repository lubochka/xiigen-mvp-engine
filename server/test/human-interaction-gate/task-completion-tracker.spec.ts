/**
 * TaskCompletionTracker — Unit Tests (T417).
 *
 * Tests:
 *   TCT-1:  missing tenantId → UNSCOPED_QUERY
 *   TCT-2:  missing taskId → MISSING_TASK_ID
 *   TCT-3:  missing completedBy → MISSING_COMPLETED_BY
 *   TCT-4:  missing completionStatus → MISSING_COMPLETION_STATUS
 *   TCT-5:  valid args → success
 *   TCT-6:  trackingId is non-empty string
 *   TCT-7:  recordedAt is ISO string
 *   TCT-8:  taskId echoed in result
 *   TCT-9:  storeDocument() called BEFORE enqueue() — DNA-8
 *   TCT-10: DB store failure → error propagated
 *   TCT-11: task.completed event emitted
 */

import { TaskCompletionTracker } from '../../src/engine/flows/human-approval-gate/task-completion-tracker.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-tct-test';
const TASK = 'task-999';
const BY = 'user-doer';
const STATUS = 'COMPLETED';

function makeDb() {
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeFailingDb() {
  return {
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'write error')),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

describe('TaskCompletionTracker — Unit (T417)', () => {
  it('TCT-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion('', TASK, BY, STATUS, 30);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('TCT-2: missing taskId → MISSING_TASK_ID', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, '', BY, STATUS, 30);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TASK_ID');
  });

  it('TCT-3: missing completedBy → MISSING_COMPLETED_BY', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, TASK, '', STATUS, 30);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_COMPLETED_BY');
  });

  it('TCT-4: missing completionStatus → MISSING_COMPLETION_STATUS', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, TASK, BY, '', 30);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_COMPLETION_STATUS');
  });

  it('TCT-5: valid args → success', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, TASK, BY, STATUS, 30);
    expect(r.isSuccess).toBe(true);
  });

  it('TCT-6: trackingId is non-empty string', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, TASK, BY, STATUS, 30);
    expect(r.data!.trackingId.length).toBeGreaterThan(0);
  });

  it('TCT-7: recordedAt is ISO string', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, TASK, BY, STATUS, 30);
    expect(r.data!.recordedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('TCT-8: taskId echoed in result', async () => {
    const svc = new TaskCompletionTracker(makeDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, TASK, BY, STATUS, 30);
    expect(r.data!.taskId).toBe(TASK);
  });

  it('TCT-9: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      storeDocument: jest.fn(async () => {
        callOrder.push('store');
        return DataProcessResult.success({});
      }),
    } as any;
    const queue = {
      enqueue: jest.fn(async () => {
        callOrder.push('enqueue');
        return DataProcessResult.success('m');
      }),
    } as any;
    const svc = new TaskCompletionTracker(db, queue);
    await svc.trackCompletion(TENANT, TASK, BY, STATUS, 30);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('TCT-10: DB store failure → error propagated', async () => {
    const svc = new TaskCompletionTracker(makeFailingDb(), makeQueue());
    const r = await svc.trackCompletion(TENANT, TASK, BY, STATUS, 30);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('TCT-11: task.completed event emitted', async () => {
    const queue = makeQueue();
    const svc = new TaskCompletionTracker(makeDb(), queue);
    await svc.trackCompletion(TENANT, TASK, BY, STATUS, 30);
    expect(queue.enqueue).toHaveBeenCalledWith('task.completed', expect.any(Object));
  });
});
