/**
 * UserFeedbackIngest — Unit Tests (T449).
 *
 * Tests:
 *   UFI-1:  missing tenantId → UNSCOPED_QUERY
 *   UFI-2:  missing sessionId in 6-tuple → MISSING_RUN_CONTEXT_FIELD
 *   UFI-3:  missing queryId → MISSING_RUN_CONTEXT_FIELD
 *   UFI-4:  missing model → MISSING_RUN_CONTEXT_FIELD
 *   UFI-5:  missing strategy → MISSING_RUN_CONTEXT_FIELD
 *   UFI-6:  missing runTimestamp → MISSING_RUN_CONTEXT_FIELD
 *   UFI-7:  invalid rating (6) → INVALID_RATING
 *   UFI-8:  valid feedback → success with feedbackId
 *   UFI-9:  duplicate 6-tuple + rating → idempotent result (DNA-7)
 *   UFI-10: storeDocument() BEFORE enqueue() — DNA-8
 *   UFI-11: DB store failure → error propagated, enqueue NOT called
 *   UFI-12: event emitted to feedback.ingested channel
 */

import {
  UserFeedbackIngest,
  FeedbackRunContext,
} from '../../src/engine/flows/rag-optimization/user-feedback-ingest.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

const TENANT = 'tenant-ufi-test';
const VALID_CTX: FeedbackRunContext = {
  sessionId: 'sess-ufi-1',
  queryId: 'q-1',
  model: 'claude-sonnet',
  strategy: 'hybrid-rag',
  runTimestamp: '2026-01-01T00:00:00Z',
};

function makeDb(existingFeedback: Record<string, unknown>[] = []) {
  const stored: any[] = [];
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(existingFeedback)),
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

describe('UserFeedbackIngest — Unit (T449)', () => {
  it('UFI-1: missing tenantId → UNSCOPED_QUERY', async () => {
    const svc = new UserFeedbackIngest(makeDb(), makeQueue());
    const r = await svc.ingest('', VALID_CTX, 4);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('UNSCOPED_QUERY');
  });

  it('UFI-2: missing sessionId → MISSING_RUN_CONTEXT_FIELD', async () => {
    const svc = new UserFeedbackIngest(makeDb(), makeQueue());
    const r = await svc.ingest(TENANT, { ...VALID_CTX, sessionId: '' }, 4);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_RUN_CONTEXT_FIELD');
  });

  it('UFI-3: missing queryId → MISSING_RUN_CONTEXT_FIELD', async () => {
    const svc = new UserFeedbackIngest(makeDb(), makeQueue());
    const r = await svc.ingest(TENANT, { ...VALID_CTX, queryId: '' }, 4);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_RUN_CONTEXT_FIELD');
  });

  it('UFI-4: missing model → MISSING_RUN_CONTEXT_FIELD', async () => {
    const svc = new UserFeedbackIngest(makeDb(), makeQueue());
    const r = await svc.ingest(TENANT, { ...VALID_CTX, model: '' }, 4);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_RUN_CONTEXT_FIELD');
  });

  it('UFI-5: missing strategy → MISSING_RUN_CONTEXT_FIELD', async () => {
    const svc = new UserFeedbackIngest(makeDb(), makeQueue());
    const r = await svc.ingest(TENANT, { ...VALID_CTX, strategy: '' }, 4);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_RUN_CONTEXT_FIELD');
  });

  it('UFI-6: missing runTimestamp → MISSING_RUN_CONTEXT_FIELD', async () => {
    const svc = new UserFeedbackIngest(makeDb(), makeQueue());
    const r = await svc.ingest(TENANT, { ...VALID_CTX, runTimestamp: '' }, 4);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('MISSING_RUN_CONTEXT_FIELD');
  });

  it('UFI-7: invalid rating (6) → INVALID_RATING', async () => {
    const svc = new UserFeedbackIngest(makeDb(), makeQueue());
    const r = await svc.ingest(TENANT, VALID_CTX, 6);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('INVALID_RATING');
  });

  it('UFI-8: valid feedback → success with feedbackId', async () => {
    const svc = new UserFeedbackIngest(makeDb([]), makeQueue());
    const r = await svc.ingest(TENANT, VALID_CTX, 4);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.feedbackId).toBeTruthy();
    expect(r.data!.idempotent).toBe(false);
  });

  it('UFI-9: duplicate 6-tuple + rating → idempotent (DNA-7)', async () => {
    const existing = [{ feedback_id: 'fb-existing', recorded_at: '2026-01-01T00:00:00Z' }];
    const svc = new UserFeedbackIngest(makeDb(existing), makeQueue());
    const r = await svc.ingest(TENANT, VALID_CTX, 4);
    expect(r.isSuccess).toBe(true);
    expect(r.data!.idempotent).toBe(true);
    expect(r.data!.feedbackId).toBe('fb-existing');
  });

  it('UFI-10: storeDocument() called BEFORE enqueue() — DNA-8', async () => {
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
    const svc = new UserFeedbackIngest(db, queue);
    await svc.ingest(TENANT, VALID_CTX, 4);
    expect(callOrder[0]).toBe('store');
    expect(callOrder[1]).toBe('enqueue');
  });

  it('UFI-11: DB store failure → error propagated, enqueue NOT called', async () => {
    const queue = makeQueue();
    const svc = new UserFeedbackIngest(makeFailingDb(), queue);
    const r = await svc.ingest(TENANT, VALID_CTX, 4);
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('STORAGE_FAILED');
    expect(queue.enqueue).not.toHaveBeenCalled();
  });

  it('UFI-12: event emitted to feedback.ingested channel', async () => {
    const queue = makeQueue();
    const svc = new UserFeedbackIngest(makeDb([]), queue);
    await svc.ingest(TENANT, VALID_CTX, 4);
    expect(queue.enqueue).toHaveBeenCalledWith('feedback.ingested', expect.any(Object));
  });
});
