import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';

export interface SocialNotificationSenderInput {
  feedEntryId: string;
  postId: string;
  userId: string;
  tenantId: string;
  processedAt?: string;
}

export interface SocialNotificationSenderResult {
  notificationId: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-05
 * @portability MOBILE - no ClsService, FREEDOM keys flow-scoped
 * @className SocialNotificationSenderService
 */
@Injectable()
export class SocialNotificationSenderService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T94',
        serviceName: 'SocialNotificationSenderService',
        flowId: 'FLOW-05',
      }),
    });
  }

  async execute(
    input: SocialNotificationSenderInput,
  ): Promise<DataProcessResult<SocialNotificationSenderResult>> {
    try {
      const { feedEntryId, postId, userId, tenantId } = input;

      if (!feedEntryId || typeof feedEntryId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'feedEntryId is required');
      }
      if (!postId || typeof postId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'postId is required');
      }
      if (!userId || typeof userId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'userId is required');
      }
      if (!tenantId || typeof tenantId !== 'string') {
        return DataProcessResult.failure('VALIDATION_FAILURE', 'tenantId is required');
      }

      const notificationId = `sno-${Date.now()}-${Math.random().toString(36).slice(2)}`;
      const now = new Date().toISOString();

      const storeResult = await this.dbFabric.storeDocument('xiigen-social-notifications', {
        notification_id: notificationId,
        feed_entry_id: feedEntryId,
        post_id: postId,
        user_id: userId,
        tenant_id: tenantId,
        connection_type: 'FLOW_SCOPED',
        knowledge_scope: 'PRIVATE',
        sent_at: now,
      });

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(storeResult.errorCode!, storeResult.errorMessage!);
      }

      await this.queueFabric.enqueue('social.notification.sent', {
        notificationId,
        feedEntryId,
        postId,
        userId,
        tenantId,
        sentAt: now,
      });

      return DataProcessResult.success({ notificationId });
    } catch (err) {
      return DataProcessResult.failure(
        'SOCIAL_NOTIFICATION_SENDER_ERROR',
        err instanceof Error ? err.message : String(err),
      );
    }
  }
}
