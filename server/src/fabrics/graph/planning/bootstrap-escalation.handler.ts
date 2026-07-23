/**
 * BootstrapEscalationHandler — IEscalationHandler bootstrap implementation.
 *
 * Applies architectural boundary invariants first (BLOCK, budget exhaustion),
 * then queries graph for historical ESCALATION_ACTION edges.
 *
 * Phase 2 note: ESCALATION_ACTION edges are NOT seeded in Phase 0 — they accumulate
 * from AI pipeline decisions in Phase 3. This query returns 0 edges in Phase 2.
 * The bootstrap safe default is therefore the ONLY path in Phase 2.
 * This is intentional and safe: the default enforces the architectural invariants.
 *
 * Phase 2: graph traversal only, no AI dependency.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IEscalationHandler,
  EscalationResult,
  EscalationAction,
  ArbiterPanelVerdicts,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapEscalationHandler extends IEscalationHandler {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
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
    // BOUNDARY CODE INVARIANT — never overridden by graph or AI:
    // BLOCK removes candidate from pool entirely
    const surviving = params.verdicts.candidates.filter(
      (c) => !params.verdicts.blocks.some((b) => b.candidateId === c.id),
    );

    // BOUNDARY: zero survivors → UNDECIDED
    if (surviving.length === 0) {
      return { action: 'UNDECIDED', reasoning: 'All candidates blocked' };
    }

    // BOUNDARY: budget exhausted (check BEFORE winner selection)
    if (params.cyclesUsed >= params.cycleBudget) {
      return {
        action: 'ESCALATE_TO_UPPER_JUDGE',
        reasoning: `Budget ${params.cycleBudget} exhausted at cycle ${params.cyclesUsed}`,
      };
    }

    // Graph query: what action did similar cases take?
    const threshold = this.config
      ? await this.config.get('engine.decision.confidenceThreshold', 0.9)
      : 0.9;

    const historicalEdges = await this.graphRag.query({
      fromEntity: `${params.archetype}:cycle_${params.cyclesUsed}`,
      relationship: 'ESCALATION_ACTION',
      minConfidence: threshold,
    });

    if (historicalEdges.edges[0]) {
      // High-confidence graph answer — use it
      return {
        action: historicalEdges.edges[0].toEntity as EscalationAction,
        reasoning: `Graph (confidence ${historicalEdges.edges[0].confidence.toFixed(2)}): ${historicalEdges.edges[0].reasoning ?? ''}`,
      };
    }

    // No confident graph data — bootstrap safe default: accept if one survivor
    if (surviving.length === 1) {
      return {
        action: surviving[0].challenges >= 3 ? 'CYCLE_WITH_PATCH' : 'ACCEPT',
        reasoning: 'Bootstrap default: single survivor, no graph history',
      };
    }

    // Multiple survivors — accept highest-scoring
    const winner = surviving.sort((a, b) => b.score - a.score)[0];
    return {
      action: 'ACCEPT',
      reasoning: `Bootstrap default: highest score ${winner.score}`,
      chosen: winner,
    };
  }
}
