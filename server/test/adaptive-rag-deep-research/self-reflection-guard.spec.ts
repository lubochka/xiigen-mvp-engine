/**
 * SelfReflectionGuard — Unit Tests (T459).
 *
 * Tests:
 *   SRG-1:  missing tenantId → UNSCOPED_QUERY
 *   SRG-2:  missing sessionId → MISSING_SESSION_ID
 *   SRG-3:  missing queryText → MISSING_QUERY_TEXT
 *   SRG-4:  AI says can_answer + confidence >= threshold → SELF_REFLECT
 *   SRG-5:  AI says can_answer=false → PROCEED_RETRIEVAL
 *   SRG-6:  confidence below threshold → PROCEED_RETRIEVAL even if can_answer=true
 *   SRG-7:  AI failure → PROCEED_RETRIEVAL (safe default)
 *   SRG-8:  storeDocument() BEFORE enqueue() — DNA-8
 *   SRG-9:  DB store failure → error propagated, enqueue NOT called
 *   SRG-10: decision event emitted to reflection.decided channel
 */

import { SelfReflectionGuard } from '../../src/engine/flows/rag-optimization/self-reflection-guard.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-srg-test';
const SESSION = 'sess-srg-1';
const QUERY = 'What is enterprise RAG?';

function makeDb(configDocs: Record<string, unknown>[] = []) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(configDocs)),
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
    storeDocument: jest.fn(async () => DataProcessResult.failure('STORAGE_FAILED', 'Write error')),
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

function makeAi(canAnswer: boolean, confidence: number) {
  return {
    generate: jest.fn(async () =>
      DataProcessResult.success({ can_answer: canAnswer, confidence, reason: 'test reason' }),
    ),
  } as any;
}

function makeFailingAi() {
  return {
    generate: jest.fn(async () => DataProcessResult.failure('AI_ERROR', 'unavailable')),
  } as any;
}

describe('SelfReflectionGuard — Unit (T459)', () => {
  it('SRG-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new SelfReflectionGuard(makeDb(), makeQueue(), makeAi(true, 0.9));
    const r = await svc.reflect(SESSION, '', QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('SRG-2: missing sessionId → MISSING_SESSION_ID', async () => {
    const svc = new SelfReflectionGuard(makeDb(), makeQueue(), makeAi(true, 0.9));
    const r = await svc.reflect('', TENANT, QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_SESSION_ID');
  });

  it('SRG-3: missing queryText → MISSING_QUERY_TEXT', async () => {
    const svc = new SelfReflectionGuard(makeDb(), makeQueue(), makeAi(true, 0.9));
    const r = await svc.reflect(SESSION, TENANT, '');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_QUERY_TEXT');
  });

  it('SRG-4: AI can_answer + high confidence → SELF_REFLECT', async () => {
    const svc = new SelfReflectionGuard(makeDb(), makeQueue(), makeAi(true, 0.95));
    const r = await svc.reflect(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.decision).toBe('SELF_REFLECT');
  });

  it('SRG-5: AI can_answer=false → PROCEED_RETRIEVAL', async () => {
    const svc = new SelfReflectionGuard(makeDb(), makeQueue(), makeAi(false, 0.95));
    const r = await svc.reflect(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.decision).toBe('PROCEED_RETRIEVAL');
  });

  it('SRG-6: confidence below threshold → PROCEED_RETRIEVAL', async () => {
    const svc = new SelfReflectionGuard(makeDb(), makeQueue(), makeAi(true, 0.5));
    const r = await svc.reflect(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.decision).toBe('PROCEED_RETRIEVAL');
  });

  it('SRG-7: AI failure → PROCEED_RETRIEVAL (safe default)', async () => {
    const svc = new SelfReflectionGuard(makeDb(), makeQueue(), makeFailingAi());
    const r = await svc.reflect(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.decision).toBe('PROCEED_RETRIEVAL');
  });

  it('SRG-8: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new SelfReflectionGuard(db, queue, makeAi(false, 0.3));
    await svc.reflect(SESSION, TENANT, QUERY);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('SRG-9: DB store failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new SelfReflectionGuard(makeFailingDb(), queue, makeAi(false, 0.3));
    const r = await svc.reflect(SESSION, TENANT, QUERY);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('SRG-10: decision event emitted to reflection.decided channel', async () => {
    const queue = makeQueue();
    const svc = new SelfReflectionGuard(makeDb(), queue, makeAi(false, 0.3));
    await svc.reflect(SESSION, TENANT, QUERY);
    expect(queue.enqueue).toHaveBeenCalledWith('reflection.decided', expect.any(Object));
  });
});
