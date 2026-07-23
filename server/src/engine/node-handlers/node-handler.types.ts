/**
 * Shared types for all node handlers in the XIIGen engine pipeline.
 *
 * NodeHandlerContext carries everything a handler needs to process one node
 * in a flow topology without coupling to specific implementations.
 */

import { DataProcessResult } from '../../kernel/data-process-result';
import { EngineContract } from '../../engine-contracts/contract-schema';

/** A single key-value pair produced by a prior node in the trace. */
export interface NodeOutput {
  nodeType: string;
  data: Record<string, unknown>;
}

/** Context passed to every node handler during execution. */
export interface NodeHandlerContext {
  /** The engine contract for the current task type. */
  contract: EngineContract;
  /** Unique execution run identifier. */
  runId: string;
  /** Flow identifier. */
  flowId: string;
  /** Task type identifier. */
  taskTypeId: string;
  /** Tenant identifier (for scoping). */
  tenantId: string;
  /** Input data (event payload or prior node output). */
  inputs: Record<string, unknown>;
  /** Accumulated outputs from previous nodes in this run. */
  priorOutputs: NodeOutput[];
  /** Arbitrary node-level configuration from the topology. */
  nodeConfig?: Record<string, unknown>;

  // ── D-0c: Stack routing ──────────────────────────────────────────────────────
  /**
   * Optional stack target — routes HybridGenesisPrompt to the matching
   * stackImplementations entry. Defaults to 'node-nestjs:server'.
   * Format: '{stackType}:{side}' — e.g. 'node-nestjs:server', 'php-wordpress:server'.
   */
  stackTarget?: string;

  // ── Z-1: Runtime context ────────────────────────────────────────────────────
  /**
   * Project ID for PROJECT_UNDERSTANDING lookup.
   * When present, AF-1 derives context from intake output (SESSION-O-4).
   * No stack-label strings — context comes from what the system IS.
   */
  projectId?: string;
  /**
   * Explicit provider overrides for ad-hoc executions.
   * Values are provider names ('redis', 'bull'), never stack labels.
   * Used when no PROJECT_UNDERSTANDING exists yet.
   */
  runtimeHints?: {
    memoryProvider?: string; // e.g. 'redis' | 'in_memory'
    schedulerProvider?: string; // e.g. 'bull' | 'action-scheduler' | 'hangfire'
    repositoryProvider?: string; // e.g. 'github' | 'gitlab' | 'zip_archive'
    [interfaceName: string]: string | undefined;
  };
  /**
   * Providers that actually activated during this run.
   * Populated by the fabric layer as providers resolve.
   * Used by feedback.handler to record actual runtime context in DPO triples.
   */
  resolvedProviders?: Record<string, string>;

  // ── T581: Flow pool write/query ──────────────────────────────────────────
  /**
   * Write a pool entry for this node execution.
   * Non-blocking — failure is logged but never propagates to the node.
   * Injected by GenericNodeExecutor from FlowPoolWriterService.
   */
  writeToPool?: (
    input: import('../flow-pool/flow-pool-entry.types').FlowPoolEntryInput,
  ) => Promise<void>;
  /**
   * Query prior pool entries for this run (scoped to runId + tenantId).
   * Used by context-query.handler for gap enrichment (T582).
   */
  queryPool?: (options?: {
    nodeType?: string;
    successOnly?: boolean;
  }) => Promise<import('../flow-pool/flow-pool-entry.types').FlowPoolEntry[]>;
}

/** What a node handler returns after processing. */
export interface NodeHandlerResult {
  /** Enriched data produced by this node. */
  data: Record<string, unknown>;
  /** Optional metadata for trace recording. */
  meta?: Record<string, unknown>;
}

/** Interface all node handlers must implement. */
export interface INodeHandler {
  /** The node type this handler processes (e.g., 'rag-retrieve'). */
  readonly nodeType: string;
  /** Execute the handler with the given context. */
  handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>>;
}

// ─── Multi-model comparison result ──────────────────────────────────────────

/**
 * Records which model won/lost in blind multi-model judging.
 * Written into the DPO triple so training data tracks which model produced
 * chosen/rejected outputs and the judge's scores.
 */
export interface ModelComparisonResult {
  chosen: { model: string; score: number };
  rejected: { model: string; score: number } | null;
  discarded: { model: string; score: number } | null;
  judgeModel: string;
  shuffleWasApplied: boolean;
}

// ─── SESSION-P-2: collect.handler types ────────────────────────────────────

/**
 * Configuration for a collect topology node (fan-out/fan-in).
 *
 * CF-810: collect.handler must not block the event loop while waiting.
 * CF-811: Each parallel branch runs in its own execution context.
 * CF-812: Collected result must include successCount and failureCount.
 */
export interface CollectNodeConfig {
  fanOut: {
    /** 'inputArray' = iterate over the inputs array; string[] = use specific node output IDs */
    source: 'inputArray' | string[];
    /** The handler nodeType to invoke for each item (e.g. 'ai-generate') */
    handler: string;
    /** Maximum concurrent branches; default 5 */
    maxParallel?: number;
  };
  fanIn: {
    /** Result merge strategy: array = concat, object = deep merge, custom = return array */
    merge: 'array' | 'object' | 'custom';
    /** Timeout in ms covering ALL branches; default 30000 */
    timeout?: number;
    /** What to do when a branch fails: fail_all = throw; use_available = emit partial result */
    partialFailurePolicy?: 'fail_all' | 'use_available';
  };
}

/** Result produced by a collect node after fan-in. CF-812. */
export interface CollectResult {
  /** Merged output from all successful branches */
  collected: unknown;
  /** Number of branches that succeeded */
  successCount: number;
  /** Number of branches that failed or timed out */
  failureCount: number;
  /** Details of each failure (index + reason) */
  failures: Array<{ index: number; reason: string }>;
}

// ─── SESSION-P-3: loop.handler types ───────────────────────────────────────

/**
 * Configuration for a loop topology node (iterative convergence).
 *
 * CF-813: loop.handler must track iteration count and enforce maxIterations.
 * CF-814: Context accumulator must not grow unboundedly (cap at 10 iterations).
 * CF-815: Condition expression must be safely evaluated (no eval()).
 */
export interface LoopNodeConfig {
  /** Ordered list of handler types to execute per iteration */
  body: string[];
  /**
   * Dot-path expression evaluated on last body node's output.
   * Simple: "converged" (truthy check)
   * Comparison: "score >= 0.85" (numeric comparison)
   */
  condition: string;
  /** Hard iteration ceiling; default 5 */
  maxIterations?: number;
  /** How to accumulate context across iterations: append = grow, replace = only latest */
  contextAccumulator?: 'append' | 'replace';
  /** What to do when maxIterations reached without convergence */
  onMaxReached?: 'use_last' | 'fail' | 'use_best';
}

/** Result produced by a loop node after convergence or max iterations. */
export interface LoopResult {
  /** Output from the convergence iteration (or selected by onMaxReached policy) */
  result: unknown;
  /** Actual number of iterations executed */
  iterations: number;
  /** Whether the condition was met */
  converged: boolean;
  /** The condition expression evaluated */
  condition: string;
}
