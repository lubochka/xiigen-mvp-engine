/**
 * Content-Addressable Storage interfaces (DD-326 / CF-717) tests
 * GAP-32-02: F1342 (IPackageContentStoreService) + F1353 (IContentHashService)
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import type {
  IPackageContentStoreService,
  IContentHashService,
} from '../content-addressable-storage.interface';

// ── In-memory IPackageContentStoreService for testing ───────────────────────

function createInMemoryContentStore(): IPackageContentStoreService {
  const store = new Map<string, { content: Buffer; metadata: Record<string, unknown> }>();
  return {
    async store(hash, content, metadata) {
      const existing = store.has(hash);
      if (!existing) {
        store.set(hash, {
          content: Buffer.isBuffer(content) ? content : Buffer.from(content),
          metadata,
        });
      }
      return DataProcessResult.success({ stored: !existing, ref: hash, duplicate: existing });
    },
    async retrieve(hash) {
      const entry = store.get(hash);
      if (!entry) {
        return DataProcessResult.failure('NOT_FOUND', `No content at hash ${hash}`);
      }
      return DataProcessResult.success({ content: entry.content, metadata: entry.metadata });
    },
    async verify(hash, expectedHash) {
      const entry = store.get(hash);
      if (!entry) {
        return DataProcessResult.failure('NOT_FOUND', `No content at hash ${hash}`);
      }
      return DataProcessResult.success({ valid: hash === expectedHash, actualHash: hash });
    },
    async exists(hash) {
      return DataProcessResult.success({ exists: store.has(hash) });
    },
  };
}

// ── In-memory IContentHashService for testing ────────────────────────────────

import { createHash } from 'crypto';

function createInMemoryContentHashService(): IContentHashService {
  return {
    hash(content) {
      const buf = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content);
      return createHash('sha256').update(buf).digest('hex');
    },
    async hashStream(stream) {
      return new Promise<string>((resolve, reject) => {
        const hasher = createHash('sha256');
        stream.on('data', (chunk) => hasher.update(chunk as Buffer));
        stream.on('end', () => resolve(hasher.digest('hex')));
        stream.on('error', reject);
      });
    },
    matches(content, expectedHash) {
      const buf = typeof content === 'string' ? Buffer.from(content) : Buffer.from(content);
      const actual = createHash('sha256').update(buf).digest('hex');
      return actual === expectedHash;
    },
  };
}

describe('IPackageContentStoreService (F1342 — DD-326 / CF-717)', () => {
  let store: IPackageContentStoreService;
  let hasher: IContentHashService;

  beforeEach(() => {
    store = createInMemoryContentStore();
    hasher = createInMemoryContentHashService();
  });

  it('exposes store(), retrieve(), verify(), exists() methods', () => {
    expect(typeof store.store).toBe('function');
    expect(typeof store.retrieve).toBe('function');
    expect(typeof store.verify).toBe('function');
    expect(typeof store.exists).toBe('function');
  });

  it('does NOT have update() method — immutable content-addressed store', () => {
    expect((store as unknown as Record<string, unknown>).update).toBeUndefined();
  });

  it('stores content with hash key and returns stored:true on first store', async () => {
    const content = Buffer.from('hello marketplace');
    const hash = hasher.hash(content);
    const result = await store.store(hash, content, { packageId: 'pkg-1' });
    expect(result.isSuccess).toBe(true);
    expect(result.data?.stored).toBe(true);
    expect(result.data?.ref).toBe(hash);
    expect(result.data?.duplicate).toBe(false);
  });

  it('is idempotent — same hash second store returns duplicate:true', async () => {
    const content = Buffer.from('same content twice');
    const hash = hasher.hash(content);
    await store.store(hash, content, { packageId: 'pkg-1' });
    const second = await store.store(hash, content, { packageId: 'pkg-1' });
    expect(second.data?.duplicate).toBe(true);
    expect(second.data?.stored).toBe(false);
  });

  it('exists() returns false before store and true after store', async () => {
    const content = Buffer.from('test artifact');
    const hash = hasher.hash(content);
    const before = await store.exists(hash);
    expect(before.data?.exists).toBe(false);
    await store.store(hash, content, {});
    const after = await store.exists(hash);
    expect(after.data?.exists).toBe(true);
  });

  it('retrieves stored content by hash', async () => {
    const content = Buffer.from('retrievable artifact');
    const hash = hasher.hash(content);
    await store.store(hash, content, { version: '1.0.0' });
    const result = await store.retrieve(hash);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.metadata['version']).toBe('1.0.0');
  });

  it('verify returns valid:true when hash matches', async () => {
    const content = Buffer.from('verifiable content');
    const hash = hasher.hash(content);
    await store.store(hash, content, {});
    const result = await store.verify(hash, hash);
    expect(result.data?.valid).toBe(true);
  });
});

describe('IContentHashService (F1353 — DD-326)', () => {
  let hasher: IContentHashService;

  beforeEach(() => {
    hasher = createInMemoryContentHashService();
  });

  it('exposes hash(), hashStream(), matches() methods', () => {
    expect(typeof hasher.hash).toBe('function');
    expect(typeof hasher.hashStream).toBe('function');
    expect(typeof hasher.matches).toBe('function');
  });

  it('hash() returns 64-character hex string (SHA-256)', () => {
    const result = hasher.hash(Buffer.from('test'));
    expect(result).toMatch(/^[a-f0-9]{64}$/);
  });

  it('same content produces same hash (content-addressable)', () => {
    const content = Buffer.from('deterministic content');
    expect(hasher.hash(content)).toBe(hasher.hash(content));
  });

  it('different content produces different hash', () => {
    const h1 = hasher.hash(Buffer.from('content A'));
    const h2 = hasher.hash(Buffer.from('content B'));
    expect(h1).not.toBe(h2);
  });

  it('matches() returns true for correct hash', () => {
    const content = Buffer.from('matchable content');
    const hash = hasher.hash(content);
    expect(hasher.matches(content, hash)).toBe(true);
  });

  it('matches() returns false for wrong hash', () => {
    const content = Buffer.from('matchable content');
    expect(hasher.matches(content, 'wrong-hash')).toBe(false);
  });
});
