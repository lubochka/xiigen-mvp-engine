/**
 * T191 DagCycleDetector [VALIDATION, INLINE]
 * FLOW-11: Schema Registry & DAG
 *
 * Iron rules:
 *   IR-T191-1: DFS uses THREE states: WHITE (unvisited), GRAY (on current path), BLACK (complete).
 *              Encountering a GRAY node = cycle. Single visited Set PROHIBITED.
 *   IR-T191-2: cyclePath populated and returned when CYCLE_DETECTED. Empty cyclePath invalid.
 *   IR-T191-3: No side effects — no storage writes, no queue calls. Returns verdict to caller only.
 *
 * Callers: T189 SchemaRegistrationGateway (inline call before emit)
 *
 * CF-11-1: BFA rule — two-color DFS enforcement.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

export interface CycleCheckInput {
  schemaType: string;
  newDeps: string[];
  existingGraph: Record<string, string[]>;
  tenantId: string;
}

export interface CycleCheckResult {
  verdict: 'PASS' | 'CYCLE_DETECTED';
  cyclePath?: string[];
}

@Injectable()
export class DagCycleDetectorService extends MicroserviceBase {
  constructor() {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T191',
        serviceName: 'DagCycleDetectorService',
        flowId: 'FLOW-11',
      }),
    });
  }
  /**
   * Check if adding newDeps for schemaType creates a cycle in the dependency graph.
   *
   * THREE-STATE DFS:
   *   WHITE (undefined / absent): not visited
   *   GRAY ('G'):  currently on the active DFS path — re-entry = back edge = CYCLE
   *   BLACK ('B'): fully explored — re-entry is a safe cross-edge
   *
   * NEVER uses a single visited Set — that cannot detect back edges.
   * CF-11-1: TWO_COLOR_DFS iron rule.
   */
  check(input: CycleCheckInput): DataProcessResult<CycleCheckResult> {
    // Build combined graph: existing + new edges for schemaType
    const graph: Record<string, string[]> = {
      ...input.existingGraph,
      [input.schemaType]: input.newDeps,
    };

    // WHITE = absent from color map
    const color: Record<string, 'G' | 'B'> = {};
    const cyclePath: string[] = [];

    const dfs = (node: string): boolean => {
      if (color[node] === 'G') {
        // GRAY node re-encountered = back edge = cycle
        cyclePath.push(node);
        return true;
      }
      if (color[node] === 'B') {
        // BLACK = safe cross-edge
        return false;
      }
      // Mark GRAY: node is on the current DFS path
      color[node] = 'G';
      for (const dep of graph[node] ?? []) {
        if (dfs(dep)) {
          cyclePath.unshift(node);
          return true;
        }
      }
      // Mark BLACK: node fully explored
      color[node] = 'B';
      return false;
    };

    for (const node of Object.keys(graph)) {
      if (!color[node] && dfs(node)) {
        return DataProcessResult.success({ verdict: 'CYCLE_DETECTED', cyclePath });
      }
    }
    return DataProcessResult.success({ verdict: 'PASS', cyclePath: [] });
  }
}
