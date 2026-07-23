/**
 * InMemory Flow Orchestrator — IFlowOrchestrator implementation.
 * Reads JSON DAG from IFlowDefinition, executes step by step.
 * Tracks node statuses (NodeStatus enum), supports resume from waiting nodes.
 *
 * v4: No tenant_id parameter. Reads TenantContext from CLS.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import {
  IFlowOrchestrator,
  IFlowDefinition,
  NodeStatus,
} from '../interfaces/flow-orchestrator.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';

/** Flow-level status (distinct from NodeStatus). */
export enum FlowStatus {
  RUNNING = 'running',
  PAUSED = 'paused',
  COMPLETED = 'completed',
  FAILED = 'failed',
  CANCELLED = 'cancelled',
}

@Injectable()
export class InMemoryFlowOrchestrator extends IFlowOrchestrator {
  /** run_id → run state */
  private readonly runs = new Map<string, Record<string, unknown>>();

  constructor(
    private readonly cls: ClsService,
    private readonly flowStore: IFlowDefinition,
  ) {
    super();
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  async startFlow(
    flowId: string,
    inputData: Record<string, unknown>,
    correlationId?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (!flowId) return DataProcessResult.failure('MISSING_FLOW_ID', 'flow_id required');

    // Load flow definition
    const flowResult = await this.flowStore.loadFlow(flowId);
    if (!flowResult.isSuccess) {
      return DataProcessResult.failure(
        'FLOW_NOT_FOUND',
        `Cannot load flow ${flowId}: ${flowResult.errorMessage}`,
      );
    }

    const flowDef = flowResult.data!;
    const nodes = (flowDef['nodes'] ?? []) as Array<Record<string, unknown>>;
    if (nodes.length === 0) {
      return DataProcessResult.failure('EMPTY_FLOW', 'Flow has no nodes');
    }

    const runId = randomUUID();
    const now = new Date().toISOString();

    // Find start node
    let startNode = nodes.find((n) => n['type'] === 'start' || n['is_start'] === true);
    if (!startNode) startNode = nodes[0];
    const startNodeId = (startNode['node_id'] ?? startNode['id'] ?? randomUUID()) as string;

    // Initialize node statuses
    const nodeStatuses: Record<string, Record<string, unknown>> = {};
    for (const n of nodes) {
      const nid = (n['node_id'] ?? n['id'] ?? randomUUID()) as string;
      nodeStatuses[nid] = {
        status: NodeStatus.PENDING,
        input: null,
        output: null,
        started_at: null,
        completed_at: null,
      };
    }

    const runState: Record<string, unknown> = {
      run_id: runId,
      flow_id: flowId,
      tenant_id: tenantId,
      correlation_id: correlationId ?? runId,
      status: FlowStatus.RUNNING,
      flow_definition: flowDef,
      input_data: structuredClone(inputData),
      node_statuses: nodeStatuses,
      current_node: startNodeId,
      started_at: now,
      updated_at: now,
      completed_at: null,
      result: null,
      error: null,
    };

    this.runs.set(runId, runState);

    return DataProcessResult.success({
      run_id: runId,
      status: FlowStatus.RUNNING,
      first_node: startNodeId,
      correlation_id: runState['correlation_id'],
    });
  }

  async executeNode(
    runId: string,
    nodeId: string,
    inputData: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const run = this.runs.get(runId);
    if (!run) return DataProcessResult.failure('RUN_NOT_FOUND', `Run ${runId} not found`);
    if (run['tenant_id'] !== tenantId)
      return DataProcessResult.failure('TENANT_MISMATCH', 'Run belongs to different tenant');

    const status = run['status'] as string;
    if (status !== FlowStatus.RUNNING && status !== FlowStatus.PAUSED) {
      return DataProcessResult.failure('RUN_NOT_ACTIVE', `Run status is ${status}`);
    }

    const nodeStatuses = run['node_statuses'] as Record<string, Record<string, unknown>>;
    const ns = nodeStatuses[nodeId];
    if (!ns) return DataProcessResult.failure('NODE_NOT_FOUND', `Node ${nodeId} not in flow`);

    const now = new Date().toISOString();
    ns['status'] = NodeStatus.RUNNING;
    ns['input'] = structuredClone(inputData);
    ns['started_at'] = now;
    run['current_node'] = nodeId;
    run['updated_at'] = now;

    // Find node definition
    const flowDef = run['flow_definition'] as Record<string, unknown>;
    const nodes = (flowDef['nodes'] ?? []) as Array<Record<string, unknown>>;
    const nodeDef = nodes.find((n) => (n['node_id'] ?? n['id']) === nodeId);
    const nodeType = (nodeDef?.['type'] as string) ?? 'task';

    // Human approval → pause
    if (nodeType === 'human_approval') {
      ns['status'] = NodeStatus.WAITING_FOR_USER;
      run['status'] = FlowStatus.PAUSED;
      return DataProcessResult.success({
        node_id: nodeId,
        status: NodeStatus.WAITING_FOR_USER,
        message: 'Waiting for human approval',
      });
    }

    // Default: complete the node
    const output: Record<string, unknown> = {
      node_id: nodeId,
      processed: true,
      input_echo: inputData,
    };
    if (nodeDef?.['handler']) output['handler'] = nodeDef['handler'];

    ns['status'] = NodeStatus.COMPLETED;
    ns['output'] = output;
    ns['completed_at'] = now;

    // Find next nodes
    const nextNodes = this.findNextNodes(flowDef, nodeId);

    // Check flow completion
    if (nextNodes.length === 0 || nodeType === 'end') {
      run['status'] = FlowStatus.COMPLETED;
      run['completed_at'] = now;
      run['result'] = output;
    }

    return DataProcessResult.success({
      node_id: nodeId,
      status: ns['status'],
      output,
      next_nodes: nextNodes,
    });
  }

  async getRunStatus(runId: string): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const run = this.runs.get(runId);
    if (!run) return DataProcessResult.failure('RUN_NOT_FOUND', `Run ${runId} not found`);
    if (run['tenant_id'] !== tenantId)
      return DataProcessResult.failure('TENANT_MISMATCH', 'Run belongs to different tenant');

    return DataProcessResult.success({
      run_id: runId,
      flow_id: run['flow_id'],
      status: run['status'],
      current_node: run['current_node'],
      node_statuses: structuredClone(run['node_statuses']),
      started_at: run['started_at'],
      updated_at: run['updated_at'],
      completed_at: run['completed_at'],
      correlation_id: run['correlation_id'],
    });
  }

  async resumeFlow(
    runId: string,
    nodeId: string,
    decision: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const run = this.runs.get(runId);
    if (!run) return DataProcessResult.failure('RUN_NOT_FOUND', `Run ${runId} not found`);
    if (run['tenant_id'] !== tenantId)
      return DataProcessResult.failure('TENANT_MISMATCH', 'Run belongs to different tenant');

    const nodeStatuses = run['node_statuses'] as Record<string, Record<string, unknown>>;
    const ns = nodeStatuses[nodeId];
    if (!ns) return DataProcessResult.failure('NODE_NOT_FOUND', `Node ${nodeId} not found`);
    if (ns['status'] !== NodeStatus.WAITING_FOR_USER) {
      return DataProcessResult.failure(
        'NOT_WAITING',
        `Node ${nodeId} is not waiting (status: ${ns['status']})`,
      );
    }

    const now = new Date().toISOString();
    ns['status'] = NodeStatus.COMPLETED;
    ns['output'] = { decision, resumed_at: now };
    ns['completed_at'] = now;
    run['status'] = FlowStatus.RUNNING;
    run['updated_at'] = now;

    const flowDef = run['flow_definition'] as Record<string, unknown>;
    const nextNodes = this.findNextNodes(flowDef, nodeId);

    return DataProcessResult.success({
      node_id: nodeId,
      status: NodeStatus.COMPLETED,
      decision,
      next_nodes: nextNodes,
    });
  }

  async cancelFlow(runId: string, reason: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const run = this.runs.get(runId);
    if (!run) return DataProcessResult.failure('RUN_NOT_FOUND', `Run ${runId} not found`);
    if (run['tenant_id'] !== tenantId)
      return DataProcessResult.failure('TENANT_MISMATCH', 'Run belongs to different tenant');

    const status = run['status'] as string;
    if (status === FlowStatus.COMPLETED || status === FlowStatus.CANCELLED) {
      return DataProcessResult.failure('RUN_TERMINAL', `Run already in terminal state: ${status}`);
    }

    const now = new Date().toISOString();
    run['status'] = FlowStatus.CANCELLED;
    run['completed_at'] = now;
    run['updated_at'] = now;
    run['error'] = reason;

    const nodeStatuses = run['node_statuses'] as Record<string, Record<string, unknown>>;
    for (const ns of Object.values(nodeStatuses)) {
      if (ns['status'] === NodeStatus.PENDING || ns['status'] === NodeStatus.RUNNING) {
        ns['status'] = NodeStatus.CANCELLED;
      }
    }

    return DataProcessResult.success(true);
  }

  private findNextNodes(flowDef: Record<string, unknown>, nodeId: string): string[] {
    const edges = (flowDef['edges'] ?? []) as Array<Record<string, unknown>>;
    return edges.filter((e) => e['source'] === nodeId).map((e) => e['target'] as string);
  }

  // ── Testing helpers ─────────────────────────────────

  get activeRuns(): number {
    let count = 0;
    for (const run of this.runs.values()) {
      if (run['status'] === FlowStatus.RUNNING) count++;
    }
    return count;
  }

  get totalRuns(): number {
    return this.runs.size;
  }

  clear(): void {
    this.runs.clear();
  }
}
