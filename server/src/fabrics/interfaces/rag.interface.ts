/**
 * FABRIC 4: IRagService (Skills 00a/00b)
 *
 * RAG Fabric — 7 strategies: Split, FanOut, Tiered, Hybrid, Graph, Vector, Multi.
 * Admin selects strategy via FREEDOM config.
 * Code uses IRagService.search(), never pinecone client directly.
 *
 * v4: No tenant_id parameter. Read from CLS internally.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export abstract class IRagService {
  /** Search for relevant documents/nodes. */
  abstract search(
    query: string,
    options?: {
      namespace?: string;
      filters?: Record<string, unknown>;
      topK?: number;
    },
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;

  /** Ingest documents into the RAG store. */
  abstract ingest(
    documents: Array<Record<string, unknown>>,
    namespace?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Build a ContextPack — structured bundle of relevant context. */
  abstract buildContextPack(
    query: string,
    contextType: string,
    filters?: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Delete vectors/documents matching filters. */
  abstract deleteByFilter(
    namespace: string,
    filters: Record<string, unknown>,
  ): Promise<DataProcessResult<number>>;
}

/** Injection token for IRagService. */
export const RAG_SERVICE = Symbol('IRagService');
