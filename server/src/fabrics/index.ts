/**
 * Fabrics — LAYER 0 of XIIGen engine.
 * All interfaces + providers + infrastructure + module.
 *
 * Phase 2.5: Complete InMemory wiring.
 * Phase 3.1: Base types, registries, resolvers for DB + Queue.
 */

// All interfaces and injection tokens
export * from './interfaces';

// Database fabric (base + registry + resolver + InMemory provider)
export * from './database';

// Queue fabric (base + registry + resolver + InMemory provider)
export * from './queue';

// AI Engine fabric (base + protocols + registry + resolver + Mock provider)
export * from './ai-engine';

// RAG fabric (InMemory provider)
export { InMemoryRagProvider } from './rag/in-memory.provider';

// Flow Engine fabric (InMemory store + orchestrator)
export { InMemoryFlowStore } from './flow-engine/in-memory-flow-store';
export { InMemoryFlowOrchestrator, FlowStatus } from './flow-engine/in-memory-orchestrator';

// Secrets fabric (InMemory provider)
export { InMemorySecretsProvider } from './secrets/in-memory.provider';

// Module
export { FabricsModule } from './fabrics.module';
