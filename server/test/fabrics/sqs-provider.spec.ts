/**
 * P3.4 — SQS Provider Tests.
 *
 * Uses a mock IAsyncSqsClient to test all provider logic
 * without real AWS SQS.
 *
 * Covers: enqueue (CloudEvents DNA-9), dequeue (tenant filtering DNA-5),
 * acknowledge, sendToDlq, URL resolution/caching, health check,
 * error handling (DNA-3), no-tenant failure (DNA-5).
 */

import { SqsProvider } from '../../src/fabrics/queue/sqs.provider';
import { IAsyncSqsClient } from '../../src/fabrics/queue/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

// ── CLS mock ─────────────────────────────────────────

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

function mockClsEmpty() {
  return { get: jest.fn().mockReturnValue(undefined) } as any;
}

// ── Mock SQS Client ──────────────────────────────────

function createMockSqsClient(): jest.Mocked<IAsyncSqsClient> {
  return {
    sendMessage: jest.fn().mockResolvedValue({ MessageId: 'sqs-msg-001' }),
    receiveMessage: jest.fn().mockResolvedValue({ Messages: [] }),
    deleteMessage: jest.fn().mockResolvedValue({}),
    getQueueUrl: jest.fn().mockResolvedValue({ QueueUrl: 'https://sqs/test.fifo' }),
    getQueueAttributes: jest.fn().mockResolvedValue({ Attributes: {} }),
    createQueue: jest.fn().mockResolvedValue({ QueueUrl: 'https://sqs/test.fifo' }),
    setQueueAttributes: jest.fn().mockResolvedValue({}),
  };
}

// ── Tests ────────────────────────────────────────────

describe('SqsProvider', () => {
  const TENANT = 'sqs-test-tenant';
  let client: jest.Mocked<IAsyncSqsClient>;
  let provider: SqsProvider;

  beforeEach(() => {
    client = createMockSqsClient();
    provider = new SqsProvider(mockCls(TENANT), client, {
      queueUrlPrefix: 'https://sqs.local',
    });
  });

  // ── enqueue ────────────────────────────────────────

  describe('enqueue', () => {
    it('should enqueue message and return MessageId', async () => {
      client.sendMessage.mockResolvedValue({ MessageId: 'msg-123' });

      const result = await provider.enqueue('order.created', { orderId: 'X' });
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('msg-123');
    });

    it('should wrap data in CloudEvents envelope (DNA-9)', async () => {
      await provider.enqueue('order.created', { orderId: 'X' });

      const body = client.sendMessage.mock.calls[0][0].MessageBody;
      const parsed = JSON.parse(body);
      expect(parsed['specversion']).toBe('1.0');
      expect(parsed['type']).toBe('order.created');
      expect(parsed['source']).toBe(`/xiigen/queue-fabric/sqs/${TENANT}`);
      expect(parsed['data']).toBeDefined();
      expect(parsed['data']['orderId']).toBe('X');
    });

    it('should use tenantId as MessageGroupId (DNA-5)', async () => {
      await provider.enqueue('event', { x: 1 });

      const params = client.sendMessage.mock.calls[0][0];
      expect(params.MessageGroupId).toBe(TENANT);
    });

    it('should include tenant_id in MessageAttributes', async () => {
      await provider.enqueue('event', { x: 1 });

      const attrs = client.sendMessage.mock.calls[0][0].MessageAttributes!;
      expect(attrs['tenant_id'].StringValue).toBe(TENANT);
      expect(attrs['event_type'].StringValue).toBe('event');
    });

    it('should use custom deduplication ID when provided', async () => {
      await provider.enqueue('event', { x: 1 }, 'custom-dedup');

      const params = client.sendMessage.mock.calls[0][0];
      expect(params.MessageDeduplicationId).toBe('custom-dedup');
    });

    it('should auto-generate deduplication ID from CloudEvents id', async () => {
      await provider.enqueue('event', { x: 1 });

      const params = client.sendMessage.mock.calls[0][0];
      expect(params.MessageDeduplicationId).toBeDefined();
      expect(typeof params.MessageDeduplicationId).toBe('string');
      expect(params.MessageDeduplicationId!.length).toBeGreaterThan(0);
    });

    it('should reject non-dict data (DNA-1)', async () => {
      const result = await provider.enqueue('event', 'string' as any);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_DATA');
    });

    it('should resolve queue URL with .fifo suffix', async () => {
      await provider.enqueue('order.created', { x: 1 });

      const queueUrl = client.sendMessage.mock.calls[0][0].QueueUrl;
      expect(queueUrl).toContain('order.created.fifo');
    });

    it('should handle SQS error (DNA-3)', async () => {
      client.sendMessage.mockRejectedValue(new Error('Access denied'));

      const result = await provider.enqueue('event', { x: 1 });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ENQUEUE_FAILED');
    });
  });

  // ── dequeue ────────────────────────────────────────

  describe('dequeue', () => {
    it('should dequeue messages and parse CloudEvents body', async () => {
      const envelope = JSON.stringify({
        specversion: '1.0',
        type: 'order.created',
        source: '/xiigen/queue-fabric/sqs',
        id: 'ce-1',
        time: new Date().toISOString(),
        tenantid: TENANT,
        data: { orderId: '123' },
      });

      client.receiveMessage.mockResolvedValue({
        Messages: [
          {
            MessageId: 'msg-1',
            ReceiptHandle: 'rh-1',
            Body: envelope,
            MessageAttributes: {
              tenant_id: { DataType: 'String', StringValue: TENANT },
              event_type: { DataType: 'String', StringValue: 'order.created' },
            },
          },
        ],
      });

      const result = await provider.dequeue('order.created', 1);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(1);

      const msg = result.data![0];
      expect(msg['message_id']).toBe('msg-1');
      expect(msg['receipt_handle']).toBe('rh-1');
      expect(msg['tenant_id']).toBe(TENANT);
      expect((msg['body'] as any)['data']['orderId']).toBe('123');
    });

    it('should filter out messages from other tenants (DNA-5)', async () => {
      client.receiveMessage.mockResolvedValue({
        Messages: [
          {
            MessageId: 'msg-mine',
            ReceiptHandle: 'rh-1',
            Body: JSON.stringify({ specversion: '1.0', tenantid: TENANT, data: {} }),
            MessageAttributes: {},
          },
          {
            MessageId: 'msg-other',
            ReceiptHandle: 'rh-2',
            Body: JSON.stringify({ specversion: '1.0', tenantid: 'other-tenant', data: {} }),
            MessageAttributes: {},
          },
        ],
      });

      const result = await provider.dequeue('events', 10);
      expect(result.data!.length).toBe(1);
      expect(result.data![0]['message_id']).toBe('msg-mine');
    });

    it('should return empty array when no messages', async () => {
      client.receiveMessage.mockResolvedValue({ Messages: [] });

      const result = await provider.dequeue('events', 1);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should return empty for maxMessages < 1', async () => {
      const result = await provider.dequeue('events', 0);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
      expect(client.receiveMessage).not.toHaveBeenCalled();
    });

    it('should cap MaxNumberOfMessages at 10', async () => {
      client.receiveMessage.mockResolvedValue({ Messages: [] });

      await provider.dequeue('events', 50);

      expect(client.receiveMessage.mock.calls[0][0].MaxNumberOfMessages).toBe(10);
    });

    it('should handle SQS error (DNA-3)', async () => {
      client.receiveMessage.mockRejectedValue(new Error('Timeout'));

      const result = await provider.dequeue('events', 1);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DEQUEUE_FAILED');
    });
  });

  // ── acknowledge ────────────────────────────────────

  describe('acknowledge', () => {
    it('should delete message via receipt handle', async () => {
      const result = await provider.acknowledge('events', 'rh-123');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);

      expect(client.deleteMessage).toHaveBeenCalledWith(
        expect.objectContaining({ ReceiptHandle: 'rh-123' }),
      );
    });

    it('should handle SQS error (DNA-3)', async () => {
      client.deleteMessage.mockRejectedValue(new Error('Invalid handle'));

      const result = await provider.acknowledge('events', 'bad');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('ACK_FAILED');
    });
  });

  // ── sendToDlq ──────────────────────────────────────

  describe('sendToDlq', () => {
    it('should send message to DLQ with reason in attributes', async () => {
      client.sendMessage.mockResolvedValue({ MessageId: 'dlq-msg-1' });

      const result = await provider.sendToDlq('events', { body: { x: 1 } }, 'processing failed');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('dlq-msg-1');

      const params = client.sendMessage.mock.calls[0][0];
      // Should go to DLQ URL (events-dlq)
      expect(params.QueueUrl).toContain('events-dlq');
      expect(params.MessageAttributes!['dlq_reason'].StringValue).toBe('processing failed');
      expect(params.MessageAttributes!['original_queue'].StringValue).toBe('events');
      expect(params.MessageAttributes!['tenant_id'].StringValue).toBe(TENANT);
    });

    it('should handle raw message without body key', async () => {
      client.sendMessage.mockResolvedValue({ MessageId: 'dlq-msg-2' });

      await provider.sendToDlq('events', { raw: 'data' }, 'error');

      const body = client.sendMessage.mock.calls[0][0].MessageBody;
      expect(body).toContain('raw');
    });

    it('should handle SQS error (DNA-3)', async () => {
      client.sendMessage.mockRejectedValue(new Error('Queue not found'));

      const result = await provider.sendToDlq('events', {}, 'reason');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DLQ_SEND_FAILED');
    });
  });

  // ── URL resolution & caching ───────────────────────

  describe('URL resolution', () => {
    it('should use queueUrlPrefix when configured', async () => {
      await provider.enqueue('orders', { x: 1 });

      const url = client.sendMessage.mock.calls[0][0].QueueUrl;
      expect(url).toBe('https://sqs.local/orders.fifo');
    });

    it('should fall back to getQueueUrl when no prefix', async () => {
      const noPrefixProvider = new SqsProvider(mockCls(TENANT), client);
      client.getQueueUrl.mockResolvedValue({ QueueUrl: 'https://sqs/orders.fifo' });

      await noPrefixProvider.enqueue('orders', { x: 1 });

      expect(client.getQueueUrl).toHaveBeenCalled();
    });

    it('should cache resolved URLs', async () => {
      await provider.enqueue('orders', { x: 1 });
      await provider.enqueue('orders', { x: 2 });

      // URL should be resolved once, cached for second call
      expect(provider.cachedUrls).toBeGreaterThan(0);
    });

    it('clearUrlCache should reset cache', () => {
      provider.clearUrlCache();
      expect(provider.cachedUrls).toBe(0);
    });
  });

  // ── healthCheck ────────────────────────────────────

  describe('healthCheck', () => {
    it('should return ok', async () => {
      const result = await provider.healthCheck();
      expect(result.isSuccess).toBe(true);
      expect(result.data!['provider']).toBe('sqs');
    });
  });

  // ── DNA-5: No tenant context ──────────────────────

  describe('DNA-5: no tenant context', () => {
    let noTenantProvider: SqsProvider;

    beforeEach(() => {
      noTenantProvider = new SqsProvider(mockClsEmpty(), client);
    });

    it('all methods fail without tenant', async () => {
      const results = await Promise.all([
        noTenantProvider.enqueue('evt', { x: 1 }),
        noTenantProvider.dequeue('q', 1),
        noTenantProvider.acknowledge('q', 'handle'),
        noTenantProvider.sendToDlq('q', {}, 'reason'),
      ]);
      for (const r of results) {
        expect(r.isSuccess).toBe(false);
        expect(r.errorCode).toBe('NO_TENANT');
      }
    });
  });

  // ── DNA-3: DataProcessResult ───────────────────────

  describe('DNA-3: DataProcessResult always returned', () => {
    it('every method returns DataProcessResult', async () => {
      client.receiveMessage.mockResolvedValue({ Messages: [] });

      const results = await Promise.all([
        provider.enqueue('e', { x: 1 }),
        provider.dequeue('q', 1),
        provider.acknowledge('q', 'rh'),
        provider.sendToDlq('q', {}, 'r'),
        provider.healthCheck(),
      ]);
      for (const r of results) {
        expect(r).toBeInstanceOf(DataProcessResult);
      }
    });
  });
});
