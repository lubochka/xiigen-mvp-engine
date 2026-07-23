/**
 * DataRetentionEnforcerService (T624) — unit tests
 *
 * Coverage:
 *  1. Happy path — expired record without legal hold archived+deleted, PurgeCompleted emitted
 *  2. IR-1: Dual gate — record not expired skipped (no purge)
 *  3. IR-2: Legal hold active → RetentionHoldActive emitted, record NOT purged
 *  4. IR-3: archive-before-delete — archive storeDocument before tombstone write
 *  5. IR-5: CRON schedule loaded from FREEDOM config (getCronSchedule called)
 */

import { DataRetentionEnforcerService } from './data-retention-enforcer.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('DataRetentionEnforcerService (T624)', () => {
  let mockDb: { storeDocument: jest.Mock; searchDocuments: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { get: jest.Mock };
  let mockArchiveService: { archiveRecord: jest.Mock };
  let mockLegalHoldService: { isLegalHoldActive: jest.Mock };
  let mockCronConfig: { getCronSchedule: jest.Mock; getBatchSize: jest.Mock };
  let service: DataRetentionEnforcerService;
  let callOrder: string[];

  const TENANT = 'tenant-t624';
  const PAST_DATE = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days ago
  const FUTURE_DATE = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(); // 7 days future

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      storeDocument: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`storeDocument:${index}`);
        return DataProcessResult.success({});
      }),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    };

    mockQueue = {
      enqueue: jest.fn().mockImplementation(async (evt: string) => {
        callOrder.push(`enqueue:${evt}`);
        return DataProcessResult.success({});
      }),
    };

    mockCls = { get: jest.fn().mockReturnValue({ tenantId: TENANT }) };

    mockArchiveService = {
      archiveRecord: jest.fn().mockImplementation(async (index: string) => {
        callOrder.push(`archiveRecord:${index}`);
        return DataProcessResult.success({});
      }),
    };

    mockLegalHoldService = {
      isLegalHoldActive: jest.fn().mockResolvedValue(false),
    };

    mockCronConfig = {
      getCronSchedule: jest.fn().mockResolvedValue('0 2 * * *'),
      getBatchSize: jest.fn().mockResolvedValue(100),
    };

    service = new DataRetentionEnforcerService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockArchiveService as any,
      mockLegalHoldService as any,
      mockCronConfig as any,
    );
  });

  it('T624-1: happy path — expired record, no legal hold → PurgeCompleted emitted with archiveRef', async () => {
    const result = await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-001',
          retentionExpiresAt: PAST_DATE,
          legalHoldActive: false,
          data: { eventType: 'OLD_AUDIT', tenantId: TENANT },
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['purgedCount']).toBe(1);
    const purgedCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'PurgeCompleted');
    expect(purgedCall).toBeDefined();
    expect(purgedCall![1]).toHaveProperty('archiveRef');
  });

  it('T624-2: IR-1 — record not yet expired → skipped (no purge, no archive)', async () => {
    const result = await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-002',
          retentionExpiresAt: FUTURE_DATE, // not expired
          legalHoldActive: false,
          data: {},
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['purgedCount']).toBe(0);
    expect(mockArchiveService.archiveRecord).not.toHaveBeenCalled();
    const purgedCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'PurgeCompleted');
    expect(purgedCall).toBeUndefined();
  });

  it('T624-3: IR-2 — legal hold active → RetentionHoldActive emitted, record NOT purged', async () => {
    mockLegalHoldService.isLegalHoldActive.mockResolvedValue(true);

    const result = await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-003',
          retentionExpiresAt: PAST_DATE, // expired but under legal hold
          legalHoldActive: true,
          data: {},
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['heldCount']).toBe(1);
    expect(result.data!['purgedCount']).toBe(0);
    const holdCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'RetentionHoldActive');
    expect(holdCall).toBeDefined();
    expect(mockArchiveService.archiveRecord).not.toHaveBeenCalled();
  });

  it('T624-4: IR-3 — archive storeDocument called BEFORE tombstone write (archive-before-delete)', async () => {
    await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-004',
          retentionExpiresAt: PAST_DATE,
          legalHoldActive: false,
          data: {},
        },
      ],
    });

    const archiveIdx = callOrder.findIndex((e) => e.startsWith('archiveRecord:'));
    const tombstoneIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-compliance-records-tombstones'),
    );
    expect(archiveIdx).toBeGreaterThanOrEqual(0);
    expect(tombstoneIdx).toBeGreaterThan(archiveIdx);
  });

  it('T624-5: IR-5 — CRON schedule loaded from FREEDOM config (getCronSchedule called)', async () => {
    await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [],
    });

    expect(mockCronConfig.getCronSchedule).toHaveBeenCalledWith('flow19_retention_cron_schedule');
    expect(mockCronConfig.getBatchSize).toHaveBeenCalledWith('flow19_retention_batch_size');
  });
});
