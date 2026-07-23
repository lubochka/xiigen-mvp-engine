/**
 * DataSnapshotService — exports XIIGen platform knowledge to NDJSON.
 *
 * Three-category export design:
 *
 * Category A — SCOPE_FILTERED_INDICES
 *   Indices that may contain both platform and private tenant records.
 *   Query: knowledgeScope IN [MODULE, GLOBAL].
 *   In-memory guard also applied (defensive double-filter).
 *   Private tenant records (PRIVATE scope) are never exported.
 *   Includes xiigen-training-data: MODULE/GLOBAL DPO triples are platform learning.
 *   PRIVATE scope DPO triples (per-tenant) are excluded by filter.
 *
 * Category B — GLOBAL_INDICES
 *   Indices where every record is inherently global (no tenant-scoped rows).
 *   Query: match_all — no scope filter needed.
 *
 * Category C — MASTER_TENANT_INDICES
 *   Master-tenant configuration and governance indices.
 *   Query: term { tenantId: MASTER_TENANT_ID }.
 *   In-memory guard also applied (defensive double-filter).
 *   Includes xiigen-config (FREEDOM config) and xiigen-shadow-runs.
 *   xiigen-config is also injected into ephemeral tenants during portability
 *   tests (Step 7) so the test uses the same thresholds as the main tenant.
 *
 * NEVER export:
 *   byok-keys, training-data-pending, cycle-visibility, idempotency,
 *   flow-state-snapshots, usage-meters, run-traces.
 *
 * Queries fire concurrently (all searchDocuments calls registered before first await)
 * so tests that check mock.calls synchronously see all indices.
 *
 * DNA-3: never throws. Returns DataProcessResult.
 * DNA-8: all writes confirmed before returning success.
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../bootstrap/bootstrap-seeder.service';

// ── Category A: scope-filtered indices ────────────────────────────────────────
export const SCOPE_FILTERED_INDICES = [
  'xiigen-rag-patterns',
  'xiigen-calibration-baseline',
  'xiigen-oss-curriculum-runs',
  'xiigen-decision-graph',
  'xiigen-prompts',
  'xiigen-knowledge-policy',
  'xiigen-training-data',
] as const;

// ── Category B: global platform indices ───────────────────────────────────────
export const GLOBAL_INDICES = [
  'xiigen-flow-definitions',
  'xiigen-flow-registry',
  'xiigen-engine-contracts',
] as const;

// ── Category C: master-tenant config + governance indices ──────────────────────
export const MASTER_TENANT_INDICES = ['xiigen-config', 'xiigen-shadow-runs'] as const;

// ── Never export ──────────────────────────────────────────────────────────────
export const EXCLUDED_INDICES = [
  'xiigen-byok-keys',
  'xiigen-training-data-pending',
  'xiigen-cycle-visibility',
  'xiigen-idempotency',
  'xiigen-flow-state-snapshots',
  'xiigen-usage-meters',
  'xiigen-run-traces',
] as const;

// ── Queries ────────────────────────────────────────────────────────────────────

const SCOPE_FILTER_QUERY = {
  bool: {
    should: [{ term: { knowledgeScope: 'MODULE' } }, { term: { knowledgeScope: 'GLOBAL' } }],
    minimum_should_match: 1,
  },
};

const MATCH_ALL_QUERY = { match_all: {} };

const masterTenantQuery = (): Record<string, unknown> => ({
  term: { tenantId: MASTER_TENANT_ID },
});

// ── Types ─────────────────────────────────────────────────────────────────────

export interface IndexExportStats {
  name: string;
  category: 'A' | 'B' | 'C';
  count: number;
}

export interface SnapshotManifest {
  commitSha: string;
  exportedAt: string;
  indices: IndexExportStats[];
  totalRecords: number;
}

// ── Service ───────────────────────────────────────────────────────────────────

@Injectable()
export class DataSnapshotService {
  private readonly logger = new Logger(DataSnapshotService.name);

  constructor(@Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService) {}

  /**
   * Export platform knowledge as NDJSON.
   *
   * Line 0: manifest (JSON object keyed "_manifest")
   * Lines 1..N: data records (JSON objects keyed "_index" + "_source")
   *
   * All searchDocuments calls are fired concurrently (all promises registered
   * before the first await) so callers inspecting mock.calls synchronously
   * see the full list of queried indices.
   */
  async exportToNdjson(commitSha: string): Promise<
    DataProcessResult<{
      ndjson: string;
      manifest: SnapshotManifest;
    }>
  > {
    if (!this.db) {
      return DataProcessResult.failure(
        'NO_DB',
        'DataSnapshotService: no database service available',
      );
    }

    // ── Fire all queries concurrently (registered synchronously before first await) ──
    const catAPromises = SCOPE_FILTERED_INDICES.map((idx) =>
      this.db!.searchDocuments(idx, SCOPE_FILTER_QUERY),
    );
    const catBPromises = GLOBAL_INDICES.map((idx) =>
      this.db!.searchDocuments(idx, MATCH_ALL_QUERY),
    );
    const catCPromises = MASTER_TENANT_INDICES.map((idx) =>
      this.db!.searchDocuments(idx, masterTenantQuery()),
    );

    // ── Await all concurrently ─────────────────────────────────────────────────
    const [catAResults, catBResults, catCResults] = await Promise.all([
      Promise.all(catAPromises),
      Promise.all(catBPromises),
      Promise.all(catCPromises),
    ]);

    const lines: string[] = [];
    const indexStats: IndexExportStats[] = [];

    // ── Category A: apply scope filter + in-memory guard ──────────────────────
    for (let i = 0; i < SCOPE_FILTERED_INDICES.length; i++) {
      const indexName = SCOPE_FILTERED_INDICES[i];
      const result = catAResults[i];
      if (!result || !result.isSuccess) {
        this.logger.warn(
          `DataSnapshotService: failed to read ${indexName} (cat A): ${result?.errorMessage}`,
        );
        indexStats.push({ name: indexName, category: 'A', count: 0 });
        continue;
      }
      const allDocs = Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [];
      const docs = allDocs.filter((d) => {
        const scope = d['knowledgeScope'] as string | undefined;
        return !scope || scope === 'MODULE' || scope === 'GLOBAL';
      });
      for (const doc of docs) {
        lines.push(JSON.stringify({ _index: indexName, _source: doc }));
      }
      this.logger.log(`DataSnapshotService: ${indexName} (cat A) → ${docs.length} records`);
      indexStats.push({ name: indexName, category: 'A', count: docs.length });
    }

    // ── Category B: all records (no filter) ───────────────────────────────────
    for (let i = 0; i < GLOBAL_INDICES.length; i++) {
      const indexName = GLOBAL_INDICES[i];
      const result = catBResults[i];
      if (!result || !result.isSuccess) {
        this.logger.warn(
          `DataSnapshotService: failed to read ${indexName} (cat B): ${result?.errorMessage}`,
        );
        indexStats.push({ name: indexName, category: 'B', count: 0 });
        continue;
      }
      const docs = Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [];
      for (const doc of docs) {
        lines.push(JSON.stringify({ _index: indexName, _source: doc }));
      }
      this.logger.log(`DataSnapshotService: ${indexName} (cat B) → ${docs.length} records`);
      indexStats.push({ name: indexName, category: 'B', count: docs.length });
    }

    // ── Category C: tenantId filter + in-memory guard ─────────────────────────
    for (let i = 0; i < MASTER_TENANT_INDICES.length; i++) {
      const indexName = MASTER_TENANT_INDICES[i];
      const result = catCResults[i];
      if (!result || !result.isSuccess) {
        this.logger.warn(
          `DataSnapshotService: failed to read ${indexName} (cat C): ${result?.errorMessage}`,
        );
        indexStats.push({ name: indexName, category: 'C', count: 0 });
        continue;
      }
      const allDocs = Array.isArray(result.data) ? (result.data as Record<string, unknown>[]) : [];
      const docs = allDocs.filter((d) => d['tenantId'] === MASTER_TENANT_ID);
      for (const doc of docs) {
        lines.push(JSON.stringify({ _index: indexName, _source: doc }));
      }
      this.logger.log(`DataSnapshotService: ${indexName} (cat C) → ${docs.length} records`);
      indexStats.push({ name: indexName, category: 'C', count: docs.length });
    }

    const catA = indexStats.filter((s) => s.category === 'A').reduce((n, s) => n + s.count, 0);
    const catB = indexStats.filter((s) => s.category === 'B').reduce((n, s) => n + s.count, 0);
    const catC = indexStats.filter((s) => s.category === 'C').reduce((n, s) => n + s.count, 0);

    const manifest: SnapshotManifest = {
      commitSha,
      exportedAt: new Date().toISOString(),
      indices: indexStats,
      totalRecords: lines.length,
    };

    this.logger.log(
      `DataSnapshotService: export complete — ${lines.length} records across ` +
        `${SCOPE_FILTERED_INDICES.length + GLOBAL_INDICES.length + MASTER_TENANT_INDICES.length} indices ` +
        `(A:${catA} B:${catB} C:${catC})`,
    );

    const ndjson = [JSON.stringify({ _manifest: manifest }), ...lines].join('\n');
    return DataProcessResult.success({ ndjson, manifest });
  }
}
