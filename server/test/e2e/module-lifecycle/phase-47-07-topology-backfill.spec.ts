/**
 * FLOW-47 Test Plan v1.0 — Phase 7 integration.
 *
 * After the full bootstrap, canonical topology backfill should have populated
 * the 10 previously-empty slugs, and auto-publish should therefore have created
 * marketplace packages for many more flows than the 4 that existed on disk.
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

describe('FLOW-47 Phase 7 — topology backfill integration', () => {
  let cls: ClsService;
  let db: InMemoryDatabaseProvider;
  let marketplace: MarketplacePackageService;
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
  }, 180000);

  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) process.chdir(originalCwd);
  });

  it('after full bootstrap, xiigen-flow-templates has populated entries for at least several backfilled slugs', async () => {
    const result = await inMaster(() =>
      db.searchDocuments('xiigen-flow-templates', { knowledgeScope: 'GLOBAL' }, 500),
    );
    expect(result.isSuccess).toBe(true);
    const populated = (result.data ?? []).filter((t) => {
      const nodes = (t as { nodes?: unknown[] }).nodes;
      return Array.isArray(nodes) && nodes.length > 0;
    });
    // Before Turn 7 backfill: only 4. After: substantially more (the exact
    // count depends on which fixture files exist on disk and how many
    // idempotency-skip paths triggered).
    expect(populated.length).toBeGreaterThan(4);
  });

  it('autoPublishGlobalTemplates publishes more than 4 packages after backfill', async () => {
    const packages = await inMaster(() => marketplace.browse());
    // Pre-Turn-7 baseline was 4 (the 4 originally populated canonical flows).
    // After backfill + auto-publish, many more should be present.
    expect(packages.length).toBeGreaterThan(4);
  });

  it('at least one backfilled slug (e.g. schema-registry-dag) has a marketplace package', async () => {
    const packages = await inMaster(() => marketplace.browse());
    const backfilledSlugs = [
      'schema-registry-dag',
      'event-management',
      'profile-enrichment',
      'reviews-reputation',
      'subscription-billing',
      'user-groups-communities',
      'friend-request-social-feed',
      'completion-gamification',
      'transactional-event-participation',
      'marketplace',
    ];
    const publishedSources = new Set(packages.map((p) => p.sourceFlowId));
    const hit = backfilledSlugs.some((s) => publishedSources.has(s));
    expect(hit).toBe(true);
  });

  it('backfilled flow packages carry populated topology.nodes', async () => {
    const packages = await inMaster(() => marketplace.browse());
    for (const pkg of packages) {
      expect(pkg.topology.nodes.length).toBeGreaterThan(0);
    }
  });
});
