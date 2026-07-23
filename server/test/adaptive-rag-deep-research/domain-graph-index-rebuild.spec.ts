/**
 * DomainGraphIndexRebuild — Unit Tests (T465).
 *
 * Tests:
 *   DGIR-1:  missing tenantId → UNSCOPED_QUERY
 *   DGIR-2:  missing domainId → MISSING_DOMAIN_ID
 *   DGIR-3:  missing indexVersion → MISSING_INDEX_VERSION
 *   DGIR-4:  valid args → status QUEUED
 *   DGIR-5:  previousIndex from active index doc
 *   DGIR-6:  previousIndex = 'none' when no active index found
 *   DGIR-7:  newIndexVersion contains base indexVersion
 *   DGIR-8:  jobId is non-empty string
 *   DGIR-9:  storeDocument() called BEFORE enqueue() — DNA-8
 *   DGIR-10: DB store failure → error propagated
 *   DGIR-11: rebuild event emitted to domain.graph.index.rebuild.triggered
 *   DGIR-12: tenantId and domainId echoed back in result
 */

import { DomainGraphIndexRebuild } from '../../src/engine/flows/rag-optimization/domain-graph-index-rebuild.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-dgir-test';
const DOMAIN = 'domain-dgir-001';
const VERSION = 'v2';

function makeDb(activeIndex?: string) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async () => {
      if (activeIndex) {
        return DataProcessResult.success([{ index_version: activeIndex, active: true }]);
      }
      return DataProcessResult.success([]);
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

describe('DomainGraphIndexRebuild — Unit (T465)', () => {
  it('DGIR-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild('', DOMAIN, VERSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('DGIR-2: missing domainId → MISSING_DOMAIN_ID', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild(TENANT, '', VERSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_DOMAIN_ID');
  });

  it('DGIR-3: missing indexVersion → MISSING_INDEX_VERSION', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_INDEX_VERSION');
  });

  it('DGIR-4: valid args → status QUEUED', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('QUEUED');
  });

  it('DGIR-5: previousIndex from active index doc', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb('v1-active'), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(r.data!.previousIndex).toBe('v1-active');
  });

  it('DGIR-6: previousIndex = "none" when no active index found', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(r.data!.previousIndex).toBe('none');
  });

  it('DGIR-7: newIndexVersion contains base indexVersion', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(r.data!.newIndexVersion).toContain(VERSION);
  });

  it('DGIR-8: jobId is non-empty string', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(r.data!.jobId.length).toBeGreaterThan(0);
  });

  it('DGIR-9: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new DomainGraphIndexRebuild(db, queue);
    await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('DGIR-10: DB store failure → error propagated', async () => {
    const svc = new DomainGraphIndexRebuild(makeFailingDb(), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('DGIR-11: rebuild event emitted to domain.graph.index.rebuild.triggered', async () => {
    const queue = makeQueue();
    const svc = new DomainGraphIndexRebuild(makeDb(), queue);
    await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'domain.graph.index.rebuild.triggered',
      expect.any(Object),
    );
  });

  it('DGIR-12: tenantId and domainId echoed back in result', async () => {
    const svc = new DomainGraphIndexRebuild(makeDb(), makeQueue());
    const r = await svc.rebuild(TENANT, DOMAIN, VERSION);
    expect(r.data!.tenantId).toBe(TENANT);
    expect(r.data!.domainId).toBe(DOMAIN);
  });
});
