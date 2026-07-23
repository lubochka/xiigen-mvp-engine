/**
 * P3.1 — Base Types Tests.
 *
 * Verifies: enums, default configs, connection string building,
 * SQL identifier sanitization.
 */

import {
  DatabaseProviderType,
  defaultDatabaseConfig,
  getConnectionString,
  sanitizeIdentifier,
} from '../../src/fabrics/database/base';
import { QueueProviderType, defaultQueueConfig } from '../../src/fabrics/queue/base';

describe('P3.1 — Database Base Types', () => {
  describe('DatabaseProviderType enum', () => {
    it('should have IN_MEMORY, ELASTICSEARCH, POSTGRESQL', () => {
      expect(DatabaseProviderType.IN_MEMORY).toBe('in_memory');
      expect(DatabaseProviderType.ELASTICSEARCH).toBe('elasticsearch');
      expect(DatabaseProviderType.POSTGRESQL).toBe('postgresql');
    });
  });

  describe('defaultDatabaseConfig', () => {
    it('should return sensible defaults', () => {
      const config = defaultDatabaseConfig();
      expect(config.providerType).toBe(DatabaseProviderType.IN_MEMORY);
      expect(config.hosts).toEqual(['localhost']);
      expect(config.port).toBe(0);
      expect(config.database).toBe('');
      expect(config.indexOverrides).toEqual({});
    });

    it('should accept overrides', () => {
      const config = defaultDatabaseConfig({
        providerType: DatabaseProviderType.ELASTICSEARCH,
        port: 9200,
      });
      expect(config.providerType).toBe(DatabaseProviderType.ELASTICSEARCH);
      expect(config.port).toBe(9200);
      expect(config.hosts).toEqual(['localhost']); // default preserved
    });
  });

  describe('getConnectionString', () => {
    it('should build ES connection string', () => {
      const config = defaultDatabaseConfig({
        providerType: DatabaseProviderType.ELASTICSEARCH,
        hosts: ['es-host'],
        port: 9200,
      });
      expect(getConnectionString(config)).toBe('http://es-host:9200');
    });

    it('should use default ES port when 0', () => {
      const config = defaultDatabaseConfig({
        providerType: DatabaseProviderType.ELASTICSEARCH,
      });
      expect(getConnectionString(config)).toBe('http://localhost:9200');
    });

    it('should build PG connection string', () => {
      const config = defaultDatabaseConfig({
        providerType: DatabaseProviderType.POSTGRESQL,
        hosts: ['pg-host'],
        port: 5432,
        database: 'xiigen',
        username: 'admin',
        password: 'secret',
      });
      expect(getConnectionString(config)).toBe('postgresql://admin:secret@pg-host:5432/xiigen');
    });

    it('should return in-memory:// for IN_MEMORY', () => {
      const config = defaultDatabaseConfig();
      expect(getConnectionString(config)).toBe('in-memory://');
    });
  });

  describe('sanitizeIdentifier', () => {
    it('should keep alphanumeric and underscores', () => {
      expect(sanitizeIdentifier('tenant_abc_123')).toBe('tenant_abc_123');
    });

    it('should remove dashes', () => {
      expect(sanitizeIdentifier('tenant-abc-123')).toBe('tenantabc123');
    });

    it('should remove dots', () => {
      expect(sanitizeIdentifier('tenant.abc')).toBe('tenantabc');
    });

    it('should remove SQL injection characters', () => {
      expect(sanitizeIdentifier("tenant'; DROP TABLE--")).toBe('tenantDROPTABLE');
    });

    it('should remove spaces', () => {
      expect(sanitizeIdentifier('tenant abc')).toBe('tenantabc');
    });

    it('should handle empty string', () => {
      expect(sanitizeIdentifier('')).toBe('');
    });

    it('should handle special characters', () => {
      expect(sanitizeIdentifier('t@e#n$a%n^t')).toBe('tenant');
    });
  });
});

describe('P3.1 — Queue Base Types', () => {
  describe('QueueProviderType enum', () => {
    it('should have IN_MEMORY and SQS', () => {
      expect(QueueProviderType.IN_MEMORY).toBe('in_memory');
      expect(QueueProviderType.SQS).toBe('sqs');
    });
  });

  describe('defaultQueueConfig', () => {
    it('should return sensible defaults', () => {
      const config = defaultQueueConfig();
      expect(config.providerType).toBe(QueueProviderType.IN_MEMORY);
      expect(config.region).toBe('us-east-1');
      expect(config.fifo).toBe(true);
      expect(config.maxReceiveCount).toBe(3);
      expect(config.visibilityTimeoutSeconds).toBe(30);
      expect(config.waitTimeSeconds).toBe(20);
    });

    it('should accept overrides', () => {
      const config = defaultQueueConfig({
        providerType: QueueProviderType.SQS,
        region: 'eu-west-1',
        maxReceiveCount: 5,
      });
      expect(config.providerType).toBe(QueueProviderType.SQS);
      expect(config.region).toBe('eu-west-1');
      expect(config.maxReceiveCount).toBe(5);
      expect(config.fifo).toBe(true); // default preserved
    });
  });
});
