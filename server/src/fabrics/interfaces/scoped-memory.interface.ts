/**
 * IScopedMemoryService — fast, tenant-scoped, ephemeral key-value storage.
 *
 * Named for CAPABILITY (scoped + memory), not provider (Redis/Memcached).
 * All keys are automatically tenant-namespaced by the implementation.
 * The caller never manages namespacing.
 *
 * Use for: windowed counters, idempotency locks, rate limiting,
 *          session tokens, ephemeral aggregation.
 * Do NOT use for: durable storage (use IDatabaseService),
 *                 task queuing (use IQueueService).
 *
 * Providers: RedisProvider, InMemoryProvider, ValkeyProvider
 * FREEDOM config key: scoped_memory_provider (default: in_memory)
 *
 * CF-791: No direct ioredis/redis SDK imports in generated services.
 * CF-792: increment() must be atomic — separate incr+expire is forbidden.
 *
 * Z-2: New fabric interface — Component 8 of the XIIGen fabric layer.
 */
export const SCOPED_MEMORY_SERVICE = 'SCOPED_MEMORY_SERVICE';

export interface IScopedMemoryService {
  /**
   * Atomically increment a counter and set/refresh its TTL window.
   * INCR + EXPIRE as a single atomic operation — no split.
   * Returns the counter value after increment.
   *
   * CF-792: This operation MUST be atomic. Separate read+increment+write is forbidden.
   */
  increment(key: string, ttlSeconds: number): Promise<number>;

  /**
   * Set a key only if it does not already exist (atomic set-if-not-exists).
   * Returns true if this caller set the value (first caller wins).
   * Returns false if the key already existed (another caller got there first).
   * Use for idempotency locks and deduplication guards.
   */
  setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean>;

  /** Retrieve a value. Returns null if key does not exist or has expired. */
  get(key: string): Promise<string | null>;

  /**
   * Set a value with optional TTL.
   * If ttlSeconds is omitted, key persists until explicitly deleted
   * (use with caution — prefer TTL for ephemeral data).
   */
  set(key: string, value: string, ttlSeconds?: number): Promise<void>;

  /** Delete a key explicitly. No-op if key does not exist. */
  delete(key: string): Promise<void>;

  /**
   * Add a member to a sorted set with the given score (ZADD semantics).
   * If the member already exists, its score is updated.
   * Use for FIFO queues (score = timestamp), priority queues (score = priority),
   * or any ordered collection where members must be retrieved by score range.
   *
   * ENG-02: Required by ATTENDANCE archetype for queue position ordering.
   */
  sortedSetAdd(key: string, score: number, member: string): Promise<void>;

  /**
   * Retrieve members whose score falls within [min, max] inclusive (ZRANGEBYSCORE semantics).
   * Returns members in ascending score order.
   * Returns an empty array if no members fall in range or the key does not exist.
   *
   * ENG-02: Required by ATTENDANCE archetype to fetch next N members in FIFO order.
   */
  sortedSetRangeByScore(key: string, min: number, max: number): Promise<string[]>;

  /**
   * Remove a member from the sorted set (ZREM semantics).
   * No-op if the member does not exist in the set.
   *
   * ENG-02: Required by ATTENDANCE archetype to dequeue a processed member.
   */
  sortedSetRemove(key: string, member: string): Promise<void>;
}
