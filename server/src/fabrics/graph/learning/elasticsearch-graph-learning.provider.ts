/**
 * ElasticsearchGraphLearningProvider — IGraphLearningService implementation.
 *
 * Delegates all graph mutations to IGraphRagService (upsertEdge / updateEdgeWeight).
 * Reads promotion thresholds from IGraphConfigReader (backed by FreedomConfigManager).
 *
 * Phase 2: graph-only operations, no AI dependency.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IGraphLearningService } from '../interfaces/i-graph-learning.service';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { IGraphConfigReader, GRAPH_CONFIG_READER } from '../planning/planning-abstracts';

@Injectable()
export class ElasticsearchGraphLearningProvider extends IGraphLearningService {
  private readonly logger = new Logger(ElasticsearchGraphLearningProvider.name);

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {
    super();
  }

  async updateEdge(update: {
    fromEntity: string;
    relationship: string;
    toEntity: string;
    outcomeWasPositive: boolean;
    confidence_delta: number;
    observationCount_delta: 1;
    runId: string;
    reasoning: string;
  }): Promise<void> {
    const delta = update.outcomeWasPositive
      ? Math.abs(update.confidence_delta)
      : -Math.abs(update.confidence_delta);

    await this.graphRag.updateEdgeWeight({
      fromEntity: update.fromEntity,
      relationship: update.relationship,
      toEntity: update.toEntity,
      delta,
      observationId: update.runId,
    });

    this.logger.debug(
      `Edge updated: ${update.fromEntity}→${update.relationship}→${update.toEntity} ` +
        `delta=${delta} (${update.reasoning})`,
    );
  }

  async addDiscoveredEdge(edge: {
    fromEntity: string;
    fromType: string;
    relationship: string;
    toEntity: string;
    toType: string;
    reasoning: string;
    discoveredBy: string;
  }): Promise<void> {
    // Newly discovered edges seed at 0.60 — below solidificationAt threshold
    await this.graphRag.upsertEdge({
      ...edge,
      confidence: 0.6,
      source: `discovered:${edge.discoveredBy}`,
      reasoning: edge.reasoning,
      immutable: false,
    });

    this.logger.log(
      `New edge discovered: ${edge.fromEntity}→${edge.relationship}→${edge.toEntity} ` +
        `by run ${edge.discoveredBy}`,
    );
  }

  async promoteEdgeIfThresholdMet(edge: {
    fromEntity: string;
    currentRelationship: 'OPTIONAL_ARBITER' | 'PROMOTED_ARBITER';
    toEntity: string;
  }): Promise<'PROMOTED' | 'REQUIRED' | 'UNCHANGED'> {
    const result = await this.graphRag.query({
      fromEntity: edge.fromEntity,
      relationship: edge.currentRelationship,
      toEntity: edge.toEntity,
    });

    if (!result.edges[0]) return 'UNCHANGED';

    const current = result.edges[0];
    const observations = current.observationCount;

    // Read thresholds from FREEDOM config — NOT hardcoded
    const optToPromoted = this.config
      ? await this.config.get('engine.graph.optionalToPromotedThreshold', 3)
      : 3;
    const promToRequired = this.config
      ? await this.config.get('engine.graph.promotedToRequiredThreshold', 5)
      : 5;

    if (edge.currentRelationship === 'OPTIONAL_ARBITER' && observations >= optToPromoted) {
      await this.graphRag.upsertEdge({
        fromEntity: edge.fromEntity,
        fromType: current.fromType,
        relationship: 'PROMOTED_ARBITER', // upgrade the relationship type
        toEntity: edge.toEntity,
        toType: current.toType,
        confidence: current.confidence,
        source: current.source,
        reasoning: `Auto-promoted after ${observations} positive observations`,
        immutable: false,
      });
      this.logger.log(`PROMOTED: ${edge.fromEntity}→${edge.toEntity} (${observations} obs)`);
      return 'PROMOTED';
    }

    if (edge.currentRelationship === 'PROMOTED_ARBITER' && observations >= promToRequired) {
      await this.graphRag.upsertEdge({
        fromEntity: edge.fromEntity,
        fromType: current.fromType,
        relationship: 'REQUIRES_MINIMUM_ARBITER', // final promotion
        toEntity: edge.toEntity,
        toType: current.toType,
        confidence: current.confidence,
        source: current.source,
        reasoning: `Required after ${observations} confirmed observations`,
        immutable: false,
      });
      this.logger.log(`REQUIRED: ${edge.fromEntity}→${edge.toEntity} (${observations} obs)`);
      return 'REQUIRED';
    }

    return 'UNCHANGED';
  }
}
