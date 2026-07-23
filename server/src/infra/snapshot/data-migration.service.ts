/**
 * DataMigrationService — imports XIIGen platform knowledge from an NDJSON snapshot.
 *
 * Two call sites:
 *
 * 1. Deployment (Fargate migration task, before ECS server starts):
 *    Imports the full three-category snapshot (Categories A + B + C).
 *    Idempotent — storeDocument upserts existing records.
 *
 * 2. Portability test (FreshTenantTestService Step 7):
 *    Imports the module snapshot (5 data types by runId/station/depth).
 *    Also imports master tenant FREEDOM config (Category C — xiigen-config)
 *    so the ephemeral tenant uses the same thresholds as the main tenant.
 *    Does NOT import graduation state — ephemeral tenant starts clean.
 *
 * The same importFromNdjson() method handles both — it does not filter or
 * interpret scope; callers control what NDJSON they pass in.
 *
 * DNA-3: never throws. Returns DataProcessResult.
 * DNA-8: all writes confirmed before returning success.
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { SnapshotManifest } from './data-snapshot.service';

export interface MigrationResult {
  importedRecords: number;
  skippedRecords: number;
  errors: string[];
  durationMs: number;
  manifest: SnapshotManifest | null;
}

@Injectable()
export class DataMigrationService {
  private readonly logger = new Logger(DataMigrationService.name);

  constructor(@Optional() @Inject(DATABASE_SERVICE) private readonly db?: IDatabaseService) {}

  /**
   * Import platform knowledge from an NDJSON string.
   *
   * Expected format (produced by DataSnapshotService.exportToNdjson):
   *   Line 0: { "_manifest": { commitSha, exportedAt, indices, totalRecords } }
   *   Lines 1..N: { "_index": "<name>", "_source": { ...doc } }
   *
   * storeDocument is called for every data line — upserts by document id if present.
   * Manifest line is parsed and logged, not stored.
   *
   * DNA-8: all writes happen before method returns.
   */
  async importFromNdjson(ndjson: string): Promise<DataProcessResult<MigrationResult>> {
    if (!this.db) {
      return DataProcessResult.failure(
        'NO_DB',
        'DataMigrationService: no database service available',
      );
    }

    const startMs = Date.now();
    const lines = ndjson.split('\n').filter((l) => l.trim());

    if (lines.length === 0) {
      return DataProcessResult.failure('EMPTY_SNAPSHOT', 'DataMigrationService: snapshot is empty');
    }

    let manifest: SnapshotManifest | null = null;
    let importedRecords = 0;
    let skippedRecords = 0;
    const errors: string[] = [];

    for (const line of lines) {
      try {
        const parsed = JSON.parse(line) as Record<string, unknown>;

        // Line 0: manifest — log and continue, do not store
        if (parsed['_manifest']) {
          manifest = parsed['_manifest'] as SnapshotManifest;
          this.logger.log(
            `DataMigrationService: importing snapshot ${manifest.commitSha} ` +
              `(${manifest.totalRecords} records exported at ${manifest.exportedAt})`,
          );
          continue;
        }

        const indexName = parsed['_index'] as string | undefined;
        const source = parsed['_source'] as Record<string, unknown> | undefined;

        if (!indexName || !source) {
          skippedRecords++;
          errors.push(`malformed line: missing _index or _source`);
          continue;
        }

        // Use document ID from source if available; otherwise let DB generate one
        const docId = typeof source['id'] === 'string' ? source['id'] : undefined;

        // DNA-8: confirm each write before advancing
        const result = await this.db.storeDocument(indexName, source, docId);
        if (result.isSuccess) {
          importedRecords++;
        } else {
          errors.push(`${indexName}: ${result.errorMessage ?? 'store failed'}`);
          skippedRecords++;
        }
      } catch (err) {
        errors.push(`parse error: ${String(err)}`);
        skippedRecords++;
      }
    }

    const durationMs = Date.now() - startMs;
    this.logger.log(
      `DataMigrationService: import complete — ${importedRecords} imported, ` +
        `${skippedRecords} skipped, ${errors.length} errors in ${durationMs}ms`,
    );

    if (errors.length > 0) {
      this.logger.warn(`DataMigrationService: errors (first 5): ${errors.slice(0, 5).join('; ')}`);
    }

    return DataProcessResult.success({
      importedRecords,
      skippedRecords,
      errors,
      durationMs,
      manifest,
    });
  }
}
