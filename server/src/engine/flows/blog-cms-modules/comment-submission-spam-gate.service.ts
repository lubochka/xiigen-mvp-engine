/**
 * T435 CommentSubmissionSpamGate [SPAM_DETECTION]
 * FLOW-28: Blog CMS Modules
 *
 * Entry: CommentSubmitted event (reader submits comment on published content)
 *
 * Execution order is MACHINE (CF-28-13):
 *   ORDER 1: Apply spam heuristics (keyword blacklist, rate limiting, link count)
 *   ORDER 2: Classify as APPROVED, REVIEW, or REJECTED
 *   ORDER 3: storeDocument(comment) with spam flag
 *   ORDER 4: enqueue(CommentProcessed) with classification
 *
 * Iron rules:
 *   IR-1: Spam detection: keyword blacklist, >5 links, >3 comments/5min from IP
 *   IR-2: Rate limit by IP: max 10 comments per hour
 *   IR-3: tenantId from ALS only (DNA-5)
 *   IR-4: storeDocument BEFORE enqueue (DNA-8)
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';

const COMMENT_INDEX = 'xiigen-comments';
const SPAM_KEYWORDS = ['viagra', 'casino', 'lottery', 'weight loss', 'click here'];
const LINK_PATTERN = /https?:\/\//g;
const MAX_LINKS_PER_COMMENT = 5;
const MAX_COMMENTS_PER_HOUR_PER_IP = 10;

type LegacyTenantContextReader = {
  get?: (key: string) => Record<string, unknown> | undefined;
};

@Injectable()
export class CommentSubmissionSpamGateService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T435',
        serviceName: 'CommentSubmissionSpamGateService',
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
   * Gate comment submissions with spam detection heuristics.
   */
  async gateComment(
    event: Record<string, unknown>,
  ): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const commentId = event['commentId'] as string;
    const contentId = event['contentId'] as string;
    const commentText = event['commentText'] as string;
    const authorEmail = event['authorEmail'] as string;
    const authorIp = event['authorIp'] as string;

    if (!commentId || !contentId || !commentText || !authorEmail || !authorIp) {
      return DataProcessResult.failure(
        'INVALID_INPUT',
        'commentId, contentId, commentText, authorEmail, and authorIp are required',
      );
    }

    // ── ORDER 1: Apply spam heuristics ──────────────────────────────────
    let classification = 'APPROVED';
    const spamSignals: string[] = [];

    // Check for spam keywords
    const lowerText = commentText.toLowerCase();
    const foundKeywords = SPAM_KEYWORDS.filter((kw) => lowerText.includes(kw));
    if (foundKeywords.length > 0) {
      spamSignals.push(`Spam keywords: ${foundKeywords.join(', ')}`);
      classification = 'REVIEW';
    }

    // Check for excessive links
    const linkCount = (commentText.match(LINK_PATTERN) ?? []).length;
    if (linkCount > MAX_LINKS_PER_COMMENT) {
      spamSignals.push(`Too many links: ${linkCount}`);
      classification = 'REVIEW';
    }

    // Check rate limit by IP
    const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000).toISOString();
    const recentCommentsResult = await this.dbFabric.searchDocuments(COMMENT_INDEX, {
      authorIp,
      createdAfter: oneHourAgo,
    });
    const recentComments = (recentCommentsResult.data ?? []).length;
    if (recentComments > MAX_COMMENTS_PER_HOUR_PER_IP) {
      spamSignals.push(`Rate limit exceeded: ${recentComments} in 1 hour`);
      classification = 'REJECTED';
    }

    // ── ORDER 2: Classify result ────────────────────────────────────────

    // ── ORDER 3: storeDocument(comment) ────────────────────────────────
    const commentRecord: Record<string, unknown> = {
      commentId,
      tenantId,
      contentId,
      commentText,
      authorEmail,
      authorIp,
      classification,
      spamSignals,
      createdAt: new Date().toISOString(),
    };

    await this.dbFabric.storeDocument(COMMENT_INDEX, commentRecord, commentId);

    // ── ORDER 4: enqueue(CommentProcessed) ─────────────────────────────
    await this.queueFabric.enqueue('CommentProcessed', {
      commentId,
      tenantId,
      contentId,
      classification,
      spamSignals,
      processedAt: new Date().toISOString(),
    });

    return DataProcessResult.success({
      commentId,
      classification,
      spamSignals,
      status: 'PROCESSED',
      processedAt: new Date().toISOString(),
    });
  }
}
