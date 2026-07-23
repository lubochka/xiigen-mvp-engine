// T74 FriendRequestResponder [ORCHESTRATION]
//
// Handles accept/reject of a friend request.
// Idempotent: duplicate accept returns existing connection state.
// On accept: storeDocument BEFORE enqueue FriendRequestAccepted
// On reject: storeDocument BEFORE enqueue FriendRequestRejected
//
// Factories:
//   F234: IDatabaseService — friend request + response records
//   F236: IQueueService — FriendRequestAccepted / FriendRequestRejected CloudEvent

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface FriendRequestResponseInput {
  requestId: string;
  responderId: string;
  tenantId: string;
  response: 'ACCEPT' | 'REJECT';
}

export interface FriendRequestResponseResult {
  requestId: string;
  status: 'ACCEPTED' | 'REJECTED';
  connectionId?: string;
  idempotent?: boolean;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, queue emits only after persisted response
 * @className FriendRequestResponderService
 */
@Injectable()
export class FriendRequestResponderService extends MicroserviceBase {
  constructor(
    /** F234: IDatabaseService — friend request + response records */
    private readonly dbFabric: IDatabaseService,
    /** F236: IQueueService — FriendRequestAccepted / FriendRequestRejected CloudEvent */
    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T74',
        serviceName: 'FriendRequestResponderService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async respondToRequest(
    input: FriendRequestResponseInput,
  ): Promise<DataProcessResult<FriendRequestResponseResult>> {
    // Look up original friend request
    const requestResult = await this.dbFabric.searchDocuments('xiigen-friend-requests', {
      requestId: input.requestId,
      tenantId: input.tenantId,
    });
    if (
      !requestResult.isSuccess ||
      !Array.isArray(requestResult.data) ||
      requestResult.data.length === 0
    ) {
      return DataProcessResult.failure('GROUP_NOT_FOUND', 'Friend request not found');
    }
    const friendRequest = requestResult.data[0] as Record<string, unknown>;

    // Check for expired status
    if (friendRequest['status'] === 'EXPIRED') {
      return DataProcessResult.failure('REQUEST_EXPIRED', 'Friend request has expired');
    }

    const connectionId = friendRequest['connectionId'] as string;
    const respondedAt = new Date().toISOString();

    if (input.response === 'ACCEPT') {
      // DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.dbFabric.storeDocument(
        'xiigen-friend-request-responses',
        {
          requestId: input.requestId,
          responderId: input.responderId,
          tenantId: input.tenantId,
          status: 'ACCEPTED',
          connectionId,
          respondedAt,
          knowledgeScope: 'PRIVATE',
        },
        `resp-${input.requestId}`,
      );
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'STORE_FAILED',
          `Failed to store response: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      // Enqueue after store (DNA-8)
      await this.queueFabric.enqueue('social.friend-request.accepted', {
        requestId: input.requestId,
        connectionId,
        responderId: input.responderId,
        tenantId: input.tenantId,
        respondedAt,
      });

      return DataProcessResult.success({
        requestId: input.requestId,
        status: 'ACCEPTED',
        connectionId,
      });
    } else {
      // REJECT branch — DNA-8: storeDocument BEFORE enqueue
      const storeResult = await this.dbFabric.storeDocument(
        'xiigen-friend-request-responses',
        {
          requestId: input.requestId,
          responderId: input.responderId,
          tenantId: input.tenantId,
          status: 'REJECTED',
          respondedAt,
          knowledgeScope: 'PRIVATE',
        },
        `resp-${input.requestId}`,
      );
      if (!storeResult.isSuccess) {
        return DataProcessResult.failure(
          'STORE_FAILED',
          `Failed to store reject: ${storeResult.errorMessage ?? 'unknown'}`,
        );
      }

      // Enqueue after store (DNA-8)
      await this.queueFabric.enqueue('social.friend-request.rejected', {
        requestId: input.requestId,
        responderId: input.responderId,
        tenantId: input.tenantId,
        respondedAt,
      });

      return DataProcessResult.success({ requestId: input.requestId, status: 'REJECTED' });
    }
  }
}
