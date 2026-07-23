/**
 * RagModule — NestJS module for the RAG Fabric.
 *
 * Registers:
 *   - RagFabricResolver (config-driven strategy/provider routing)
 *   - InMemoryRagProvider registered as factory in resolver
 *   - LightRagProvider registered when LIGHTRAG_URL env var is set (A-3a)
 *
 * Provider selection:
 *   XIIGEN_RAG_PROVIDER=in_memory (default) → keyword matching via InMemoryRagProvider
 *   XIIGEN_RAG_PROVIDER=lightrag OR LIGHTRAG_URL set → semantic graph search via LightRAG
 *
 * The resolver is exported for use by the factory layer (P6).
 *
 * Phase 5.4: Full wiring. Does NOT break FabricsModule's Symbol token bindings.
 * A-3a: LightRagProvider registered conditionally behind LIGHTRAG_URL env gate.
 */

import { Module, Global } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';

import { InMemoryRagProvider } from './in-memory.provider';
import { LightRagProvider } from './lightrag.provider';
import { RagFabricResolver, RagResolverConfig } from './fabric-resolver';
import { RagStrategy } from './base';

/** Default resolver config — uses InMemory, VECTOR strategy. */
const DEFAULT_RAG_RESOLVER_CONFIG: RagResolverConfig = {
  defaultProvider: 'in_memory',
  strategy: RagStrategy.VECTOR,
};

@Global()
@Module({
  providers: [
    // ── Fabric Resolver (with InMemory + optional LightRAG registered) ───
    {
      provide: RagFabricResolver,
      useFactory: (cls: ClsService) => {
        const resolver = new RagFabricResolver(DEFAULT_RAG_RESOLVER_CONFIG);

        // InMemory: always registered as fallback (keyword matching)
        resolver.registerProvider('in_memory', async () => new InMemoryRagProvider(cls));

        // A-3a: LightRAG registered when LIGHTRAG_URL env var is set.
        // FREEDOM config key: xiigen.rag_provider ('in_memory' | 'lightrag')
        // Default: 'in_memory' — preserves current behavior when LightRAG not running.
        const ragProvider = process.env['XIIGEN_RAG_PROVIDER'] ?? 'in_memory';
        if (ragProvider === 'lightrag' || process.env['LIGHTRAG_URL']) {
          resolver.registerProvider('lightrag', async () => new LightRagProvider(cls));
          // Update default provider to lightrag when configured
          // Private field access intentional — config-driven default override
          (resolver as unknown as { config: RagResolverConfig })['config'].defaultProvider =
            'lightrag';
        }

        return resolver;
      },
      inject: [ClsService],
    },
  ],
  exports: [RagFabricResolver],
})
export class RagModule {}
