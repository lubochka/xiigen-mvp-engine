// T81 PrivacyGatekeeper [INLINE_ONLY / GUARD]
//
// Called synchronously by T73, T76, T78.
// INLINE_ONLY: no queue decorators — pure injectable service.
// Privacy settings read from DATABASE FABRIC on every call (never cached).
//
// Factories:
//   F241: INotificationService — preference lookups
//   F243: IPrivacySettingsService — privacy settings store (DATABASE FABRIC)

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

interface IPrivacySettingsService {
  getSettings(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

interface INotificationService {
  checkConsent(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
  getDeliveryChannel(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface PrivacyCheckRequest {
  userId: string;
  tenantId: string;
  action: 'friend_request' | 'feed_item' | 'feed_delivery';
  requesterId?: string;
}

export interface PrivacyCheckResult {
  allowed: boolean;
  reason?: string;
}

export interface IPrivacyGatekeeperService {
  check(request: PrivacyCheckRequest): Promise<DataProcessResult<PrivacyCheckResult>>;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - inline-only guard exposed through IPrivacyGatekeeperService
 * @className PrivacyGatekeeperService via IPrivacyGatekeeperService
 */
@Injectable()
export class PrivacyGatekeeperService extends MicroserviceBase implements IPrivacyGatekeeperService {
  constructor(
    /** F243: IPrivacySettingsService — DATABASE FABRIC (read settings fresh, never cached) */
    private readonly privacySettings: IPrivacySettingsService,
    /** F241: INotificationService — preference lookups */
    private readonly notificationService: INotificationService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T81',
        serviceName: 'PrivacyGatekeeperService', // IPrivacyGatekeeperService contract
        flowId: 'FLOW-07',
      }),
    });
  }

  async check(request: PrivacyCheckRequest): Promise<DataProcessResult<PrivacyCheckResult>> {
    try {
      // IR-3: read from DATABASE FABRIC every call — never use cached settings
      const settingsResult = await this.privacySettings.getSettings({
        userId: request.userId,
        tenantId: request.tenantId,
      });
      if (!settingsResult.isSuccess) {
        // Fail-open: if settings unreachable, allow (non-blocking privacy)
        return DataProcessResult.success({
          allowed: true,
          reason: 'settings_unavailable_fail_open',
        });
      }
      const settings = settingsResult.data as Record<string, unknown>;

      // Check action-specific settings
      if (request.action === 'friend_request') {
        const allowFriendRequests = settings['allowFriendRequests'] !== false;
        if (!allowFriendRequests) {
          return DataProcessResult.success({ allowed: false, reason: 'friend_requests_disabled' });
        }
      }
      if (request.action === 'feed_item' || request.action === 'feed_delivery') {
        const feedVisible = settings['feedVisible'] !== false;
        if (!feedVisible) {
          return DataProcessResult.success({ allowed: false, reason: 'feed_disabled' });
        }
      }
      return DataProcessResult.success({ allowed: true });
    } catch (err) {
      return DataProcessResult.failure(
        'PRIVACY_CHECK_ERROR',
        `Privacy check error: ${String(err)}`,
      );
    }
  }
}
