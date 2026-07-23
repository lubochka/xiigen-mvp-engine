/**
 * AIDrivenCycleRouter — ICycleRouter AI-driven implementation (Phase 3).
 *
 * Confidence gate pattern:
 *   1. Apply boundary invariants (STRUCTURAL stop, budget escalation) — NEVER delegated
 *   2. Query graph for archetype-specific + generic score bracket edges
 *   3. If all relevant edges >= threshold → use graph result (bootstrap path)
 *   4. Below threshold or no edges → call IAIDecisionPipeline.decide()
 *   5. Store AI decision via IGraphLearningService.addDiscoveredEdge()
 *
 * Phase 3: superset of BootstrapCycleRouter — high-confidence path is identical.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import { GraphEdge } from '../interfaces/graph-types';
import {
  ICycleRouter,
  CycleRouteResult,
  CycleAction,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenCycleRouter extends ICycleRouter {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async route(params: {
    score: number;
    archetype: string;
    cycle: number;
    budget: number;
    subScores: Record<string, number>;
    runId: string;
  }): Promise<CycleRouteResult> {
    // BOUNDARY INVARIANTS — never delegated to graph or AI
    if (params.score < 0.5) {
      return {
        action: 'STOP_STRUCTURAL',
        note: 'Below STRUCTURAL threshold — root cause required',
        decidingEdge: {
          fromEntity: 'SCORE_BRACKET:STRUCTURAL',
          relationship: 'TRIGGERS_ACTION',
          toEntity: 'STOP_STRUCTURAL',
          confidence: 1.0,
        },
      };
    }
    if (params.cycle >= params.budget) {
      return { action: 'ESCALATE_TO_UPPER_JUDGE', note: `Budget ${params.budget} exhausted` };
    }

    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);
    const bracketKey = this.scoreBracketKey(params.score);

    // Attempt graph first — archetype-specific
    const archetypeEdge = await this.graphRag.query({
      fromEntity: `${params.archetype}:${bracketKey}`,
      relationship: 'ROUTES_TO',
      minConfidence: threshold,
    });
    if (archetypeEdge.edges[0]) {
      return this.buildResultFromEdge(archetypeEdge.edges[0], params.subScores);
    }

    // Attempt graph — generic bracket
    const genericEdge = await this.graphRag.query({
      fromEntity: bracketKey,
      relationship: 'ROUTES_TO',
      minConfidence: threshold,
    });
    if (genericEdge.edges[0]) {
      return this.buildResultFromEdge(genericEdge.edges[0], params.subScores);
    }

    // Below threshold or no edge — invoke AI pipeline
    const allEdges = await this.graphRag.query({
      fromEntity: bracketKey,
      relationship: 'ROUTES_TO',
    });

    const aiResult = await this.pipeline.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: {
        score: params.score,
        archetype: params.archetype,
        cycle: params.cycle,
        budget: params.budget,
        bottleneck: this.findBottleneck(params.subScores),
      },
      graphContext: allEdges.edges,
      runId: params.runId,
      archetype: params.archetype,
    });

    const action = aiResult.decision as CycleAction;

    // Update graph with AI decision — confidence grows from this observation
    await this.learning.addDiscoveredEdge({
      fromEntity: `${params.archetype}:${bracketKey}`,
      fromType: 'ArchetypeBracket',
      relationship: 'ROUTES_TO',
      toEntity: action,
      toType: 'CycleAction',
      reasoning: aiResult.reasoning,
      discoveredBy: params.runId,
    });

    return {
      action,
      bottleneck: this.findBottleneck(params.subScores),
      note: `AI pipeline (confidence ${aiResult.confidence.toFixed(2)}): ${aiResult.reasoning}`,
    };
  }

  private scoreBracketKey(score: number): string {
    if (score >= 0.85) return 'SCORE_BRACKET:PASS';
    if (score >= 0.65) return 'SCORE_BRACKET:DETAIL_GAP';
    if (score >= 0.5) return 'SCORE_BRACKET:PATTERN_MISSING';
    return 'SCORE_BRACKET:STRUCTURAL';
  }

  private buildResultFromEdge(
    edge: GraphEdge,
    subScores: Record<string, number>,
  ): CycleRouteResult {
    return {
      action: edge.toEntity as CycleAction,
      bottleneck: this.findBottleneck(subScores),
      decidingEdge: {
        fromEntity: edge.fromEntity,
        relationship: edge.relationship,
        toEntity: edge.toEntity,
        confidence: edge.confidence,
      },
    };
  }

  private findBottleneck(subScores: Record<string, number>): string {
    const entries = Object.entries(subScores);
    if (!entries.length) return 'unknown';
    return entries.sort(([, a], [, b]) => a - b)[0][0];
  }
}
