// T80 MutualConnectionCounter [DATA_PIPELINE]
//
// Counts mutual connections between two users.
// CRITICAL: Full recompute from graph on EVERY invocation.
// Delta counting (++/--) drifts under retries — explicitly prohibited.
// Tenant-scoped intersection: only connections within tenantId count.
// Output: mutualCount (number only) — no list of shared user IDs.
// storeDocument BEFORE MutualCountUpdated emit (DNA-8)
//
// Factories:
//   F238: IConnectionGraphService — read full connection lists for both users
//   F234: IDatabaseService — count record storage
//   F236: IQueueService — MutualCountUpdated CloudEvent

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IConnectionGraphService {
  getConnections(params: Record<string, unknown>): Promise<{ isSuccess: boolean; data?: unknown }>;
}

export interface MutualConnectionCountRequest {
  userIdA: string;
  userIdB: string;
  tenantId: string;
}

export interface MutualConnectionCountResult {
  userIdA: string;
  userIdB: string;
  mutualCount: number;
  computedAt: string;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-07
 * @portability MOBILE - no ClsService, tenant-scoped graph intersection
 * @className MutualConnectionCounterService
 */
@Injectable()
export class MutualConnectionCounterService extends MicroserviceBase {
  constructor(
    /** F238: IConnectionGraphService — read full connection lists for both users */
    private readonly connectionGraphService: IConnectionGraphService,
    /** F234: IDatabaseService — count record storage */
    private readonly dbFabric: IDatabaseService,
    /** F236: IQueueService — MutualCountUpdated CloudEvent */
    private readonly queueFabric: IQueueService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T80',
        serviceName: 'MutualConnectionCounterService',
        flowId: 'FLOW-07',
      }),
    });
  }

  async countMutualConnections(
    request: MutualConnectionCountRequest,
  ): Promise<DataProcessResult<MutualConnectionCountResult>> {
    // ── STEP 1: Fetch FULL connection list for userIdA (IR-1 — full recompute) ────
    const connectionsAResult = await this.connectionGraphService.getConnections({
      userId: request.userIdA,
      tenantId: request.tenantId,
    });

    if (!connectionsAResult.isSuccess) {
      return DataProcessResult.failure(
        'CONNECTIONS_FETCH_FAILED',
        `Failed to fetch connections for ${request.userIdA}`,
      );
    }

    // ── STEP 2: Fetch FULL connection list for userIdB (IR-1 — full recompute) ────
    const connectionsBResult = await this.connectionGraphService.getConnections({
      userId: request.userIdB,
      tenantId: request.tenantId,
    });

    if (!connectionsBResult.isSuccess) {
      return DataProcessResult.failure(
        'CONNECTIONS_FETCH_FAILED',
        `Failed to fetch connections for ${request.userIdB}`,
      );
    }

    // ── STEP 3: Compute intersection = mutual connections (full recompute, not delta)
    const dataA = connectionsAResult.data as Record<string, unknown> | undefined;
    const dataB = connectionsBResult.data as Record<string, unknown> | undefined;
    const connectionsA = new Set<string>(
      Array.isArray(dataA?.['connectionIds']) ? (dataA?.['connectionIds'] as string[]) : [],
    );
    const connectionsBList: string[] = Array.isArray(dataB?.['connectionIds'])
      ? (dataB?.['connectionIds'] as string[])
      : [];

    const mutualConnectionIds = connectionsBList.filter((id) => connectionsA.has(id));
    const mutualCount = mutualConnectionIds.length;

    const computedAt = new Date().toISOString();

    // ── STEP 4: storeDocument count record (DNA-8) ───────────────────────────────
    const storeResult = await this.dbFabric.storeDocument(
      'xiigen-mutual-connection-counts',
      {
        userIdA: request.userIdA,
        userIdB: request.userIdB,
        tenantId: request.tenantId,
        mutualCount,
        computedAt,
        knowledgeScope: 'PRIVATE',
      },
      `mutual-${request.userIdA}-${request.userIdB}-${request.tenantId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store mutual count: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // ── STEP 5: enqueue MutualCountUpdated (DNA-8 — after store) ─────────────────
    await this.queueFabric.enqueue('social.mutual.connection.counted', {
      userIdA: request.userIdA,
      userIdB: request.userIdB,
      tenantId: request.tenantId,
      mutualCount,
      computedAt,
    });

    return DataProcessResult.success({
      userIdA: request.userIdA,
      userIdB: request.userIdB,
      mutualCount,
      computedAt,
    });
  }
}
