/**
 * InMemoryIdempotencyStore — in-process idempotency store for dev/test.
 *
 * Production: use RedisIdempotencyStore (server/src/infrastructure/).
 * This class lives in kernel because it has no external dependencies.
 *
 * P26 FIX-2.
 */

import { DataProcessResult } from '../data-process-result';
import { IIdempotencyStore, IdempotencyKey } from './idempotency.types';

export class InMemoryIdempotencyStore implements IIdempotencyStore {
  private readonly store = new Map<string, NodeJS.Timeout | null>();

  async checkAndSet(key: IdempotencyKey): Promise<DataProcessResult<boolean>> {
    const fullKey = `${key.tenantId}:${key.key}`;
    if (this.store.has(fullKey)) {
      return DataProcessResult.failure(
        'DUPLICATE_REQUEST',
        `Idempotency key already set: ${key.key}`,
      );
    }
    const timeout = key.ttlSeconds
      ? setTimeout(() => this.store.delete(fullKey), key.ttlSeconds * 1000)
      : null;
    this.store.set(fullKey, timeout);
    return DataProcessResult.success(true);
  }

  async release(key: IdempotencyKey): Promise<DataProcessResult<void>> {
    const fullKey = `${key.tenantId}:${key.key}`;
    const timeout = this.store.get(fullKey);
    if (timeout) clearTimeout(timeout);
    this.store.delete(fullKey);
    return DataProcessResult.success(undefined);
  }
}
