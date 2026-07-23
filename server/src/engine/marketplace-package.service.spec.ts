/**
 * Tests for MarketplacePackageService (FLOW-47 Turn 2 — T658).
 *
 * Coverage:
 *   - publish() relaxes the gate for GLOBAL source iff caller is MASTER_TENANT_ID
 *   - publish() rejects GLOBAL source from non-MASTER tenant
 *   - publish() still rejects DRAFT
 *   - publish() populates designBundleRefs.patternIds from xiigen-rag-patterns
 *   - publish() populates designBundleRefs.arbiterConfigIds from xiigen-arbiter-configs
 *   - publish() embeds ironRules inline (CF-833)
 *   - install() returns linked-mode registration record
 */

import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../kernel/data-process-result';
import {
  MarketplacePackageService,
  MARKETPLACE_PACKAGES_INDEX,
} from './marketplace-package.service';
import { TENANT_CONTEXT_KEY } from '../kernel/multi-tenant/tenant-context';
import { TenantTopology, TenantTopologyStore } from './tenant-topology-store';
import { TenantModuleRegistry } from './tenant-module-registry.service';
import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

function makeCls(tenantId: string | null = 'tenant-A'): jest.Mocked<ClsService> {
  const store = new Map<string, unknown>();
  if (tenantId) store.set(TENANT_CONTEXT_KEY, { tenantId });
  return {
    get: jest.fn((key: string) => store.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => {
      store.set(key, val);
    }),
    run: jest.fn(),
  } as unknown as jest.Mocked<ClsService>;
}

function makeTopology(overrides: Partial<TenantTopology> = {}): TenantTopology {
  return {
    flowId: 'FLOW-PRIV-1',
    tenantId: 'tenant-A',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'PRIVATE',
    name: 'Test Flow',
    version: 'v1',
    status: 'PUBLISHED',
    nodes: [{ nodeId: 'n1', name: 'Step', archetype: 'ANALYSIS' }],
    edges: [],
    metadata: {},
    createdAt: 'now',
    updatedAt: 'now',
    ...overrides,
  };
}

function makeService(
  opts: {
    sourceTopology?: TenantTopology | null;
    globalTemplate?: TenantTopology | null;
    ragPatterns?: Array<{ patternId: string }>;
    arbiterConfigs?: Array<{ arbiterId: string }>;
    tenantId?: string | null;
    storeWriteResult?: DataProcessResult<Record<string, unknown>>;
    registerInstallResult?: DataProcessResult<{
      tenantId: string;
      packageId: string;
      flowId: string;
      version: string;
      installedAt: string;
      linkedMode: true;
    }>;
  } = {},
) {
  const store = {
    getById: jest
      .fn()
      .mockResolvedValue(
        opts.sourceTopology !== undefined
          ? DataProcessResult.success(opts.sourceTopology)
          : DataProcessResult.success(null),
      ),
  } as unknown as jest.Mocked<TenantTopologyStore>;

  const db = {
    storeDocument: jest
      .fn()
      .mockResolvedValue(opts.storeWriteResult ?? DataProcessResult.success({})),
    searchDocuments: jest.fn().mockImplementation((index: string) => {
      if (index === 'xiigen-flow-templates' && opts.globalTemplate) {
        return Promise.resolve(DataProcessResult.success([opts.globalTemplate]));
      }
      if (index === 'xiigen-rag-patterns') {
        return Promise.resolve(DataProcessResult.success(opts.ragPatterns ?? []));
      }
      if (index === 'xiigen-arbiter-configs') {
        return Promise.resolve(DataProcessResult.success(opts.arbiterConfigs ?? []));
      }
      return Promise.resolve(DataProcessResult.success([]));
    }),
    getDocument: jest.fn(),
  };

  const moduleRegistry = {
    registerInstall: jest.fn().mockResolvedValue(
      opts.registerInstallResult ??
        DataProcessResult.success({
          tenantId: 'tenant-A',
          packageId: 'PKG-1',
          flowId: 'FLOW-SRC-1',
          version: 'v1',
          installedAt: 'now',
          linkedMode: true,
        }),
    ),
  } as unknown as jest.Mocked<TenantModuleRegistry>;

  const cls = makeCls(opts.tenantId === undefined ? 'tenant-A' : opts.tenantId);
  const service = new MarketplacePackageService(store, db as never, cls, moduleRegistry);
  return { service, store, db, moduleRegistry, cls };
}

describe('MarketplacePackageService.publish — gate (Turn 2 / AD-4)', () => {
  it('rejects when no tenant context', async () => {
    const { service } = makeService({
      sourceTopology: makeTopology(),
      tenantId: null,
    });
    const res = (await service.publish({ flowId: 'F', title: 'T' })) as { code: string };
    expect(res.code).toBe('NO_TENANT');
  });

  it('rejects DRAFT source', async () => {
    const { service } = makeService({
      sourceTopology: makeTopology({ status: 'DRAFT' }),
    });
    const res = (await service.publish({ flowId: 'F', title: 'T' })) as { code: string };
    expect(res.code).toBe('NOT_PUBLISHED');
  });

  it('rejects GLOBAL source from non-MASTER tenant', async () => {
    const { service } = makeService({
      sourceTopology: null,
      globalTemplate: makeTopology({ knowledgeScope: 'GLOBAL', flowId: 'FLOW-G-1' }),
      tenantId: 'tenant-A',
    });
    const res = (await service.publish({ flowId: 'FLOW-G-1', title: 'T' })) as { code: string };
    expect(res.code).toBe('NOT_PUBLISHABLE');
  });

  it('accepts GLOBAL source from MASTER_TENANT_ID', async () => {
    const { service } = makeService({
      sourceTopology: null,
      globalTemplate: makeTopology({ knowledgeScope: 'GLOBAL', flowId: 'FLOW-G-1' }),
      tenantId: MASTER_TENANT_ID,
    });
    const res = await service.publish({ flowId: 'FLOW-G-1', title: 'T' });
    expect('packageId' in result(res)).toBe(true);
  });
});

describe('MarketplacePackageService.publish — designBundleRefs assembly (Turn 2 / AD-2 / Turn 8)', () => {
  it('populates patternIds from xiigen-rag-patterns by sourceFlowId', async () => {
    const { service } = makeService({
      sourceTopology: makeTopology({ flowId: 'FLOW-X' }),
      ragPatterns: [{ patternId: 'PAT-1' }, { patternId: 'PAT-2' }],
    });
    const res = await service.publish({ flowId: 'FLOW-X', title: 'T' });
    const pkg = result(res);
    expect('packageId' in pkg).toBe(true);
    if ('packageId' in pkg) {
      expect(pkg.designBundleRefs.patternIds).toEqual(['PAT-1', 'PAT-2']);
    }
  });

  it('populates arbiterConfigIds from xiigen-arbiter-configs (CF-Turn-8)', async () => {
    const { service } = makeService({
      sourceTopology: makeTopology({ flowId: 'FLOW-X' }),
      arbiterConfigs: [{ arbiterId: 'ARB-1' }, { arbiterId: 'ARB-2' }],
    });
    const res = await service.publish({ flowId: 'FLOW-X', title: 'T' });
    const pkg = result(res);
    if ('packageId' in pkg) {
      expect(pkg.designBundleRefs.arbiterConfigIds).toEqual(['ARB-1', 'ARB-2']);
    }
  });

  it('embeds ironRules inline from source metadata (CF-833)', async () => {
    const { service } = makeService({
      sourceTopology: makeTopology({
        flowId: 'FLOW-X',
        metadata: {
          ironRules: [{ ruleId: 'IR-1', text: 'always tenant-scope', flowId: 'FLOW-X' }],
        },
      }),
    });
    const res = await service.publish({ flowId: 'FLOW-X', title: 'T' });
    const pkg = result(res);
    if ('packageId' in pkg) {
      expect(pkg.designBundleRefs.ironRules).toEqual([
        { ruleId: 'IR-1', text: 'always tenant-scope', flowId: 'FLOW-X' },
      ]);
    }
  });
});

describe('MarketplacePackageService.install — linked mode (DD-324)', () => {
  it('writes registration via TenantModuleRegistry', async () => {
    const { service, db, moduleRegistry } = makeService();
    (db.getDocument as jest.Mock).mockResolvedValueOnce(
      DataProcessResult.success({
        packageId: 'PKG-1',
        sourceFlowId: 'FLOW-SRC-1',
        sourceVersion: 'v1',
      }),
    );
    const res = await service.install('PKG-1');
    expect(moduleRegistry.registerInstall).toHaveBeenCalledWith({
      packageId: 'PKG-1',
      flowId: 'FLOW-SRC-1',
      version: 'v1',
    });
    expect('linkedMode' in result(res)).toBe(true);
  });

  it('rejects when package not found', async () => {
    const { service, db } = makeService();
    (db.getDocument as jest.Mock).mockResolvedValueOnce(DataProcessResult.success(null));
    const res = (await service.install('PKG-X')) as { code: string };
    expect(res.code).toBe('PACKAGE_NOT_FOUND');
  });

  it('writes to MARKETPLACE_PACKAGES_INDEX on publish (idempotency by packageId)', async () => {
    const { service, db } = makeService({ sourceTopology: makeTopology() });
    await service.publish({ flowId: 'FLOW-PRIV-1', title: 'T' });
    expect(db.storeDocument).toHaveBeenCalledWith(
      MARKETPLACE_PACKAGES_INDEX,
      expect.any(Object),
      expect.stringMatching(/^PKG-[A-Z0-9]{8}$/),
    );
  });
});

/** Wrap result in untyped union for assertion convenience. */
function result(r: unknown):
  | {
      packageId: string;
      designBundleRefs: {
        patternIds: string[];
        ironRules: Array<{ ruleId: string; text: string; flowId: string }>;
        arbiterConfigIds: string[];
      };
      [k: string]: unknown;
    }
  | { code: string } {
  return r as never;
}
