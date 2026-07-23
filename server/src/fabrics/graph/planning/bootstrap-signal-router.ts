/**
 * BootstrapSignalRouter — ISignalRouter bootstrap implementation.
 *
 * Computes required signals by:
 *   - Always requiring OUTCOME (CF-SIGNAL-1 invariant)
 *   - Querying graph for REQUIRES_SIGNAL edges for this flow purpose
 *   - Adding context-driven signals from SK-468 rules (regardless of graph)
 *
 * verifyEmitted() is synchronous — checks required set against emitted set.
 *
 * Phase 2: graph traversal only, no AI dependency.
 */

import { Injectable, Inject } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { ISignalRouter, RequiredSignals, SignalType } from './planning-abstracts';

@Injectable()
export class BootstrapSignalRouter extends ISignalRouter {
  constructor(@Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService) {
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
    // Query graph for REQUIRES_SIGNAL edges for this flow purpose
    const graphSignals = await this.graphRag.query({
      fromEntity: `FLOW_PURPOSE:${flowContext.purpose}`,
      relationship: 'REQUIRES_SIGNAL',
    });

    const required = new Set<SignalType>(['OUTCOME']); // CF-SIGNAL-1: always required

    graphSignals.edges.forEach((e) => required.add(e.toEntity as SignalType));

    // Context-driven additions (from SK-468 — always required regardless of graph)
    if (flowContext.multiGenerateRan) required.add('MODEL_COMPARISON');
    if (flowContext.shadowRunActive) required.add('SHADOW_RUN');
    if (flowContext.arbiterPanelRan) required.add('ARBITER_VERDICT');
    if (flowContext.isMultiCycle) required.add('DPO_TRIPLE');
    if (flowContext.genesisPromptChanged) required.add('PROMPT_PATCH');
    if (flowContext.capabilityMissing) required.add('GAP_SIGNAL');
    if (flowContext.topologyWasWrong) required.add('DESIGN_FLAW');

    return {
      required: Array.from(required),
      reasoning: `graph:${graphSignals.edges.length} + context rules`,
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
    const missing = required.filter((r) => !emitted.includes(r));
    return {
      passed: missing.length === 0,
      missing,
      message:
        missing.length === 0
          ? 'All required signals emitted'
          : `CF-SIGNAL-2 VIOLATION: missing signals: ${missing.join(', ')}`,
    };
  }
}
