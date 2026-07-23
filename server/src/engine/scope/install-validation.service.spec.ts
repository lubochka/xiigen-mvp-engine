/**
 * Tests for InstallValidationService (FLOW-47 Turn 4 — T660).
 *
 * CF-835: DEGRADED does not block install (controller-side check on returned status).
 * CF-835: ERROR (service exception) returns failure DataProcessResult — controller blocks.
 */

import { DataProcessResult } from '../../kernel/data-process-result';
import { InstallValidationService, INSTALL_VALIDATION_INDEX } from './install-validation.service';
import { FreshTenantTestService, PortabilityReport } from './fresh-tenant-test.service';
import { ModuleSnapshotService, ModuleSnapshot } from './module-snapshot.service';

function makeReport(overrides: Partial<PortabilityReport> = {}): PortabilityReport {
  return {
    flowId: 'FLOW-X',
    phase: 'INSTALL',
    snapshotId: 'snap-1',
    mainTenantId: 'tenant-A',
    ephemeralTenantId: 'ephemeral-1',
    threshold: 0.9,
    passed: true,
    gaps: [],
    recordsChecked: 0,
    capturedAt: 'now',
    ...overrides,
  };
}

function makeSnapshot(): ModuleSnapshot {
  return {
    snapshotId: 'snap-1',
    tenantId: 'tenant-A',
    flowId: 'FLOW-X',
    phase: 'INSTALL',
    ragPatternIds: [],
    calibrationRecordIds: [],
    ossRecordIds: [],
    graphEdgeIds: [],
    promptVersionIds: [],
    stationDepthPairs: [],
    capturedAt: 'now',
  };
}

function makeService(
  opts: {
    withFreshTenant?: boolean;
    withSnapshot?: boolean;
    reportResult?: DataProcessResult<PortabilityReport>;
    snapshotResult?: DataProcessResult<ModuleSnapshot>;
    storeResult?: DataProcessResult<Record<string, unknown>>;
  } = {},
) {
  const db = {
    storeDocument: jest.fn().mockResolvedValue(opts.storeResult ?? DataProcessResult.success({})),
    ensureIndex: jest.fn().mockResolvedValue(undefined),
    searchDocuments: jest.fn(),
    getDocument: jest.fn(),
  };

  const freshTenant = opts.withFreshTenant
    ? ({
        runPortabilityTest: jest
          .fn()
          .mockResolvedValue(opts.reportResult ?? DataProcessResult.success(makeReport())),
      } as unknown as jest.Mocked<FreshTenantTestService>)
    : undefined;

  const moduleSnapshot = opts.withSnapshot
    ? ({
        captureSnapshot: jest
          .fn()
          .mockResolvedValue(opts.snapshotResult ?? DataProcessResult.success(makeSnapshot())),
        getSnapshot: jest.fn(),
      } as unknown as jest.Mocked<ModuleSnapshotService>)
    : undefined;

  const service = new InstallValidationService(db as never, freshTenant, moduleSnapshot);
  return { service, db, freshTenant, moduleSnapshot };
}

describe('InstallValidationService.validate', () => {
  it('returns NO_TENANT when tenantId missing', async () => {
    const { service } = makeService();
    const res = await service.validate({
      tenantId: '',
      packageId: 'PKG-1',
      flowId: 'FLOW-X',
    });
    expect(res.errorCode).toBe('NO_TENANT');
  });

  it('returns INVALID_INPUT when packageId or flowId missing', async () => {
    const { service } = makeService();
    const res = await service.validate({
      tenantId: 'tenant-A',
      packageId: '',
      flowId: 'FLOW-X',
    });
    expect(res.errorCode).toBe('INVALID_INPUT');
  });

  it('PASSED when no FreshTenantTestService injected (default branch)', async () => {
    const { service, db } = makeService();
    const res = await service.validate({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      flowId: 'FLOW-X',
    });
    expect(res.isSuccess).toBe(true);
    expect(res.data!.status).toBe('PASSED');
    expect(res.data!.gapCount).toBe(0);
    expect(db.storeDocument).toHaveBeenCalledWith(
      INSTALL_VALIDATION_INDEX,
      expect.objectContaining({ status: 'PASSED' }),
      expect.stringContaining('tenant-A::PKG-1'),
    );
  });

  it('PASSED when portability test returns no gaps', async () => {
    const { service } = makeService({
      withFreshTenant: true,
      withSnapshot: true,
      reportResult: DataProcessResult.success(makeReport({ passed: true, gaps: [] })),
    });
    const res = await service.validate({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      flowId: 'FLOW-X',
    });
    expect(res.isSuccess).toBe(true);
    expect(res.data!.status).toBe('PASSED');
  });

  it('DEGRADED when portability test returns gaps (CF-835: non-blocking)', async () => {
    const { service } = makeService({
      withFreshTenant: true,
      withSnapshot: true,
      reportResult: DataProcessResult.success(
        makeReport({
          passed: false,
          gaps: [
            {
              station: 'AF-4',
              depth: 1,
              mainGrade: 0.9,
              freshGrade: 0.6,
              parity: 0.66,
              gapClass: 'A',
            },
          ],
        }),
      ),
    });
    const res = await service.validate({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      flowId: 'FLOW-X',
    });
    expect(res.isSuccess).toBe(true); // CF-835: degraded does not block, returns success
    expect(res.data!.status).toBe('DEGRADED');
    expect(res.data!.gapCount).toBe(1);
  });

  it('ERROR (returns failure) when portability test fails at service level', async () => {
    const { service, db } = makeService({
      withFreshTenant: true,
      withSnapshot: true,
      reportResult: DataProcessResult.failure('PORTABILITY_TEST_FAILED', 'service down'),
    });
    const res = await service.validate({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      flowId: 'FLOW-X',
    });
    expect(res.isSuccess).toBe(false); // CF-835: ERROR blocks install
    expect(res.errorCode).toBe('VALIDATION_SERVICE_ERROR');
    // Record still written for admin visibility
    expect(db.storeDocument).toHaveBeenCalledWith(
      INSTALL_VALIDATION_INDEX,
      expect.objectContaining({ status: 'ERROR' }),
      expect.any(String),
    );
  });

  it('records snapshotId from input when provided', async () => {
    const { service, db } = makeService();
    await service.validate({
      tenantId: 'tenant-A',
      packageId: 'PKG-1',
      flowId: 'FLOW-X',
      snapshotId: 'design-snap-99',
    });
    expect(db.storeDocument).toHaveBeenCalledWith(
      INSTALL_VALIDATION_INDEX,
      expect.objectContaining({ snapshotId: 'design-snap-99' }),
      expect.any(String),
    );
  });

  it('writes record once per validate call (idempotent record per validation, not per tenant+package)', async () => {
    const { service, db } = makeService();
    await service.validate({ tenantId: 'tenant-A', packageId: 'PKG-1', flowId: 'FLOW-X' });
    await service.validate({ tenantId: 'tenant-A', packageId: 'PKG-1', flowId: 'FLOW-X' });
    expect(db.storeDocument).toHaveBeenCalledTimes(2);
  });
});

describe('InstallValidationService.onModuleInit', () => {
  it('calls ensureIndex with the install-validation mapping', async () => {
    const { service, db } = makeService();
    await service.onModuleInit();
    expect(db.ensureIndex).toHaveBeenCalledWith(
      INSTALL_VALIDATION_INDEX,
      expect.objectContaining({ properties: expect.any(Object) }),
    );
  });
});
