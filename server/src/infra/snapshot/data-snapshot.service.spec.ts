// server/src/infra/snapshot/data-snapshot.service.spec.ts

import 'reflect-metadata';
import {
  DataSnapshotService,
  SCOPE_FILTERED_INDICES,
  GLOBAL_INDICES,
  MASTER_TENANT_INDICES,
} from './data-snapshot.service';
import { DataMigrationService } from './data-migration.service';
import { DataProcessResult } from '../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../bootstrap/bootstrap-seeder.service';

// ── shared mock DB builder ───────────────────────────────────────────────────

function makeDb(overrides: Partial<Record<string, unknown[]>> = {}) {
  return {
    searchDocuments: jest.fn(async (index: string) => {
      const rows = overrides[index] ?? [];
      return DataProcessResult.success(rows);
    }),
    storeDocument: jest.fn(async () => DataProcessResult.success(undefined)),
    getDocument: jest.fn(async () => DataProcessResult.failure('NOT_FOUND', 'not found')),
  };
}

// ── DataSnapshotService ──────────────────────────────────────────────────────

describe('DataSnapshotService', () => {
  describe('Category A — scope-filtered indices', () => {
    it('exports MODULE scope records, excludes PRIVATE', async () => {
      const db = makeDb({
        'xiigen-rag-patterns': [
          { id: 'p1', knowledgeScope: 'MODULE', content: 'pattern A' },
          { id: 'p2', knowledgeScope: 'PRIVATE', content: 'private — must not appear' },
          { id: 'p3', knowledgeScope: 'GLOBAL', content: 'pattern B' },
        ],
      });
      const svc = new DataSnapshotService(db as any);
      const result = await svc.exportToNdjson('abc123');

      expect(result.isSuccess).toBe(true);
      const lines = result.data!.ndjson.split('\n').filter((l) => l.trim());
      const sources = lines
        .slice(1) // skip manifest line
        .map((l) => JSON.parse(l) as { _index: string; _source: Record<string, unknown> });

      const ragLines = sources.filter((s) => s._index === 'xiigen-rag-patterns');
      expect(ragLines).toHaveLength(2); // p1 (MODULE) + p3 (GLOBAL), not p2
      expect(ragLines.every((s) => s._source['knowledgeScope'] !== 'PRIVATE')).toBe(true);
    });

    it('passes the MODULE/GLOBAL scope query to searchDocuments — no raw header leakage', () => {
      const db = makeDb();
      const svc = new DataSnapshotService(db as any);
      svc.exportToNdjson('abc123');

      // Verify the query passed to each scope-filtered index is scope-based
      const ragCall = (db.searchDocuments as jest.Mock).mock.calls.find(
        ([index]: [string]) => index === 'xiigen-rag-patterns',
      );
      expect(ragCall).toBeDefined();
      const query = ragCall![1] as Record<string, unknown>;
      const should = (query as any).bool?.should as Array<Record<string, unknown>>;
      expect(should.some((c) => JSON.stringify(c).includes('MODULE'))).toBe(true);
      expect(should.some((c) => JSON.stringify(c).includes('GLOBAL'))).toBe(true);
    });

    it('includes xiigen-training-data (MODULE/GLOBAL DPO triples are platform learning)', async () => {
      const db = makeDb({
        'xiigen-training-data': [
          { id: 't1', knowledgeScope: 'MODULE', chosen: { text: 'a' }, rejected: { text: 'b' } },
        ],
      });
      const svc = new DataSnapshotService(db as any);
      const result = await svc.exportToNdjson('sha1');

      const lines = result
        .data!.ndjson.split('\n')
        .filter((l) => l.trim())
        .slice(1);
      const trainingLines = lines.filter((l) => {
        const p = JSON.parse(l) as { _index: string };
        return p._index === 'xiigen-training-data';
      });
      expect(trainingLines).toHaveLength(1);
    });
  });

  describe('Category B — global platform indices (no scope, no tenantId)', () => {
    it('exports all records without filtering', async () => {
      const db = makeDb({
        'xiigen-engine-contracts': [
          { id: 'c1', taskTypeId: 'T47' },
          { id: 'c2', taskTypeId: 'T48' },
        ],
        'xiigen-flow-definitions': [{ id: 'fd1', flowId: 'FLOW-01' }],
      });
      const svc = new DataSnapshotService(db as any);
      const result = await svc.exportToNdjson('sha1');

      const lines = result
        .data!.ndjson.split('\n')
        .filter((l) => l.trim())
        .slice(1);
      const contractLines = lines.filter(
        (l) => (JSON.parse(l) as { _index: string })._index === 'xiigen-engine-contracts',
      );
      const flowLines = lines.filter(
        (l) => (JSON.parse(l) as { _index: string })._index === 'xiigen-flow-definitions',
      );
      expect(contractLines).toHaveLength(2);
      expect(flowLines).toHaveLength(1);
    });

    it('passes match_all query to global indices', () => {
      const db = makeDb();
      const svc = new DataSnapshotService(db as any);
      svc.exportToNdjson('sha1');

      const contractCall = (db.searchDocuments as jest.Mock).mock.calls.find(
        ([index]: [string]) => index === 'xiigen-engine-contracts',
      );
      expect(contractCall).toBeDefined();
      expect(contractCall![1]).toEqual({ match_all: {} });
    });
  });

  describe('Category C — master tenant config indices', () => {
    it('exports only records belonging to MASTER_TENANT_ID', async () => {
      const db = makeDb({
        'xiigen-config': [
          {
            id: 'cfg1',
            tenantId: MASTER_TENANT_ID,
            configKey: 'graduation.gradeThreshold',
            value: 0.85,
          },
          { id: 'cfg2', tenantId: 'other-tenant-uuid', configKey: 'some.key', value: 'private' },
        ],
      });
      const svc = new DataSnapshotService(db as any);
      const result = await svc.exportToNdjson('sha1');

      expect(result.isSuccess).toBe(true);
      const lines = result
        .data!.ndjson.split('\n')
        .filter((l) => l.trim())
        .slice(1);
      const configLines = lines.filter(
        (l) => (JSON.parse(l) as { _index: string })._index === 'xiigen-config',
      );
      expect(configLines).toHaveLength(1);
      const doc = JSON.parse(configLines[0]!) as { _source: { tenantId: string } };
      expect(doc._source.tenantId).toBe(MASTER_TENANT_ID);
    });

    it('passes tenantId = MASTER_TENANT_ID query to config index', () => {
      const db = makeDb();
      const svc = new DataSnapshotService(db as any);
      svc.exportToNdjson('sha1');

      const configCall = (db.searchDocuments as jest.Mock).mock.calls.find(
        ([index]: [string]) => index === 'xiigen-config',
      );
      expect(configCall).toBeDefined();
      const query = configCall![1] as Record<string, unknown>;
      expect(JSON.stringify(query)).toContain(MASTER_TENANT_ID);
    });

    it('includes xiigen-shadow-runs and xiigen-knowledge-policy in Category C', () => {
      const db = makeDb();
      const svc = new DataSnapshotService(db as any);
      svc.exportToNdjson('sha1');

      const calledIndices = (db.searchDocuments as jest.Mock).mock.calls.map(([i]: [string]) => i);
      expect(calledIndices).toContain('xiigen-shadow-runs');
      expect(calledIndices).toContain('xiigen-knowledge-policy');
    });
  });

  describe('manifest', () => {
    it('manifest is first line, contains commitSha and correct totalRecords', async () => {
      const db = makeDb({
        'xiigen-rag-patterns': [
          { id: 'p1', knowledgeScope: 'MODULE' },
          { id: 'p2', knowledgeScope: 'MODULE' },
        ],
        'xiigen-config': [{ id: 'cfg1', tenantId: MASTER_TENANT_ID }],
      });
      const svc = new DataSnapshotService(db as any);
      const result = await svc.exportToNdjson('deadbeef');

      const lines = result.data!.ndjson.split('\n').filter((l) => l.trim());
      const manifestLine = JSON.parse(lines[0]!) as {
        _manifest: { commitSha: string; totalRecords: number };
      };
      expect(manifestLine._manifest.commitSha).toBe('deadbeef');
      expect(manifestLine._manifest.totalRecords).toBe(result.data!.manifest.totalRecords);
      expect(manifestLine._manifest.totalRecords).toBeGreaterThan(0);
    });

    it('manifest.indices lists every exported index with its count', async () => {
      const db = makeDb({
        'xiigen-rag-patterns': [{ id: 'p1', knowledgeScope: 'MODULE' }],
        'xiigen-config': [{ id: 'c1', tenantId: MASTER_TENANT_ID }],
      });
      const svc = new DataSnapshotService(db as any);
      const result = await svc.exportToNdjson('sha1');

      const indexEntry = (name: string) =>
        result.data!.manifest.indices.find((i) => i.name === name);
      expect(indexEntry('xiigen-rag-patterns')?.count).toBe(1);
      expect(indexEntry('xiigen-config')?.count).toBe(1);
    });
  });

  describe('resilience (DNA-3)', () => {
    it('returns failure (not throw) when db is unavailable', async () => {
      const svc = new DataSnapshotService(undefined);
      const result = await svc.exportToNdjson('sha1');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_DB');
    });

    it('skips an index and continues when searchDocuments fails for that index', async () => {
      const db = makeDb({ 'xiigen-engine-contracts': [{ id: 'c1' }] });
      (db.searchDocuments as jest.Mock).mockImplementation(async (index: string) => {
        if (index === 'xiigen-rag-patterns') {
          return DataProcessResult.failure('ES_ERROR', 'connection refused');
        }
        return DataProcessResult.success([{ id: 'c1' }]);
      });
      const svc = new DataSnapshotService(db as any);

      // Must not throw
      await expect(svc.exportToNdjson('sha1')).resolves.toBeDefined();
      const result = await svc.exportToNdjson('sha1');
      expect(result.isSuccess).toBe(true);

      // rag-patterns count = 0 (failed), other indices succeed
      const ragEntry = result.data!.manifest.indices.find((i) => i.name === 'xiigen-rag-patterns');
      expect(ragEntry?.count).toBe(0);
    });
  });

  describe('BYOK exclusion (critical)', () => {
    it('never calls searchDocuments for xiigen-byok-keys', () => {
      const db = makeDb();
      const svc = new DataSnapshotService(db as any);
      svc.exportToNdjson('sha1');

      const calledIndices = (db.searchDocuments as jest.Mock).mock.calls.map(([i]: [string]) => i);
      expect(calledIndices).not.toContain('xiigen-byok-keys');
    });

    it('never calls searchDocuments for xiigen-training-data-pending', () => {
      const db = makeDb();
      const svc = new DataSnapshotService(db as any);
      svc.exportToNdjson('sha1');

      const calledIndices = (db.searchDocuments as jest.Mock).mock.calls.map(([i]: [string]) => i);
      expect(calledIndices).not.toContain('xiigen-training-data-pending');
    });
  });
});

// ── DataMigrationService ─────────────────────────────────────────────────────

describe('DataMigrationService', () => {
  describe('import basics', () => {
    it('reads manifest from first line and returns it in result', async () => {
      const manifest = {
        commitSha: 'abc123',
        exportedAt: '2026-04-05T00:00:00Z',
        indices: [{ name: 'xiigen-rag-patterns', count: 1 }],
        totalRecords: 1,
      };
      const ndjson = [
        JSON.stringify({ _manifest: manifest }),
        JSON.stringify({
          _index: 'xiigen-rag-patterns',
          _source: { id: 'p1', knowledgeScope: 'MODULE' },
        }),
      ].join('\n');

      const db = makeDb();
      const svc = new DataMigrationService(db as any);
      const result = await svc.importFromNdjson(ndjson);

      expect(result.isSuccess).toBe(true);
      expect(result.data!.manifest?.commitSha).toBe('abc123');
      expect(result.data!.importedRecords).toBe(1);
    });

    it('calls storeDocument for each non-manifest record', async () => {
      const ndjson = [
        JSON.stringify({
          _manifest: { commitSha: 'x', exportedAt: '', indices: [], totalRecords: 2 },
        }),
        JSON.stringify({ _index: 'xiigen-rag-patterns', _source: { id: 'p1' } }),
        JSON.stringify({ _index: 'xiigen-engine-contracts', _source: { id: 'c1' } }),
      ].join('\n');

      const db = makeDb();
      const svc = new DataMigrationService(db as any);
      await svc.importFromNdjson(ndjson);

      expect(db.storeDocument).toHaveBeenCalledTimes(2);
      expect(db.storeDocument).toHaveBeenCalledWith(
        'xiigen-rag-patterns',
        expect.objectContaining({ id: 'p1' }),
        'p1',
      );
    });

    it('uses document id from _source as the store key', async () => {
      const ndjson = [
        JSON.stringify({
          _index: 'xiigen-config',
          _source: { id: 'cfg-123', tenantId: MASTER_TENANT_ID },
        }),
      ].join('\n');

      const db = makeDb();
      const svc = new DataMigrationService(db as any);
      await svc.importFromNdjson(ndjson);

      expect(db.storeDocument).toHaveBeenCalledWith('xiigen-config', expect.any(Object), 'cfg-123');
    });
  });

  describe('resilience', () => {
    it('returns failure (not throw) when db is unavailable', async () => {
      const svc = new DataMigrationService(undefined);
      const result = await svc.importFromNdjson('{}');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_DB');
    });

    it('returns failure on empty snapshot', async () => {
      const db = makeDb();
      const svc = new DataMigrationService(db as any);
      const result = await svc.importFromNdjson('   ');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('EMPTY_SNAPSHOT');
    });

    it('skips malformed lines, counts them in skippedRecords', async () => {
      const ndjson = [
        'not valid json {{{{',
        JSON.stringify({ _index: 'xiigen-rag-patterns', _source: { id: 'p1' } }),
        '{"incomplete":',
      ].join('\n');

      const db = makeDb();
      const svc = new DataMigrationService(db as any);
      const result = await svc.importFromNdjson(ndjson);

      expect(result.isSuccess).toBe(true);
      expect(result.data!.importedRecords).toBe(1);
      expect(result.data!.skippedRecords).toBe(2);
    });
  });

  describe('Category C round-trip — master tenant config', () => {
    it('config record with MASTER_TENANT_ID survives export → import', async () => {
      // ARRANGE: DB with a FREEDOM config record for master tenant
      const configRecord = {
        id: 'cfg-graduation-threshold',
        tenantId: MASTER_TENANT_ID,
        configKey: 'graduation.gradeThreshold',
        value: 0.85,
        createdAt: '2026-04-05T00:00:00Z',
        updatedAt: '2026-04-05T00:00:00Z',
      };

      const exportDb = makeDb({
        'xiigen-config': [configRecord],
      });

      // EXPORT
      const snapSvc = new DataSnapshotService(exportDb as any);
      const snapResult = await snapSvc.exportToNdjson('roundtrip-sha');
      expect(snapResult.isSuccess).toBe(true);

      const configInManifest = snapResult.data!.manifest.indices.find(
        (i) => i.name === 'xiigen-config',
      );
      expect(configInManifest?.count).toBe(1);

      // Verify the NDJSON contains the config record
      const lines = snapResult
        .data!.ndjson.split('\n')
        .filter((l) => l.trim())
        .slice(1);
      const configLine = lines.find((l) => {
        const p = JSON.parse(l) as { _index: string };
        return p._index === 'xiigen-config';
      });
      expect(configLine).toBeDefined();
      const configDoc = JSON.parse(configLine!) as { _source: typeof configRecord };
      expect(configDoc._source.tenantId).toBe(MASTER_TENANT_ID);
      expect(configDoc._source.configKey).toBe('graduation.gradeThreshold');

      // IMPORT
      const importDb = makeDb();
      const migSvc = new DataMigrationService(importDb as any);
      const migResult = await migSvc.importFromNdjson(snapResult.data!.ndjson);

      expect(migResult.isSuccess).toBe(true);
      expect(migResult.data!.importedRecords).toBeGreaterThanOrEqual(1);

      // Verify storeDocument was called with the config record and master tenant ID
      const storeCall = (importDb.storeDocument as jest.Mock).mock.calls.find(
        ([index, doc]: [string, Record<string, unknown>]) =>
          index === 'xiigen-config' && doc['tenantId'] === MASTER_TENANT_ID,
      );
      expect(storeCall).toBeDefined();
      expect(storeCall![2]).toBe('cfg-graduation-threshold'); // correct doc ID
    });

    it('other-tenant config records are NOT in snapshot — cannot be imported', async () => {
      const exportDb = makeDb({
        'xiigen-config': [
          { id: 'cfg1', tenantId: MASTER_TENANT_ID, configKey: 'a.b', value: 1 },
          { id: 'cfg2', tenantId: 'some-other-tenant', configKey: 'x.y', value: 99 },
        ],
      });

      const snapSvc = new DataSnapshotService(exportDb as any);
      const snapResult = await snapSvc.exportToNdjson('sha-isolation');

      const importDb = makeDb();
      const migSvc = new DataMigrationService(importDb as any);
      await migSvc.importFromNdjson(snapResult.data!.ndjson);

      // Only master tenant config was imported
      const storeCalls = (importDb.storeDocument as jest.Mock).mock.calls.filter(
        ([index]: [string]) => index === 'xiigen-config',
      );
      expect(storeCalls).toHaveLength(1);
      expect((storeCalls[0]![1] as Record<string, unknown>)['tenantId']).toBe(MASTER_TENANT_ID);
    });
  });
});
