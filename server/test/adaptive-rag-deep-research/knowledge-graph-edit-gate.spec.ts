/**
 * KnowledgeGraphEditGate — Unit Tests (T452).
 *
 * Tests:
 *   KGEG-1:  missing tenantId → UNSCOPED_QUERY
 *   KGEG-2:  missing editType → MISSING_EDIT_TYPE
 *   KGEG-3:  missing requestedBy → MISSING_ACTOR
 *   KGEG-4:  BFA config not found → default allow (allowed=true)
 *   KGEG-5:  BFA config allowed=false → GRAPH_EDIT_BLOCKED
 *   KGEG-6:  BFA config allowed=true → success
 *   KGEG-7:  storeDocument() called BEFORE enqueue() — DNA-8
 *   KGEG-8:  DB store failure → error propagated
 *   KGEG-9:  gate event emitted to graph.edit.gate.checked
 *   KGEG-10: gateRef is non-empty string
 *   KGEG-11: editType echoed back in result
 */

import { KnowledgeGraphEditGate } from '../../src/engine/flows/rag-optimization/knowledge-graph-edit-gate.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-kgeg-test';
const EDIT_TYPE = 'NODE_DELETE';
const AFFECTED = ['node-1', 'node-2'];
const ACTOR = 'user-admin';

function makeDb(bfaAllowed?: boolean) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async () => {
      if (bfaAllowed === undefined) return DataProcessResult.success([]);
      return DataProcessResult.success([{ allowed: bfaAllowed }]);
    }),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push(doc);
      return DataProcessResult.success({ ...doc, _id: id ?? 'x' });
    }),
    _stored: stored,
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

describe('KnowledgeGraphEditGate — Unit (T452)', () => {
  it('KGEG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(), makeQueue());
    const r = await svc.checkEditApproval('', EDIT_TYPE, AFFECTED, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('KGEG-2: missing editType → MISSING_EDIT_TYPE', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(), makeQueue());
    const r = await svc.checkEditApproval(TENANT, '', AFFECTED, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_EDIT_TYPE');
  });

  it('KGEG-3: missing requestedBy → MISSING_ACTOR', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(), makeQueue());
    const r = await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_ACTOR');
  });

  it('KGEG-4: BFA config not found → default allow (allowed=true)', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(undefined), makeQueue());
    const r = await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.allowed).toBe(true);
  });

  it('KGEG-5: BFA config allowed=false → GRAPH_EDIT_BLOCKED', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(false), makeQueue());
    const r = await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('GRAPH_EDIT_BLOCKED');
  });

  it('KGEG-6: BFA config allowed=true → success', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(true), makeQueue());
    const r = await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.allowed).toBe(true);
  });

  it('KGEG-7: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new KnowledgeGraphEditGate(db, queue);
    await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('KGEG-8: DB store failure → error propagated', async () => {
    const svc = new KnowledgeGraphEditGate(makeFailingDb(), makeQueue());
    const r = await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('KGEG-9: gate event emitted to graph.edit.gate.checked', async () => {
    const queue = makeQueue();
    const svc = new KnowledgeGraphEditGate(makeDb(), queue);
    await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(queue.enqueue).toHaveBeenCalledWith('graph.edit.gate.checked', expect.any(Object));
  });

  it('KGEG-10: gateRef is non-empty string', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(), makeQueue());
    const r = await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.gateRef.length).toBeGreaterThan(0);
  });

  it('KGEG-11: editType echoed back in result', async () => {
    const svc = new KnowledgeGraphEditGate(makeDb(), makeQueue());
    const r = await svc.checkEditApproval(TENANT, EDIT_TYPE, AFFECTED, ACTOR);
    expect(r.data!.editType).toBe(EDIT_TYPE);
  });
});
