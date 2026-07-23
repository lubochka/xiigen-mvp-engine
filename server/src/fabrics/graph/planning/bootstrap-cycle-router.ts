/**
 * BootstrapCycleRouter — ICycleRouter bootstrap implementation.
 *
 * Routes the cycle decision by:
 *   1. Applying boundary invariants (STRUCTURAL stop, budget escalation)
 *   2. Querying graph for archetype-specific score bracket routing
 *   3. Falling back to generic score bracket routing
 *   4. Applying SK-462 bootstrap default if no graph entry exists
 *
 * Score brackets: PASS (>=0.85), DETAIL_GAP (>=0.65), PATTERN_MISSING (>=0.50), STRUCTURAL (<0.50)
 *
 * Phase 2: graph traversal only, no AI dependency.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GraphEdge } from '../interfaces/graph-types';
import {
  ICycleRouter,
  CycleRouteResult,
  CycleAction,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapCycleRouter extends ICycleRouter {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
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
    // ENG-01: Graph override check — must run BEFORE the STRUCTURAL boundary.
    // Queries xiigen-planning-decisions for a MACHINE_CONSTANT_INVERSION edge that
    // pre-approves a CYCLE_WITH_PATCH action for this task type + archetype combination.
    // If present, the pre-approved override wins over the STRUCTURAL stop.
    if (params.score < 0.5) {
      const overrideResult = await this.graphRag.query({
        fromEntity: `${params.archetype}:${params.runId}`,
        relationship: 'MACHINE_CONSTANT_INVERSION',
        minConfidence: 0.8,
      });
      const overrideEdge = overrideResult.edges[0];
      if (
        overrideEdge &&
        (overrideEdge.metadata as Record<string, unknown>)?.['action'] === 'CYCLE_WITH_PATCH'
      ) {
        return {
          action: 'CYCLE_WITH_PATCH',
          note: 'STRUCTURAL boundary overridden by MACHINE_CONSTANT_INVERSION planning decision',
          patchClass: ((overrideEdge.metadata as Record<string, unknown>)?.['patchClass'] ===
          'DETAIL_GAP'
            ? 'DETAIL_GAP'
            : 'PATTERN_MISSING') as 'DETAIL_GAP' | 'PATTERN_MISSING',
          decidingEdge: {
            fromEntity: overrideEdge.fromEntity,
            relationship: overrideEdge.relationship,
            toEntity: overrideEdge.toEntity,
            confidence: overrideEdge.confidence,
          },
        };
      }
      // No valid override — apply boundary invariant
      return {
        action: 'STOP_STRUCTURAL',
        note: 'Score below STRUCTURAL threshold — root cause required before retry',
        decidingEdge: {
          fromEntity: 'SCORE_BRACKET:STRUCTURAL',
          relationship: 'TRIGGERS_ACTION',
          toEntity: 'STOP_STRUCTURAL',
          confidence: 1.0,
        },
      };
    }

    // BOUNDARY INVARIANT: budget exhausted → escalate
    if (params.cycle >= params.budget) {
      return {
        action: 'ESCALATE_TO_UPPER_JUDGE',
        note: `Cycle ${params.cycle} of ${params.budget} budget`,
      };
    }

    // Graph query: what does the graph say for this score bracket + archetype?
    const bracketKey = this.scoreBracketKey(params.score);
    const threshold = this.config
      ? await this.config.get('engine.decision.confidenceThreshold', 0.9)
      : 0.9;

    // Try archetype-specific bracket first
    const archetypeSpecific = await this.graphRag.query({
      fromEntity: `${params.archetype}:${bracketKey}`,
      relationship: 'ROUTES_TO',
      minConfidence: threshold,
    });

    if (archetypeSpecific.edges[0]) {
      return this.buildResultFromEdge(archetypeSpecific.edges[0], params.subScores);
    }

    // Fall back to generic bracket
    const generic = await this.graphRag.query({
      fromEntity: bracketKey,
      relationship: 'ROUTES_TO',
      minConfidence: threshold,
    });

    if (generic.edges[0]) {
      return this.buildResultFromEdge(generic.edges[0], params.subScores);
    }

    // Bootstrap safe default from SK-462 score brackets
    return this.bootstrapDefault(params.score, params.subScores);
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
    const bottleneck = this.findBottleneck(subScores);
    return {
      action: edge.toEntity as CycleAction,
      bottleneck,
      decidingEdge: {
        fromEntity: edge.fromEntity,
        relationship: edge.relationship,
        toEntity: edge.toEntity,
        confidence: edge.confidence,
      },
    };
  }

  private bootstrapDefault(score: number, subScores: Record<string, number>): CycleRouteResult {
    const bottleneck = this.findBottleneck(subScores);
    if (score >= 0.85) return { action: 'ACCEPT' };
    if (score >= 0.65)
      return {
        action: 'CYCLE_WITH_PATCH',
        bottleneck,
        patchClass: 'DETAIL_GAP',
        note: 'bootstrap default',
      };
    return {
      action: 'CYCLE_WITH_PATTERN',
      patchClass: 'PATTERN_MISSING',
      note: 'bootstrap default',
    };
  }

  private findBottleneck(subScores: Record<string, number>): string {
    const entries = Object.entries(subScores);
    if (!entries.length) return 'unknown';
    return entries.sort(([, a], [, b]) => a - b)[0][0];
  }
}
