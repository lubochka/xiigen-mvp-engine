/**
 * ScheduledTaskTrigger — Unit Tests (T418).
 *
 * Tests:
 *   STT-1:  missing tenantId → UNSCOPED_QUERY
 *   STT-2:  missing taskId → MISSING_TASK_ID
 *   STT-3:  missing triggerAt → MISSING_TRIGGER_AT
 *   STT-4:  valid args → success
 *   STT-5:  triggerId is non-empty string
 *   STT-6:  taskId echoed in result
 *   STT-7:  triggerAt echoed in result
 *   STT-8:  idempotent — same (taskId, triggerAt) returns existing (duplicate=true)
 *   STT-9:  duplicate=false on first call
 *   STT-10: no re-store on duplicate (storeDocument not called)
 *   STT-11: storeDocument() called BEFORE enqueue() — DNA-8
 *   STT-12: DB store failure → error propagated
 *   STT-13: task.trigger.scheduled event emitted
 */

import { ScheduledTaskTrigger } from '../../src/engine/flows/human-approval-gate/scheduled-task-trigger.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-stt-test';
const TASK_ID = 'task-scheduled-001';
const TRIGGER_AT = '2026-06-01T09:00:00Z';

function makeDb(existing?: Record<string, unknown>) {
  return {
    searchDocuments: jest.fn(async () =>
      existing ? DataProcessResult.success([existing]) : DataProcessResult.success([]),
    ),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
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

describe('ScheduledTaskTrigger — Unit (T418)', () => {
  it('STT-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule('', TASK_ID, TRIGGER_AT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('STT-2: missing taskId → MISSING_TASK_ID', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule(TENANT, '', TRIGGER_AT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TASK_ID');
  });

  it('STT-3: missing triggerAt → MISSING_TRIGGER_AT', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TRIGGER_AT');
  });

  it('STT-4: valid args → success', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(r.isSuccess).toBe(true);
  });

  it('STT-5: triggerId is non-empty string', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(r.data!.triggerId.length).toBeGreaterThan(0);
  });

  it('STT-6: taskId echoed in result', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(r.data!.taskId).toBe(TASK_ID);
  });

  it('STT-7: triggerAt echoed in result', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(r.data!.triggerAt).toBe(TRIGGER_AT);
  });

  it('STT-8: idempotent — same (taskId, triggerAt) returns existing (duplicate=true)', async () => {
    const existing = { trigger_id: 'st-existing', task_id: TASK_ID, trigger_at: TRIGGER_AT };
    const db = makeDb(existing);
    const svc = new ScheduledTaskTrigger(db, makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.duplicate).toBe(true);
    expect(r.data!.triggerId).toBe('st-existing');
  });

  it('STT-9: duplicate=false on first call', async () => {
    const svc = new ScheduledTaskTrigger(makeDb(), makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(r.data!.duplicate).toBe(false);
  });

  it('STT-10: no re-store on duplicate (storeDocument not called)', async () => {
    const existing = { trigger_id: 'st-existing', task_id: TASK_ID, trigger_at: TRIGGER_AT };
    const db = makeDb(existing);
    const svc = new ScheduledTaskTrigger(db, makeQueue());
    await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('STT-11: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
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
    const svc = new ScheduledTaskTrigger(db, queue);
    await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('STT-12: DB store failure → error propagated', async () => {
    const svc = new ScheduledTaskTrigger(makeFailingDb(), makeQueue());
    const r = await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('STT-13: task.trigger.scheduled event emitted', async () => {
    const queue = makeQueue();
    const svc = new ScheduledTaskTrigger(makeDb(), queue);
    await svc.schedule(TENANT, TASK_ID, TRIGGER_AT);
    expect(queue.enqueue).toHaveBeenCalledWith('task.trigger.scheduled', expect.any(Object));
  });
});
