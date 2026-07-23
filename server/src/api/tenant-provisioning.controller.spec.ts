/**
 * Tests for TenantProvisioningController (FLOW-47 Turn 5 — T661).
 */

import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../kernel/data-process-result';
import { TenantProvisioningController } from './tenant-provisioning.controller';
import { TenantController } from './tenant.controller';
import { TenantProvisionerService } from '../engine/tenant-provisioner.service';
import { MarketplacePackageService } from '../engine/marketplace-package.service';
import { DesignTimeSnapshotService } from '../engine/scope/design-time-snapshot.service';
import { InstallValidationService } from '../engine/scope/install-validation.service';

function makeCls(): jest.Mocked<ClsService> {
  return {
    get: jest.fn(),
    set: jest.fn(),
    run: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    // FLOW-47 — provision() uses cls.runWith to set the new tenant in a
    // fresh CLS scope per module install. The mock just invokes the fn.
    runWith: jest.fn(async (_store: unknown, fn: () => Promise<unknown>) => fn()),
  } as unknown as jest.Mocked<ClsService>;
}

function makeCtrl(
  opts: {
    createResult?: DataProcessResult<Record<string, unknown>>;
    provisionResult?: ReturnType<TenantProvisionerService['provisionTenant']>;
    installResult?: Awaited<ReturnType<MarketplacePackageService['install']>>;
    pkg?: Awaited<ReturnType<MarketplacePackageService['getById']>>;
    snapshotResult?: ReturnType<DesignTimeSnapshotService['capture']>;
    validationResult?: ReturnType<InstallValidationService['validate']>;
  } = {},
) {
  const tenant = {
    create: jest
      .fn()
      .mockResolvedValue(opts.createResult ?? DataProcessResult.success({ id: 'tenant-acme' })),
  } as unknown as jest.Mocked<TenantController>;

  const provisioner = {
    provisionTenant: jest.fn().mockResolvedValue(
      opts.provisionResult ??
        DataProcessResult.success({
          tenantId: 'tenant-acme',
          registryEntryId: 'tenant-acme',
          freedomConfigId: 'freedom::tenant-acme',
          lifecycleEntries: 0,
          provisionedAt: 'now',
        }),
    ),
  } as unknown as jest.Mocked<TenantProvisionerService>;

  const marketplace = {
    install: jest.fn().mockResolvedValue(
      opts.installResult ?? {
        tenantId: 'tenant-acme',
        packageId: 'PKG-1',
        flowId: 'FLOW-SRC-1',
        version: 'v1',
        installedAt: 'now',
        linkedMode: true,
      },
    ),
    getById: jest.fn().mockResolvedValue(opts.pkg ?? null),
    publish: jest.fn(),
    browse: jest.fn(),
  } as unknown as jest.Mocked<MarketplacePackageService>;

  const designSnapshot = {
    capture: jest.fn().mockResolvedValue(
      opts.snapshotResult ??
        DataProcessResult.success({
          snapshotId: 'snap-1',
          tenantId: 'tenant-acme',
          packageId: 'PKG-1',
          packageVersion: 'v1',
          flowId: 'FLOW-SRC-1',
          patternIds: [],
          arbiterConfigIds: [],
          ironRules: [],
          installedAt: 'now',
        }),
    ),
  } as unknown as jest.Mocked<DesignTimeSnapshotService>;

  const installValidation = {
    validate: jest.fn().mockResolvedValue(
      opts.validationResult ??
        DataProcessResult.success({
          validationId: 'val-1',
          tenantId: 'tenant-acme',
          packageId: 'PKG-1',
          flowId: 'FLOW-SRC-1',
          status: 'PASSED' as const,
          gapCount: 0,
          validatedAt: 'now',
        }),
    ),
  } as unknown as jest.Mocked<InstallValidationService>;

  const cls = makeCls();
  const ctrl = new TenantProvisioningController(
    tenant,
    provisioner,
    marketplace,
    cls,
    designSnapshot,
    installValidation,
  );
  return { ctrl, tenant, provisioner, marketplace, designSnapshot, installValidation };
}

describe('TenantProvisioningController.provision', () => {
  it('rejects when name missing', async () => {
    const { ctrl } = makeCtrl();
    const res = await ctrl.provision({} as never);
    expect(res.status).toBe('FAILED');
    expect(res.code).toBe('MISSING_NAME');
  });

  it('creates TenantRecord via TenantController.create()', async () => {
    const { ctrl, tenant } = makeCtrl();
    await ctrl.provision({ name: 'Acme Corp', plan: 'PRO' });
    expect(tenant.create).toHaveBeenCalledWith(expect.objectContaining({ name: 'Acme Corp' }));
  });

  it('derives stable tenantId from name slug', async () => {
    const { ctrl } = makeCtrl();
    const res = await ctrl.provision({ name: 'Acme Corp', plan: 'PRO' });
    expect(res.tenantId).toBe('tenant-acme-corp');
  });

  it('continues when tenant already exists (idempotent)', async () => {
    const { ctrl, provisioner } = makeCtrl({
      createResult: DataProcessResult.failure('ALREADY_EXISTS', 'duplicate'),
    });
    const res = await ctrl.provision({ name: 'Acme', plan: 'PRO' });
    expect(res.status).toBe('PROVISIONED');
    expect(provisioner.provisionTenant).toHaveBeenCalled();
  });

  it('returns FAILED when create fails for non-conflict reason', async () => {
    const { ctrl } = makeCtrl({
      createResult: DataProcessResult.failure('STORE_FAILED', 'ES down'),
    });
    const res = await ctrl.provision({ name: 'Acme', plan: 'PRO' });
    expect(res.status).toBe('FAILED');
    expect(res.code).toBe('STORE_FAILED');
  });

  it('returns FAILED when provisionTenant fails', async () => {
    const { ctrl } = makeCtrl({
      provisionResult: Promise.resolve(
        DataProcessResult.failure('PROVISION_FAILED', 'lifecycle init failed'),
      ) as ReturnType<TenantProvisionerService['provisionTenant']>,
    });
    const res = await ctrl.provision({ name: 'Acme', plan: 'PRO' });
    expect(res.status).toBe('FAILED');
    expect(res.code).toBe('PROVISION_FAILED');
  });

  it('installs each module under tenant CLS context with snapshot + validation', async () => {
    const { ctrl, marketplace, designSnapshot, installValidation } = makeCtrl({
      pkg: {
        packageId: 'PKG-1',
        publisherTenantId: 'master',
        publishedAt: 'now',
        title: 'X',
        sourceFlowId: 'FLOW-SRC-1',
        sourceVersion: 'v1',
        topology: { nodes: [], edges: [], metadata: {} },
        connectionType: 'FLOW_SCOPED',
        tags: [],
        designBundleRefs: { patternIds: ['PAT-1'], ironRules: [], arbiterConfigIds: [] },
      },
    });
    const res = await ctrl.provision({
      name: 'Acme',
      plan: 'PRO',
      modules: [{ packageId: 'PKG-1' }],
    });
    expect(res.status).toBe('PROVISIONED');
    expect(res.installedModules).toHaveLength(1);
    expect(res.installedModules[0].status).toBe('INSTALLED');
    expect(res.installedModules[0].snapshotId).toBe('snap-1');
    expect(res.installedModules[0].validationStatus).toBe('PASSED');
    expect(marketplace.install).toHaveBeenCalledWith('PKG-1');
    expect(designSnapshot.capture).toHaveBeenCalled();
    expect(installValidation.validate).toHaveBeenCalled();
  });

  it('marks module FAILED when install service rejects', async () => {
    const { ctrl } = makeCtrl({
      installResult: { error: 'not found', code: 'PACKAGE_NOT_FOUND' },
    });
    const res = await ctrl.provision({
      name: 'Acme',
      plan: 'PRO',
      modules: [{ packageId: 'PKG-X' }],
    });
    expect(res.status).toBe('PROVISIONED'); // tenant provisioned even if module failed
    expect(res.installedModules[0].status).toBe('FAILED');
    expect(res.installedModules[0].errorCode).toBe('PACKAGE_NOT_FOUND');
  });

  it('skips validation when validate=false', async () => {
    const { ctrl, installValidation } = makeCtrl({
      pkg: {
        packageId: 'PKG-1',
        publisherTenantId: 'master',
        publishedAt: 'now',
        title: 'X',
        sourceFlowId: 'FLOW-SRC-1',
        sourceVersion: 'v1',
        topology: { nodes: [], edges: [], metadata: {} },
        connectionType: 'FLOW_SCOPED',
        tags: [],
        designBundleRefs: { patternIds: [], ironRules: [], arbiterConfigIds: [] },
      },
    });
    await ctrl.provision({
      name: 'Acme',
      plan: 'PRO',
      modules: [{ packageId: 'PKG-1' }],
      validate: false,
    });
    expect(installValidation.validate).not.toHaveBeenCalled();
  });

  it('returns empty installedModules when no modules requested', async () => {
    const { ctrl } = makeCtrl();
    const res = await ctrl.provision({ name: 'Acme', plan: 'PRO' });
    expect(res.installedModules).toEqual([]);
    expect(res.status).toBe('PROVISIONED');
  });
});
