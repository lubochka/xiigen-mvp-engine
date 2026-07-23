// server/src/engine/dag/dag-node.types.ts
// NEW FILE — current task type schema for DAG rendering

export interface ConditionalEdge {
  condition: string;
  targetNodeId: string;
  label: string;
}

export interface ParallelGroup {
  members: string[];
  joinPolicy: 'all' | 'any';
}

export interface CrossFlowEdge {
  targetFlow: string;
  eventType: string;
  directionality: 'emit' | 'receive';
}

export interface DagNode {
  id: string;
  label: string;
  taskTypeId: string;
  status: 'stable' | 'partial' | 'unimplemented';
  estimatedDurationMs?: number;
  deps: string[];
  conditionalEdges?: ConditionalEdge[];
  parallelGroups?: ParallelGroup[];
  crossFlowEdges?: CrossFlowEdge[];
}

export type DagScope = 'flow-only' | 'transitive';
