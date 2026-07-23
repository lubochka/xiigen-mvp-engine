/**
 * ConnectorRegistrationHandlerService (T213) — unit tests
 *
 * Coverage:
 *  1.  Happy path — new connector registered, store + emit called in order
 *  2.  IR-1: rate limit check BEFORE store (call order)
 *  3.  IR-2: ConnectorRegistered event has no credential fields
 *  4.  IR-3: duplicate connectorId → alreadyExists:true, no second store
 *  5.  IR-4: storeDocument BEFORE enqueue ConnectorRegistered (DNA-8)
 *  6.  IR-5: ConnectorRegistrationFailed emitted on vault failure
 *  7.  Rate limit exceeded → RateLimitExhausted-like ConnectorRegistrationFailed emitted
 *  8.  Store failure → ConnectorRegistrationFailed emitted
 *  9.  Validation: missing connectorId → failure
 * 10.  Validation: missing connectorType → failure
 * 11.  knowledgeScope: 'PRIVATE' in stored connector doc
 * 12.  tenantId from CLS included in stored connector doc
 */

import { ConnectorRegistrationHandlerService } from './connector-registration-handler.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('ConnectorRegistrationHandlerService (T213)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockRateLimit: { checkRateLimit: jest.Mock };
  let mockVault: { storeCredential: jest.Mock };
  let service: ConnectorRegistrationHandlerService;
  let callOrder: string[];

  const TENANT = 'tenant-t189';

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

    mockCls = {
      getCurrentTenantId: jest.fn().mockReturnValue(DataProcessResult.success(TENANT)),
    };

    mockRateLimit = {
      checkRateLimit: jest.fn().mockResolvedValue({ allowed: true }),
    };

    mockVault = {
      storeCredential: jest.fn().mockResolvedValue(undefined),
    };

    service = new ConnectorRegistrationHandlerService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockRateLimit as any,
      mockVault as any,
    );
  });

  it('T213-1: happy path — connector registered, store then emit', async () => {
    const result = await service.register({
      connectorId: 'conn-001',
      connectorType: 'REST',
      credential: { apiKey: 'secret' },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.registered).toBe(true);
    expect(result.data!.alreadyExists).toBe(false);
  });

  it('T213-2: IR-1 — rate limit check called before storeDocument', async () => {
    mockRateLimit.checkRateLimit.mockImplementation(async () => {
      callOrder.push('rateLimit');
      return { allowed: true };
    });
    mockDb.storeDocument.mockImplementation(async () => {
      callOrder.push('storeDocument');
      return DataProcessResult.success({});
    });

    await service.register({
      connectorId: 'conn-002',
      connectorType: 'REST',
      credential: {},
    });

    expect(callOrder.indexOf('rateLimit')).toBeLessThan(callOrder.indexOf('storeDocument'));
  });

  it('T213-3: IR-2 — ConnectorRegistered event has no credential fields', async () => {
    await service.register({
      connectorId: 'conn-003',
      connectorType: 'REST',
      credential: { apiKey: 'top-secret', password: 'pw' },
    });

    const registeredCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'ConnectorRegistered');
    expect(registeredCall).toBeDefined();
    const payload = registeredCall![1] as Record<string, unknown>;
    expect(payload).not.toHaveProperty('apiKey');
    expect(payload).not.toHaveProperty('credential');
    expect(payload).not.toHaveProperty('password');
    expect(payload).toHaveProperty('connectorId', 'conn-003');
  });

  it('T213-4: IR-3 — duplicate connectorId returns alreadyExists without re-storing', async () => {
    mockDb.searchDocuments.mockResolvedValue(
      DataProcessResult.success([{ connectorId: 'conn-004', tenantId: TENANT }]),
    );

    const result = await service.register({
      connectorId: 'conn-004',
      connectorType: 'REST',
      credential: {},
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!.alreadyExists).toBe(true);
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  it('T213-5: IR-4/DNA-8 — storeDocument called before ConnectorRegistered enqueue', async () => {
    await service.register({
      connectorId: 'conn-005',
      connectorType: 'REST',
      credential: {},
    });

    const storeIdx = callOrder.indexOf('storeDocument');
    const enqueueIdx = callOrder.indexOf('enqueue:ConnectorRegistered');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T213-6: IR-5 — vault failure emits ConnectorRegistrationFailed and returns failure', async () => {
    mockVault.storeCredential.mockRejectedValue(new Error('vault unavailable'));

    const result = await service.register({
      connectorId: 'conn-006',
      connectorType: 'REST',
      credential: { k: 'v' },
    });

    expect(result.isSuccess).toBe(false);
    const failCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'ConnectorRegistrationFailed',
    );
    expect(failCall).toBeDefined();
  });

  it('T213-7: rate limit exceeded → ConnectorRegistrationFailed emitted, returns failure', async () => {
    mockRateLimit.checkRateLimit.mockResolvedValue({ allowed: false, retryAfterMs: 5000 });

    const result = await service.register({
      connectorId: 'conn-007',
      connectorType: 'REST',
      credential: {},
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RATE_LIMIT_EXCEEDED');
    const failCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'ConnectorRegistrationFailed',
    );
    expect(failCall).toBeDefined();
  });

  it('T213-8: store failure → ConnectorRegistrationFailed emitted', async () => {
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.failure('STORE_ERROR', 'disk full'));

    const result = await service.register({
      connectorId: 'conn-008',
      connectorType: 'REST',
      credential: {},
    });

    expect(result.isSuccess).toBe(false);
    const failCall = mockQueue.enqueue.mock.calls.find(
      (c) => c[0] === 'ConnectorRegistrationFailed',
    );
    expect(failCall).toBeDefined();
  });

  it('T213-9: validation — missing connectorId → failure', async () => {
    const result = await service.register({ connectorType: 'REST', credential: {} });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });

  it('T213-10: validation — missing connectorType → failure', async () => {
    const result = await service.register({ connectorId: 'conn-010', credential: {} });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });

  it('T213-11: knowledgeScope PRIVATE in stored connector doc', async () => {
    await service.register({
      connectorId: 'conn-011',
      connectorType: 'REST',
      credential: {},
    });

    const storeCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-connectors');
    expect(storeCall).toBeDefined();
    expect(storeCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T213-12: tenantId from CLS in stored connector doc', async () => {
    await service.register({
      connectorId: 'conn-012',
      connectorType: 'REST',
      credential: {},
    });

    const storeCall = mockDb.storeDocument.mock.calls.find((c) => c[0] === 'xiigen-connectors');
    expect(storeCall![1]).toMatchObject({ tenantId: TENANT });
  });
});
