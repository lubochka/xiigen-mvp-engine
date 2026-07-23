/**
 * AIDrivenRetrospectiveService — IRetrospectiveService AI-driven implementation (Phase 4).
 *
 * Replaces the Phase 2 bootstrap no-op calibration with active learning loop:
 *   1. loadOutcomeStore()  — query xiigen-flow-lifecycle for RoutingDecisionOutcomes
 *   2. processRoutingOutcomes() — classify each outcome, call learning.updateEdge()
 *   3. loadFlowArbiters() — load ARBITER_VERDICT signals from xiigen-training-data
 *   4. Promote edges via promoteEdgeIfThresholdMet()
 *   5. upgradeTripleQuality() — set OUTCOME_PENDING → VALIDATED for this flow's DPO triples
 *   6. Gate clearToProceed on calibration threshold
 *
 * Codebase adaptations:
 *   - ELASTICSEARCH_SERVICE → DATABASE_SERVICE (IDatabaseService)
 *   - FREEDOM_CONFIG → GRAPH_CONFIG_READER (numeric only)
 *   - es.update() → searchDocuments() + storeDocument() (no native update in IDatabaseService)
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import { IDatabaseService, DATABASE_SERVICE, IQueueService, QUEUE_SERVICE } from '../../interfaces';
import {
  IRetrospectiveService,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';
import { ES_INDEX } from '../../../kernel/es-index-constants';

type RoutingOutcomeClass = 'SUCCESS_WITHIN_BUDGET' | 'WASTED_CYCLE' | 'ESCALATION_REQUIRED';

@Injectable()
export class AIDrivenRetrospectiveService extends IRetrospectiveService {
  private readonly logger = new Logger(AIDrivenRetrospectiveService.name);

  /** A-3 Fix: Accumulates edge propagation signals for learning handoff. */
  private propagationSignals: Array<Record<string, unknown>> = [];

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional() @Inject(QUEUE_SERVICE) private readonly queue?: IQueueService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {
    super();
  }

  /** A-3 Fix: Returns propagation signals accumulated during this retrospective run. */
  getPropagationSignals(): Array<Record<string, unknown>> {
    return [...this.propagationSignals];
  }

  /** A-3 Fix: Reset accumulator at start of each retrospective run. */
  private resetPropagationSignals(): void {
    this.propagationSignals = [];
  }

  /**
   * A-3 Fix: Private updateEdge wrapper — stores edge to xiigen-decision-graph
   * and emits edge-propagation CloudEvent for downstream learning (FLOW-34).
   *
   * DNA-8: storeDocument BEFORE enqueue.
   * B-7: INHERITANCE_DISCOUNT_FACTOR applied in GraphInheritanceService (separate).
   */
  private async emitEdgePropagation(
    fromEntity: string,
    relationship: string,
    toEntity: string,
    newConfidence: number,
  ): Promise<void> {
    // DNA-8: storeDocument before enqueue
    await this.db.storeDocument(
      'xiigen-decision-graph',
      {
        fromEntity,
        relationship,
        toEntity,
        confidence: newConfidence,
        updatedAt: new Date().toISOString(),
      },
      `${fromEntity}:${relationship}:${toEntity}`,
    );

    // A-3 fix: emit propagation event so downstream flows learn from edge updates
    if (this.queue) {
      await this.queue.enqueue('edge-propagation', {
        specversion: '1.0',
        type: 'com.xiigen.engine.edgePropagated',
        source: '/engine/ai-driven-retrospective',
        time: new Date().toISOString(),
        datacontenttype: 'application/json',
        data: {
          type: 'EDGE_PROPAGATED',
          fromEntity,
          relationship,
          toEntity,
          newConfidence,
          propagatedAt: new Date().toISOString(),
        },
      });
    }

    // Accumulate for handoff signal
    this.propagationSignals.push({ fromEntity, relationship, toEntity, newConfidence });
  }

  async runR1(flowId: string): Promise<{
    calibration: Record<string, number>;
    clearToProceed: boolean;
    promotionResults: Array<{ archetype: string; arbiter: string; result: string }>;
  }> {
    const promotionResults: Array<{ archetype: string; arbiter: string; result: string }> = [];

    // A-3 fix: Reset propagation signals for this run
    this.resetPropagationSignals();

    // STEP 1: Load outcomes for this flow from xiigen-flow-lifecycle
    const outcomes = await this.loadOutcomeStore(flowId);

    // STEP 2: Process routing outcomes — update graph edge weights
    const calibration = await this.processRoutingOutcomes(outcomes);

    // STEP 3: Load flow arbiters from xiigen-training-data (ARBITER_VERDICT signals)
    const arbiterSignals = await this.loadFlowArbiters(flowId);

    // STEP 4: Promote edges that have crossed observation thresholds
    const archetypeEdges = await this.graphRag.query({
      fromEntity: `FLOW:${flowId}`,
      relationship: 'EXECUTED_ARCHETYPE',
    });

    for (const archetypeEdge of archetypeEdges.edges) {
      const archetype = archetypeEdge.toEntity;
      const optionalArbiters = await this.graphRag.query({
        fromEntity: archetype,
        relationship: 'OPTIONAL_ARBITER',
      });

      for (const arbiterEdge of optionalArbiters.edges) {
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

    // STEP 5: Upgrade DPO triple quality for this flow's triples
    await this.upgradeTripleQuality(flowId);

    // STEP 6: Gate clearToProceed on calibration results
    const clearToProceed = await this.evaluateClearToProceed(calibration, arbiterSignals.length);

    return { calibration, clearToProceed, promotionResults };
  }

  // ── Private methods ─────────────────────────────────────────────────────────

  private async loadOutcomeStore(flowId: string): Promise<Array<Record<string, unknown>>> {
    const result = await this.db.searchDocuments(
      ES_INDEX.FLOW_LIFECYCLE,
      { flowId, type: 'ROUTING_DECISION_OUTCOME' },
      100,
    );
    return result.isSuccess ? (result.data ?? []) : [];
  }

  private async processRoutingOutcomes(
    outcomes: Array<Record<string, unknown>>,
  ): Promise<Record<string, number>> {
    const calibration: Record<string, number> = {};
    let successCount = 0;
    let totalCount = 0;

    for (const outcome of outcomes) {
      const outClass = this.classifyRoutingOutcome(outcome);
      const archetype = String(outcome['archetype'] ?? 'UNKNOWN');
      const runId = String(outcome['runId'] ?? 'unknown');
      const routing = String(outcome['routingDecision'] ?? 'ACCEPT');

      totalCount++;
      const positive = outClass === 'SUCCESS_WITHIN_BUDGET';
      if (positive) successCount++;

      try {
        await this.learning.updateEdge({
          fromEntity: archetype,
          relationship: 'PRODUCES_OUTCOME',
          toEntity: outClass,
          outcomeWasPositive: positive,
          confidence_delta: 0.05,
          observationCount_delta: 1,
          runId,
          reasoning: `${outClass}: routing=${routing}`,
        });
      } catch (err) {
        this.logger.warn(`R1 updateEdge skipped for ${archetype}: ${err}`);
      }

      calibration[archetype] = (calibration[archetype] ?? 0) + (positive ? 1 : -1);
    }

    // Normalize: success rate 0-1
    if (totalCount > 0) {
      calibration['_successRate'] = successCount / totalCount;
    }

    return calibration;
  }

  private classifyRoutingOutcome(outcome: Record<string, unknown>): RoutingOutcomeClass {
    const action = String(outcome['routingDecision'] ?? '');
    if (action === 'ESCALATE_TO_UPPER_JUDGE' || action === 'ESCALATE_TO_HUMAN') {
      return 'ESCALATION_REQUIRED';
    }
    const cyclesUsed = Number(outcome['cyclesUsed'] ?? 1);
    const cycleBudget = Number(outcome['cycleBudget'] ?? 3);
    if (cyclesUsed > cycleBudget) return 'WASTED_CYCLE';
    return 'SUCCESS_WITHIN_BUDGET';
  }

  private async loadFlowArbiters(flowId: string): Promise<Array<Record<string, unknown>>> {
    const result = await this.db.searchDocuments(
      'xiigen-training-data',
      { flowId, category: 'ARBITER_VERDICT' },
      50,
    );
    return result.isSuccess ? (result.data ?? []) : [];
  }

  private async upgradeTripleQuality(flowId: string): Promise<void> {
    try {
      const pending = await this.db.searchDocuments(
        'xiigen-planning-decisions',
        { flowId, trainingDataQuality: 'OUTCOME_PENDING' },
        50,
      );
      if (!pending.isSuccess || !pending.data?.length) return;

      for (const triple of pending.data) {
        const updatedId = `${triple['runId']}-${triple['decisionType']}-validated-${Date.now()}`;
        await this.db.storeDocument(
          'xiigen-planning-decisions',
          { ...triple, trainingDataQuality: 'VALIDATED' },
          updatedId,
        );
      }
      this.logger.log(
        `R1: upgraded ${pending.data.length} triples to VALIDATED for flow ${flowId}`,
      );
    } catch (err) {
      // Non-fatal
      this.logger.warn(`R1 upgradeTripleQuality failed (non-fatal): ${err}`);
    }
  }

  private async evaluateClearToProceed(
    calibration: Record<string, number>,
    arbiterSignalCount: number,
  ): Promise<boolean> {
    const minSuccessRate = this.config
      ? await this.config.get('engine.retrospective.minSuccessRate', 0.6)
      : 0.6;

    const successRate = calibration['_successRate'] ?? 1.0;

    // If no outcomes recorded yet → clear (first run)
    if (successRate === 1.0 && Object.keys(calibration).length <= 1) return true;

    // Gate: success rate must meet minimum threshold
    if (successRate < minSuccessRate) {
      this.logger.warn(
        `R1 calibration gate FAILED: successRate=${successRate.toFixed(2)} < ${minSuccessRate}`,
      );
      return false;
    }

    // If arbiter blocked a lot → flag
    if (arbiterSignalCount > 5) {
      this.logger.warn(
        `R1: high arbiter signal count (${arbiterSignalCount}) — review recommended`,
      );
    }

    return true;
  }
}
