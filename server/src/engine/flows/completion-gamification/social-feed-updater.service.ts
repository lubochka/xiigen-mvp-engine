import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

export interface SocialFeedUpdaterInput {
  postId: string;
  distributionId: string;
  completionId: string;
  userId: string;
  tenantId: string;
  processedAt?: string;
}

export interface SocialFeedUpdaterResult {
  feedEntryId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className SocialFeedUpdaterService
 */
@Injectable()
export class SocialFeedUpdaterService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T93',
        serviceName: 'SocialFeedUpdaterService',
        flowId: 'FLOW-05',
      }),
    });
  }

  async execute(
    input: SocialFeedUpdaterInput,
  ): Promise<DataProcessResult<SocialFeedUpdaterResult>> {
    try {
      const { postId, distributionId, completionId, userId, tenantId } = input;

      if (!postId || typeof postId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'postId is required');
      }
      if (!distributionId || typeof distributionId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'distributionId is required');
      }
      if (!userId || typeof userId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'userId is required');
      }
      if (!tenantId || typeof tenantId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'tenantId is required');
      }

      const feedEntryId = `sfe-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument('xiigen-social-feed-entries', {
        feed_entry_id: feedEntryId,
        post_id: postId,
        distribution_id: distributionId,
        completion_id: completionId,
        user_id: userId,
        tenant_id: tenantId,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        updated_at: now,
      });

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
      }

      await this.queueFabric.enqueue('social.feed.updated', {
        feedEntryId,
        postId,
        distributionId,
        userId,
        tenantId,
        updatedAt: now,
      });

      return DataProcessResult.success({ feedEntryId });
    } catch (err) {
      return DataProcessResult.failure(
        'SOCIAL_FEED_UPDATER_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
