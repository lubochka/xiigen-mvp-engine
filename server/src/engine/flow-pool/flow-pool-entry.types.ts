/**
 * Types for the shared flow pool execution context store.
 *
 * Every node in every run writes a FlowPoolEntry to xiigen-flow-pool.
 * context-query.handler reads from this store when an arbiter needs gap enrichment.
 *
 * SESSION-T581: Flow Pool Writer — shared execution context store.
 */

/** Execution phase classification by node type. */
export type FlowPoolPhase =
  | 'RAG_RETRIEVE'
  | 'DECOMPOSE'
  | 'AI_GENERATE'
  | 'VALIDATE'
  | 'SCORE'
  | 'FEEDBACK'
  | 'ROUTE'
  | 'COLLECT'
  | 'LOOP'
  | 'UNKNOWN';

/** Maps nodeType strings to FlowPoolPhase. */
export const NODETYPE_TO_PHASE: Record<string, FlowPoolPhase> = {
  'rag-retrieve': 'RAG_RETRIEVE',
  decompose: 'DECOMPOSE',
  'ai-generate': 'AI_GENERATE',
  'multi-generate': 'AI_GENERATE',
  validate: 'VALIDATE',
  score: 'SCORE',
  feedback: 'FEEDBACK',
  route: 'ROUTE',
  collect: 'COLLECT',
  loop: 'LOOP',
};

/** A prompt record within a pool entry. */
export interface PoolPromptRecord {
  promptId: string;
  version: string;
  templateHash?: string;
}

/** A judge decision record within a pool entry. */
export interface PoolJudgeRecord {
  judgeId: string;
  verdict: 'PASS' | 'FAIL' | 'BLOCK' | 'ESCALATE';
  score: number;
  notes?: string;
}

/** An arbiter decision record within a pool entry. */
export interface PoolArbiterRecord {
  arbiterId: string;
  verdict: 'PASS' | 'FAIL' | 'BLOCK';
  score: number;
  notes?: string;
}

/** A context block reference in a pool entry. */
export interface PoolContextBlock {
  blockId: string;
  targetArbiterId: string;
  injected: boolean;
}

/** Full schema for a flow pool entry (maps to xiigen-flow-pool index). */
export interface FlowPoolEntry {
  entryId: string;
  runId: string;
  flowId: string;
  tenantId: string;
  nodeId: string;
  nodeType: string;
  taskTypeId: string;
  executionPhase: FlowPoolPhase;
  sequenceIndex: number;
  success: boolean;
  failureReason?: string;
  inputs: Record<string, unknown>;
  outputs: Record<string, unknown>;
  promptsUsed: PoolPromptRecord[];
  judgeDecisions: PoolJudgeRecord[];
  arbiterDecisions: PoolArbiterRecord[];
  contextGapsEmitted: string[];
  contextBlocksReceived: string[];
  executedAt: string;
  durationMs: number;
}

/** Input for creating a new flow pool entry (entryId + executedAt auto-assigned). */
export type FlowPoolEntryInput = Omit<FlowPoolEntry, 'entryId' | 'executedAt'>;

/** Full schema for a context block (maps to xiigen-context-blocks index). */
export interface ContextBlock {
  blockId: string;
  runId: string;
  tenantId: string;
  targetArbiterId: string;
  iterationNumber: number;
  gapDescription: string;
  queryFormulated: string;
  sourceEntryIds: string[];
  synthesizedContext: string;
  injectedBefore: string;
  confidence: number;
  verdictBefore: string;
  verdictAfter?: string;
  budgetCallsAtWrite: number;
  createdAt: string;
}
