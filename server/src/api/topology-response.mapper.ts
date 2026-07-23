/**
 * TopologyResponseMapper — server TenantTopology → client TopologyContract.
 *
 * Introduced by Track 0 Turn 7.
 *
 * The client `TopologyNodeDef` requires a `description: string` field (v16 Finding U —
 * verified at Turn 1 audit Section C against client/src/components/topology/TopologyViewer.tsx:40).
 * The runtime render paths never read n.description, but the TypeScript contract requires it.
 * Use node.name as the no-cost fallback.
 *
 * Registered in server/src/api/api.module.ts providers[] (v22 Finding CC — mandatory).
 */

import { Injectable } from '@nestjs/common';
import { TenantTopology } from '../engine/tenant-topology-store';

/** Client-facing TopologyContract shape (mirrors client/src/components/topology/TopologyViewer.tsx). */
export interface TopologyContractResponse {
  flowId: string;
  topologyId?: string;
  version: string;
  description?: string;
  nodes: Array<{
    id: string;
    name: string;
    type: string;
    description: string; // REQUIRED by client (v16 Finding U)
  }>;
  edges: Array<{
    from: string;
    to: string;
    condition?: string;
    type?: string;
  }>;
}

@Injectable()
export class TopologyResponseMapper {
  toTopologyContract(t: TenantTopology): TopologyContractResponse {
    return {
      flowId: t.flowId,
      version: t.version,
      description: typeof t.metadata?.description === 'string' ? t.metadata.description : undefined,
      nodes: t.nodes.map((n) => ({
        id: n.nodeId,
        name: n.name,
        type: n.archetype,
        // v16 Finding U: mapper-time fallback. TenantNode has no description field and
        // TopologyViewer never reads n.description at runtime, but the TypeScript
        // interface requires the property.
        description: n.name,
      })),
      edges: t.edges.map((e) => ({
        from: e.from,
        to: e.to,
        condition: e.condition,
        // TopologyEdgeDef.type is optional — omit; edges render default gray.
      })),
    };
  }
}
