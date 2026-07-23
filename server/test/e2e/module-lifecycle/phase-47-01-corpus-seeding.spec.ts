/**
 * FLOW-47 Test Plan v1.0 — Phase 1 integration.
 *
 * Exercises the whole bootstrap seeding chain end-to-end:
 *   - bootstrap() calls seedAllDesignCorpora()
 *   - xiigen-rag-patterns + xiigen-planning-decisions populated
 *   - AF-4 keyword search returns ≥1 result (GE-1 gate)
 *   - Turn 0 guard: autoPublishGlobalTemplates skips empty-topology flows
 */

import 'reflect-metadata';
import { ClsService, ClsModule } from 'nestjs-cls';
import { Test } from '@nestjs/testing';
import { InMemoryDatabaseProvider } from '../../../src/fabrics/database/in-memory.provider';
import { TenantTopologyStore } from '../../../src/engine/tenant-topology-store';
import { TenantModuleRegistry } from '../../../src/engine/tenant-module-registry.service';
import { MarketplacePackageService } from '../../../src/engine/marketplace-package.service';
import { EngineBootstrapper } from '../../../src/bootstrap/engine-bootstrapper';
import { BootstrapFromDocumentsService } from '../../../src/bootstrap/bootstrap-from-documents.service';
import { RagContextStation } from '../../../src/af-stations/af4-rag-context';
import { TENANT_CONTEXT_KEY, TenantContext } from '../../../src/kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from '../../../src/bootstrap/bootstrap-seeder.service';

describe('FLOW-47 Phase 1 — corpus seeding integration', () => {
  let db: InMemoryDatabaseProvider;
  let cls: ClsService;
  let af4: RagContextStation;
  let bootstrapper: EngineBootstrapper;
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

  beforeAll(async () => {
    // chdir so fixture paths resolve from repo root
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
    const marketplace = new MarketplacePackageService(topologyStore, db, cls, moduleRegistry);
    const fromDocuments = new BootstrapFromDocumentsService(db);
    af4 = new RagContextStation(moduleRegistry);

    bootstrapper = new EngineBootstrapper(
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
  }, 180000);

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) {
      process.chdir(originalCwd);
    }
  });

  // Integration: bootstrap calls seedAllDesignCorpora() — verified via ES content
  it('engine-bootstrapper.bootstrap() seeds corpora to ES', async () => {
    const dr = await inMaster(() => db.searchDocuments('xiigen-planning-decisions', {}, 10));
    expect(dr.isSuccess).toBe(true);
    expect((dr.data ?? []).length).toBeGreaterThan(0);
  });

  // Integration: xiigen-planning-decisions populated
  it('xiigen-planning-decisions has ≥1 DESIGN_REASONING record after bootstrap', async () => {
    const result = await inMaster(() =>
      db.searchDocuments('xiigen-planning-decisions', { patternType: 'DESIGN_REASONING' }, 5),
    );
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  // Integration: xiigen-rag-patterns populated
  it('xiigen-rag-patterns has ≥1 ARCH_PATTERN record after bootstrap', async () => {
    const result = await inMaster(() =>
      db.searchDocuments('xiigen-rag-patterns', { patternType: 'ARCH_PATTERN' }, 5),
    );
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  // GE-1 gate: AF-4 keyword search returns non-empty result after rehydration
  it('AF-4 keyword search returns ≥1 result for a seeded pattern keyword', () => {
    // Corpus records include 'registration', 'completion', 'tenant' etc.
    // AF-4 search after Turn 1b rehydration should match on these.
    const matches = af4.search(['registration', 'tenant', 'completion']);
    expect(matches.length).toBeGreaterThan(0);
  });

  // Turn 0 guard: autoPublishGlobalTemplates skips empty-topology flows
  it('autoPublishGlobalTemplates skips FLOW with empty topology nodes in ES', async () => {
    // After bootstrap, any GLOBAL template with nodes=[] should NOT have a
    // corresponding marketplace package. Check by asserting: no package exists
    // whose sourceFlowId matches a flow with empty nodes.
    const allTemplates = await inMaster(() =>
      db.searchDocuments('xiigen-flow-templates', { knowledgeScope: 'GLOBAL' }, 500),
    );
    expect(allTemplates.isSuccess).toBe(true);
    const emptyNodeFlows = (allTemplates.data ?? []).filter((t) => {
      const nodes = (t as { nodes?: unknown[] }).nodes;
      return Array.isArray(nodes) && nodes.length === 0;
    });
    const packages = await inMaster(() =>
      db.searchDocuments('xiigen-marketplace-packages', {}, 500),
    );
    expect(packages.isSuccess).toBe(true);
    const publishedSources = new Set(
      (packages.data ?? []).map((p) => (p as { sourceFlowId?: string }).sourceFlowId),
    );
    for (const emptyFlow of emptyNodeFlows) {
      const flowId = (emptyFlow as { flowId?: string }).flowId;
      expect(publishedSources.has(flowId)).toBe(false);
    }
  });
});
