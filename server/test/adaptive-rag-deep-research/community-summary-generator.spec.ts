/**
 * CommunitySummaryGenerator — Unit Tests (T464).
 *
 * Tests:
 *   CSG-1:  missing tenantId → UNSCOPED_QUERY
 *   CSG-2:  missing communityId → MISSING_COMMUNITY_ID
 *   CSG-3:  valid args → status QUEUED
 *   CSG-4:  empty memberNodes → queues successfully
 *   CSG-5:  memberCount reflects memberNodes length
 *   CSG-6:  jobId is non-empty string
 *   CSG-7:  queuedAt is ISO string
 *   CSG-8:  storeDocument() called BEFORE enqueue() — DNA-8
 *   CSG-9:  DB store failure → error propagated
 *   CSG-10: summary event emitted to community.summary.generate.triggered
 *   CSG-11: tenantId and communityId echoed back in result
 */

import { CommunitySummaryGenerator } from '../../src/engine/flows/rag-optimization/community-summary-generator.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-csg-test';
const COMMUNITY = 'community-csg-001';

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

describe('CommunitySummaryGenerator — Unit (T464)', () => {
  it('CSG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary('', COMMUNITY, ['node-1']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('CSG-2: missing communityId → MISSING_COMMUNITY_ID', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, '', ['node-1']);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_COMMUNITY_ID');
  });

  it('CSG-3: valid args → status QUEUED', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, COMMUNITY, ['node-1', 'node-2']);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.status).toBe('QUEUED');
  });

  it('CSG-4: empty memberNodes → queues successfully', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, COMMUNITY, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.memberCount).toBe(0);
  });

  it('CSG-5: memberCount reflects memberNodes length', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, COMMUNITY, ['a', 'b', 'c']);
    expect(r.data!.memberCount).toBe(3);
  });

  it('CSG-6: jobId is non-empty string', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, COMMUNITY, []);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.jobId.length).toBeGreaterThan(0);
  });

  it('CSG-7: queuedAt is ISO string', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, COMMUNITY, []);
    expect(r.data!.queuedAt).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });

  it('CSG-8: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new CommunitySummaryGenerator(db, queue);
    await svc.generateSummary(TENANT, COMMUNITY, []);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('CSG-9: DB store failure → error propagated', async () => {
    const svc = new CommunitySummaryGenerator(makeFailingDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, COMMUNITY, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
  });

  it('CSG-10: summary event emitted to community.summary.generate.triggered', async () => {
    const queue = makeQueue();
    const svc = new CommunitySummaryGenerator(makeDb(), queue);
    await svc.generateSummary(TENANT, COMMUNITY, ['node-1']);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'community.summary.generate.triggered',
      expect.any(Object),
    );
  });

  it('CSG-11: tenantId and communityId echoed back in result', async () => {
    const svc = new CommunitySummaryGenerator(makeDb(), makeQueue());
    const r = await svc.generateSummary(TENANT, COMMUNITY, []);
    expect(r.data!.tenantId).toBe(TENANT);
    expect(r.data!.communityId).toBe(COMMUNITY);
  });
});
