/**
 * VectorRetrievalStep — Unit Tests (T442).
 *
 * Tests:
 *   VRS-1:  missing tenantId → UNSCOPED_QUERY
 *   VRS-2:  missing sessionId → MISSING_SESSION_ID
 *   VRS-3:  missing embedding → MISSING_EMBEDDING
 *   VRS-4:  empty RAG results → success with empty items
 *   VRS-5:  RAG results mapped to RetrievalItem shape with source_type='vector'
 *   VRS-6:  storeDocument() BEFORE enqueue() — DNA-8
 *   VRS-7:  DB store failure → error propagated, enqueue NOT called
 *   VRS-8:  retrieval event emitted to retrieval.vector.completed
 *   VRS-9:  retrievalId is non-empty string
 */

import { VectorRetrievalStep } from '../../src/engine/flows/rag-optimization/vector-retrieval-step.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-vrs-test';
const SESSION = 'sess-vrs-1';
const EMBED = [0.1, 0.2, 0.3];

function makeDb() {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) => {
      stored.push({ ...doc, _id: id ?? 'doc-1' });
      return DataProcessResult.success({ ...doc, _id: id ?? 'doc-1' });
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
  return {
    search: jest.fn(async () => DataProcessResult.success(docs)),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('msg-1');
    }),
    _events: events,
  } as any;
}

describe('VectorRetrievalStep — Unit (T442)', () => {
  it('VRS-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new VectorRetrievalStep(makeDb(), makeQueue(), makeRag());
    const r = await svc.retrieve(SESSION, '', EMBED);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('VRS-2: missing sessionId → MISSING_SESSION_ID', async () => {
    const svc = new VectorRetrievalStep(makeDb(), makeQueue(), makeRag());
    const r = await svc.retrieve('', TENANT, EMBED);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('VRS-3: empty embedding → MISSING_EMBEDDING', async () => {
    const svc = new VectorRetrievalStep(makeDb(), makeQueue(), makeRag());
    const r = await svc.retrieve(SESSION, TENANT, []);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_EMBEDDING');
  });

  it('VRS-4: empty RAG results → success with empty items', async () => {
    const svc = new VectorRetrievalStep(makeDb(), makeQueue(), makeRag([]));
    const r = await svc.retrieve(SESSION, TENANT, EMBED);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items).toHaveLength(0);
    expect(r.data!.totalFound).toBe(0);
  });

  it('VRS-5: RAG results mapped to RetrievalItem with source_type=vector', async () => {
    const ragDocs = [{ content: 'result 1', score: 0.9, metadata: { source: 'doc-a' } }];
    const svc = new VectorRetrievalStep(makeDb(), makeQueue(), makeRag(ragDocs));
    const r = await svc.retrieve(SESSION, TENANT, EMBED);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.items[0].source_type).toBe('vector');
    expect(r.data!.items[0].content).toBe('result 1');
    expect(r.data!.items[0].score).toBe(0.9);
  });

  it('VRS-6: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new VectorRetrievalStep(db, queue, makeRag([]));
    await svc.retrieve(SESSION, TENANT, EMBED);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('VRS-7: DB store failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new VectorRetrievalStep(makeFailingDb(), queue, makeRag([]));
    const r = await svc.retrieve(SESSION, TENANT, EMBED);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('VRS-8: event emitted to retrieval.vector.completed channel', async () => {
    const queue = makeQueue();
    const svc = new VectorRetrievalStep(makeDb(), queue, makeRag([]));
    await svc.retrieve(SESSION, TENANT, EMBED);
    expect(queue.enqueue).toHaveBeenCalledWith('retrieval.vector.completed', expect.any(Object));
  });

  it('VRS-9: retrievalId is non-empty string', async () => {
    const svc = new VectorRetrievalStep(makeDb(), makeQueue(), makeRag([]));
    const r = await svc.retrieve(SESSION, TENANT, EMBED);
    expect(r.isSuccess).toBe(true);
    expect(typeof r.data!.retrievalId).toBe('string');
    expect(r.data!.retrievalId.length).toBeGreaterThan(0);
  });
});
