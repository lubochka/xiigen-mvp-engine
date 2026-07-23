/**
 * GraphRAGCommunityQuery — Unit Tests (T443).
 *
 * Tests:
 *   GCQ-1:  missing tenantId → UNSCOPED_QUERY
 *   GCQ-2:  missing sessionId → MISSING_SESSION_ID
 *   GCQ-3:  missing queryText → MISSING_QUERY_TEXT
 *   GCQ-4:  empty RAG results → success with empty communities
 *   GCQ-5:  RAG results mapped to CommunityResult with source_type='graph'
 *   GCQ-6:  storeDocument() BEFORE enqueue() — DNA-8
 *   GCQ-7:  DB store failure → error propagated, enqueue NOT called
 *   GCQ-8:  event emitted to retrieval.graph.community.completed
 *   GCQ-9:  queryId is non-empty string
 */

import { GraphRAGCommunityQuery } from '../../src/engine/flows/rag-optimization/graph-rag-community-query.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-gcq-test';
const SESSION = 'sess-gcq-1';
const QUERY = 'enterprise search communities';

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
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'Write error')),
  } as any;
}

function makeRag(docs: Record<string, unknown>[] = []) {
  return { search: jest.fn(async () => DataProcessResult.success(docs)) } as any;
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

describe('GraphRAGCommunityQuery — Unit (T443)', () => {
  it('GCQ-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new GraphRAGCommunityQuery(makeDb(), makeQueue(), makeRag());
    const r = await svc.query(SESSION, '', QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('GCQ-2: missing sessionId → MISSING_SESSION_ID', async () => {
    const svc = new GraphRAGCommunityQuery(makeDb(), makeQueue(), makeRag());
    const r = await svc.query('', TENANT, QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('GCQ-3: missing queryText → MISSING_QUERY_TEXT', async () => {
    const svc = new GraphRAGCommunityQuery(makeDb(), makeQueue(), makeRag());
    const r = await svc.query(SESSION, TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_QUERY_TEXT');
  });

  it('GCQ-4: empty RAG results → success with empty communities', async () => {
    const svc = new GraphRAGCommunityQuery(makeDb(), makeQueue(), makeRag([]));
    const r = await svc.query(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.communities).toHaveLength(0);
    expect(r.data!.totalFound).toBe(0);
  });

  it('GCQ-5: RAG results mapped to CommunityResult with source_type=graph', async () => {
    const ragDocs = [{ community_id: 'c-1', score: 0.8, summary: 'enterprise summary' }];
    const svc = new GraphRAGCommunityQuery(makeDb(), makeQueue(), makeRag(ragDocs));
    const r = await svc.query(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.communities[0].source_type).toBe('graph');
    expect(r.data!.communities[0].communityId).toBe('c-1');
    expect(r.data!.communities[0].relevanceScore).toBe(0.8);
  });

  it('GCQ-6: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new GraphRAGCommunityQuery(db, queue, makeRag([]));
    await svc.query(SESSION, TENANT, QUERY);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('GCQ-7: DB store failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new GraphRAGCommunityQuery(makeFailingDb(), queue, makeRag([]));
    const r = await svc.query(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(false);
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('GCQ-8: event emitted to retrieval.graph.community.completed', async () => {
    const queue = makeQueue();
    const svc = new GraphRAGCommunityQuery(makeDb(), queue, makeRag([]));
    await svc.query(SESSION, TENANT, QUERY);
    expect(queue.enqueue).toHaveBeenCalledWith(
      'retrieval.graph.community.completed',
      expect.any(Object),
    );
  });

  it('GCQ-9: queryId is non-empty string', async () => {
    const svc = new GraphRAGCommunityQuery(makeDb(), makeQueue(), makeRag([]));
    const r = await svc.query(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.queryId.length).toBeGreaterThan(0);
  });
});
