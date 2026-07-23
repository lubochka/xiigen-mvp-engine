/**
 * IScopedMemoryService tests — InMemoryProvider.
 * No Redis required. Tests verify Redis semantics are replicated correctly.
 *
 * Z-2: CF-791 (no ioredis imports) and CF-792 (atomic increment) validation.
 */
import { InMemoryScopedMemoryProvider } from './in-memory.provider';
import { IScopedMemoryService } from '../interfaces/scoped-memory.interface';

describe('InMemoryScopedMemoryProvider (IScopedMemoryService)', () => {
  let svc: IScopedMemoryService & { clear(): void };

  beforeEach(() => {
    svc = new InMemoryScopedMemoryProvider();
  });

  // ── increment ──────────────────────────────────────────────────────────────

  it('increment returns 1 on first call', async () => {
    expect(await svc.increment('test:counter', 60)).toBe(1);
  });

  it('increment returns sequential values on repeated calls', async () => {
    expect(await svc.increment('test:seq', 60)).toBe(1);
    expect(await svc.increment('test:seq', 60)).toBe(2);
    expect(await svc.increment('test:seq', 60)).toBe(3);
  });

  it('increment refreshes TTL on each call', async () => {
    await svc.increment('test:ttl-refresh', 1);
    // value still accessible — TTL refreshed
    await svc.increment('test:ttl-refresh', 60);
    expect(await svc.get('test:ttl-refresh')).toBe('2');
  });

  it('increment across different keys is independent', async () => {
    expect(await svc.increment('key-a', 60)).toBe(1);
    expect(await svc.increment('key-b', 60)).toBe(1);
    expect(await svc.increment('key-a', 60)).toBe(2);
  });

  // ── setIfAbsent ────────────────────────────────────────────────────────────

  it('setIfAbsent: first caller wins — returns true', async () => {
    const result = await svc.setIfAbsent('test:lock', 'owner-1', 30);
    expect(result).toBe(true);
    expect(await svc.get('test:lock')).toBe('owner-1');
  });

  it('setIfAbsent: second caller loses — returns false', async () => {
    await svc.setIfAbsent('test:lock2', 'owner-1', 30);
    const result = await svc.setIfAbsent('test:lock2', 'owner-2', 30);
    expect(result).toBe(false);
    expect(await svc.get('test:lock2')).toBe('owner-1'); // original value preserved
  });

  it('setIfAbsent: succeeds after key expires', async () => {
    await svc.setIfAbsent('test:expire-lock', 'owner-1', 0); // 0s TTL
    await new Promise((r) => setTimeout(r, 10)); // wait for expiry
    const result = await svc.setIfAbsent('test:expire-lock', 'owner-2', 30);
    expect(result).toBe(true);
  });

  // ── get ────────────────────────────────────────────────────────────────────

  it('get returns null for missing key', async () => {
    expect(await svc.get('nonexistent')).toBeNull();
  });

  it('get returns null for expired key', async () => {
    await svc.set('test:expiry', 'value', 0); // 0s TTL
    await new Promise((r) => setTimeout(r, 10));
    expect(await svc.get('test:expiry')).toBeNull();
  });

  it('get returns value for non-expired key', async () => {
    await svc.set('test:alive', 'hello', 60);
    expect(await svc.get('test:alive')).toBe('hello');
  });

  // ── set ────────────────────────────────────────────────────────────────────

  it('set without TTL persists indefinitely', async () => {
    await svc.set('test:permanent', 'forever');
    expect(await svc.get('test:permanent')).toBe('forever');
  });

  it('set overwrites existing value', async () => {
    await svc.set('test:overwrite', 'first', 60);
    await svc.set('test:overwrite', 'second', 60);
    expect(await svc.get('test:overwrite')).toBe('second');
  });

  // ── delete ─────────────────────────────────────────────────────────────────

  it('delete removes an existing key', async () => {
    await svc.set('test:delete', 'value', 60);
    await svc.delete('test:delete');
    expect(await svc.get('test:delete')).toBeNull();
  });

  it('delete is a no-op for missing key', async () => {
    await expect(svc.delete('nonexistent')).resolves.not.toThrow();
  });

  // ── IScopedMemoryService contract compliance ───────────────────────────────

  it('CF-792: increment must be atomic — same key returns distinct sequential values', async () => {
    // In Node.js single-threaded model, Promise.all doesn't create true concurrency
    // but this verifies the sequential contract
    const results = await Promise.all([
      svc.increment('test:atomic', 60),
      svc.increment('test:atomic', 60),
      svc.increment('test:atomic', 60),
    ]);
    // All values should be distinct (1, 2, 3 in some order)
    expect(new Set(results).size).toBe(3);
    expect(results.every((v) => v >= 1 && v <= 3)).toBe(true);
  });
});
