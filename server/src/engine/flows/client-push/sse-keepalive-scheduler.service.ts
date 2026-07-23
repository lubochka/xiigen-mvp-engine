/**
 * SseKeepaliveScheduler (T589) — FLOW-40 Phase D
 *
 * Sends keepalive pings to active SSE connections and cleans up dropped ones.
 *
 * Iron rules:
 *   keepalive-from-config: Keepalive interval reads from FREEDOM config
 *     (sse_keepalive_interval_ms) — NEVER hardcoded.
 *   cleanup-before-emit: Dropped connection removal from pool BEFORE any further event push.
 *   dropped-INFO-only: A dropped connection is NOT an error — log at INFO level ONLY.
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ISseConnectionPool,
  SSE_CONNECTION_POOL,
  ConnectionInfo,
  SseEvent,
} from '../../../fabrics/interfaces/sse-connection-pool.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

export interface RunKeepaliveOptions {
  tenantId: string;
  keepaliveIntervalMs: number; // from FREEDOM config sse_keepalive_interval_ms
  droppedThresholdMs: number; // from FREEDOM config sse_dropped_connection_threshold_ms
}

export interface RunKeepaliveResult {
  pinged: number;
  cleaned: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-40
 * @portability MOBILE - no direct tenant context, tenant-scoped SSE keepalive
 * @className SseKeepaliveScheduler
 */
@Injectable()
export class SseKeepaliveScheduler extends MicroserviceBase {
  private readonly logger = new Logger(SseKeepaliveScheduler.name);

  constructor(@Inject(SSE_CONNECTION_POOL) private readonly pool: ISseConnectionPool) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T589',
        serviceName: 'SseKeepaliveScheduler',
        flowId: 'FLOW-40',
      }),
    });
  }

  async run(options: RunKeepaliveOptions): Promise<DataProcessResult<RunKeepaliveResult>> {
    try {
      const { tenantId, keepaliveIntervalMs, droppedThresholdMs } = options;

      if (!tenantId) {
        return DataProcessResult.failure('MISSING_TENANT_ID', 'tenantId is required');
      }
      if (!keepaliveIntervalMs || keepaliveIntervalMs <= 0) {
        return DataProcessResult.failure(
          'INVALID_KEEPALIVE_INTERVAL',
          'keepaliveIntervalMs must be > 0 (from FREEDOM config)',
        );
      }
      if (!droppedThresholdMs || droppedThresholdMs <= 0) {
        return DataProcessResult.failure(
          'INVALID_DROPPED_THRESHOLD',
          'droppedThresholdMs must be > 0 (from FREEDOM config)',
        );
      }

      const activeConnections: ConnectionInfo[] = this.pool.getActiveConnections(tenantId);

      let pinged = 0;
      let cleaned = 0;
      const now = Date.now();

      const pingEvent: SseEvent = {
        event: 'keepalive',
        data: { timestamp: new Date().toISOString() },
      };

      for (const conn of activeConnections) {
        const lastAck = new Date(conn.lastAcknowledgedAt).getTime();
        const isDropped = now - lastAck > droppedThresholdMs;

        if (isDropped) {
          // cleanup-before-emit: remove BEFORE any further push to this slot
          this.pool.closeConnection(tenantId, conn.correlationId);
          cleaned++;
          // dropped-INFO-only: log at INFO, never WARN/ERROR, never throw
          this.logger.log(
            `SseKeepaliveScheduler: dropped connection cleaned tenantId=${tenantId} correlationId=${conn.correlationId}`,
          );
        } else {
          // Push keepalive ping to active connection
          const delivered = this.pool.pushEvent(tenantId, conn.correlationId, pingEvent);
          if (delivered) {
            pinged++;
          }
        }
      }

      this.logger.log(
        `SseKeepaliveScheduler: tenantId=${tenantId} pinged=${pinged} cleaned=${cleaned}`,
      );
      return DataProcessResult.success({ pinged, cleaned });
    } catch (err) {
      return DataProcessResult.failure(
        'KEEPALIVE_SCHEDULER_ERROR',
        `SseKeepaliveScheduler threw: ${String(err)}`,
      );
    }
  }
}
