// T79 SocialNotificationDispatcher [ORCHESTRATION]
//
// Dispatches social notifications (friend requests, feed activity, connection updates).
// Consent-gated: only dispatches if recipient has notification consent.
// OBSERVABILITY pattern: entire handler in try/catch, returns success even on error.
// Notification channels from FREEDOM config — never hardcoded.
// storeDocument BEFORE notification dispatch (DNA-8)
// knowledgeScope: 'PRIVATE'
//
// Factories:
//   F235: IUserProfileService — recipient profile
//   F236: IQueueService — SocialNotificationSent CloudEvent
//   F241: INotificationService — consent check + delivery channel routing
//   F234: IDatabaseService — notification record storage
//   FREEDOM (optional): flow07_notification_channels config

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IUserProfileService {
  getProfile(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

interface INotificationService {
  checkConsent(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; errorMessage?: string; data?: Record<string, unknown> }>;
  getDeliveryChannel(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

interface IFreedomConfigService {
  getConfig(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface SocialNotificationRequest {
  notificationId: string;
  tenantId: string;
  recipientUserId: string;
  notificationType: string;
  payload: Record<string, unknown>;
}

export interface SocialNotificationResult {
  notificationId: string;
  status: 'DISPATCHED' | 'SKIPPED' | 'OBSERVABILITY_ERROR';
  reason?: string;
  dispatchedAt?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, notification records stay tenant-private
 * @className SocialNotificationDispatcherService
 */
@Injectable()
export class SocialNotificationDispatcherService extends MicroserviceBase {
  constructor(
    /** F235: IUserProfileService — recipient profile */
    private readonly userProfileService: IUserProfileService,
    /** F236: IQueueService — SocialNotificationSent CloudEvent */
    private readonly queueFabric: IQueueService,
    /** F241: INotificationService — consent check + delivery channel routing */
    private readonly notificationService: INotificationService,
    /** F234: IDatabaseService — notification record storage */
    private readonly dbFabric: IDatabaseService,
    /** FREEDOM config service (optional) — flow07_notification_channels */
    private readonly freedomConfigService?: IFreedomConfigService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T79',
        serviceName: 'SocialNotificationDispatcherService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async dispatchNotification(
    request: SocialNotificationRequest,
  ): Promise<DataProcessResult<SocialNotificationResult>> {
    try {
      // Consent check via notificationService (PRIVACY_GATEKEEPER_INLINE_INVOCATION)
      const consentResult = await this.notificationService.checkConsent({
        recipientUserId: request.recipientUserId,
        tenantId: request.tenantId,
        notificationType: request.notificationType,
      });

      if (!consentResult.isSuccess) {
        return DataProcessResult.failure(
          'CONSENT_CHECK_ERROR',
          consentResult.errorMessage ?? 'Consent check failed',
        );
      }

      const hasConsent = consentResult.data?.['hasConsent'] === true;

      if (!hasConsent) {
        return DataProcessResult.success({
          notificationId: request.notificationId,
          status: 'SKIPPED',
          reason: 'no_consent',
        });
      }

      // Get delivery channel
      const channelResult = await this.notificationService.getDeliveryChannel({
        recipientUserId: request.recipientUserId,
        tenantId: request.tenantId,
        notificationType: request.notificationType,
      });

      // Read notification channels from FREEDOM config if available
      let channels = ['push'];
      if (this.freedomConfigService) {
        const channelConfigResult = await this.freedomConfigService.getConfig({
        key: 'flow07_notification_channels',
          tenantId: request.tenantId,
        });
        if (
          channelConfigResult.isSuccess &&
        Array.isArray(channelConfigResult.data?.['flow07_notification_channels'])
        ) {
        channels = channelConfigResult.data?.['flow07_notification_channels'] as string[];
        }
      } else if (channelResult.isSuccess) {
        channels = [(channelResult.data?.['channel'] as string | undefined) ?? 'push'];
      }

      const dispatchedAt = new Date().toISOString();

      // DNA-8: storeDocument BEFORE dispatch/enqueue
      const storeResult = await this.dbFabric.storeDocument(
        'xiigen-social-notifications',
        {
          notificationId: request.notificationId,
          recipientUserId: request.recipientUserId,
          tenantId: request.tenantId,
          notificationType: request.notificationType,
          payload: request.payload,
          channels,
          status: 'DISPATCHED',
          dispatchedAt,
          knowledgeScope: 'PRIVATE',
        },
        request.notificationId,
      );

      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'STORE_FAILED',
          `Failed to store notification: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      // Enqueue after store (DNA-8)
      await this.queueFabric.enqueue('social.notification.sent', {
        notificationId: request.notificationId,
        recipientUserId: request.recipientUserId,
        tenantId: request.tenantId,
        notificationType: request.notificationType,
        dispatchedAt,
      });

      return DataProcessResult.success({
        notificationId: request.notificationId,
        status: 'DISPATCHED',
        dispatchedAt,
      });
    } catch {
      // OBSERVABILITY pattern: return success even on error — notifications must not block pipeline
      return DataProcessResult.success({
        notificationId: request.notificationId,
        status: 'OBSERVABILITY_ERROR',
        reason: 'notification_channel_error',
      });
    }
  }
}
