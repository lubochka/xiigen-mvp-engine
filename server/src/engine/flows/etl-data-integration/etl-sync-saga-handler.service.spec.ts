/**
 * EtlSyncSagaHandlerService (T214) — unit tests
 *
 * Coverage:
 *  1.  Happy path — pages landed, cursor committed after land_raw
 *  2.  IR-1: rate check at ORDER 1 before store (EP-4 step 1)
 *  3.  IR-4: cursor committed AFTER storeDocument — not before (DNA-8)
 *  4.  IR-3/CF-193: non-monotonic cursor → CURSOR_NOT_MONOTONIC failure + SyncJobFailed
 *  5.  IR-2/CF-192: raw records use storeDocument — no updateDocument
 *  6.  IR-5: normalization failure → quarantine + RecordQuarantined emitted
 *  7.  IR-6: SyncJobFailed includes lastCursorPosition
 *  8.  Rate limit exceeded → RateLimitExhausted emitted, returns failure
 *  9.  Duplicate record → DuplicateIngestionDetected emitted, record skipped
 * 10.  Validation: missing jobId → failure
 * 11.  Validation: missing connectorId → failure
 * 12.  knowledgeScope PRIVATE in stored raw records
 */

import { EtlSyncSagaHandlerService } from './etl-sync-saga-handler.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('EtlSyncSagaHandlerService (T214)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockRateLimit: { checkRateLimit: jest.Mock };
  let mockCursor: {
    loadCheckpoint: jest.Mock;
    validateMonotonic: jest.Mock;
    saveCheckpoint: jest.Mock;
  };
  let service: EtlSyncSagaHandlerService;
  let callOrder: string[];

  const TENANT = 'tenant-t190';

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
      enqueue: jest.fn().mockImplementation(async (evt: string) => {
        callOrder.push(`enqueue:${evt}`);
        return DataProcessResult.success({});
      }),
    };

    mockCls = { getCurrentTenantId: jest.fn().mockReturnValue(DataProcessResult.success(TENANT)) };

    mockRateLimit = {
      checkRateLimit: jest.fn().mockImplementation(async () => {
        callOrder.push('rateLimit');
        return { allowed: true };
      }),
    };

    mockCursor = {
      loadCheckpoint: jest.fn().mockResolvedValue(null),
      validateMonotonic: jest.fn().mockResolvedValue(true),
      saveCheckpoint: jest.fn().mockImplementation(async () => {
        callOrder.push('saveCursor');
      }),
    };

    service = new EtlSyncSagaHandlerService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockRateLimit as any,
      mockCursor as any,
    );
  });

  it('T214-1: happy path — records landed, SyncJobCompleted emitted', async () => {
    const result = await service.runSagaCycle({
      jobId: 'job-001',
      connectorId: 'conn-001',
      pageData: [{ recordId: 'r1', value: 42 }],
      nextCursor: '1001',
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!['landedCount']).toBe(1);
    const enqueueCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'SyncJobCompleted');
    expect(enqueueCall).toBeDefined();
  });

  it('T214-2: IR-1/EP-4 — rate check at ORDER 1 before storeDocument', async () => {
    await service.runSagaCycle({
      jobId: 'job-002',
      connectorId: 'conn-002',
      pageData: [{ recordId: 'r2', value: 1 }],
      nextCursor: '1002',
    });
    expect(callOrder.indexOf('rateLimit')).toBeLessThan(callOrder.indexOf('storeDocument'));
  });

  it('T214-3: IR-4/DNA-8 — cursor committed AFTER storeDocument', async () => {
    await service.runSagaCycle({
      jobId: 'job-003',
      connectorId: 'conn-003',
      pageData: [{ recordId: 'r3', value: 1 }],
      nextCursor: '1003',
    });
    expect(callOrder.indexOf('storeDocument')).toBeLessThan(callOrder.indexOf('saveCursor'));
  });

  it('T214-4: IR-3/CF-193 — non-monotonic cursor → failure + SyncJobFailed', async () => {
    mockCursor.validateMonotonic.mockResolvedValue(false);

    const result = await service.runSagaCycle({
      jobId: 'job-004',
      connectorId: 'conn-004',
      pageData: [],
      nextCursor: '500',
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CURSOR_NOT_MONOTONIC');
    const failCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'SyncJobFailed');
    expect(failCall).toBeDefined();
  });

  it('T214-5: IR-2/CF-192 — raw records stored via storeDocument (append-only)', async () => {
    await service.runSagaCycle({
      jobId: 'job-005',
      connectorId: 'conn-005',
      pageData: [{ recordId: 'r5' }],
      nextCursor: '1005',
    });
    expect(mockDb.storeDocument).toHaveBeenCalled();
    // updateDocument should never be called
    expect(mockDb).not.toHaveProperty('updateDocument');
  });

  it('T214-6: IR-5 — null record quarantined, RecordQuarantined emitted', async () => {
    const result = await service.runSagaCycle({
      jobId: 'job-006',
      connectorId: 'conn-006',
      pageData: [null as any],
      nextCursor: '1006',
    });

    expect(result.isSuccess).toBe(true);
    const quarantineCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'RecordQuarantined');
    expect(quarantineCall).toBeDefined();
  });

  it('T214-7: IR-6 — SyncJobFailed includes lastCursorPosition', async () => {
    mockCursor.loadCheckpoint.mockResolvedValue({ cursor: '900' });
    mockCursor.validateMonotonic.mockResolvedValue(false);

    await service.runSagaCycle({
      jobId: 'job-007',
      connectorId: 'conn-007',
      pageData: [],
      nextCursor: '500',
    });

    const failCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'SyncJobFailed');
    expect(failCall![1]).toHaveProperty('lastCursorPosition');
  });

  it('T214-8: rate limit exceeded → RateLimitExhausted emitted', async () => {
    mockRateLimit.checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 3000 });

    const result = await service.runSagaCycle({
      jobId: 'job-008',
      connectorId: 'conn-008',
      pageData: [],
      nextCursor: '',
    });

    expect(result.isSuccess).toBe(false);
    const call = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'RateLimitExhausted');
    expect(call).toBeDefined();
  });

  it('T214-9: duplicate record → DuplicateIngestionDetected, record skipped', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-idempotency-keys') {
        return DataProcessResult.success([{ idempotencyKey: 'existing' }]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.runSagaCycle({
      jobId: 'job-009',
      connectorId: 'conn-009',
      pageData: [{ recordId: 'r9' }],
      nextCursor: '1009',
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['landedCount']).toBe(0);
    const dupCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'DuplicateIngestionDetected');
    expect(dupCall).toBeDefined();
  });

  it('T214-10: validation — missing jobId → failure', async () => {
    const result = await service.runSagaCycle({
      connectorId: 'conn-010',
      pageData: [],
      nextCursor: '',
    });
    expect(result.isSuccess).toBe(false);
  });

  it('T214-11: validation — missing connectorId → failure', async () => {
    const result = await service.runSagaCycle({ jobId: 'job-011', pageData: [], nextCursor: '' });
    expect(result.isSuccess).toBe(false);
  });

  it('T214-12: knowledgeScope PRIVATE in stored raw records', async () => {
    await service.runSagaCycle({
      jobId: 'job-012',
      connectorId: 'conn-012',
      pageData: [{ recordId: 'r12' }],
      nextCursor: '1012',
    });

    const rawStore = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-raw-records');
    expect(rawStore).toBeDefined();
    expect(rawStore![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });
});
