/**
 * P3.1 — Database Provider Registry Tests.
 *
 * Verifies: register, lookup, not-found error, list, idempotent overwrite,
 * metadata, count.
 */

import { DatabaseProviderRegistry } from '../../src/fabrics/database/provider-registry';
import { DatabaseProviderType } from '../../src/fabrics/database/base';
import { DataProcessResult } from '../../src/kernel/data-process-result';

describe('DatabaseProviderRegistry', () => {
  let registry: DatabaseProviderRegistry;

  // Dummy factory
  const dummyFactory = async () => ({}) as any;
  const anotherFactory = async () => ({ marker: 'another' }) as any;

  beforeEach(() => {
    registry = new DatabaseProviderRegistry();
  });

  describe('register', () => {
    it('should register a provider and return success', () => {
      const result = registry.register(DatabaseProviderType.IN_MEMORY, dummyFactory);
      expect(result.isSuccess).toBe(true);
      expect(registry.count).toBe(1);
    });

    it('should register multiple providers', () => {
      registry.register(DatabaseProviderType.IN_MEMORY, dummyFactory);
      registry.register(DatabaseProviderType.ELASTICSEARCH, dummyFactory);
      registry.register(DatabaseProviderType.POSTGRESQL, dummyFactory);
      expect(registry.count).toBe(3);
    });

    it('should overwrite on re-register (idempotent)', () => {
      registry.register(DatabaseProviderType.IN_MEMORY, dummyFactory);
      registry.register(DatabaseProviderType.IN_MEMORY, anotherFactory);
      expect(registry.count).toBe(1);
      // Should have the new factory
      const result = registry.getFactory(DatabaseProviderType.IN_MEMORY);
      expect(result.data).toBe(anotherFactory);
    });

    it('should store metadata when provided', () => {
      registry.register(DatabaseProviderType.ELASTICSEARCH, dummyFactory, {
        version: '8.x',
        description: 'Elasticsearch provider',
      });
      const meta = registry.getMetadata(DatabaseProviderType.ELASTICSEARCH);
      expect(meta['version']).toBe('8.x');
    });

    it('should default metadata to empty object', () => {
      registry.register(DatabaseProviderType.IN_MEMORY, dummyFactory);
      const meta = registry.getMetadata(DatabaseProviderType.IN_MEMORY);
      expect(meta).toEqual({});
    });
  });

  describe('getFactory', () => {
    it('should return the registered factory', () => {
      registry.register(DatabaseProviderType.ELASTICSEARCH, dummyFactory);
      const result = registry.getFactory(DatabaseProviderType.ELASTICSEARCH);
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(dummyFactory);
    });

    it('should return failure for unregistered provider', () => {
      const result = registry.getFactory(DatabaseProviderType.POSTGRESQL);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('PROVIDER_NOT_FOUND');
      expect(result.errorMessage).toContain('postgresql');
    });

    it('should list available providers in error message', () => {
      registry.register(DatabaseProviderType.IN_MEMORY, dummyFactory);
      registry.register(DatabaseProviderType.ELASTICSEARCH, dummyFactory);
      const result = registry.getFactory(DatabaseProviderType.POSTGRESQL);
      expect(result.errorMessage).toContain('in_memory');
      expect(result.errorMessage).toContain('elasticsearch');
    });

    it('should return DataProcessResult (DNA-3)', () => {
      const result = registry.getFactory(DatabaseProviderType.IN_MEMORY);
      expect(result).toBeInstanceOf(DataProcessResult);
    });
  });

  describe('listProviders', () => {
    it('should return empty array when no providers registered', () => {
      expect(registry.listProviders()).toEqual([]);
    });

    it('should list all registered provider types', () => {
      registry.register(DatabaseProviderType.IN_MEMORY, dummyFactory);
      registry.register(DatabaseProviderType.ELASTICSEARCH, dummyFactory);
      const list = registry.listProviders();
      expect(list).toContain(DatabaseProviderType.IN_MEMORY);
      expect(list).toContain(DatabaseProviderType.ELASTICSEARCH);
      expect(list.length).toBe(2);
    });
  });

  describe('isRegistered', () => {
    it('should return true for registered provider', () => {
      registry.register(DatabaseProviderType.IN_MEMORY, dummyFactory);
      expect(registry.isRegistered(DatabaseProviderType.IN_MEMORY)).toBe(true);
    });

    it('should return false for unregistered provider', () => {
      expect(registry.isRegistered(DatabaseProviderType.POSTGRESQL)).toBe(false);
    });
  });
});
