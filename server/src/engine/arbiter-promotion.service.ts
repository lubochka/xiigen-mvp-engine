/**
 * ArbiterPromotionService — promotes arbiters to the active panel.
 *
 * B-4 Fix: promote() now writes directly to xiigen-arbiters (active panel index)
 *   instead of xiigen-arbiters-pending-review (manual review queue).
 *   This enables auto-promotion when the threshold is met, keeping FLOW-34
 *   pattern transfer working with an up-to-date panel.
 *
 * Changes from BEFORE (manual gate) to AFTER (auto-gate):
 *   BEFORE: storeDocument → xiigen-arbiters-pending-review
 *           enqueue → arbiter-human-review
 *   AFTER:  storeDocument → xiigen-arbiter-promotion-log (audit)
 *           storeDocument → xiigen-arbiters (active panel) ← B-4 fix
 *           enqueue → arbiter-events (downstream refresh) ← B-4 fix
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: audit log storeDocument BEFORE active panel storeDocument BEFORE enqueue
 * DNA-9: emits CloudEvent to arbiter-events queue
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../fabrics/interfaces/queue.interface';
import { DataProcessResult } from '../kernel/data-process-result';

@Injectable()
export class ArbiterPromotionService {
  private readonly logger = new Logger(ArbiterPromotionService.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queue: IQueueService,
  ) {}

  /**
   * Promote an arbiter to the active panel.
   *
   * B-4 Fix: writes directly to xiigen-arbiters (not pending-review).
   * Audit log written FIRST (DNA-8), then active panel, then event emit.
   */
  async promote(
    arbiterId: string,
    promotion: Record<string, unknown>,
  ): Promise<DataProcessResult<void>> {
    const promotedAt = new Date().toISOString();

    // DNA-8: audit log storeDocument FIRST (before any other storeDocument or enqueue)
    const auditResult = await this.db.storeDocument(
      'xiigen-arbiter-promotion-log',
      {
        arbiterId,
        ...promotion,
        promotedAt,
        promotionSource: 'AUTO_THRESHOLD',
      },
      `${arbiterId}:${promotedAt}`,
    );

    if (!auditResult.isSuccess) {
      this.logger.warn(
        `ArbiterPromotion: audit log write failed for ${arbiterId}: ${auditResult.errorMessage}`,
      );
      // Non-fatal — continue with promotion (audit failure should not block panel update)
    }

    // B-4 fix: write directly to active arbiter panel index (not pending-review)
    const activeResult = await this.db.storeDocument(
      'xiigen-arbiters',
      {
        ...promotion,
        arbiterId,
        promotedAt,
        status: 'ACTIVE',
      },
      arbiterId,
    );

    if (!activeResult.isSuccess) {
      return DataProcessResult.failure(
        'ARBITER_PROMOTION_FAILED',
        activeResult.errorMessage ?? `Failed to promote arbiter ${arbiterId} to active panel`,
      );
    }

    // Emit arbiter-events for downstream consumers (FLOW-34 arbiter refresh)
    await this.queue.enqueue('arbiter-events', {
      specversion: '1.0',
      type: 'com.xiigen.engine.arbiterPromoted',
      source: '/engine/arbiter-promotion',
      time: promotedAt,
      datacontenttype: 'application/json',
      data: {
        type: 'ARBITER_PROMOTED',
        arbiterId,
        promotedAt,
      },
    });

    this.logger.log(`ArbiterPromotion: ${arbiterId} promoted to active panel at ${promotedAt}`);
    return DataProcessResult.success(undefined);
  }
}
