/**
 * FABRIC 12: ISseConnectionPool (FLOW-40 Client Push Infrastructure)
 *
 * Manages active SSE connections per tenant. Scoped by tenantId — CF-798 compliance.
 * pushEvent() returns false (not throws) when correlationId is unknown (DNA-3).
 *
 * NOTE: Uses `import { Response } from 'express'` explicitly — not the Fetch API Response.
 */

import { Response } from 'express';

/** Injection token for ISseConnectionPool. */
export const SSE_CONNECTION_POOL = 'SSE_CONNECTION_POOL';

/** A single server-sent event payload. */
export interface SseEvent {
  event: string;
  data: Record<string, unknown>;
  id?: string;
}

/** Metadata about an active SSE connection. */
export interface ConnectionInfo {
  tenantId: string;
  correlationId: string;
  connectedAt: string;
  lastAcknowledgedAt: string;
}

/**
 * ISseConnectionPool — fabric interface for SSE connection management.
 *
 * CF-798: pushEvent MUST scope by tenantId — cross-tenant delivery is prohibited.
 * CF-797: FlowEventBridge MUST NOT emit into user-facing flow domains.
 *
 * All methods NEVER throw (DNA-3). Failures are surfaced via return values.
 */
export interface ISseConnectionPool {
  /**
   * Register a new SSE connection for the given tenant and correlationId.
   * Idempotent: re-registering the same tenantId+correlationId replaces the connection.
   */
  registerConnection(tenantId: string, correlationId: string, response: Response): void;

  /**
   * Push an event to a specific connection.
   * Returns true when the event was delivered, false when the correlationId is unknown
   * for the given tenant or the connection is already closed (DNA-3: no throw).
   * CF-798: tenantId scope is enforced — tenantA cannot push to tenantB's correlationId.
   */
  pushEvent(tenantId: string, correlationId: string, event: SseEvent): boolean;

  /**
   * Close and remove a connection from the pool.
   * No-op when correlationId is not registered for the tenant.
   */
  closeConnection(tenantId: string, correlationId: string): void;

  /**
   * Return all active connection metadata for a tenant.
   * Returns empty array when the tenant has no active connections.
   */
  getActiveConnections(tenantId: string): ConnectionInfo[];
}
