/**
 * IIdempotencyStore — interface for tenant-scoped idempotency deduplication.
 *
 * Implementations:
 *   - InMemoryIdempotencyStore (kernel, test/dev)
 *   - RedisIdempotencyStore (infrastructure/, production)
 *
 * P26 FIX-2.
 */

import { DataProcessResult } from '../data-process-result';

export interface IdempotencyKey {
  tenantId: string;
  key: string;
  ttlSeconds?: number;
}

export interface IIdempotencyStore {
  /**
   * Attempt to set the idempotency key atomically.
   * Returns success(true) if key was new (first call).
   * Returns failure('DUPLICATE_REQUEST', ...) if key already exists.
   */
  checkAndSet(key: IdempotencyKey): Promise<DataProcessResult<boolean>>;

  /**
   * Release an idempotency key (e.g., on rollback).
   * Returns success(undefined) regardless of whether key existed.
   */
  release(key: IdempotencyKey): Promise<DataProcessResult<void>>;
}

/** Injection token for IIdempotencyStore. */
export const IDEMPOTENCY_STORE = 'IIdempotencyStore';
