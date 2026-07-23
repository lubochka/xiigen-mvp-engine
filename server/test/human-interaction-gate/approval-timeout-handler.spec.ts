/**
 * ApprovalTimeoutHandler — Unit Tests (T415).
 *
 * Tests:
 *   ATH-1:  missing tenantId → UNSCOPED_QUERY
 *   ATH-2:  missing requestId → MISSING_REQUEST_ID
 *   ATH-3:  missing createdAt → MISSING_CREATED_AT
 *   ATH-4:  not-yet-timed-out request → timedOut=false, no escalation
 *   ATH-5:  timed-out request → timedOut=true
 *   ATH-6:  escalationId is non-empty string when timed out
 *   ATH-7:  timeoutThresholdMinutes from FREEDOM config
 *   ATH-8:  storeDocument() called BEFORE enqueue() — DNA-8
 *   ATH-9:  DB store failure → error propagated
 *   ATH-10: approval.escalated event emitted on timeout
 *   ATH-11: no store/enqueue when not timed out
 */

import { ApprovalTimeoutHandler } from '../../src/engine/flows/human-approval-gate/approval-timeout-handler.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ath-test';
const REQUEST_ID = 'req-timeout-001';
// Far in the past — will always be timed out with any threshold
const OLD_DATE = '2020-01-01T00:00:00.000Z';
// Just now — will never be timed out
const NOW_DATE = new Date().toISOString();

function makeDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
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

function makeConfig(thresholdMinutes?: number) {
  return {
    get: jest.fn(async () =>
      thresholdMinutes !== undefined
        ? DataProcessResult.success({ default_minutes: thresholdMinutes })
        : DataProcessResult.failure('NOT_FOUND', 'no config'),
    ),
  } as any;
}

describe('ApprovalTimeoutHandler — Unit (T415)', () => {
  it('ATH-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ApprovalTimeoutHandler(makeDb(), makeQueue(), makeConfig(60));
    const r = await svc.checkTimeout('', REQUEST_ID, OLD_DATE);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('ATH-2: missing requestId → MISSING_REQUEST_ID', async () => {
    const svc = new ApprovalTimeoutHandler(makeDb(), makeQueue(), makeConfig(60));
    const r = await svc.checkTimeout(TENANT, '', OLD_DATE);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_REQUEST_ID');
  });

  it('ATH-3: missing createdAt → MISSING_CREATED_AT', async () => {
    const svc = new ApprovalTimeoutHandler(makeDb(), makeQueue(), makeConfig(60));
    const r = await svc.checkTimeout(TENANT, REQUEST_ID, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_CREATED_AT');
  });

  it('ATH-4: not-yet-timed-out request → timedOut=false, no escalation', async () => {
    const svc = new ApprovalTimeoutHandler(makeDb(), makeQueue(), makeConfig(99999));
    const r = await svc.checkTimeout(TENANT, REQUEST_ID, NOW_DATE);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.timedOut).toBe(false);
    expect(r.data!.escalationId).toBeUndefined();
  });

  it('ATH-5: timed-out request → timedOut=true', async () => {
    const svc = new ApprovalTimeoutHandler(makeDb(), makeQueue(), makeConfig(1));
    const r = await svc.checkTimeout(TENANT, REQUEST_ID, OLD_DATE);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.timedOut).toBe(true);
  });

  it('ATH-6: escalationId is non-empty string when timed out', async () => {
    const svc = new ApprovalTimeoutHandler(makeDb(), makeQueue(), makeConfig(1));
    const r = await svc.checkTimeout(TENANT, REQUEST_ID, OLD_DATE);
    expect(r.data!.escalationId!.length).toBeGreaterThan(0);
  });

  it('ATH-7: timeoutThresholdMinutes from FREEDOM config', async () => {
    const svc = new ApprovalTimeoutHandler(makeDb(), makeQueue(), makeConfig(720));
    const r = await svc.checkTimeout(TENANT, REQUEST_ID, NOW_DATE);
    expect(r.data!.timeoutThresholdMinutes).toBe(720);
  });

  it('ATH-8: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new ApprovalTimeoutHandler(db, queue, makeConfig(1));
    await svc.checkTimeout(TENANT, REQUEST_ID, OLD_DATE);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('ATH-9: DB store failure → error propagated', async () => {
    const svc = new ApprovalTimeoutHandler(makeFailingDb(), makeQueue(), makeConfig(1));
    const r = await svc.checkTimeout(TENANT, REQUEST_ID, OLD_DATE);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('ATH-10: approval.escalated event emitted on timeout', async () => {
    const queue = makeQueue();
    const svc = new ApprovalTimeoutHandler(makeDb(), queue, makeConfig(1));
    await svc.checkTimeout(TENANT, REQUEST_ID, OLD_DATE);
    expect(queue.enqueue).toHaveBeenCalledWith('approval.escalated', expect.any(Object));
  });

  it('ATH-11: no store/enqueue when not timed out', async () => {
    const db = makeDb();
    const queue = makeQueue();
    const svc = new ApprovalTimeoutHandler(db, queue, makeConfig(99999));
    await svc.checkTimeout(TENANT, REQUEST_ID, NOW_DATE);
    expect(db.storeDocument).not.toHaveBeenCalled();
    expect(queue.enqueue).not.toHaveBeenCalled();
  });
});
