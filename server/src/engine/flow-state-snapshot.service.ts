/**
 * FlowStateSnapshotService — stores and retrieves per-flow-run state snapshots.
 * Write path: called by feedback.handler after each node execution.
 * Read path: GET /api/flow/:flowId/state
 */
import { Injectable, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';
import { randomUUID } from 'crypto';

export interface FlowStateSnapshot {
  snapshotId: string;
  flowId: string;
  taskTypeId: string;
  tenantId: string;
  runId: string;
  phase: string;
  state: Record<string, unknown>;
  appReopenBehavior?: string;
  optimisticActions?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
}

@Injectable()
export class FlowStateSnapshotService {
  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async writeSnapshot(
    flowId: string,
    taskTypeId: string,
    tenantId: string,
    runId: string,
    phase: string,
    state: Record<string, unknown>,
    options?: { appReopenBehavior?: string; optimisticActions?: Record<string, unknown> },
  ): Promise<DataProcessResult<FlowStateSnapshot>> {
    const now = new Date().toISOString();
    const snapshot: FlowStateSnapshot = {
      snapshotId: randomUUID(),
      flowId,
      taskTypeId,
      tenantId,
      runId,
      phase,
      state,
      appReopenBehavior: options?.appReopenBehavior,
      optimisticActions: options?.optimisticActions,
      createdAt: now,
      updatedAt: now,
    };
    await this.db.storeDocument(
      'xiigen-flow-state-snapshots',
      snapshot as unknown as Record<string, unknown>,
      snapshot.snapshotId,
    );
    return DataProcessResult.success(snapshot);
  }

  async getLatestSnapshot(
    flowId: string,
    runId: string,
  ): Promise<DataProcessResult<FlowStateSnapshot | null>> {
    const result = await this.db.searchDocuments('xiigen-flow-state-snapshots', {
      flowId,
      runId,
    });
    if (!result.isSuccess || !result.data || result.data.length === 0) {
      return DataProcessResult.success(null);
    }
    const sorted = [...result.data].sort(
      (a, b) =>
        new Date(b['updatedAt'] as string).getTime() - new Date(a['updatedAt'] as string).getTime(),
    );
    return DataProcessResult.success(sorted[0] as unknown as FlowStateSnapshot);
  }
}
