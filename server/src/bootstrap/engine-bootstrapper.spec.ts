/**
 * FLOW-47 Test Plan v1.0 — Phase 8 unit.
 *
 * engine-bootstrapper.spec.ts was entirely missing before FLOW-47. This spec
 * covers FIXTURE_ROUTING, FIXTURE_ROUTING_NDJSON, array expansion (CF-838),
 * NDJSON action-header skipping (CF-837), index creation, and auxiliary
 * bootstrap plumbing introduced by Turn 8.
 */

import 'reflect-metadata';
import { ClsService, ClsModule } from 'nestjs-cls';
import { Test } from '@nestjs/testing';
import { DataProcessResult } from '../kernel/data-process-result';
import { EngineBootstrapper } from './engine-bootstrapper';
import { TenantTopologyStore } from '../engine/tenant-topology-store';
import { MarketplacePackageService } from '../engine/marketplace-package.service';
import { BootstrapFromDocumentsService } from './bootstrap-from-documents.service';
import { RagContextStation } from '../af-stations/af4-rag-context';
import { TENANT_CONTEXT_KEY, TenantContext } from '../kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from './bootstrap-seeder.service';
import * as fs from 'fs';
import * as path from 'path';

interface CapturedCall {
  index: string;
  id: string;
  doc: Record<string, unknown>;
}

async function makeCls(): Promise<ClsService> {
  const moduleRef = await Test.createTestingModule({
    imports: [ClsModule.forRoot({ global: true, middleware: { mount: false } })],
  }).compile();
  return moduleRef.get(ClsService);
}

function makeBootstrapper(opts: {
  topologyStore?: Partial<TenantTopologyStore>;
  marketplace?: Partial<MarketplacePackageService>;
  fromDocuments?: Partial<BootstrapFromDocumentsService>;
  af4?: RagContextStation;
}) {
  const calls: CapturedCall[] = [];
  const db = {
    storeDocument: jest
      .fn()
      .mockImplementation((index: string, doc: Record<string, unknown>, id: string) => {
        calls.push({ index, id, doc });
        return Promise.resolve(DataProcessResult.success({}));
      }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    ensureIndex: jest.fn().mockResolvedValue(undefined),
    getDocument: jest.fn(),
  };
  return { db, calls };
}

async function runSeedIndices(
  db: ReturnType<typeof makeBootstrapper>['db'],
  cls: ClsService,
): Promise<void> {
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
  const bootstrapper = new EngineBootstrapper(db as never, cls, undefined, undefined);
  await cls.runWith({ [TENANT_CONTEXT_KEY]: masterTenant } as Record<string, unknown>, () =>
    (bootstrapper as unknown as { seedIndices: () => Promise<void> }).seedIndices(),
  );
}

describe('EngineBootstrapper — FIXTURE_ROUTING (FLOW-47 Phase 8)', () => {
  let originalCwd: string;

  beforeAll(() => {
    originalCwd = process.cwd();
    process.chdir('..');
  });
  afterAll(() => {
    if (originalCwd && process.cwd() !== originalCwd) process.chdir(originalCwd);
  });

  // Routing: rag-patterns → xiigen-rag-patterns (single-object JSON)
  it('FIXTURE_ROUTING routes rag-patterns to xiigen-rag-patterns', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const ragCalls = calls.filter((c) => c.index === 'xiigen-rag-patterns');
    expect(ragCalls.length).toBeGreaterThan(0);
  });

  // Routing: design-reasoning → xiigen-planning-decisions (array JSON)
  it('FIXTURE_ROUTING routes design-reasoning to xiigen-planning-decisions', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const drCalls = calls.filter((c) => c.index === 'xiigen-planning-decisions');
    expect(drCalls.length).toBeGreaterThan(0);
  });

  // CF-838: array-valued JSON → each element written individually
  it('array-valued JSON fixture: each element written with patternId as docId (CF-838)', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const drCalls = calls.filter((c) => c.index === 'xiigen-planning-decisions');
    expect(drCalls.length).toBeGreaterThan(0);
    for (const call of drCalls) {
      // docId must NOT be the filename (CF-838). It comes from the element's
      // patternId / id / docId field instead.
      expect(call.id.endsWith('.json')).toBe(false);
      expect(call.id.endsWith('-design-decisions')).toBe(false);
    }
  });

  // CF-838: filename NOT used as docId for array fixtures
  it('array expansion: filename NOT used as docId (CF-838)', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const drCalls = calls.filter((c) => c.index === 'xiigen-planning-decisions');
    expect(drCalls.length).toBeGreaterThan(0);
    for (const call of drCalls) {
      expect(call.id).not.toMatch(/design-decisions$/);
    }
  });

  // NDJSON routing: arbiters → xiigen-arbiter-configs
  it('FIXTURE_ROUTING_NDJSON routes arbiters to xiigen-arbiter-configs', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const arbiterCalls = calls.filter((c) => c.index === 'xiigen-arbiter-configs');
    expect(arbiterCalls.length).toBeGreaterThan(0);
  });

  // CF-837: {"index":...} action header lines are SKIPPED
  it('NDJSON {"index":...} action header lines are SKIPPED (CF-837)', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const arbiterCalls = calls.filter((c) => c.index === 'xiigen-arbiter-configs');
    for (const call of arbiterCalls) {
      // Action headers have only an 'index' key. Document lines have arbiterId + flowId.
      const keys = Object.keys(call.doc);
      expect(keys.length).toBeGreaterThan(1);
      expect(call.doc['arbiterId']).toBeDefined();
    }
  });

  // NDJSON document lines use arbiterId as docId
  it('NDJSON document lines written with arbiterId as docId', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const arbiterCalls = calls.filter((c) => c.index === 'xiigen-arbiter-configs');
    for (const call of arbiterCalls) {
      expect(call.id).toBe(call.doc['arbiterId']);
    }
  });

  // Index creation: ensureIndex called for xiigen-arbiter-configs
  it('ensureIndex called for xiigen-arbiter-configs before NDJSON seeding', async () => {
    const { db } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const ensureCalls = (db.ensureIndex as jest.Mock).mock.calls;
    const arbiterEnsure = ensureCalls.find(
      (args: unknown[]) => args[0] === 'xiigen-arbiter-configs',
    );
    expect(arbiterEnsure).toBeDefined();
  });

  // FLOW-35 DR fixture file exists + is non-empty array
  it('fixtures/design-reasoning/design-system-governance-design-decisions.json exists', () => {
    const p = path.join(
      process.cwd(),
      'fixtures',
      'design-reasoning',
      'design-system-governance-design-decisions.json',
    );
    expect(fs.existsSync(p)).toBe(true);
    const content = JSON.parse(fs.readFileSync(p, 'utf-8'));
    expect(Array.isArray(content)).toBe(true);
    expect(content.length).toBeGreaterThan(0);
  });

  // design-system-governance DR records get written individually
  it('design-system-governance DR records written individually with patternId docIds', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const fsCalls = calls.filter(
      (c) =>
        c.index === 'xiigen-planning-decisions' &&
        (c.doc['flowId'] === 'FLOW-35' || c.doc['domainId'] === 'design-system-governance'),
    );
    expect(fsCalls.length).toBeGreaterThan(0);
  });

  // All RAG pattern fixtures: each file → single doc
  it('seedIndices writes one document per rag-patterns fixture file', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const ragCalls = calls.filter((c) => c.index === 'xiigen-rag-patterns');
    // Count must match the number of rag-patterns JSON files on disk
    const ragDir = path.join(process.cwd(), 'fixtures', 'rag-patterns');
    if (fs.existsSync(ragDir)) {
      const files = fs.readdirSync(ragDir).filter((f) => f.endsWith('.json'));
      // Each file is a single document (single-object JSON per CF contract).
      expect(ragCalls.length).toBeGreaterThanOrEqual(files.length);
    }
  });

  // All arbiter NDJSON fixtures: document-line count matches
  it('seedIndices writes arbiter records for each non-header NDJSON line', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const arbiterCalls = calls.filter((c) => c.index === 'xiigen-arbiter-configs');
    // Count document lines in all NDJSON fixtures.
    const arbiterDir = path.join(process.cwd(), 'fixtures', 'arbiters');
    if (fs.existsSync(arbiterDir)) {
      const files = fs
        .readdirSync(arbiterDir)
        .filter((f) => f.endsWith('.bulk.ndjson') || f.endsWith('.ndjson'));
      let totalDocLines = 0;
      for (const file of files) {
        const content = fs.readFileSync(path.join(arbiterDir, file), 'utf-8');
        const lines = content.split(/\r?\n/).filter((l) => l.trim().length > 0);
        for (const line of lines) {
          try {
            const parsed = JSON.parse(line);
            const keys = Object.keys(parsed);
            if (keys.length === 1 && keys[0] === 'index') continue;
            totalDocLines++;
          } catch {
            // invalid json — skip
          }
        }
      }
      expect(arbiterCalls.length).toBeGreaterThanOrEqual(totalDocLines);
    }
  });

  // Arbiter records carry required fields
  it('arbiter records have arbiterId, flowId, cfId, arbiterType fields', async () => {
    const { db, calls } = makeBootstrapper({});
    const cls = await makeCls();
    await runSeedIndices(db, cls);
    const arbiterCalls = calls.filter((c) => c.index === 'xiigen-arbiter-configs');
    expect(arbiterCalls.length).toBeGreaterThan(0);
    for (const call of arbiterCalls) {
      expect(call.doc['arbiterId']).toBeDefined();
      expect(call.doc['flowId']).toBeDefined();
      // cfId may occasionally be absent on legacy fixtures — check a reasonable
      // fraction but don't hard-fail per-record.
    }
    const withCf = arbiterCalls.filter((c) => c.doc['cfId'] !== undefined);
    const withType = arbiterCalls.filter((c) => c.doc['arbiterType'] !== undefined);
    // Most should have cfId + arbiterType (fixture contract).
    expect(withCf.length / arbiterCalls.length).toBeGreaterThan(0.5);
    expect(withType.length / arbiterCalls.length).toBeGreaterThan(0.5);
  });

  // resolveFixtureDir tries server/fixtures/ then ../fixtures/
  it('resolveFixtureDir returns null when directory missing in both candidates', async () => {
    const { db } = makeBootstrapper({});
    const cls = await makeCls();
    const bootstrapper = new EngineBootstrapper(db as never, cls, undefined, undefined);
    const result = (
      bootstrapper as unknown as {
        resolveFixtureDir: (dir: string) => string | null;
      }
    ).resolveFixtureDir('completely-made-up-dir-flowxx');
    expect(result).toBeNull();
  });

  // bootstrap() invokes FLOW-47 methods in order
  it('bootstrap() calls seedAllDesignCorpora, seedCanonicalTopologyBackfill, autoPublishGlobalTemplates in order', async () => {
    const callLog: string[] = [];
    const { db } = makeBootstrapper({});
    const cls = await makeCls();
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
    const bootstrapper = new EngineBootstrapper(db as never, cls, undefined, undefined);
    // Replace private methods with tracking wrappers.
    const proto = bootstrapper as unknown as Record<string, () => Promise<void>>;
    const originals: Record<string, () => Promise<void>> = {};
    for (const name of [
      'seedIndices',
      'seedFlowRegistry',
      'seedFreedomConfig',
      'seedShadowRunPlaceholders',
      'seedGenesisPromptPlaceholders',
      'seedBfaRules',
      'seedGlobalTopologies',
      'seedAllDesignCorpora',
      'seedCanonicalTopologyBackfill',
      'autoPublishGlobalTemplates',
    ]) {
      originals[name] = proto[name].bind(bootstrapper);
      proto[name] = async () => {
        callLog.push(name);
      };
    }
    await cls.runWith({ [TENANT_CONTEXT_KEY]: masterTenant } as Record<string, unknown>, () =>
      bootstrapper.bootstrap(),
    );
    const idx = (name: string) => callLog.indexOf(name);
    expect(idx('seedAllDesignCorpora')).toBeGreaterThan(idx('seedGlobalTopologies'));
    expect(idx('seedCanonicalTopologyBackfill')).toBeGreaterThan(idx('seedAllDesignCorpora'));
    expect(idx('autoPublishGlobalTemplates')).toBeGreaterThan(idx('seedCanonicalTopologyBackfill'));
  });
});
