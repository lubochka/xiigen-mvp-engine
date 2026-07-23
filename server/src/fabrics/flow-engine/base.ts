/**
 * Flow Engine Fabric — base types, enums, and config.
 *
 * FlowNodeType defines the 10 node types a flow DAG can contain.
 * FlowConfig controls orchestrator behavior (concurrency, timeouts, retries).
 * FlowStatus (re-exported) tracks the overall state of a flow run.
 *
 * Phase 5.1: Types only. Resolvers in P5.3. Modules in P5.4.
 */

// ── Re-export FlowStatus from existing orchestrator ──

export { FlowStatus } from './in-memory-orchestrator';

// ── Flow Node Type Enum ──────────────────────────────

/**
 * 10 node types that a flow DAG can contain.
 * Each maps to a different execution behavior in the orchestrator.
 */
export enum FlowNodeType {
  /** Flow entry point — first node executed. */
  START = 'start',
  /** Flow terminal — marks completion. */
  END = 'end',
  /** Standard task — execute a factory-resolved service. */
  TASK = 'task',
  /** Conditional branch — evaluate expression, route to next node. */
  DECISION = 'decision',
  /** Fork — split into parallel branches. */
  PARALLEL_SPLIT = 'parallel_split',
  /** Join — wait for all parallel branches to complete. */
  PARALLEL_JOIN = 'parallel_join',
  /** Wait for human approval before continuing. */
  HUMAN_APPROVAL = 'human_approval',
  /** Invoke AI Engine fabric for code generation / review. */
  AI_GENERATION = 'ai_generation',
  /** Emit or wait for a queue event (QUEUE FABRIC). */
  QUEUE_EVENT = 'queue_event',
  /** Execute another flow as a sub-flow. */
  SUBFLOW = 'subflow',
}

/** All valid flow node type values, for validation. */
export const ALL_FLOW_NODE_TYPES: readonly FlowNodeType[] = Object.values(FlowNodeType);

// ── Flow Config ──────────────────────────────────────

export interface FlowConfig {
  /** Maximum number of concurrent flow runs. */
  readonly maxConcurrentRuns: number;
  /** Timeout in seconds for individual node execution. */
  readonly nodeTimeoutSeconds: number;
  /** Maximum retries per node on failure. */
  readonly maxRetriesPerNode: number;
  /** Whether to record audit trail for every node transition. */
  readonly enableAuditTrail: boolean;
  /** Maximum DAG depth before rejecting as potential cycle. */
  readonly maxDagDepth: number;
  /** Additional options. */
  readonly options: Record<string, unknown>;
}

/** Sensible defaults for flow engine config. */
export function defaultFlowConfig(overrides?: Partial<FlowConfig>): FlowConfig {
  return {
    maxConcurrentRuns: 10,
    nodeTimeoutSeconds: 300,
    maxRetriesPerNode: 3,
    enableAuditTrail: true,
    maxDagDepth: 50,
    options: {},
    ...overrides,
  };
}

/** Check if a node type is valid. */
export function isValidNodeType(nodeType: string): nodeType is FlowNodeType {
  return ALL_FLOW_NODE_TYPES.includes(nodeType as FlowNodeType);
}

/** Serialize FlowConfig to dict (DNA-1). */
export function flowConfigToDict(config: FlowConfig): Record<string, unknown> {
  return {
    max_concurrent_runs: config.maxConcurrentRuns,
    node_timeout_seconds: config.nodeTimeoutSeconds,
    max_retries_per_node: config.maxRetriesPerNode,
    enable_audit_trail: config.enableAuditTrail,
    max_dag_depth: config.maxDagDepth,
    options: { ...config.options },
  };
}

/**
 * Check if a node type requires waiting for external input.
 * HUMAN_APPROVAL and QUEUE_EVENT can pause the flow.
 */
export function isWaitingNodeType(nodeType: FlowNodeType): boolean {
  return nodeType === FlowNodeType.HUMAN_APPROVAL || nodeType === FlowNodeType.QUEUE_EVENT;
}

/**
 * Check if a node type involves parallelism.
 */
export function isParallelNodeType(nodeType: FlowNodeType): boolean {
  return nodeType === FlowNodeType.PARALLEL_SPLIT || nodeType === FlowNodeType.PARALLEL_JOIN;
}
