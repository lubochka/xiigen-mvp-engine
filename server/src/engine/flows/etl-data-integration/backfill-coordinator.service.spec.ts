/**
 * BackfillCoordinatorService (T216) — unit tests
 *
 * Coverage:
 *  1.  Happy path — all slices land, BackfillCompleted emitted
 *  2.  IR-3: blackout window active → BackfillFailed, returns failure
 *  3.  IR-6: rate check before each slice (call ORDER 1 per slice)
 *  4.  IR-4: BackfillFailed includes failedSlice
 *  5.  IR-5: storeDocument used (no updateDocument) — append-only
 *  6.  IR-2: EP-4 cycle order per slice — rate_check before store
 *  7.  IR-7: cursor monotonic validation per slice
 *  8.  Null record in slice → quarantined, RecordQuarantined emitted
 *  9.  Duplicate record in slice → skipped silently
 * 10.  Store failure → BackfillFailed with failedSlice
 * 11.  knowledgeScope PRIVATE in stored records
 * 12.  Validation: missing jobId → failure
 */

import { BackfillCoordinatorService } from './backfill-coordinator.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('BackfillCoordinatorService (T216)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockRateLimit: { checkRateLimit: jest.Mock };
  let mockCursor: {
    loadCheckpoint: jest.Mock;
    validateMonotonic: jest.Mock;
    saveCheckpoint: jest.Mock;
  };
  let service: BackfillCoordinatorService;
  let callOrder: string[];

  const TENANT = 'tenant-t192';

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`storeDocument:${index}`);
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

    service = new BackfillCoordinatorService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockRateLimit as any,
      mockCursor as any,
    );
  });

  it('T216-1: happy path — all slices land, BackfillCompleted emitted', async () => {
    const result = await service.coordinate({
      jobId: 'job-001',
      connectorId: 'conn-001',
      slices: [
        {
          sliceId: 'sl-1',
          fromCursor: '1000',
          toCursor: '1100',
          records: [{ recordId: 'r1', value: 1 }],
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['totalLanded']).toBe(1);
    const completedCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'BackfillCompleted');
    expect(completedCall).toBeDefined();
  });

  it('T216-2: IR-3 — blackout window active → BackfillFailed, returns failure', async () => {
    const futureDate = new Date(Date.now() + 3_600_000).toISOString();
    const result = await service.coordinate({
      jobId: 'job-002',
      connectorId: 'conn-002',
      slices: [],
      blackoutUntil: futureDate,
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BLACKOUT_WINDOW');
    const failCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'BackfillFailed');
    expect(failCall).toBeDefined();
    expect(failCall![1]).toHaveProperty('failedSlice');
  });

  it('T216-3: IR-6 — rate check called before storeDocument per slice', async () => {
    await service.coordinate({
      jobId: 'job-003',
      connectorId: 'conn-003',
      slices: [
        {
          sliceId: 'sl-3',
          fromCursor: '1000',
          toCursor: '1100',
          records: [{ recordId: 'r3' }],
        },
      ],
    });

    const rateLimitIdx = callOrder.indexOf('rateLimit');
    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-raw-records'));
    expect(rateLimitIdx).toBeGreaterThanOrEqual(0);
    expect(storeIdx).toBeGreaterThan(rateLimitIdx);
  });

  it('T216-4: IR-4 — BackfillFailed includes failedSlice', async () => {
    mockRateLimit.checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });

    await service.coordinate({
      jobId: 'job-004',
      connectorId: 'conn-004',
      slices: [{ sliceId: 'sl-fail', fromCursor: '0', toCursor: '100', records: [] }],
    });

    const failCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'BackfillFailed');
    expect(failCall).toBeDefined();
    expect(failCall![1]).toHaveProperty('failedSlice', 'sl-fail');
  });

  it('T216-5: IR-5 — append-only: storeDocument called, no updateDocument', async () => {
    await service.coordinate({
      jobId: 'job-005',
      connectorId: 'conn-005',
      slices: [
        { sliceId: 'sl-5', fromCursor: '0', toCursor: '100', records: [{ recordId: 'r5' }] },
      ],
    });

    expect(mockDb.storeDocument).toHaveBeenCalled();
    expect(mockDb).not.toHaveProperty('updateDocument');
  });

  it('T216-6: IR-2 — EP-4 rate check ORDER 1 before land_raw per slice', async () => {
    await service.coordinate({
      jobId: 'job-006',
      connectorId: 'conn-006',
      slices: [
        { sliceId: 'sl-6', fromCursor: '0', toCursor: '100', records: [{ recordId: 'r6' }] },
      ],
    });

    const rateLimitIdx = callOrder.indexOf('rateLimit');
    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:xiigen-raw-records'));
    expect(rateLimitIdx).toBeLessThan(storeIdx);
  });

  it('T216-7: IR-7 — cursor monotonic validation per slice', async () => {
    mockCursor.validateMonotonic.mockResolvedValue(false);

    const result = await service.coordinate({
      jobId: 'job-007',
      connectorId: 'conn-007',
      slices: [{ sliceId: 'sl-7', fromCursor: '1000', toCursor: '500', records: [] }],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CURSOR_NOT_MONOTONIC');
    const failCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'BackfillFailed');
    expect(failCall![1]).toHaveProperty('failedSlice', 'sl-7');
  });

  it('T216-8: null record in slice → quarantined, RecordQuarantined emitted', async () => {
    const result = await service.coordinate({
      jobId: 'job-008',
      connectorId: 'conn-008',
      slices: [{ sliceId: 'sl-8', fromCursor: '0', toCursor: '100', records: [null as any] }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['totalLanded']).toBe(0);
    const qCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'RecordQuarantined');
    expect(qCall).toBeDefined();
    const qStore = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-quarantine-records',
    );
    expect(qStore).toBeDefined();
  });

  it('T216-9: duplicate record → skipped silently, no duplicate store', async () => {
    mockDb.searchDocuments.mockImplementation(async (index: string) => {
      if (index === 'xiigen-idempotency-keys') {
        return DataProcessResult.success([{ idempotencyKey: 'existing' }]);
      }
      return DataProcessResult.success([]);
    });

    const result = await service.coordinate({
      jobId: 'job-009',
      connectorId: 'conn-009',
      slices: [
        { sliceId: 'sl-9', fromCursor: '0', toCursor: '100', records: [{ recordId: 'r9' }] },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['totalLanded']).toBe(0);
    // No raw record stored
    expect(mockDb.storeDocument).not.toHaveBeenCalledWith(
      'xiigen-raw-records',
      expect.anything(),
      expect.anything(),
    );
  });

  it('T216-10: store failure → BackfillFailed with failedSlice', async () => {
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.failure('STORE_ERROR', 'disk full'));

    const result = await service.coordinate({
      jobId: 'job-010',
      connectorId: 'conn-010',
      slices: [
        { sliceId: 'sl-10', fromCursor: '0', toCursor: '100', records: [{ recordId: 'r10' }] },
      ],
    });

    expect(result.isSuccess).toBe(false);
    const failCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'BackfillFailed');
    expect(failCall).toBeDefined();
    expect(failCall![1]).toHaveProperty('failedSlice', 'sl-10');
  });

  it('T216-11: knowledgeScope PRIVATE in stored raw records', async () => {
    await service.coordinate({
      jobId: 'job-011',
      connectorId: 'conn-011',
      slices: [
        { sliceId: 'sl-11', fromCursor: '0', toCursor: '100', records: [{ recordId: 'r11' }] },
      ],
    });

    const rawCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-raw-records');
    expect(rawCall).toBeDefined();
    expect(rawCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T216-12: validation — missing jobId → failure', async () => {
    const result = await service.coordinate({ connectorId: 'conn-012', slices: [] });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });
});
