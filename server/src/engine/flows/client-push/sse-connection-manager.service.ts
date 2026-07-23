/**
 * SseConnectionManager (T587) — FLOW-40 Phase B
 *
 * Manages SSE connection registration after authentication.
 *
 * Iron rules:
 *   auth-before-registration: Authentication of tenantId and correlationId
 *     MUST complete before registerConnection is called.
 *   expired-404: Connections with expired correlationId return DataProcessResult.failure,
 *     not an exception.
 *   CF-798: Pool registration is tenant-scoped — cross-tenant delivery is prohibited.
 *   DNA-8: Connection registration in pool MUST precede any event push.
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../../fabrics/interfaces/database.interface';
import {
  ISseConnectionPool,
  SSE_CONNECTION_POOL,
  ConnectionInfo,
} from '../../../fabrics/interfaces/sse-connection-pool.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';
import { Response } from 'express';

const CONNECTIONS_INDEX = 'xiigen-sse-connections';

export interface RegisterConnectionOptions {
  tenantId: string;
  correlationId: string;
  connectionResponse: Response;
  activeFlowState?: Record<string, unknown>;
}

export interface RegisterConnectionResult {
  registered: boolean;
  connectionInfo: ConnectionInfo;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-40
 * @portability MOBILE - no direct tenant context, fabric-only connection registration
 * @className SseConnectionManager
 */
@Injectable()
export class SseConnectionManager extends MicroserviceBase {
  private readonly logger = new Logger(SseConnectionManager.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly dbFabric: IDatabaseService,
    @Inject(SSE_CONNECTION_POOL) private readonly pool: ISseConnectionPool,
  ) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T587',
        serviceName: 'SseConnectionManager',
        flowId: 'FLOW-40',
      }),
    });
  }

  async register(
    options: RegisterConnectionOptions,
  ): Promise<DataProcessResult<RegisterConnectionResult>> {
    try {
      const { tenantId, correlationId, connectionResponse, activeFlowState } = options;

      // auth-before-registration: validate BEFORE registering in pool
      if (!tenantId) {
        return DataProcessResult.failure(
          'UNAUTHENTICATED_TENANT',
          'tenantId could not be verified',
        );
      }
      if (!correlationId) {
        return DataProcessResult.failure('MISSING_CORRELATION_ID', 'correlationId is required');
      }

      // expired-404: check that correlationId has an active flow state
      // If activeFlowState is explicitly passed as null/undefined AND caller signals expiry:
      if (activeFlowState === null) {
        return DataProcessResult.failure(
          'EXPIRED_CORRELATION_ID',
          `correlationId ${correlationId} has no active flow state`,
        );
      }

      // DNA-8: registerConnection in pool (pool write = "storeDocument" equivalent)
      // before any event push can target this connection
      this.pool.registerConnection(tenantId, correlationId, connectionResponse);

      const connectionInfo: ConnectionInfo = {
        tenantId,
        correlationId,
        connectedAt: new Date().toISOString(),
        lastAcknowledgedAt: new Date().toISOString(),
      };

      // Record connection in database for audit
      const connectionRecord: Record<string, unknown> = {
        tenantId,
        correlationId,
        connectionInfo,
        connectedAt: connectionInfo.connectedAt,
      };
      await this.dbFabric.storeDocument(
        CONNECTIONS_INDEX,
        connectionRecord,
        `${tenantId}::${correlationId}`,
      );

      this.logger.log(
        `SseConnectionManager: registered tenant=${tenantId} correlationId=${correlationId}`,
      );
      return DataProcessResult.success({ registered: true, connectionInfo });
    } catch (err) {
      return DataProcessResult.failure(
        'POOL_REGISTRATION_FAILED',
        `SseConnectionManager threw: ${String(err)}`,
      );
    }
  }
}
