/**
 * AdaptiveRagRouter — Unit Tests (T441).
 *
 * Tests:
 *   ARR-1:  missing tenantId → UNSCOPED_QUERY
 *   ARR-2:  missing sessionId → MISSING_SESSION_ID
 *   ARR-3:  missing queryText → MISSING_QUERY_TEXT
 *   ARR-4:  routes when no policy in DB → default HYBRID mode
 *   ARR-5:  routes with policy → selects highest-weight mode
 *   ARR-6:  storeDocument() called BEFORE enqueue() — DNA-8
 *   ARR-7:  routing decision stored with correct fields
 *   ARR-8:  DB storage failure → propagates error, no enqueue
 *   ARR-9:  returned routingId is non-empty string
 *   ARR-10: confidence returned in 0–1 range
 */

import { AdaptiveRagRouter } from '../../src/engine/flows/rag-optimization/adaptive-rag-router.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-arr-test';
const SESSION = 'sess-arr-1';
const QUERY = 'What is the impact of RAG on enterprise search?';

function makeDb(policyDocs: Record<string, unknown>[] = []) {
  const stored: Record<string, unknown>[] = [];
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(policyDocs)),
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

describe('AdaptiveRagRouter — Unit (T441)', () => {
  it('ARR-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new AdaptiveRagRouter(makeDb(), makeQueue());
    const r = await svc.routeQuery(SESSION, '', QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('ARR-2: missing sessionId → MISSING_SESSION_ID', async () => {
    const svc = new AdaptiveRagRouter(makeDb(), makeQueue());
    const r = await svc.routeQuery('', TENANT, QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('ARR-3: missing queryText → MISSING_QUERY_TEXT', async () => {
    const svc = new AdaptiveRagRouter(makeDb(), makeQueue());
    const r = await svc.routeQuery(SESSION, TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_QUERY_TEXT');
  });

  it('ARR-4: no policy in DB → defaults to HYBRID mode', async () => {
    const svc = new AdaptiveRagRouter(makeDb([]), makeQueue());
    const r = await svc.routeQuery(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.mode).toBe('HYBRID');
  });

  it('ARR-5: policy with highest weight VECTOR → routes to VECTOR', async () => {
    const policy = [
      {
        tenant_id: TENANT,
        active: true,
        mode_weights: { VECTOR: 0.7, GRAPH: 0.1, HYBRID: 0.1, SELF_REFLECT: 0.1 },
      },
    ];
    const svc = new AdaptiveRagRouter(makeDb(policy), makeQueue());
    const r = await svc.routeQuery(SESSION, TENANT, QUERY, { explore: false });
    expect(r.isSuccess).toBe(true);
    expect(r.data!.mode).toBe('VECTOR');
  });

  it('ARR-6: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new AdaptiveRagRouter(db, queue);
    await svc.routeQuery(SESSION, TENANT, QUERY);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('ARR-7: routing decision stored with required fields', async () => {
    const db = makeDb([]);
    const svc = new AdaptiveRagRouter(db, makeQueue());
    await svc.routeQuery(SESSION, TENANT, QUERY);
    const doc = db._stored[0];
    expect(doc).toMatchObject({
      session_id: SESSION,
      tenant_id: TENANT,
    });
    expect(doc['routing_id']).toBeTruthy();
    expect(doc['mode']).toBeTruthy();
  });

  it('ARR-8: DB storeDocument failure → propagates error, enqueue NOT called', async () => {
    const db = makeFailingDb();
    const queue = makeQueue();
    const svc = new AdaptiveRagRouter(db, queue);
    const r = await svc.routeQuery(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('ARR-9: returned routingId is a non-empty string', async () => {
    const svc = new AdaptiveRagRouter(makeDb([]), makeQueue());
    const r = await svc.routeQuery(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(typeof r.data!.routingId).toBe('string');
    expect(r.data!.routingId.length).toBeGreaterThan(0);
  });

  it('ARR-10: confidence is in 0–1 range', async () => {
    const svc = new AdaptiveRagRouter(makeDb([]), makeQueue());
    const r = await svc.routeQuery(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.confidence).toBeGreaterThanOrEqual(0);
    expect(r.data!.confidence).toBeLessThanOrEqual(1);
  });
});
