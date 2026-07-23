import type { DataProcessResult } from '../../../kernel/data-process-result';

export interface GenerationLoopDocumentStore {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
  searchDocuments(
    index: string,
    filter: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

export interface GenerationLoopDocumentUpdater extends GenerationLoopDocumentStore {
  updateDocument(
    index: string,
    id: string,
    updates: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

export interface GenerationLoopQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}
