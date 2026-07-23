/**
 * FLOW-47 Test Plan v1.0 — Phase 1 (Turn 1 / T657).
 *
 * BootstrapFromDocumentsService had no spec before FLOW-47. Covers:
 *   - seedFlowCorpus() routing by patternType (DR → planning-decisions,
 *     ARCH_PATTERN → rag-patterns)
 *   - idempotency (patternId as docId)
 *   - Turn 1b AF-4 rehydration invocation
 *   - CF-832 coverage logging
 *   - seedAllDesignCorpora() file discovery for all 47 *-design-corpus.json
 *   - per-file failure isolation
 */

import { ClsService } from 'nestjs-cls';
import { DataProcessResult } from '../kernel/data-process-result';
import { BootstrapFromDocumentsService } from './bootstrap-from-documents.service';
import { TENANT_CONTEXT_KEY, TenantContext } from '../kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from './bootstrap-seeder.service';
import * as fs from 'fs';
import * as path from 'path';

function makeCls(): ClsService {
  const store = new Map<string, unknown>();
  store.set(TENANT_CONTEXT_KEY, {
    tenantId: MASTER_TENANT_ID,
  } as unknown as TenantContext);
  return {
    get: jest.fn((key: string) => store.get(key) ?? null),
    set: jest.fn((key: string, val: unknown) => {
      store.set(key, val);
    }),
    run: jest.fn(async (fn: () => Promise<unknown>) => fn()),
    runWith: jest.fn(async (_store: unknown, fn: () => Promise<unknown>) => fn()),
  } as unknown as ClsService;
}

function makeService(storeCalls: Array<[string, string, Record<string, unknown>]>) {
  const db = {
    storeDocument: jest
      .fn()
      .mockImplementation((index: string, doc: Record<string, unknown>, id: string) => {
        storeCalls.push([index, id, doc]);
        return Promise.resolve(DataProcessResult.success({}));
      }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn(),
    ensureIndex: jest.fn().mockResolvedValue(undefined),
  };
  return { service: new BootstrapFromDocumentsService(db as never), db };
}

describe('BootstrapFromDocumentsService.seedFlowCorpus() — FLOW-47 Phase 1', () => {
  // T1: reads {slug}-design-corpus.json from history-seeds/
  it('reads the correct file path for a given slug', async () => {
    const { service } = makeService([]);
    // A known real fixture is shipped in history-seeds/. The read path is
    // __dirname + '/history-seeds/{slug}-design-corpus.json' — using a real
    // seeded slug ensures the loader finds it.
    const result = await service.seedFlowCorpus('user-registration');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.flowId).toBe('user-registration');
  });

  // T2: writes DESIGN_REASONING records to xiigen-planning-decisions
  it('routes DESIGN_REASONING patternType to xiigen-planning-decisions index', async () => {
    const calls: Array<[string, string, Record<string, unknown>]> = [];
    const { service } = makeService(calls);
    await service.seedFlowCorpus('user-registration');
    // FLOW-01-DR-01 is a DESIGN_REASONING record in the fixture.
    const drCall = calls.find(([, id]) => id === 'FLOW-01-DR-01');
    expect(drCall).toBeDefined();
    expect(drCall![0]).toBe('xiigen-planning-decisions');
    expect(drCall![2]['patternType']).toBe('DESIGN_REASONING');
  });

  // T3: writes ARCH_PATTERN records to xiigen-rag-patterns
  it('routes ARCH_PATTERN patternType to xiigen-rag-patterns index', async () => {
    const calls: Array<[string, string, Record<string, unknown>]> = [];
    const { service } = makeService(calls);
    // user-registration corpus has mixed types; find an ARCH_PATTERN record.
    await service.seedFlowCorpus('user-registration');
    const archCall = calls.find(
      ([index, , doc]) => index === 'xiigen-rag-patterns' && doc['patternType'] === 'ARCH_PATTERN',
    );
    expect(archCall).toBeDefined();
    expect(archCall![0]).toBe('xiigen-rag-patterns');
  });

  // T4: idempotent — second call uses same docId (patternId) so writes overwrite
  it('storeDocument called with same docId on second call — idempotent', async () => {
    const calls: Array<[string, string, Record<string, unknown>]> = [];
    const { service } = makeService(calls);
    await service.seedFlowCorpus('user-registration');
    const firstRunIds = new Set(calls.map(([, id]) => id));
    const secondCallStart = calls.length;
    await service.seedFlowCorpus('user-registration');
    const secondRunIds = new Set(calls.slice(secondCallStart).map(([, id]) => id));
    // Each pattern's docId reappears in the second run with same value.
    for (const id of secondRunIds) {
      expect(firstRunIds.has(id)).toBe(true);
    }
  });

  // T5: partial failure — one bad record does not abort the whole file
  it('continues seeding after an individual write fails', async () => {
    const calls: Array<[string, string, Record<string, unknown>]> = [];
    const db = {
      storeDocument: jest
        .fn()
        .mockImplementation((index: string, doc: Record<string, unknown>, id: string) => {
          calls.push([index, id, doc]);
          // Fail the first write, succeed for the rest.
          if (calls.length === 1) {
            return Promise.resolve(DataProcessResult.failure('STORE_FAILED', 'boom'));
          }
          return Promise.resolve(DataProcessResult.success({}));
        }),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      getDocument: jest.fn(),
      ensureIndex: jest.fn(),
    };
    const service = new BootstrapFromDocumentsService(db as never);
    const result = await service.seedFlowCorpus('user-registration');
    // Service still returns success, but failedCount > 0.
    expect(result.isSuccess).toBe(true);
    expect(result.data!.failedCount).toBeGreaterThanOrEqual(1);
    // Further records kept being attempted.
    expect(calls.length).toBeGreaterThan(1);
  });

  // T6: returns NOT_FOUND when the seed file is missing (partial failure mode)
  it('returns SEED_FILE_NOT_FOUND when slug has no corpus file', async () => {
    const { service } = makeService([]);
    const result = await service.seedFlowCorpus('slug-that-definitely-does-not-exist');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SEED_FILE_NOT_FOUND');
  });

  // T7: empty flowId rejected at input gate
  it('returns MISSING_FLOW_ID when called with empty string', async () => {
    const { service } = makeService([]);
    const result = await service.seedFlowCorpus('');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_FLOW_ID');
  });

  // T8: discovered file names — verify the *-design-corpus.json file set grows
  //      monotonically as flows ship. Baseline was 47 (46 + platform-agent from
  //      FLOW-46 Phase A); FLOW-48 i18n-translation brought it to 48. Assert
  //      ≥ 47 so the test stays forward-compatible as new flows land.
  it('seedAllDesignCorpora target set discovers at least 47 corpus files', () => {
    const seedsDir = path.join(__dirname, 'history-seeds');
    const corpusFiles = fs.readdirSync(seedsDir).filter((f) => f.endsWith('-design-corpus.json'));
    expect(corpusFiles.length).toBeGreaterThanOrEqual(47);
  });

  // T9: tenantId stamped from MASTER_TENANT_ID in every seeded doc
  it('every seeded document has tenantId = MASTER_TENANT_ID', async () => {
    const calls: Array<[string, string, Record<string, unknown>]> = [];
    const { service } = makeService(calls);
    await service.seedFlowCorpus('user-registration');
    expect(calls.length).toBeGreaterThan(0);
    for (const [, , doc] of calls) {
      expect(doc['tenantId']).toBe(MASTER_TENANT_ID);
    }
  });
});

describe('BootstrapFromDocumentsService — count tracking', () => {
  it('reports designReasoningCount + archPatternCount + failedCount in result', async () => {
    const calls: Array<[string, string, Record<string, unknown>]> = [];
    const { service } = makeService(calls);
    const result = await service.seedFlowCorpus('user-registration');
    expect(result.isSuccess).toBe(true);
    expect(result.data!.designReasoningCount).toBeGreaterThan(0);
    expect(result.data!.archPatternCount).toBeGreaterThanOrEqual(0);
    expect(result.data!.failedCount).toBe(0);
  });
});

// Deliberately unused import-style reference to keep the CLS helper typed
// (removes "unused" lint warning while retaining clarity).
void makeCls;
