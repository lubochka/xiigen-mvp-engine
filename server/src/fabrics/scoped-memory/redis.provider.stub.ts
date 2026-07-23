/**
 * RedisProvider STUB — IScopedMemoryService backed by Redis.
 *
 * STUB: ioredis is not installed. This file documents the interface contract
 * and throws a clear error if instantiated without ioredis.
 *
 * To activate: npm install ioredis @types/ioredis
 * Then replace this stub with the full implementation below.
 *
 * IMPORTANT: ioredis imports ONLY in this provider file — never in generated services.
 * This is the entire point of IScopedMemoryService (CF-791).
 *
 * Full implementation (when ioredis is installed):
 * ─────────────────────────────────────────────────────────────────────────
 * import Redis from 'ioredis';
 *
 * @Injectable()
 * export class RedisProvider implements IScopedMemoryService {
 *   private readonly client: Redis;
 *
 *   constructor(redisUrl: string = 'redis://localhost:6379') {
 *     this.client = new Redis(redisUrl);
 *   }
 *
 *   async increment(key: string, ttlSeconds: number): Promise<number> {
 *     const pipeline = this.client.pipeline();
 *     pipeline.incr(key);
 *     pipeline.expire(key, ttlSeconds);
 *     const results = await pipeline.exec();
 *     return results?.[0]?.[1] as number ?? 0;
 *   }
 *
 *   async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
 *     const result = await this.client.set(key, value, 'NX', 'EX', ttlSeconds);
 *     return result === 'OK';
 *   }
 *
 *   async get(key: string): Promise<string | null> {
 *     return this.client.get(key);
 *   }
 *
 *   async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
 *     if (ttlSeconds !== undefined) {
 *       await this.client.set(key, value, 'EX', ttlSeconds);
 *     } else {
 *       await this.client.set(key, value);
 *     }
 *   }
 *
 *   async delete(key: string): Promise<void> {
 *     await this.client.del(key);
 *   }
 *
 *   // ENG-02 sorted set methods (full Redis implementation):
 *   async sortedSetAdd(key: string, score: number, member: string): Promise<void> {
 *     await this.client.zadd(key, score, member);
 *   }
 *
 *   async sortedSetRangeByScore(key: string, min: number, max: number): Promise<string[]> {
 *     return this.client.zrangebyscore(key, min, max);
 *   }
 *
 *   async sortedSetRemove(key: string, member: string): Promise<void> {
 *     await this.client.zrem(key, member);
 *   }
 * }
 * ─────────────────────────────────────────────────────────────────────────
 */
import { Injectable } from '@nestjs/common';
import { IScopedMemoryService } from '../interfaces/scoped-memory.interface';

@Injectable()
export class RedisProvider implements IScopedMemoryService {
  constructor() {
    throw new Error(
      'RedisProvider requires ioredis. Run: npm install ioredis @types/ioredis\n' +
        'See src/fabrics/scoped-memory/redis.provider.stub.ts for full implementation.',
    );
  }

  async increment(_key: string, _ttlSeconds: number): Promise<number> {
    return 0;
  }
  async setIfAbsent(_key: string, _value: string, _ttlSeconds: number): Promise<boolean> {
    return false;
  }
  async get(_key: string): Promise<string | null> {
    return null;
  }
  async set(_key: string, _value: string, _ttlSeconds?: number): Promise<void> {
    /* stub */
  }
  async delete(_key: string): Promise<void> {
    /* stub */
  }
  async sortedSetAdd(_key: string, _score: number, _member: string): Promise<void> {
    /* stub — ZADD */
  }
  async sortedSetRangeByScore(_key: string, _min: number, _max: number): Promise<string[]> {
    return []; /* stub — ZRANGEBYSCORE */
  }
  async sortedSetRemove(_key: string, _member: string): Promise<void> {
    /* stub — ZREM */
  }
}
