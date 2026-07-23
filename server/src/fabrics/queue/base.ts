/**
 * Queue Fabric — base types, enums, and protocol interfaces.
 *
 * Protocol interface matches the AWS SQS SDK shape so providers
 * can be tested with mock objects without importing @aws-sdk/client-sqs.
 *
 * Phase 3.1: Types only. SQS concrete provider in P3.4.
 */

// ── Provider Type Enum ───────────────────────────────

export enum QueueProviderType {
  IN_MEMORY = 'in_memory',
  SQS = 'sqs',
}

// ── Provider Config ──────────────────────────────────

export interface QueueProviderConfig {
  readonly providerType: QueueProviderType;
  readonly region: string;
  readonly endpointUrl: string;
  readonly accessKey: string;
  readonly secretKey: string;
  readonly fifo: boolean;
  readonly maxReceiveCount: number;
  readonly visibilityTimeoutSeconds: number;
  readonly waitTimeSeconds: number;
  readonly options: Record<string, unknown>;
}

/** Sensible defaults for config. */
export function defaultQueueConfig(overrides?: Partial<QueueProviderConfig>): QueueProviderConfig {
  return {
    providerType: QueueProviderType.IN_MEMORY,
    region: 'us-east-1',
    endpointUrl: '',
    accessKey: '',
    secretKey: '',
    fifo: true,
    maxReceiveCount: 3,
    visibilityTimeoutSeconds: 30,
    waitTimeSeconds: 20,
    options: {},
    ...overrides,
  };
}

// ── SQS Protocol Interface ───────────────────────────
// Matches the @aws-sdk/client-sqs API surface we use.
// Tests inject mock objects implementing this interface.

export interface SqsSendMessageResult {
  MessageId: string;
  SequenceNumber?: string;
}

export interface SqsReceiveMessageResult {
  Messages?: Array<{
    MessageId: string;
    ReceiptHandle: string;
    Body: string;
    Attributes?: Record<string, string>;
    MessageAttributes?: Record<string, { DataType: string; StringValue?: string }>;
  }>;
}

export interface SqsGetQueueUrlResult {
  QueueUrl: string;
}

export interface SqsGetQueueAttributesResult {
  Attributes?: Record<string, string>;
}

export interface SqsCreateQueueResult {
  QueueUrl: string;
}

export interface IAsyncSqsClient {
  sendMessage(params: {
    QueueUrl: string;
    MessageBody: string;
    MessageGroupId?: string;
    MessageDeduplicationId?: string;
    MessageAttributes?: Record<string, { DataType: string; StringValue: string }>;
  }): Promise<SqsSendMessageResult>;

  receiveMessage(params: {
    QueueUrl: string;
    MaxNumberOfMessages?: number;
    WaitTimeSeconds?: number;
    MessageAttributeNames?: string[];
    AttributeNames?: string[];
  }): Promise<SqsReceiveMessageResult>;

  deleteMessage(params: {
    QueueUrl: string;
    ReceiptHandle: string;
  }): Promise<Record<string, unknown>>;

  getQueueUrl(params: { QueueName: string }): Promise<SqsGetQueueUrlResult>;

  getQueueAttributes(params: {
    QueueUrl: string;
    AttributeNames?: string[];
  }): Promise<SqsGetQueueAttributesResult>;

  createQueue(params: {
    QueueName: string;
    Attributes?: Record<string, string>;
  }): Promise<SqsCreateQueueResult>;

  setQueueAttributes(params: {
    QueueUrl: string;
    Attributes: Record<string, string>;
  }): Promise<Record<string, unknown>>;
}
