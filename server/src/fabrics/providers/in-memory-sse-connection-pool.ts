/**
 * InMemorySseConnectionPool — ISseConnectionPool for tests and local dev.
 *
 * Manages SSE connections in-process. No Redis, no external pub/sub required.
 * CF-798: pushEvent is strictly scoped by tenantId — cross-tenant delivery is blocked.
 * DNA-3: pushEvent returns false on unknown correlationId (never throws).
 *
 * Limitations vs production providers:
 *   - Connections are lost on process restart
 *   - Not suitable for multi-process / horizontally-scaled setups
 */

import { Injectable } from '@nestjs/common';
import { Response } from 'express';
import {
  ISseConnectionPool,
  SseEvent,
  ConnectionInfo,
} from '../interfaces/sse-connection-pool.interface';

interface ActiveConnection {
  response: Response;
  connectedAt: string;
  lastAcknowledgedAt: string;
}

@Injectable()
export class InMemorySseConnectionPool implements ISseConnectionPool {
  /** Map<tenantId, Map<correlationId, ActiveConnection>> */
  private readonly pool = new Map<string, Map<string, ActiveConnection>>();

  registerConnection(tenantId: string, correlationId: string, response: Response): void {
    if (!this.pool.has(tenantId)) {
      this.pool.set(tenantId, new Map());
    }
    const tenantPool = this.pool.get(tenantId)!;
    const now = new Date().toISOString();
    tenantPool.set(correlationId, {
      response,
      connectedAt: now,
      lastAcknowledgedAt: now,
    });
  }

  pushEvent(tenantId: string, correlationId: string, event: SseEvent): boolean {
    const tenantPool = this.pool.get(tenantId);
    if (!tenantPool) return false;

    const conn = tenantPool.get(correlationId);
    if (!conn) return false;

    try {
      const payload = `event: ${event.event}\ndata: ${JSON.stringify(event.data)}${event.id ? `\nid: ${event.id}` : ''}\n\n`;
      conn.response.write(payload);
      conn.lastAcknowledgedAt = new Date().toISOString();
      return true;
    } catch {
      // Connection closed by client — remove from pool
      tenantPool.delete(correlationId);
      return false;
    }
  }

  closeConnection(tenantId: string, correlationId: string): void {
    const tenantPool = this.pool.get(tenantId);
    if (!tenantPool) return;

    const conn = tenantPool.get(correlationId);
    if (conn) {
      try {
        conn.response.end();
      } catch {
        // Already closed — ignore
      }
      tenantPool.delete(correlationId);
    }

    if (tenantPool.size === 0) {
      this.pool.delete(tenantId);
    }
  }

  getActiveConnections(tenantId: string): ConnectionInfo[] {
    const tenantPool = this.pool.get(tenantId);
    if (!tenantPool) return [];

    return [...tenantPool.entries()].map(([correlationId, conn]) => ({
      tenantId,
      correlationId,
      connectedAt: conn.connectedAt,
      lastAcknowledgedAt: conn.lastAcknowledgedAt,
    }));
  }
}
