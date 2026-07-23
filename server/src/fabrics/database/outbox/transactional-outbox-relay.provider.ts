// file: server/src/fabrics/database/outbox/transactional-outbox-relay.provider.ts
// EP-5 Transactional Outbox Relay provider implementation.

import { Injectable, Inject, Logger } from '@nestjs/common';
import { ITransactionalOutboxRelay } from './transactional-outbox-relay.interface';
import { OutboxRecord } from './outbox-record.type';
import { DATABASE_SERVICE, IDatabaseService } from '../../interfaces/database.interface';

@Injectable()
export class TransactionalOutboxRelayProvider implements ITransactionalOutboxRelay {
  private readonly logger = new Logger(TransactionalOutboxRelayProvider.name);

  constructor(@Inject(DATABASE_SERVICE) private readonly db: IDatabaseService) {}

  async recordOutbox(
    client: {
      query: (sql: string, params?: unknown[]) => Promise<{ rows: Array<Record<string, unknown>> }>;
    },
    event: Record<string, unknown>,
  ): Promise<string> {
    const tenantId = (event['tenantid'] ?? event['tenantId']) as string;
    const eventType = event['type'] as string;
    const result = await client.query(
      `INSERT INTO xiigen_outbox (tenant_id, event_type, payload)
       VALUES ($1, $2, $3)
       RETURNING id`,
      [tenantId, eventType, JSON.stringify(event)],
    );
    return result.rows[0]['id'] as string;
  }

  async getUndeliveredOutbox(limit = 50): Promise<OutboxRecord[]> {
    const result = await this.db.searchDocuments('xiigen_outbox', { status: 'PENDING' }, limit);
    if (!result.isSuccess) return [];
    return (result.data ?? []) as unknown as OutboxRecord[];
  }

  async markDelivered(id: string): Promise<void> {
    await this.db.storeDocument(
      'xiigen_outbox',
      {
        status: 'DELIVERED',
        delivered_at: new Date().toISOString(),
      },
      id,
    );
    this.logger.log(`OutboxRelay: marked ${id} as DELIVERED`);
  }

  async markFailed(id: string, error: string): Promise<void> {
    await this.db.storeDocument(
      'xiigen_outbox',
      {
        status: 'FAILED',
        last_error: error,
      },
      id,
    );
    this.logger.warn(`OutboxRelay: marked ${id} as FAILED — ${error}`);
  }
}
