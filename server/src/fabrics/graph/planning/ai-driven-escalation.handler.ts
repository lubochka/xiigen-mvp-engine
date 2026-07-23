/**
 * AIDrivenEscalationHandler — IEscalationHandler AI-driven implementation (Phase 3).
 *
 * Confidence gate pattern:
 *   1. Apply boundary invariants (BLOCK removal, budget exhaustion) — NEVER delegated
 *   2. Query ESCALATION_ACTION edges for the archetype
 *   3. If high-confidence edges found → use graph result
 *   4. Below threshold or no edges → call IAIDecisionPipeline.decide()
 *   5. Store AI decision via IGraphLearningService.addDiscoveredEdge()
 *
 * Phase 3: superset of BootstrapEscalationHandler.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  IEscalationHandler,
  EscalationResult,
  EscalationAction,
  ArbiterPanelVerdicts,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenEscalationHandler extends IEscalationHandler {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async evaluate(params: {
    verdicts: ArbiterPanelVerdicts;
    cyclesUsed: number;
    cycleBudget: number;
    archetype: string;
    runId: string;
  }): Promise<EscalationResult> {
    // BOUNDARY INVARIANT: remove all BLOCK-class candidates first
    const surviving = params.verdicts.candidates.filter(
      (c) => !params.verdicts.blocks.some((b) => b.candidateId === c.id),
    );

    if (surviving.length === 0) {
      return { action: 'UNDECIDED', reasoning: 'No surviving candidates after arbiter blocks' };
    }

    // BOUNDARY INVARIANT: budget exhaustion → escalate to upper judge
    if (params.cyclesUsed >= params.cycleBudget) {
      return {
        action: 'ESCALATE_TO_UPPER_JUDGE',
        reasoning: `Budget ${params.cycleBudget} exhausted at cycle ${params.cyclesUsed}`,
      };
    }

    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    // Query historical ESCALATION_ACTION edges
    const edges = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'ESCALATION_ACTION',
      minConfidence: threshold,
    });

    if (edges.edges[0]) {
      return {
        action: edges.edges[0].toEntity as EscalationAction,
        reasoning: `Graph edge (confidence ${edges.edges[0].confidence.toFixed(2)}): ${edges.edges[0].reasoning ?? 'historical pattern'}`,
      };
    }

    // Below threshold or no edges — invoke AI pipeline
    const allEdges = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'ESCALATION_ACTION',
    });

    const aiResult = await this.pipeline.decide({
      decisionType: 'ESCALATION',
      inputs: {
        archetype: params.archetype,
        cyclesUsed: params.cyclesUsed,
        cycleBudget: params.cycleBudget,
        survivingCount: surviving.length,
        maxChallenges: Math.max(0, ...surviving.map((c) => c.challenges)),
      },
      graphContext: allEdges.edges,
      runId: params.runId,
      archetype: params.archetype,
    });

    const action = aiResult.decision as EscalationAction;

    await this.learning.addDiscoveredEdge({
      fromEntity: params.archetype,
      fromType: 'Archetype',
      relationship: 'ESCALATION_ACTION',
      toEntity: action,
      toType: 'EscalationAction',
      reasoning: aiResult.reasoning,
      discoveredBy: params.runId,
    });

    return {
      action,
      reasoning: `AI pipeline (confidence ${aiResult.confidence.toFixed(2)}): ${aiResult.reasoning}`,
    };
  }
}
