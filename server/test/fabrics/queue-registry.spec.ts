/**
 * P3.1 — Queue Provider Registry Tests.
 *
 * Same pattern as DatabaseProviderRegistry — verify register, lookup,
 * not-found, list, idempotent overwrite, metadata.
 */

import { QueueProviderRegistry } from '../../src/fabrics/queue/provider-registry';
import { QueueProviderType } from '../../src/fabrics/queue/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

describe('QueueProviderRegistry', () => {
  let registry: QueueProviderRegistry;

  const dummyFactory = async () => ({}) as any;
  const anotherFactory = async () => ({ marker: 'another' }) as any;

  beforeEach(() => {
    registry = new QueueProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider and return success', () => {
      const result = registry.register(QueueProviderType.IN_MEMORY, dummyFactory);
      expect(result.isSuccess).toBe(true);
      expect(registry.count).toBe(1);
    });

    it('should register multiple providers', () => {
      registry.register(QueueProviderType.IN_MEMORY, dummyFactory);
      registry.register(QueueProviderType.SQS, dummyFactory);
      expect(registry.count).toBe(2);
    });

    it('should overwrite on re-register', () => {
      registry.register(QueueProviderType.SQS, dummyFactory);
      registry.register(QueueProviderType.SQS, anotherFactory);
      expect(registry.count).toBe(1);
      expect(registry.getFactory(QueueProviderType.SQS).data).toBe(anotherFactory);
    });

    it('should store metadata', () => {
      registry.register(QueueProviderType.SQS, dummyFactory, {
        region: 'us-east-1',
        fifo: true,
      });
      const meta = registry.getMetadata(QueueProviderType.SQS);
      expect(meta['region']).toBe('us-east-1');
      expect(meta['fifo']).toBe(true);
    });
  });

  describe('getFactory', () => {
    it('should return the registered factory', () => {
      registry.register(QueueProviderType.SQS, dummyFactory);
      const result = registry.getFactory(QueueProviderType.SQS);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(dummyFactory);
    });

    it('should return failure for unregistered provider', () => {
      const result = registry.getFactory(QueueProviderType.SQS);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_FOUND');
      expect(result.errorMessage).toContain('sqs');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      expect(registry.getFactory(QueueProviderType.SQS)).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('listProviders', () => {
    it('should return empty array initially', () => {
      expect(registry.listProviders()).toEqual([]);
    });

    it('should list all registered types', () => {
      registry.register(QueueProviderType.IN_MEMORY, dummyFactory);
      registry.register(QueueProviderType.SQS, dummyFactory);
      const list = registry.listProviders();
      expect(list).toContain(QueueProviderType.IN_MEMORY);
      expect(list).toContain(QueueProviderType.SQS);
    });
  });

  describe('isRegistered', () => {
    it('should return true for registered', () => {
      registry.register(QueueProviderType.IN_MEMORY, dummyFactory);
      expect(registry.isRegistered(QueueProviderType.IN_MEMORY)).toBe(true);
    });

    it('should return false for unregistered', () => {
      expect(registry.isRegistered(QueueProviderType.SQS)).toBe(false);
    });
  });
});
