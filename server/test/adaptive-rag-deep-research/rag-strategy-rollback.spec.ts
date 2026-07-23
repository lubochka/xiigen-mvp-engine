/**
 * RAGStrategyRollback — Unit Tests (T466).
 *
 * Tests:
 *   RSR-1:  missing tenantId → UNSCOPED_QUERY
 *   RSR-2:  missing targetVersionId → MISSING_TARGET_VERSION
 *   RSR-3:  valid rollback → success
 *   RSR-4:  previousActiveVersion from current pointer doc
 *   RSR-5:  previousActiveVersion = 'none' when no active pointer
 *   RSR-6:  rolledBackToVersion echoed in result
 *   RSR-7:  storeDocument() called BEFORE enqueue() — DNA-8
 *   RSR-8:  DB store failure → error propagated
 *   RSR-9:  rollback event emitted to rag.strategy.rolled_back
 *   RSR-10: rollbackId is non-empty string
 */

import { RAGStrategyRollback } from '../../src/engine/flows/rag-optimization/rag-strategy-rollback.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-rsr-test';
const TARGET = 'v1-stable';

function makeDb(activeVersionId?: string) {
  return {
    searchDocuments: jest.fn(async () => {
      if (activeVersionId)
        return DataProcessResult.success([{ version_id: activeVersionId, active: true }]);
      return DataProcessResult.success([]);
    }),
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

describe('RAGStrategyRollback — Unit (T466)', () => {
  it('RSR-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new RAGStrategyRollback(makeDb(), makeQueue());
    const r = await svc.rollback('', TARGET);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('RSR-2: missing targetVersionId → MISSING_TARGET_VERSION', async () => {
    const svc = new RAGStrategyRollback(makeDb(), makeQueue());
    const r = await svc.rollback(TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_TARGET_VERSION');
  });

  it('RSR-3: valid rollback → success', async () => {
    const svc = new RAGStrategyRollback(makeDb(), makeQueue());
    const r = await svc.rollback(TENANT, TARGET);
    expect(r.isSuccess).toBe(true);
  });

  it('RSR-4: previousActiveVersion from current pointer doc', async () => {
    const svc = new RAGStrategyRollback(makeDb('v3-current'), makeQueue());
    const r = await svc.rollback(TENANT, TARGET);
    expect(r.data!.previousActiveVersion).toBe('v3-current');
  });

  it('RSR-5: previousActiveVersion = "none" when no active pointer', async () => {
    const svc = new RAGStrategyRollback(makeDb(), makeQueue());
    const r = await svc.rollback(TENANT, TARGET);
    expect(r.data!.previousActiveVersion).toBe('none');
  });

  it('RSR-6: rolledBackToVersion echoed in result', async () => {
    const svc = new RAGStrategyRollback(makeDb(), makeQueue());
    const r = await svc.rollback(TENANT, TARGET);
    expect(r.data!.rolledBackToVersion).toBe(TARGET);
  });

  it('RSR-7: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new RAGStrategyRollback(db, queue);
    await svc.rollback(TENANT, TARGET);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('RSR-8: DB store failure → error propagated', async () => {
    const svc = new RAGStrategyRollback(makeFailingDb(), makeQueue());
    const r = await svc.rollback(TENANT, TARGET);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('RSR-9: rollback event emitted to rag.strategy.rolled_back', async () => {
    const queue = makeQueue();
    const svc = new RAGStrategyRollback(makeDb(), queue);
    await svc.rollback(TENANT, TARGET);
    expect(queue.enqueue).toHaveBeenCalledWith('rag.strategy.rolled_back', expect.any(Object));
  });

  it('RSR-10: rollbackId is non-empty string', async () => {
    const svc = new RAGStrategyRollback(makeDb(), makeQueue());
    const r = await svc.rollback(TENANT, TARGET);
    expect(r.data!.rollbackId.length).toBeGreaterThan(0);
  });
});
