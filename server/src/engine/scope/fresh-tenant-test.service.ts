/**
 * FreshTenantTestService — portability validation for MODULE-scope outputs.
 *
 * Steps per run:
 *   1. Provision ephemeral tenant (ephemeral-${uuid})
 *   2. Import snapshot: copy RAG patterns into ephemeral namespace
 *   3. Re-run CalibrationRunner under ephemeral tenant CLS context
 *   4. Grade parity per (station, depth): fresh_grade / main_grade
 *   5. Classify gaps: A (RAG), B (graph), C (prompt), UNKNOWN
 *   6. Deprovision ephemeral tenant (Phase 0: log only; Phase 1: delete records)
 *   7. Return PortabilityReport
 *
 * Mode = DEVELOPMENT: threshold = 0.90, gate is soft (never blocking).
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-5: CLS context switched per ephemeral run, restored after.
 * CF-PORT-DEV-01: DEV_THRESHOLD hardcoded; Phase 1 reads from FREEDOM config.
 * CF-PORT-DEV-02: Deprovision is a log stub in Phase 0; real deletion in Phase 1.
 */

import { Injectable, Inject, Logger, Optional, forwardRef } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { ModuleSnapshotService, ModuleSnapshot } from './module-snapshot.service';
import { CalibrationRunner, CalibrationInput } from '../calibration/calibration-runner.service';
import {
  IFreedomConfigService,
  FREEDOM_CONFIG_SERVICE,
} from '../../freedom/freedom-config.interface';

export interface PortabilityGap {
  station: string;
  depth: number;
  mainGrade: number;
  freshGrade: number;
  parity: number;
  gapClass: 'A' | 'B' | 'C' | 'UNKNOWN';
}

export interface PortabilityReport {
  flowId: string;
  phase: string;
  snapshotId: string;
  mainTenantId: string;
  ephemeralTenantId: string;
  threshold: number;
  passed: boolean;
  gaps: PortabilityGap[];
  recordsChecked: number;
  capturedAt: string;
}

export interface FreshTenantTestInput {
  mainTenantId: string;
  flowId: string;
  phase: string;
  userIntent: string;
  snapshotId: string;
  mainCalibrationRecords: Array<{ station: string; depth: number; grade: number }>;
}

@Injectable()
export class FreshTenantTestService {
  private readonly logger = new Logger(FreshTenantTestService.name);
  // Fallback — overridden by FREEDOM config portability.config { threshold: { dev } }
  private readonly DEFAULT_DEV_THRESHOLD = 0.9;

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly cls: ClsService,
    private readonly moduleSnapshot: ModuleSnapshotService,
    @Inject(forwardRef(() => CalibrationRunner))
    private readonly calibrationRunner: CalibrationRunner,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig?: IFreedomConfigService,
  ) {}

  /** Read portability config from FREEDOM. Falls back to defaults. */
  private async readPortabilityConfig(): Promise<{ threshold: number; blocking: boolean }> {
    try {
      const cfg = await this.freedomConfig?.get('portability.config');
      const thresholdCfg = cfg?.['threshold'] as Record<string, unknown> | undefined;
      const threshold =
        typeof thresholdCfg?.['dev'] === 'number'
          ? (thresholdCfg['dev'] as number)
          : this.DEFAULT_DEV_THRESHOLD;
      const gateCfg = cfg?.['gate'] as Record<string, unknown> | undefined;
      const blocking = gateCfg?.['blocking'] === true;
      return { threshold, blocking };
    } catch {
      return { threshold: this.DEFAULT_DEV_THRESHOLD, blocking: false };
    }
  }

  async runPortabilityTest(
    input: FreshTenantTestInput,
  ): Promise<DataProcessResult<PortabilityReport>> {
    try {
      // 1. Retrieve snapshot
      const snapshotResult = await this.moduleSnapshot.getSnapshot(input.snapshotId);
      if (!snapshotResult.isSuccess) {
        return DataProcessResult.failure('SNAPSHOT_NOT_FOUND', snapshotResult.errorMessage ?? '');
      }
      const snapshot = snapshotResult.data!;

      const ephemeralTenantId = `ephemeral-${randomUUID()}`;

      // Read threshold from FREEDOM config
      const portConfig = await this.readPortabilityConfig();
      const threshold = portConfig.threshold;

      // 2. Import snapshot into ephemeral namespace (best-effort)
      await this.importSnapshot(snapshot, ephemeralTenantId);

      // 3. Re-run calibration under ephemeral CLS context
      const freshRecords = await this.runUnderEphemeralTenant(ephemeralTenantId, input);

      // 4. Grade parity per (station, depth)
      const gaps: PortabilityGap[] = [];
      for (const main of input.mainCalibrationRecords) {
        const fresh = freshRecords.find(
          (f) => f.station === main.station && f.depth === main.depth,
        );
        const freshGrade = fresh?.grade ?? 0;
        const parity = main.grade > 0 ? freshGrade / main.grade : freshGrade > 0 ? 1 : 0;
        if (parity < threshold) {
          gaps.push({
            station: main.station,
            depth: main.depth,
            mainGrade: main.grade,
            freshGrade,
            parity,
            gapClass: this.classifyGap(parity),
          });
        }
      }

      // 5. Deprovision ephemeral tenant (real deletion)
      await this.deprovisionEphemeral(ephemeralTenantId);

      const report: PortabilityReport = {
        flowId: input.flowId,
        phase: input.phase,
        snapshotId: input.snapshotId,
        mainTenantId: input.mainTenantId,
        ephemeralTenantId,
        threshold,
        passed: gaps.length === 0,
        gaps,
        recordsChecked: input.mainCalibrationRecords.length,
        capturedAt: new Date().toISOString(),
      };

      return DataProcessResult.success(report);
    } catch (err) {
      return DataProcessResult.failure('PORTABILITY_TEST_FAILED', String(err));
    }
  }

  /** Phase 0 gap classification by parity alone. */
  private classifyGap(parity: number): PortabilityGap['gapClass'] {
    if (parity < 0.7) return 'A'; // RAG dependency not captured
    if (parity < 0.86) return 'B'; // graph or prompt dependency
    return 'UNKNOWN';
  }

  /** Write marker records into ephemeral namespace from snapshot. */
  private async importSnapshot(snapshot: ModuleSnapshot, ephemeralTenantId: string): Promise<void> {
    try {
      await this.db.storeDocument(
        'xiigen-rag-patterns',
        {
          namespace: `ephemeral::${ephemeralTenantId}`,
          tenantId: ephemeralTenantId,
          sourceSnapshotId: snapshot.snapshotId,
          knowledgeScope: 'PRIVATE',
          ownerId: ephemeralTenantId,
          createdAt: new Date().toISOString(),
        },
        `ephemeral-import::${ephemeralTenantId}::${snapshot.snapshotId}`,
      );
    } catch {
      this.logger.warn(`FreshTenantTestService: snapshot import partial for ${ephemeralTenantId}`);
    }
  }

  /** Run CalibrationRunner under ephemeral CLS context. */
  private async runUnderEphemeralTenant(
    ephemeralTenantId: string,
    input: FreshTenantTestInput,
  ): Promise<Array<{ station: string; depth: number; grade: number }>> {
    try {
      const calInput: CalibrationInput = {
        flowId: input.flowId,
        userIntent: input.userIntent,
        phase: input.phase,
      };

      // Switch CLS context to ephemeral tenant
      return await this.cls.runWith(
        { [TENANT_CONTEXT_KEY]: { tenantId: ephemeralTenantId } } as Record<
          string | symbol,
          unknown
        >,
        async () => {
          const result = await this.calibrationRunner.runForFlow(calInput);
          if (!result.isSuccess) return [];
          // Extract station/depth/grade from stored records via snapshot query
          const stored = await this.db.searchDocuments('xiigen-calibration-baseline', {
            tenantId: ephemeralTenantId,
            phase: input.phase,
          });
          if (!stored.isSuccess) return [];
          return (stored.data as Array<{ station?: string; depth?: number; grade?: number }>)
            .filter((r) => r.station && typeof r.depth === 'number' && typeof r.grade === 'number')
            .map((r) => ({ station: r.station!, depth: r.depth!, grade: r.grade! }));
        },
      );
    } catch (err) {
      this.logger.warn(`FreshTenantTestService: ephemeral run failed — ${String(err)}`);
      return [];
    }
  }

  /**
   * Deprovision ephemeral tenant — delete all records written during the test run.
   * Queries each learning index for records with tenantId = ephemeralTenantId,
   * then deletes each by _id. Best-effort: failures logged, never throws.
   */
  private async deprovisionEphemeral(ephemeralTenantId: string): Promise<void> {
    const indices = [
      'xiigen-calibration-baseline',
      'xiigen-oss-curriculum-runs',
      'xiigen-rag-patterns',
    ];
    let deleted = 0;
    for (const index of indices) {
      try {
        const result = await this.db.searchDocuments(index, { tenantId: ephemeralTenantId });
        if (!result.isSuccess) continue;
        const records = result.data as Array<Record<string, unknown>>;
        for (const record of records) {
          const id = String(record['_id'] ?? '');
          if (!id) continue;
          await this.db.deleteDocument(index, id).catch(() => {
            /* best-effort */
          });
          deleted++;
        }
      } catch {
        this.logger.warn(`FreshTenantTestService: deprovision partial for index ${index}`);
      }
    }
    this.logger.log(
      `FreshTenantTestService: deprovisioned ${ephemeralTenantId} — ${deleted} records deleted`,
    );
  }
}
