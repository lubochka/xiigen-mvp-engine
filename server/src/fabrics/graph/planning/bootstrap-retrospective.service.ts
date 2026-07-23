/**
 * BootstrapRetrospectiveService — IRetrospectiveService bootstrap implementation.
 *
 * Runs retrospective R1 gate for a flow:
 *   - Calls ElasticsearchGraphLearningProvider.promoteEdgeIfThresholdMet() for relevant archetypes
 *   - Returns clearToProceed: true in bootstrap mode (no calibration gate until Phase 4)
 *
 * The calibration gate (score thresholds, model bias checks) is Phase 4.
 * In Phase 2, this service proves the wiring works and edges can be promoted.
 *
 * Phase 2: graph learning calls only, no AI dependency.
 */

import { Injectable, Inject, Optional, Logger } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import {
  IRetrospectiveService,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapRetrospectiveService extends IRetrospectiveService {
  private readonly logger = new Logger(BootstrapRetrospectiveService.name);

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
    @Optional() @Inject(GRAPH_LEARNING_SERVICE) private readonly learning?: IGraphLearningService,
  ) {
    super();
  }

  async runR1(flowId: string): Promise<{
    calibration: Record<string, number>;
    clearToProceed: boolean;
    promotionResults: Array<{ archetype: string; arbiter: string; result: string }>;
  }> {
    const promotionResults: Array<{ archetype: string; arbiter: string; result: string }> = [];

    // Query graph for archetypes that ran in this flow
    const archetypeEdges = await this.graphRag.query({
      fromEntity: `FLOW:${flowId}`,
      relationship: 'EXECUTED_ARCHETYPE',
    });

    // For each archetype, attempt to promote edges that have reached threshold
    for (const archetypeEdge of archetypeEdges.edges) {
      const archetype = archetypeEdge.toEntity;

      // Query optional arbiters for this archetype to attempt promotion
      const optionalArbiters = await this.graphRag.query({
        fromEntity: archetype,
        relationship: 'OPTIONAL_ARBITER',
      });

      for (const arbiterEdge of optionalArbiters.edges) {
        if (this.learning) {
          const result = await this.learning.promoteEdgeIfThresholdMet({
            fromEntity: archetype,
            currentRelationship: 'OPTIONAL_ARBITER',
            toEntity: arbiterEdge.toEntity,
          });
          if (result !== 'UNCHANGED') {
            promotionResults.push({ archetype, arbiter: arbiterEdge.toEntity, result });
            this.logger.log(`R1 promotion: ${archetype}/${arbiterEdge.toEntity} → ${result}`);
          }
        }
      }
    }

    // Bootstrap mode: calibration gate not active until Phase 4
    // clearToProceed is always true in Phase 2
    return {
      calibration: {}, // Phase 4 fills this with score analysis
      clearToProceed: true, // Phase 4 gates this on calibration results
      promotionResults,
    };
  }
}
