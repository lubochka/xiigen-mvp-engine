/**
 * AIDrivenSignalRouter — ISignalRouter AI-driven implementation (Phase 3).
 *
 * Confidence gate pattern:
 *   1. Always require OUTCOME (CF-SIGNAL-1 invariant — never delegated)
 *   2. Add context-driven mandatory signals (MODEL_COMPARISON, SHADOW_RUN, ARBITER_VERDICT) — definitional
 *   3. Query REQUIRES_SIGNAL edges with minConfidence threshold
 *   4. If high-confidence edges found → use graph result
 *   5. Below threshold or no edges → call IAIDecisionPipeline.decide()
 *   6. Store AI decision via IGraphLearningService.addDiscoveredEdge()
 *
 * verifyEmitted() is synchronous — inherited logic identical to bootstrap.
 *
 * Phase 3: superset of BootstrapSignalRouter.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  ISignalRouter,
  RequiredSignals,
  SignalType,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenSignalRouter extends ISignalRouter {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async computeRequired(flowContext: {
    flowId: string;
    purpose: string;
    isMultiCycle: boolean;
    capabilityMissing: boolean;
    genesisPromptChanged: boolean;
    topologyWasWrong: boolean;
    multiGenerateRan: boolean;
    shadowRunActive: boolean;
    arbiterPanelRan: boolean;
  }): Promise<RequiredSignals> {
    // CF-SIGNAL-1: OUTCOME always required — non-negotiable
    const required = new Set<SignalType>(['OUTCOME']);

    // Context-driven mandatory signals — definitional, not learnable
    if (flowContext.multiGenerateRan) required.add('MODEL_COMPARISON');
    if (flowContext.shadowRunActive) required.add('SHADOW_RUN');
    if (flowContext.arbiterPanelRan) required.add('ARBITER_VERDICT');

    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    const graphEdges = await this.graphRag.query({
      fromEntity: flowContext.purpose,
      relationship: 'REQUIRES_SIGNAL',
      minConfidence: threshold,
    });

    if (graphEdges.edges.length > 0) {
      graphEdges.edges.forEach((e) => required.add(e.toEntity as SignalType));
      return {
        required: Array.from(required),
        reasoning: `Graph edges (${graphEdges.edges.length} high-confidence REQUIRES_SIGNAL)`,
      };
    }

    // Below threshold or no edges — invoke AI pipeline
    const allEdges = await this.graphRag.query({
      fromEntity: flowContext.purpose,
      relationship: 'REQUIRES_SIGNAL',
    });

    const aiResult = await this.pipeline.decide({
      decisionType: 'SIGNAL_SELECTION',
      inputs: {
        purpose: flowContext.purpose,
        multiGenerateRan: flowContext.multiGenerateRan,
        shadowRunActive: flowContext.shadowRunActive,
        arbiterPanelRan: flowContext.arbiterPanelRan,
      },
      graphContext: allEdges.edges,
      runId: flowContext.flowId,
    });

    const aiSignals = (aiResult.decision as SignalType[]) ?? [];
    aiSignals.forEach((s) => required.add(s));

    // CF-SIGNAL-1: enforce OUTCOME even if AI omitted it
    required.add('OUTCOME');

    // Store AI-discovered signal requirements
    for (const signal of aiSignals) {
      if (!allEdges.edges.some((e) => e.toEntity === signal)) {
        await this.learning.addDiscoveredEdge({
          fromEntity: flowContext.purpose,
          fromType: 'FlowPurpose',
          relationship: 'REQUIRES_SIGNAL',
          toEntity: signal,
          toType: 'SignalType',
          reasoning: aiResult.reasoning,
          discoveredBy: flowContext.flowId,
        });
      }
    }

    return {
      required: Array.from(required),
      reasoning: `AI pipeline (confidence ${aiResult.confidence.toFixed(2)}): ${aiResult.reasoning}`,
    };
  }

  verifyEmitted(
    required: SignalType[],
    emitted: SignalType[],
  ): {
    passed: boolean;
    missing: SignalType[];
    message: string;
  } {
    const emittedSet = new Set(emitted);
    const missing = required.filter((s) => !emittedSet.has(s));
    return {
      passed: missing.length === 0,
      missing,
      message:
        missing.length === 0
          ? 'All required signals emitted'
          : `Missing signals: ${missing.join(', ')}`,
    };
  }
}
