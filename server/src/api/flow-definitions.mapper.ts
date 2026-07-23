/**
 * FlowDefinitionsMapper — bidirectional translation between
 * client-facing FlowDefinition shape (useFlowDefinition.ts) and
 * server-side TenantTopology shape (TenantTopologyStore).
 *
 * Introduced by Track 0 Turn 5.
 *
 * Client shape (per audit Section B):
 *   { flow_id, name, version, nodes: [{ node_id, type, name, factory_id,
 *     interface_name, fabric_type, config }], edges: [{ from, to, event }], metadata }
 *
 * Server shape:
 *   TenantTopology { flowId, tenantId, connectionType, knowledgeScope, name,
 *     version, status, nodes: TenantNode[], edges: TenantEdge[], metadata, createdAt, updatedAt }
 */

import { Injectable } from '@nestjs/common';
import { TenantTopology, TenantNode, TenantEdge } from '../engine/tenant-topology-store';

/** Client-facing flow definition (matches useFlowDefinition.ts loadFlow response). */
export interface ClientFlowDefinition {
  flow_id: string;
  name: string;
  version: string;
  status?: string;
  nodes: Array<{
    node_id: string;
    type?: string;
    name?: string;
    factory_id?: string;
    interface_name?: string;
    fabric_type?: string;
    config?: Record<string, unknown>;
  }>;
  edges: Array<{
    from: string;
    to: string;
    event?: string;
    condition?: string;
  }>;
  metadata?: Record<string, unknown>;
}

/** Client-facing summary (for list endpoints — omits nodes/edges for lighter payload). */
export interface ClientFlowSummary {
  flow_id: string;
  name: string;
  version: string;
  status: string;
  knowledge_scope: 'PRIVATE' | 'GLOBAL';
  node_count: number;
  created_at: string;
  updated_at: string;
  /**
   * Turn 2 (MVP Plan v3) — 'DESIGN_SIM' | 'TEACH_RUN' | 'QA_RUN' | undefined.
   * Drives per-row badge rendering in FlowLibraryPage (Turn 3). Sourced from
   * TenantTopology.metadata.sourceType so no interface extension was needed.
   */
  source_type?: string;
  /** Turn 2 — link back to the parent DESIGN_SIM flow for TEACH/QA records. */
  source_flow_id?: string;
}

@Injectable()
export class FlowDefinitionsMapper {
  /** Server → Client — full definition (for load). */
  toClient(topology: TenantTopology): ClientFlowDefinition {
    return {
      flow_id: topology.flowId,
      name: topology.name,
      version: topology.version,
      status: topology.status,
      nodes: topology.nodes.map((n) => ({
        node_id: n.nodeId,
        type: n.archetype,
        name: n.name,
        factory_id: n.factoryId,
        interface_name: n.interfaceName,
        fabric_type: n.fabric,
        config: n.config,
      })),
      edges: topology.edges.map((e) => ({
        from: e.from,
        to: e.to,
        event: e.event,
        condition: e.condition,
      })),
      metadata: topology.metadata,
    };
  }

  /** Server → Client — lightweight summary (for list). */
  toSummary(topology: TenantTopology): ClientFlowSummary {
    const sourceType = topology.metadata?.['sourceType'];
    const sourceFlowId = topology.metadata?.['sourceFlowId'];
    return {
      flow_id: topology.flowId,
      name: topology.name,
      version: topology.version,
      status: topology.status,
      knowledge_scope: topology.knowledgeScope,
      node_count: topology.nodes.length,
      created_at: topology.createdAt,
      updated_at: topology.updatedAt,
      ...(typeof sourceType === 'string' ? { source_type: sourceType } : {}),
      ...(typeof sourceFlowId === 'string' ? { source_flow_id: sourceFlowId } : {}),
    };
  }

  /**
   * Client → Server — partial record for storePrivate.
   * DNA-5: tenantId + connectionType ignored here; the store fills both from CLS.
   */
  fromClient(body: ClientFlowDefinition): Omit<TenantTopology, 'tenantId' | 'connectionType'> {
    const nodes: TenantNode[] = body.nodes.map((n) => ({
      nodeId: n.node_id,
      archetype: n.type ?? 'unknown',
      name: n.name ?? n.node_id,
      factoryId: n.factory_id,
      interfaceName: n.interface_name,
      fabric: n.fabric_type,
      config: n.config,
    }));
    const edges: TenantEdge[] = body.edges.map((e) => ({
      from: e.from,
      to: e.to,
      event: e.event,
      condition: e.condition,
    }));
    const now = new Date().toISOString();
    return {
      flowId: body.flow_id,
      name: body.name,
      version: body.version,
      status: (body.status as TenantTopology['status']) ?? 'DRAFT',
      knowledgeScope: 'PRIVATE',
      nodes,
      edges,
      metadata: body.metadata ?? {},
      createdAt: now,
      updatedAt: now,
    };
  }
}
