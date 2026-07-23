/**
 * FlowEngineModule — NestJS module for the Flow Engine Fabric.
 *
 * Registers:
 *   - FlowFabricResolver (config-driven, resolves store+orchestrator pair)
 *   - InMemoryFlowStore + InMemoryFlowOrchestrator registered as factory in resolver
 *
 * Currently only InMemory provider. Future: ES-backed flow store.
 * The resolver is exported for use by the factory layer (P6).
 *
 * Phase 5.4: Full wiring. Does NOT break FabricsModule's Symbol token bindings.
 */

import { Module, Global } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { InMemoryFlowStore } from './in-memory-flow-store';
import { InMemoryFlowOrchestrator } from './in-memory-orchestrator';
import { FlowFabricResolver, FlowResolverConfig } from './fabric-resolver';

/** Default resolver config — uses InMemory. */
const DEFAULT_FLOW_RESOLVER_CONFIG: FlowResolverConfig = {
  defaultProvider: 'in_memory',
};

@Global()
@Module({
  providers: [
    // ── Fabric Resolver (with InMemory registered) ───
    {
      provide: FlowFabricResolver,
      useFactory: (cls: ClsService) => {
        const resolver = new FlowFabricResolver(DEFAULT_FLOW_RESOLVER_CONFIG);

        // Register InMemory flow engine factory (creates store + orchestrator pair)
        resolver.registerProvider('in_memory', async () => {
          const store = new InMemoryFlowStore(cls);
          const orchestrator = new InMemoryFlowOrchestrator(cls, store);
          return { store, orchestrator };
        });

        // Future: resolver.registerProvider('elasticsearch', async (config) => ...)

        return resolver;
      },
      inject: [ClsService],
    },
  ],
  exports: [FlowFabricResolver],
})
export class FlowEngineModule {}
