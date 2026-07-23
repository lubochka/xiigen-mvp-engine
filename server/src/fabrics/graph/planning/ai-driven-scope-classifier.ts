/**
 * AIDrivenScopeClassifier — IScopeClassifier AI-driven implementation (Phase 4).
 *
 * Confidence gate pattern:
 *   1. Query graph for PREREQ_GAP_TYPE → RESOLVES_VIA edges
 *   2. If confidence >= threshold → use graph result
 *   3. Below threshold or no edges → call AI pipeline SCOPE_CLASSIFICATION
 *   4. Store AI result via IGraphLearningService.addDiscoveredEdge()
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  IScopeClassifier,
  ScopeLadderLevel,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenScopeClassifier extends IScopeClassifier {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async classify(params: {
    gapType: string;
    serviceCategory: string;
    description: string;
  }): Promise<{ level: ScopeLadderLevel; rationale: string; estimatedEffort: string }> {
    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    // Query graph for scope resolution
    const graphResult = await this.graphRag.query({
      fromEntity: `PREREQ_GAP_TYPE:${params.gapType}`,
      relationship: 'RESOLVES_VIA',
      minConfidence: threshold,
    });

    if (graphResult.edges[0]) {
      const edge = graphResult.edges[0];
      return {
        level: edge.toEntity as ScopeLadderLevel,
        rationale: `Graph (confidence ${edge.confidence.toFixed(2)}): ${edge.reasoning ?? 'graph-driven'}`,
        estimatedEffort: this.effortForLevel(edge.toEntity as ScopeLadderLevel),
      };
    }

    // Gather lower-confidence context for AI
    const allEdges = await this.graphRag.query({
      fromEntity: `PREREQ_GAP_TYPE:${params.gapType}`,
      relationship: 'RESOLVES_VIA',
    });

    const aiResult = await this.pipeline.decide({
      decisionType: 'SCOPE_CLASSIFICATION',
      inputs: {
        gapType: params.gapType,
        serviceCategory: params.serviceCategory,
        description: params.description,
      },
      graphContext: allEdges.edges,
      runId: `scope-${params.gapType}-${Date.now()}`,
    });

    const level = (aiResult.decision as ScopeLadderLevel) ?? 'CONVENTION';

    await this.learning.addDiscoveredEdge({
      fromEntity: `PREREQ_GAP_TYPE:${params.gapType}`,
      fromType: 'PrereqGapType',
      relationship: 'RESOLVES_VIA',
      toEntity: level,
      toType: 'ScopeLadderLevel',
      reasoning: aiResult.reasoning,
      discoveredBy: `ai-scope-${Date.now()}`,
    });

    return {
      level,
      rationale: `AI pipeline (confidence ${aiResult.confidence.toFixed(2)}): ${aiResult.reasoning}`,
      estimatedEffort: this.effortForLevel(level),
    };
  }

  private effortForLevel(level: ScopeLadderLevel): string {
    const map: Record<ScopeLadderLevel, string> = {
      CONVENTION: '< 1 day',
      ADAPTATION: '1-2 days',
      EXTENSION: '2-5 days',
      NEW_FLOW: '1-2 weeks',
      NEW_INFRA: '2-4 weeks',
    };
    return map[level] ?? 'unknown';
  }
}
