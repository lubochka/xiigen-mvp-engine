/**
 * FLOW-47 Test Plan v1.0 — Phase 8 integration.
 *
 * After full bootstrap, all three FIXTURE_ROUTING additions produced records:
 *   - fixtures/rag-patterns/ → xiigen-rag-patterns (~90 single-object files)
 *   - fixtures/design-reasoning/ → xiigen-planning-decisions (array-expanded)
 *   - fixtures/arbiters/ → xiigen-arbiter-configs (NDJSON, headers skipped)
 *
 * The FLOW-35 fix (design-system-governance DR file) also lands a DR record.
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

describe('FLOW-47 Phase 8 — fixture routing integration', () => {
  let cls: ClsService;
  let db: InMemoryDatabaseProvider;
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
    const marketplace = new MarketplacePackageService(topologyStore, db, cls, moduleRegistry);
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

  it('xiigen-planning-decisions has ≥1 DR record from fixtures/design-reasoning/', async () => {
    const result = await inMaster(() => db.searchDocuments('xiigen-planning-decisions', {}, 1000));
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('xiigen-rag-patterns has records from fixtures/rag-patterns/', async () => {
    const result = await inMaster(() =>
      db.searchDocuments('xiigen-rag-patterns', { patternType: 'ARCH_PATTERN' }, 1000),
    );
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBeGreaterThan(0);
  });

  it('xiigen-arbiter-configs has ≥1 arbiter config from fixtures/arbiters/', async () => {
    const result = await inMaster(() => db.searchDocuments('xiigen-arbiter-configs', {}, 1000));
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('each seeded arbiter config has arbiterId, flowId fields', async () => {
    const result = await inMaster(() => db.searchDocuments('xiigen-arbiter-configs', {}, 100));
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBeGreaterThan(0);
    for (const rec of (result.data ?? []) as Array<Record<string, unknown>>) {
      expect(rec['arbiterId']).toBeDefined();
      expect(rec['flowId']).toBeDefined();
    }
  });

  it('DR records have individual patternId/id as docId — not filename', async () => {
    const result = await inMaster(() => db.searchDocuments('xiigen-planning-decisions', {}, 100));
    expect(result.isSuccess).toBe(true);
    for (const rec of (result.data ?? []) as Array<Record<string, unknown>>) {
      const id = rec['_id'] as string | undefined;
      if (id) {
        expect(id.endsWith('.json')).toBe(false);
        expect(id.endsWith('-design-decisions')).toBe(false);
      }
    }
  });

  it('design-system-governance (FLOW-35) has ≥1 DR record (FLOW-35 fix)', async () => {
    const result = await inMaster(() =>
      db.searchDocuments('xiigen-planning-decisions', { domainId: 'design-system-governance' }, 10),
    );
    expect(result.isSuccess).toBe(true);
    expect((result.data ?? []).length).toBeGreaterThanOrEqual(1);
  });

  it('xiigen-arbiter-configs has many records (fixtures-wide seeding works)', async () => {
    const result = await inMaster(() => db.searchDocuments('xiigen-arbiter-configs', {}, 1000));
    expect(result.isSuccess).toBe(true);
    // Each NDJSON fixture has many arbiter records. Expect a substantial count.
    expect((result.data ?? []).length).toBeGreaterThan(50);
  });

  it('xiigen-planning-decisions has many DR records (fixtures-wide seeding works)', async () => {
    const result = await inMaster(() => db.searchDocuments('xiigen-planning-decisions', {}, 1000));
    expect(result.isSuccess).toBe(true);
    // 44 DR fixture files × average 5+ records each, plus corpus DR records.
    expect((result.data ?? []).length).toBeGreaterThan(50);
  });
});
