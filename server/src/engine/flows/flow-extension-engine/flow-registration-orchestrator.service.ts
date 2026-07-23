/**
 * FlowRegistrationOrchestrator — T403 [ORCHESTRATION].
 *
 * Orchestrates the full registration of a validated flow into the engine registry.
 * Idempotent by flowId — second call returns existing without re-registering.
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

export interface FlowRegistrationResult {
  registrationId: string;
  flowId: string;
  status: 'REGISTERED';
  registeredAt: string;
}

export class FlowRegistrationOrchestrator {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async register(
    tenantId: string,
    flowId: string,
    metadata: Record<string, unknown>,
  ): Promise<DataProcessResult<FlowRegistrationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flowId is required');

    // Idempotency check
    const existing = await this.db.searchDocuments('flow26-registrations', { flowId, tenantId });
    if (existing.isSuccess && existing.data!.length > 0) {
      const e = existing.data![0];
      return DataProcessResult.success({
        registrationId: e['registrationId'] as string,
        flowId: e['flowId'] as string,
        status: 'REGISTERED' as const,
        registeredAt: e['registeredAt'] as string,
      });
    }

    const registrationId = randomUUID();
    const registeredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      registrationId,
      tenantId,
      flowId,
      metadata,
      status: 'REGISTERED',
      registeredAt,
    };

    const stored = await this.db.storeDocument('flow26-registrations', doc, registrationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.registered', { registrationId, tenantId, flowId, registeredAt });

    return DataProcessResult.success({
      registrationId,
      flowId,
      status: 'REGISTERED',
      registeredAt,
    });
  }
}
