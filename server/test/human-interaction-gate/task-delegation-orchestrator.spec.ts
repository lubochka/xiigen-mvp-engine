/**
 * DelegationManager — Unit Tests (T422).
 *
 * Tests:
 *   DM-1:  missing tenantId → UNSCOPED_QUERY
 *   DM-2:  missing taskId → MISSING_TASK_ID
 *   DM-3:  missing fromAssignee → MISSING_FROM_ASSIGNEE
 *   DM-4:  missing toAssignee → MISSING_TO_ASSIGNEE
 *   DM-5:  valid delegation → success
 *   DM-6:  delegationId is non-empty string
 *   DM-7:  delegatedAt is ISO string
 *   DM-8:  fromAssignee echoed in result
 *   DM-9:  toAssignee echoed in result
 *   DM-10: circular delegation A→B when B→A exists → CIRCULAR_DELEGATION
 *   DM-11: storeDocument() called BEFORE enqueue() — DNA-8
 *   DM-12: DB store failure → error propagated
 *   DM-13: task.delegated event emitted
 */

import { TaskDelegationOrchestrator } from '../../src/engine/flows/human-approval-gate/task-delegation-orchestrator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-dm-test';
const TASK = 'task-delegate-001';
const USER_A = 'user-alice';
const USER_B = 'user-bob';

function makeDb(circular = false) {
  return {
    searchDocuments: jest.fn(async () =>
      circular
        ? DataProcessResult.success([{ from_assignee: USER_B, to_assignee: USER_A }])
        : DataProcessResult.success([]),
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

describe('TaskDelegationOrchestrator — Unit (T422)', () => {
  it('DM-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate('', TASK, USER_A, USER_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('DM-2: missing taskId → MISSING_TASK_ID', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, '', USER_A, USER_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TASK_ID');
  });

  it('DM-3: missing fromAssignee → MISSING_FROM_ASSIGNEE', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, '', USER_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_FROM_ASSIGNEE');
  });

  it('DM-4: missing toAssignee → MISSING_TO_ASSIGNEE', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TO_ASSIGNEE');
  });

  it('DM-5: valid delegation → success', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(r.isSuccess).toBe(true);
  });

  it('DM-6: delegationId is non-empty string', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(r.data!.delegationId.length).toBeGreaterThan(0);
  });

  it('DM-7: delegatedAt is ISO string', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(r.data!.delegatedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('DM-8: fromAssignee echoed in result', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(r.data!.fromAssignee).toBe(USER_A);
  });

  it('DM-9: toAssignee echoed in result', async () => {
    const svc = new TaskDelegationOrchestrator(makeDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(r.data!.toAssignee).toBe(USER_B);
  });

  it('DM-10: circular delegation A→B when B→A exists → CIRCULAR_DELEGATION', async () => {
    // B already delegated to A, now A tries to delegate back to B
    const svc = new TaskDelegationOrchestrator(makeDb(true), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('CIRCULAR_DELEGATION');
  });

  it('DM-11: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new TaskDelegationOrchestrator(db, queue);
    await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('DM-12: DB store failure → error propagated', async () => {
    const svc = new TaskDelegationOrchestrator(makeFailingDb(), makeQueue());
    const r = await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('DM-13: task.delegated event emitted', async () => {
    const queue = makeQueue();
    const svc = new TaskDelegationOrchestrator(makeDb(), queue);
    await svc.delegate(TENANT, TASK, USER_A, USER_B);
    expect(queue.enqueue).toHaveBeenCalledWith('task.delegated', expect.any(Object));
  });
});
