/**
 * ModuleSnapshotService — packages all learning records for a (tenantId, flowId, phase)
 * into a versioned module snapshot and registers it in xiigen-module-library.
 *
 * Snapshot captures:
 *   - RAG patterns tagged with (tenantId, phase)
 *   - Calibration baseline records tagged with (tenantId, phase)
 *   - OSS curriculum run records tagged with (tenantId, phase)
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-8: snapshot record stored before library registration call.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { ModuleLibraryService } from './module-library.service';

export const MODULE_SNAPSHOTS_INDEX = 'xiigen-module-library';

export interface ModuleSnapshot {
  snapshotId: string;
  tenantId: string;
  flowId: string;
  phase: string;
  ragPatternIds: string[];
  calibrationRecordIds: string[];
  ossRecordIds: string[];
  /** Decision-graph edges built during calibration (Class B portability gap source). */
  graphEdgeIds: string[];
  /** Prompt versions patched during calibration runs (Class C portability gap source). */
  promptVersionIds: string[];
  stationDepthPairs: Array<{ station: string; depth: number }>;
  capturedAt: string;
}

export interface SnapshotInput {
  tenantId: string;
  flowId: string;
  phase: string;
}

@Injectable()
export class ModuleSnapshotService {
  private readonly logger = new Logger(ModuleSnapshotService.name);
  // In-memory snapshot store for Phase 0 (no separate snapshot index yet).
  // Phase 1: store in dedicated xiigen-module-snapshots index.
  private readonly snapshots = new Map<string, ModuleSnapshot>();

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly moduleLibrary: ModuleLibraryService,
  ) {}

  /**
   * Capture all learning records for (tenantId, flowId, phase) as a snapshot.
   * DNA-8: snapshot saved before library registration.
   */
  async captureSnapshot(input: SnapshotInput): Promise<DataProcessResult<ModuleSnapshot>> {
    try {
      const [ragResult, calResult, ossResult, graphResult, promptResult] = await Promise.all([
        this.db.searchDocuments('xiigen-rag-patterns', {
          tenantId: input.tenantId,
          phase: input.phase,
        }),
        this.db.searchDocuments('xiigen-calibration-baseline', {
          tenantId: input.tenantId,
          phase: input.phase,
        }),
        this.db.searchDocuments('xiigen-oss-curriculum-runs', {
          tenantId: input.tenantId,
          phase: input.phase,
        }),
        this.db.searchDocuments('xiigen-decision-graph', {
          ownerId: input.tenantId,
          phase: input.phase,
        }),
        this.db.searchDocuments('xiigen-prompts', {
          flowId: input.flowId,
          phase: input.phase,
        }),
      ]);

      const ragIds = ragResult.isSuccess
        ? (ragResult.data as Array<{ _id?: string }>).map((r) => r._id ?? '').filter(Boolean)
        : [];
      const calRecords = calResult.isSuccess
        ? (calResult.data as Array<{ _id?: string; station?: string; depth?: number }>)
        : [];
      const calIds = calRecords.map((r) => r._id ?? '').filter(Boolean);
      const ossIds = ossResult.isSuccess
        ? (ossResult.data as Array<{ _id?: string }>).map((r) => r._id ?? '').filter(Boolean)
        : [];
      const graphEdgeIds = graphResult.isSuccess
        ? (graphResult.data as Array<{ _id?: string }>).map((r) => r._id ?? '').filter(Boolean)
        : [];
      const promptVersionIds = promptResult.isSuccess
        ? (promptResult.data as Array<{ _id?: string }>).map((r) => r._id ?? '').filter(Boolean)
        : [];

      // Extract unique (station, depth) pairs from calibration records
      const pairSet = new Set<string>();
      const stationDepthPairs: Array<{ station: string; depth: number }> = [];
      for (const r of calRecords) {
        if (r.station && typeof r.depth === 'number') {
          const key = `${r.station}::${r.depth}`;
          if (!pairSet.has(key)) {
            pairSet.add(key);
            stationDepthPairs.push({ station: r.station, depth: r.depth });
          }
        }
      }

      const snapshot: ModuleSnapshot = {
        snapshotId: randomUUID(),
        tenantId: input.tenantId,
        flowId: input.flowId,
        phase: input.phase,
        ragPatternIds: ragIds,
        calibrationRecordIds: calIds,
        ossRecordIds: ossIds,
        graphEdgeIds,
        promptVersionIds,
        stationDepthPairs,
        capturedAt: new Date().toISOString(),
      };

      // DNA-8: save snapshot before dispatching to module library
      this.snapshots.set(snapshot.snapshotId, snapshot);

      // Register in module library (non-blocking failure — snapshot is already saved)
      await this.moduleLibrary
        .registerModule({
          flowId: input.flowId,
          phase: input.phase,
          title: `${input.flowId} / ${input.phase}`,
          description: `Auto-captured module snapshot for ${input.flowId} phase ${input.phase}`,
          ownerId: input.tenantId,
          ragSnapshotId: snapshot.snapshotId,
          calibrationIds: calIds,
        })
        .catch((err) => {
          this.logger.warn(`ModuleSnapshotService: library registration failed — ${String(err)}`);
        });

      return DataProcessResult.success(snapshot);
    } catch (err) {
      return DataProcessResult.failure('SNAPSHOT_FAILED', String(err));
    }
  }

  /** Retrieve a snapshot by ID. Returns NOT_FOUND if absent. */
  async getSnapshot(snapshotId: string): Promise<DataProcessResult<ModuleSnapshot>> {
    const snapshot = this.snapshots.get(snapshotId);
    if (!snapshot) {
      return DataProcessResult.failure('NOT_FOUND', `Snapshot ${snapshotId} not found`);
    }
    return DataProcessResult.success(snapshot);
  }
}
