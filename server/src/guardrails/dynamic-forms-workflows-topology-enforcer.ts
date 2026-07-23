/**
 * Flow21TopologyEnforcer — GAP-21-01
 *
 * Validates that FLOW-21 submission pipeline (T308→T309→T310→T311→T312)
 * maintains correct stage-gate ordering.
 *
 * BFA Rules enforced: CF-382, CF-383, CF-384, CF-385, CF-391
 * INV-15-2: T311 (AntiSpamSecurityGate) MUST precede T312 (EntryPersistenceGate)
 *
 * Runs at module init. Throws on violation to block deployment.
 *
 * DNA-3: validateFlow21Topology returns DataProcessResult, never throws for business logic.
 * onModuleInit throws only as a hard boot guard (intentional deployment block).
 */

import { Injectable, Logger, Inject, OnModuleInit } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../kernel/data-process-result';

export interface TopologyEdge {
  predecessor: string;
  successor: string;
  rule: string;
  description: string;
}

export const FLOW21_REQUIRED_TOPOLOGY_EDGES: TopologyEdge[] = [
  {
    predecessor: 'T308',
    successor: 'T309',
    rule: 'CF-385',
    description: 'Intake before normalization',
  },
  {
    predecessor: 'T309',
    successor: 'T310',
    rule: 'CF-383',
    description: 'Normalization before validation',
  },
  {
    predecessor: 'T310',
    successor: 'T311',
    rule: 'CF-384',
    description: 'Validation before anti-spam',
  },
  {
    predecessor: 'T311',
    successor: 'T312',
    rule: 'CF-382',
    description: 'Anti-spam before persistence (INV-15-2)',
  },
  {
    predecessor: 'T318',
    successor: 'T319',
    rule: 'CF-391',
    description: 'Recipe definition before trigger evaluation',
  },
];

export interface TopologyViolation {
  rule: string;
  predecessor: string;
  successor: string;
  description: string;
  type: 'MISSING_EDGE' | 'BYPASS_PATH';
}

@Injectable()
export class Flow21TopologyEnforcer implements OnModuleInit {
  private readonly logger = new Logger(Flow21TopologyEnforcer.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async onModuleInit(): Promise<void> {
    const result = await this.validateFlow21Topology();
    if (!result.isSuccess) {
      this.logger.error(
        'FLOW-21 topology validation FAILED',
        result.errorCode,
        result.errorMessage,
      );
      throw new Error(`TOPOLOGY_VIOLATION: ${result.errorMessage}`);
    }
    this.logger.log('FLOW-21 topology validation: PASSED all stage-gate ordering checks');
  }

  async validateFlow21Topology(): Promise<DataProcessResult<void>> {
    const violations: TopologyViolation[] = [];

    // Check INV-15-2: T311 must precede T312, with no bypass path
    const inv152Check = await this.checkNoBypassPath('T308', 'T312', 'T311');
    if (!inv152Check.isSuccess) {
      violations.push({
        rule: 'CF-382',
        predecessor: 'T311',
        successor: 'T312',
        description: 'INV-15-2: Path from T308 to T312 exists without passing T311',
        type: 'BYPASS_PATH',
      });
    }

    // Check all required edges
    for (const edge of FLOW21_REQUIRED_TOPOLOGY_EDGES) {
      const edgeExists = await this.checkEdgeExists(edge.predecessor, edge.successor);
      if (!edgeExists) {
        violations.push({
          rule: edge.rule,
          predecessor: edge.predecessor,
          successor: edge.successor,
          description: edge.description,
          type: 'MISSING_EDGE',
        });
      }
    }

    if (violations.length > 0) {
      const violationDetails = violations.map((v) => `${v.rule}: ${v.description}`).join('; ');
      return DataProcessResult.failure(
        'TOPOLOGY_VIOLATION',
        `FLOW-21 stage-gate topology violations: ${violationDetails}`,
      );
    }

    return DataProcessResult.success(undefined);
  }

  private async checkEdgeExists(predecessor: string, successor: string): Promise<boolean> {
    // Reads FLOW-21 execution graph from FREEDOM config (Elasticsearch)
    const graph = await this.db.searchDocuments('flow-execution-graphs', {
      flowId: 'FLOW-21',
      predecessorTaskId: predecessor,
      successorTaskId: successor,
    });
    return graph.isSuccess && (graph.data as unknown[]).length > 0;
  }

  private async checkNoBypassPath(
    start: string,
    end: string,
    requiredIntermediate: string,
  ): Promise<DataProcessResult<void>> {
    // Verify every path from `start` to `end` passes through `requiredIntermediate`
    const allPaths = await this.findAllPaths(start, end);
    const bypassPaths = allPaths.filter((path) => !path.includes(requiredIntermediate));
    if (bypassPaths.length > 0) {
      return DataProcessResult.failure(
        'BYPASS_PATH_DETECTED',
        `${bypassPaths.length} path(s) from ${start} to ${end} bypass ${requiredIntermediate}`,
      );
    }
    return DataProcessResult.success(undefined);
  }

  private async findAllPaths(start: string, end: string): Promise<string[][]> {
    // Reads full FLOW-21 execution graph and returns all paths via BFS
    const graphResult = await this.db.searchDocuments('flow-execution-graphs', {
      flowId: 'FLOW-21',
    });
    if (!graphResult.isSuccess || !graphResult.data || graphResult.data.length === 0) {
      return [];
    }

    // Build adjacency list
    const adjacency = new Map<string, string[]>();
    for (const edge of graphResult.data) {
      const pred = edge['predecessorTaskId'] as string;
      const succ = edge['successorTaskId'] as string;
      if (!adjacency.has(pred)) adjacency.set(pred, []);
      adjacency.get(pred)!.push(succ);
    }

    // BFS/DFS to find all paths from start to end
    const paths: string[][] = [];
    const queue: string[][] = [[start]];

    while (queue.length > 0) {
      const path = queue.shift()!;
      const last = path[path.length - 1];

      if (last === end) {
        paths.push(path);
        continue;
      }

      const neighbours = adjacency.get(last) ?? [];
      for (const next of neighbours) {
        if (!path.includes(next)) {
          queue.push([...path, next]);
        }
      }
    }

    return paths;
  }
}
