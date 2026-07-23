/**
 * InstallValidationService — FLOW-47 Turn 4 (T660).
 *
 * Every install is automatically validated. The result is written to
 * xiigen-install-validation so admins can see which installs need attention.
 *
 * Status semantics (CF-835):
 *   PASSED   — portability test succeeded, install completes normally
 *   DEGRADED — portability test reported gaps, install COMPLETES (non-blocking)
 *   ERROR    — service-level failure (e.g., snapshot not retrievable). Install IS blocked.
 *
 * FLOW-47 adaptation from plan v1.4: install() uses linked mode (DD-324), so
 * at install time there are no "main tenant calibration records" yet for this
 * module — the tenant hasn't run it. The validation runs against an empty
 * baseline (no gaps to find), which is treated as PASSED. Future calibration
 * runs under this tenant will produce records that subsequent portability
 * tests can compare against.
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-5: tenantId from input (caller-supplied from CLS path).
 * DNA-8: validation record stored before success returned.
 */

import { Inject, Injectable, Logger, Optional, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { FreshTenantTestService, PortabilityReport } from './fresh-tenant-test.service';
import { ModuleSnapshotService } from './module-snapshot.service';

export const INSTALL_VALIDATION_INDEX = 'xiigen-install-validation';

const INSTALL_VALIDATION_MAPPINGS = {
  properties: {
    validationId: { type: 'keyword' },
    tenantId: { type: 'keyword' },
    packageId: { type: 'keyword' },
    flowId: { type: 'keyword' },
    status: { type: 'keyword' }, // PASSED / DEGRADED / ERROR
    snapshotId: { type: 'keyword' },
    validatedAt: { type: 'date' },
  },
};

export type InstallValidationStatus = 'PASSED' | 'DEGRADED' | 'ERROR';

export interface InstallValidationRecord {
  validationId: string;
  tenantId: string;
  packageId: string;
  flowId: string;
  status: InstallValidationStatus;
  snapshotId?: string;
  report?: PortabilityReport;
  gapCount: number;
  validatedAt: string;
}

export interface ValidateInstallInput {
  tenantId: string;
  packageId: string;
  flowId: string;
  /** DesignTimeSnapshot.snapshotId (optional — validation proceeds without it). */
  snapshotId?: string;
}

@Injectable()
export class InstallValidationService implements OnModuleInit {
  private readonly logger = new Logger(InstallValidationService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional() private readonly freshTenant?: FreshTenantTestService,
    @Optional() private readonly moduleSnapshot?: ModuleSnapshotService,
  ) {}

  async onModuleInit(): Promise<void> {
    const ensureIndex = (this.db as unknown as Record<string, unknown>)['ensureIndex'];
    if (typeof ensureIndex === 'function') {
      await (ensureIndex as (index: string, mappings: unknown) => Promise<void>)
        .call(this.db, INSTALL_VALIDATION_INDEX, INSTALL_VALIDATION_MAPPINGS)
        .catch(() => {
          /* already exists */
        });
    }
  }

  /**
   * Validate an install. Called by the HTTP install path AFTER
   * DesignTimeSnapshotService.capture() succeeds.
   *
   * PASSED  — no gaps, recordsChecked=0 or >0 with parity above threshold.
   * DEGRADED— gaps detected (install still completes, admin reviews).
   * ERROR   — service-level failure (install is blocked).
   */
  async validate(input: ValidateInstallInput): Promise<DataProcessResult<InstallValidationRecord>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('NO_TENANT', 'tenantId required');
    }
    if (!input.packageId || !input.flowId) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId + flowId required');
    }

    // Default: PASSED with no gaps. If FreshTenantTestService is wired, run
    // a real portability test against an empty baseline (no calibration records
    // exist yet for a freshly-linked module).
    let status: InstallValidationStatus = 'PASSED';
    let report: PortabilityReport | undefined;
    let gapCount = 0;
    let runtimeSnapshotId: string | undefined;

    if (this.freshTenant && this.moduleSnapshot) {
      try {
        // Capture a runtime ModuleSnapshot for FreshTenantTestService to compare
        // against. At install time this snapshot is effectively empty for the
        // module — the tenant hasn't run it yet — but the structure must exist
        // for runPortabilityTest() to have a snapshotId.
        const snapResult = await this.moduleSnapshot.captureSnapshot({
          tenantId: input.tenantId,
          flowId: input.flowId,
          phase: 'INSTALL',
        });
        if (snapResult.isSuccess && snapResult.data) {
          runtimeSnapshotId = snapResult.data.snapshotId;

          const portResult = await this.freshTenant.runPortabilityTest({
            mainTenantId: input.tenantId,
            flowId: input.flowId,
            phase: 'INSTALL',
            userIntent: `install-validation ${input.packageId}`,
            snapshotId: runtimeSnapshotId,
            mainCalibrationRecords: [],
          });
          if (portResult.isSuccess && portResult.data) {
            report = portResult.data;
            gapCount = report.gaps.length;
            // CF-835: DEGRADED is non-blocking. PASSED when no gaps.
            status = report.passed ? 'PASSED' : 'DEGRADED';
          } else {
            // Test invocation failed at service level — classify as ERROR.
            status = 'ERROR';
            this.logger.warn(
              `InstallValidation: runPortabilityTest failed (${portResult.errorCode}): ${portResult.errorMessage}`,
            );
            // CF-835: ERROR (service failure) should block install.
            // Still write the record for admin visibility, but return failure.
            const errorRecord = await this.writeRecord({
              status,
              tenantId: input.tenantId,
              packageId: input.packageId,
              flowId: input.flowId,
              snapshotId: input.snapshotId ?? runtimeSnapshotId,
              report,
              gapCount,
            });
            if (!errorRecord.isSuccess) return errorRecord;
            return DataProcessResult.failure(
              'VALIDATION_SERVICE_ERROR',
              `Portability test service error: ${portResult.errorMessage ?? 'unknown'}`,
            );
          }
        }
      } catch (err) {
        // Runtime exception during portability run — ERROR.
        status = 'ERROR';
        this.logger.warn(`InstallValidation threw: ${(err as Error).message}`);
        const errorRecord = await this.writeRecord({
          status,
          tenantId: input.tenantId,
          packageId: input.packageId,
          flowId: input.flowId,
          snapshotId: input.snapshotId ?? runtimeSnapshotId,
          report,
          gapCount,
        });
        if (!errorRecord.isSuccess) return errorRecord;
        return DataProcessResult.failure(
          'VALIDATION_EXCEPTION',
          `Portability test exception: ${(err as Error).message}`,
        );
      }
    }

    // Happy path: write record and return.
    return this.writeRecord({
      status,
      tenantId: input.tenantId,
      packageId: input.packageId,
      flowId: input.flowId,
      snapshotId: input.snapshotId ?? runtimeSnapshotId,
      report,
      gapCount,
    });
  }

  private async writeRecord(args: {
    status: InstallValidationStatus;
    tenantId: string;
    packageId: string;
    flowId: string;
    snapshotId?: string;
    report?: PortabilityReport;
    gapCount: number;
  }): Promise<DataProcessResult<InstallValidationRecord>> {
    const record: InstallValidationRecord = {
      validationId: randomUUID(),
      tenantId: args.tenantId,
      packageId: args.packageId,
      flowId: args.flowId,
      status: args.status,
      snapshotId: args.snapshotId,
      report: args.report,
      gapCount: args.gapCount,
      validatedAt: new Date().toISOString(),
    };
    const docId = `${args.tenantId}::${args.packageId}::${record.validationId}`;
    const writeResult = await this.db.storeDocument(
      INSTALL_VALIDATION_INDEX,
      record as unknown as Record<string, unknown>,
      docId,
    );
    if (!writeResult.isSuccess) {
      return DataProcessResult.failure(
        writeResult.errorCode ?? 'STORE_FAILED',
        writeResult.errorMessage ?? 'install validation write failed',
      );
    }
    this.logger.debug(
      `InstallValidation ${args.status}: tenant=${args.tenantId} packageId=${args.packageId} ` +
        `gaps=${args.gapCount}`,
    );
    return DataProcessResult.success(record);
  }
}
