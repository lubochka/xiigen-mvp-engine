/**
 * AIDrivenNodeCompletenessValidator — INodeCompletenessValidator AI-driven implementation (Phase 4).
 *
 * Confidence gate pattern:
 *   1. Hard checks first (same invariants as bootstrap — CF-NODE-1, CF-NODE-2)
 *      Hard violations return immediately — no AI delegation
 *   2. Query graph for archetype-specific completeness grade
 *   3. If graph confidence >= threshold → use graph grade
 *   4. Below threshold or no edges → call IAIDecisionPipeline for AI grading
 *   5. Store AI grade via IGraphLearningService.addDiscoveredEdge()
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  INodeCompletenessValidator,
  NodeRepresentation,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenNodeCompletenessValidator extends INodeCompletenessValidator {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async validate(params: { node: NodeRepresentation; archetype: string }): Promise<{
    passed: boolean;
    hardViolations: string[];
    aiGrading?: { overallScore: number; suggestions: string[] };
  }> {
    // STEP 1: Hard checks — never delegated (CF-NODE-1, CF-NODE-2)
    const violations = this.runHardChecks(params.node);
    if (violations.length > 0) {
      return { passed: false, hardViolations: violations };
    }

    const threshold = await this.config.get('engine.nodeValidation.completenessThreshold', 0.75);
    const aiThreshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    // STEP 2: Query graph for archetype-specific completeness standards
    const graphResult = await this.graphRag.query({
      fromEntity: `ARCHETYPE:${params.archetype}`,
      relationship: 'COMPLETENESS_STANDARD',
      minConfidence: aiThreshold,
    });

    if (graphResult.edges[0]) {
      const edge = graphResult.edges[0];
      const score = edge.confidence;
      return {
        passed: score >= threshold,
        hardViolations: [],
        aiGrading: { overallScore: score, suggestions: [edge.reasoning ?? 'graph-driven'] },
      };
    }

    // STEP 3: AI pipeline
    const allEdges = await this.graphRag.query({
      fromEntity: `ARCHETYPE:${params.archetype}`,
      relationship: 'COMPLETENESS_STANDARD',
    });

    const aiResult = await this.pipeline.decide({
      decisionType: 'NODE_COMPLETENESS',
      inputs: {
        archetype: params.archetype,
        nodeIntent: params.node.intent,
      },
      graphContext: allEdges.edges,
      runId: `node-${params.archetype}-${Date.now()}`,
      archetype: params.archetype,
    });

    const aiDecision = aiResult.decision as {
      overallScore?: number;
      suggestions?: string[];
    } | null;
    const overallScore =
      typeof aiDecision?.overallScore === 'number'
        ? Math.min(1, Math.max(0, aiDecision.overallScore))
        : aiResult.confidence;
    const suggestions = aiDecision?.suggestions ?? [aiResult.reasoning];

    // Store grade in graph
    await this.learning.addDiscoveredEdge({
      fromEntity: `ARCHETYPE:${params.archetype}`,
      fromType: 'ArchetypeCompleteness',
      relationship: 'COMPLETENESS_STANDARD',
      toEntity: `SCORE:${overallScore.toFixed(2)}`,
      toType: 'CompletenessScore',
      reasoning: aiResult.reasoning,
      discoveredBy: `ai-node-completeness-${Date.now()}`,
    });

    return {
      passed: overallScore >= threshold,
      hardViolations: [],
      aiGrading: { overallScore, suggestions },
    };
  }

  private runHardChecks(node: NodeRepresentation): string[] {
    const violations: string[] = [];
    if (!node.intent.purpose?.trim()) {
      violations.push('NODE-HARD-001: purpose is empty — cannot derive genesis prompt');
    }
    if (!node.intent.failureModes?.length) {
      violations.push('NODE-002: failureModes[] is empty — iron rules cannot be derived');
    }
    if ((node.intent.domainConcepts?.length ?? 0) < 2) {
      violations.push('NODE-003: domainConcepts[] has < 2 items');
    }
    const stackTerms = /NestJS|@Injectable|Bull|BullMQ|ioredis|extends \w+Service/;
    if (stackTerms.test(node.intent.purpose ?? '')) {
      violations.push('NODE-001: purpose contains stack terminology');
    }
    return violations;
  }
}
