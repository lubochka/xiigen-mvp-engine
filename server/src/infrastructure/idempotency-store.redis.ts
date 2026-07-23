/**
 * RedisIdempotencyStore — Redis-backed IIdempotencyStore for production.
 *
 * Lives in server/src/infrastructure/, NOT in server/src/kernel/.
 * Kernel must never import Redis directly (Fabric First rule).
 *
 * Uses SET NX EX for atomic check-and-set (no race condition).
 *
 * P26 FIX-2.
 */

import { DataProcessResult } from '../kernel/data-process-result';
import { IIdempotencyStore, IdempotencyKey } from '../kernel/multi-tenant/idempotency.types';

// Redis type declared locally to avoid importing ioredis in kernel.
// The concrete Redis client is injected at construction time.
interface RedisClient {
  set(key: string, value: string, ...args: unknown[]): Promise<string | null>;
  del(key: string): Promise<number>;
}

export class RedisIdempotencyStore implements IIdempotencyStore {
  constructor(private readonly redis: RedisClient) {}

  async checkAndSet(key: IdempotencyKey): Promise<DataProcessResult<boolean>> {
    const fullKey = `idempotency:${key.tenantId}:${key.key}`;
    const ttl = key.ttlSeconds ?? 3600;
    const result = await this.redis.set(fullKey, '1', 'NX', 'EX', ttl);
    if (result === null) {
      return DataProcessResult.failure(
        'DUPLICATE_REQUEST',
        `Idempotency key already set: ${key.key}`,
      );
    }
    return DataProcessResult.success(true);
  }

  async release(key: IdempotencyKey): Promise<DataProcessResult<void>> {
    const fullKey = `idempotency:${key.tenantId}:${key.key}`;
    await this.redis.del(fullKey);
    return DataProcessResult.success(undefined);
  }
}
