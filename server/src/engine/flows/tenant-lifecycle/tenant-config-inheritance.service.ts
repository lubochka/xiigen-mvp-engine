/**
 * TenantConfigInheritance — T470 [BUILD].
 *
 * Resolves effective tenant config by merging: global → plan → tenant-override.
 * Later layers win. Stores resolved config then emits config.resolved.
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
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface ConfigInheritanceResult {
  configId: string;
  effectiveConfig: Record<string, unknown>;
  resolvedAt: string;
}

export class TenantConfigInheritance {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async resolve(
    tenantId: string,
    globalConfig: Record<string, unknown>,
    planConfig: Record<string, unknown>,
    tenantOverride: Record<string, unknown>,
  ): Promise<DataProcessResult<ConfigInheritanceResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');

    // Merge: global → plan → tenant-override (later wins)
    const effectiveConfig: Record<string, unknown> = {
      ...globalConfig,
      ...planConfig,
      ...tenantOverride,
    };

    const configId = randomUUID();
    const resolvedAt = new Date().toISOString();
    const doc: Record<string, unknown> = { configId, tenantId, effectiveConfig, resolvedAt };

    const stored = await this.db.storeDocument('flow30-tenant-configs', doc, configId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('config.resolved', { configId, tenantId, resolvedAt });

    return DataProcessResult.success({ configId, effectiveConfig, resolvedAt });
  }
}
