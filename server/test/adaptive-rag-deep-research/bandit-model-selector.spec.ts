/**
 * BanditModelSelector — Unit Tests (T445).
 *
 * Tests:
 *   BMS-1:  missing tenantId → UNSCOPED_QUERY
 *   BMS-2:  missing sessionId → MISSING_SESSION_ID
 *   BMS-3:  no arm config in DB → default arm returned
 *   BMS-4:  greedy selection picks highest-weight arm
 *   BMS-5:  exploring=true when seed < epsilon
 *   BMS-6:  storeDocument() BEFORE enqueue() — DNA-8
 *   BMS-7:  selection stored with arm name and exploring flag
 *   BMS-8:  DB storeDocument failure → propagates error, enqueue NOT called
 *   BMS-9:  selectionId is non-empty string
 *   BMS-10: selection event emitted to bandit.arm.selected channel
 */

import { BanditModelSelector } from '../../src/engine/flows/rag-optimization/bandit-model-selector.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-bms-test';
const SESSION = 'sess-bms-1';

function makeDb(armsDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(armsDocs)),
    storeDocument: jest.fn(async (_i: string, doc: Record<string, unknown>, id?: string) => {
      stored.push({ ...doc, _id: id ?? 'doc-1' });
      return DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' });
    }),
    _stored: stored,
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: Record<string, unknown>) => {
      events.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _events: events,
  } as any;
}

function makeFailingDb() {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success([])),
    storeDocument: jest.fn(async () =>
      DataProcessResult.failure('STORAGE_FAILED', 'DB write error'),
    ),
  } as any;
}

describe('BanditModelSelector — Unit (T445)', () => {
  it('BMS-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new BanditModelSelector(makeDb(), makeQueue());
    const r = await svc.selectArm(SESSION, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('BMS-2: missing sessionId → MISSING_SESSION_ID', async () => {
    const svc = new BanditModelSelector(makeDb(), makeQueue());
    const r = await svc.selectArm('', TENANT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('BMS-3: no arm config in DB → returns default arm', async () => {
    const svc = new BanditModelSelector(makeDb([]), makeQueue());
    const r = await svc.selectArm(SESSION, TENANT);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.selectedArm).toBe('hybrid-rag');
  });

  it('BMS-4: greedy selection picks highest-weight arm', async () => {
    const config = [
      {
        tenant_id: TENANT,
        active: true,
        arms: { 'vector-rag': 0.2, 'graph-rag': 0.7, 'hybrid-rag': 0.1 },
        epsilon: 0.0,
      },
    ];
    const svc = new BanditModelSelector(makeDb(config), makeQueue());
    const r = await svc.selectArm(SESSION, TENANT, { seed: 0.5 });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.selectedArm).toBe('graph-rag');
    expect(r.data!.exploring).toBe(false);
  });

  it('BMS-5: seed < epsilon → exploring=true', async () => {
    const config = [
      {
        tenant_id: TENANT,
        active: true,
        arms: { 'vector-rag': 0.8, 'graph-rag': 0.1, 'hybrid-rag': 0.1 },
        epsilon: 0.3,
      },
    ];
    const svc = new BanditModelSelector(makeDb(config), makeQueue());
    const r = await svc.selectArm(SESSION, TENANT, { seed: 0.1 });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.exploring).toBe(true);
  });

  it('BMS-6: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
        return DataProcessResult.success('msg-1');
      }),
    } as any;
    const svc = new BanditModelSelector(db, queue);
    await svc.selectArm(SESSION, TENANT);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('BMS-7: selection stored with arm name and exploring flag', async () => {
    const db = makeDb([]);
    const svc = new BanditModelSelector(db, makeQueue());
    await svc.selectArm(SESSION, TENANT);
    const doc = db._stored[0];
    expect(doc['session_id']).toBe(SESSION);
    expect(doc['tenant_id']).toBe(TENANT);
    expect(doc['selected_arm']).toBeTruthy();
    expect(doc).toHaveProperty('exploring');
  });

  it('BMS-8: DB storeDocument failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new BanditModelSelector(makeFailingDb(), queue);
    const r = await svc.selectArm(SESSION, TENANT);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('BMS-9: selectionId is non-empty string', async () => {
    const svc = new BanditModelSelector(makeDb([]), makeQueue());
    const r = await svc.selectArm(SESSION, TENANT);
    expect(r.isSuccess).toBe(true);
    expect(typeof r.data!.selectionId).toBe('string');
    expect(r.data!.selectionId.length).toBeGreaterThan(0);
  });

  it('BMS-10: selection event emitted to bandit.arm.selected channel', async () => {
    const queue = makeQueue();
    const svc = new BanditModelSelector(makeDb([]), queue);
    await svc.selectArm(SESSION, TENANT);
    expect(queue.enqueue).toHaveBeenCalledWith('bandit.arm.selected', expect.any(Object));
  });
});
