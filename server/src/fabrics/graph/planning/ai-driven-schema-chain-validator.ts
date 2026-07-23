/**
 * AIDrivenSchemaChainValidator — ISchemaChainValidator AI-driven implementation (Phase 4).
 *
 * Confidence gate pattern:
 *   1. Query graph for FLOW:flowId → CHAIN_BREAK edges (high confidence)
 *   2. If high-confidence break edges found → return them (graph path)
 *   3. If no graph data or low confidence → call AI pipeline SCHEMA_CHAIN
 *   4. Store discovered breaks via IGraphLearningService.addDiscoveredEdge()
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  ISchemaChainValidator,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenSchemaChainValidator extends ISchemaChainValidator {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async validateChain(flowId: string): Promise<{
    valid: boolean;
    breaks: Array<{ producer: string; consumer: string; missingField: string }>;
  }> {
    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    // Query graph for known CHAIN_BREAK edges with high confidence
    const breakResult = await this.graphRag.query({
      fromEntity: `FLOW:${flowId}`,
      relationship: 'CHAIN_BREAK',
      minConfidence: threshold,
    });

    if (breakResult.edges.length > 0) {
      // High-confidence breaks found in graph
      const breaks = breakResult.edges.map((e) => {
        const [producer, consumer, missingField] = (e.toEntity ?? '').split('::');
        return {
          producer: producer ?? e.toEntity,
          consumer: consumer ?? 'unknown',
          missingField: missingField ?? 'unknown',
        };
      });
      return { valid: false, breaks };
    }

    // Check if graph has any (low-confidence) data for this flow
    const allBreaks = await this.graphRag.query({
      fromEntity: `FLOW:${flowId}`,
      relationship: 'CHAIN_BREAK',
    });

    // If graph has data (just low confidence) return it
    if (allBreaks.edges.length > 0) {
      const breaks = allBreaks.edges.map((e) => {
        const [producer, consumer, missingField] = (e.toEntity ?? '').split('::');
        return {
          producer: producer ?? e.toEntity,
          consumer: consumer ?? 'unknown',
          missingField: missingField ?? 'unknown',
        };
      });
      return { valid: false, breaks };
    }

    // No graph data — call AI pipeline
    const aiResult = await this.pipeline.decide({
      decisionType: 'SCHEMA_CHAIN',
      inputs: { flowId },
      graphContext: [],
      runId: `schema-chain-${flowId}-${Date.now()}`,
      flowId,
    });

    const breaks =
      (aiResult.decision as Array<{ producer: string; consumer: string; missingField: string }>) ??
      [];

    if (breaks.length > 0) {
      // Store discovered breaks in graph
      for (const brk of breaks) {
        await this.learning.addDiscoveredEdge({
          fromEntity: `FLOW:${flowId}`,
          fromType: 'Flow',
          relationship: 'CHAIN_BREAK',
          toEntity: `${brk.producer}::${brk.consumer}::${brk.missingField}`,
          toType: 'ChainBreak',
          reasoning: aiResult.reasoning,
          discoveredBy: `ai-schema-chain-${Date.now()}`,
        });
      }
    }

    return { valid: breaks.length === 0, breaks };
  }
}
