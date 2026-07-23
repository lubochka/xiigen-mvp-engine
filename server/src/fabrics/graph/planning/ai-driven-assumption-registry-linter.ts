/**
 * AIDrivenAssumptionRegistryLinter — IAssumptionRegistryLinter AI-driven implementation (Phase 4).
 *
 * Confidence gate pattern:
 *   1. Structural checks first (CF-ASSUME-1, CF-ASSUME-2) — never delegated to AI
 *   2. Query graph for known violation patterns
 *   3. If high-confidence violations found → return graph result
 *   4. Below threshold → call AI pipeline ASSUMPTION_LINT for deep analysis
 *   5. Store discovered violations via IGraphLearningService.addDiscoveredEdge()
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  IAssumptionRegistryLinter,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
  IAIDecisionPipeline,
} from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

@Injectable()
export class AIDrivenAssumptionRegistryLinter extends IAssumptionRegistryLinter {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(AI_DECISION_PIPELINE) private readonly pipeline: IAIDecisionPipeline,
    @Inject(GRAPH_CONFIG_READER) private readonly config: IGraphConfigReader,
  ) {
    super();
  }

  async lint(sessionFileContent: string): Promise<{
    passed: boolean;
    violations: string[];
  }> {
    // STEP 1: Structural checks — CF-ASSUME-1, CF-ASSUME-2 (never delegated)
    const structural = this.runStructuralChecks(sessionFileContent);
    if (structural.length > 0) {
      return { passed: false, violations: structural };
    }

    const threshold = await this.config.get('engine.decision.aiThreshold', 0.9);

    // STEP 2: Query graph for known assumption violation patterns
    const graphResult = await this.graphRag.query({
      fromEntity: 'ASSUMPTION_PATTERN:VIOLATION',
      relationship: 'DETECTED_IN',
      minConfidence: threshold,
    });

    if (graphResult.edges.length > 0) {
      // High-confidence violations known from graph
      const violations = graphResult.edges.map(
        (e) => e.reasoning ?? `Pattern violation: ${e.toEntity}`,
      );
      return { passed: false, violations };
    }

    // STEP 3: AI deep analysis
    const allEdges = await this.graphRag.query({
      fromEntity: 'ASSUMPTION_PATTERN:VIOLATION',
      relationship: 'DETECTED_IN',
    });

    const aiResult = await this.pipeline.decide({
      decisionType: 'ASSUMPTION_LINT',
      inputs: { excerpt: sessionFileContent.substring(0, 2000) },
      graphContext: allEdges.edges,
      runId: `assumption-lint-${Date.now()}`,
    });

    const violations = (aiResult.decision as string[]) ?? [];

    if (violations.length > 0) {
      await this.learning.addDiscoveredEdge({
        fromEntity: 'ASSUMPTION_PATTERN:VIOLATION',
        fromType: 'AssumptionPattern',
        relationship: 'DETECTED_IN',
        toEntity: `session:${Date.now()}`,
        toType: 'SessionFile',
        reasoning: aiResult.reasoning,
        discoveredBy: `ai-assumption-lint-${Date.now()}`,
      });
    }

    return { passed: violations.length === 0, violations };
  }

  private runStructuralChecks(content: string): string[] {
    const violations: string[] = [];

    // CF-ASSUME-1: Assumption without verification command
    const assumptionLines = content.match(/^.*ASSUMPTION.*$/gm) ?? [];
    for (const line of assumptionLines) {
      if (!line.includes('VERIFY:') && !line.includes('verify:') && !line.includes('```')) {
        violations.push(
          `CF-ASSUME-1: Assumption without verification command: "${line.trim().substring(0, 80)}"`,
        );
      }
    }

    // CF-ASSUME-2: Non-blocking assumption without fallback
    const nonBlockingLines = content.match(/^.*NON.BLOCKING.*$/gim) ?? [];
    for (const line of nonBlockingLines) {
      if (!line.includes('FALLBACK:') && !line.includes('fallback:')) {
        violations.push(
          `CF-ASSUME-2: Non-blocking assumption without fallback: "${line.trim().substring(0, 80)}"`,
        );
      }
    }

    return violations;
  }
}
