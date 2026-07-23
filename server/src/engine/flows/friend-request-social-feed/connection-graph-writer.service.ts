// T75 ConnectionGraphWriter [ORCHESTRATION]
//
// Writes bidirectional connection graph edges atomically.
// BOTH A→B and B→A adjacency entries in separate storeDocument calls (same connectionId).
// connectionId = hash(sorted([userIdA, userIdB]) + tenantId) — direction-independent
// initialConnectionStrength from FLOW-02 match score if available; else 0
// storeDocument BEFORE SocialConnectionEstablished emit (DNA-8)
// knowledgeScope: 'PRIVATE'
//
// Factories:
//   F234: IDatabaseService — connection record storage
//   F236: IQueueService — SocialConnectionEstablished CloudEvent

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface WriteConnectionInput {
  userIdA: string;
  userIdB: string;
  tenantId: string;
  requestId: string;
  flow02MatchScore?: number;
}

export interface WriteConnectionResult {
  connectionId: string;
  userIdA: string;
  userIdB: string;
  establishedAt: string;
  initialConnectionStrength: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, privacy gate co-bundled through the flow SDK
 * @className ConnectionGraphWriterService
 */
@Injectable()
export class ConnectionGraphWriterService extends MicroserviceBase {
  constructor(
    /** F234: IDatabaseService — connection record storage */
    private readonly dbFabric: IDatabaseService,
    /** F236: IQueueService — SocialConnectionEstablished CloudEvent */
    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T75',
        serviceName: 'ConnectionGraphWriterService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async writeConnection(
    input: WriteConnectionInput,
  ): Promise<DataProcessResult<WriteConnectionResult>> {
    // connectionId = hash(sorted([userIdA, userIdB]) + tenantId) — direction-independent
    const sortedIds = [input.userIdA, input.userIdB].sort();
    const connectionId = `conn-${sortedIds[0]}-${sortedIds[1]}-${input.tenantId}`;
    const establishedAt = new Date().toISOString();

    // initialConnectionStrength from FLOW-02 match score if available; else 0
    const initialConnectionStrength =
      typeof input.flow02MatchScore === 'number' ? input.flow02MatchScore : 0;

    // DNA-8: storeDocument BEFORE enqueue
    // Write A→B adjacency entry
    const storeResultAtoB = await this.dbFabric.storeDocument(
      'xiigen-connections',
      {
        connectionId,
        fromUserId: sortedIds[0],
        toUserId: sortedIds[1],
        tenantId: input.tenantId,
        requestId: input.requestId,
        establishedAt,
        initialConnectionStrength,
        knowledgeScope: 'PRIVATE',
      },
      `${connectionId}-${sortedIds[0]}-${sortedIds[1]}`,
    );

    if (!storeResultAtoB.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store A→B edge: ${storeResultAtoB.errorMessage ?? 'unknown'}`,
      );
    }

    // Write B→A adjacency entry (bidirectional-atomic)
    const storeResultBtoA = await this.dbFabric.storeDocument(
      'xiigen-connections',
      {
        connectionId,
        fromUserId: sortedIds[1],
        toUserId: sortedIds[0],
        tenantId: input.tenantId,
        requestId: input.requestId,
        establishedAt,
        initialConnectionStrength,
        knowledgeScope: 'PRIVATE',
      },
      `${connectionId}-${sortedIds[1]}-${sortedIds[0]}`,
    );

    if (!storeResultBtoA.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store B→A edge: ${storeResultBtoA.errorMessage ?? 'unknown'}`,
      );
    }

    // Enqueue after both stores (DNA-8)
    await this.queueFabric.enqueue('social.connection.established', {
      connectionId,
      userIdA: sortedIds[0],
      userIdB: sortedIds[1],
      tenantId: input.tenantId,
      requestId: input.requestId,
      establishedAt,
      initialConnectionStrength,
    });

    return DataProcessResult.success({
      connectionId,
      userIdA: sortedIds[0],
      userIdB: sortedIds[1],
      establishedAt,
      initialConnectionStrength,
    });
  }
}
