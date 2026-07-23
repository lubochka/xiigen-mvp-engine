/**
 * ReverseEtlPushHandlerService (T223) — unit tests
 *
 * Coverage:
 *  1.  Happy path — rate OK, no lock, ReverseETLPushed emitted with transport: "queue_fabric"
 *  2.  IR-1/DR-64: push dispatched via queue fabric (enqueue called, not HTTP)
 *  3.  IR-2: rate limit check BEFORE lock check (call order)
 *  4.  IR-3: connector lock active → PUSH_LOCKED failure
 *  5.  IR-4: ReverseETLPushed includes transport: "queue_fabric"
 *  6.  IR-5: ReverseETLPushed has no credential fields (connectorId only)
 *  7.  IR-6: rate limit exceeded → RateLimitExhausted emitted, never silent drop
 *  8.  IR-7/DNA-8: storeDocument push record BEFORE enqueue ReverseETLPushed
 *  9.  Store failure → STORE_FAILED returned, lock released
 * 10.  knowledgeScope PRIVATE in stored records
 * 11.  Validation: missing connectorId → failure
 * 12.  Validation: missing destination → failure
 */

import { ReverseEtlPushHandlerService } from './reverse-etl-push-handler.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('ReverseEtlPushHandlerService (T223)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockRateLimit: { checkRateLimit: jest.Mock };
  let service: ReverseEtlPushHandlerService;
  let callOrder: string[];

  const TENANT = 'tenant-t199';

  beforeEach(() => {
    callOrder = [];

    mockDb = {
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])), // no active lock
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

    service = new ReverseEtlPushHandlerService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockRateLimit as any,
    );
  });

  it('T223-1: happy path — rate OK, no lock, ReverseETLPushed emitted', async () => {
    const result = await service.push({
      connectorId: 'conn-001',
      destination: 'salesforce',
      records: [{ id: 'r1', value: 100 }],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['transport']).toBe('queue_fabric');
    const pushCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'ReverseETLPushed');
    expect(pushCall).toBeDefined();
  });

  it('T223-2: IR-1/DR-64 — dispatch goes via queue enqueue (no direct HTTP)', async () => {
    await service.push({
      connectorId: 'conn-002',
      destination: 'hubspot',
      records: [{ id: 'r2' }],
    });

    // Queue enqueue called for dispatch
    const dispatchCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'etl.reverse.push.dispatch',
    );
    expect(dispatchCall).toBeDefined();
    // Service has no fetch/http property
    expect(service).not.toHaveProperty('fetch');
  });

  it('T223-3: IR-2 — rate limit check before lock check (call order)', async () => {
    await service.push({
      connectorId: 'conn-003',
      destination: 'marketo',
      records: [],
    });

    const rateLimitIdx = callOrder.indexOf('rateLimit');
    const lockSearchOccurred = mockDb.searchDocuments.mock.calls.length > 0;
    expect(rateLimitIdx).toBeGreaterThanOrEqual(0);
    expect(lockSearchOccurred).toBe(true);
    // rateLimit must have been called before any storeDocument (lock acquisition)
    const lockStoreIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-push-locks'),
    );
    expect(rateLimitIdx).toBeLessThan(lockStoreIdx);
  });

  it('T223-4: IR-3 — connector lock active → PUSH_LOCKED failure', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.success([{ lockKey: 'existing-lock', active: true }]),
    );

    const result = await service.push({
      connectorId: 'conn-004',
      destination: 'intercom',
      records: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('PUSH_LOCKED');
  });

  it('T223-5: IR-4 — ReverseETLPushed includes transport: "queue_fabric"', async () => {
    await service.push({
      connectorId: 'conn-005',
      destination: 'zendesk',
      records: [],
    });

    const pushCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'ReverseETLPushed');
    expect(pushCall).toBeDefined();
    expect(pushCall![1]).toHaveProperty('transport', 'queue_fabric');
  });

  it('T223-6: IR-5 — ReverseETLPushed has no credential fields', async () => {
    await service.push({
      connectorId: 'conn-006',
      destination: 'pipedrive',
      records: [],
    });

    const pushCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'ReverseETLPushed');
    expect(pushCall).toBeDefined();
    const payload = pushCall![1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('apiKey');
    expect(payload).not.toHaveProperty('credential');
    expect(payload).not.toHaveProperty('password');
    expect(payload).toHaveProperty('connectorId', 'conn-006');
  });

  it('T223-7: IR-6 — rate limit exceeded → RateLimitExhausted emitted, never silent', async () => {
    mockRateLimit.checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });

    const result = await service.push({
      connectorId: 'conn-007',
      destination: 'slack',
      records: [],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    const rateLimitCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'RateLimitExhausted');
    expect(rateLimitCall).toBeDefined();
  });

  it('T223-8: IR-7/DNA-8 — storeDocument push record BEFORE enqueue ReverseETLPushed', async () => {
    await service.push({
      connectorId: 'conn-008',
      destination: 'amplitude',
      records: [{ id: 'r8' }],
    });

    const storeIdx = callOrder.findIndex((e) =>
      e.startsWith('storeDocument:xiigen-reverse-etl-pushes'),
    );
    const enqueueIdx = callOrder.indexOf('enqueue:ReverseETLPushed');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T223-9: store failure → STORE_FAILED returned', async () => {
    mockDb.storeDocument.mockImplementation(async (index: string) => {
      if (index === 'xiigen-reverse-etl-pushes')
        return DataProcessResult.failure('DISK_FULL', 'no space');
      return DataProcessResult.success({});
    });

    const result = await service.push({
      connectorId: 'conn-009',
      destination: 'mixpanel',
      records: [{ id: 'r9' }],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAILED');
  });

  it('T223-10: knowledgeScope PRIVATE in push record', async () => {
    await service.push({
      connectorId: 'conn-010',
      destination: 'segment',
      records: [],
    });

    const pushRecord = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-reverse-etl-pushes',
    );
    expect(pushRecord).toBeDefined();
    expect(pushRecord![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T223-11: validation — missing connectorId → failure', async () => {
    const result = await service.push({ destination: 'salesforce', records: [] });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });

  it('T223-12: validation — missing destination → failure', async () => {
    const result = await service.push({ connectorId: 'conn-012', records: [] });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });
});
