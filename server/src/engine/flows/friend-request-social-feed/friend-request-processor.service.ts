// T73 FriendRequestProcessor [ORCHESTRATION]
//
// Processes incoming friend requests.
// Execution order (STRICT):
//   1. T81 IPrivacyGatekeeperService (inline invocation — BEFORE storeDocument)
//   2. Rate limit check (PER-TENANT-COUNTER-001): key = tenantId + senderUserId
//   3. SETNX — return existing if duplicate requestId
//   4. Mutual pending detection: if B→A pending, auto-accept both
//   5. storeDocument (DNA-8 — before enqueue)
//   6. enqueue FriendRequestSent
//
// Factories:
//   F234: IDatabaseService — friend request records
//   F236: IQueueService — FriendRequestSent CloudEvent
//   T81: IPrivacyGatekeeperService — inline (NEVER via queue)
//   RATE: IRateLimitService — key = tenantId+senderUserId

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { IPrivacyGatekeeperService } from './privacy-gatekeeper.service';

interface IRateLimitService {
  check(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
  increment(params: Record<string, unknown>): Promise<void>;
}

export interface FriendRequestInput {
  requestId: string;
  senderUserId: string;
  recipientUserId: string;
  tenantId: string;
  message?: string;
}

export interface FriendRequestResult {
  requestId: string;
  status: 'SENT' | 'BLOCKED' | 'AUTO_ACCEPTED' | 'RATE_LIMITED';
  reason?: string;
  connectionId?: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, privacy gate consumed through interface
 * @className FriendRequestProcessorService
 */
@Injectable()
export class FriendRequestProcessorService extends MicroserviceBase {
  constructor(
    /** F234: IDatabaseService — friend request records */
    private readonly dbFabric: IDatabaseService,
    /** F236: IQueueService — FriendRequestSent CloudEvent */
    private readonly queueFabric: IQueueService,
    /** T81: IPrivacyGatekeeperService — inline invocation (NOT via queue) */
    private readonly privacyGatekeeper: IPrivacyGatekeeperService,
    /** RATE: IRateLimitService — key = tenantId+senderUserId (PER-TENANT-COUNTER-001) */
    private readonly rateLimit: IRateLimitService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T73',
        serviceName: 'FriendRequestProcessorService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async processFriendRequest(
    input: FriendRequestInput,
  ): Promise<DataProcessResult<FriendRequestResult>> {
    // IR-1: T81 called FIRST — before storeDocument (BUILD_FAILURE if not first)
    const privacyResult = await this.privacyGatekeeper.check({
      userId: input.recipientUserId,
      tenantId: input.tenantId,
      action: 'friend_request',
      requesterId: input.senderUserId,
    });
    if (!privacyResult.isSuccess) {
      return DataProcessResult.failure(
        'PRIVACY_CHECK_FAILED',
        privacyResult.errorMessage ?? 'Privacy check failed',
      );
    }
    if (!privacyResult.data?.allowed) {
      return DataProcessResult.success({
        requestId: input.requestId,
        status: 'BLOCKED',
        reason: privacyResult.data?.reason,
      });
    }

    // Rate limit check — key = tenantId + senderUserId (PER-TENANT-COUNTER-001)
    const rateLimitKey = `participation-friend-request:${input.tenantId}:${input.senderUserId}`;
    const rateLimitResult = await this.rateLimit.check({
      key: rateLimitKey,
      tenantId: input.tenantId,
    });
    if (rateLimitResult.isSuccess && rateLimitResult.data?.['allowed'] === false) {
      return DataProcessResult.success({
        requestId: input.requestId,
        status: 'RATE_LIMITED',
        reason: 'rate_limit_exceeded',
      });
    }

    // SETNX — return existing if duplicate requestId
    const existingResult = await this.dbFabric.searchDocuments('xiigen-friend-requests', {
      requestId: input.requestId,
      tenantId: input.tenantId,
    });
    if (
      existingResult.isSuccess &&
      Array.isArray(existingResult.data) &&
      existingResult.data.length > 0
    ) {
      const existing = existingResult.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        requestId: input.requestId,
        status: existing['status'] as 'SENT',
        connectionId: existing['connectionId'] as string | undefined,
      });
    }

    // connectionId = hash(sorted([senderUserId, recipientUserId]) + tenantId) — direction-independent
    const sortedIds = [input.senderUserId, input.recipientUserId].sort();
    const connectionId = `conn-${sortedIds[0]}-${sortedIds[1]}-${input.tenantId}`;
    const sentAt = new Date().toISOString();

    // Mutual pending detection: if B→A pending, auto-accept both
    const mutualResult = await this.dbFabric.searchDocuments('xiigen-friend-requests', {
      senderUserId: input.recipientUserId,
      recipientUserId: input.senderUserId,
      tenantId: input.tenantId,
      status: 'PENDING',
    });
    if (
      mutualResult.isSuccess &&
      Array.isArray(mutualResult.data) &&
      mutualResult.data.length > 0
    ) {
      // Auto-accept both
      const autoAcceptedAt = new Date().toISOString();
      await this.dbFabric.storeDocument(
        'xiigen-friend-requests',
        {
          requestId: input.requestId,
          connectionId,
          senderUserId: input.senderUserId,
          recipientUserId: input.recipientUserId,
          tenantId: input.tenantId,
          message: input.message,
          status: 'ACCEPTED',
          sentAt,
          acceptedAt: autoAcceptedAt,
          knowledgeScope: 'PRIVATE',
        },
        input.requestId,
      );
      await this.queueFabric.enqueue('social.friend-request.auto-accepted', {
        requestId: input.requestId,
        connectionId,
        senderUserId: input.senderUserId,
        recipientUserId: input.recipientUserId,
        tenantId: input.tenantId,
        autoAcceptedAt,
      });
      return DataProcessResult.success({
        requestId: input.requestId,
        status: 'AUTO_ACCEPTED',
        connectionId,
      });
    }

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.dbFabric.storeDocument(
      'xiigen-friend-requests',
      {
        requestId: input.requestId,
        connectionId,
        senderUserId: input.senderUserId,
        recipientUserId: input.recipientUserId,
        tenantId: input.tenantId,
        message: input.message,
        status: 'PENDING',
        sentAt,
        knowledgeScope: 'PRIVATE',
      },
      input.requestId,
    );
    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store friend request: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Increment rate limit counter after successful store
    await this.rateLimit.increment({ key: rateLimitKey, tenantId: input.tenantId });

    // Enqueue after store (DNA-8)
    await this.queueFabric.enqueue('social.friend-request.sent', {
      requestId: input.requestId,
      connectionId,
      senderUserId: input.senderUserId,
      recipientUserId: input.recipientUserId,
      tenantId: input.tenantId,
      sentAt,
    });

    return DataProcessResult.success({ requestId: input.requestId, status: 'SENT', connectionId });
  }
}
