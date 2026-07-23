/**
 * TopologyController — serves flow topology contracts + run state.
 *
 * Extends TopologyStore (which reads from xiigen-flow-definitions).
 * Node schema: id, name, type (VALIDATION|ANALYSIS|GOVERNANCE|EMIT), description
 * Edge schema: from, to, condition?, type? (terminal|terminal-success)
 *
 * GET /api/topology/:flowId
 *   Returns all topology records for the given flowId (from xiigen-flow-definitions).
 *
 * GET /api/topology/:flowId/run/:runId
 *   Returns topology + assembled run state from xiigen-run-state and xiigen-training-data.
 *
 * Phase 3: Static mode only (no SSE — FLOW-40 not available).
 * DNA-3: never throws — returns error object on failure.
 */

import {
  Controller,
  Get,
  Param,
  Query,
  HttpCode,
  HttpStatus,
  Inject,
  Optional,
} from '@nestjs/common';
import { TopologyStore } from '../engine/topology-store';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
// Track 0 Turn 7 (v22 Finding BB + v22 Finding CC): @Optional() bridge to TenantTopologyStore
import { TenantTopologyStore } from '../engine/tenant-topology-store';
import { TopologyResponseMapper } from './topology-response.mapper';

export interface DpoTriple {
  round: number;
  stepText: string;
  chosen: { model: string; score: number };
  rejected: { model: string; score: number };
  discarded: { model: string; score: number } | null;
}

export interface RunSuspension {
  id: string;
  nodeId: string;
  gapDescription: string;
  gapRequest: string[];
}

export interface SubFlowRef {
  id: string;
  parentNodeId: string;
  childRunId: string;
  status: string;
}

export interface NodeStateEntry {
  status: 'PENDING' | 'RUNNING' | 'COMPLETE' | 'SUSPENDED' | 'EXPANDED';
}

export interface RunState {
  nodeStates: Record<string, NodeStateEntry>;
  cycle2Traces: DpoTriple[];
  cycle3Traces: Array<Record<string, unknown>>;
  subFlows: SubFlowRef[];
  suspensions: RunSuspension[];
}

@Controller('api/topology')
export class TopologyController {
  constructor(
    private readonly topologyStore: TopologyStore,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    // Track 0 Turn 7 (v22 Finding BB): @Optional() so existing 2-arg test
    // constructions `new TopologyController(store, db)` still compile.
    @Optional() private readonly tenantStore?: TenantTopologyStore,
    @Optional() private readonly mapper?: TopologyResponseMapper,
  ) {}

  @Get(':flowId')
  @HttpCode(HttpStatus.OK)
  async getTopology(
    @Param('flowId') flowId: string,
    // Turn 3 (MVP Plan v3, Goal 2): optional version selects a specific stored
    // version. Delegated to TenantTopologyStore.getById(flowId, version).
    @Query('version') version?: string,
  ) {
    // Track 0 Turn 7 bridge (v6 two-index + v18 Finding X fallback passthrough):
    //   (1) Try TenantTopologyStore first — returns PRIVATE or GLOBAL TenantTopology.
    //   (2) Fall back to legacy TopologyStore (engine-kernel path).
    //   Mapper applies ONLY to the TenantTopology path (Finding X).
    if (this.tenantStore && this.mapper) {
      const tenantResult = await this.tenantStore.getById(flowId, version);
      if (tenantResult.isSuccess && tenantResult.data) {
        return this.mapper.toTopologyContract(tenantResult.data);
      }
    }

    const result = await this.topologyStore.listTopologies(flowId);
    if (!result.isSuccess) {
      return { error: 'Failed to retrieve topology', code: 'TOPOLOGY_LIST_ERROR' };
    }
    const topologies = result.data ?? [];
    if (topologies.length === 0) {
      return { error: `No topology found for flowId=${flowId}`, code: 'TOPOLOGY_NOT_FOUND' };
    }
    // v18 Finding X: fallback path returns raw FlowTopology (no mapper).
    // The legacy xiigen-flow-definitions index is currently empty — this path
    // cannot fire with real data. If a future turn populates it, a fallback
    // mapper will be added at that time.
    return topologies[0];
  }

  @Get(':flowId/run/:runId')
  @HttpCode(HttpStatus.OK)
  async getTopologyWithRunState(@Param('flowId') flowId: string, @Param('runId') runId: string) {
    const topologyResult = await this.topologyStore.listTopologies(flowId);
    if (!topologyResult.isSuccess) {
      return { error: 'Failed to retrieve topology', code: 'TOPOLOGY_LIST_ERROR' };
    }
    const topologies = topologyResult.data ?? [];
    if (topologies.length === 0) {
      return { error: `No topology found for flowId=${flowId}`, code: 'TOPOLOGY_NOT_FOUND' };
    }
    const topology = topologies[0]!;

    try {
      // Read SubFlowRefs + RunSuspensions from xiigen-run-state
      const runStateResult = await this.db.searchDocuments('xiigen-run-state', { runId }, 200);
      const runStateItems = runStateResult.data ?? [];

      // SubFlowRef records have subFlowIntent field (no refType field on stored records)
      const subFlows: SubFlowRef[] = runStateItems
        .filter((r) => r['subFlowIntent'] !== undefined)
        .map((r) => ({
          id: String(r['id'] ?? ''),
          parentNodeId: String(r['parentNodeId'] ?? ''),
          childRunId: String(r['childRunId'] ?? r['childRunId'] ?? ''),
          status: String(r['status'] ?? 'UNKNOWN'),
        }));

      // RunSuspension records have suspensionReason field (no refType field on stored records)
      const suspensions: RunSuspension[] = runStateItems
        .filter((r) => r['suspensionReason'] !== undefined)
        .map((r) => ({
          id: String(r['id'] ?? ''),
          nodeId: String(r['nodeId'] ?? ''),
          gapDescription: String(r['gapDescription'] ?? ''),
          gapRequest: Array.isArray(r['gapRequest']) ? (r['gapRequest'] as string[]) : [],
        }));

      // Read DPO triples from xiigen-training-data (CYCLE-2 station)
      const tripleResult = await this.db.searchDocuments(
        'xiigen-training-data',
        { runId, station: 'CYCLE-2' },
        500,
      );
      const tripleItems = tripleResult.data ?? [];
      const cycle2Traces: DpoTriple[] = tripleItems.map((r) => ({
        round: Number(r['round'] ?? 0),
        stepText: String(r['stepText'] ?? ''),
        chosen: (r['chosen'] as { model: string; score: number }) ?? { model: 'unknown', score: 0 },
        rejected: (r['rejected'] as { model: string; score: number }) ?? {
          model: 'unknown',
          score: 0,
        },
        discarded: (r['discarded'] as { model: string; score: number } | null) ?? null,
      }));

      // Read Cycle 3 decision records
      const cycle3Result = await this.db.searchDocuments(
        'xiigen-training-data',
        { runId, station: 'CYCLE-3' },
        100,
      );
      const cycle3Traces = cycle3Result.data ?? [];

      // Derive node states (best-effort — static mode cannot track RUNNING)
      // Nodes come from topology.nodes (array with { id, ... })
      const nodeIds: string[] = (topology.nodes as unknown as Array<{ id: string }>).map(
        (n) => n.id,
      );
      const nodeStates: Record<string, NodeStateEntry> = {};

      for (const nodeId of nodeIds) {
        if (suspensions.some((s) => s.nodeId === nodeId)) {
          nodeStates[nodeId] = { status: 'SUSPENDED' };
        } else if (subFlows.some((s) => s.parentNodeId === nodeId && s.status === 'COMPLETE')) {
          nodeStates[nodeId] = { status: 'EXPANDED' };
        } else if (cycle2Traces.length > 0 || cycle3Traces.length > 0) {
          nodeStates[nodeId] = { status: 'COMPLETE' };
        } else {
          nodeStates[nodeId] = { status: 'PENDING' };
        }
      }

      return {
        topology,
        runState: { nodeStates, cycle2Traces, cycle3Traces, subFlows, suspensions },
      };
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      return { error: `Run state assembly failed: ${msg}`, code: 'RUN_STATE_ERROR' };
    }
  }
}
