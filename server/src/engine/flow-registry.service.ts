/**
 * FlowRegistryService — CRUD for flow catalog entries in xiigen-flow-registry.
 *
 * Stores flow metadata (flowId, name, taskTypeId, version, status).
 * Distinct from TopologyStore which stores DAG topology in xiigen-flow-definitions.
 *
 * DNA-3: all methods return DataProcessResult, never throw.
 * DNA-8: storeDocument before any downstream enqueue.
 * Stage 2, S6.
 */
import { Injectable, Logger, Inject } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export interface FlowRegistryEntry {
  flowId: string;
  name: string;
  description?: string;
  taskTypeId: string;
  version: string;
  status: 'PENDING' | 'ACTIVE' | 'DEPRECATED';
  createdAt: string;
  updatedAt: string;
}

const INDEX = 'xiigen-flow-registry';

@Injectable()
export class FlowRegistryService {
  private readonly logger = new Logger(FlowRegistryService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  // ─── registerFlow ──────────────────────────────────────────────────────────

  async registerFlow(
    entry: Omit<FlowRegistryEntry, 'createdAt' | 'updatedAt'>,
  ): Promise<DataProcessResult<FlowRegistryEntry>> {
    if (!entry.flowId || !entry.taskTypeId || !entry.version) {
      return DataProcessResult.failure(
        'MISSING_PARAMS',
        'flowId, taskTypeId, and version are required',
      );
    }
    const now = new Date().toISOString();
    const record: FlowRegistryEntry = {
      ...entry,
      status: entry.status ?? 'PENDING',
      createdAt: now,
      updatedAt: now,
    };
    const result = await this.db.storeDocument(
      INDEX,
      record as unknown as Record<string, unknown>,
      entry.flowId,
    );
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    this.logger.log(`Registered flow: ${entry.flowId} v${entry.version}`);
    return DataProcessResult.success(record);
  }

  // ─── getFlow ───────────────────────────────────────────────────────────────

  async getFlow(flowId: string): Promise<DataProcessResult<FlowRegistryEntry | null>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    const result = await this.db.getDocument(INDEX, flowId);
    if (!result.isSuccess || !result.data) {
      return DataProcessResult.success(null);
    }
    return DataProcessResult.success(result.data as unknown as FlowRegistryEntry);
  }

  // ─── updateFlow ────────────────────────────────────────────────────────────

  async updateFlow(
    flowId: string,
    updates: Partial<Omit<FlowRegistryEntry, 'flowId' | 'createdAt'>>,
  ): Promise<DataProcessResult<FlowRegistryEntry>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    const existing = await this.db.getDocument(INDEX, flowId);
    if (!existing.isSuccess || !existing.data) {
      return DataProcessResult.failure('FLOW_NOT_FOUND', `Flow ${flowId} not found`);
    }
    const record: FlowRegistryEntry = {
      ...(existing.data as unknown as FlowRegistryEntry),
      ...updates,
      flowId,
      updatedAt: new Date().toISOString(),
    };
    await this.db.storeDocument(INDEX, record as unknown as Record<string, unknown>, flowId);
    return DataProcessResult.success(record);
  }

  // ─── listFlows ─────────────────────────────────────────────────────────────

  async listFlows(filters?: {
    status?: string;
    taskTypeId?: string;
  }): Promise<DataProcessResult<FlowRegistryEntry[]>> {
    const query: Record<string, unknown> = {};
    if (filters?.status) query['status'] = filters.status;
    if (filters?.taskTypeId) query['taskTypeId'] = filters.taskTypeId;
    const result = await this.db.searchDocuments(INDEX, query, 100);
    if (!result.isSuccess) {
      return DataProcessResult.success([]);
    }
    return DataProcessResult.success((result.data ?? []) as unknown as FlowRegistryEntry[]);
  }

  // ─── seedFromContracts ─────────────────────────────────────────────────────

  /**
   * Idempotently seed flow registry entries from engine contract descriptors.
   * Called during bootstrap (Phase 9b) to populate xiigen-flow-registry so
   * GenericNodeExecutor can look up registered task types at runtime.
   *
   * Skips entries that already exist (idempotent — safe to call on every boot).
   * DNA-3: never throws.
   */
  async seedFromContracts(
    contracts: Array<{ taskTypeId: string; flowId?: string; name?: string; version?: string }>,
  ): Promise<DataProcessResult<{ seeded: number; skipped: number }>> {
    let seeded = 0;
    let skipped = 0;

    for (const c of contracts) {
      const existing = await this.db.getDocument(INDEX, c.taskTypeId);
      if (existing.isSuccess && existing.data) {
        const existingEntry = existing.data as unknown as FlowRegistryEntry;
        const correctFlowId = c.flowId ?? c.taskTypeId;
        const needsFlowIdFix =
          existingEntry.flowId === c.taskTypeId && c.flowId && c.flowId !== c.taskTypeId;
        // PENDING→ACTIVE transition: promote any PENDING entry to ACTIVE (R19)
        if (existingEntry.status === 'PENDING' || needsFlowIdFix) {
          const now = new Date().toISOString();
          const promoted: FlowRegistryEntry = {
            ...existingEntry,
            flowId: correctFlowId,
            ...(existingEntry.status === 'PENDING'
              ? {
                  status: 'ACTIVE',
                  updatedAt: now,
                  activatedAt: now,
                  activatedBy: 'seedFromContracts',
                }
              : {}),
            ...(needsFlowIdFix ? { updatedAt: now } : {}),
          } as FlowRegistryEntry & { activatedAt?: string; activatedBy?: string };
          await this.db.storeDocument(
            INDEX,
            promoted as unknown as Record<string, unknown>,
            c.taskTypeId,
          );
          if (existingEntry.status === 'PENDING') {
            this.logger.log(`seedFromContracts: ${c.taskTypeId} promoted PENDING → ACTIVE`);
          }
          if (needsFlowIdFix) {
            this.logger.log(
              `seedFromContracts: ${c.taskTypeId} flowId corrected → ${correctFlowId}`,
            );
          }
        }
        skipped++;
        continue;
      }
      const now = new Date().toISOString();
      const entry: FlowRegistryEntry = {
        flowId: c.flowId ?? c.taskTypeId,
        name: c.name ?? c.taskTypeId,
        taskTypeId: c.taskTypeId,
        version: c.version ?? 'v1',
        status: 'ACTIVE',
        createdAt: now,
        updatedAt: now,
      };
      const result = await this.db.storeDocument(
        INDEX,
        entry as unknown as Record<string, unknown>,
        c.taskTypeId,
      );
      if (result.isSuccess) {
        seeded++;
      } else {
        this.logger.warn(
          `seedFromContracts: failed to seed ${c.taskTypeId}: ${result.errorMessage}`,
        );
      }
    }

    this.logger.log(`seedFromContracts: seeded=${seeded} skipped=${skipped}`);
    return DataProcessResult.success({ seeded, skipped });
  }

  // ─── deleteFlow ────────────────────────────────────────────────────────────

  async deleteFlow(flowId: string): Promise<DataProcessResult<boolean>> {
    if (!flowId) {
      return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');
    }
    const result = await this.db.deleteDocument(INDEX, flowId);
    if (!result.isSuccess) {
      return DataProcessResult.failure(result.errorCode!, result.errorMessage!);
    }
    return DataProcessResult.success(true);
  }
}
