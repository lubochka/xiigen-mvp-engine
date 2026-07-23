/**
 * GraphRagSyncService — G5: Syncs DPO triples to nano-graphrag for knowledge graph enrichment.
 *
 * syncTriple: syncs a single triple by ID (called fire-and-forget from FeedbackHandler).
 * syncBatch: syncs a batch of unsynced triples (no invocation path in this version).
 *
 * DNA-3: never throws — returns DataProcessResult
 * DNA-8: storeDocument (update with graphRagSyncedAt) BEFORE returning success
 * DNA-1: all business data as Record<string, unknown>
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../fabrics/interfaces/graph-rag.interface';
import { IFreedomConfigService, FREEDOM_CONFIG_SERVICE } from '../freedom/freedom-config.interface';
import { XIIGEN_FREEDOM_KEYS } from '../freedom/config-schema';
import { DataProcessResult } from '../kernel/data-process-result';

export interface SyncResult {
  syncedCount: number;
  failedCount: number;
  skippedCount: number;
}

@Injectable()
export class GraphRagSyncService {
  private readonly INDEX = 'xiigen-dpo-triples';

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional()
    @Inject(GRAPH_RAG_SERVICE)
    private readonly graphRag: IGraphRagService | null = null,
    @Optional()
    @Inject(FREEDOM_CONFIG_SERVICE)
    private readonly freedomConfig: IFreedomConfigService | null = null,
  ) {}

  async syncTriple(
    tripleId: string,
    callerTenantId: string,
  ): Promise<DataProcessResult<SyncResult>> {
    try {
      // Get the triple record
      const getResult = await this.db.getDocument(this.INDEX, tripleId);
      if (!getResult.isSuccess || !getResult.data) {
        return DataProcessResult.failure(
          'NOT_FOUND',
          `Triple ${tripleId} not found in ${this.INDEX}`,
        );
      }

      const triple = getResult.data as Record<string, unknown>;

      // Scope check FIRST
      if (triple['tenantId'] !== callerTenantId && triple['knowledgeScope'] !== 'GLOBAL') {
        return DataProcessResult.failure(
          'SCOPE_VIOLATION',
          `Triple ${tripleId} belongs to tenant ${String(triple['tenantId'])} not ${callerTenantId}`,
        );
      }

      // Skip if already synced
      if (triple['graphRagSyncedAt']) {
        return DataProcessResult.success({ syncedCount: 0, failedCount: 0, skippedCount: 1 });
      }

      // Get quality threshold from freedom config
      const thresholdDoc = this.freedomConfig
        ? await this.freedomConfig
            .get(XIIGEN_FREEDOM_KEYS.GRAPHRAG_MIN_QUALITY_THRESHOLD)
            .catch(() => null)
        : null;
      const threshold =
        typeof thresholdDoc?.['value'] === 'number' ? (thresholdDoc['value'] as number) : 0.85;

      // Skip if quality below threshold
      const qualityScore = Number(triple['qualityScore'] ?? 0);
      if (qualityScore < threshold) {
        return DataProcessResult.success({ syncedCount: 0, failedCount: 0, skippedCount: 1 });
      }

      // GraphRag service unavailable
      if (!this.graphRag) {
        return DataProcessResult.failure(
          'GRAPHRAG_SERVICE_UNAVAILABLE',
          'IGraphRagService not injected',
        );
      }

      // Build text payload
      const text = this.buildTripleText(triple);

      // Call graphRag.insert
      const insertResult = await this.graphRag.insert({
        text,
        workspace: callerTenantId,
        mode: 'triple',
      });

      if (!insertResult.success) {
        return DataProcessResult.success({ syncedCount: 0, failedCount: 1, skippedCount: 0 });
      }

      // DNA-8: update triple with graphRagSyncedAt
      await this.db.storeDocument(
        this.INDEX,
        { ...triple, graphRagSyncedAt: new Date().toISOString() } as Record<string, unknown>,
        tripleId,
      );

      return DataProcessResult.success({ syncedCount: 1, failedCount: 0, skippedCount: 0 });
    } catch (err) {
      return DataProcessResult.failure(
        'GRAPH_RAG_SYNC_ERROR',
        `GraphRagSyncService.syncTriple threw: ${String(err)}`,
      );
    }
  }

  async syncBatch(callerTenantId: string): Promise<DataProcessResult<SyncResult>> {
    // NOTE: No invocation path in this version — available for future scheduled sync
    try {
      const batchSizeDoc = this.freedomConfig
        ? await this.freedomConfig.get(XIIGEN_FREEDOM_KEYS.GRAPHRAG_BATCH_SIZE).catch(() => null)
        : null;
      const batchSize =
        typeof batchSizeDoc?.['value'] === 'number' ? (batchSizeDoc['value'] as number) : 10;

      const results = await this.db.searchDocuments(this.INDEX, { tenantId: callerTenantId });
      if (!results.isSuccess) {
        return DataProcessResult.failure(
          'GRAPH_RAG_SYNC_ERROR',
          'Failed to search triples for batch sync',
        );
      }

      const unsent = (results.data ?? [])
        .filter((t: Record<string, unknown>) => !t['graphRagSyncedAt'])
        .slice(0, batchSize);

      let syncedCount = 0;
      let failedCount = 0;
      let skippedCount = 0;

      for (const triple of unsent) {
        const id = String(triple['id'] ?? triple['tripleId'] ?? '');
        if (!id) continue;
        const r = await this.syncTriple(id, callerTenantId);
        if (r.isSuccess) {
          syncedCount += r.data!.syncedCount;
          failedCount += r.data!.failedCount;
          skippedCount += r.data!.skippedCount;
        } else {
          failedCount++;
        }
      }

      return DataProcessResult.success({ syncedCount, failedCount, skippedCount });
    } catch (err) {
      return DataProcessResult.failure(
        'GRAPH_RAG_SYNC_ERROR',
        `GraphRagSyncService.syncBatch threw: ${String(err)}`,
      );
    }
  }

  private buildTripleText(triple: Record<string, unknown>): string {
    const chosen = String(triple['chosen'] ?? triple['chosenOutput'] ?? '');
    const rejected = String(triple['rejected'] ?? triple['rejectedOutput'] ?? '');
    const prompt = String(triple['prompt'] ?? '');
    return `Prompt: ${prompt}\nChosen: ${chosen}\nRejected: ${rejected}`.slice(0, 2000);
  }
}
