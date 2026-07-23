/**
 * CrossLayerCurriculumRouter — ICrossLayerCurriculumRouter active implementation (Phase 3).
 *
 * Replaces the Phase 2 bootstrap no-op.
 *
 * Direction 1: routePlanningToCodeGen()
 *   - GENERATED triples only (REINFORCEMENT triples are never re-routed)
 *   - PLANNING_ESCALATION → stores NAMED_CHECK_REINFORCEMENT derived triple
 *   - PLANNING_PANEL_ASSEMBLY → stores PANEL_EXPANSION_REINFORCEMENT derived triple
 *   - Derived triples: trainingCategory='REINFORCEMENT', countsTowardThreshold=false
 *   - Written to xiigen-training-data (NOT xiigen-planning-decisions)
 *
 * Direction 2: routeCodeGenBlockToPlanning()
 *   - Strengthens AVOID edge: archetype → ANTI_PATTERN:checkId
 *   - confidence_delta: +0.06 (AVOID edges strengthen faster than REQUIRE edges)
 *   - Patterns fetched FROM GRAPH (not from the block event itself)
 *   - Fire-and-forget: errors logged, never propagate to block generation
 *
 * Codebase adaptations vs plan:
 *   - ELASTICSEARCH_SERVICE → DATABASE_SERVICE (IDatabaseService.storeDocument)
 *   - FREEDOM_CONFIG → GRAPH_CONFIG_READER (not needed here, removed)
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IGraphLearningService,
  GRAPH_LEARNING_SERVICE,
} from '../interfaces/i-graph-learning.service';
import { IDatabaseService, DATABASE_SERVICE } from '../../interfaces';
import { ICrossLayerCurriculumRouter, PlanningDpoTriple } from './planning-abstracts';

@Injectable()
export class CrossLayerCurriculumRouter extends ICrossLayerCurriculumRouter {
  private readonly logger = new Logger(CrossLayerCurriculumRouter.name);

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(GRAPH_LEARNING_SERVICE) private readonly learning: IGraphLearningService,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
  ) {
    super();
  }

  /**
   * Direction 1: Planning DPO → code-gen REINFORCEMENT.
   * Guards: only routes GENERATED triples (never re-routes REINFORCEMENT triples).
   * All derived triples: trainingCategory='REINFORCEMENT', countsTowardThreshold=false.
   */
  async routePlanningToCodeGen(triple: unknown): Promise<void> {
    const t = triple as PlanningDpoTriple;
    if (!t || t.trainingCategory !== 'GENERATED') return;

    if (t.category === 'PLANNING_ESCALATION' && t.chosen?.reasoning) {
      const checkContext = await this.extractNamedCheckContext(t);
      if (checkContext) {
        await this.storeDerivedTriple({
          category: 'NAMED_CHECK_REINFORCEMENT',
          derivedFrom: t.runId,
          chosen: checkContext.correctExample,
          rejected: checkContext.wrongExample,
          teachingPoint: checkContext.teachingPoint,
        });
      }
    }

    if (t.category === 'PLANNING_PANEL_ASSEMBLY') {
      await this.storeDerivedTriple({
        category: 'PANEL_EXPANSION_REINFORCEMENT',
        derivedFrom: t.runId,
        chosen: t.chosen.decision,
        rejected: t.rejected.decision,
        teachingPoint: t.teachingPoint,
      });
    }
  }

  /**
   * Direction 2: Code-gen BLOCK event → planning graph AVOID edge update.
   * Patterns come FROM THE GRAPH (checkId → NAMED_CHECK_NODE → correctExample/wrongExample).
   * Never from the block event itself.
   * Fire-and-forget: errors logged, never propagate to block generation.
   */
  async routeCodeGenBlockToPlanning(blockEvent: {
    checkId: string;
    archetype: string;
    arbiterRole: string;
    runId: string;
  }): Promise<void> {
    try {
      const checkNode = await this.graphRag.query({
        fromEntity: `NAMED_CHECK:${blockEvent.checkId}`,
        relationship: 'DEFINES_PATTERN',
      });

      // check not in graph yet — skip silently
      if (!checkNode.edges[0]?.to) return;

      const pattern = checkNode.edges[0].to;

      await this.learning.updateEdge({
        fromEntity: blockEvent.archetype,
        relationship: 'AVOID',
        toEntity: `ANTI_PATTERN:${blockEvent.checkId}`,
        outcomeWasPositive: true, // AVOID edge strengthened by each block
        confidence_delta: 0.06, // AVOID edges strengthen faster than REQUIRE edges
        observationCount_delta: 1,
        runId: blockEvent.runId,
        reasoning:
          `${blockEvent.arbiterRole} blocked ${blockEvent.archetype} ` +
          `for ${blockEvent.checkId}: ${pattern.consequence ?? 'violation detected'}`,
      });

      if (pattern.correctExample && pattern.wrongExample) {
        await this.storeDerivedTriple({
          category: 'CODE_PATTERN_BLOCK_REINFORCEMENT',
          derivedFrom: blockEvent.runId,
          chosen: pattern.correctExample,
          rejected: pattern.wrongExample,
          teachingPoint:
            `${blockEvent.checkId} in ${blockEvent.archetype}: ` +
            `${pattern.consequence ?? 'use correct pattern'}`,
        });
      }
    } catch (err) {
      // Fire-and-forget: routing failure never blocks generation
      this.logger.debug(`CrossLayerCurriculumRouter: fire-and-forget error: ${err}`);
    }
  }

  private async extractNamedCheckContext(triple: PlanningDpoTriple) {
    const checkId = (triple.chosen.decision as Record<string, unknown>)?.['checkId'];
    if (!checkId) return null;

    const node = await this.graphRag.query({
      fromEntity: `NAMED_CHECK:${checkId}`,
      relationship: 'DEFINES_PATTERN',
    });

    if (!node.edges[0]?.to) return null;
    const p = node.edges[0].to;
    return {
      correctExample: p.correctExample,
      wrongExample: p.wrongExample,
      teachingPoint: `${checkId}: ${p.consequence}`,
    };
  }

  private async storeDerivedTriple(data: {
    category: string;
    derivedFrom: string;
    chosen: unknown;
    rejected: unknown;
    teachingPoint: string;
  }): Promise<void> {
    const id = `${data.derivedFrom}-${data.category}-${Date.now()}`;
    await this.db.storeDocument(
      'xiigen-training-data',
      {
        category: data.category,
        trainingCategory: 'REINFORCEMENT',
        derivedFrom: data.derivedFrom,
        countsTowardThreshold: false,
        curriculumTier: 1,
        chosen: { decision: data.chosen, model: 'derived' },
        rejected: { decision: data.rejected, model: 'derived' },
        teachingPoint: data.teachingPoint,
        createdAt: new Date().toISOString(),
      },
      id,
    );
  }
}
