/**
 * DLQ Handler — monitors and reprocesses dead-lettered messages.
 *
 * Used by admin/ops tooling. Reads messages from a DLQ,
 * extracts metadata (reason, original queue, tenant), and
 * can reprocess them back to the main queue.
 *
 * DNA-3: All methods return DataProcessResult.
 */

import { Injectable } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IAsyncSqsClient } from './base';

@Injectable()
export class DlqHandler {
  private readonly client: IAsyncSqsClient;

  constructor(client: IAsyncSqsClient, _config?: Record<string, unknown>) {
    this.client = client;
  }

  /**
   * Read messages from a DLQ.
   * Returns parsed messages with metadata: reason, original queue, tenant.
   */
  async readDlq(
    dlqUrl: string,
    maxMessages = 10,
  ): Promise<DataProcessResult<Array<Record<string, unknown>>>> {
    try {
      const resp = await this.client.receiveMessage({
        QueueUrl: dlqUrl,
        MaxNumberOfMessages: Math.min(maxMessages, 10),
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      });

      const messages: Array<Record<string, unknown>> = [];
      for (const sm of resp.Messages ?? []) {
        const attrs = sm.MessageAttributes ?? {};
        messages.push({
          message_id: sm.MessageId,
          receipt_handle: sm.ReceiptHandle,
          body: sm.Body,
          dlq_reason: attrs['dlq_reason']?.StringValue ?? 'unknown',
          original_queue: attrs['original_queue']?.StringValue ?? '',
          tenant_id: attrs['tenant_id']?.StringValue ?? '',
        });
      }

      return DataProcessResult.success(messages);
    } catch (err) {
      return DataProcessResult.failure('DLQ_READ_FAILED', `Failed to read DLQ: ${err}`);
    }
  }

  /**
   * Reprocess a message: send it back to the main queue, then delete from DLQ.
   * Returns the new message ID.
   */
  async reprocess(
    dlqUrl: string,
    mainQueueUrl: string,
    receiptHandle: string,
    body: string,
    tenantId: string,
  ): Promise<DataProcessResult<string>> {
    try {
      const resp = await this.client.sendMessage({
        QueueUrl: mainQueueUrl,
        MessageBody: body,
        MessageGroupId: tenantId,
        MessageDeduplicationId: randomUUID(),
        MessageAttributes: {
          tenant_id: { DataType: 'String', StringValue: tenantId },
          reprocessed: { DataType: 'String', StringValue: 'true' },
        },
      });

      // Delete from DLQ after successful reprocess
      await this.client.deleteMessage({
        QueueUrl: dlqUrl,
        ReceiptHandle: receiptHandle,
      });

      return DataProcessResult.success(resp.MessageId);
    } catch (err) {
      return DataProcessResult.failure('REPROCESS_FAILED', `Failed to reprocess: ${err}`);
    }
  }
}
