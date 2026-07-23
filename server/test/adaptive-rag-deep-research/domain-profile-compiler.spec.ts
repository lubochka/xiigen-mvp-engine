/**
 * DomainProfileCompiler — Unit Tests (T451).
 *
 * Tests:
 *   DPC-1:  missing tenantId → UNSCOPED_QUERY
 *   DPC-2:  missing domainId → MISSING_DOMAIN_ID
 *   DPC-3:  valid args → status QUEUED
 *   DPC-4:  jobId is non-empty string
 *   DPC-5:  queuedAt is ISO string
 *   DPC-6:  storeDocument() called BEFORE enqueue() — DNA-8
 *   DPC-7:  DB store failure → error propagated
 *   DPC-8:  compile event emitted to domain.profile.compile.triggered
 *   DPC-9:  empty sourceDocs array → still queues successfully
 *   DPC-10: tenantId and domainId echoed back in result
 */

import { DomainProfileCompiler } from '../../src/engine/flows/rag-optimization/domain-profile-compiler.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-dpc-test';
const DOMAIN = 'domain-dpc-001';

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

describe('DomainProfileCompiler — Unit (T451)', () => {
  it('DPC-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new DomainProfileCompiler(makeDb(), makeQueue());
    const r = await svc.compile('', DOMAIN, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('DPC-2: missing domainId → MISSING_DOMAIN_ID', async () => {
    const svc = new DomainProfileCompiler(makeDb(), makeQueue());
    const r = await svc.compile(TENANT, '', []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_DOMAIN_ID');
  });

  it('DPC-3: valid args → status QUEUED', async () => {
    const svc = new DomainProfileCompiler(makeDb(), makeQueue());
    const r = await svc.compile(TENANT, DOMAIN, [{ key: 'val' }]);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('QUEUED');
  });

  it('DPC-4: jobId is non-empty string', async () => {
    const svc = new DomainProfileCompiler(makeDb(), makeQueue());
    const r = await svc.compile(TENANT, DOMAIN, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.jobId.length).toBeGreaterThan(0);
  });

  it('DPC-5: queuedAt is ISO string', async () => {
    const svc = new DomainProfileCompiler(makeDb(), makeQueue());
    const r = await svc.compile(TENANT, DOMAIN, []);
    expect(r.isSuccess).toBe(true);
    expect(() => new Date(r.data!.queuedAt)).not.toThrow();
    expect(r.data!.queuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('DPC-6: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new DomainProfileCompiler(db, queue);
    await svc.compile(TENANT, DOMAIN, []);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('DPC-7: DB store failure → error propagated', async () => {
    const svc = new DomainProfileCompiler(makeFailingDb(), makeQueue());
    const r = await svc.compile(TENANT, DOMAIN, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('DPC-8: compile event emitted to domain.profile.compile.triggered', async () => {
    const queue = makeQueue();
    const svc = new DomainProfileCompiler(makeDb(), queue);
    await svc.compile(TENANT, DOMAIN, []);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'domain.profile.compile.triggered',
      expect.any(Object),
    );
  });

  it('DPC-9: empty sourceDocs array → queues successfully', async () => {
    const svc = new DomainProfileCompiler(makeDb(), makeQueue());
    const r = await svc.compile(TENANT, DOMAIN, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('QUEUED');
  });

  it('DPC-10: tenantId and domainId echoed back in result', async () => {
    const svc = new DomainProfileCompiler(makeDb(), makeQueue());
    const r = await svc.compile(TENANT, DOMAIN, []);
    expect(r.data!.tenantId).toBe(TENANT);
    expect(r.data!.domainId).toBe(DOMAIN);
  });
});
