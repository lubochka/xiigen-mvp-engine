/**
 * AIDrivenArbiterPanelHandler — IArbiterPanelHandler AI-driven implementation (Phase 3).
 *
 * Confidence gate pattern:
 *   1. Query REQUIRES_MINIMUM_ARBITER edges for the archetype
 *   2. If all edges >= threshold → use graph result (includes key_principles invariant)
 *   3. Novel archetype or low-confidence edges → call IAIDecisionPipeline.decide()
 *   4. Seed new archetype→arbiter edges from AI decision
 *
 * key_principles is always added regardless of AI result (CF-PANEL-1 invariant).
 *
 * Phase 3: superset of BootstrapArbiterPanelHandler.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  IArbiterPanelHandler,
  ArbiterPanel,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenArbiterPanelHandler extends IArbiterPanelHandler {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async assemblePanel(params: {
    archetype: string;
    context: {
      crossFlowEvents: boolean;
      newAlgorithmicPattern: boolean;
      isFirstOfArchetype: boolean;
      runId: string;
    };
  }): Promise<ArbiterPanel> {
    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    const required = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'REQUIRES_MINIMUM_ARBITER',
    });

    const belowThreshold = required.edges.filter((e) => e.confidence < threshold);
    const hasEnoughHighConfidence = required.edges.length > 0 && belowThreshold.length === 0;

    if (hasEnoughHighConfidence) {
      // All required arbiters high-confidence — use graph directly (bootstrap path)
      const arbiters = new Set<string>(['key_principles']);
      required.edges.forEach((e) => arbiters.add(e.toEntity));
      return { arbiters: Array.from(arbiters), source: 'bootstrap-graph-query' };
    }

    // Novel archetype or low-confidence edges — invoke AI
    const aiResult = await this.pipeline.decide({
      decisionType: 'PANEL_ASSEMBLY',
      inputs: {
        archetype: params.archetype,
        contextDescription: JSON.stringify(params.context),
      },
      graphContext: required.edges,
      runId: params.context.runId,
      archetype: params.archetype,
    });

    const panel = (aiResult.decision as string[]) ?? ['key_principles', 'iron_rules'];
    const arbiters = new Set<string>(['key_principles', ...panel]);

    // Seed new archetype edges from AI decision
    for (const arbiter of arbiters) {
      if (!required.edges.some((e) => e.toEntity === arbiter)) {
        await this.learning.addDiscoveredEdge({
          fromEntity: params.archetype,
          fromType: 'Archetype',
          relationship: 'REQUIRES_MINIMUM_ARBITER',
          toEntity: arbiter,
          toType: 'ArbiterRole',
          reasoning: aiResult.reasoning,
          discoveredBy: params.context.runId,
        });
      }
    }

    return {
      arbiters: Array.from(arbiters),
      source: 'ai-pipeline',
      reasoning: aiResult.reasoning,
    };
  }
}
