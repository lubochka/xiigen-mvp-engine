/**
 * FeatureRegistryScanner — FLOW-36 Phase A bootstrap
 *
 * Scans all task type records from xiigen-engine-contracts and creates FT records
 * in xiigen-feature-registry. Gives the engine a structured record of its own
 * capabilities, which FLOW-37 reads to reason about the engine's state.
 *
 * Phase A scope: scan-and-seed only. No AI generation. No topology.
 *
 * DNA-3: returns DataProcessResult<T>, never throws.
 * DNA-4: extends MicroserviceBase.
 * DNA-5: tenantId from ALS — never passed to fabric methods.
 * DNA-8: storeDocument before any emit.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
const CONTRACTS_INDEX = 'xiigen-engine-contracts';
const REGISTRY_INDEX = 'xiigen-feature-registry';

/**
 * Bootstrap-list task types: engine-internal by design, not porting candidates.
 * portingCandidate: false per D-36-5 (hardcoded — MACHINE, not tenant-tunable).
 */
const BOOTSTRAP_TASK_TYPE_IDS = new Set([
  'T536', // BootstrapOrchestrator
  'T539', // ImplementFamilyMetaLoop
  'T540', // FiveArbiterConsensusGate
  'T541', // RegressionImpactAnalyzer
]);

export interface ScanOptions {
  /** Written to each FT record document as the tenantId field.
   *  Use MASTER_TENANT_ID for engine-level records. */
  tenantId: string;
}

export interface ScanResult {
  ftRecordsCreated: number;
  ftRecordsSkipped: number;
}

@Injectable()
export class FeatureRegistryScanner {
  private readonly logger = new Logger(FeatureRegistryScanner.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Scan all task types from xiigen-engine-contracts and produce FT records.
   * Idempotent: existing ftId documents are overwritten (storeDocument semantics).
   */
  async scan(options: ScanOptions): Promise<DataProcessResult<ScanResult>> {
    try {
      const { tenantId } = options;

      // Read all task type records — DNA-2: searchDocuments with BuildSearchFilter
      const readResult = await this.db.searchDocuments(
        CONTRACTS_INDEX,
        {}, // empty filter = all records; BuildSearchFilter skips null/undefined fields
        1000, // reasonable upper bound for engine task types
      );

      if (!readResult.isSuccess) {
        return DataProcessResult.failure(
          'SCANNER_READ_FAILED',
          `Failed to read ${CONTRACTS_INDEX}: ${readResult.errorMessage ?? 'unknown'}`,
        );
      }

      const taskTypes = readResult.data ?? [];
      let created = 0;
      let skipped = 0;

      for (const record of taskTypes) {
        const taskTypeId = String(record['taskTypeId'] ?? record['id'] ?? '');
        if (!taskTypeId) {
          skipped++;
          continue;
        }

        const ftId = `FT-${taskTypeId}`;

        const portingCandidate = !BOOTSTRAP_TASK_TYPE_IDS.has(taskTypeId);
        const portingCandidateReason = portingCandidate
          ? 'Not on bootstrap-internal list — eligible for porting evaluation'
          : 'Bootstrap-internal task type (D-36-5) — porting not applicable';

        const ftRecord: Record<string, unknown> = {
          id: ftId,
          ftId,
          taskTypeId,
          flowId: String(record['flowId'] ?? ''),
          capabilityName: String(record['name'] ?? record['purpose'] ?? taskTypeId),
          archetype: String(record['archetype'] ?? ''),
          portingCandidate,
          portingCandidateReason,
          connectionType: 'FLOW_SCOPED', // engine-level record — not tenant-private
          tenantId,
          createdAt: new Date().toISOString(),
        };

        // DNA-8: storeDocument before any downstream operation
        const storeResult = await this.db.storeDocument(REGISTRY_INDEX, ftRecord, ftId);
        if (storeResult.isSuccess) {
          created++;
        } else {
          this.logger.warn(
            `FeatureRegistryScanner: failed to store ${ftId} for ${taskTypeId}: ${storeResult.errorMessage ?? 'unknown'}`,
          );
          skipped++;
        }
      }

      this.logger.log(
        `FeatureRegistryScanner: scan complete — created=${created} skipped=${skipped}`,
      );
      return DataProcessResult.success({ ftRecordsCreated: created, ftRecordsSkipped: skipped });
    } catch (err) {
      return DataProcessResult.failure(
        'SCANNER_ERROR',
        `FeatureRegistryScanner threw: ${String(err)}`,
      );
    }
  }
}
