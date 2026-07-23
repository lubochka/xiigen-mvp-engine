/**
 * T223 ReverseEtlPushHandler [activation]
 * FLOW-14: ETL & Data Integration
 *
 * PURPOSE: Queue-fabric-only reverse ETL push to external SaaS (DR-64).
 * No direct HTTP to external systems. Rate limit before lock check.
 * RateLimitExhausted emitted on throttle — never silent drop.
 *
 * Iron rules:
 *   IR-1: ALL external SaaS pushes MUST go via QUEUE_FABRIC — no direct HTTP (DR-64).
 *   IR-2: Rate limit check via F430 BEFORE lock check.
 *   IR-3: Lock check prevents overlapping pushes for same connector.
 *   IR-4: ReverseETLPushed includes transport: "queue_fabric".
 *   IR-5: ConnectorId only — no credentials in event payload (F427).
 *   IR-6: RateLimitExhausted emitted on throttle — never silent drop.
 *   IR-7: storeDocument BEFORE enqueue. DNA-8.
 *
 * Emits: ReverseETLPushed, RateLimitExhausted
 */

import { Injectable, Inject } from '@nestjs/common';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import { IQueueService, QUEUE_SERVICE } from '../../../fabrics/interfaces/queue.interface';
import { TenantContextResolver } from '../../../kernel/multi-tenant';
import { RATE_LIMIT_GUARD_SERVICE } from './etl-platform-tokens';

interface IRateLimitGuardService {
  checkRateLimit(
    connectorId: string,
    operation: string,
  ): Promise<{ allowed: boolean; retryAfterMs?: number }>;
}

const PUSH_LOCKS_INDEX = 'xiigen-push-locks';
const PUSH_RECORDS_INDEX = 'xiigen-reverse-etl-pushes';

@Injectable()
export class ReverseEtlPushHandlerService extends MicroserviceBase {
  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(QUEUE_SERVICE) private readonly queueFabric: IQueueService,
    private readonly tenantContext: TenantContextResolver,
    @Inject(RATE_LIMIT_GUARD_SERVICE) private readonly rateLimitGuard: IRateLimitGuardService,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T223',
        serviceName: 'ReverseEtlPushHandlerService',
        flowId: 'FLOW-14',
      }),
    });
  }

  private getTenantId(): string {
    const result = this.tenantContext.getCurrentTenantId();
    return result.isSuccess && result.data ? result.data : 'unknown';
  }

  async push(event: Record<string, unknown>): Promise<DataProcessResult<Record<string, unknown>>> {
    const tenantId = this.getTenantId();
    const connectorId = event['connectorId'] as string;
    const records = (event['records'] as Record<string, unknown>[]) ?? [];
    const destination = event['destination'] as string;

    if (!connectorId || !destination) {
      return DataProcessResult.failure(
        'VALIDATION_FAILED',
        'connectorId and destination are required',
      );
    }

    // ORDER 1 (IR-2): Rate limit check BEFORE lock check
    const rateCheck = await this.rateLimitGuard.checkRateLimit(connectorId, 'reverse_etl_push');
    if (!rateCheck.allowed) {
      // IR-6: RateLimitExhausted emitted — never silent drop
      await this.queueFabric.enqueue('RateLimitExhausted', {
        connectorId,
        tenantId,
        destination,
        retryAfterMs: rateCheck.retryAfterMs,
        operation: 'reverse_etl_push',
      });
      return DataProcessResult.failure(
        'RATE_LIMIT_EXCEEDED',
        'Rate limit exceeded for reverse ETL push',
      );
    }

    // ORDER 2 (IR-3): Lock check — prevent overlapping pushes
    const lockKey = `push-lock:${tenantId}:${connectorId}:${destination}`;
    const lockSearch = await this.dbFabric.searchDocuments(PUSH_LOCKS_INDEX, {
      lockKey,
      tenantId,
      active: true,
    });

    const lockActive =
      lockSearch.isSuccess && Array.isArray(lockSearch.data) && lockSearch.data.length > 0;

    if (lockActive) {
      return DataProcessResult.failure(
        'PUSH_LOCKED',
        `Connector ${connectorId} to ${destination} already has an active push in progress`,
      );
    }

    // Acquire lock
    await this.dbFabric.storeDocument(
      PUSH_LOCKS_INDEX,
      {
        lockKey,
        connectorId,
        tenantId,
        destination,
        active: true,
        knowledgeScope: 'PRIVATE',
        acquiredAt: new Date().toISOString(),
      },
      lockKey,
    );

    // IR-1: Enqueue push via QUEUE FABRIC — no direct HTTP (DR-64)
    // IR-5: Only connectorId in event, no credentials
    const pushId = `push:${tenantId}:${connectorId}:${destination}:${Date.now()}`;

    // IR-7: storeDocument push record BEFORE enqueue (DNA-8)
    const storeResult = await this.dbFabric.storeDocument(
      PUSH_RECORDS_INDEX,
      {
        pushId,
        connectorId,
        tenantId,
        destination,
        knowledgeScope: 'PRIVATE',
        transport: 'queue_fabric',
        recordCount: records.length,
        enqueuedAt: new Date().toISOString(),
      },
      pushId,
    );

    if (!storeResult.isSuccess) {
      // Release lock on failure
      await this.dbFabric.storeDocument(
        PUSH_LOCKS_INDEX,
        {
          lockKey,
          connectorId,
          tenantId,
          destination,
          active: false,
          knowledgeScope: 'PRIVATE',
          releasedAt: new Date().toISOString(),
        },
        `${lockKey}:released`,
      );
      return DataProcessResult.failure(
        'STORE_FAILED',
        storeResult.errorMessage ?? 'Push record store failed',
      );
    }

    // IR-1: Queue fabric dispatch — no direct HTTP
    await this.queueFabric.enqueue('etl.reverse.push.dispatch', {
      pushId,
      connectorId,
      tenantId,
      destination,
      records,
      transport: 'queue_fabric',
    });

    // IR-4: ReverseETLPushed includes transport: "queue_fabric"
    // IR-5: connectorId only — no credentials
    await this.queueFabric.enqueue('ReverseETLPushed', {
      connectorId,
      tenantId,
      destination,
      pushId,
      transport: 'queue_fabric',
      recordCount: records.length,
      pushedAt: new Date().toISOString(),
    });

    // Release lock after dispatch
    await this.dbFabric.storeDocument(
      PUSH_LOCKS_INDEX,
      {
        lockKey,
        connectorId,
        tenantId,
        destination,
        active: false,
        knowledgeScope: 'PRIVATE',
        releasedAt: new Date().toISOString(),
      },
      `${lockKey}:released`,
    );

    return DataProcessResult.success({
      pushId,
      connectorId,
      destination,
      transport: 'queue_fabric',
      recordCount: records.length,
    });
  }
}
