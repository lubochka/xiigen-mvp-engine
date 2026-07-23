/**
 * AIDrivenDifficultyPredictor — IDifficultyPredictor AI-driven implementation (Phase 3).
 *
 * Confidence gate pattern:
 *   1. First-occurrence check via IRagService (identical to bootstrap)
 *   2. Query HISTORICAL_CYCLE_BUDGET edges with minConfidence threshold
 *   3. If high-confidence edges found → use graph result (bootstrap path)
 *   4. Below threshold or no edges → call IAIDecisionPipeline.decide()
 *   5. Store AI decision via IGraphLearningService.addDiscoveredEdge()
 *
 * Constructor inject order: [GRAPH_RAG_SERVICE, RAG_SERVICE, GRAPH_LEARNING_SERVICE,
 *                            AI_DECISION_PIPELINE, GRAPH_CONFIG_READER]
 * Factory in graph.module.ts injects in this exact order.
 *
 * Phase 3: superset of BootstrapDifficultyPredictor.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import { IRagService, RAG_SERVICE } from '../../interfaces/rag.interface';
import { ES_INDEX } from '../../../kernel/es-index-constants';
import {
  IDifficultyPredictor,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenDifficultyPredictor extends IDifficultyPredictor {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(RAG_SERVICE) private readonly rag: IRagService | undefined,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async predict(params: {
    archetype: string;
    novelPatterns: string[];
    hasClarityNote: boolean;
    isInversionCase: boolean;
  }): Promise<{ budget: number; rationale: string; confidence: number }> {
    // First-occurrence check (same as bootstrap — not learned)
    const firstOccurrence = await this.checkFirstOccurrence(params.archetype);

    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    // Query HISTORICAL_CYCLE_BUDGET edges
    const historicalEdges = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'HISTORICAL_CYCLE_BUDGET',
      minConfidence: threshold,
    });

    if (historicalEdges.edges[0]) {
      const budget = this.parseBudget(historicalEdges.edges[0].toEntity);
      return {
        budget,
        rationale: `Graph edge (confidence ${historicalEdges.edges[0].confidence.toFixed(2)}): historical budget for ${params.archetype}`,
        confidence: historicalEdges.edges[0].confidence,
      };
    }

    // Below threshold or no edges — invoke AI pipeline
    const allEdges = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'HISTORICAL_CYCLE_BUDGET',
    });

    const aiResult = await this.pipeline.decide({
      decisionType: 'BUDGET_PREDICTION',
      inputs: {
        archetype: params.archetype,
        novelPatterns: params.novelPatterns,
        hasClarityNote: params.hasClarityNote,
        isInversionCase: params.isInversionCase,
        firstOccurrence,
      },
      graphContext: allEdges.edges,
      runId: `predict-${params.archetype}-${Date.now()}`,
      archetype: params.archetype,
    });

    const rawBudget =
      typeof aiResult.decision === 'number'
        ? aiResult.decision
        : parseInt(String(aiResult.decision), 10);
    const budget = Math.max(1, Math.min(4, isNaN(rawBudget) ? 2 : rawBudget));

    await this.learning.addDiscoveredEdge({
      fromEntity: params.archetype,
      fromType: 'Archetype',
      relationship: 'HISTORICAL_CYCLE_BUDGET',
      toEntity: String(budget),
      toType: 'BudgetValue',
      reasoning: aiResult.reasoning,
      discoveredBy: `predict-${params.archetype}`,
    });

    return {
      budget,
      rationale: `AI pipeline (confidence ${aiResult.confidence.toFixed(2)}): ${aiResult.reasoning}`,
      confidence: aiResult.confidence,
    };
  }

  private async checkFirstOccurrence(archetype: string): Promise<number> {
    if (!this.rag) return 0;
    try {
      const result = await this.rag.search(archetype, {
        namespace: ES_INDEX.RAG_PATTERNS,
        topK: 1,
      });
      return result.isSuccess && result.data && result.data.length > 0 ? 0 : 1;
    } catch {
      return 0;
    }
  }

  private parseBudget(value: string): number {
    const n = parseInt(value, 10);
    return Math.max(1, Math.min(4, isNaN(n) ? 2 : n));
  }
}
