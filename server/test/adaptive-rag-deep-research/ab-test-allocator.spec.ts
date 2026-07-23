/**
 * ABTestAllocator — Unit Tests (T456).
 *
 * Tests:
 *   AB-1:  missing tenantId → UNSCOPED_QUERY
 *   AB-2:  missing userId → MISSING_USER_ID
 *   AB-3:  missing experimentId → MISSING_EXPERIMENT_ID
 *   AB-4:  empty variants → MISSING_VARIANTS
 *   AB-5:  deterministic — same (tenant, user, experiment) → same variant
 *   AB-6:  deterministic across 100 calls — always same variant
 *   AB-7:  different users → may get different variants
 *   AB-8:  storeDocument() called BEFORE enqueue() — DNA-8
 *   AB-9:  DB store failure → error propagated
 *   AB-10: event emitted to rag.experiment.variant.assigned
 *   AB-11: existing assignment returned without re-storing (idempotent)
 *   AB-12: assignmentId is non-empty string
 */

import { ABTestAllocator } from '../../src/engine/flows/rag-optimization/ab-test-allocator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ab-test';
const USER_A = 'user-001';
const USER_B = 'user-999';
const EXPERIMENT = 'exp-rag-strategy';
const VARIANTS = ['control', 'treatment-a', 'treatment-b'];

function makeDb(existing?: Record<string, unknown>) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async () =>
      existing ? DataProcessResult.success([existing]) : DataProcessResult.success([]),
    ),
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

describe('ABTestAllocator — Unit (T456)', () => {
  it('AB-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new ABTestAllocator(makeDb(), makeQueue());
    const r = await svc.allocate('', USER_A, EXPERIMENT, VARIANTS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('AB-2: missing userId → MISSING_USER_ID', async () => {
    const svc = new ABTestAllocator(makeDb(), makeQueue());
    const r = await svc.allocate(TENANT, '', EXPERIMENT, VARIANTS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_USER_ID');
  });

  it('AB-3: missing experimentId → MISSING_EXPERIMENT_ID', async () => {
    const svc = new ABTestAllocator(makeDb(), makeQueue());
    const r = await svc.allocate(TENANT, USER_A, '', VARIANTS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_EXPERIMENT_ID');
  });

  it('AB-4: empty variants → MISSING_VARIANTS', async () => {
    const svc = new ABTestAllocator(makeDb(), makeQueue());
    const r = await svc.allocate(TENANT, USER_A, EXPERIMENT, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_VARIANTS');
  });

  it('AB-5: deterministic — same inputs → same variant across two allocations', async () => {
    const svc1 = new ABTestAllocator(makeDb(), makeQueue());
    const svc2 = new ABTestAllocator(makeDb(), makeQueue());
    const r1 = await svc1.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    const r2 = await svc2.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    expect(r1.isSuccess).toBe(true);
    expect(r2.isSuccess).toBe(true);
    expect(r1.data!.variant).toBe(r2.data!.variant);
  });

  it('AB-6: deterministic across 100 calls — always same variant', async () => {
    const firstVariant = (
      await new ABTestAllocator(makeDb(), makeQueue()).allocate(
        TENANT,
        USER_A,
        EXPERIMENT,
        VARIANTS,
      )
    ).data!.variant;
    for (let i = 0; i < 100; i++) {
      const svc = new ABTestAllocator(makeDb(), makeQueue());
      const r = await svc.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
      expect(r.data!.variant).toBe(firstVariant);
    }
  });

  it('AB-7: different users → variant in VARIANTS (valid allocation)', async () => {
    const svc = new ABTestAllocator(makeDb(), makeQueue());
    const rA = await svc.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    const rB = await new ABTestAllocator(makeDb(), makeQueue()).allocate(
      TENANT,
      USER_B,
      EXPERIMENT,
      VARIANTS,
    );
    expect(VARIANTS).toContain(rA.data!.variant);
    expect(VARIANTS).toContain(rB.data!.variant);
  });

  it('AB-8: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new ABTestAllocator(db, queue);
    await svc.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('AB-9: DB store failure → error propagated', async () => {
    const svc = new ABTestAllocator(makeFailingDb(), makeQueue());
    const r = await svc.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('AB-10: event emitted to rag.experiment.variant.assigned', async () => {
    const queue = makeQueue();
    const svc = new ABTestAllocator(makeDb(), queue);
    await svc.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'rag.experiment.variant.assigned',
      expect.any(Object),
    );
  });

  it('AB-11: existing assignment returned without re-storing (idempotent)', async () => {
    const existing = {
      assignment_id: 'ab-existing',
      variant: 'control',
      assigned_at: '2026-01-01T00:00:00Z',
    };
    const db = makeDb(existing);
    const svc = new ABTestAllocator(db, makeQueue());
    const r = await svc.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.variant).toBe('control');
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('AB-12: assignmentId is non-empty string', async () => {
    const svc = new ABTestAllocator(makeDb(), makeQueue());
    const r = await svc.allocate(TENANT, USER_A, EXPERIMENT, VARIANTS);
    expect(r.data!.assignmentId.length).toBeGreaterThan(0);
  });
});
