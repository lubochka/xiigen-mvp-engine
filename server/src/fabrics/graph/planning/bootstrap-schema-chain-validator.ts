/**
 * BootstrapSchemaChainValidator — ISchemaChainValidator bootstrap implementation.
 *
 * Validates schema chain integrity by querying:
 *   FLOW:${flowId} → CHAIN_BREAK → field
 *
 * Returns { valid: true, breaks: [] } if no break edges found (safe default).
 * The graph accumulates CHAIN_BREAK edges as schema violations are detected.
 *
 * Phase 2: graph traversal only, no AI dependency.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  ISchemaChainValidator,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapSchemaChainValidator extends ISchemaChainValidator {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {
    super();
  }

  async validateChain(flowId: string): Promise<{
    valid: boolean;
    breaks: Array<{ producer: string; consumer: string; missingField: string }>;
  }> {
    const threshold = this.config
      ? await this.config.get('engine.decision.confidenceThreshold', 0.9)
      : 0.9;

    // Query graph for CHAIN_BREAK edges for this flow
    const breakResult = await this.graphRag.query({
      fromEntity: `FLOW:${flowId}`,
      relationship: 'CHAIN_BREAK',
      minConfidence: threshold,
    });

    if (breakResult.edges.length === 0) {
      // No break edges found — chain is valid (safe default)
      return { valid: true, breaks: [] };
    }

    // Map edges to break records
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
}
