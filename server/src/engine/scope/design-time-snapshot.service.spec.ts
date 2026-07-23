/**
 * Tests for DesignTimeSnapshotService (FLOW-47 Turn 3 — T659).
 */

import { DataProcessResult } from '../../kernel/data-process-result';
import { DesignTimeSnapshotService, DESIGN_SNAPSHOTS_INDEX } from './design-time-snapshot.service';

function makeService(opts: { storeResult?: DataProcessResult<Record<string, unknown>> } = {}) {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(opts.storeResult ?? DataProcessResult.success({})),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.success(null)),
    ensureIndex: jest.fn().mockResolvedValue(undefined),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };
  const service = new DesignTimeSnapshotService(db as never);
  return { service, db };
}

describe('DesignTimeSnapshotService.capture', () => {
  it('writes snapshot with all required fields', async () => {
    const { service, db } = makeService();
    const res = await service.capture({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      packageVersion: 'v1',
      flowId: 'FLOW-X',
      patternIds: ['PAT-1', 'PAT-2'],
      ironRules: [{ ruleId: 'IR-1', text: 'tenant-scope', flowId: 'FLOW-X' }],
      arbiterConfigIds: ['ARB-1'],
    });
    expect(res.isSuccess).toBe(true);
    expect(res.data!.snapshotId).toBeTruthy();
    expect(res.data!.tenantId).toBe('tenant-A');
    expect(res.data!.packageId).toBe('PKG-1');
    expect(res.data!.patternIds).toEqual(['PAT-1', 'PAT-2']);
    expect(db.storeDocument).toHaveBeenCalledWith(
      DESIGN_SNAPSHOTS_INDEX,
      expect.objectContaining({ tenantId: 'tenant-A', packageId: 'PKG-1' }),
      'tenant-A::PKG-1',
    );
  });

  it('embeds ironRules inline (CF-833)', async () => {
    const { service } = makeService();
    const res = await service.capture({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      packageVersion: 'v1',
      flowId: 'FLOW-X',
      patternIds: [],
      ironRules: [{ ruleId: 'IR-1', text: 'rule', flowId: 'FLOW-X' }],
      arbiterConfigIds: [],
    });
    expect(res.data!.ironRules).toEqual([{ ruleId: 'IR-1', text: 'rule', flowId: 'FLOW-X' }]);
  });

  it('returns NO_TENANT when tenantId missing', async () => {
    const { service } = makeService();
    const res = await service.capture({
      tenantId: '',
      packageId: 'PKG-1',
      packageVersion: 'v1',
      flowId: 'FLOW-X',
      patternIds: [],
      ironRules: [],
      arbiterConfigIds: [],
    });
    expect(res.isSuccess).toBe(false);
    expect(res.errorCode).toBe('NO_TENANT');
  });

  it('returns INVALID_INPUT when packageId missing', async () => {
    const { service } = makeService();
    const res = await service.capture({
      tenantId: 'tenant-A',
      packageId: '',
      packageVersion: 'v1',
      flowId: 'FLOW-X',
      patternIds: [],
      ironRules: [],
      arbiterConfigIds: [],
    });
    expect(res.isSuccess).toBe(false);
    expect(res.errorCode).toBe('INVALID_INPUT');
  });

  it('propagates storeDocument failure (CF-834: snapshot must succeed before install completes)', async () => {
    const { service } = makeService({
      storeResult: DataProcessResult.failure('STORE_FAILED', 'ES write error'),
    });
    const res = await service.capture({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      packageVersion: 'v1',
      flowId: 'FLOW-X',
      patternIds: [],
      ironRules: [],
      arbiterConfigIds: [],
    });
    expect(res.isSuccess).toBe(false);
    expect(res.errorCode).toBe('STORE_FAILED');
  });

  it('uses packageVersion default v1 when not provided', async () => {
    const { service } = makeService();
    const res = await service.capture({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      packageVersion: '',
      flowId: 'FLOW-X',
      patternIds: [],
      ironRules: [],
      arbiterConfigIds: [],
    });
    expect(res.data!.packageVersion).toBe('v1');
  });

  it('captures snapshot is idempotent on (tenantId, packageId) docId', async () => {
    const { service, db } = makeService();
    await service.capture({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      packageVersion: 'v1',
      flowId: 'FLOW-X',
      patternIds: ['PAT-1'],
      ironRules: [],
      arbiterConfigIds: [],
    });
    await service.capture({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      packageVersion: 'v1',
      flowId: 'FLOW-X',
      patternIds: ['PAT-2'],
      ironRules: [],
      arbiterConfigIds: [],
    });
    expect(db.storeDocument).toHaveBeenCalledTimes(2);
    // Both writes use the same docId (idempotent overwrite)
    expect((db.storeDocument as jest.Mock).mock.calls[0][2]).toBe('tenant-A::PKG-1');
    expect((db.storeDocument as jest.Mock).mock.calls[1][2]).toBe('tenant-A::PKG-1');
  });
});

describe('DesignTimeSnapshotService.getByTenantAndPackage', () => {
  it('returns null when not found', async () => {
    const { service } = makeService();
    const res = await service.getByTenantAndPackage('tenant-A', 'PKG-X');
    expect(res.isSuccess).toBe(true);
    expect(res.data).toBeNull();
  });

  it('returns INVALID_INPUT when args missing', async () => {
    const { service } = makeService();
    const res = await service.getByTenantAndPackage('', 'PKG-X');
    expect(res.errorCode).toBe('INVALID_INPUT');
  });
});

describe('DesignTimeSnapshotService.onModuleInit', () => {
  it('calls ensureIndex with the design-snapshots mapping', async () => {
    const { service, db } = makeService();
    await service.onModuleInit();
    expect(db.ensureIndex).toHaveBeenCalledWith(
      DESIGN_SNAPSHOTS_INDEX,
      expect.objectContaining({ properties: expect.any(Object) }),
    );
  });
});
