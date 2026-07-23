/**
 * BootstrapBlastRadiusCalculator — IBlastRadiusCalculator bootstrap implementation.
 *
 * Calculates blast radius by querying:
 *   ARTIFACT:${artifactId} → REFERENCED_BY → file
 *
 * Falls back to empty list with a warning log if no edges found for this artifact type.
 * Always provides standard verification commands regardless of graph result.
 *
 * Phase 2: graph traversal only, no AI dependency.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IBlastRadiusCalculator,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapBlastRadiusCalculator extends IBlastRadiusCalculator {
  private readonly logger = new Logger(BootstrapBlastRadiusCalculator.name);

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {
    super();
  }

  async calculate(params: {
    changeType: string;
    artifactId: string;
    description: string;
  }): Promise<{
    knownDependents: string[];
    verificationCommands: string[];
  }> {
    const threshold = this.config
      ? await this.config.get('engine.decision.confidenceThreshold', 0.9)
      : 0.9;

    // Query graph for files that reference this artifact
    const refResult = await this.graphRag.query({
      fromEntity: `ARTIFACT:${params.artifactId}`,
      relationship: 'REFERENCED_BY',
      minConfidence: threshold,
    });

    if (refResult.edges.length === 0) {
      this.logger.warn(
        `BlastRadius: no REFERENCED_BY edges for ${params.artifactId} — graph may not be seeded yet`,
      );
    }

    const knownDependents = refResult.edges.map((e) => e.toEntity);

    const verificationCommands = [
      `grep -rn "${params.artifactId}" server/src --include="*.ts" | grep -v ".spec.ts"`,
      `npx jest --testPathPattern="${params.artifactId.toLowerCase()}" --passWithNoTests`,
      `grep -rn "${params.changeType}" server/src --include="*.ts" | wc -l`,
    ];

    return { knownDependents, verificationCommands };
  }
}
