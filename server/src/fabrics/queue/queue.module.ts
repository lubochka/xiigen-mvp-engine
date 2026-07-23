/**
 * QueueModule — NestJS module for the Queue Fabric.
 *
 * Registers:
 *   - QueueProviderRegistry (with all 2 providers: InMemory, SQS)
 *   - QueueFabricResolver (config-driven routing)
 *   - QueueManager + DlqHandler (infrastructure helpers)
 *
 * Default: InMemory provider. Config switches to SQS.
 *
 * Phase 3.5: Full wiring. Does NOT break FabricsModule's Symbol token bindings.
 */

import { Module, Global } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { InMemoryQueueProvider } from './in-memory.provider';
import { SqsProvider } from './sqs.provider';
import { QueueProviderRegistry } from './provider-registry';
import { QueueFabricResolver, QueueResolverConfig } from './fabric-resolver';
import { QueueProviderType, IAsyncSqsClient } from './base';

/** Default resolver config — uses InMemory, no overrides. */
const DEFAULT_QUEUE_RESOLVER_CONFIG: QueueResolverConfig = {
  defaultProvider: QueueProviderType.IN_MEMORY,
};

@Global()
@Module({
  providers: [
    // ── Provider Registry (knows all available providers) ──
    {
      provide: QueueProviderRegistry,
      useFactory: (cls: ClsService) => {
        const registry = new QueueProviderRegistry();

        // Register InMemory provider factory
        registry.register(QueueProviderType.IN_MEMORY, async () => new InMemoryQueueProvider(cls), {
          description: 'InMemory queue for dev/test',
        });

        // Register SQS provider factory
        registry.register(
          QueueProviderType.SQS,
          async (config) => {
            const client = config['client'] as IAsyncSqsClient | undefined;
            if (!client) {
              throw new Error(
                'SqsProvider requires "client" in config. ' +
                  'Set QUEUE_PROVIDER=in_memory for dev or provide a real SQS client.',
              );
            }
            return new SqsProvider(cls, client, config);
          },
          { description: 'AWS SQS FIFO provider' },
        );

        return registry;
      },
      inject: [ClsService],
    },

    // ── Fabric Resolver (config → provider routing) ──
    {
      provide: QueueFabricResolver,
      useFactory: (registry: QueueProviderRegistry) => {
        // TODO: Read config from environment/config service in P7
        return new QueueFabricResolver(DEFAULT_QUEUE_RESOLVER_CONFIG, registry);
      },
      inject: [QueueProviderRegistry],
    },
  ],
  exports: [QueueProviderRegistry, QueueFabricResolver],
})
export class QueueModule {}
