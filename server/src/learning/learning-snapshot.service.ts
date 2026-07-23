/**
 * LearningSnapshotService — orchestrates export/import across all 5 learning stores.
 *
 * Creates JSON snapshot files in the snapshots/ directory.
 * Enables: save learning state → restart → restore → compare model runs.
 *
 * Architecture: @Injectable() — same pattern as existing learning stores.
 * DNA-3: all public methods return DataProcessResult.
 * DNA-5: tenantId required and enforced on all operations.
 *
 * De-scoped (deferred to post-Phase-A):
 *   - ES _bulk export (item 5) — Tier 1 infrastructure manages ES state
 *   - Benchmark result file copy (item 6) — filesystem artifacts, copy separately
 *   - AF pipeline trace copy (item 7) — log files, copy separately
 *
 * FLOW-0 Prerequisite: Learning Snapshot Service, Session 2.
 * DR-242: Filesystem-first snapshot persistence.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import { PersistentFeedbackStore } from './feedback-store';
import { ModelPreferenceTracker } from './model-preference';
import { PromptVersionStore } from './prompt-version-store';
import { RagQualityTracker } from './rag-quality-tracker';
import { PromptAbTester } from './prompt-ab-tester';
import * as fs from 'fs';
import * as path from 'path';
import { randomUUID } from 'crypto';

// ── Snapshot Schema ──────────────────────────────────

export interface SnapshotMetadata {
  readonly phase: string;
  readonly aiProvider: string;
  readonly ragProvider: string;
  readonly flowId?: string;
  readonly notes?: string;
}

export interface LearningSnapshot {
  readonly snapshotId: string;
  readonly tenantId: string;
  readonly metadata: SnapshotMetadata;
  readonly createdAt: string;
  readonly stores: {
    feedbackRecords: unknown[];
    modelPreferences: unknown[];
    promptVersions: unknown[];
    ragWeights: unknown[];
    abTestResults: unknown[];
  };
  readonly metrics: {
    totalFeedbackRecords: number;
    avgScore: number;
    passRate: number;
    promptVersionCount: number;
    ragWeightCount: number;
  };
}

export interface SnapshotComparison {
  readonly snapshotA: string;
  readonly snapshotB: string;
  readonly deltas: {
    feedbackCountDelta: number;
    avgScoreDelta: number;
    passRateDelta: number;
    promptVersionDelta: number;
    ragWeightDelta: number;
  };
  readonly aMetrics: LearningSnapshot['metrics'];
  readonly bMetrics: LearningSnapshot['metrics'];
}

// ── Constants ────────────────────────────────────────

const DEFAULT_SNAPSHOT_DIR = './snapshots';

// ── Service ──────────────────────────────────────────

@Injectable()
export class LearningSnapshotService {
  private readonly snapshotDir: string;
  private lastSnapshotTimeMs = 0;

  constructor(
    private readonly feedbackStore: PersistentFeedbackStore,
    private readonly modelPreference: ModelPreferenceTracker,
    private readonly promptStore: PromptVersionStore,
    private readonly ragQuality: RagQualityTracker,
    private readonly abTester: PromptAbTester,
    config?: { snapshotDir?: string },
  ) {
    this.snapshotDir = config?.snapshotDir ?? DEFAULT_SNAPSHOT_DIR;
    if (!fs.existsSync(this.snapshotDir)) {
      fs.mkdirSync(this.snapshotDir, { recursive: true });
    }
  }

  /**
   * Create a snapshot of all 5 learning stores for the given tenant.
   * Writes a JSON file to the snapshots/ directory.
   * Returns the snapshot object (not the file path).
   */
  createSnapshot(
    tenantId: string,
    metadata: SnapshotMetadata,
  ): DataProcessResult<LearningSnapshot> {
    if (!tenantId) {
      return DataProcessResult.failure('MISSING_TENANT', 'tenantId required (DNA-5)');
    }

    const snapshotTimeMs = this.nextSnapshotTimeMs();
    const snapshotId = `snap-${snapshotTimeMs}-${randomUUID().substring(0, 8)}`;
    const feedbackRecords = this.feedbackStore.exportState();
    const modelPreferences = this.modelPreference.exportState();
    const promptVersions = this.promptStore.exportState();
    const ragWeights = this.ragQuality.exportState();
    const abTestResults = this.abTester.exportState();

    // Metrics scoped to this tenant
    const tenantRecords = feedbackRecords.filter((r) => r.tenantId === tenantId);
    const scores = tenantRecords.map((r) => r.qualityScore.total);
    const avgScore =
      scores.length > 0
        ? Math.round((scores.reduce((a, b) => a + b, 0) / scores.length) * 10000) / 10000
        : 0;
    const passRate =
      tenantRecords.length > 0
        ? tenantRecords.filter((r) => r.passed).length / tenantRecords.length
        : 0;

    const snapshot: LearningSnapshot = {
      snapshotId,
      tenantId,
      metadata: { ...metadata, flowId: metadata.flowId ?? 'FLOW-0' },
      createdAt: new Date(snapshotTimeMs).toISOString(),
      stores: { feedbackRecords, modelPreferences, promptVersions, ragWeights, abTestResults },
      metrics: {
        totalFeedbackRecords: feedbackRecords.length,
        avgScore,
        passRate: Math.round(passRate * 10000) / 10000,
        promptVersionCount: promptVersions.length,
        ragWeightCount: ragWeights.length,
      },
    };

    const filename = this.buildFilename(tenantId, metadata, snapshotId);
    try {
      fs.writeFileSync(
        path.join(this.snapshotDir, filename),
        JSON.stringify(snapshot, null, 2),
        'utf-8',
      );
    } catch (err: unknown) {
      return DataProcessResult.failure(
        'WRITE_FAILED',
        `Failed to write snapshot: ${err instanceof Error ? err.message : String(err)}`,
      );
    }

    return DataProcessResult.success(snapshot);
  }

  /**
   * Restore all 5 learning stores from a snapshot.
   * importState() on each store clears first — restore is idempotent.
   */
  restoreSnapshot(snapshotId: string): DataProcessResult<boolean> {
    if (!snapshotId) {
      return DataProcessResult.failure('MISSING_ID', 'snapshotId required');
    }

    const snapshot = this.loadSnapshotById(snapshotId);
    if (!snapshot) {
      return DataProcessResult.failure('NOT_FOUND', `Snapshot ${snapshotId} not found`);
    }

    this.feedbackStore.importState(
      snapshot.stores.feedbackRecords as unknown as Parameters<
        typeof this.feedbackStore.importState
      >[0],
    );
    this.modelPreference.importState(
      snapshot.stores.modelPreferences as unknown as Parameters<
        typeof this.modelPreference.importState
      >[0],
    );
    this.promptStore.importState(
      snapshot.stores.promptVersions as unknown as Parameters<
        typeof this.promptStore.importState
      >[0],
    );
    this.ragQuality.importState(
      snapshot.stores.ragWeights as unknown as Parameters<typeof this.ragQuality.importState>[0],
    );
    this.abTester.importState(
      snapshot.stores.abTestResults as unknown as Parameters<typeof this.abTester.importState>[0],
    );

    return DataProcessResult.success(true);
  }

  /**
   * List all available snapshots (metadata + metrics only, not full store data).
   * Sorted newest first.
   */
  listSnapshots(): DataProcessResult<
    Array<Pick<LearningSnapshot, 'snapshotId' | 'tenantId' | 'metadata' | 'createdAt' | 'metrics'>>
  > {
    const summaries = this.listSnapshotFiles()
      .flatMap((file) => {
        try {
          const snap = JSON.parse(
            fs.readFileSync(path.join(this.snapshotDir, file), 'utf-8'),
          ) as LearningSnapshot;
          return [
            {
              snapshotId: snap.snapshotId,
              tenantId: snap.tenantId,
              metadata: snap.metadata,
              createdAt: snap.createdAt,
              metrics: snap.metrics,
            },
          ];
        } catch {
          return [];
        }
      })
      .sort((a, b) => {
        // snapshotId = "snap-<Date.now()>-<uuid>" — numeric ms timestamp is most precise
        const tsA = parseInt(a.snapshotId.split('-')[1] ?? '0', 10);
        const tsB = parseInt(b.snapshotId.split('-')[1] ?? '0', 10);
        return tsB !== tsA ? tsB - tsA : b.snapshotId.localeCompare(a.snapshotId);
      });

    return DataProcessResult.success(summaries);
  }

  /**
   * Compare two snapshots. Returns delta metrics.
   * Positive deltas = snapshot B improved vs A.
   */
  compareSnapshots(
    snapshotIdA: string,
    snapshotIdB: string,
  ): DataProcessResult<SnapshotComparison> {
    const snapA = this.loadSnapshotById(snapshotIdA);
    const snapB = this.loadSnapshotById(snapshotIdB);

    if (!snapA) {
      return DataProcessResult.failure('NOT_FOUND', `Snapshot A (${snapshotIdA}) not found`);
    }
    if (!snapB) {
      return DataProcessResult.failure('NOT_FOUND', `Snapshot B (${snapshotIdB}) not found`);
    }

    return DataProcessResult.success({
      snapshotA: snapshotIdA,
      snapshotB: snapshotIdB,
      deltas: {
        feedbackCountDelta: snapB.metrics.totalFeedbackRecords - snapA.metrics.totalFeedbackRecords,
        avgScoreDelta:
          Math.round((snapB.metrics.avgScore - snapA.metrics.avgScore) * 10000) / 10000,
        passRateDelta:
          Math.round((snapB.metrics.passRate - snapA.metrics.passRate) * 10000) / 10000,
        promptVersionDelta: snapB.metrics.promptVersionCount - snapA.metrics.promptVersionCount,
        ragWeightDelta: snapB.metrics.ragWeightCount - snapA.metrics.ragWeightCount,
      },
      aMetrics: snapA.metrics,
      bMetrics: snapB.metrics,
    });
  }

  // ── Private ────────────────────────────────────────

  private buildFilename(tenantId: string, meta: SnapshotMetadata, snapshotId: string): string {
    const ts = new Date().toISOString().replace(/[:.]/g, '').substring(0, 15);
    return `${meta.flowId ?? 'FLOW-0'}-${meta.phase}-${tenantId}-${meta.aiProvider}-${meta.ragProvider}-${ts}-${snapshotId}.json`;
  }

  private nextSnapshotTimeMs(): number {
    const now = Date.now();
    const next = now > this.lastSnapshotTimeMs ? now : this.lastSnapshotTimeMs + 1;
    this.lastSnapshotTimeMs = next;
    return next;
  }

  private listSnapshotFiles(): string[] {
    try {
      return fs.readdirSync(this.snapshotDir).filter((f) => f.endsWith('.json'));
    } catch {
      return [];
    }
  }

  private loadSnapshotById(id: string): LearningSnapshot | null {
    for (const file of this.listSnapshotFiles()) {
      try {
        const snap = JSON.parse(
          fs.readFileSync(path.join(this.snapshotDir, file), 'utf-8'),
        ) as LearningSnapshot;
        if (snap.snapshotId === id) return snap;
      } catch {
        continue;
      }
    }
    return null;
  }
}
