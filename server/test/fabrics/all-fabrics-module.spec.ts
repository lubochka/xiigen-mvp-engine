/**
 * P5.4 Tests — NestJS Modules + FabricsModule (All 7 Fabrics)
 *
 * Tests:
 *   - All 7 fabric modules import correctly (compilation)
 *   - Provider registry completeness: DB(3), Queue(2), AI(5), Secrets(3)
 *   - Resolver existence for all 7 fabrics: DB, Queue, AI, RAG, Secrets, Flow
 *   - Symbol token bindings still work
 *   - Backward compatibility: all existing tests pass unchanged
 */

import { Test, TestingModule } from '@nestjs/testing';
import { ClsModule } from 'nestjs-cls';

// FabricsModule (imports all 7 sub-modules)
import { FabricsModule } from '../../src/fabrics/fabrics.module';

// Symbol tokens
import {
  DATABASE_SERVICE,
  QUEUE_SERVICE,
  AI_PROVIDER,
  RAG_SERVICE,
  FLOW_DEFINITION,
  FLOW_ORCHESTRATOR,
  SECRETS_SERVICE,
} from '../../src/fabrics/interfaces';

// Registries
import { DatabaseProviderRegistry } from '../../src/fabrics/database/provider-registry';
import { QueueProviderRegistry } from '../../src/fabrics/queue/provider-registry';
import { AiProviderRegistry } from '../../src/fabrics/ai-engine/provider-registry';
import { SecretsProviderRegistry } from '../../src/fabrics/secrets/provider-registry';

// Resolvers
import { DatabaseFabricResolver } from '../../src/fabrics/database/fabric-resolver';
import { QueueFabricResolver } from '../../src/fabrics/queue/fabric-resolver';
import { AiFabricResolver } from '../../src/fabrics/ai-engine/fabric-resolver';
import { RagFabricResolver } from '../../src/fabrics/rag/fabric-resolver';
import { SecretsFabricResolver } from '../../src/fabrics/secrets/fabric-resolver';
import { FlowFabricResolver } from '../../src/fabrics/flow-engine/fabric-resolver';

// Concrete types (for instanceof checks)
import { InMemoryDatabaseProvider } from '../../src/fabrics/database/in-memory.provider';
import { InMemoryQueueProvider } from '../../src/fabrics/queue/in-memory.provider';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { DelegatingAiProvider } from '../../src/fabrics/ai-engine/delegating-ai-provider';
import { InMemoryRagProvider } from '../../src/fabrics/rag/in-memory.provider';
import { InMemoryFlowStore } from '../../src/fabrics/flow-engine/in-memory-flow-store';
import { InMemoryFlowOrchestrator } from '../../src/fabrics/flow-engine/in-memory-orchestrator';
import { InMemorySecretsProvider } from '../../src/fabrics/secrets/in-memory.provider';

describe('P5.4 — All 7 Fabric Modules Wired', () => {
  let module: TestingModule;

  beforeAll(async () => {
    module = await Test.createTestingModule({
      imports: [ClsModule.forRoot({ global: true, middleware: { mount: false } }), FabricsModule],
    }).compile();
  });

  afterAll(async () => {
    if (module) await module.close();
  });

  // ── Module compilation ─────────────────────────────

  describe('module compilation', () => {
    it('should compile FabricsModule with all 7 sub-modules', () => {
      expect(module).toBeDefined();
    });
  });

  // ── Symbol token bindings (backward compat) ────────

  describe('symbol token bindings', () => {
    it('should resolve DATABASE_SERVICE → InMemoryDatabaseProvider', () => {
      const db = module.get(DATABASE_SERVICE);
      expect(db).toBeInstanceOf(InMemoryDatabaseProvider);
    });

    it('should resolve QUEUE_SERVICE → InMemoryQueueProvider', () => {
      const queue = module.get(QUEUE_SERVICE);
      expect(queue).toBeInstanceOf(InMemoryQueueProvider);
    });

    it('should resolve AI_PROVIDER → DelegatingAiProvider (Phase B-3)', () => {
      const ai = module.get(AI_PROVIDER);
      // Phase B-3: AI_PROVIDER now resolves per-request via DelegatingAiProvider.
      // MockAiProvider is the fallback inside DelegatingAiProvider when no tenant keys are set.
      expect(ai).toBeInstanceOf(DelegatingAiProvider);
    });

    it('should resolve RAG_SERVICE → InMemoryRagProvider', () => {
      const rag = module.get(RAG_SERVICE);
      expect(rag).toBeInstanceOf(InMemoryRagProvider);
    });

    it('should resolve FLOW_DEFINITION → InMemoryFlowStore', () => {
      const store = module.get(FLOW_DEFINITION);
      expect(store).toBeInstanceOf(InMemoryFlowStore);
    });

    it('should resolve FLOW_ORCHESTRATOR → InMemoryFlowOrchestrator', () => {
      const orch = module.get(FLOW_ORCHESTRATOR);
      expect(orch).toBeInstanceOf(InMemoryFlowOrchestrator);
    });

    it('should resolve SECRETS_SERVICE → InMemorySecretsProvider', () => {
      const secrets = module.get(SECRETS_SERVICE);
      expect(secrets).toBeInstanceOf(InMemorySecretsProvider);
    });
  });

  // ── Registries ─────────────────────────────────────

  describe('provider registries', () => {
    it('should have DatabaseProviderRegistry with 3 providers', () => {
      const registry = module.get(DatabaseProviderRegistry);
      expect(registry).toBeDefined();
      expect(registry.count).toBe(3);
    });

    it('should have QueueProviderRegistry with 2 providers', () => {
      const registry = module.get(QueueProviderRegistry);
      expect(registry).toBeDefined();
      expect(registry.count).toBe(2);
    });

    it('should have AiProviderRegistry with 5 providers', () => {
      const registry = module.get(AiProviderRegistry);
      expect(registry).toBeDefined();
      expect(registry.count).toBe(5);
    });

    it('should have SecretsProviderRegistry with 4 providers', () => {
      const registry = module.get(SecretsProviderRegistry);
      expect(registry).toBeDefined();
      expect(registry.count).toBe(4);
    });
  });

  // ── Resolvers ──────────────────────────────────────

  describe('fabric resolvers', () => {
    it('should have DatabaseFabricResolver', () => {
      expect(module.get(DatabaseFabricResolver)).toBeDefined();
    });

    it('should have QueueFabricResolver', () => {
      expect(module.get(QueueFabricResolver)).toBeDefined();
    });

    it('should have AiFabricResolver', () => {
      expect(module.get(AiFabricResolver)).toBeDefined();
    });

    it('should have RagFabricResolver', () => {
      const resolver = module.get(RagFabricResolver);
      expect(resolver).toBeDefined();
      expect(resolver.listRegistered()).toContain('in_memory');
    });

    it('should have SecretsFabricResolver', () => {
      expect(module.get(SecretsFabricResolver)).toBeDefined();
    });

    it('should have FlowFabricResolver', () => {
      const resolver = module.get(FlowFabricResolver);
      expect(resolver).toBeDefined();
      expect(resolver.listRegistered()).toContain('in_memory');
    });
  });
});
