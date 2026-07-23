// file: server/src/fabrics/cache/idempotency/idempotency-key-registry.interface.ts
// DNA-9 Centralized Idempotency Key Registry interface.

export const IDEMPOTENCY_KEY_REGISTRY = Symbol('IDEMPOTENCY_KEY_REGISTRY');

export interface IdempotencyCheckResult {
  /**
   * True if this key has not been seen before and the operation should proceed.
   * False if the key was already registered — return cachedResponse instead.
   */
  isNew: boolean;
  /**
   * Present only when isNew === false. Contains the original response.
   */
  cachedResponse?: Record<string, unknown>;
}

/**
 * DNA-9 Centralized Idempotency Key Registry.
 *
 * USAGE CONTRACT:
 *   1. Before any financial factory call, call registerKey().
 *   2. If result.isNew === false, return result.cachedResponse immediately.
 *   3. Execute the financial operation.
 *   4. Call cacheResponse() to store the result for future duplicate detection.
 *
 * Key format: idempotency:{tenantId}:{key}
 *
 * DO NOT bypass this check for payment authorization, payout release, or refund operations.
 */
export interface IIdempotencyKeyRegistry {
  /**
   * Attempt to register an idempotency key.
   * Uses SET NX semantics to atomically check and register.
   * ttlSeconds defaults to 86400 (24 hours) for financial operations.
   */
  registerKey(tenantId: string, key: string, ttlSeconds?: number): Promise<IdempotencyCheckResult>;

  /**
   * Store the response payload associated with an idempotency key.
   * Called after successful execution so future duplicates can replay the result.
   */
  cacheResponse(tenantId: string, key: string, response: Record<string, unknown>): Promise<void>;

  /**
   * Explicitly expire an idempotency key before its natural TTL.
   * Use only for compensating transactions (saga rollback).
   */
  expireKey(tenantId: string, key: string): Promise<void>;
}
