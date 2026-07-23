/**
 * Content-Addressable Storage Interfaces (DD-326 / CF-717)
 *
 * F1342 — IPackageContentStoreService: SHA-256 hash-keyed blob store.
 * F1353 — IContentHashService: SHA-256 hash computation.
 *
 * All marketplace artifact blobs must be stored by content hash, not UUID.
 * Guarantees: automatic deduplication + tamper detection.
 *
 * BFA: CF-717 — All artifact blob storage in the marketplace must be hash-keyed.
 * DD:  DD-326 — Content-addressable storage for artifact packages.
 */
import { DataProcessResult } from '../../kernel/data-process-result';

// ── F1342 — IPackageContentStoreService ──────────────────────────────────────

export const PACKAGE_CONTENT_STORE_SERVICE = 'PACKAGE_CONTENT_STORE_SERVICE';

/**
 * F1342 — IPackageContentStoreService
 *
 * SHA-256 hash-keyed blob store for marketplace artifact packages.
 * The hash IS the storage key — no UUID generated.
 * Idempotent: storing the same hash twice is a no-op.
 * Retrieval re-hashes content to verify tamper detection.
 */
export interface IPackageContentStoreService {
  /**
   * Stores content addressed by its SHA-256 hash.
   * Idempotent: storing the same hash twice is a no-op (CF-717 deduplication).
   * Returns the content ref (which equals the hash) and whether it was newly stored.
   */
  store(
    hash: string,
    content: Buffer | Uint8Array,
    metadata: Record<string, unknown>,
  ): Promise<
    DataProcessResult<{
      stored: boolean;
      ref: string; // equals hash — the content-addressable key
      duplicate: boolean; // true if content already existed at this hash
    }>
  >;

  /**
   * Retrieves content by its SHA-256 hash.
   * Returns the content buffer and original metadata.
   */
  retrieve(hash: string): Promise<
    DataProcessResult<{
      content: Buffer;
      metadata: Record<string, unknown>;
    }>
  >;

  /**
   * Verifies that stored content matches the expected hash.
   * Re-hashes retrieved content and compares to expectedHash.
   * Returns valid: true if content is untampered (CF-717 tamper detection).
   */
  verify(
    hash: string,
    expectedHash: string,
  ): Promise<
    DataProcessResult<{
      valid: boolean;
      actualHash: string;
    }>
  >;

  /**
   * Checks whether content with the given hash exists in the store.
   * Use before store() to avoid unnecessary transfer.
   */
  exists(hash: string): Promise<DataProcessResult<{ exists: boolean }>>;
}

// ── F1353 — IContentHashService ──────────────────────────────────────────────

export const CONTENT_HASH_SERVICE = 'CONTENT_HASH_SERVICE';

/**
 * F1353 — IContentHashService
 *
 * SHA-256 hash computation for marketplace artifact content.
 * Provides synchronous and async (stream) hash computation.
 * Never use crypto primitives directly — always go through this interface.
 */
export interface IContentHashService {
  /**
   * Computes SHA-256 hash of content buffer or string.
   * Returns hex-encoded hash string (64 characters).
   * Synchronous — no async overhead for small content.
   */
  hash(content: Buffer | Uint8Array | string): string;

  /**
   * Computes SHA-256 hash of a readable stream.
   * Returns hex-encoded hash string.
   * Async — used for large artifact packages.
   */
  hashStream(stream: NodeJS.ReadableStream): Promise<string>;

  /**
   * Verifies content matches an expected hash.
   * Returns true if hash(content) === expectedHash.
   */
  matches(content: Buffer | Uint8Array | string, expectedHash: string): boolean;
}
