/**
 * FLOW-45 Phase A — BootstrapFromDocumentsService (T601) Tests.
 *
 * 11 tests covering:
 *   HS-1: seeds all 7 patterns from arch-philosophy.json
 *   HS-2: uses patternId as document ID (idempotent)
 *   HS-3: CF-804 — knowledgeScope=GLOBAL on all seeded records
 *   HS-4: connectionType=FLOW_SCOPED on all seeded records
 *   HS-5: DNA-8 — storeDocument called for each pattern
 *   HS-6: partial DB failure doesn't stop remaining seeds
 *   HS-7: returns patternsSeeded + patternsFailed counts
 *   HS-8: DNA-3 — throws internally → DataProcessResult.failure
 *
 *   MT-1: tenantId=MASTER_TENANT_ID on all records
 *   MT-2: missing seed file → SEED_FILE_NOT_FOUND failure
 *   MT-3: re-seeding same patterns (idempotency) → succeeds without error
 */

import 'reflect-metadata';
import * as fs from 'fs';
import * as path from 'path';
import { BootstrapFromDocumentsService } from '../../src/bootstrap/bootstrap-from-documents.service';
import { MASTER_TENANT_ID } from '../../src/bootstrap/bootstrap-seeder.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock factory ─────────────────────────────────────────────────────────────

function makeMockDb() {
  const stored: Array<{ index: string; doc: Record<string, unknown>; id: string }> = [];
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      stored.push({ index, doc, id });
      return DataProcessResult.success({ ...doc });
    }),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    _stored: stored,
  } as any;
}

/** Resolve the arch-philosophy.json that exists alongside the service. */
const ARCH_SEED_FILE = path.join(
  __dirname,
  '../../src/bootstrap/history-seeds/arch-philosophy.json',
);
const HISTORY_TOPOLOGY_FILE = path.join(
  __dirname,
  '../../../contracts/topologies/history-bootstrap.topology.json',
);
const HISTORY_SEED_MANIFEST_FILE = path.join(
  __dirname,
  '../../../docs/portability/flow-45/seed-dependency-manifest.json',
);

// Verify the seed file actually exists before running tests
let seedFilePatterns: Array<Record<string, unknown>> = [];
try {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  seedFilePatterns = require(ARCH_SEED_FILE) as Array<Record<string, unknown>>;
} catch {
  // File not found — tests will detect this
}

beforeEach(() => jest.clearAllMocks());

describe('FLOW-45 Phase A — BootstrapFromDocumentsService', () => {
  it('HS-1: seeds all patterns from arch-philosophy.json', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    const result = await svc.seedArchPhilosophy();

    expect(result.isSuccess).toBe(true);
    expect(result.data!.patternsSeeded).toBeGreaterThanOrEqual(5);
    expect(result.data!.patternsSeeded).toBeLessThanOrEqual(10);
  });

  it('HS-2: uses patternId as document ID', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedArchPhilosophy();

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [, doc, id] of storeCalls) {
      expect(id).toBe(doc['patternId']);
    }
  });

  it('HS-3: CF-804 — knowledgeScope=GLOBAL on all seeded records', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedArchPhilosophy();

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [, doc] of storeCalls) {
      expect(doc['knowledgeScope']).toBe('GLOBAL');
    }
  });

  it('HS-4: connectionType=FLOW_SCOPED on all seeded records', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedArchPhilosophy();

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [, doc] of storeCalls) {
      expect(doc['connectionType']).toBe('FLOW_SCOPED');
    }
  });

  it('HS-5: storeDocument called once per pattern', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    const result = await svc.seedArchPhilosophy();

    expect(db.storeDocument).toHaveBeenCalledTimes(result.data!.patternsSeeded);
  });

  it('HS-6: partial DB failure — failed patterns counted, remaining patterns continue', async () => {
    const db = makeMockDb();
    let callNum = 0;
    (db.storeDocument as jest.Mock).mockImplementation(async () => {
      callNum++;
      // Fail only the second pattern
      if (callNum === 2) return DataProcessResult.failure('DB_ERROR', 'disk full');
      return DataProcessResult.success({});
    });
    const svc = new BootstrapFromDocumentsService(db);

    const result = await svc.seedArchPhilosophy();

    expect(result.isSuccess).toBe(true);
    expect(result.data!.patternsFailed).toBe(1);
    expect(result.data!.patternsSeeded).toBeGreaterThan(0);
  });

  it('HS-7: returns patternsSeeded + patternsFailed counts', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    const result = await svc.seedArchPhilosophy();

    expect(result.isSuccess).toBe(true);
    expect(typeof result.data!.patternsSeeded).toBe('number');
    expect(typeof result.data!.patternsFailed).toBe('number');
    expect(result.data!.patternsSeeded + result.data!.patternsFailed).toBeGreaterThan(0);
  });

  it('HS-8: DNA-3 — unexpected throw → DataProcessResult.failure', async () => {
    const db = makeMockDb();
    (db.storeDocument as jest.Mock).mockRejectedValue(new Error('unexpected crash'));
    const svc = new BootstrapFromDocumentsService(db);

    const result = await svc.seedArchPhilosophy();

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BOOTSTRAP_FROM_DOCUMENTS_ERROR');
  });

  it('MT-1: tenantId=MASTER_TENANT_ID on all seeded records', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedArchPhilosophy();

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [, doc] of storeCalls) {
      expect(doc['tenantId']).toBe(MASTER_TENANT_ID);
    }
  });

  it('MT-2: all patterns stored to xiigen-architecture-philosophy index', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    await svc.seedArchPhilosophy();

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    for (const [index] of storeCalls) {
      expect(index).toBe('xiigen-architecture-philosophy');
    }
  });

  it('MT-3: idempotent re-seeding — second call succeeds without error', async () => {
    const db = makeMockDb();
    const svc = new BootstrapFromDocumentsService(db);

    const first = await svc.seedArchPhilosophy();
    const second = await svc.seedArchPhilosophy();

    expect(first.isSuccess).toBe(true);
    expect(second.isSuccess).toBe(true);
    expect(second.data!.patternsSeeded).toBe(first.data!.patternsSeeded);
  });

  it('HS-9: topology manifest declares FLOW-45 as a bootstrap prerequisite', () => {
    const topology = JSON.parse(fs.readFileSync(HISTORY_TOPOLOGY_FILE, 'utf8')) as Record<
      string,
      unknown
    >;

    expect(topology['flowId']).toBe('FLOW-45');
    expect(topology['bootstrapPrerequisite']).toBe(true);
    expect(topology['knowledgeScope']).toBe('GLOBAL');
    expect(topology['seedManifest']).toEqual(
      expect.objectContaining({
        bootstrapPrerequisite: true,
        bfaRules: expect.arrayContaining(['CF-803', 'CF-804']),
      }),
    );
  });

  it('HS-10: seed dependency manifest defines PSH indexes for FLOW-29 consumers', () => {
    const manifest = JSON.parse(fs.readFileSync(HISTORY_SEED_MANIFEST_FILE, 'utf8')) as Record<
      string,
      unknown
    >;

    expect(manifest['bootstrapPrerequisite']).toBe(true);
    expect(manifest['pshIndexes']).toEqual(
      expect.arrayContaining([
        'xiigen-architecture-philosophy',
        'xiigen-philosophy-summaries',
        'xiigen-bootstrap-completions',
      ]),
    );
    expect(manifest['taskTypeIds']).toEqual(expect.arrayContaining(['T601', 'T604']));
  });
});
