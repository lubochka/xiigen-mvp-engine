/**
 * FABRIC 5: IFlowDefinition + IFlowOrchestrator (Skills 08/09)
 *
 * Flow Engine Fabric — flow definitions are JSON DAGs stored in database.
 * Flow orchestrator reads DAG → executes step by step → events between steps.
 * Adding a flow = adding a JSON document, not writing orchestration code.
 *
 * v4: No tenant_id parameter. Read from CLS internally.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

/** Node execution status for flow tracking. */
export enum NodeStatus {
  PENDING = 'pending',
  RUNNING = 'running',
  COMPLETED = 'completed',
  FAILED = 'failed',
  SKIPPED = 'skipped',
  WAITING_FOR_USER = 'waiting_for_user',
  WAITING_FOR_ARBITER = 'waiting_for_arbiter',
  CANCELLED = 'cancelled',
}

/** Flow definition store — JSON DAGs. */
export abstract class IFlowDefinition {
  /** Load a flow definition (JSON DAG) from registry. */
  abstract loadFlow(
    flowId: string,
    version?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Save/update a flow definition. */
  abstract saveFlow(
    flowDefinition: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** List flow definitions with optional filters. */
  abstract listFlows(
    filters?: Record<string, unknown>,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;
}

/** Flow orchestrator — DAG execution engine. */
export abstract class IFlowOrchestrator {
  /** Start a flow run. Returns { run_id, status, first_node }. */
  abstract startFlow(
    flowId: string,
    inputData: Record<string, unknown>,
    correlationId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Execute a single node in a flow run. */
  abstract executeNode(
    runId: string,
    nodeId: string,
    inputData: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Get current status of a flow run (RunSnapshot). */
  abstract getRunStatus(runId: string): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Resume a flow from a waiting node (e.g., after human approval). */
  abstract resumeFlow(
    runId: string,
    nodeId: string,
    decision: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>>;

  /** Cancel a running flow. */
  abstract cancelFlow(runId: string, reason: string): Promise<DataProcessResult<boolean>>;
}

/** Injection tokens. */
export const FLOW_DEFINITION = Symbol('IFlowDefinition');
export const FLOW_ORCHESTRATOR = Symbol('IFlowOrchestrator');
