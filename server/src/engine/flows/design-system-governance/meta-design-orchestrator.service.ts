/**
 * MetaDesignOrchestrator — T515 [ORCHESTRATION].
 *
 * Top-level orchestrator coordinating the full design intelligence lifecycle:
 * ingest → analyze → validate → build → publish → deploy.
 * Idempotent by (tenantId, specId). Status: INITIATED.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface MetaDesignOrchestrationResult {
  orchestrationId: string;
  specId: string;
  status: 'INITIATED';
  initiatedAt: string;
}

export class MetaDesignOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async initiate(
    tenantId: string,
    specId: string,
    config: {
      designFormat: string;
      targetPhases?: string[];
    },
  ): Promise<DataProcessResult<MetaDesignOrchestrationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Idempotency: return existing if already initiated for this specId
    const existing = await this.db.searchDocuments('flow31-meta-design-runs', { tenantId, specId });
    if (!existing.isSuccess)
      return DataProcessResult.failure(existing.errorCode!, existing.errorMessage!);
    if (existing.data!.length > 0) {
      const prev = existing.data![0];
      return DataProcessResult.success({
        orchestrationId: prev['orchestrationId'] as string,
        specId,
        status: 'INITIATED' as const,
        initiatedAt: prev['initiatedAt'] as string,
      });
    }

    const orchestrationId = randomUUID();
    const initiatedAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      orchestrationId,
      tenantId,
      specId,
      status: 'INITIATED',
      config,
      initiatedAt,
    };

    const stored = await this.db.storeDocument('flow31-meta-design-runs', doc, orchestrationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('metadesign.orchestration.initiated', {
      orchestrationId,
      tenantId,
      specId,
      initiatedAt,
    });

    return DataProcessResult.success({ orchestrationId, specId, status: 'INITIATED', initiatedAt });
  }
}
