import type { DataProcessResult } from '../../../kernel/data-process-result';

export interface Flow33DocumentStore {
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

export interface Flow33DocumentUpdater extends Flow33DocumentStore {
  updateDocument(
    index: string,
    id: string,
    updates: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

export interface Flow33Queue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface Flow33Ai {
  generate(prompt: string): Promise<DataProcessResult<string>>;
}

export interface Flow33FreedomConfig {
  get(key: string): Promise<DataProcessResult<unknown>>;
}

export interface Flow33RagSearcher {
  searchSimilar(
    index: string,
    query: string,
    topK: number,
  ): Promise<DataProcessResult<Record<string, unknown>[]>>;
}

export interface Flow33RagIndexer {
  indexDocument(index: string, doc: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface Flow33ContextPack {
  packId: string;
  familyId: string;
  tenantId?: string;
  sources?: string[];
  vectorResults: Record<string, unknown>[];
  graphEdges: Record<string, unknown>[];
  ttlExpiresAt?: string;
  assembledAt?: string;
}

export type Flow33ConsensusVerdict = 'APPROVED' | 'NEEDS_REVISION' | 'REJECTED';

export interface Flow33ArbiterResult {
  arbiterId: string;
  score?: number;
  passed: boolean;
  notes: string;
}

export interface Flow33ConsensusResult {
  verdict: Flow33ConsensusVerdict;
  verdicts: Flow33ArbiterResult[];
  passedCount?: number;
  totalCount?: number;
}

export interface Flow33BlastRadiusReport {
  reportId: string;
  familyId: string;
  tenantId: string;
  affectedFlows: string[];
  affectedFamilies: string[];
  blastRadius: number;
  computedAt?: string;
}

export interface Flow33EscalationBriefing {
  flowId: string;
  blastRadius: number;
  affectedFlows: string[];
  affectedFamilies: string[];
  promotionCase: 'CASE_B';
  options: {
    A: string;
    B: string;
    C: string;
  };
  requiresApproval: true;
}
