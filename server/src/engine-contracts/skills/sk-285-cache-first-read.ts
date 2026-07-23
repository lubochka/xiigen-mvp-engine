import { DataProcessResult } from '../../kernel/data-process-result';

// ── SK-285: CacheFirstReadPattern ──────────────────────────────────────────
// MINIMAL_CANDIDATE / CORE CANDIDATE
// This skill has NO flow-specific references. It is injectable by any flow
// that needs cache-first read semantics.
// ──────────────────────────────────────────────────────────────────────────

export interface ICacheReader {
  get(key: string): Promise<DataProcessResult<Record<string, unknown> | null>>;
}

export interface ICacheWriter {
  set(
    key: string,
    value: Record<string, unknown>,
    options: CacheWriteOptions,
  ): Promise<DataProcessResult<void>>;
}

export interface CacheWriteOptions {
  ttl: number; // seconds
  tags: string[]; // for tag-based invalidation
}

export interface CacheFirstReadConfig {
  ttl: number; // From FREEDOM config — consumer provides this
}

export type DbReaderFn = (key: string) => Promise<DataProcessResult<Record<string, unknown>>>;
export type CacheKeyBuilderFn = (lookupKey: string) => string;
export type CacheTagBuilderFn = (lookupKey: string, data: Record<string, unknown>) => string[];

export interface CacheFirstReadDependencies {
  cacheReader: ICacheReader;
  cacheWriter: ICacheWriter;
  dbReader: DbReaderFn;
  keyBuilder: CacheKeyBuilderFn;
  tagBuilder: CacheTagBuilderFn;
  config: CacheFirstReadConfig;
}

/**
 * SK-285: Cache-First Read Pattern
 *
 * Algorithm:
 * 1. Check cache (using keyBuilder for tenant-scoped key)
 * 2. HIT: return cached value
 * 3. MISS: read from DB
 * 4. Populate cache with DB result + tags (synchronous — not fire-and-forget)
 * 5. Return DB result
 *
 * Non-fatal: cache read failure falls through to DB; cache write failure logs and continues.
 */
export async function cacheFirstRead(
  lookupKey: string,
  deps: CacheFirstReadDependencies,
): Promise<DataProcessResult<Record<string, unknown>>> {
  // Step 1: Build tenant-scoped cache key
  const cacheKey = deps.keyBuilder(lookupKey);

  // Step 2: Attempt cache read (non-fatal on failure)
  try {
    const cached = await deps.cacheReader.get(cacheKey);
    if (cached.isSuccess && cached.data !== null) {
      return DataProcessResult.success(cached.data as Record<string, unknown>);
    }
  } catch (_cacheReadErr) {
    // Cache read error is non-fatal — fall through to DB
    // Logger not injected to keep skill generic — consumer logs if needed
  }

  // Step 3: Cache miss — read from DB
  const dbResult = await deps.dbReader(lookupKey);
  if (!dbResult.isSuccess) {
    return dbResult; // Propagate DB failure
  }

  // Step 4: Build cache tags
  const tags = deps.tagBuilder(lookupKey, dbResult.data!);

  // Step 5: Populate cache (synchronous — ensures next request hits cache)
  try {
    await deps.cacheWriter.set(cacheKey, dbResult.data!, {
      ttl: deps.config.ttl,
      tags,
    });
  } catch (_cacheWriteErr) {
    // Cache write error is non-fatal — DB result still returned
  }

  // Step 6: Return DB result
  return DataProcessResult.success(dbResult.data!);
}
