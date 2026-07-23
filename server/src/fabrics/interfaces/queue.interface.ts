/**
 * FABRIC 2: IQueueService (Skill 04)
 *
 * Queue Fabric — Redis Streams / SQS with consumer groups.
 * Pattern: Main → Consumed → Archive → DLQ.
 * Every inter-service call = event through queue. Never direct HTTP.
 * All messages use CloudEvents envelope (DNA-9).
 *
 * v4: No tenant_id parameter. Read from CLS internally.
 */

import { DataProcessResult } from '../../kernel/data-process-result';

export abstract class IQueueService {
  /** Enqueue a message. Returns message ID. */
  abstract enqueue(
    eventType: string,
    data: Record<string, unknown>,
    deduplicationId?: string,
  ): Promise<DataProcessResult<string>>;

  /** Dequeue messages. Returns list of messages with receipt handles. */
  abstract dequeue(
    queueName: string,
    maxMessages?: number,
    waitTimeSeconds?: number,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>>;

  /** Acknowledge (delete) a processed message. */
  abstract acknowledge(
    queueName: string,
    receiptHandle: string,
  ): Promise<DataProcessResult<boolean>>;

  /** Send a message to Dead Letter Queue. */
  abstract sendToDlq(
    queueName: string,
    message: Record<string, unknown>,
    reason: string,
  ): Promise<DataProcessResult<string>>;

  /**
   * Wait for a specific event by correlationId and eventType.
   * Resolves when the matching event is received or when timeoutMs elapses.
   * Returns DataProcessResult.failure('TIMEOUT') if no event received within timeoutMs.
   *
   * GAP-34-10: Used by FLOW-34 adapter pipeline to await generation completion.
   */
  abstract waitFor<T>(options: {
    correlationId: string;
    eventType: string;
    timeoutMs: number;
  }): Promise<DataProcessResult<T>>;
}

/** Injection token for IQueueService. */
export const QUEUE_SERVICE = Symbol('IQueueService');
