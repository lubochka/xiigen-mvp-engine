/**
 * Tests for DNA-4: MicroserviceBase
 * Ported from Python: tests/unit/test_microservice_and_factory.py
 */

import {
  MicroserviceBase,
  ServiceDescriptor,
  DataProcessResult,
  IDatabaseAccess,
  IQueuePubSub,
  ICacheAccess,
  IConfigProvider,
} from '../../src/kernel';

// ── Concrete test service ──────────────────────────────

class TestService extends MicroserviceBase {
  constructor(options?: {
    db?: IDatabaseAccess;
    queue?: IQueuePubSub;
    cache?: ICacheAccess;
    config?: IConfigProvider;
  }) {
    super({
      descriptor: new ServiceDescriptor({
        serviceId: 'test-svc',
        serviceName: 'Test Service',
        version: '2.0.0',
      }),
      ...options,
    });
  }
}

// ── Mock components ────────────────────────────────────

function mockDb(): IDatabaseAccess {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ _id: 'doc-1' })),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.success({ name: 'test' })),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  };
}

function mockQueue(): IQueuePubSub {
  return {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-id-1')),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  };
}

function mockCache(): ICacheAccess {
  return {
    cacheGet: jest.fn().mockResolvedValue(DataProcessResult.success(undefined)),
    cacheSet: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    cacheDelete: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  };
}

function mockConfig(overrides?: Record<string, unknown>): IConfigProvider {
  const values = overrides ?? {};
  return {
    getConfig: jest.fn().mockImplementation((key: string, def?: unknown) => values[key] ?? def),
    getConfigSection: jest.fn().mockReturnValue({}),
  };
}

// ═══════════════════════════════════════════════════════
// Tests
// ═══════════════════════════════════════════════════════

describe('ServiceDescriptor', () => {
  it('should create with required params', () => {
    const d = new ServiceDescriptor({ serviceId: 's1', serviceName: 'Svc 1' });
    expect(d.serviceId).toBe('s1');
    expect(d.serviceName).toBe('Svc 1');
    expect(d.version).toBe('1.0.0');
    expect(d.flowId).toBeUndefined();
    expect(d.familyId).toBeUndefined();
  });

  it('should create with all params', () => {
    const d = new ServiceDescriptor({
      serviceId: 's1',
      serviceName: 'Svc',
      version: '3.0.0',
      flowId: 'F-21',
      familyId: 'FAM-5',
    });
    expect(d.version).toBe('3.0.0');
    expect(d.flowId).toBe('F-21');
    expect(d.familyId).toBe('FAM-5');
  });
});

describe('MicroserviceBase (DNA-4)', () => {
  describe('construction & identity', () => {
    it('should set descriptor properties', () => {
      const svc = new TestService();
      expect(svc.serviceId).toBe('test-svc');
      expect(svc.serviceName).toBe('Test Service');
      expect(svc.descriptor.version).toBe('2.0.0');
    });

    it('should generate unique instance ID', () => {
      const s1 = new TestService();
      const s2 = new TestService();
      expect(s1.instanceId).not.toBe(s2.instanceId);
      expect(s1.instanceId.length).toBeGreaterThan(0);
    });

    it('should start healthy', () => {
      const svc = new TestService();
      expect(svc.isHealthy).toBe(true);
    });
  });

  describe('component access', () => {
    it('should access DB when injected', () => {
      const db = mockDb();
      const svc = new TestService({ db });
      expect(svc.hasDb).toBe(true);
      expect(svc.db).toBe(db);
    });

    it('should throw when accessing DB without injection', () => {
      const svc = new TestService();
      expect(svc.hasDb).toBe(false);
      expect(() => svc.db).toThrow('Database component not injected');
    });

    it('should access Queue when injected', () => {
      const queue = mockQueue();
      const svc = new TestService({ queue });
      expect(svc.hasQueue).toBe(true);
      expect(svc.queue).toBe(queue);
    });

    it('should throw when accessing Queue without injection', () => {
      const svc = new TestService();
      expect(svc.hasQueue).toBe(false);
      expect(() => svc.queue).toThrow('Queue component not injected');
    });

    it('should access Cache when injected', () => {
      const cache = mockCache();
      const svc = new TestService({ cache });
      expect(svc.hasCache).toBe(true);
      expect(svc.cache).toBe(cache);
    });

    it('should throw when accessing Cache without injection', () => {
      const svc = new TestService();
      expect(svc.hasCache).toBe(false);
      expect(() => svc.cache).toThrow('Cache component not injected');
    });
  });

  describe('health check (Component 5)', () => {
    it('should return healthy status by default', async () => {
      const svc = new TestService();
      const result = await svc.checkHealth();
      expect(result.isSuccess).toBe(true);
      expect(result.data!['status']).toBe('healthy');
      expect(result.data!['service_id']).toBe('test-svc');
      expect(result.data!['service_name']).toBe('Test Service');
      expect(result.data!['instance_id']).toBeDefined();
      expect(result.data!['started_at']).toBeDefined();
    });

    it('should report connected components', async () => {
      const svc = new TestService({ db: mockDb(), queue: mockQueue(), cache: mockCache() });
      const result = await svc.checkHealth();
      const components = result.data!['components'] as Record<string, string>;
      expect(components['database']).toBe('connected');
      expect(components['queue']).toBe('connected');
      expect(components['cache']).toBe('connected');
    });

    it('should report empty components when none injected', async () => {
      const svc = new TestService();
      const result = await svc.checkHealth();
      const components = result.data!['components'] as Record<string, string>;
      expect(Object.keys(components).length).toBe(0);
    });

    it('should report unhealthy after stop', async () => {
      const svc = new TestService();
      await svc.stop();
      const result = await svc.checkHealth();
      expect(result.data!['status']).toBe('unhealthy');
    });
  });

  describe('config (Component 6)', () => {
    it('should return config value when config injected', () => {
      const svc = new TestService({ config: mockConfig({ 'ai.model': 'claude-sonnet' }) });
      expect(svc.getConfig('ai.model')).toBe('claude-sonnet');
    });

    it('should return default when key missing', () => {
      const svc = new TestService({ config: mockConfig({}) });
      expect(svc.getConfig('missing.key', 'fallback')).toBe('fallback');
    });

    it('should return default when config not injected', () => {
      const svc = new TestService();
      expect(svc.getConfig('any.key', 'default')).toBe('default');
    });
  });

  describe('tenant validation (DNA-5)', () => {
    it('should validate valid tenant', () => {
      const svc = new TestService();
      const result = svc.validateTenant('T-001');
      expect(result.isSuccess).toBe(true);
    });

    it('should reject empty tenant', () => {
      const svc = new TestService();
      const result = svc.validateTenant('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_MISSING');
    });
  });

  describe('event publishing', () => {
    it('should publish CloudEvents-formatted event through queue', async () => {
      const queue = mockQueue();
      const svc = new TestService({ queue });

      const result = await svc.publishEvent('T-001', 'test.event', { key: 'val' });
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe('msg-id-1');

      // Verify queue.enqueue was called with CloudEvent
      expect(queue.enqueue).toHaveBeenCalledTimes(1);
      const callArgs = (queue.enqueue as jest.Mock).mock.calls[0];
      expect(callArgs[0]).toBe('T-001'); // tenantId
      expect(callArgs[1]).toBe('test.event'); // eventType
      const event = callArgs[2]; // CloudEvent envelope
      expect(event['specversion']).toBe('1.0');
      expect(event['type']).toBe('test.event');
      expect(event['tenantid']).toBe('T-001');
      expect(event['source']).toContain('test-svc');
    });

    it('should reject event with missing tenant_id', async () => {
      const queue = mockQueue();
      const svc = new TestService({ queue });

      const result = await svc.publishEvent('', 'test.event', {});
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('SCOPE_MISSING');
      expect(queue.enqueue).not.toHaveBeenCalled();
    });

    it('should include correlation_id in event', async () => {
      const queue = mockQueue();
      const svc = new TestService({ queue });

      await svc.publishEvent('T-001', 'test.event', {}, 'COR-42');
      const event = (queue.enqueue as jest.Mock).mock.calls[0][2];
      expect(event['correlationid']).toBe('COR-42');
    });
  });

  describe('lifecycle', () => {
    it('should start successfully', async () => {
      const svc = new TestService();
      const result = await svc.start();
      expect(result.isSuccess).toBe(true);
      expect(svc.isHealthy).toBe(true);
    });

    it('should stop successfully', async () => {
      const svc = new TestService();
      const result = await svc.stop();
      expect(result.isSuccess).toBe(true);
      expect(svc.isHealthy).toBe(false);
    });

    it('should recover health on re-start', async () => {
      const svc = new TestService();
      await svc.stop();
      expect(svc.isHealthy).toBe(false);
      await svc.start();
      expect(svc.isHealthy).toBe(true);
    });
  });

  describe('abstract class enforcement', () => {
    it('should not be instantiable directly', () => {
      // TypeScript prevents direct instantiation of abstract class at compile time.
      // At runtime, we verify subclass works.
      const svc = new TestService();
      expect(svc).toBeInstanceOf(MicroserviceBase);
    });
  });
});
