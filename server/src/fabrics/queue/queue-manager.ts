/**
 * Queue Manager — creates FIFO queues, binds DLQ redrive policies, discovers URLs.
 *
 * Used by infrastructure setup / bootstrap, NOT by service code directly.
 * Service code talks through IQueueService (fabric interface).
 *
 * DNA-3: All methods return DataProcessResult.
 */

import { Injectable } from '@nestjs/common';
import { DataProcessResult } from '../../kernel/data-process-result';
import { IAsyncSqsClient } from './base';

@Injectable()
export class QueueManager {
  private readonly client: IAsyncSqsClient;
  private readonly maxReceiveCount: number;
  private readonly visibilityTimeout: number;
  private readonly knownUrls = new Map<string, string>();

  constructor(client: IAsyncSqsClient, config?: Record<string, unknown>) {
    this.client = client;
    this.maxReceiveCount = (config?.['maxReceiveCount'] as number) ?? 3;
    this.visibilityTimeout = (config?.['visibilityTimeout'] as number) ?? 30;
  }

  /**
   * Ensure a FIFO queue exists. Idempotent — returns cached URL if known.
   */
  async ensureQueue(queueName: string): Promise<DataProcessResult<string>> {
    const fifo = queueName.endsWith('.fifo') ? queueName : `${queueName}.fifo`;

    if (this.knownUrls.has(fifo)) {
      return DataProcessResult.success(this.knownUrls.get(fifo)!);
    }

    try {
      const resp = await this.client.createQueue({
        QueueName: fifo,
        Attributes: {
          FifoQueue: 'true',
          ContentBasedDeduplication: 'false',
          VisibilityTimeout: String(this.visibilityTimeout),
        },
      });

      const url = resp.QueueUrl;
      this.knownUrls.set(fifo, url);
      return DataProcessResult.success(url);
    } catch (err) {
      return DataProcessResult.failure(
        'QUEUE_CREATE_FAILED',
        `Failed to create queue '${fifo}': ${err}`,
      );
    }
  }

  /**
   * Ensure a queue + its DLQ exist, bind redrive policy.
   * Returns { mainUrl, dlqUrl, dlqArn }.
   */
  async ensureDlq(queueName: string): Promise<DataProcessResult<Record<string, string>>> {
    try {
      // Create DLQ first
      const dlqName = `${queueName}-dlq`;
      const dlqResult = await this.ensureQueue(dlqName);
      if (!dlqResult.isSuccess) {
        return DataProcessResult.failure('DLQ_CREATE_FAILED', dlqResult.errorMessage ?? '');
      }
      const dlqUrl = dlqResult.data!;
      const dlqArn = await this.getQueueArn(dlqUrl);

      // Create main queue
      const mainResult = await this.ensureQueue(queueName);
      if (!mainResult.isSuccess) {
        return DataProcessResult.failure('MAIN_QUEUE_FAILED', mainResult.errorMessage ?? '');
      }
      const mainUrl = mainResult.data!;

      // Bind redrive policy
      const redrivePolicy = JSON.stringify({
        deadLetterTargetArn: dlqArn,
        maxReceiveCount: String(this.maxReceiveCount),
      });

      await this.client.setQueueAttributes({
        QueueUrl: mainUrl,
        Attributes: { RedrivePolicy: redrivePolicy },
      });

      return DataProcessResult.success({
        mainUrl,
        dlqUrl,
        dlqArn,
      });
    } catch (err) {
      return DataProcessResult.failure('DLQ_BIND_FAILED', `Failed to bind DLQ: ${err}`);
    }
  }

  /**
   * Get queue URL by name. Checks cache first, then calls SQS API.
   */
  async getQueueUrl(queueName: string): Promise<DataProcessResult<string>> {
    const fifo = queueName.endsWith('.fifo') ? queueName : `${queueName}.fifo`;

    if (this.knownUrls.has(fifo)) {
      return DataProcessResult.success(this.knownUrls.get(fifo)!);
    }

    try {
      const resp = await this.client.getQueueUrl({ QueueName: fifo });
      const url = resp.QueueUrl;
      this.knownUrls.set(fifo, url);
      return DataProcessResult.success(url);
    } catch (err) {
      return DataProcessResult.failure('QUEUE_NOT_FOUND', `Queue '${fifo}' not found: ${err}`);
    }
  }

  /**
   * Get queue ARN from URL (for redrive policy).
   */
  private async getQueueArn(queueUrl: string): Promise<string> {
    try {
      const resp = await this.client.getQueueAttributes({
        QueueUrl: queueUrl,
        AttributeNames: ['QueueArn'],
      });
      return resp.Attributes?.['QueueArn'] ?? this.arnFromUrl(queueUrl);
    } catch {
      return this.arnFromUrl(queueUrl);
    }
  }

  /** Construct ARN from URL as fallback. */
  private arnFromUrl(queueUrl: string): string {
    const parts = queueUrl.split('/');
    return `arn:aws:sqs:us-east-1:000000000000:${parts[parts.length - 1]}`;
  }

  // ── Testing helpers ────────────────────────────────

  get knownUrlCount(): number {
    return this.knownUrls.size;
  }

  clearCache(): void {
    this.knownUrls.clear();
  }
}
