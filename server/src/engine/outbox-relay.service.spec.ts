/**
 * OutboxRelayService — unit tests.
 * S10: Outbox relay with idempotency deduplication.
 */
import { OutboxRelayService } from './outbox-relay.service';
import { DataProcessResult } from '../kernel/data-process-result';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

const mockQueue = {
  enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-id')),
  dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-id')),
};

const makeMsg = (overrides?: Partial<Record<string, unknown>>) => ({
  messageId: 'flow.created::k1',
  eventType: 'flow.created',
  payload: { flowId: 'FLOW-01' },
  idempotencyKey: 'k1',
  status: 'PENDING',
  retryCount: 0,
  createdAt: '2024-01-01T00:00:00Z',
  updatedAt: '2024-01-01T00:00:00Z',
  ...overrides,
});

describe('OutboxRelayService', () => {
  let svc: OutboxRelayService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new OutboxRelayService(mockDb as any, mockQueue as any);
  });

  // ─── writeOutboxMessage ──────────────────────────────────────────────────

  describe('writeOutboxMessage', () => {
    it('returns failure for missing eventType or idempotencyKey', async () => {
      const result = await svc.writeOutboxMessage('', { flowId: 'F1' }, '');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PARAMS');
    });

    it('stores message as PENDING in xiigen-outbox', async () => {
      const result = await svc.writeOutboxMessage('flow.created', { flowId: 'F1' }, 'key-1');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.status).toBe('PENDING');
      expect(result.data?.idempotencyKey).toBe('key-1');
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-outbox',
        expect.objectContaining({ status: 'PENDING', idempotencyKey: 'key-1' }),
        'flow.created::key-1',
      );
    });

    it('returns failure when db write fails', async () => {
      mockDb.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'write failed'),
      );
      const result = await svc.writeOutboxMessage('evt', {}, 'k1');
      expect(result.isSuccess).toBe(false);
    });
  });

  // ─── relayPendingMessages ────────────────────────────────────────────────

  describe('relayPendingMessages', () => {
    it('returns failure when outbox read fails', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'read failed'),
      );
      const result = await svc.relayPendingMessages();
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('OUTBOX_READ_FAILED');
    });

    it('returns zero counts when no pending messages', async () => {
      const result = await svc.relayPendingMessages();
      expect(result.isSuccess).toBe(true);
      expect(result.data?.processed).toBe(0);
      expect(result.data?.published).toBe(0);
    });

    it('publishes pending messages and marks them PUBLISHED', async () => {
      const msg = makeMsg();
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([msg]));
      // idempotency check: not found
      mockDb.getDocument.mockResolvedValueOnce(DataProcessResult.failure('NOT_FOUND', 'not found'));

      const result = await svc.relayPendingMessages();
      expect(result.isSuccess).toBe(true);
      expect(result.data?.published).toBe(1);
      expect(result.data?.deduplicated).toBe(0);
      expect(mockQueue.enqueue).toHaveBeenCalledWith('flow.created', { flowId: 'FLOW-01' }, 'k1');
    });

    it('deduplicates messages already in idempotency store (DNA-7)', async () => {
      const msg = makeMsg();
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([msg]));
      // idempotency check: already exists
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({ key: 'k1', publishedAt: '2024-01-01' }),
      );

      const result = await svc.relayPendingMessages();
      expect(result.isSuccess).toBe(true);
      expect(result.data?.deduplicated).toBe(1);
      expect(result.data?.published).toBe(0);
      expect(mockQueue.enqueue).not.toHaveBeenCalled();
    });

    it('stores idempotency key BEFORE marking published (DNA-8)', async () => {
      const msg = makeMsg();
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([msg]));
      mockDb.getDocument.mockResolvedValueOnce(DataProcessResult.failure('NOT_FOUND', 'not found'));

      const writeOrder: string[] = [];
      mockDb.storeDocument.mockImplementation((index: string) => {
        writeOrder.push(index);
        return Promise.resolve(DataProcessResult.success({}));
      });

      await svc.relayPendingMessages();
      expect(writeOrder[0]).toBe('xiigen-outbox-idempotency');
      expect(writeOrder[1]).toBe('xiigen-outbox');
    });

    it('marks message as failed and increments retryCount on enqueue error', async () => {
      const msg = makeMsg();
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([msg]));
      mockDb.getDocument.mockResolvedValueOnce(DataProcessResult.failure('NOT_FOUND', 'not found'));
      mockQueue.enqueue.mockResolvedValueOnce(
        DataProcessResult.failure('QUEUE_ERROR', 'queue down'),
      );

      const result = await svc.relayPendingMessages();
      expect(result.data?.failed).toBe(1);
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-outbox',
        expect.objectContaining({ retryCount: 1 }),
        msg.messageId,
      );
    });

    it('marks message as FAILED after MAX_RETRIES exhausted', async () => {
      const msg = makeMsg({ retryCount: 2 });
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([msg]));
      mockDb.getDocument.mockResolvedValueOnce(DataProcessResult.failure('NOT_FOUND', 'not found'));
      mockQueue.enqueue.mockResolvedValueOnce(
        DataProcessResult.failure('QUEUE_ERROR', 'queue down'),
      );

      await svc.relayPendingMessages();
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-outbox',
        expect.objectContaining({ status: 'FAILED' }),
        msg.messageId,
      );
    });
  });
});
