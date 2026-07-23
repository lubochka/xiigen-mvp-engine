// file: server/src/fabrics/database/outbox/transactional-outbox-relay.interface.ts
// EP-5 Transactional Outbox Relay interface.

import { OutboxRecord } from './outbox-record.type';

export const TRANSACTIONAL_OUTBOX_RELAY = Symbol('TRANSACTIONAL_OUTBOX_RELAY');

/**
 * EP-5 Transactional Outbox Relay.
 *
 * USAGE CONTRACT:
 *   1. Obtain a PG PoolClient and BEGIN a transaction.
 *   2. Write business record using the same PoolClient.
 *   3. Call recordOutbox(client, event) — writes event to xiigen_outbox IN THE SAME TX.
 *   4. COMMIT the transaction.
 *   5. OutboxRelayWorker polls and delivers asynchronously.
 *
 * NEVER call enqueue() directly from financial task types — use recordOutbox() instead.
 */
export interface ITransactionalOutboxRelay {
  /**
   * Write a CloudEvent to the outbox table using the provided PG client.
   * MUST be called within an active transaction (BEGIN not committed yet).
   * Returns the outbox record ID.
   */
  recordOutbox(
    client: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
    },
    event: Record<string, unknown>,
  ): Promise<string>;

  /**
   * Fetch undelivered outbox records (PENDING status).
   * Used by OutboxRelayWorker. Scoped to current tenant via AsyncLocalStorage.
   */
  getUndeliveredOutbox(limit?: number): Promise<OutboxRecord[]>;

  /**
   * Mark an outbox record as delivered after successful queue publish.
   */
  markDelivered(id: string): Promise<void>;

  /**
   * Mark an outbox record as failed after exhausting retries.
   */
  markFailed(id: string, error: string): Promise<void>;
}
