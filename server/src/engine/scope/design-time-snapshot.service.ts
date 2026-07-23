/**
 * DesignTimeSnapshotService — FLOW-47 Turn 3 (T659).
 *
 * Captures a version-frozen record of the design artifacts that were live at
 * install time: patternIds (refs to xiigen-rag-patterns), arbiterConfigIds
 * (refs to xiigen-arbiter-configs), and iron rules embedded inline.
 *
 * This snapshot is DIFFERENT from the runtime ModuleSnapshot (xiigen-module-library):
 *   - ModuleSnapshot captures calibration/OSS runs/graph edges (runtime learning)
 *   - DesignTimeSnapshot captures DESIGN artifacts at install time (AD-1 resolution)
 *
 * FLOW-47 adaptation from plan v1.4: install() now uses linked mode (DD-324),
 * so the snapshot is keyed by (tenantId, packageId) — there is no installedFlowId
 * since topology is not copied into the tenant.
 *
 * Iron rules:
 *   CF-833: ironRules embedded inline in the snapshot (offline enforcement).
 *   CF-834: snapshot WRITTEN before install() returns (DNA-8 ordering).
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-5: tenantId from input (caller-supplied) — the service is invoked in the
 *        HTTP install path which has already read tenantId from CLS.
 * DNA-8: storeDocument succeeds before success returned.
 */

import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import type { IronRule } from '../marketplace-package.service';

export const DESIGN_SNAPSHOTS_INDEX = 'xiigen-design-snapshots';

const DESIGN_SNAPSHOTS_MAPPINGS = {
  properties: {
    snapshotId: { type: 'keyword' },
    tenantId: { type: 'keyword' },
    packageId: { type: 'keyword' },
    packageVersion: { type: 'keyword' },
    flowId: { type: 'keyword' },
    installedAt: { type: 'date' },
  },
};

export interface DesignTimeSnapshot {
  snapshotId: string; // UUID
  tenantId: string; // from install-path CLS (DNA-5)
  packageId: string; // the source marketplace package
  packageVersion: string; // version at install time
  flowId: string; // sourceFlowId of the package
  patternIds: string[]; // frozen ref to xiigen-rag-patterns records
  arbiterConfigIds: string[]; // frozen ref to xiigen-arbiter-configs records
  ironRules: IronRule[]; // embedded inline (CF-833)
  installedAt: string; // ISO timestamp
}

export interface CaptureDesignTimeSnapshotInput {
  tenantId: string;
  packageId: string;
  packageVersion: string;
  flowId: string;
  patternIds: string[];
  ironRules: IronRule[];
  arbiterConfigIds: string[];
}

@Injectable()
export class DesignTimeSnapshotService implements OnModuleInit {
  private readonly logger = new Logger(DesignTimeSnapshotService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async onModuleInit(): Promise<void> {
    const ensureIndex = (this.db as unknown as Record<string, unknown>)['ensureIndex'];
    if (typeof ensureIndex === 'function') {
      await (ensureIndex as (index: string, mappings: unknown) => Promise<void>)
        .call(this.db, DESIGN_SNAPSHOTS_INDEX, DESIGN_SNAPSHOTS_MAPPINGS)
        .catch(() => {
          /* already exists */
        });
    }
  }

  /**
   * Capture a design-time snapshot. Called by the install path AFTER
   * moduleRegistry.registerInstall() succeeds and BEFORE the install response
   * is returned (CF-834).
   *
   * Idempotent: the docId is `${tenantId}::${packageId}` — re-invocation with
   * the same pair overwrites the prior snapshot rather than creating a
   * duplicate. This matches the linked-mode registry pattern.
   */
  async capture(
    input: CaptureDesignTimeSnapshotInput,
  ): Promise<DataProcessResult<DesignTimeSnapshot>> {
    if (!input.tenantId) {
      return DataProcessResult.failure('NO_TENANT', 'tenantId required');
    }
    if (!input.packageId) {
      return DataProcessResult.failure('INVALID_INPUT', 'packageId required');
    }

    const snapshot: DesignTimeSnapshot = {
      snapshotId: randomUUID(),
      tenantId: input.tenantId,
      packageId: input.packageId,
      packageVersion: input.packageVersion || 'v1',
      flowId: input.flowId,
      patternIds: [...(input.patternIds ?? [])],
      arbiterConfigIds: [...(input.arbiterConfigIds ?? [])],
      ironRules: (input.ironRules ?? []).map((r) => ({ ...r })), // version-freeze inline
      installedAt: new Date().toISOString(),
    };

    const docId = `${input.tenantId}::${input.packageId}`;
    const result = await this.db.storeDocument(
      DESIGN_SNAPSHOTS_INDEX,
      snapshot as unknown as Record<string, unknown>,
      docId,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'STORE_FAILED',
        result.errorMessage ?? 'capture failed',
      );
    }
    this.logger.debug(
      `DesignTimeSnapshot captured: tenant=${input.tenantId} packageId=${input.packageId} ` +
        `patterns=${snapshot.patternIds.length} arbiters=${snapshot.arbiterConfigIds.length} ` +
        `ironRules=${snapshot.ironRules.length}`,
    );
    return DataProcessResult.success(snapshot);
  }

  /** Retrieve by (tenantId, packageId). */
  async getByTenantAndPackage(
    tenantId: string,
    packageId: string,
  ): Promise<DataProcessResult<DesignTimeSnapshot | null>> {
    if (!tenantId || !packageId) {
      return DataProcessResult.failure('INVALID_INPUT', 'tenantId and packageId required');
    }
    const result = await this.db.getDocument(DESIGN_SNAPSHOTS_INDEX, `${tenantId}::${packageId}`);
    if (!result.isSuccess) {
      return DataProcessResult.failure(
        result.errorCode ?? 'FETCH_FAILED',
        result.errorMessage ?? 'fetch failed',
      );
    }
    return DataProcessResult.success((result.data as unknown as DesignTimeSnapshot | null) ?? null);
  }
}
