/**
 * CompletionRecorder (T83) — unit tests
 *
 * Test coverage:
 *   1. Happy path — new completion recorded + QuestionnaireAnswered emitted
 *   2. IR-83-1 — SETNX: duplicate (questionnaireId, userId) returns existing, no storeDocument
 *   3. IR-83-2 — DNA-8: storeDocument called BEFORE queue.enqueue (call order)
 *   4. IR-83-3 — knowledge_scope: 'PRIVATE' in stored document
 *   5. Validation — missing questionnaireId → failure
 *   6. Validation — missing userId → failure
 *   7. Validation — missing tenantId → failure
 *   8. DB storeDocument failure → DataProcessResult.failure, no queue emit
 *   9. DB searchDocuments failure treated as empty → proceeds to store
 *  10. Unexpected throw → DataProcessResult.failure, code COMPLETION_RECORDER_ERROR
 *  11. connection_type: 'FLOW_SCOPED' in stored document
 *  12. QuestionnaireAnswered payload contains completionId, questionnaireId, userId, tenantId
 */

import { CompletionRecorder, CompletionInput } from './completion-recorder.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('CompletionRecorder (T83)', () => {
  // ── Shared call-order tracker ───────────────────────────────────────────
  let callOrder: string[];

  // ── Mock DB ──────────────────────────────────────────────────────────────
  let mockDb: {
    searchDocuments: jest.Mock;
    storeDocument: jest.Mock;
  };

  // ── Mock Queue ───────────────────────────────────────────────────────────
  let mockQueue: {
    enqueue: jest.Mock;
  };

  let service: CompletionRecorder;

  const baseInput: CompletionInput = {
    questionnaireId: 'q-001',
    userId: 'u-abc',
    tenantId: 't-xyz',
    submittedAt: '2026-04-12T10:00:00.000Z',
  };

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn().mockImplementation(async () => {
        callOrder.push('storeDocument');
        return DataProcessResult.success({});
      }),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async () => {
        callOrder.push('enqueue');
      }),
    };

    service = new CompletionRecorder(mockDb as any, mockQueue as any);
  });

  // ── 1. Happy path ─────────────────────────────────────────────────────────

  it('records a new completion and emits QuestionnaireAnswered', async () => {
    const result = await service.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionId).toBeDefined();
    expect(result.data!.idempotent).toBe(false);

    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'questionnaire.answered',
      expect.objectContaining({
        questionnaireId: 'q-001',
        userId: 'u-abc',
        tenantId: 't-xyz',
      }),
    );
  });

  // ── 2. IR-83-1: SETNX — duplicate returns existing record ─────────────────

  it('IR-83-1: returns existing record without storeDocument on duplicate (questionnaireId, userId)', async () => {
    const existingId = 'cmp-existing-001';
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.success([{ completion_id: existingId }]),
    );

    const result = await service.record(baseInput);

    expect(result.isSuccess).toBe(true);
    expect(result.data!.completionId).toBe(existingId);
    expect(result.data!.idempotent).toBe(true);

    // SETNX: no store, no emit on duplicate
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 3. IR-83-2: DNA-8 — storeDocument BEFORE enqueue ─────────────────────

  it('IR-83-2: storeDocument is called BEFORE queue.enqueue (DNA-8)', async () => {
    await service.record(baseInput);

    expect(callOrder[0]).toBe('storeDocument');
    expect(callOrder[1]).toBe('enqueue');
    expect(callOrder).toHaveLength(2);
  });

  // ── 4. IR-83-3: knowledge_scope = PRIVATE ─────────────────────────────────

  it('IR-83-3: stored document has knowledge_scope PRIVATE', async () => {
    await service.record(baseInput);

    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['knowledge_scope']).toBe('PRIVATE');
  });

  // ── 5–7. Validation failures ───────────────────────────────────────────────

  it('returns failure for missing questionnaireId', async () => {
    const result = await service.record({ ...baseInput, questionnaireId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  it('returns failure for missing userId', async () => {
    const result = await service.record({ ...baseInput, userId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  it('returns failure for missing tenantId', async () => {
    const result = await service.record({ ...baseInput, tenantId: '' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILURE');
  });

  // ── 8. DB storeDocument failure → no queue emit ───────────────────────────

  it('returns failure and does not emit when storeDocument fails (DNA-8)', async () => {
    mockDb.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.failure('DB_WRITE_ERROR', 'Elasticsearch write failed');
    });

    const result = await service.record(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('DB_WRITE_ERROR');
    expect(mockQueue.enqueue).not.toHaveBeenCalled();
  });

  // ── 9. DB searchDocuments failure treated as empty → proceeds ─────────────

  it('proceeds to store when searchDocuments returns failure (treats as no existing record)', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.failure('SEARCH_ERROR', 'ES unavailable'),
    );

    const result = await service.record(baseInput);

    // searchDocuments failure is treated as empty (no existing record) — proceed to store
    expect(result.isSuccess).toBe(true);
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(1);
  });

  // ── 10. Unexpected throw → COMPLETION_RECORDER_ERROR ──────────────────────

  it('DNA-3: returns failure with COMPLETION_RECORDER_ERROR on unexpected throw', async () => {
    mockDb.searchDocuments.mockRejectedValue(new Error('Unexpected crash'));

    const result = await service.record(baseInput);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('COMPLETION_RECORDER_ERROR');
    expect(result.errorMessage).toContain('Unexpected crash');
  });

  // ── 11. connection_type = FLOW_SCOPED ─────────────────────────────────────

  it('stored document has connection_type FLOW_SCOPED', async () => {
    await service.record(baseInput);

    const [, doc] = mockDb.storeDocument.mock.calls[0] as [string, Record<string, unknown>, string];
    expect(doc['connection_type']).toBe('FLOW_SCOPED');
  });

  // ── 12. QuestionnaireAnswered payload shape ────────────────────────────────

  it('QuestionnaireAnswered payload contains completionId, questionnaireId, userId, tenantId', async () => {
    const result = await service.record(baseInput);
    const { completionId } = result.data!;

    const [eventType, payload] = mockQueue.enqueue.mock.calls[0] as [
      string,
      Record<string, unknown>,
    ];
    expect(eventType).toBe('questionnaire.answered');
    expect(payload['completionId']).toBe(completionId);
    expect(payload['questionnaireId']).toBe('q-001');
    expect(payload['userId']).toBe('u-abc');
    expect(payload['tenantId']).toBe('t-xyz');
  });
});
