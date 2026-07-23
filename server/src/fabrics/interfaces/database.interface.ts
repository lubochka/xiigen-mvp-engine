/**
 * FABRIC 1: IDatabaseService (Skill 05)
 *
 * Database Fabric — 6 providers resolved at runtime via config.
 * Service code NEVER imports a specific DB driver.
 * All methods return DataProcessResult<T>.
 * BuildSearchFilter skips empty fields automatically (DNA-2).
 *
 * v4 Change: No tenant_id parameter. Providers read TenantContext
 * from AsyncLocalStorage internally. Callers cannot forget tenant scoping.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

// ── OCC (Optimistic Concurrency Control) types ──────────────────────────────

export interface OccOptions {
  ifSeqNo: number;
  ifPrimaryTerm: number;
}

export interface DocumentWithVersion<T = Record<string, unknown>> {
  doc: T;
  seqNo: number;
  primaryTerm: number;
}

// ────────────────────────────────────────────────────────────────────────────

export abstract class IDatabaseService {
  /** Store a document. Returns stored doc with generated _id. */
  abstract storeDocument(
    index: string,
    document: Record<string, unknown>,
    docId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Search documents with auto-filtered criteria (DNA-2). */
  abstract searchDocuments(
    index: string,
    filters: Record<string, unknown>,
    size?: number,
    fromOffset?: number,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;

  /** Get a single document by ID. */
  abstract getDocument(
    index: string,
    docId: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Delete a document by ID. */
  abstract deleteDocument(index: string, docId: string): Promise<DataProcessResult<boolean>>;

  /** Bulk store documents. Returns success/failure counts. */
  abstract bulkStore(
    index: string,
    documents: Array<Record<string, unknown>>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Count documents matching filters. */
  abstract countDocuments(
    index: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<number>>;

  /**
   * Creates an Elasticsearch index with the given mappings if it does not already exist.
   * Idempotent — calling this when the index already exists is a no-op.
   * @param indexName - The name of the Elasticsearch index to create.
   * @param mappings - The Elasticsearch mappings object (properties block).
   */
  abstract ensureIndex(indexName: string, mappings: Record<string, unknown>): Promise<void>;

  /**
   * Read document with version metadata (for OCC read-modify-write operations).
   * Returns seqNo + primaryTerm for use with storeDocumentWithOCC().
   */
  abstract getDocumentWithVersion(
    index: string,
    id: string,
  ): Promise<DataProcessResult<DocumentWithVersion>>;

  /**
   * Write document with optimistic lock (fails if document changed since read).
   * Returns OCC_CONFLICT (409) if another writer modified the document first.
   * Retry with a fresh read after OCC_CONFLICT.
   */
  abstract storeDocumentWithOCC(
    index: string,
    doc: Record<string, unknown>,
    id: string,
    occ: OccOptions,
  ): Promise<DataProcessResult<{ seqNo: number; primaryTerm: number }>>;
}

/** Injection token for IDatabaseService. */
export const DATABASE_SERVICE = Symbol('IDatabaseService');
