// file: server/src/fabrics/database/outbox/outbox-record.type.ts
// EP-5: Outbox record shape — returned by getUndeliveredOutbox.

export interface OutboxRecord {
  id: string;
  tenantId: string;
  eventType: string;
  payload: Record<string, unknown>;
  status: 'PENDING' | 'DELIVERED' | 'FAILED';
  createdAt: Date;
  deliveredAt?: Date;
  retryCount: number;
  lastError?: string;
}
