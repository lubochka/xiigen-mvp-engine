/**
 * GraphInheritanceService — copies edges from a source flow to a target flow.
 *
 * B-7 Fix: Applied INHERITANCE_DISCOUNT_FACTOR (0.80) to inherited edge confidence.
 *   Without this, FLOW-12 inherits FLOW-09 edge confidence at full 1.0x,
 *   producing overconfident routing decisions before any real observations.
 *
 * Floor: 0.50 — inherited edges never drop below MIN_EDGE_CONFIDENCE.
 * Original confidence preserved as inheritedConfidence for reference.
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: storeDocument for each inherited edge (no enqueue)
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../interfaces';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { INHERITANCE_DISCOUNT_FACTOR, MIN_EDGE_CONFIDENCE } from './graph-constants';

@Injectable()
export class GraphInheritanceService {
  private readonly logger = new Logger(GraphInheritanceService.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  /**
   * Inherit edges from sourceFlowId to targetFlowId.
   *
   * B-7 Fix: Each inherited edge confidence is multiplied by INHERITANCE_DISCOUNT_FACTOR.
   * Floor: MAX(MIN_EDGE_CONFIDENCE, confidence * INHERITANCE_DISCOUNT_FACTOR).
   *
   * @param sourceFlowId  Flow whose edges are being inherited (e.g., 'FLOW-09')
   * @param targetFlowId  Flow receiving the inherited edges (e.g., 'FLOW-12')
   */
  async inherit(sourceFlowId: string, targetFlowId: string): Promise<DataProcessResult<void>> {
    const sourceEdgesResult = await this.db.searchDocuments(
      'xiigen-decision-graph',
      {
        flowId: sourceFlowId,
      },
      500,
    );

    if (!sourceEdgesResult.isSuccess) {
      return DataProcessResult.failure(
        'SOURCE_EDGES_QUERY_FAILED',
        sourceEdgesResult.errorMessage ?? `Failed to query edges for ${sourceFlowId}`,
      );
    }

    const sourceEdges = sourceEdgesResult.data ?? [];

    if (sourceEdges.length === 0) {
      this.logger.log(`GraphInheritance: no edges found for ${sourceFlowId} — nothing to inherit`);
      return DataProcessResult.success(undefined);
    }

    this.logger.log(
      `GraphInheritance: inheriting ${sourceEdges.length} edges from ${sourceFlowId} → ${targetFlowId}`,
    );

    let failureCount = 0;
    for (const edge of sourceEdges) {
      const inheritedConfidence =
        typeof edge['confidence'] === 'number' ? (edge['confidence'] as number) : 1.0;

      // B-7 fix: apply discount so inherited edges start below source flow confidence
      const discountedConfidence = Math.max(
        MIN_EDGE_CONFIDENCE, // Floor: never below minimum viable confidence
        inheritedConfidence * INHERITANCE_DISCOUNT_FACTOR,
      );

      const edgeKey = `${targetFlowId}:${edge['relationship']}:${edge['toEntity']}`;

      // DNA-8: storeDocument (no enqueue)
      const storeResult = await this.db.storeDocument(
        'xiigen-decision-graph',
        {
          ...edge,
          flowId: targetFlowId,
          confidence: discountedConfidence,
          inheritedConfidence, // Preserve original for reference and auditing
          inheritedFrom: sourceFlowId,
          inheritedAt: new Date().toISOString(),
        },
        edgeKey,
      );

      if (!storeResult.isSuccess) {
        this.logger.warn(
          `GraphInheritance: failed to store edge ${edgeKey}: ${storeResult.errorMessage}`,
        );
        failureCount++;
      }
    }

    if (failureCount > 0) {
      this.logger.warn(`GraphInheritance: ${failureCount} edge(s) failed to inherit`);
    }

    this.logger.log(
      `GraphInheritance: completed ${sourceFlowId} → ${targetFlowId} ` +
        `(${sourceEdges.length - failureCount}/${sourceEdges.length} succeeded, ` +
        `discount=${INHERITANCE_DISCOUNT_FACTOR}, floor=${MIN_EDGE_CONFIDENCE})`,
    );

    return DataProcessResult.success(undefined);
  }
}
