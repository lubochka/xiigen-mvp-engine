/**
 * FlowLifecycleSeeder — seeds the flow-lifecycle index in two operations.
 *
 * Seed 1 — Retroactive (infra flows already complete):
 *   FLOW-25, FLOW-26, FLOW-27, FLOW-29, FLOW-30, FLOW-31, FLOW-33 → ACTIVE
 *
 * Seed 2 — Forward (user flows not yet generated):
 *   FLOW-01 through FLOW-24 + FLOW-34, FLOW-35, FLOW-36 → NOT_STARTED (27 total)
 *
 * D-VIS-4: Initial seeding only. Status updates happen via FlowLifecycleService.
 * DNA-3: All methods return DataProcessResult — never throw.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type { GenerationLoopDocumentStore } from './generation-loop-shared-interfaces';

const INFRA_FLOWS_ACTIVE = [
  'FLOW-25',
  'FLOW-26',
  'FLOW-27',
  'FLOW-29',
  'FLOW-30',
  'FLOW-31',
  'FLOW-33',
];

const USER_FLOWS_NOT_STARTED = [
  'FLOW-01',
  'FLOW-02',
  'FLOW-03',
  'FLOW-04',
  'FLOW-05',
  'FLOW-06',
  'FLOW-07',
  'FLOW-08',
  'FLOW-09',
  'FLOW-10',
  'FLOW-11',
  'FLOW-12',
  'FLOW-13',
  'FLOW-14',
  'FLOW-15',
  'FLOW-16',
  'FLOW-17',
  'FLOW-18',
  'FLOW-19',
  'FLOW-20',
  'FLOW-21',
  'FLOW-22',
  'FLOW-23',
  'FLOW-24',
  'FLOW-34',
  'FLOW-35',
  'FLOW-36',
];

/** Dependency graph for forward seed (NOT_STARTED flows). */
const DEPENDENCY_GRAPH: Record<string, { dependsOn: string[]; downstreamFlows: string[] }> = {
  'FLOW-01': { dependsOn: [], downstreamFlows: ['FLOW-02', 'FLOW-03', 'FLOW-04', 'FLOW-05'] },
  'FLOW-02': {
    dependsOn: ['FLOW-01'],
    downstreamFlows: ['FLOW-03', 'FLOW-04', 'FLOW-05', 'FLOW-07'],
  },
  'FLOW-03': { dependsOn: ['FLOW-02'], downstreamFlows: [] },
  'FLOW-04': { dependsOn: ['FLOW-02'], downstreamFlows: [] },
  'FLOW-05': { dependsOn: ['FLOW-02'], downstreamFlows: [] },
  'FLOW-06': { dependsOn: [], downstreamFlows: [] },
  'FLOW-07': { dependsOn: ['FLOW-02'], downstreamFlows: [] },
  'FLOW-08': { dependsOn: [], downstreamFlows: [] },
  'FLOW-09': { dependsOn: ['FLOW-05'], downstreamFlows: [] }, // CF-2 fix: FLOW-09 depends on FLOW-05
  'FLOW-10': { dependsOn: ['FLOW-05'], downstreamFlows: [] }, // CF-2 fix: FLOW-10 depends on FLOW-05
  'FLOW-11': { dependsOn: [], downstreamFlows: [] },
  'FLOW-12': { dependsOn: [], downstreamFlows: [] },
  'FLOW-13': { dependsOn: [], downstreamFlows: [] },
  'FLOW-14': { dependsOn: [], downstreamFlows: [] },
  'FLOW-15': { dependsOn: [], downstreamFlows: [] },
  'FLOW-16': { dependsOn: [], downstreamFlows: [] },
  'FLOW-17': { dependsOn: [], downstreamFlows: [] },
  'FLOW-18': { dependsOn: [], downstreamFlows: [] },
  'FLOW-19': { dependsOn: [], downstreamFlows: [] },
  'FLOW-20': { dependsOn: [], downstreamFlows: [] },
  'FLOW-21': { dependsOn: [], downstreamFlows: [] },
  'FLOW-22': { dependsOn: [], downstreamFlows: [] },
  'FLOW-23': { dependsOn: [], downstreamFlows: [] },
  'FLOW-24': { dependsOn: [], downstreamFlows: [] },
  'FLOW-34': { dependsOn: ['FLOW-36'], downstreamFlows: [] },
  'FLOW-35': { dependsOn: ['FLOW-33'], downstreamFlows: ['FLOW-36', 'FLOW-34'] },
  'FLOW-36': { dependsOn: ['FLOW-35'], downstreamFlows: ['FLOW-34'] },
};

export interface LifecycleSeedResult {
  seed1Count: number;
  seed2Count: number;
  totalSeeded: number;
  skipped: number;
}

export class FlowLifecycleSeeder {
  constructor(private readonly db: GenerationLoopDocumentStore) {}

  /**
   * Seed 1 — retroactive: 7 infra flows as ACTIVE.
   */
  async seedInfraFlows(
    tenantId: string,
  ): Promise<DataProcessResult<{ seeded: number; skipped: number }>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const now = new Date().toISOString();
    let seeded = 0;
    let skipped = 0;

    for (const flowId of INFRA_FLOWS_ACTIVE) {
      const key = `${tenantId}::${flowId}`;
      const existing = await this.db.searchDocuments('flow-lifecycle', { compositeKey: key });
      if (!existing.isSuccess)
        return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
      if (existing.data?.length) {
        skipped++;
        continue;
      }

      const record = {
        flowId,
        tenantId,
        status: 'ACTIVE',
        generationHistory: [],
        currentGeneration: {
          runId: 'seed-retroactive',
          status: 'ACTIVE',
          testMatrixResult: 'NOT_RUN',
        },
        dependsOn: [],
        downstreamFlows: [],
        featureIds: [],
        bundle_activations: [],
        createdAt: now,
        updatedAt: now,
        compositeKey: key,
      };

      const stored = await this.db.storeDocument(
        'flow-lifecycle',
        record as unknown as Record<string, unknown>,
        key,
      );
      if (!stored.isSuccess)
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      seeded++;
    }

    return DataProcessResult.success({ seeded, skipped });
  }

  /**
   * Seed 2 — forward: FLOW-01..24 + FLOW-34/35/36 as NOT_STARTED (27 total).
   */
  async seedUserFlows(
    tenantId: string,
  ): Promise<DataProcessResult<{ seeded: number; skipped: number }>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const now = new Date().toISOString();
    let seeded = 0;
    let skipped = 0;

    for (const flowId of USER_FLOWS_NOT_STARTED) {
      const key = `${tenantId}::${flowId}`;
      const existing = await this.db.searchDocuments('flow-lifecycle', { compositeKey: key });
      if (!existing.isSuccess)
        return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
      if (existing.data?.length) {
        skipped++;
        continue;
      }

      const deps = DEPENDENCY_GRAPH[flowId] ?? { dependsOn: [], downstreamFlows: [] };
      const record = {
        flowId,
        tenantId,
        status: 'NOT_STARTED',
        generationHistory: [],
        dependsOn: deps.dependsOn,
        downstreamFlows: deps.downstreamFlows,
        featureIds: [],
        bundle_activations: [],
        createdAt: now,
        updatedAt: now,
        compositeKey: key,
      };

      const stored = await this.db.storeDocument(
        'flow-lifecycle',
        record as unknown as Record<string, unknown>,
        key,
      );
      if (!stored.isSuccess)
        return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);
      seeded++;
    }

    return DataProcessResult.success({ seeded, skipped });
  }

  /**
   * Run both seed operations in sequence.
   */
  async seedAll(tenantId: string): Promise<DataProcessResult<LifecycleSeedResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    const seed1 = await this.seedInfraFlows(tenantId);
    if (!seed1.isSuccess) return DataProcessResult.failure(seed1.errorCode!, seed1.errorMessage!);

    const seed2 = await this.seedUserFlows(tenantId);
    if (!seed2.isSuccess) return DataProcessResult.failure(seed2.errorCode!, seed2.errorMessage!);

    return DataProcessResult.success({
      seed1Count: seed1.data!.seeded,
      seed2Count: seed2.data!.seeded,
      totalSeeded: seed1.data!.seeded + seed2.data!.seeded,
      skipped: seed1.data!.skipped + seed2.data!.skipped,
    });
  }

  /** Exported for tests. */
  static get INFRA_FLOWS(): readonly string[] {
    return INFRA_FLOWS_ACTIVE;
  }
  static get USER_FLOWS(): readonly string[] {
    return USER_FLOWS_NOT_STARTED;
  }
}
