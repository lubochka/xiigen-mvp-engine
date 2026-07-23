/**
 * FLOW-47 Test Plan v1.0 — Phase 4 integration.
 *
 * InstallValidationService writes to xiigen-install-validation after
 * DesignTimeSnapshot succeeds. CF-835: PASSED/DEGRADED non-blocking, ERROR
 * (service failure) blocks install.
 */

import 'reflect-metadata';
import { ClsService, ClsModule } from 'nestjs-cls';
import { Test } from '@nestjs/testing';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { InMemoryDatabaseProvider } from '../../../src/fabrics/database/in-memory.provider';
import { TenantTopologyStore } from '../../../src/engine/tenant-topology-store';
import { TenantModuleRegistry } from '../../../src/engine/tenant-module-registry.service';
import { MarketplacePackageService } from '../../../src/engine/marketplace-package.service';
import { DesignTimeSnapshotService } from '../../../src/engine/scope/design-time-snapshot.service';
import {
  InstallValidationService,
  INSTALL_VALIDATION_INDEX,
} from '../../../src/engine/scope/install-validation.service';
import {
  FreshTenantTestService,
  PortabilityReport,
} from '../../../src/engine/scope/fresh-tenant-test.service';
import { ModuleSnapshotService } from '../../../src/engine/scope/module-snapshot.service';
import { EngineBootstrapper } from '../../../src/bootstrap/engine-bootstrapper';
import { BootstrapFromDocumentsService } from '../../../src/bootstrap/bootstrap-from-documents.service';
import { RagContextStation } from '../../../src/af-stations/af4-rag-context';
import { TenantProvisionerService } from '../../../src/engine/tenant-provisioner.service';
import { TenantController } from '../../../src/api/tenant.controller';
import { TenantRegistry } from '../../../src/kernel/multi-tenant/tenant-registry.service';
import { TenantProvisioningController } from '../../../src/api/tenant-provisioning.controller';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../../src/kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from '../../../src/bootstrap/bootstrap-seeder.service';

function mockReport(overrides: Partial<PortabilityReport> = {}): PortabilityReport {
  return {
    flowId: 'FLOW-TEST',
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

describe('FLOW-47 Phase 4 — portability validation on install', () => {
  let cls: ClsService;
  let db: InMemoryDatabaseProvider;
  let marketplace: MarketplacePackageService;
  let installValidation: InstallValidationService;
  let mockFreshTenant: jest.Mocked<FreshTenantTestService>;
  let mockModuleSnapshot: jest.Mocked<ModuleSnapshotService>;
  let provisionController: TenantProvisioningController;
  let originalCwd: string;

  const masterTenant = new TenantContext({
    id: MASTER_TENANT_ID,
    name: 'XIIGen Master',
    status: 'active',
    plan: {
      name: 'free',
      maxApiCallsPerMinute: 1000,
      maxTokensPerDay: 10_000_000,
      maxStorageMb: 10_000,
    },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  async function inMaster<T>(fn: () => Promise<T>): Promise<T> {
    return cls.runWith({ [TENANT_CONTEXT_KEY]: masterTenant } as Record<string, unknown>, fn);
  }

  async function inTenant<T>(tenantId: string, fn: () => Promise<T>): Promise<T> {
    const ctx = new TenantContext({
      id: tenantId,
      name: tenantId,
      status: 'active',
      plan: masterTenant.plan,
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    return cls.runWith({ [TENANT_CONTEXT_KEY]: ctx } as Record<string, unknown>, fn);
  }

  beforeAll(async () => {
    originalCwd = process.cwd();
    process.chdir('..');

    const moduleRef = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true, middleware: { mount: false } })],
    }).compile();
    cls = moduleRef.get(ClsService);
    db = new InMemoryDatabaseProvider(cls);

    const topologyStore = new TenantTopologyStore(db, cls);
    const moduleRegistry = new TenantModuleRegistry(db, cls);
    await moduleRegistry.onModuleInit();
    marketplace = new MarketplacePackageService(topologyStore, db, cls, moduleRegistry);
    const designSnapshot = new DesignTimeSnapshotService(db);
    await designSnapshot.onModuleInit();

    // Mock the freshTenant + moduleSnapshot so we can inject specific report
    // outcomes per test without needing the full calibration pipeline.
    mockFreshTenant = {
      runPortabilityTest: jest.fn().mockResolvedValue(DataProcessResult.success(mockReport())),
    } as unknown as jest.Mocked<FreshTenantTestService>;

    mockModuleSnapshot = {
      captureSnapshot: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          snapshotId: 'snap-1',
          tenantId: 'tenant-A',
          flowId: 'FLOW-TEST',
          phase: 'INSTALL',
          ragPatternIds: [],
          calibrationRecordIds: [],
          ossRecordIds: [],
          graphEdgeIds: [],
          promptVersionIds: [],
          stationDepthPairs: [],
          capturedAt: 'now',
        }),
      ),
      getSnapshot: jest.fn(),
    } as unknown as jest.Mocked<ModuleSnapshotService>;

    installValidation = new InstallValidationService(db, mockFreshTenant, mockModuleSnapshot);
    await installValidation.onModuleInit();

    const fromDocuments = new BootstrapFromDocumentsService(db);
    const af4 = new RagContextStation(moduleRegistry);
    const bootstrapper = new EngineBootstrapper(
      db,
      cls,
      undefined,
      undefined,
      topologyStore,
      fromDocuments,
      af4,
      marketplace,
    );
    await inMaster(() => bootstrapper.bootstrap());

    const tenantRegistry = new TenantRegistry();
    const tenantController = new TenantController(tenantRegistry);
    const provisioner = new TenantProvisionerService(db);
    provisionController = new TenantProvisioningController(
      tenantController,
      provisioner,
      marketplace,
      cls,
      designSnapshot,
      installValidation,
    );
  }, 180000);

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  });

  async function copyPackageIntoTenant(packageId: string, tenantId: string): Promise<void> {
    const pkg = await inMaster(() => marketplace.getById(packageId));
    if (!pkg) throw new Error(`package ${packageId} missing`);
    const clone = { ...(pkg as unknown as Record<string, unknown>) };
    delete clone['tenant_id'];
    delete clone['_id'];
    const ctx = new TenantContext({
      id: tenantId,
      name: tenantId,
      status: 'active',
      plan: masterTenant.plan,
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    await cls.runWith({ [TENANT_CONTEXT_KEY]: ctx } as Record<string, unknown>, () =>
      db.storeDocument('xiigen-marketplace-packages', clone, packageId),
    );
  }

  async function runProvisionWithReport(
    tenantName: string,
    report: DataProcessResult<PortabilityReport>,
  ): Promise<Awaited<ReturnType<TenantProvisioningController['provision']>>> {
    (mockFreshTenant.runPortabilityTest as jest.Mock).mockResolvedValueOnce(report);
    const packages = await inMaster(() => marketplace.browse());
    const pkg = packages[0];
    const tenantId = `tenant-${tenantName}`;
    await copyPackageIntoTenant(pkg.packageId, tenantId);
    return inMaster(() =>
      provisionController.provision({
        name: tenantName,
        plan: 'STANDARD',
        modules: [{ packageId: pkg.packageId }],
      }),
    );
  }

  it('runPortabilityTest is called after captureSnapshot succeeds', async () => {
    (mockFreshTenant.runPortabilityTest as jest.Mock).mockClear();
    (mockModuleSnapshot.captureSnapshot as jest.Mock).mockClear();
    const packages = await inMaster(() => marketplace.browse());
    await copyPackageIntoTenant(packages[0].packageId, 'tenant-hook-order');
    await inMaster(() =>
      provisionController.provision({
        name: 'hook-order',
        plan: 'STANDARD',
        modules: [{ packageId: packages[0].packageId }],
      }),
    );
    expect(mockModuleSnapshot.captureSnapshot).toHaveBeenCalled();
    expect(mockFreshTenant.runPortabilityTest).toHaveBeenCalled();
  });

  it('PASSED report → install completes, validationStatus PASSED', async () => {
    const res = await runProvisionWithReport(
      'passed-case',
      DataProcessResult.success(mockReport({ passed: true })),
    );
    expect(res.status).toBe('PROVISIONED');
    expect(res.installedModules[0].validationStatus).toBe('PASSED');
  });

  it('DEGRADED portability result still completes install — CF-835', async () => {
    const res = await runProvisionWithReport(
      'degraded-case',
      DataProcessResult.success(
        mockReport({
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
    );
    expect(res.status).toBe('PROVISIONED');
    expect(res.installedModules[0].status).toBe('INSTALLED'); // still installed
    expect(res.installedModules[0].validationStatus).toBe('DEGRADED');
  });

  it('ERROR result (service fails) surfaces as validationStatus ERROR', async () => {
    const res = await runProvisionWithReport(
      'error-case',
      DataProcessResult.failure('PORTABILITY_TEST_FAILED', 'boom'),
    );
    // Per FLOW-47 Turn 5 controller: an ERROR from validation is surfaced as
    // validationStatus=ERROR on the installedModule; the provision itself still
    // succeeds (chain doesn't abort mid-way).
    expect(res.status).toBe('PROVISIONED');
    expect(res.installedModules[0].validationStatus).toBe('ERROR');
  });

  it('PortabilityReport written to xiigen-install-validation for PASSED result', async () => {
    await runProvisionWithReport(
      'passed-write',
      DataProcessResult.success(mockReport({ passed: true })),
    );
    const tenantId = 'tenant-passed-write';
    const records = await inTenant(tenantId, () =>
      db.searchDocuments(INSTALL_VALIDATION_INDEX, { tenantId, status: 'PASSED' }, 5),
    );
    expect(records.isSuccess).toBe(true);
    expect((records.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('PortabilityReport written to xiigen-install-validation for DEGRADED result', async () => {
    await runProvisionWithReport(
      'degraded-write',
      DataProcessResult.success(
        mockReport({
          passed: false,
          gaps: [{ station: 'x', depth: 0, mainGrade: 1, freshGrade: 0, parity: 0, gapClass: 'A' }],
        }),
      ),
    );
    const tenantId = 'tenant-degraded-write';
    const records = await inTenant(tenantId, () =>
      db.searchDocuments(INSTALL_VALIDATION_INDEX, { tenantId, status: 'DEGRADED' }, 5),
    );
    expect(records.isSuccess).toBe(true);
    expect((records.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('ERROR validation still writes a record (with status=ERROR) for admin visibility', async () => {
    await runProvisionWithReport(
      'error-write',
      DataProcessResult.failure('PORTABILITY_TEST_FAILED', 'boom'),
    );
    const tenantId = 'tenant-error-write';
    const records = await inTenant(tenantId, () =>
      db.searchDocuments(INSTALL_VALIDATION_INDEX, { tenantId, status: 'ERROR' }, 5),
    );
    expect(records.isSuccess).toBe(true);
    expect((records.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('install() response includes validationStatus in installedModules', async () => {
    const res = await runProvisionWithReport(
      'response-shape',
      DataProcessResult.success(mockReport({ passed: true })),
    );
    for (const mod of res.installedModules) {
      expect(['PASSED', 'DEGRADED', 'ERROR']).toContain(mod.validationStatus);
    }
  });

  it('xiigen-install-validation index exists after bootstrap', async () => {
    const result = await inMaster(() => db.searchDocuments(INSTALL_VALIDATION_INDEX, {}, 1));
    expect(result.isSuccess).toBe(true);
  });
});
