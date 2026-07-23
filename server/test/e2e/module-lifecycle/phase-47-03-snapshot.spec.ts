/**
 * FLOW-47 Test Plan v1.0 — Phase 3 integration.
 *
 * DesignTimeSnapshot is written by install() after registerInstall succeeds
 * (FLOW-47 Turn 3 / T659). The snapshot is keyed by (tenantId, packageId)
 * because linked-mode install (DD-324, MVP Plan v3 Turn 6) doesn't generate
 * an installedFlowId — see commit 83b9cf3 + FLOW-47 Turn 3 adaptation.
 */

import 'reflect-metadata';
import { ClsService, ClsModule } from 'nestjs-cls';
import { Test } from '@nestjs/testing';
import { InMemoryDatabaseProvider } from '../../../src/fabrics/database/in-memory.provider';
import { TenantTopologyStore } from '../../../src/engine/tenant-topology-store';
import { TenantModuleRegistry } from '../../../src/engine/tenant-module-registry.service';
import { MarketplacePackageService } from '../../../src/engine/marketplace-package.service';
import { DesignTimeSnapshotService } from '../../../src/engine/scope/design-time-snapshot.service';
import { InstallValidationService } from '../../../src/engine/scope/install-validation.service';
import { EngineBootstrapper } from '../../../src/bootstrap/engine-bootstrapper';
import { BootstrapFromDocumentsService } from '../../../src/bootstrap/bootstrap-from-documents.service';
import { RagContextStation } from '../../../src/af-stations/af4-rag-context';
import { TenantProvisionerService } from '../../../src/engine/tenant-provisioner.service';
import { TenantController } from '../../../src/api/tenant.controller';
import { TenantRegistry } from '../../../src/kernel/multi-tenant/tenant-registry.service';
import { TenantProvisioningController } from '../../../src/api/tenant-provisioning.controller';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../../src/kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from '../../../src/bootstrap/bootstrap-seeder.service';

describe('FLOW-47 Phase 3 — install creates snapshot', () => {
  let cls: ClsService;
  let db: InMemoryDatabaseProvider;
  let marketplace: MarketplacePackageService;
  let designSnapshot: DesignTimeSnapshotService;
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

  let installedTenantId: string;
  let installedPackageId: string;

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
    designSnapshot = new DesignTimeSnapshotService(db);
    await designSnapshot.onModuleInit();
    const installValidation = new InstallValidationService(db);
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

    // Now provision + install to exercise the snapshot path.
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

    const packages = await inMaster(() => marketplace.browse());
    expect(packages.length).toBeGreaterThan(0);
    installedPackageId = packages[0].packageId;

    // Copy the package into the target tenant's bucket (in-memory db per-tenant
    // isolation workaround — real ES is globally queryable).
    installedTenantId = 'tenant-phase3';
    const provisionCtx = new TenantContext({
      id: installedTenantId,
      name: 'phase3',
      status: 'active',
      plan: masterTenant.plan,
      configOverrides: {},
      apiKeys: {},
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    const targetPkgClone = { ...(packages[0] as unknown as Record<string, unknown>) };
    delete targetPkgClone['tenant_id'];
    delete targetPkgClone['_id'];
    await cls.runWith({ [TENANT_CONTEXT_KEY]: provisionCtx } as Record<string, unknown>, () =>
      db.storeDocument('xiigen-marketplace-packages', targetPkgClone, installedPackageId),
    );

    const res = await inMaster(() =>
      provisionController.provision({
        name: 'phase3',
        plan: 'STANDARD',
        modules: [{ packageId: installedPackageId }],
      }),
    );
    expect(res.status).toBe('PROVISIONED');
  }, 180000);

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  });

  it('after install(), xiigen-design-snapshots has 1 record for (tenantId, packageId)', async () => {
    const result = await inTenant(installedTenantId, () =>
      db.searchDocuments(
        'xiigen-design-snapshots',
        { tenantId: installedTenantId, packageId: installedPackageId },
        5,
      ),
    );
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBe(1);
  });

  it('snapshot.patternIds match the installed package designBundleRefs.patternIds', async () => {
    const pkg = await inMaster(() => marketplace.getById(installedPackageId));
    expect(pkg).toBeTruthy();
    const snapResult = await inTenant(installedTenantId, () =>
      designSnapshot.getByTenantAndPackage(installedTenantId, installedPackageId),
    );
    expect(snapResult.isSuccess).toBe(true);
    expect(snapResult.data).toBeTruthy();
    expect(snapResult.data!.patternIds).toEqual(pkg!.designBundleRefs.patternIds);
  });

  it('re-invoking provision for same tenant + package overwrites snapshot (idempotent docId)', async () => {
    // docId = `${tenantId}::${packageId}` so a second capture() overwrites
    // the prior record. This matches the linked-mode registry pattern.
    await inTenant(installedTenantId, async () => {
      const res = await designSnapshot.capture({
        tenantId: installedTenantId,
        packageId: installedPackageId,
        packageVersion: 'v2',
        flowId: 'anything',
        patternIds: ['PAT-FRESH'],
        ironRules: [],
        arbiterConfigIds: [],
      });
      expect(res.isSuccess).toBe(true);
    });
    // Exactly one record still indexes by (tenantId, packageId).
    const stored = await inTenant(installedTenantId, () =>
      db.searchDocuments(
        'xiigen-design-snapshots',
        { tenantId: installedTenantId, packageId: installedPackageId },
        5,
      ),
    );
    expect((stored.data ?? []).length).toBe(1);
    const record = stored.data![0] as { patternIds?: string[]; packageVersion?: string };
    expect(record.patternIds).toEqual(['PAT-FRESH']);
    expect(record.packageVersion).toBe('v2');
  });

  it('xiigen-design-snapshots index exists after bootstrap', async () => {
    // onModuleInit called ensureIndex; querying it works without error.
    const result = await inMaster(() => db.searchDocuments('xiigen-design-snapshots', {}, 1));
    expect(result.isSuccess).toBe(true);
  });
});
