/**
 * FlowEventBridge (T588) — FLOW-40 Phase C
 *
 * Bridges domain CloudEvents to SSE connections via ISseConnectionPool.
 *
 * Iron rules:
 *   CF-797: FlowEventBridge MAY subscribe to user-facing flow events.
 *           FlowEventBridge MUST NOT emit events into user-facing domains.
 *   CF-798: Pool lookups are tenant-scoped — cross-tenant delivery is BUILD_FAILURE.
 *   no-retry-on-missing: If connection absent from pool → log INFO + discard, no retry.
 *   DNA-9: All incoming events are CloudEvents envelopes.
 *   DNA-3: returns DataProcessResult<T>, never throws.
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  ISseConnectionPool,
  SSE_CONNECTION_POOL,
  SseEvent,
} from '../../../fabrics/interfaces/sse-connection-pool.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MicroserviceBase, ServiceDescriptor } from '../../../kernel/microservice-base';

/** User-facing domain prefixes — CF-797: MUST NOT emit into these. */
export const PROHIBITED_EMIT_DOMAINS = [
  'xiigen.user-registration',
  'xiigen.content',
  'xiigen.social',
  'xiigen.commerce',
  'xiigen.onboarding',
] as const;

export interface BridgeEventOptions {
  cloudEvent: Record<string, unknown>;
  tenantId: string;
  correlationId: string;
}

export interface BridgeEventResult {
  delivered: boolean;
  recipientCount: number;
}

/**
 * @connectionType FLOW_SCOPED
 * @flowId FLOW-40
 * @portability MOBILE - no direct tenant context, tenant-scoped SSE pool delivery
 * @className FlowEventBridge
 */
@Injectable()
export class FlowEventBridge extends MicroserviceBase {
  private readonly logger = new Logger(FlowEventBridge.name);

  constructor(@Inject(SSE_CONNECTION_POOL) private readonly pool: ISseConnectionPool) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'T588',
        serviceName: 'FlowEventBridge',
        flowId: 'FLOW-40',
      }),
    });
  }

  async bridge(options: BridgeEventOptions): Promise<DataProcessResult<BridgeEventResult>> {
    try {
      const { cloudEvent, tenantId, correlationId } = options;

      if (!tenantId) {
        return DataProcessResult.failure(
          'MISSING_TENANT_ID',
          'tenantId is required for pool scoping',
        );
      }
      if (!correlationId) {
        return DataProcessResult.failure('MISSING_CORRELATION_ID', 'correlationId is required');
      }

      // CF-797: FlowEventBridge MUST NOT emit into user-facing domains
      // (no emit() calls in this service — this service is read-only toward domain events)

      // CF-798: Verify tenantId matches what's in the pool before pushing
      const activeConnections = this.pool.getActiveConnections(tenantId);
      const targetConnection = activeConnections.find((c) => c.correlationId === correlationId);

      if (!targetConnection) {
        // no-retry-on-missing: log INFO and discard — never queue for retry
        this.logger.log(
          `FlowEventBridge: connection not found for tenantId=${tenantId} correlationId=${correlationId} — discarding (no-retry)`,
        );
        return DataProcessResult.success({ delivered: false, recipientCount: 0 });
      }

      // CF-798: tenant isolation — verify the found connection belongs to the correct tenant
      if (targetConnection.tenantId !== tenantId) {
        return DataProcessResult.failure(
          'CROSS_TENANT_DELIVERY_ATTEMPT',
          `CF-798 violation: pool connection tenantId=${targetConnection.tenantId} does not match request tenantId=${tenantId}`,
        );
      }

      const eventType = String(cloudEvent['type'] ?? 'flow.event');
      const sseEvent: SseEvent = {
        event: eventType,
        data: (cloudEvent['data'] as Record<string, unknown>) ?? {},
        id: String(cloudEvent['id'] ?? ''),
      };

      const delivered = this.pool.pushEvent(tenantId, correlationId, sseEvent);

      this.logger.log(
        `FlowEventBridge: delivered=${delivered} tenantId=${tenantId} correlationId=${correlationId} event=${eventType}`,
      );
      return DataProcessResult.success({ delivered, recipientCount: delivered ? 1 : 0 });
    } catch (err) {
      return DataProcessResult.failure('BRIDGE_ERROR', `FlowEventBridge threw: ${String(err)}`);
    }
  }
}
