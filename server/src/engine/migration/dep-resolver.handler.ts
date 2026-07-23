// server/src/engine/migration/dep-resolver.handler.ts
// DFS transitive closure for multi-repo dependency resolution.
//
// DNA-3: returns DataProcessResult, never throws
// DNA-2: uses detectCycle from shared graph-utils

import { Injectable, Logger } from '@nestjs/common';
import { detectCycle } from '../../kernel/graph-utils';
import { DataProcessResult } from '../../kernel/data-process-result';

export interface RepoDeps {
  repoId: string;
  directDeps: string[];
  transitiveDeps: string[]; // now populated
  allDeps: string[]; // directDeps ∪ transitiveDeps
}

@Injectable()
export class DepResolverHandler {
  private readonly logger = new Logger(DepResolverHandler.name);
  // FREEDOM config: depResolutionMaxDepth (default: 5)
  private readonly maxDepth = 5;

  async resolveAll(
    repos: Map<string, Record<string, unknown>>, // repoId → package.json
  ): Promise<DataProcessResult<Map<string, RepoDeps>>> {
    // Step 1: build graph for cycle detection
    const graph = new Map(
      [...repos.entries()]
        .map(([repoId, pkg]) => ({
          id: repoId,
          neighbors: Object.keys(
            (pkg as Record<string, Record<string, unknown>>)['dependencies'] ?? {},
          ),
        }))
        .map((n) => [n.id, n]),
    );
    const cycle = detectCycle(graph);
    if (cycle) {
      return DataProcessResult.failure(
        'CIRCULAR_DEPENDENCY',
        `Circular dependency in migration target: ${cycle.join(' → ')}`,
      );
    }
    // Step 2: DFS transitive closure per repo
    const results = new Map<string, RepoDeps>();
    for (const repoId of repos.keys()) {
      const resolved = this.resolveTransitive(repoId, repos, new Set(), 0);
      results.set(repoId, resolved);
    }
    return DataProcessResult.success(results);
  }

  private resolveTransitive(
    repoId: string,
    repos: Map<string, Record<string, unknown>>,
    visited: Set<string>,
    depth: number,
  ): RepoDeps {
    if (depth > this.maxDepth) {
      this.logger.warn(`Dep resolution max depth (${this.maxDepth}) reached at ${repoId}`);
      return { repoId, directDeps: [], transitiveDeps: [], allDeps: [] };
    }
    const pkg = repos.get(repoId);
    const directDeps = Object.keys(
      (pkg as Record<string, Record<string, unknown>> | undefined)?.['dependencies'] ?? {},
    );
    const transitiveDeps = new Set<string>(directDeps);
    for (const dep of directDeps) {
      if (visited.has(dep)) continue;
      visited.add(dep);
      const childDeps = this.resolveTransitive(dep, repos, new Set(visited), depth + 1);
      childDeps.allDeps.forEach((d) => transitiveDeps.add(d));
    }
    const transitiveOnly = [...transitiveDeps].filter((d) => !directDeps.includes(d));
    return {
      repoId,
      directDeps,
      transitiveDeps: transitiveOnly,
      allDeps: [...transitiveDeps],
    };
  }
}
