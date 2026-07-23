/**
 * IdentityJoinResolverService (T221) — unit tests
 *
 * Coverage:
 *  1.  Happy path — same-tenant inputs, matches found, IdentityJoinCompleted emitted
 *  2.  IR-1: join input missing tenantId → MISSING_TENANT_ID failure
 *  3.  IR-2/CF-204: cross-tenant input → CROSS_TENANT_JOIN_BLOCKED failure
 *  4.  IR-3: confidence threshold from FREEDOM config
 *  5.  IR-4: IdentityJoinCompleted includes crossTenantGuardPassed: true
 *  6.  IR-5: RLS applyPolicies called on results
 *  7.  IR-6/DNA-8: storeDocument BEFORE enqueue IdentityJoinCompleted
 *  8.  Low confidence → no matches returned (below threshold)
 *  9.  Store failure → returns STORE_FAILED
 * 10.  knowledgeScope PRIVATE in result record
 * 11.  Multiple cross-tenant inputs → all tenantIds listed in error
 * 12.  Validation: empty joinInputs → failure
 */

import { IdentityJoinResolverService } from './identity-join-resolver.service';
import { DataProcessResult } from '../../../kernel/data-process-result';

describe('IdentityJoinResolverService (T221)', () => {
  let mockDb: { searchDocuments: jest.Mock; storeDocument: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let mockCls: { getCurrentTenantId: jest.Mock };
  let mockRls: { applyPolicies: jest.Mock };
  let mockFreedom: { get: jest.Mock };
  let service: IdentityJoinResolverService;
  let callOrder: string[];

  const TENANT = 'tenant-t197';

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

    mockRls = {
      applyPolicies: jest
        .fn()
        .mockImplementation(async (cId: string, tId: string, records: unknown[]) => records),
    };

    mockFreedom = { get: jest.fn().mockReturnValue(0.8) };

    service = new IdentityJoinResolverService(
      mockDb as any,
      mockQueue as any,
      mockCls as any,
      mockRls as any,
      mockFreedom as any,
    );
  });

  it('T221-1: happy path — same-tenant, high confidence match found', async () => {
    const result = await service.resolve({
      connectorId: 'conn-001',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: { email: 'alice@x.com', name: 'Alice' } },
        { entityId: 'e2', tenantId: TENANT, fields: { email: 'alice@x.com', name: 'Alice' } },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(result.data!['crossTenantGuardPassed']).toBe(true);
    const joinCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'IdentityJoinCompleted');
    expect(joinCall).toBeDefined();
  });

  it('T221-2: IR-1 — missing tenantId on input → MISSING_TENANT_ID failure', async () => {
    const result = await service.resolve({
      connectorId: 'conn-002',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: { name: 'Alice' } },
        { entityId: 'e2', tenantId: '', fields: { name: 'Bob' } },
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT_ID');
  });

  it('T221-3: IR-2/CF-204 — cross-tenant input → CROSS_TENANT_JOIN_BLOCKED', async () => {
    const result = await service.resolve({
      connectorId: 'conn-003',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: { email: 'a@x.com' } },
        { entityId: 'e2', tenantId: 'other-tenant', fields: { email: 'a@x.com' } },
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CROSS_TENANT_JOIN_BLOCKED');
  });

  it('T221-4: IR-3 — confidence threshold read from FREEDOM config', async () => {
    mockFreedom.get.mockReturnValue(0.9);

    await service.resolve({
      connectorId: 'conn-004',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: { email: 'a@x.com' } },
        { entityId: 'e2', tenantId: TENANT, fields: { email: 'a@x.com' } },
      ],
    });

    expect(mockFreedom.get).toHaveBeenCalledWith('flow14_identity_confidence_threshold', 0.8);
  });

  it('T221-5: IR-4 — IdentityJoinCompleted includes crossTenantGuardPassed: true', async () => {
    await service.resolve({
      connectorId: 'conn-005',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: { email: 'b@x.com' } },
        { entityId: 'e2', tenantId: TENANT, fields: { email: 'b@x.com' } },
      ],
    });

    const joinCall = mockQueue.enqueue.mock.calls.find((c) => c[0] === 'IdentityJoinCompleted');
    expect(joinCall).toBeDefined();
    expect(joinCall![1]).toHaveProperty('crossTenantGuardPassed', true);
  });

  it('T221-6: IR-5 — RLS applyPolicies called on results', async () => {
    const result = await service.resolve({
      connectorId: 'conn-006',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: { email: 'c@x.com' } },
        { entityId: 'e2', tenantId: TENANT, fields: { email: 'c@x.com' } },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect(mockRls.applyPolicies).toHaveBeenCalled();
  });

  it('T221-7: IR-6/DNA-8 — storeDocument BEFORE enqueue IdentityJoinCompleted', async () => {
    await service.resolve({
      connectorId: 'conn-007',
      joinInputs: [{ entityId: 'e1', tenantId: TENANT, fields: { id: '1' } }],
    });

    const storeIdx = callOrder.findIndex((e) => e.startsWith('storeDocument:'));
    const enqueueIdx = callOrder.indexOf('enqueue:IdentityJoinCompleted');
    expect(storeIdx).toBeGreaterThanOrEqual(0);
    expect(enqueueIdx).toBeGreaterThan(storeIdx);
  });

  it('T221-8: low confidence → no matches returned', async () => {
    mockFreedom.get.mockReturnValue(1.0); // impossible threshold

    const result = await service.resolve({
      connectorId: 'conn-008',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: { email: 'a@x.com' } },
        { entityId: 'e2', tenantId: TENANT, fields: { email: 'b@x.com' } },
      ],
    });

    expect(result.isSuccess).toBe(true);
    expect((result.data!['matches'] as unknown[]).length).toBe(0);
  });

  it('T221-9: store failure → returns STORE_FAILED', async () => {
    mockDb.storeDocument.mockResolvedValue(DataProcessResult.failure('DISK_FULL', 'no space'));

    const result = await service.resolve({
      connectorId: 'conn-009',
      joinInputs: [{ entityId: 'e1', tenantId: TENANT, fields: { x: '1' } }],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('STORE_FAILED');
  });

  it('T221-10: knowledgeScope PRIVATE in stored result', async () => {
    await service.resolve({
      connectorId: 'conn-010',
      joinInputs: [{ entityId: 'e1', tenantId: TENANT, fields: { email: 'd@x.com' } }],
    });

    const storeCall = mockDb.storeDocument.mock.calls.find(
      (c) => c[0] === 'xiigen-identity-join-results',
    );
    expect(storeCall).toBeDefined();
    expect(storeCall![1]).toMatchObject({ knowledgeScope: 'PRIVATE' });
  });

  it('T221-11: multiple cross-tenant inputs — error message includes tenantIds', async () => {
    const result = await service.resolve({
      connectorId: 'conn-011',
      joinInputs: [
        { entityId: 'e1', tenantId: TENANT, fields: {} },
        { entityId: 'e2', tenantId: 'tenant-A', fields: {} },
        { entityId: 'e3', tenantId: 'tenant-B', fields: {} },
      ],
    });

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CROSS_TENANT_JOIN_BLOCKED');
    expect(result.errorMessage).toContain('tenant-A');
  });

  it('T221-12: validation — empty joinInputs → failure', async () => {
    const result = await service.resolve({ connectorId: 'conn-012', joinInputs: [] });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('VALIDATION_FAILED');
  });
});
