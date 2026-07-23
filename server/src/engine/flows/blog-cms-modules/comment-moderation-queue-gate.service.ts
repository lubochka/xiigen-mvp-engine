/**
 * T436 CommentModerationQueueGate [MODERATION_QUEUE]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: CommentModerationRequested event (comment needs human review)
 *
 * Execution order is MACHINE (CF-28-14):
 *   ORDER 1: Route comment to moderation queue (REVIEW classification)
 *   ORDER 2: Assign priority based on content author response flag
 *   ORDER 3: storeDocument(moderation-queue-entry)
 *   ORDER 4: enqueue(CommentInQueue) — notify moderators
 *
 * Iron rules:
 *   IR-1: Auto-approve if not flagged and no spam signals (default behavior)
 *   IR-2: Comments from REVIEW classification queued for manual review
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const MODERATION_QUEUE_INDEX = 'xiigen-moderation-queue';
const MODERATION_DECISION_INDEX = 'xiigen-moderation-decisions';

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class CommentModerationQueueGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T436',
        serviceName: 'CommentModerationQueueGateService',
        flowId: 'FLOW-28',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId?.();
    if (result?.isSuccess && result.data) {
      return result.data;
    }

    const legacyTenant = (this.tenantContext as unknown as LegacyTenantContextReader).get?.('tenant');
    const legacyTenantId = legacyTenant?.['tenantId'];
    return typeof legacyTenantId === 'string' && legacyTenantId.length > 0
      ? legacyTenantId
      : 'unknown';
  }

  /**
   * Route comments to moderation queue or auto-approve.
   */
  async queueForModeration(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const commentId = event['commentId'] as string;
    const contentId = event['contentId'] as string;
    const classification = event['classification'] as string;
    const spamSignals = event['spamSignals'] as string[];
    const isReplyToAuthor = event['isReplyToAuthor'] as boolean;

    if (!commentId || !contentId || !classification) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'commentId, contentId, and classification are required',
      );
    }

    // ── ORDER 1: Route comment to moderation queue ───────────────────────
    let decision = 'APPROVED';
    let queuedForReview = false;

    if (classification === 'REVIEW' || (spamSignals && spamSignals.length > 0)) {
      queuedForReview = true;
      decision = 'PENDING_REVIEW';
    }

    if (classification === 'REJECTED') {
      decision = 'REJECTED';
    }

    // ── ORDER 2: Assign priority ────────────────────────────────────────
    let priority = 'NORMAL';
    if (isReplyToAuthor) {
      priority = 'HIGH'; // Content author's posts get higher priority
    }
    if (spamSignals && spamSignals.length > 1) {
      priority = 'LOW';
    }

    // ── ORDER 3: storeDocument(moderation-queue-entry) ───────────────────
    if (queuedForReview) {
      const queueEntry: Record<string, unknown> = {
        commentId,
        tenantId,
        contentId,
        classification,
        spamSignals: spamSignals ?? [],
        priority,
        queuedAt: new Date().toISOString(),
        status: 'PENDING_REVIEW',
      };

      await this.dbFabric.storeDocument(MODERATION_QUEUE_INDEX, queueEntry, commentId);
    } else {
      // Auto-approved: store decision
      const decisionRecord: Record<string, unknown> = {
        commentId,
        tenantId,
        contentId,
        decision,
        decidedAt: new Date().toISOString(),
        decisionReason: 'AUTO_APPROVED',
      };

      await this.dbFabric.storeDocument(MODERATION_DECISION_INDEX, decisionRecord, commentId);
    }

    // ── ORDER 4: enqueue(CommentInQueue) ────────────────────────────────
    await this.queueFabric.enqueue('CommentInQueue', {
      commentId,
      tenantId,
      contentId,
      decision,
      priority,
      queuedForReview,
      processedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      commentId,
      decision,
      priority,
      queuedForReview,
      status: 'MODERATION_PROCESSED',
      processedAt: new Date().toISOString(),
    });
  }
}
