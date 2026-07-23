/**
 * AIDrivenBlastRadiusCalculator — IBlastRadiusCalculator AI-driven implementation (Phase 4).
 *
 * Confidence gate pattern:
 *   1. Query graph for ARTIFACT:id → REFERENCED_BY edges
 *   2. If confidence >= threshold → use graph result (bootstrap path)
 *   3. Below threshold or no edges → call AI pipeline BLAST_RADIUS
 *   4. Store discovered dependents via IGraphLearningService.addDiscoveredEdge()
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  IBlastRadiusCalculator,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenBlastRadiusCalculator extends IBlastRadiusCalculator {
  private readonly logger = new Logger(AIDrivenBlastRadiusCalculator.name);

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
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
    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    // Query graph for files referencing this artifact
    const refResult = await this.graphRag.query({
      fromEntity: `ARTIFACT:${params.artifactId}`,
      relationship: 'REFERENCED_BY',
      minConfidence: threshold,
    });

    if (refResult.edges.length > 0) {
      const knownDependents = refResult.edges.map((e) => e.toEntity);
      return {
        knownDependents,
        verificationCommands: this.buildVerificationCommands(params),
      };
    }

    // No high-confidence graph data — call AI pipeline
    const allEdges = await this.graphRag.query({
      fromEntity: `ARTIFACT:${params.artifactId}`,
      relationship: 'REFERENCED_BY',
    });

    if (allEdges.edges.length === 0) {
      this.logger.warn(`BlastRadius: no REFERENCED_BY edges for ${params.artifactId} — calling AI`);
    }

    const aiResult = await this.pipeline.decide({
      decisionType: 'BLAST_RADIUS',
      inputs: {
        changeType: params.changeType,
        artifactId: params.artifactId,
        description: params.description,
      },
      graphContext: allEdges.edges,
      runId: `blast-${params.artifactId}-${Date.now()}`,
    });

    const knownDependents = (aiResult.decision as string[]) ?? [];

    // Store discovered dependents in graph
    for (const dep of knownDependents) {
      await this.learning.addDiscoveredEdge({
        fromEntity: `ARTIFACT:${params.artifactId}`,
        fromType: 'Artifact',
        relationship: 'REFERENCED_BY',
        toEntity: dep,
        toType: 'DependentFile',
        reasoning: aiResult.reasoning,
        discoveredBy: `ai-blast-radius-${Date.now()}`,
      });
    }

    return {
      knownDependents,
      verificationCommands: this.buildVerificationCommands(params),
    };
  }

  private buildVerificationCommands(params: { changeType: string; artifactId: string }): string[] {
    return [
      `grep -rn "${params.artifactId}" server/src --include="*.ts" | grep -v ".spec.ts"`,
      `npx jest --testPathPattern="${params.artifactId.toLowerCase()}" --passWithNoTests`,
      `grep -rn "${params.changeType}" server/src --include="*.ts" | wc -l`,
    ];
  }
}
