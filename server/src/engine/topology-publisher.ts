/**
 * TopologyPublisher — writes CycleChain output topology into the per-tenant
 * store so FlowLibraryPage + TopologyViewer can render it.
 *
 * Introduced by Track 0 Turn 3 (see docs/sessions/user-journey-reconnection/).
 *
 * Algorithm (v23 Finding EE — corrects v7 recursive bug):
 *   CycleChainOutput.topology[] is a FLAT sequential array. children[] is
 *   ALWAYS empty (verified in the Turn 1 audit — no .children.push or
 *   .children = anywhere in cycle-chain.service.ts). Turn 3 iterates the
 *   array, skips EXPAND nodes (Pass 7), produces a unique nodeId via
 *   slugify+index, and chains edges prev→curr.
 *
 * Annotations applied:
 *   - Pass 4: TopologyNode / CycleChainOutput types from cycle-chain.service.ts.
 *   - Pass 7: EXPAND nodes skipped; LEAF nodes render.
 *   - v17 Finding V: version locked to 'v1'; flowId is unique per CycleChain run.
 *   - v19 Finding Y: publish(output, displayName?) — controller passes userIntent.
 *   - v23 Finding EE: nodeId = slugify(stepText) + '-' + i (avoids ReactFlow
 *     collision when two steps share text).
 *   - v27 Finding PP: literal slugify implementation (not in codebase).
 *   - v25 Finding II: inferArchetype() returns 'ANALYSIS' MVP default.
 *   - v24 Finding GG + v27 Finding OO: delegated to TenantTopologyStore
 *     (which sets connectionType: CONNECTION_TYPES.FLOW_SCOPED).
 */

import { Injectable, Logger } from '@nestjs/common';
import { DataProcessResult } from '../kernel/data-process-result';
import {
  TenantTopologyStore,
  TenantTopology,
  TenantNode,
  TenantEdge,
} from './tenant-topology-store';
import type { CycleChainOutput, Cycle2StepTrace, TopologyNode } from './cycle-chain.service';

/**
 * Turn 2 (MVP Plan v3) — grade threshold that triggers a QA_RUN flow.
 * Per plan decision AD-3 + B1 resolution: the engine's overall grade is the
 * QA trigger. No separate Cycle 5 / Meta-Arbiter involvement in the
 * CycleChainController path — `output.cycles.cycle5` does not exist.
 */
const QA_GRADE_THRESHOLD = 0.85;

/**
 * Turn 2 — discriminates DESIGN_SIM / TEACH_RUN / QA_RUN records stored under
 * the same CycleChain run so FlowLibraryPage can render per-type badges.
 * Stored in TenantTopology.metadata.sourceType (NOT a new interface field —
 * preserves backward compatibility per plan B1 resolution).
 */
export type FlowSourceType = 'DESIGN_SIM' | 'TEACH_RUN' | 'QA_RUN';

/**
 * v27 Finding PP — literal slugify implementation (not present elsewhere in codebase).
 * Truncates at 60 chars so combined with the -{i} index suffix, total nodeId
 * stays well under Elasticsearch keyword field length (256).
 */
function slugify(text: string): string {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-') // non-alphanumeric runs → single dash
    .replace(/^-+|-+$/g, '') // trim leading/trailing dashes
    .slice(0, 60); // truncate to prevent ES field-length issues
}

/**
 * v25 Finding II — inferArchetype MVP default.
 * CycleChainOutput nodes have no type/archetype data. All CycleChain-generated
 * nodes render as 'ANALYSIS' (blue in TopologyViewer). Turn 11 (subflow capture)
 * or Turn 13 (teach/QA) may add per-node archetype when design is verified.
 */
function inferArchetype(_node: TopologyNode): string {
  return 'ANALYSIS';
}

export interface PublishOptions {
  /** Parent run that spawned this as a sub-flow (Turn 11 — subflow capture). */
  parentRunId?: string;
  /** Parent node that triggered the EXPAND (Turn 11 — for tree reconstruction). */
  parentNodeId?: string;
}

@Injectable()
export class TopologyPublisher {
  private readonly logger = new Logger(TopologyPublisher.name);

  constructor(private readonly store: TenantTopologyStore) {}

  /**
   * Publish a CycleChain run's topology as a PRIVATE flow for the current tenant.
   *
   * @param output      CycleChainOutput — the unwrapped result.data from CycleChainService.run.
   * @param displayName Optional human-readable name (v19 Finding Y: caller should
   *                    pass input.userIntent so FlowLibraryPage shows meaningful titles).
   * @param options     Turn 11 subflow-capture fields. When omitted, the record is a top-level flow.
   */
  async publish(
    output: CycleChainOutput,
    displayName?: string,
    options?: PublishOptions,
  ): Promise<DataProcessResult<TenantTopology>> {
    // M2 empty guard: nothing to persist if the topology is empty
    if (!output.topology || output.topology.length === 0) {
      return DataProcessResult.failure('EMPTY_TOPOLOGY', 'CycleChainOutput has no topology');
    }

    const { nodes, edges } = this.buildSequentialTopology(output.topology);

    if (nodes.length === 0) {
      // All nodes were EXPAND — nothing to render
      return DataProcessResult.failure(
        'NO_LEAF_NODES',
        'CycleChainOutput.topology contains only EXPAND nodes',
      );
    }

    const now = new Date().toISOString();
    const topology: Omit<TenantTopology, 'tenantId' | 'connectionType'> = {
      flowId: output.flowId,
      // v19 Finding Y: prefer userIntent over opaque flowId for display
      name: displayName ?? output.flowId,
      version: 'v1', // v17 Finding V: MVP locked
      status: 'PUBLISHED',
      knowledgeScope: 'PRIVATE',
      sourceRunId: output.runId,
      // Turn 11 — subflow capture: link child topology back to parent run/node.
      parentRunId: options?.parentRunId,
      parentNodeId: options?.parentNodeId,
      nodes,
      edges,
      metadata: {
        // Turn 2 (MVP Plan v3) — explicit type discriminator for Flow Library badges.
        sourceType: 'DESIGN_SIM' as FlowSourceType,
        grade: output.grade,
        totalCostUsd: output.totalCostUsd,
        planStepCount: output.planSteps?.length ?? 0,
        ...(options?.parentRunId ? { isSubFlow: true } : {}),
      },
      createdAt: now,
      updatedAt: now,
    };

    return this.store.storePrivate(topology);
  }

  /**
   * Turn 2 (MVP Plan v3, Goal 1b) — publish a TEACH_RUN flow from Cycle 2
   * convergence steps. Every Cycle2StepTrace becomes one TenantNode; per-step
   * grade/depth/accepted are carried in config so the UI can render scores.
   *
   * flowId suffixed `-teach` so it does not collide with the DESIGN_SIM
   * record that shares the same CycleChain run. metadata.sourceFlowId links
   * back to the parent DESIGN_SIM flow.
   */
  async publishTeachRun(
    output: CycleChainOutput,
    displayName?: string,
  ): Promise<DataProcessResult<TenantTopology>> {
    const steps = output.cycles?.cycle2 ?? [];
    if (steps.length === 0) {
      return DataProcessResult.failure(
        'NO_TEACH_STEPS',
        'CycleChainOutput has no Cycle 2 convergence steps',
      );
    }

    const { nodes, edges } = this.buildStepTopology(steps);
    const now = new Date().toISOString();
    const baseName = displayName ?? output.flowId;
    const topology: Omit<TenantTopology, 'tenantId' | 'connectionType'> = {
      flowId: `${output.flowId}-teach`,
      name: `${baseName} — Teach`,
      version: 'v1',
      status: 'PUBLISHED',
      knowledgeScope: 'PRIVATE',
      sourceRunId: output.runId,
      nodes,
      edges,
      metadata: {
        sourceType: 'TEACH_RUN' as FlowSourceType,
        sourceFlowId: output.flowId,
        grade: output.grade,
        stepCount: steps.length,
      },
      createdAt: now,
      updatedAt: now,
    };

    return this.store.storePrivate(topology);
  }

  /**
   * Turn 2 (MVP Plan v3, Goal 1c) — publish a QA_RUN flow from the subset of
   * Cycle 2 steps that were rejected or scored below the QA threshold. Only
   * fires when the overall run grade is below QA_GRADE_THRESHOLD (B1 resolution:
   * the grade IS the trigger — no Meta-Arbiter cycle5 wiring).
   *
   * Status: DRAFT (proposals are improvement candidates, not validated fixes —
   * per plan Turn 2 spec).
   */
  async publishQaRun(
    output: CycleChainOutput,
    displayName?: string,
  ): Promise<DataProcessResult<TenantTopology>> {
    if (output.grade >= QA_GRADE_THRESHOLD) {
      return DataProcessResult.failure(
        'QA_NOT_TRIGGERED',
        `Run grade ${output.grade} >= ${QA_GRADE_THRESHOLD}; QA flow not required`,
      );
    }

    const allSteps = output.cycles?.cycle2 ?? [];
    const rejected = allSteps.filter((s) => !s.accepted || s.grade < QA_GRADE_THRESHOLD);
    if (rejected.length === 0) {
      return DataProcessResult.failure(
        'NO_QA_STEPS',
        'No rejected or low-grade Cycle 2 steps to materialise as QA',
      );
    }

    const { nodes, edges } = this.buildStepTopology(rejected);
    const now = new Date().toISOString();
    const baseName = displayName ?? output.flowId;
    const topology: Omit<TenantTopology, 'tenantId' | 'connectionType'> = {
      flowId: `${output.flowId}-qa`,
      name: `${baseName} — QA`,
      version: 'v1',
      status: 'DRAFT',
      knowledgeScope: 'PRIVATE',
      sourceRunId: output.runId,
      nodes,
      edges,
      metadata: {
        sourceType: 'QA_RUN' as FlowSourceType,
        sourceFlowId: output.flowId,
        grade: output.grade,
        qaThreshold: QA_GRADE_THRESHOLD,
        rejectedStepCount: rejected.length,
        totalStepCount: allSteps.length,
      },
      createdAt: now,
      updatedAt: now,
    };

    return this.store.storePrivate(topology);
  }

  /**
   * Turn 2 — map Cycle2StepTrace[] to TenantNode/Edge chain. Per-step scores
   * go into config so TopologyViewer can surface them without changing the
   * TenantNode interface (backward-compat per plan B1 resolution).
   */
  private buildStepTopology(steps: Cycle2StepTrace[]): {
    nodes: TenantNode[];
    edges: TenantEdge[];
  } {
    const nodes: TenantNode[] = [];
    const edges: TenantEdge[] = [];
    let prevNodeId: string | null = null;

    for (let i = 0; i < steps.length; i++) {
      const s = steps[i];
      const nodeId = `${slugify(s.stepText)}-${i}`;
      nodes.push({
        nodeId,
        name: s.stepText,
        archetype: s.winnerModel ?? 'ANALYSIS',
        config: {
          grade: s.grade,
          depth: s.depth,
          accepted: s.accepted,
          winnerModel: s.winnerModel,
          roundsCompleted: s.roundsCompleted,
          ...(s.rejectionReason !== undefined ? { rejectionReason: s.rejectionReason } : {}),
        },
      });
      if (prevNodeId) {
        edges.push({ from: prevNodeId, to: nodeId });
      }
      prevNodeId = nodeId;
    }
    return { nodes, edges };
  }

  /**
   * v23 Finding EE algorithm:
   *   - Iterate CycleChainOutput.topology sequentially (children[] is always empty).
   *   - Skip EXPAND verdicts (Pass 7) — only LEAF nodes render.
   *   - Produce unique nodeIds via slugify(stepText) + '-' + i.
   *   - Chain edges prev→curr across the LEAF sequence.
   */
  private buildSequentialTopology(topology: TopologyNode[]): {
    nodes: TenantNode[];
    edges: TenantEdge[];
  } {
    const nodes: TenantNode[] = [];
    const edges: TenantEdge[] = [];
    let prevNodeId: string | null = null;

    for (let i = 0; i < topology.length; i++) {
      const node = topology[i];
      if (node.verdict === 'EXPAND') continue; // skip intermediate expand markers

      const nodeId = `${slugify(node.stepText)}-${i}`;
      nodes.push({
        nodeId,
        name: node.stepText,
        archetype: inferArchetype(node),
      });

      if (prevNodeId) {
        edges.push({ from: prevNodeId, to: nodeId });
      }
      prevNodeId = nodeId;
    }

    return { nodes, edges };
  }
}
