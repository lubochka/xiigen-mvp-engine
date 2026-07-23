/**
 * HumanTaskAssigner — Unit Tests (T416).
 *
 * Tests:
 *   HTA-1:  missing tenantId → UNSCOPED_QUERY
 *   HTA-2:  missing taskId → MISSING_TASK_ID
 *   HTA-3:  missing assigneeId → MISSING_ASSIGNEE_ID
 *   HTA-4:  missing deadline → MISSING_DEADLINE
 *   HTA-5:  missing priority → MISSING_PRIORITY
 *   HTA-6:  valid args → success
 *   HTA-7:  assignmentId is non-empty string
 *   HTA-8:  assignedAt is ISO string
 *   HTA-9:  assigneeId echoed in result
 *   HTA-10: deadline echoed in result
 *   HTA-11: priority echoed in result
 *   HTA-12: storeDocument() called BEFORE enqueue() — DNA-8
 *   HTA-13: DB store failure → error propagated
 *   HTA-14: task.assigned event emitted
 */

import { HumanTaskAssigner } from '../../src/engine/flows/human-approval-gate/human-task-assigner.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-hta-test';
const TASK_ID = 'task-456';
const ASSIGNEE = 'user-reviewer';
const DEADLINE = '2026-04-01T12:00:00Z';
const PRIORITY = 'HIGH';

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

describe('HumanTaskAssigner — Unit (T416)', () => {
  it('HTA-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask('', TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('HTA-2: missing taskId → MISSING_TASK_ID', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, '', ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TASK_ID');
  });

  it('HTA-3: missing assigneeId → MISSING_ASSIGNEE_ID', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, '', DEADLINE, PRIORITY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ASSIGNEE_ID');
  });

  it('HTA-4: missing deadline → MISSING_DEADLINE', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, '', PRIORITY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_DEADLINE');
  });

  it('HTA-5: missing priority → MISSING_PRIORITY', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_PRIORITY');
  });

  it('HTA-6: valid args → success', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.isSuccess).toBe(true);
  });

  it('HTA-7: assignmentId is non-empty string', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.data!.assignmentId.length).toBeGreaterThan(0);
  });

  it('HTA-8: assignedAt is ISO string', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.data!.assignedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('HTA-9: assigneeId echoed in result', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.data!.assigneeId).toBe(ASSIGNEE);
  });

  it('HTA-10: deadline echoed in result', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.data!.deadline).toBe(DEADLINE);
  });

  it('HTA-11: priority echoed in result', async () => {
    const svc = new HumanTaskAssigner(makeDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.data!.priority).toBe(PRIORITY);
  });

  it('HTA-12: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new HumanTaskAssigner(db, queue);
    await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('HTA-13: DB store failure → error propagated', async () => {
    const svc = new HumanTaskAssigner(makeFailingDb(), makeQueue());
    const r = await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('HTA-14: task.assigned event emitted', async () => {
    const queue = makeQueue();
    const svc = new HumanTaskAssigner(makeDb(), queue);
    await svc.assignTask(TENANT, TASK_ID, ASSIGNEE, DEADLINE, PRIORITY);
    expect(queue.enqueue).toHaveBeenCalledWith('task.assigned', expect.any(Object));
  });
});
