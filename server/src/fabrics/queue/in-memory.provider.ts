/**
 * InMemory Queue Provider — for testing and local development.
 * Implements IQueueService with in-memory arrays.
 *
 * DNA compliance:
 * - DNA-1: All messages are Record<string, unknown>
 * - DNA-3: All methods return DataProcessResult
 * - DNA-5: Tenant from CLS, scoped queues
 * - DNA-9: Every enqueue wraps data in CloudEvents envelope
 *
 * Features: FIFO per tenant, deduplication, receipt handles, DLQ after max receives.
 * v4: No tenant_id parameter.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IQueueService } from '../interfaces/queue.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import { createCloudEvent } from '../../kernel/cloud-events';

interface QueueMessage {
  messageId: string;
  body: Record<string, unknown>;
  tenantId: string;
  eventType: string;
  deduplicationId: string;
  attributes: Record<string, string>;
}

@Injectable()
export class InMemoryQueueProvider extends IQueueService {
  private readonly queues = new Map<string, QueueMessage[]>();
  private readonly dlq = new Map<string, QueueMessage[]>();
  private readonly inFlight = new Map<string, { queueName: string; message: QueueMessage }>();
  private readonly dedupSeen = new Set<string>();
  private readonly receiveCounts = new Map<string, number>();
  private maxReceiveCount = 3;

  constructor(private readonly cls: ClsService) {
    super();
  }

  private getTenantId(): DataProcessResult<string> {
    try {
      const tenant = this.cls.get<TenantContext>(TENANT_CONTEXT_KEY);
      if (!tenant) {
        return DataProcessResult.failure('NO_TENANT', 'TenantContext not found in CLS');
      }
      return DataProcessResult.success(tenant.tenantId);
    } catch {
      return DataProcessResult.failure('NO_TENANT', 'CLS not available');
    }
  }

  private resolveQueueName(tenantId: string, name: string): string {
    return name.startsWith(`${tenantId}_`) ? name : `${tenantId}_${name}`;
  }

  private getQueue(name: string): QueueMessage[] {
    if (!this.queues.has(name)) {
      this.queues.set(name, []);
    }
    return this.queues.get(name)!;
  }

  private getDlqQueue(name: string): QueueMessage[] {
    if (!this.dlq.has(name)) {
      this.dlq.set(name, []);
    }
    return this.dlq.get(name)!;
  }

  async enqueue(
    eventType: string,
    data: Record<string, unknown>,
    deduplicationId?: string,
  ): Promise<DataProcessResult<string>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return DataProcessResult.failure(
        'INVALID_DATA',
        'Data must be Record<string, unknown> (DNA-1)',
      );
    }

    const dedupId = deduplicationId ?? randomUUID();
    if (this.dedupSeen.has(dedupId)) {
      return DataProcessResult.failure(
        'DUPLICATE_MESSAGE',
        `Message with deduplication_id '${dedupId}' already sent`,
      );
    }
    this.dedupSeen.add(dedupId);

    // DNA-9: Wrap in CloudEvents envelope
    const envelope = createCloudEvent({
      eventType,
      source: '/xiigen/queue-fabric/in-memory',
      data,
      tenantId,
    });
    const messageId = envelope['id'] as string;

    const queueMessage: QueueMessage = {
      messageId,
      body: envelope,
      tenantId,
      eventType,
      deduplicationId: dedupId,
      attributes: {
        tenant_id: tenantId,
        event_type: eventType,
        correlation_id: (envelope['correlationid'] as string) ?? '',
      },
    };

    const queueName = this.resolveQueueName(tenantId, eventType);
    this.getQueue(queueName).push(queueMessage);
    return DataProcessResult.success(messageId);
  }

  async dequeue(
    queueName: string,
    maxMessages = 1,
    _waitTimeSeconds = 0,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    if (maxMessages < 1) return DataProcessResult.success([]);

    const fullQueueName = this.resolveQueueName(tenantId, queueName);
    const queue = this.getQueue(fullQueueName);
    const messages: Array<Record<string, unknown>> = [];

    let processed = 0;
    while (processed < maxMessages && queue.length > 0) {
      const msg = queue.shift()!;

      // Tenant isolation check
      if (msg.tenantId !== tenantId) {
        queue.push(msg); // put it back
        break;
      }

      // Track receive count → DLQ if exceeded
      const count = (this.receiveCounts.get(msg.messageId) ?? 0) + 1;
      this.receiveCounts.set(msg.messageId, count);

      if (count > this.maxReceiveCount) {
        const dlqName = `${fullQueueName}-dlq`;
        this.getDlqQueue(dlqName).push({
          ...msg,
          attributes: {
            ...msg.attributes,
            dlq_reason: `Exceeded maxReceiveCount (${this.maxReceiveCount})`,
          },
        });
        continue;
      }

      const receiptHandle = `rh-${randomUUID().replace(/-/g, '').slice(0, 16)}`;
      this.inFlight.set(receiptHandle, { queueName: fullQueueName, message: msg });

      messages.push({
        message_id: msg.messageId,
        receipt_handle: receiptHandle,
        body: msg.body,
        attributes: msg.attributes,
        tenant_id: msg.tenantId,
        event_type: msg.eventType,
      });
      processed++;
    }

    return DataProcessResult.success(messages);
  }

  async acknowledge(queueName: string, receiptHandle: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const flight = this.inFlight.get(receiptHandle);
    if (!flight) {
      return DataProcessResult.success(true); // idempotent
    }

    if (flight.message.tenantId !== tenantId) {
      return DataProcessResult.failure(
        'SCOPE_VIOLATION',
        'Cannot ack message from different tenant',
      );
    }

    this.inFlight.delete(receiptHandle);
    this.receiveCounts.delete(flight.message.messageId);
    return DataProcessResult.success(true);
  }

  async sendToDlq(
    queueName: string,
    message: Record<string, unknown>,
    reason: string,
  ): Promise<DataProcessResult<string>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess)
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    const tenantId = tenantResult.data!;

    const fullQueueName = this.resolveQueueName(tenantId, queueName);
    const dlqName = `${fullQueueName}-dlq`;
    const messageId = (message['message_id'] as string) ?? randomUUID();

    const dlqMessage: QueueMessage = {
      messageId,
      body: (message['body'] as Record<string, unknown>) ?? message,
      tenantId,
      eventType: (message['event_type'] as string) ?? 'unknown',
      deduplicationId: randomUUID(),
      attributes: {
        tenant_id: tenantId,
        dlq_reason: reason,
        original_queue: fullQueueName,
      },
    };

    this.getDlqQueue(dlqName).push(dlqMessage);
    return DataProcessResult.success(messageId);
  }

  /**
   * GAP-34-10: Wait for a specific event by correlationId and eventType.
   * InMemory implementation polls queues until timeout (test/dev only).
   */
  async waitFor<T>(options: {
    correlationId: string;
    eventType: string;
    timeoutMs: number;
  }): Promise<DataProcessResult<T>> {
    const deadline = Date.now() + options.timeoutMs;
    const pollIntervalMs = 50;

    while (Date.now() < deadline) {
      for (const [, messages] of this.queues.entries()) {
        for (const msg of messages) {
          if (
            msg.eventType === options.eventType &&
            (msg.body['correlationId'] === options.correlationId ||
              msg.attributes['correlation_id'] === options.correlationId)
          ) {
            return DataProcessResult.success(msg.body as T);
          }
        }
      }
      await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return DataProcessResult.failure(
      'TIMEOUT',
      `waitFor<${options.eventType}> timed out after ${options.timeoutMs}ms for correlationId: ${options.correlationId}`,
    );
  }

  // ── Testing helpers ─────────────────────────────────

  /** Get DLQ messages for a tenant+queue. */
  getDlqMessages(tenantId: string, queueName: string): QueueMessage[] {
    const fullName = this.resolveQueueName(tenantId, queueName);
    return [...(this.dlq.get(`${fullName}-dlq`) ?? [])];
  }

  /** Get queue depth for a tenant+queue. */
  getQueueDepth(tenantId: string, queueName: string): number {
    const fullName = this.resolveQueueName(tenantId, queueName);
    return this.getQueue(fullName).length;
  }

  /** Clear dedup cache. */
  clearDedupCache(): void {
    this.dedupSeen.clear();
  }

  /** Set max receive count before DLQ. */
  setMaxReceiveCount(count: number): void {
    this.maxReceiveCount = count;
  }

  /** Clear everything. */
  clear(): void {
    this.queues.clear();
    this.dlq.clear();
    this.inFlight.clear();
    this.dedupSeen.clear();
    this.receiveCounts.clear();
  }
}
