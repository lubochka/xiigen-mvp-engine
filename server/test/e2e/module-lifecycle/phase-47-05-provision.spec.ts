/**
 * FLOW-47 Test Plan v1.0 — Phase 5 integration.
 *
 * POST /api/tenants/provision creates a tenant, provisions it, installs each
 * module, and returns an aggregate result. Idempotency: re-calling with the
 * same tenant name reuses the registry entry.
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

describe('FLOW-47 Phase 5 — tenant provisioning endpoint', () => {
  let cls: ClsService;
  let db: InMemoryDatabaseProvider;
  let marketplace: MarketplacePackageService;
  let tenantRegistry: TenantRegistry;
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

    tenantRegistry = new TenantRegistry();
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

  it('POST /api/tenants/provision creates new tenant', async () => {
    const res = await inMaster(() =>
      provisionController.provision({ name: 'phase5-basic', plan: 'STANDARD' }),
    );
    expect(res.status).toBe('PROVISIONED');
    expect(res.tenantId).toBe('tenant-phase5-basic');
    const found = await tenantRegistry.findById('tenant-phase5-basic');
    expect(found.isSuccess).toBe(true);
    expect(found.data).toBeTruthy();
  });

  it('provisioned tenant is queryable via tenantRegistry.findById', async () => {
    await inMaster(() => provisionController.provision({ name: 'phase5-query', plan: 'STANDARD' }));
    const found = await tenantRegistry.findById('tenant-phase5-query');
    expect(found.isSuccess).toBe(true);
    expect(found.data!.name).toBe('phase5-query');
    expect(found.data!.status).toBe('active');
  });

  it('provision with modules[] triggers install chain for each package', async () => {
    const packages = await inMaster(() => marketplace.browse());
    const pkg = packages[0];
    const tenantId = 'tenant-phase5-modules';
    await copyPackageIntoTenant(pkg.packageId, tenantId);

    const res = await inMaster(() =>
      provisionController.provision({
        name: 'phase5-modules',
        plan: 'STANDARD',
        modules: [{ packageId: pkg.packageId }],
      }),
    );
    expect(res.status).toBe('PROVISIONED');
    expect(res.installedModules).toHaveLength(1);
    expect(res.installedModules[0].status).toBe('INSTALLED');
    expect(res.installedModules[0].packageId).toBe(pkg.packageId);
    expect(res.installedModules[0].snapshotId).toBeTruthy();
    expect(res.installedModules[0].validationStatus).toBeTruthy();
  });

  it('provision is idempotent — second call does not duplicate tenant', async () => {
    const first = await inMaster(() =>
      provisionController.provision({ name: 'phase5-idempotent', plan: 'STANDARD' }),
    );
    const second = await inMaster(() =>
      provisionController.provision({ name: 'phase5-idempotent', plan: 'STANDARD' }),
    );
    expect(first.tenantId).toBe(second.tenantId);
    expect(first.status).toBe('PROVISIONED');
    expect(second.status).toBe('PROVISIONED');
    // Registry has exactly one entry for this tenant
    const all = await tenantRegistry.list();
    const matches = (all.data ?? []).filter((t) => t.id === 'tenant-phase5-idempotent');
    expect(matches).toHaveLength(1);
  });
});
