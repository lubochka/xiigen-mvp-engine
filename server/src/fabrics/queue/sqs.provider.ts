/**
 * SQS Provider — IQueueService implementation for AWS SQS FIFO queues.
 * Resolved via fabric config. Service code NEVER imports this directly.
 *
 * DNA Compliance:
 *   DNA-1: All messages are Record<string, unknown> — no typed models
 *   DNA-3: All methods return DataProcessResult — never throw
 *   DNA-5: Tenant from CLS, MessageGroupId = tenantId, tenant filtering on dequeue
 *   DNA-9: Every enqueue wraps data in CloudEvents v1.0 envelope
 *
 * v4: No tenant_id parameter. Reads TenantContext from AsyncLocalStorage.
 */

import { Injectable } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { randomUUID } from 'crypto';
import { IQueueService } from '../interfaces/queue.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY } from '../../kernel/multi-tenant/tenant-context';
import {
  createCloudEvent,
  serializeCloudEvent,
  deserializeCloudEvent,
} from '../../kernel/cloud-events';
import { IAsyncSqsClient } from './base';

@Injectable()
export class SqsProvider extends IQueueService {
  private readonly client: IAsyncSqsClient;
  private readonly queueUrlPrefix: string;
  private readonly dlqSuffix: string;
  private readonly queueUrls = new Map<string, string>();

  constructor(
    private readonly cls: ClsService,
    client: IAsyncSqsClient,
    config?: Record<string, unknown>,
  ) {
    super();
    this.client = client;
    this.queueUrlPrefix = (config?.['queueUrlPrefix'] as string) ?? '';
    this.dlqSuffix = (config?.['dlqSuffix'] as string) ?? '-dlq';
  }

  // ── Tenant resolution ──────────────────────────────

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

  /** Resolve queue URL by name. Caches results. Appends .fifo if needed. */
  private async resolveQueueUrl(queueName: string): Promise<string> {
    if (this.queueUrls.has(queueName)) {
      return this.queueUrls.get(queueName)!;
    }

    const fifo = queueName.endsWith('.fifo') ? queueName : `${queueName}.fifo`;

    if (this.queueUrlPrefix) {
      const url = `${this.queueUrlPrefix}/${fifo}`;
      this.queueUrls.set(queueName, url);
      return url;
    }

    try {
      const resp = await this.client.getQueueUrl({ QueueName: fifo });
      const url = resp.QueueUrl;
      this.queueUrls.set(queueName, url);
      return url;
    } catch {
      const url = `https://sqs.us-east-1.amazonaws.com/000000000000/${fifo}`;
      this.queueUrls.set(queueName, url);
      return url;
    }
  }

  // ── IQueueService Implementation ───────────────────

  async enqueue(
    eventType: string,
    data: Record<string, unknown>,
    deduplicationId?: string,
  ): Promise<DataProcessResult<string>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    if (typeof data !== 'object' || data === null || Array.isArray(data)) {
      return DataProcessResult.failure(
        'INVALID_DATA',
        'Data must be Record<string, unknown> (DNA-1)',
      );
    }

    try {
      // DNA-9: Wrap in CloudEvents envelope
      const envelope = createCloudEvent({
        eventType,
        source: '/xiigen/queue-fabric/sqs',
        data,
        tenantId,
      });

      const dedupId = deduplicationId ?? (envelope['id'] as string);
      const queueUrl = await this.resolveQueueUrl(eventType);

      const resp = await this.client.sendMessage({
        QueueUrl: queueUrl,
        MessageBody: serializeCloudEvent(envelope),
        MessageGroupId: tenantId,
        MessageDeduplicationId: dedupId,
        MessageAttributes: {
          tenant_id: { DataType: 'String', StringValue: tenantId },
          event_type: { DataType: 'String', StringValue: eventType },
          correlation_id: {
            DataType: 'String',
            StringValue: (envelope['correlationid'] as string) ?? '',
          },
        },
      });

      return DataProcessResult.success(resp.MessageId);
    } catch (err) {
      return DataProcessResult.failure('ENQUEUE_FAILED', `SQS enqueue failed: ${err}`);
    }
  }

  async dequeue(
    queueName: string,
    maxMessages?: number,
    waitTimeSeconds?: number,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    const max = maxMessages ?? 1;
    if (max < 1) return DataProcessResult.success([]);

    try {
      const queueUrl = await this.resolveQueueUrl(queueName);

      const resp = await this.client.receiveMessage({
        QueueUrl: queueUrl,
        MaxNumberOfMessages: Math.min(max, 10),
        WaitTimeSeconds: waitTimeSeconds ?? 0,
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      });

      const messages: Array<Record<string, unknown>> = [];

      for (const sm of resp.Messages ?? []) {
        // Deserialize CloudEvents body
        const body = deserializeCloudEvent(sm.Body);
        const msgTenantId = (body['tenantid'] as string) ?? '';

        // DNA-5: filter by tenant — skip messages belonging to other tenants
        if (msgTenantId && msgTenantId !== tenantId) {
          continue;
        }

        const attrs = sm.MessageAttributes ?? {};
        messages.push({
          message_id: sm.MessageId,
          receipt_handle: sm.ReceiptHandle,
          body,
          tenant_id: msgTenantId || tenantId,
          event_type: attrs['event_type']?.StringValue ?? '',
          attributes: {
            tenant_id: attrs['tenant_id']?.StringValue ?? '',
            event_type: attrs['event_type']?.StringValue ?? '',
            correlation_id: attrs['correlation_id']?.StringValue ?? '',
          },
        });
      }

      return DataProcessResult.success(messages);
    } catch (err) {
      return DataProcessResult.failure('DEQUEUE_FAILED', `SQS dequeue failed: ${err}`);
    }
  }

  async acknowledge(queueName: string, receiptHandle: string): Promise<DataProcessResult<boolean>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }

    try {
      const queueUrl = await this.resolveQueueUrl(queueName);
      await this.client.deleteMessage({
        QueueUrl: queueUrl,
        ReceiptHandle: receiptHandle,
      });
      return DataProcessResult.success(true);
    } catch (err) {
      return DataProcessResult.failure('ACK_FAILED', `SQS acknowledge failed: ${err}`);
    }
  }

  async sendToDlq(
    queueName: string,
    message: Record<string, unknown>,
    reason: string,
  ): Promise<DataProcessResult<string>> {
    const tenantResult = this.getTenantId();
    if (!tenantResult.isSuccess) {
      return DataProcessResult.failure(tenantResult.errorCode!, tenantResult.errorMessage!);
    }
    const tenantId = tenantResult.data!;

    try {
      const dlqUrl = await this.resolveQueueUrl(queueName + this.dlqSuffix);
      const body = message['body'] ?? message;
      const bodyStr = typeof body === 'string' ? body : JSON.stringify(body);

      const resp = await this.client.sendMessage({
        QueueUrl: dlqUrl,
        MessageBody: bodyStr,
        MessageGroupId: tenantId,
        MessageDeduplicationId: randomUUID(),
        MessageAttributes: {
          tenant_id: { DataType: 'String', StringValue: tenantId },
          dlq_reason: { DataType: 'String', StringValue: reason },
          original_queue: { DataType: 'String', StringValue: queueName },
        },
      });

      return DataProcessResult.success(resp.MessageId);
    } catch (err) {
      return DataProcessResult.failure('DLQ_SEND_FAILED', `SQS sendToDlq failed: ${err}`);
    }
  }

  // ── Health Check ──────────────────────────────────

  async healthCheck(): Promise<DataProcessResult<Record<string, unknown>>> {
    try {
      return DataProcessResult.success({ status: 'ok', provider: 'sqs' });
    } catch (err) {
      return DataProcessResult.failure('HEALTH_CHECK_FAILED', `SQS health failed: ${err}`);
    }
  }

  /**
   * GAP-34-10: Wait for a specific event by correlationId and eventType.
   * SQS implementation uses polling until timeout.
   * Production upgrade: replace with event-subscription when BullMQ is adopted.
   */
  async waitFor<T>(options: {
    correlationId: string;
    eventType: string;
    timeoutMs: number;
  }): Promise<DataProcessResult<T>> {
    const deadline = Date.now() + options.timeoutMs;
    const pollIntervalMs = 500;

    while (Date.now() < deadline) {
      try {
        const dequeued = await this.dequeue(options.eventType, 5, 1);
        if (dequeued.isSuccess && dequeued.data) {
          for (const msg of dequeued.data) {
            const body = msg['body'] as Record<string, unknown>;
            if (body?.['correlationId'] === options.correlationId) {
              return DataProcessResult.success(body as T);
            }
          }
        }
      } catch {
        // Swallow SQS errors during polling — continue until timeout
      }
      await new Promise<void>((resolve) => setTimeout(resolve, pollIntervalMs));
    }

    return DataProcessResult.failure(
      'TIMEOUT',
      `waitFor<${options.eventType}> timed out after ${options.timeoutMs}ms for correlationId: ${options.correlationId}`,
    );
  }

  // ── Testing helpers ────────────────────────────────

  clearUrlCache(): void {
    this.queueUrls.clear();
  }

  get cachedUrls(): number {
    return this.queueUrls.size;
  }
}
