/**
 * InMemoryProvider — IScopedMemoryService implementation for tests and local dev.
 *
 * No Redis required. Behavior matches Redis semantics exactly:
 *   - increment() is atomic within a single Node.js event loop (no parallel races)
 *   - setIfAbsent() checks-and-sets in a single synchronous block
 *   - TTL is enforced lazily on read
 *
 * DNA-3: All methods return promises (consistent with production providers).
 */
import { Injectable } from '@nestjs/common';
import { IScopedMemoryService } from '../interfaces/scoped-memory.interface';

interface Entry {
  value: string;
  expiresAt?: number;
}

@Injectable()
export class InMemoryScopedMemoryProvider implements IScopedMemoryService {
  private readonly store = new Map<string, Entry>();

  private isExpired(entry: Entry): boolean {
    return entry.expiresAt !== undefined && Date.now() > entry.expiresAt;
  }

  private getEntry(key: string): Entry | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (this.isExpired(entry)) {
      this.store.delete(key);
      return null;
    }
    return entry;
  }

  async increment(key: string, ttlSeconds: number): Promise<number> {
    // Atomic in Node.js single-threaded event loop: read + write in one sync block
    const existing = this.getEntry(key);
    const current = existing ? parseInt(existing.value, 10) : 0;
    const next = isNaN(current) ? 1 : current + 1;
    this.store.set(key, {
      value: String(next),
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return next;
  }

  async setIfAbsent(key: string, value: string, ttlSeconds: number): Promise<boolean> {
    // Atomic in Node.js: check + set in one sync block
    if (this.getEntry(key) !== null) return false;
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
    return true;
  }

  async get(key: string): Promise<string | null> {
    return this.getEntry(key)?.value ?? null;
  }

  async set(key: string, value: string, ttlSeconds?: number): Promise<void> {
    this.store.set(key, {
      value,
      expiresAt: ttlSeconds !== undefined ? Date.now() + ttlSeconds * 1000 : undefined,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  // ── Sorted set operations (ENG-02) ──────────────────────────────────────────

  /** Sorted set store: key → Map<member, score> */
  private readonly sortedSets = new Map<string, Map<string, number>>();

  async sortedSetAdd(key: string, score: number, member: string): Promise<void> {
    if (!this.sortedSets.has(key)) {
      this.sortedSets.set(key, new Map());
    }
    this.sortedSets.get(key)!.set(member, score);
  }

  async sortedSetRangeByScore(key: string, min: number, max: number): Promise<string[]> {
    const set = this.sortedSets.get(key);
    if (!set) return [];
    return Array.from(set.entries())
      .filter(([, s]) => s >= min && s <= max)
      .sort(([, a], [, b]) => a - b)
      .map(([member]) => member);
  }

  async sortedSetRemove(key: string, member: string): Promise<void> {
    this.sortedSets.get(key)?.delete(member);
  }

  /** Test utility: clear all stored keys and sorted sets */
  clear(): void {
    this.store.clear();
    this.sortedSets.clear();
  }
}
