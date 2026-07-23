/**
 * GateEnforcementService — Unit Tests (T420).
 *
 * Tests:
 *   GES-1:  missing tenantId → UNSCOPED_QUERY
 *   GES-2:  missing requestId → MISSING_REQUEST_ID
 *   GES-3:  no approved decision → GATE_BLOCKED
 *   GES-4:  approved decision exists → passed=true
 *   GES-5:  requestId echoed in result
 *   GES-6:  storeDocument() called BEFORE enqueue() — DNA-8
 *   GES-7:  DB store failure → error propagated
 *   GES-8:  gate.passed event emitted on success
 *   GES-9:  no event emitted when gate blocked
 *   GES-10: gate.passed not emitted without APPROVED decision
 */

import { ApprovalGateEnforcer } from '../../src/engine/flows/human-approval-gate/approval-gate-enforcer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ges-test';
const REQUEST_ID = 'req-gate-001';

function makeApprovedDb() {
  return {
    searchDocuments: jest.fn(async () =>
      DataProcessResult.success([{ decision: 'APPROVED', request_id: REQUEST_ID }]),
    ),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeBlockedDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeFailingStoreDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([{ decision: 'APPROVED' }])),
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

describe('ApprovalGateEnforcer — Unit (T420)', () => {
  it('GES-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ApprovalGateEnforcer(makeBlockedDb(), makeQueue());
    const r = await svc.checkGate('', REQUEST_ID);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('GES-2: missing requestId → MISSING_REQUEST_ID', async () => {
    const svc = new ApprovalGateEnforcer(makeBlockedDb(), makeQueue());
    const r = await svc.checkGate(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_REQUEST_ID');
  });

  it('GES-3: no approved decision → GATE_BLOCKED', async () => {
    const svc = new ApprovalGateEnforcer(makeBlockedDb(), makeQueue());
    const r = await svc.checkGate(TENANT, REQUEST_ID);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('GATE_BLOCKED');
  });

  it('GES-4: approved decision exists → passed=true', async () => {
    const svc = new ApprovalGateEnforcer(makeApprovedDb(), makeQueue());
    const r = await svc.checkGate(TENANT, REQUEST_ID);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.passed).toBe(true);
  });

  it('GES-5: requestId echoed in result', async () => {
    const svc = new ApprovalGateEnforcer(makeApprovedDb(), makeQueue());
    const r = await svc.checkGate(TENANT, REQUEST_ID);
    expect(r.data!.requestId).toBe(REQUEST_ID);
  });

  it('GES-6: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
    const callOrder: string[] = [];
    const db = {
      searchDocuments: jest.fn(async () => DataProcessResult.success([{ decision: 'APPROVED' }])),
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
    const svc = new ApprovalGateEnforcer(db, queue);
    await svc.checkGate(TENANT, REQUEST_ID);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('GES-7: DB store failure → error propagated', async () => {
    const svc = new ApprovalGateEnforcer(makeFailingStoreDb(), makeQueue());
    const r = await svc.checkGate(TENANT, REQUEST_ID);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('GES-8: gate.passed event emitted on success', async () => {
    const queue = makeQueue();
    const svc = new ApprovalGateEnforcer(makeApprovedDb(), queue);
    await svc.checkGate(TENANT, REQUEST_ID);
    expect(queue.enqueue).toHaveBeenCalledWith('gate.passed', expect.any(Object));
  });

  it('GES-9: no event emitted when gate blocked', async () => {
    const queue = makeQueue();
    const svc = new ApprovalGateEnforcer(makeBlockedDb(), queue);
    await svc.checkGate(TENANT, REQUEST_ID);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('GES-10: gate.passed not emitted without APPROVED decision', async () => {
    const db = {
      searchDocuments: jest.fn(async () => DataProcessResult.success([])),
      storeDocument: jest.fn(async () => DataProcessResult.success({})),
    } as any;
    const queue = makeQueue();
    const svc = new ApprovalGateEnforcer(db, queue);
    await svc.checkGate(TENANT, REQUEST_ID);
    expect(queue.enqueue).not.toHaveBeenCalledWith('gate.passed', expect.any(Object));
  });
});
