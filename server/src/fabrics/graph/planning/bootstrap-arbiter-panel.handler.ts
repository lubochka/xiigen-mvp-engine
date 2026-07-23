/**
 * BootstrapArbiterPanelHandler — IArbiterPanelHandler bootstrap implementation.
 *
 * Assembles arbiter panel by querying xiigen-decision-graph for:
 *   - REQUIRES_MINIMUM_ARBITER edges (always included)
 *   - OPTIONAL_ARBITER edges (included if confidence >= threshold)
 *   - PROMOTED_ARBITER edges (included at moderate confidence >= 0.70)
 *   - Context expansion via ADDS_ARBITER edges
 *
 * key_principles is always included — architectural invariant.
 * Falls back to ['key_principles'] alone when graph returns no edges.
 *
 * Phase 2: graph traversal only, no AI dependency.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IArbiterPanelHandler,
  ArbiterPanel,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapArbiterPanelHandler extends IArbiterPanelHandler {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
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
    const threshold = this.config
      ? await this.config.get('engine.decision.confidenceThreshold', 0.9)
      : 0.9;

    // Query for all arbiter relationships for this archetype
    const required = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'REQUIRES_MINIMUM_ARBITER',
      minConfidence: 0.0, // get all required arbiters regardless of confidence
    });

    const optional = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'OPTIONAL_ARBITER',
      minConfidence: threshold, // only high-confidence optional arbiters are included
    });

    const promoted = await this.graphRag.query({
      fromEntity: params.archetype,
      relationship: 'PROMOTED_ARBITER',
      minConfidence: 0.7, // promoted arbiters at moderate confidence
    });

    // key_principles is always included — invariant (immutable edge in graph)
    const arbiters = new Set<string>(['key_principles']);
    required.edges.forEach((e) => arbiters.add(e.toEntity));
    optional.edges.forEach((e) => arbiters.add(e.toEntity));
    promoted.edges.forEach((e) => arbiters.add(e.toEntity));

    // Context expansion (from SK-442 expansion rules — stored as graph edges)
    if (params.context.crossFlowEvents) {
      const crossFlow = await this.graphRag.query({
        fromEntity: 'CONTEXT:crossFlowEvents',
        relationship: 'ADDS_ARBITER',
      });
      crossFlow.edges.forEach((e) => arbiters.add(e.toEntity));
    }

    return {
      arbiters: Array.from(arbiters),
      source: required.edges.length > 0 ? 'bootstrap-graph-query' : 'fallback-invariant',
    };
  }
}
