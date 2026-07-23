// file: server/src/engine/topologies/topology.types.ts
// Task topology type definitions for the AF-station pipeline.

export type NodeType =
  | 'action' // standard action node
  | 'decision' // branching decision node
  | 'saga-step' // part of a compensation saga
  | 'read-only'; // no write operations permitted

export type TopologyVariant =
  | 'action-sequential' // linear chain of action nodes
  | 'saga-sequential' // linear saga with compensation branches
  | 'read-only-terminal'; // single read node, no outgoing write edges

export interface TopologyNode {
  id: string;
  type: NodeType;
  label: string;
  canWrite: boolean;
  compensationTarget?: string; // id of node this compensates
}

export interface TopologyEdge {
  from: string;
  to: string;
  type: 'forward' | 'compensation' | 'event-trigger';
  synchronous?: boolean;
}

export interface TaskTopology {
  taskTypeId: string;
  variant: TopologyVariant;
  nodes: TopologyNode[];
  edges: TopologyEdge[];
  parallelismAllowed: boolean;
  writePermitted: boolean;
}
