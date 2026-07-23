/**
 * ControlPlaneGraphEdit — Unit Tests (T462).
 *
 * Tests:
 *   CPGE-1:  missing tenantId → UNSCOPED_QUERY
 *   CPGE-2:  missing gateRef → MISSING_GATE_REF
 *   CPGE-3:  missing editType → MISSING_EDIT_TYPE
 *   CPGE-4:  valid args → success
 *   CPGE-5:  editVersionId is non-empty string
 *   CPGE-6:  gateRef echoed in result
 *   CPGE-7:  editType echoed in result
 *   CPGE-8:  affectedNodes echoed in result
 *   CPGE-9:  storeDocument() called BEFORE enqueue() — DNA-8
 *   CPGE-10: DB store failure → error propagated
 *   CPGE-11: edit event emitted to rag.graph.edit.applied
 *   CPGE-12: appliedAt is ISO string
 */

import { ControlPlaneGraphEdit } from '../../src/engine/flows/rag-optimization/control-plane-graph-edit.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-cpge-test';
const GATE_REF = 'ggate-12345-abcde';
const EDIT_TYPE = 'NODE_ADD';
const NODES = ['node-1', 'node-2'];
const PAYLOAD = { property: 'value' };

function makeDb() {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    _stored: stored,
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

describe('ControlPlaneGraphEdit — Unit (T462)', () => {
  it('CPGE-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit('', GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('CPGE-2: missing gateRef → MISSING_GATE_REF', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, '', EDIT_TYPE, NODES, PAYLOAD);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_GATE_REF');
  });

  it('CPGE-3: missing editType → MISSING_EDIT_TYPE', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, '', NODES, PAYLOAD);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_EDIT_TYPE');
  });

  it('CPGE-4: valid args → success', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.isSuccess).toBe(true);
  });

  it('CPGE-5: editVersionId is non-empty string', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.data!.editVersionId.length).toBeGreaterThan(0);
  });

  it('CPGE-6: gateRef echoed in result', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.data!.gateRef).toBe(GATE_REF);
  });

  it('CPGE-7: editType echoed in result', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.data!.editType).toBe(EDIT_TYPE);
  });

  it('CPGE-8: affectedNodes echoed in result', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.data!.affectedNodes).toEqual(NODES);
  });

  it('CPGE-9: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new ControlPlaneGraphEdit(db, queue);
    await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('CPGE-10: DB store failure → error propagated', async () => {
    const svc = new ControlPlaneGraphEdit(makeFailingDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('CPGE-11: edit event emitted to rag.graph.edit.applied', async () => {
    const queue = makeQueue();
    const svc = new ControlPlaneGraphEdit(makeDb(), queue);
    await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(queue.enqueue).toHaveBeenCalledWith('rag.graph.edit.applied', expect.any(Object));
  });

  it('CPGE-12: appliedAt is ISO string', async () => {
    const svc = new ControlPlaneGraphEdit(makeDb(), makeQueue());
    const r = await svc.applyEdit(TENANT, GATE_REF, EDIT_TYPE, NODES, PAYLOAD);
    expect(r.data!.appliedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
