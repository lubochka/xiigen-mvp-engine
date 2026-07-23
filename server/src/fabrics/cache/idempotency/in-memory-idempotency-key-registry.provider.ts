// file: server/src/fabrics/cache/idempotency/in-memory-idempotency-key-registry.provider.ts
// DNA-9 In-memory idempotency key registry (development/test provider).
// Production should use Redis-backed implementation.

import { Injectable, Logger } from '@nestjs/common';
import {
  IIdempotencyKeyRegistry,
  IdempotencyCheckResult,
} from './idempotency-key-registry.interface';

const DEFAULT_TTL_SECONDS = 86_400; // 24 hours
const RESPONSE_SUFFIX = ':response';

@Injectable()
export class InMemoryIdempotencyKeyRegistryProvider implements IIdempotencyKeyRegistry {
  private readonly logger = new Logger(InMemoryIdempotencyKeyRegistryProvider.name);
  private readonly store = new Map<string, { expiresAt: number; value: string }>();

  private buildKey(tenantId: string, key: string): string {
    return `idempotency:${tenantId}:${key}`;
  }

  private isExpired(entry: { expiresAt: number }): boolean {
    return Date.now() > entry.expiresAt;
  }

  async registerKey(
    tenantId: string,
    key: string,
    ttlSeconds = DEFAULT_TTL_SECONDS,
  ): Promise<IdempotencyCheckResult> {
    const redisKey = this.buildKey(tenantId, key);
    const existing = this.store.get(redisKey);

    if (!existing || this.isExpired(existing)) {
      // Key does not exist — register it
      this.store.set(redisKey, {
        expiresAt: Date.now() + ttlSeconds * 1000,
        value: 'registered',
      });
      return { isNew: true };
    }

    // Key already exists — check for cached response
    const responseKey = redisKey + RESPONSE_SUFFIX;
    const responseEntry = this.store.get(responseKey);
    const cachedResponse =
      responseEntry && !this.isExpired(responseEntry)
        ? (JSON.parse(responseEntry.value) as Record<string, unknown>)
        : undefined;

    return { isNew: false, cachedResponse };
  }

  async cacheResponse(
    tenantId: string,
    key: string,
    response: Record<string, unknown>,
  ): Promise<void> {
    const redisKey = this.buildKey(tenantId, key) + RESPONSE_SUFFIX;
    this.store.set(redisKey, {
      expiresAt: Date.now() + DEFAULT_TTL_SECONDS * 1000,
      value: JSON.stringify(response),
    });
  }

  async expireKey(tenantId: string, key: string): Promise<void> {
    const redisKey = this.buildKey(tenantId, key);
    this.store.delete(redisKey);
    this.store.delete(redisKey + RESPONSE_SUFFIX);
    this.logger.log(`IdempotencyRegistry: expired key ${redisKey}`);
  }
}
