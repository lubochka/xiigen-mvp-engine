/**
 * P3.4 — QueueManager + DlqHandler Tests.
 *
 * QueueManager: create queues, create DLQ + bind redrive, URL caching.
 * DlqHandler: read messages, reprocess (send back + delete).
 */

import { QueueManager } from '../../src/fabrics/queue/queue-manager';
import { DlqHandler } from '../../src/fabrics/queue/dlq-handler';
import { IAsyncSqsClient } from '../../src/fabrics/queue/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Mock SQS Client ──────────────────────────────────

function createMockSqsClient(): jest.Mocked<IAsyncSqsClient> {
  return {
    sendMessage: jest.fn().mockResolvedValue({ MessageId: 'msg-001' }),
    receiveMessage: jest.fn().mockResolvedValue({ Messages: [] }),
    deleteMessage: jest.fn().mockResolvedValue({}),
    getQueueUrl: jest.fn().mockResolvedValue({ QueueUrl: 'https://sqs/q.fifo' }),
    getQueueAttributes: jest.fn().mockResolvedValue({
      Attributes: { QueueArn: 'arn:aws:sqs:us-east-1:000:q.fifo' },
    }),
    createQueue: jest.fn().mockImplementation(async (params) => ({
      QueueUrl: `https://sqs/${params.QueueName}`,
    })),
    setQueueAttributes: jest.fn().mockResolvedValue({}),
  };
}

// ── QueueManager Tests ───────────────────────────────

describe('QueueManager', () => {
  let client: jest.Mocked<IAsyncSqsClient>;
  let manager: QueueManager;

  beforeEach(() => {
    client = createMockSqsClient();
    manager = new QueueManager(client, { maxReceiveCount: 3, visibilityTimeout: 30 });
  });

  describe('ensureQueue', () => {
    it('should create a FIFO queue', async () => {
      const result = await manager.ensureQueue('orders');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toContain('orders.fifo');

      expect(client.createQueue).toHaveBeenCalledWith(
        expect.objectContaining({
          QueueName: 'orders.fifo',
          Attributes: expect.objectContaining({ FifoQueue: 'true' }),
        }),
      );
    });

    it('should not add .fifo if already present', async () => {
      await manager.ensureQueue('orders.fifo');
      expect(client.createQueue.mock.calls[0][0].QueueName).toBe('orders.fifo');
    });

    it('should return cached URL on second call (idempotent)', async () => {
      await manager.ensureQueue('orders');
      await manager.ensureQueue('orders');

      expect(client.createQueue).toHaveBeenCalledTimes(1);
      expect(manager.knownUrlCount).toBe(1);
    });

    it('should handle createQueue error (DNA-3)', async () => {
      client.createQueue.mockRejectedValue(new Error('Access denied'));

      const result = await manager.ensureQueue('orders');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('QUEUE_CREATE_FAILED');
    });

    it('should set visibility timeout from config', async () => {
      await manager.ensureQueue('events');

      const attrs = client.createQueue.mock.calls[0][0].Attributes!;
      expect(attrs['VisibilityTimeout']).toBe('30');
    });
  });

  describe('ensureDlq', () => {
    it('should create DLQ + main queue + bind redrive policy', async () => {
      const result = await manager.ensureDlq('orders');
      expect(result.isSuccess).toBe(true);
      expect(result.data!['mainUrl']).toContain('orders.fifo');
      expect(result.data!['dlqUrl']).toContain('orders-dlq.fifo');
      expect(result.data!['dlqArn']).toBeDefined();

      // Should have called createQueue twice (DLQ first, then main)
      expect(client.createQueue).toHaveBeenCalledTimes(2);

      // Should have set redrive policy
      expect(client.setQueueAttributes).toHaveBeenCalledWith(
        expect.objectContaining({
          Attributes: expect.objectContaining({
            RedrivePolicy: expect.stringContaining('maxReceiveCount'),
          }),
        }),
      );
    });

    it('should fail if DLQ creation fails', async () => {
      let callCount = 0;
      client.createQueue.mockImplementation(async () => {
        callCount++;
        if (callCount === 1) throw new Error('DLQ creation blocked');
        return { QueueUrl: 'https://sqs/q.fifo' };
      });

      const result = await manager.ensureDlq('orders');
      expect(result.isSuccess).toBe(false);
    });

    it('should include maxReceiveCount in redrive policy', async () => {
      await manager.ensureDlq('events');

      const redriveStr = client.setQueueAttributes.mock.calls[0][0].Attributes['RedrivePolicy'];
      const redrive = JSON.parse(redriveStr);
      expect(redrive['maxReceiveCount']).toBe('3');
    });
  });

  describe('getQueueUrl', () => {
    it('should return cached URL if known', async () => {
      await manager.ensureQueue('orders');
      const result = await manager.getQueueUrl('orders');

      expect(result.isSuccess).toBe(true);
      expect(client.getQueueUrl).not.toHaveBeenCalled(); // Used cache
    });

    it('should call SQS API if not cached', async () => {
      client.getQueueUrl.mockResolvedValue({ QueueUrl: 'https://sqs/new.fifo' });

      const result = await manager.getQueueUrl('new');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('https://sqs/new.fifo');
    });

    it('should handle queue not found (DNA-3)', async () => {
      client.getQueueUrl.mockRejectedValue(new Error('Queue does not exist'));

      const result = await manager.getQueueUrl('nonexistent');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('QUEUE_NOT_FOUND');
    });
  });

  describe('cache management', () => {
    it('clearCache should reset URL cache', async () => {
      await manager.ensureQueue('orders');
      expect(manager.knownUrlCount).toBe(1);

      manager.clearCache();
      expect(manager.knownUrlCount).toBe(0);
    });
  });
});

// ── DlqHandler Tests ─────────────────────────────────

describe('DlqHandler', () => {
  let client: jest.Mocked<IAsyncSqsClient>;
  let handler: DlqHandler;

  beforeEach(() => {
    client = createMockSqsClient();
    handler = new DlqHandler(client);
  });

  describe('readDlq', () => {
    it('should read messages from DLQ with metadata', async () => {
      client.receiveMessage.mockResolvedValue({
        Messages: [
          {
            MessageId: 'dlq-1',
            ReceiptHandle: 'rh-dlq-1',
            Body: '{"event":"failed"}',
            MessageAttributes: {
              dlq_reason: { DataType: 'String', StringValue: 'Max retries exceeded' },
              original_queue: { DataType: 'String', StringValue: 'orders' },
              tenant_id: { DataType: 'String', StringValue: 'tenant-abc' },
            },
          },
        ],
      });

      const result = await handler.readDlq('https://sqs/orders-dlq.fifo', 10);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(1);

      const msg = result.data![0];
      expect(msg['message_id']).toBe('dlq-1');
      expect(msg['dlq_reason']).toBe('Max retries exceeded');
      expect(msg['original_queue']).toBe('orders');
      expect(msg['tenant_id']).toBe('tenant-abc');
    });

    it('should return empty array when no messages', async () => {
      client.receiveMessage.mockResolvedValue({ Messages: [] });

      const result = await handler.readDlq('https://sqs/dlq.fifo');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('should default dlq_reason to unknown', async () => {
      client.receiveMessage.mockResolvedValue({
        Messages: [
          {
            MessageId: 'dlq-1',
            ReceiptHandle: 'rh-1',
            Body: '{}',
            MessageAttributes: {},
          },
        ],
      });

      const result = await handler.readDlq('https://sqs/dlq.fifo');
      expect(result.data![0]['dlq_reason']).toBe('unknown');
    });

    it('should cap at 10 messages per SQS API limits', async () => {
      client.receiveMessage.mockResolvedValue({ Messages: [] });

      await handler.readDlq('https://sqs/dlq.fifo', 50);

      expect(client.receiveMessage.mock.calls[0][0].MaxNumberOfMessages).toBe(10);
    });

    it('should handle SQS error (DNA-3)', async () => {
      client.receiveMessage.mockRejectedValue(new Error('Access denied'));

      const result = await handler.readDlq('https://sqs/dlq.fifo');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DLQ_READ_FAILED');
    });
  });

  describe('reprocess', () => {
    it('should send message back to main queue and delete from DLQ', async () => {
      client.sendMessage.mockResolvedValue({ MessageId: 'new-msg-1' });

      const result = await handler.reprocess(
        'https://sqs/dlq.fifo',
        'https://sqs/main.fifo',
        'rh-dlq-1',
        '{"event":"retry"}',
        'tenant-abc',
      );

      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('new-msg-1');

      // Verify send to main queue
      expect(client.sendMessage).toHaveBeenCalledWith(
        expect.objectContaining({
          QueueUrl: 'https://sqs/main.fifo',
          MessageBody: '{"event":"retry"}',
          MessageGroupId: 'tenant-abc',
          MessageAttributes: expect.objectContaining({
            reprocessed: { DataType: 'String', StringValue: 'true' },
            tenant_id: { DataType: 'String', StringValue: 'tenant-abc' },
          }),
        }),
      );

      // Verify delete from DLQ
      expect(client.deleteMessage).toHaveBeenCalledWith({
        QueueUrl: 'https://sqs/dlq.fifo',
        ReceiptHandle: 'rh-dlq-1',
      });
    });

    it('should handle send failure (DNA-3)', async () => {
      client.sendMessage.mockRejectedValue(new Error('Queue full'));

      const result = await handler.reprocess(
        'https://sqs/dlq.fifo',
        'https://sqs/main.fifo',
        'rh-1',
        '{}',
        'tenant',
      );
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('REPROCESS_FAILED');
    });

    it('should handle delete failure after successful send', async () => {
      client.sendMessage.mockResolvedValue({ MessageId: 'ok' });
      client.deleteMessage.mockRejectedValue(new Error('Invalid handle'));

      const result = await handler.reprocess(
        'https://sqs/dlq.fifo',
        'https://sqs/main.fifo',
        'bad-rh',
        '{}',
        'tenant',
      );
      // Overall failure because the try/catch wraps both operations
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('REPROCESS_FAILED');
    });
  });
});
