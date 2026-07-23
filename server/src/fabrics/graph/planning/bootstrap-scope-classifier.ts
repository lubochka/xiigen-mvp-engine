/**
 * BootstrapScopeClassifier — IScopeClassifier bootstrap implementation.
 *
 * Classifies the scope ladder level by querying:
 *   PREREQ_GAP_TYPE:${gapType} → RESOLVES_VIA → level
 *
 * Falls back to SK-434 ladder logic if no graph entry exists:
 *   NEW_INFRA   — changeType starts with 'infra'
 *   NEW_FLOW    — changeType starts with 'flow'
 *   EXTENSION   — changeType starts with 'ext'
 *   ADAPTATION  — changeType starts with 'adapt'
 *   CONVENTION  — everything else
 *
 * Phase 2: graph traversal only, no AI dependency.
 */

import { Injectable, Inject, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import {
  IScopeClassifier,
  ScopeLadderLevel,
  IGraphConfigReader,
  GRAPH_CONFIG_READER,
} from './planning-abstracts';

@Injectable()
export class BootstrapScopeClassifier extends IScopeClassifier {
  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {
    super();
  }

  async classify(params: {
    gapType: string;
    serviceCategory: string;
    description: string;
  }): Promise<{ level: ScopeLadderLevel; rationale: string; estimatedEffort: string }> {
    const threshold = this.config
      ? await this.config.get('engine.decision.confidenceThreshold', 0.9)
      : 0.9;

    // Query graph for scope resolution for this gap type
    const graphResult = await this.graphRag.query({
      fromEntity: `PREREQ_GAP_TYPE:${params.gapType}`,
      relationship: 'RESOLVES_VIA',
      minConfidence: threshold,
    });

    if (graphResult.edges[0]) {
      const edge = graphResult.edges[0];
      return {
        level: edge.toEntity as ScopeLadderLevel,
        rationale: `Graph (confidence ${edge.confidence.toFixed(2)}): ${edge.reasoning ?? 'graph-driven'}`,
        estimatedEffort: this.effortForLevel(edge.toEntity as ScopeLadderLevel),
      };
    }

    // Bootstrap fallback: SK-434 ladder logic
    return this.bootstrapDefault(params.gapType);
  }

  private bootstrapDefault(gapType: string): {
    level: ScopeLadderLevel;
    rationale: string;
    estimatedEffort: string;
  } {
    const lc = gapType.toLowerCase();
    let level: ScopeLadderLevel;

    if (lc.startsWith('infra')) level = 'NEW_INFRA';
    else if (lc.startsWith('flow')) level = 'NEW_FLOW';
    else if (lc.startsWith('ext')) level = 'EXTENSION';
    else if (lc.startsWith('adapt')) level = 'ADAPTATION';
    else level = 'CONVENTION';

    return {
      level,
      rationale: `Bootstrap default (SK-434): gapType=${gapType}`,
      estimatedEffort: this.effortForLevel(level),
    };
  }

  private effortForLevel(level: ScopeLadderLevel): string {
    const map: Record<ScopeLadderLevel, string> = {
      CONVENTION: '< 1 day',
      ADAPTATION: '1-2 days',
      EXTENSION: '2-5 days',
      NEW_FLOW: '1-2 weeks',
      NEW_INFRA: '2-4 weeks',
    };
    return map[level] ?? 'unknown';
  }
}
