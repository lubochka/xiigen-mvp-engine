/**
 * FLOW-19 Phase D — DataRetentionEnforcerService (T624) e2e tests
 *
 * Coverage:
 *  1. Happy path — expired record, no legal hold → PurgeCompleted with archiveRef
 *  2. CF-19-4: Dual gate — not-expired record skipped entirely
 *  3. CF-19-4: Legal hold active → RetentionHoldActive, no purge
 *  4. CF-19-4: Archive storeDocument before tombstone write (archive-before-delete)
 *  5. CF-19-4: CRON schedule and batch size loaded from FREEDOM config
 */

import 'reflect-metadata';
import { DataRetentionEnforcerService } from '../../../src/engine/flows/durable-sagas-compliance/data-retention-enforcer.service';
import { DataProcessResult } from '../../../src/kernel/data-process-result';

const PAST = new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days ago
const FUTURE = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString(); // 30 days future

function makeDb(callOrder: string[]) {
  return {
    storeDocument: jest.fn().mockImplementation(async (index: string) => {
      callOrder.push(`store:${index}`);
      return DataProcessResult.success({});
    }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
}

function makeQueue(callOrder: string[]) {
  return {
    enqueue: jest.fn().mockImplementation(async (evt: string) => {
      callOrder.push(`enqueue:${evt}`);
      return DataProcessResult.success({});
    }),
  };
}

function makeCls(tenantId = 'e2e-tenant-t624') {
  return { get: jest.fn().mockReturnValue({ tenantId }) };
}

function makeArchiveService(callOrder: string[]) {
  return {
    archiveRecord: jest.fn().mockImplementation(async (index: string) => {
      callOrder.push(`archive:${index}`);
      return DataProcessResult.success({});
    }),
  };
}

function makeLegalHoldService(holdActive = false) {
  return {
    isLegalHoldActive: jest.fn().mockResolvedValue(holdActive),
  };
}

function makeCronConfig() {
  return {
    getCronSchedule: jest.fn().mockResolvedValue('0 2 * * *'),
    getBatchSize: jest.fn().mockResolvedValue(50),
  };
}

describe('FLOW-19 Phase D — DataRetentionEnforcer (T624)', () => {
  test('D-1: happy path — expired record, no legal hold → PurgeCompleted with archiveRef', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const archiveService = makeArchiveService(callOrder);
    const legalHold = makeLegalHoldService(false);
    const cronConfig = makeCronConfig();

    const service = new DataRetentionEnforcerService(
      db as any,
      queue as any,
      makeCls() as any,
      archiveService as any,
      legalHold as any,
      cronConfig as any,
    );

    const result = await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-d001',
          retentionExpiresAt: PAST,
          legalHoldActive: false,
          data: { eventType: 'OLD_AUDIT' },
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['purgedCount']).toBe(1);
    const purgedEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'PurgeCompleted');
    expect(purgedEvt).toBeDefined();
    expect(purgedEvt![1]).toHaveProperty('archiveRef');
  });

  test('D-2: CF-19-4 — not-expired record skipped: no archive, no purge event', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const archiveService = makeArchiveService(callOrder);
    const legalHold = makeLegalHoldService(false);
    const cronConfig = makeCronConfig();

    const service = new DataRetentionEnforcerService(
      db as any,
      queue as any,
      makeCls() as any,
      archiveService as any,
      legalHold as any,
      cronConfig as any,
    );

    const result = await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-d002',
          retentionExpiresAt: FUTURE,
          data: {},
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['purgedCount']).toBe(0);
    expect(archiveService.archiveRecord).not.toHaveBeenCalled();
    expect(queue.enqueue.mock.calls.some((c) => c[0] === 'PurgeCompleted')).toBe(false);
  });

  test('D-3: CF-19-4 — legal hold active → RetentionHoldActive emitted, no purge', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const archiveService = makeArchiveService(callOrder);
    const legalHold = makeLegalHoldService(true /* holdActive */);
    const cronConfig = makeCronConfig();

    const service = new DataRetentionEnforcerService(
      db as any,
      queue as any,
      makeCls() as any,
      archiveService as any,
      legalHold as any,
      cronConfig as any,
    );

    const result = await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-d003',
          retentionExpiresAt: PAST, // expired — but under legal hold
          data: {},
        },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['heldCount']).toBe(1);
    expect(result.data!['purgedCount']).toBe(0);
    const holdEvt = queue.enqueue.mock.calls.find((c) => c[0] === 'RetentionHoldActive');
    expect(holdEvt).toBeDefined();
    expect(holdEvt![1]).toHaveProperty('recordId', 'rec-d003');
    expect(archiveService.archiveRecord).not.toHaveBeenCalled();
  });

  test('D-4: CF-19-4 — archive called before tombstone write (archive-before-delete)', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const archiveService = makeArchiveService(callOrder);
    const legalHold = makeLegalHoldService(false);
    const cronConfig = makeCronConfig();

    const service = new DataRetentionEnforcerService(
      db as any,
      queue as any,
      makeCls() as any,
      archiveService as any,
      legalHold as any,
      cronConfig as any,
    );

    await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [
        {
          id: 'rec-d004',
          retentionExpiresAt: PAST,
          data: {},
        },
      ],
    });

    const archiveIdx = callOrder.findIndex((e) => e.startsWith('archive:'));
    const tombstoneIdx = callOrder.findIndex(
      (e) => e.startsWith('store:') && e.includes('tombstone'),
    );
    expect(archiveIdx).toBeGreaterThanOrEqual(0);
    expect(tombstoneIdx).toBeGreaterThan(archiveIdx);
  });

  test('D-5: CF-19-4 — CRON and batch size loaded from FREEDOM config', async () => {
    const callOrder: string[] = [];
    const db = makeDb(callOrder);
    const queue = makeQueue(callOrder);
    const archiveService = makeArchiveService(callOrder);
    const legalHold = makeLegalHoldService(false);
    const cronConfig = makeCronConfig();

    const service = new DataRetentionEnforcerService(
      db as any,
      queue as any,
      makeCls() as any,
      archiveService as any,
      legalHold as any,
      cronConfig as any,
    );

    await service.enforceRetention({
      sourceIndex: 'xiigen-compliance-records',
      candidateRecords: [],
    });

    expect(cronConfig.getCronSchedule).toHaveBeenCalledWith('flow19_retention_cron_schedule');
    expect(cronConfig.getBatchSize).toHaveBeenCalledWith('flow19_retention_batch_size');
  });
});
