/**
 * EdgeVersioningService — Phase 5 decay window protection for graph edge updates.
 *
 * updateWithDecayWindow():
 *   Applies a bounded confidence delta — prevents sudden confidence swings from
 *   outlier runs while allowing gradual learning over time.
 *
 * Decay window algorithm:
 *   1. Query current edge state (confidence + observationCount)
 *   2. Load highestSnapshot for this edge from xiigen-edge-snapshots
 *   3. Compute candidate = current.confidence + delta
 *   4. Clamp to [snapshot.confidence - decayWindow, snapshot.confidence + decayWindow]
 *      UNLESS observationCount > snapshot.flowCount (window unlocked after enough observations)
 *   5. Call graphRag.updateEdgeWeight() with the (possibly clamped) delta
 *
 * Default decayWindow: 0.20 (±20% from highestSnapshot)
 * Default unlockCount: 10 observations
 *
 * Stores new snapshot whenever confidence exceeds previous highestSnapshot.
 */

import { Injectable, Inject, Logger, Optional } from '@nestjs/common';
import { IGraphRagService, GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { IDatabaseService, DATABASE_SERVICE } from '../../interfaces';
import { IGraphConfigReader, GRAPH_CONFIG_READER } from '../planning/planning-abstracts';

@Injectable()
export class EdgeVersioningService {
  private readonly logger = new Logger(EdgeVersioningService.name);
  private readonly SNAPSHOT_IDX = 'xiigen-edge-snapshots';

  constructor(
    @Inject(GRAPH_RAG_SERVICE) private readonly graphRag: IGraphRagService,
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Optional() @Inject(GRAPH_CONFIG_READER) private readonly config?: IGraphConfigReader,
  ) {}

  async updateWithDecayWindow(params: {
    fromEntity: string;
    relationship: string;
    toEntity: string;
    delta: number;
    observationId: string;
  }): Promise<void> {
    const decayWindow = this.config
      ? await this.config.get('engine.governance.decayWindow', 0.2)
      : 0.2;
    const unlockCount = this.config
      ? await this.config.get('engine.governance.decayUnlockCount', 10)
      : 10;

    // Query current edge state
    const edgeResult = await this.graphRag.query({
      fromEntity: params.fromEntity,
      relationship: params.relationship,
      toEntity: params.toEntity,
    });

    const current = edgeResult.edges[0];
    if (!current) {
      // No existing edge — apply delta without clamping (edge creation path)
      await this.graphRag.updateEdgeWeight({
        fromEntity: params.fromEntity,
        relationship: params.relationship,
        toEntity: params.toEntity,
        delta: params.delta,
        observationId: params.observationId,
      });
      return;
    }

    // Load highest confidence snapshot for this edge
    const snapshotKey = this.edgeKey(params.fromEntity, params.relationship, params.toEntity);
    const snapshotResult = await this.db.searchDocuments(
      this.SNAPSHOT_IDX,
      { edgeKey: snapshotKey },
      1,
    );

    const snapshot =
      snapshotResult.isSuccess && snapshotResult.data?.length ? snapshotResult.data[0] : null;

    const snapshotConfidence = Number(snapshot?.['highestConfidence'] ?? current.confidence);
    const snapshotFlowCount = Number(snapshot?.['flowCount'] ?? 0);

    let effectiveDelta = params.delta;

    // Apply decay window unless observation count has grown enough to unlock
    if (current.observationCount <= snapshotFlowCount + unlockCount) {
      const candidate = current.confidence + params.delta;
      const lowerBound = snapshotConfidence - decayWindow;
      const upperBound = snapshotConfidence + decayWindow;
      const clamped = Math.min(upperBound, Math.max(lowerBound, candidate));
      effectiveDelta = clamped - current.confidence;

      if (effectiveDelta !== params.delta) {
        this.logger.debug(
          `DecayWindow: clamped delta from ${params.delta.toFixed(3)} to ${effectiveDelta.toFixed(3)} ` +
            `for ${params.fromEntity}→${params.relationship}→${params.toEntity}`,
        );
      }
    }

    await this.graphRag.updateEdgeWeight({
      fromEntity: params.fromEntity,
      relationship: params.relationship,
      toEntity: params.toEntity,
      delta: effectiveDelta,
      observationId: params.observationId,
    });

    // Update snapshot if new confidence exceeds historical high
    const newConfidence = current.confidence + effectiveDelta;
    if (newConfidence > snapshotConfidence) {
      await this.storeSnapshot(snapshotKey, newConfidence, current.observationCount + 1);
    }
  }

  private async storeSnapshot(
    edgeKey: string,
    confidence: number,
    flowCount: number,
  ): Promise<void> {
    try {
      await this.db.storeDocument(
        this.SNAPSHOT_IDX,
        {
          edgeKey,
          highestConfidence: confidence,
          flowCount,
          snapshotAt: new Date().toISOString(),
        },
        `${edgeKey}-snapshot`,
      );
    } catch (err) {
      this.logger.warn(`Failed to store snapshot for ${edgeKey}: ${err}`);
    }
  }

  private edgeKey(fromEntity: string, relationship: string, toEntity: string): string {
    return `${fromEntity}::${relationship}::${toEntity}`;
  }
}
