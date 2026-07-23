/**
 * Queue Fabric — all exports.
 * Interfaces come from ../interfaces. This barrel exports providers + infrastructure.
 */

// Base types
export { QueueProviderType, defaultQueueConfig } from './base';
export type {
  QueueProviderConfig,
  IAsyncSqsClient,
  SqsSendMessageResult,
  SqsReceiveMessageResult,
  SqsGetQueueUrlResult,
  SqsGetQueueAttributesResult,
  SqsCreateQueueResult,
} from './base';

// Provider Registry
export { QueueProviderRegistry } from './provider-registry';
export type { QueueProviderFactory } from './provider-registry';

// Fabric Resolver
export { QueueFabricResolver } from './fabric-resolver';
export type { QueueResolverConfig } from './fabric-resolver';

// InMemory Provider (P2.2)
export { InMemoryQueueProvider } from './in-memory.provider';

// SQS Provider (P3.4)
export { SqsProvider } from './sqs.provider';

// Queue Manager (P3.4)
export { QueueManager } from './queue-manager';

// DLQ Handler (P3.4)
export { DlqHandler } from './dlq-handler';

// Module (P3.5)
export { QueueModule } from './queue.module';
