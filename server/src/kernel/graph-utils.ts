// server/src/kernel/graph-utils.ts
// NEW FILE — shared DFS cycle detection for DAG renderer + dep-resolver

export interface GraphNode {
  id: string;
  neighbors: string[]; // edge targets
}

export function detectCycle(nodes: Map<string, GraphNode>): string[] | null {
  const visited = new Set<string>();
  const stack = new Set<string>();

  function dfs(nodeId: string, path: string[]): string[] | null {
    if (stack.has(nodeId)) return [...path, nodeId]; // cycle found
    if (visited.has(nodeId)) return null;
    visited.add(nodeId);
    stack.add(nodeId);
    path.push(nodeId);
    const node = nodes.get(nodeId);
    for (const neighbor of node?.neighbors ?? []) {
      const cycle = dfs(neighbor, path);
      if (cycle) return cycle;
    }
    stack.delete(nodeId);
    path.pop();
    return null;
  }

  for (const nodeId of nodes.keys()) {
    if (!visited.has(nodeId)) {
      const cycle = dfs(nodeId, []);
      if (cycle) return cycle;
    }
  }
  return null;
}
