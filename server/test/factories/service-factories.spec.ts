/**
 * P6.2 Tests — Per-Fabric Service Factories (6 bridge classes)
 *
 * Each factory: correct fabric enforcement, delegation to resolver,
 * health check delegation, DNA-3 returns, config hint passing.
 */

import { DataProcessResult } from '../../src/kernel/data-process-result';
import { FabricType } from '../../src/factories/fabric-type';
import {
  createResolutionContext,
  FactoryResolutionContext,
} from '../../src/factories/resolution-context';

import { DatabaseServiceFactory } from '../../src/fabrics/database/database-service.factory';
import { QueueServiceFactory } from '../../src/fabrics/queue/queue-service.factory';
import { AiServiceFactory } from '../../src/fabrics/ai-engine/ai-service.factory';
import { RagServiceFactory } from '../../src/fabrics/rag/rag-service.factory';
import { FlowServiceFactory } from '../../src/fabrics/flow-engine/flow-service.factory';
import { SecretsServiceFactory } from '../../src/fabrics/secrets/secrets-service.factory';

// ── Mock resolvers ───────────────────────────────────

function createMockResolver(overrides: Record<string, any> = {}) {
  return {
    resolve: jest.fn().mockResolvedValue(DataProcessResult.success({ mock: true })),
    resolveStore: jest.fn().mockResolvedValue(DataProcessResult.success({ store: true })),
    resolveOrchestrator: jest
      .fn()
      .mockResolvedValue(DataProcessResult.success({ orchestrator: true })),
    cachedProviders: ['test_provider'],
    ...overrides,
  };
}

function makeCtx(
  fabricType: FabricType,
  config: Record<string, unknown> = {},
): FactoryResolutionContext {
  return createResolutionContext({
    tenantId: 'tenant-test',
    factoryId: 'F999',
    interfaceName: 'ITestService',
    fabricType,
    config,
  });
}

// ══════════════════════════════════════════════════════
// DatabaseServiceFactory
// ══════════════════════════════════════════════════════

describe('DatabaseServiceFactory', () => {
  let factory: DatabaseServiceFactory;
  let resolver: any;

  beforeEach(() => {
    resolver = createMockResolver();
    factory = new DatabaseServiceFactory(resolver);
  });

  it('should have correct static metadata', () => {
    expect(DatabaseServiceFactory.FABRIC_TYPE).toBe(FabricType.DATABASE);
    expect(DatabaseServiceFactory.FACTORY_ID).toBe('FABRIC_DATABASE');
    expect(DatabaseServiceFactory.INTERFACE_NAME).toBe('IDatabaseService');
  });

  it('should delegate to resolver.resolve() with index from config', async () => {
    const ctx = makeCtx(FabricType.DATABASE, { index: 'orders' });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolve).toHaveBeenCalledWith('orders');
  });

  it('should delegate to resolver.resolve() without index when not in config', async () => {
    const ctx = makeCtx(FabricType.DATABASE);
    await factory.createAsync(ctx);
    expect(resolver.resolve).toHaveBeenCalledWith(undefined);
  });

  it('should reject wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.QUEUE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const ctx = makeCtx(FabricType.DATABASE);
    const result = await factory.createAsync(ctx);
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('should handle resolver throwing an error', async () => {
    resolver.resolve.mockRejectedValue(new Error('connection lost'));
    const ctx = makeCtx(FabricType.DATABASE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FACTORY_CREATE_ERROR');
  });

  it('should pass health check when resolver resolves successfully', async () => {
    const ctx = makeCtx(FabricType.DATABASE);
    const result = await factory.healthCheck(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.fabric).toBe(FabricType.DATABASE);
    expect(result.data!.status).toBe('healthy');
  });

  it('should reject health check with wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.AI_ENGINE);
    const result = await factory.healthCheck(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });
});

// ══════════════════════════════════════════════════════
// QueueServiceFactory
// ══════════════════════════════════════════════════════

describe('QueueServiceFactory', () => {
  let factory: QueueServiceFactory;
  let resolver: any;

  beforeEach(() => {
    resolver = createMockResolver();
    factory = new QueueServiceFactory(resolver);
  });

  it('should have correct static metadata', () => {
    expect(QueueServiceFactory.FABRIC_TYPE).toBe(FabricType.QUEUE);
    expect(QueueServiceFactory.FACTORY_ID).toBe('FABRIC_QUEUE');
  });

  it('should delegate to resolver.resolve() with queue_name from config', async () => {
    const ctx = makeCtx(FabricType.QUEUE, { queue_name: 'events' });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolve).toHaveBeenCalledWith('events');
  });

  it('should reject wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.DATABASE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const ctx = makeCtx(FabricType.QUEUE);
    const result = await factory.createAsync(ctx);
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('should handle resolver error', async () => {
    resolver.resolve.mockRejectedValue(new Error('queue down'));
    const ctx = makeCtx(FabricType.QUEUE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FACTORY_CREATE_ERROR');
  });
});

// ══════════════════════════════════════════════════════
// AiServiceFactory
// ══════════════════════════════════════════════════════

describe('AiServiceFactory', () => {
  let factory: AiServiceFactory;
  let resolver: any;

  beforeEach(() => {
    resolver = createMockResolver();
    factory = new AiServiceFactory(resolver);
  });

  it('should have correct static metadata', () => {
    expect(AiServiceFactory.FABRIC_TYPE).toBe(FabricType.AI_ENGINE);
    expect(AiServiceFactory.FACTORY_ID).toBe('FABRIC_AI_ENGINE');
  });

  it('should delegate to resolver.resolve() with model_id from config', async () => {
    const ctx = makeCtx(FabricType.AI_ENGINE, { model_id: 'claude-opus-4-5' });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolve).toHaveBeenCalledWith('claude-opus-4-5');
  });

  it('should reject wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.SECRETS);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const ctx = makeCtx(FabricType.AI_ENGINE);
    const result = await factory.createAsync(ctx);
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('should pass health check with correct fabric', async () => {
    const ctx = makeCtx(FabricType.AI_ENGINE);
    const result = await factory.healthCheck(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.fabric).toBe(FabricType.AI_ENGINE);
  });
});

// ══════════════════════════════════════════════════════
// RagServiceFactory
// ══════════════════════════════════════════════════════

describe('RagServiceFactory', () => {
  let factory: RagServiceFactory;
  let resolver: any;

  beforeEach(() => {
    resolver = createMockResolver();
    factory = new RagServiceFactory(resolver);
  });

  it('should have correct static metadata', () => {
    expect(RagServiceFactory.FABRIC_TYPE).toBe(FabricType.RAG);
    expect(RagServiceFactory.FACTORY_ID).toBe('FABRIC_RAG');
  });

  it('should delegate to resolver.resolve() with namespace from config', async () => {
    const ctx = makeCtx(FabricType.RAG, { namespace: 'skills' });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolve).toHaveBeenCalledWith('skills');
  });

  it('should reject wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.CORE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const ctx = makeCtx(FabricType.RAG);
    const result = await factory.createAsync(ctx);
    expect(result).toBeInstanceOf(DataProcessResult);
  });
});

// ══════════════════════════════════════════════════════
// FlowServiceFactory
// ══════════════════════════════════════════════════════

describe('FlowServiceFactory', () => {
  let factory: FlowServiceFactory;
  let resolver: any;

  beforeEach(() => {
    resolver = createMockResolver();
    factory = new FlowServiceFactory(resolver);
  });

  it('should have correct static metadata', () => {
    expect(FlowServiceFactory.FABRIC_TYPE).toBe(FabricType.FLOW_ENGINE);
    expect(FlowServiceFactory.FACTORY_ID).toBe('FABRIC_FLOW_ENGINE');
  });

  it('should resolve orchestrator by default', async () => {
    const ctx = makeCtx(FabricType.FLOW_ENGINE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolveOrchestrator).toHaveBeenCalled();
    expect(resolver.resolveStore).not.toHaveBeenCalled();
  });

  it('should resolve store when component=store in config', async () => {
    const ctx = makeCtx(FabricType.FLOW_ENGINE, { component: 'store' });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolveStore).toHaveBeenCalled();
    expect(resolver.resolveOrchestrator).not.toHaveBeenCalled();
  });

  it('should resolve orchestrator when component=orchestrator in config', async () => {
    const ctx = makeCtx(FabricType.FLOW_ENGINE, { component: 'orchestrator' });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolveOrchestrator).toHaveBeenCalled();
  });

  it('should reject wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.DATABASE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const ctx = makeCtx(FabricType.FLOW_ENGINE);
    const result = await factory.createAsync(ctx);
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('should handle resolver error', async () => {
    resolver.resolveOrchestrator.mockRejectedValue(new Error('flow engine crash'));
    const ctx = makeCtx(FabricType.FLOW_ENGINE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FACTORY_CREATE_ERROR');
  });
});

// ══════════════════════════════════════════════════════
// SecretsServiceFactory
// ══════════════════════════════════════════════════════

describe('SecretsServiceFactory', () => {
  let factory: SecretsServiceFactory;
  let resolver: any;

  beforeEach(() => {
    resolver = createMockResolver();
    factory = new SecretsServiceFactory(resolver);
  });

  it('should have correct static metadata', () => {
    expect(SecretsServiceFactory.FABRIC_TYPE).toBe(FabricType.SECRETS);
    expect(SecretsServiceFactory.FACTORY_ID).toBe('FABRIC_SECRETS');
  });

  it('should delegate to resolver.resolve() with path from config', async () => {
    const ctx = makeCtx(FabricType.SECRETS, { path: 'xiigen/ai/anthropic-key' });
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(true);
    expect(resolver.resolve).toHaveBeenCalledWith('xiigen/ai/anthropic-key');
  });

  it('should reject wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.QUEUE);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });

  it('should return DataProcessResult (DNA-3)', async () => {
    const ctx = makeCtx(FabricType.SECRETS);
    const result = await factory.createAsync(ctx);
    expect(result).toBeInstanceOf(DataProcessResult);
  });

  it('should handle resolver error', async () => {
    resolver.resolve.mockRejectedValue(new Error('vault sealed'));
    const ctx = makeCtx(FabricType.SECRETS);
    const result = await factory.createAsync(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('FACTORY_CREATE_ERROR');
  });

  it('should pass health check with correct fabric', async () => {
    const ctx = makeCtx(FabricType.SECRETS);
    const result = await factory.healthCheck(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data!.fabric).toBe(FabricType.SECRETS);
  });

  it('should reject health check with wrong fabric type', async () => {
    const ctx = makeCtx(FabricType.RAG);
    const result = await factory.healthCheck(ctx);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('WRONG_FABRIC');
  });
});
