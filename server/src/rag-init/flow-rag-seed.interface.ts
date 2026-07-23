/**
 * IFlowRagSeed — contract for per-module RAG pattern seeding.
 * P21: Bootstrap Phase 8 (MODULE_SEEDING) calls seedAll() on every seed class.
 * Every module MUST ship a {domain}.rag-seed.ts implementing this interface.
 */
import { DataProcessResult } from '../kernel/data-process-result';

export interface IFlowRagSeed {
  readonly domainId: string;
  indexPatterns(): Promise<DataProcessResult<number>>;
  indexBfaRules(): Promise<DataProcessResult<number>>;
  indexDesignRecords(): Promise<DataProcessResult<number>>;
  seedAll(): Promise<DataProcessResult<number>>;
}
