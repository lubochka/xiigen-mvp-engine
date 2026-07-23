/**
 * FactoryRegistrar — T405 [BUILD].
 *
 * Registers new factory interfaces into the engine's factory registry.
 * Each factory must declare its fabric type and resolution method.
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

export interface FactoryRegistrationResult {
  registrationId: string;
  factoryId: string;
  registeredAt: string;
}

const VALID_FABRIC_TYPES = ['DATABASE', 'QUEUE', 'AI_ENGINE', 'RAG', 'SECRETS', 'FLOW_ENGINE'];

export class FactoryRegistrar {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async register(
    tenantId: string,
    factoryId: string,
    factoryDef: Record<string, unknown>,
  ): Promise<DataProcessResult<FactoryRegistrationResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!factoryId) return DataProcessResult.failure('MISSING_FACTORY_ID', 'factoryId is required');

    // Validate fabric type
    const fabricType = factoryDef['fabricType'] as string;
    if (!fabricType || !VALID_FABRIC_TYPES.includes(fabricType)) {
      return DataProcessResult.failure(
        'INVALID_FABRIC_TYPE',
        `fabricType must be one of: ${VALID_FABRIC_TYPES.join(', ')}`,
      );
    }

    // Idempotency check
    const existing = await this.db.searchDocuments('flow26-factory-registry', {
      factoryId,
      tenantId,
    });
    if (existing.isSuccess && existing.data!.length > 0) {
      const e = existing.data![0];
      return DataProcessResult.success({
        registrationId: e['registrationId'] as string,
        factoryId: e['factoryId'] as string,
        registeredAt: e['registeredAt'] as string,
      });
    }

    const registrationId = randomUUID();
    const registeredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      registrationId,
      tenantId,
      factoryId,
      factoryDef,
      registeredAt,
    };

    const stored = await this.db.storeDocument('flow26-factory-registry', doc, registrationId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('flow.factory.registered', {
      registrationId,
      tenantId,
      factoryId,
      fabricType,
      registeredAt,
    });

    return DataProcessResult.success({ registrationId, factoryId, registeredAt });
  }
}
