// server/src/engine/dag/mermaid-renderer.service.ts

import { detectCycle } from '../../kernel/graph-utils';
import { DagNode, DagScope } from './dag-node.types';
import { DataProcessResult } from '../../kernel/data-process-result';

export class MermaidRendererService {
  render(nodes: DagNode[], scope: DagScope = 'flow-only'): DataProcessResult<string> {
    // Step 1: cycle detection
    const graphMap = new Map(
      nodes
        .map((n) => ({
          id: n.id,
          neighbors: n.deps,
        }))
        .map((n) => [n.id, n]),
    );
    const cycle = detectCycle(graphMap);
    if (cycle) {
      return DataProcessResult.failure(
        'CIRCULAR_DEPENDENCY',
        `Circular dependency in flow: ${cycle.join(' → ')}`,
      );
    }

    // Step 2: render
    const lines: string[] = ['flowchart TD'];
    for (const node of nodes) {
      const statusBadge = node.status === 'unimplemented' ? '⚠️ ' : '';
      const nodeLabel = `${node.taskTypeId}\\n${statusBadge}${node.label}`;

      // Sequential deps
      for (const dep of node.deps) {
        lines.push(`  ${node.id}["${nodeLabel}"] --> ${dep}`);
      }

      // Conditional edges (routing branches)
      for (const edge of node.conditionalEdges ?? []) {
        lines.push(`  ${node.id} -->|${edge.label}| ${edge.targetNodeId}`);
      }

      // Parallel groups
      for (const group of node.parallelGroups ?? []) {
        const groupId = `pg_${node.id}`;
        lines.push(`  subgraph ${groupId}[Parallel]`);
        for (const member of group.members) {
          lines.push(`    ${member}`);
        }
        lines.push(`  end`);
        lines.push(`  ${node.id} --> ${groupId}`);
      }

      // Cross-flow edges (transitive scope only)
      if (scope === 'transitive') {
        for (const xf of node.crossFlowEdges ?? []) {
          lines.push(`  ${node.id} -.->|${xf.eventType}| ${xf.targetFlow}[[${xf.targetFlow}]]`);
        }
      }
    }
    return DataProcessResult.success(lines.join('\n'));
  }
}
