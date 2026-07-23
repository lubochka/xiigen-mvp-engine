/**
 * Tests for MarketplacePackageController (FLOW-47 Turn 2/3/4 — refactored).
 *
 * The controller is now a thin HTTP wrapper over MarketplacePackageService.
 * Coverage focuses on:
 *   - delegation correctness
 *   - Turn 3 hook: DesignTimeSnapshot captured after install
 *   - Turn 4 hook: InstallValidation runs after snapshot
 *   - failure propagation when snapshot or validation fails
 */

import { DataProcessResult } from '../kernel/data-process-result';
import {
  MarketplacePackageController,
  MARKETPLACE_PACKAGES_INDEX,
} from './marketplace-package.controller';
import {
  MarketplacePackage,
  MarketplacePackageService,
} from '../engine/marketplace-package.service';
import { TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';
import { ModuleRegistrationRecord } from '../engine/tenant-module-registry.service';
import { DesignTimeSnapshotService } from '../engine/scope/design-time-snapshot.service';
import { InstallValidationService } from '../engine/scope/install-validation.service';
import { ForkFlowHandlerService } from '../engine/flows/module-lifecycle/fork-flow.handler';

function makeCls(tenantId: string | null = 'tenant-A') {
  const store = new Map<string, unknown>();
  if (tenantId) store.set(TENANT_CONTEXT_KEY, { tenantId });
  return {
    get: jest.fn((key: string) => store.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => {
      store.set(key, val);
    }),
    run: jest.fn(),
  };
}

function makePkg(overrides: Partial<MarketplacePackage> = {}): MarketplacePackage {
  return {
    packageId: 'PKG-INSTALL-1',
    publisherTenantId: 'tenant-publisher',
    publishedAt: 'now',
    title: 'Installable Flow',
    sourceFlowId: 'FLOW-SRC-1',
    sourceVersion: 'v1',
    topology: {
      nodes: [{ nodeId: 'n1', name: 'Step', archetype: 'ANALYSIS' }],
      edges: [],
      metadata: {},
    },
    connectionType: 'FLOW_SCOPED',
    tags: [],
    designBundleRefs: {
      patternIds: ['PAT-1', 'PAT-2'],
      ironRules: [{ ruleId: 'IR-1', text: 'always tenant-scope', flowId: 'FLOW-SRC-1' }],
      arbiterConfigIds: ['ARB-1'],
    },
    ...overrides,
  };
}

interface MakeCtrlOpts {
  publishResult?: ReturnType<MarketplacePackageService['publish']>;
  installResult?: Awaited<ReturnType<MarketplacePackageService['install']>>;
  pkg?: MarketplacePackage | null;
  snapshotResult?: ReturnType<DesignTimeSnapshotService['capture']>;
  validationResult?: ReturnType<InstallValidationService['validate']>;
  withSnapshot?: boolean;
  withValidation?: boolean;
  withFork?: boolean;
  forkResult?: Awaited<ReturnType<ForkFlowHandlerService['execute']>>;
}

function makeCtrl(opts: MakeCtrlOpts = {}) {
  const installRecord: ModuleRegistrationRecord = {
    tenantId: 'tenant-A',
    packageId: 'PKG-INSTALL-1',
    flowId: 'FLOW-SRC-1',
    version: 'v1',
    installedAt: 'now',
    linkedMode: true,
  };
  const marketplace = {
    publish: jest.fn().mockResolvedValue(
      opts.publishResult ??
        ({
          packageId: 'PKG-PUB-1',
          publisherTenantId: 'tenant-A',
          publishedAt: 'now',
          title: 'Test',
          sourceFlowId: 'FLOW-PRIV-1',
          sourceVersion: 'v1',
          topology: { nodes: [], edges: [], metadata: {} },
          connectionType: 'FLOW_SCOPED',
          tags: [],
          designBundleRefs: { patternIds: [], ironRules: [], arbiterConfigIds: [] },
        } as MarketplacePackage),
    ),
    browse: jest.fn().mockResolvedValue([]),
    getById: jest.fn().mockResolvedValue(opts.pkg ?? null),
    install: jest.fn().mockResolvedValue(opts.installResult ?? installRecord),
  } as unknown as jest.Mocked<MarketplacePackageService>;

  const designSnapshot = opts.withSnapshot
    ? ({
        capture: jest.fn().mockResolvedValue(
          opts.snapshotResult ??
            DataProcessResult.success({
              snapshotId: 'snap-1',
              tenantId: 'tenant-A',
              packageId: 'PKG-INSTALL-1',
              packageVersion: 'v1',
              flowId: 'FLOW-SRC-1',
              patternIds: ['PAT-1'],
              arbiterConfigIds: [],
              ironRules: [],
              installedAt: 'now',
            }),
        ),
      } as unknown as jest.Mocked<DesignTimeSnapshotService>)
    : undefined;

  const installValidation = opts.withValidation
    ? ({
        validate: jest.fn().mockResolvedValue(
          opts.validationResult ??
            DataProcessResult.success({
              validationId: 'val-1',
              tenantId: 'tenant-A',
              packageId: 'PKG-INSTALL-1',
              flowId: 'FLOW-SRC-1',
              status: 'PASSED' as const,
              gapCount: 0,
              validatedAt: 'now',
            }),
        ),
      } as unknown as jest.Mocked<InstallValidationService>)
    : undefined;

  const forkHandler = opts.withFork
    ? ({
        execute: jest.fn().mockResolvedValue(
          opts.forkResult ??
            DataProcessResult.success({
              status: 'FORKED',
              repoFullName: 'lubochka/northwind--user-registration-acme-pro-members',
            }),
        ),
      } as unknown as jest.Mocked<ForkFlowHandlerService>)
    : undefined;

  const cls = makeCls();
  const ctrl = new MarketplacePackageController(
    marketplace,
    cls as never,
    designSnapshot,
    installValidation,
    forkHandler,
  );
  return { ctrl, marketplace, designSnapshot, installValidation, forkHandler, cls };
}

describe('MarketplacePackageController — POST / (publish delegation)', () => {
  it('delegates publish to MarketplacePackageService', async () => {
    const { ctrl, marketplace } = makeCtrl();
    await ctrl.publish({ flowId: 'FLOW-PRIV-1', title: 'Test' });
    expect(marketplace.publish).toHaveBeenCalledWith({ flowId: 'FLOW-PRIV-1', title: 'Test' });
  });
});

describe('MarketplacePackageController — GET / (browse delegation)', () => {
  it('returns packages array from service', async () => {
    const { ctrl, marketplace } = makeCtrl();
    const list = [
      { packageId: 'PKG-1', tags: ['demo'] } as unknown as MarketplacePackage,
      { packageId: 'PKG-2', tags: [] } as unknown as MarketplacePackage,
    ];
    (marketplace.browse as jest.Mock).mockResolvedValueOnce(list);
    const res = (await ctrl.browse()) as { packages: MarketplacePackage[] };
    expect(res.packages).toHaveLength(2);
  });

  it('filters by tag passed to service', async () => {
    const { ctrl, marketplace } = makeCtrl();
    await ctrl.browse('demo');
    expect(marketplace.browse).toHaveBeenCalledWith('demo');
  });
});

describe('MarketplacePackageController — POST /:packageId/install (Turn 6 baseline + Turn 3+4 hooks)', () => {
  it('returns registration record without snapshot when service not injected', async () => {
    const { ctrl } = makeCtrl({ pkg: makePkg() });
    const res = (await ctrl.install('PKG-INSTALL-1')) as ModuleRegistrationRecord & {
      snapshotId?: string;
      validationStatus?: string;
    };
    expect(res.packageId).toBe('PKG-INSTALL-1');
    expect(res.snapshotId).toBeUndefined();
    expect(res.validationStatus).toBeUndefined();
  });

  it('Turn 3: captures DesignTimeSnapshot after install when service injected', async () => {
    const { ctrl, designSnapshot } = makeCtrl({ pkg: makePkg(), withSnapshot: true });
    const res = (await ctrl.install('PKG-INSTALL-1')) as ModuleRegistrationRecord & {
      snapshotId: string;
    };
    expect(designSnapshot!.capture).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-A',
        packageId: 'PKG-INSTALL-1',
        flowId: 'FLOW-SRC-1',
        patternIds: ['PAT-1', 'PAT-2'],
        arbiterConfigIds: ['ARB-1'],
      }),
    );
    expect(res.snapshotId).toBe('snap-1');
  });

  it('Turn 3: snapshot failure blocks install (CF-834)', async () => {
    const { ctrl } = makeCtrl({
      pkg: makePkg(),
      withSnapshot: true,
      snapshotResult: Promise.resolve(
        DataProcessResult.failure('STORE_FAILED', 'ES write failure'),
      ) as ReturnType<DesignTimeSnapshotService['capture']>,
    });
    const res = (await ctrl.install('PKG-INSTALL-1')) as { code: string; error: string };
    expect(res.code).toBe('STORE_FAILED');
  });

  it('Turn 4: validation runs after snapshot when service injected', async () => {
    const { ctrl, installValidation } = makeCtrl({
      pkg: makePkg(),
      withSnapshot: true,
      withValidation: true,
    });
    const res = (await ctrl.install('PKG-INSTALL-1')) as ModuleRegistrationRecord & {
      validationStatus: string;
    };
    expect(installValidation!.validate).toHaveBeenCalledWith(
      expect.objectContaining({
        tenantId: 'tenant-A',
        packageId: 'PKG-INSTALL-1',
        flowId: 'FLOW-SRC-1',
        snapshotId: 'snap-1',
      }),
    );
    expect(res.validationStatus).toBe('PASSED');
  });

  it('Turn 4: DEGRADED validation does NOT block install (CF-835)', async () => {
    const { ctrl } = makeCtrl({
      pkg: makePkg(),
      withSnapshot: true,
      withValidation: true,
      validationResult: Promise.resolve(
        DataProcessResult.success({
          validationId: 'val-2',
          tenantId: 'tenant-A',
          packageId: 'PKG-INSTALL-1',
          flowId: 'FLOW-SRC-1',
          status: 'DEGRADED' as const,
          gapCount: 3,
          validatedAt: 'now',
        }),
      ) as ReturnType<InstallValidationService['validate']>,
    });
    const res = (await ctrl.install('PKG-INSTALL-1')) as ModuleRegistrationRecord & {
      validationStatus: string;
    };
    expect(res.validationStatus).toBe('DEGRADED');
    expect(res.packageId).toBe('PKG-INSTALL-1'); // install still completed
  });

  it('Turn 4: ERROR validation blocks install', async () => {
    const { ctrl } = makeCtrl({
      pkg: makePkg(),
      withSnapshot: true,
      withValidation: true,
      validationResult: Promise.resolve(
        DataProcessResult.failure('VALIDATION_SERVICE_ERROR', 'service down'),
      ) as ReturnType<InstallValidationService['validate']>,
    });
    const res = (await ctrl.install('PKG-INSTALL-1')) as { code: string };
    expect(res.code).toBe('VALIDATION_SERVICE_ERROR');
  });

  it('returns NO_TENANT when ALS is empty', async () => {
    const marketplace = {
      install: jest.fn(),
    } as unknown as jest.Mocked<MarketplacePackageService>;
    const ctrl = new MarketplacePackageController(marketplace, makeCls(null) as never);
    const res = (await ctrl.install('PKG-X')) as { code: string };
    expect(res.code).toBe('NO_TENANT');
  });

  it('propagates install service failure with original code', async () => {
    const { ctrl } = makeCtrl({
      installResult: { error: 'package missing', code: 'PACKAGE_NOT_FOUND' },
    });
    const res = (await ctrl.install('PKG-MISSING')) as { code: string };
    expect(res.code).toBe('PACKAGE_NOT_FOUND');
  });
});

describe('MarketplacePackageController — POST /:flowSlug/fork', () => {
  it('forwards adapted source repo and repo-name override to the fork handler', async () => {
    const { ctrl, forkHandler } = makeCtrl({ withFork: true });

    const res = await ctrl.fork('user-registration', {
      flowId: 'FLOW-01',
      targetGitHubUsername: 'lubochka',
      initialVersion: '1.0.1',
      repoNameOverride: 'northwind--user-registration-acme-pro-members',
      sourceRepoFullName: 'lubochka/acme-corp--user-registration-acme-pro-members',
    });

    expect(res).toMatchObject({ status: 'FORKED' });
    expect(forkHandler!.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        flowSlug: 'user-registration',
        flowId: 'FLOW-01',
        initialVersion: '1.0.1',
        repoNameOverride: 'northwind--user-registration-acme-pro-members',
        sourceRepoFullName: 'lubochka/acme-corp--user-registration-acme-pro-members',
      }),
    );
  });
});

describe('MARKETPLACE_PACKAGES_INDEX', () => {
  it('exports the canonical index name', () => {
    expect(MARKETPLACE_PACKAGES_INDEX).toBe('xiigen-marketplace-packages');
  });
});
