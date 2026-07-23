import { TenantKeyGenerator } from './tenant-key-generator';

describe('TenantKeyGenerator', () => {
  describe('generateDocId', () => {
    it('should start with tenantId::', () => {
      const id = TenantKeyGenerator.generateDocId('acme');
      expect(id.startsWith('acme::')).toBe(true);
    });
    it('should include hint when provided', () => {
      const id = TenantKeyGenerator.generateDocId('acme', 'form-123');
      expect(id).toContain('acme::form-123::');
    });
    it('should generate unique ids', () => {
      const id1 = TenantKeyGenerator.generateDocId('acme');
      const id2 = TenantKeyGenerator.generateDocId('acme');
      expect(id1).not.toBe(id2);
    });
    it('different tenants produce different ids', () => {
      const id1 = TenantKeyGenerator.generateDocId('acme');
      const id2 = TenantKeyGenerator.generateDocId('beta');
      expect(id1.split('::')[0]).not.toBe(id2.split('::')[0]);
    });
  });

  describe('generateIdempotencyKey', () => {
    it('should start with tenantId::operationId::', () => {
      const key = TenantKeyGenerator.generateIdempotencyKey('acme', 'op1', { x: 1 });
      expect(key.startsWith('acme::op1::')).toBe(true);
    });
    it('same args produce same key (deterministic)', () => {
      const payload = { b: 2, a: 1 };
      const k1 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op1', payload);
      const k2 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op1', payload);
      expect(k1).toBe(k2);
    });
    it('different tenantId produce different keys', () => {
      const payload = { x: 1 };
      const k1 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op1', payload);
      const k2 = TenantKeyGenerator.generateIdempotencyKey('beta', 'op1', payload);
      expect(k1).not.toBe(k2);
    });
    it('key order in payload does not matter (normalized)', () => {
      const k1 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op1', { a: 1, b: 2 });
      const k2 = TenantKeyGenerator.generateIdempotencyKey('acme', 'op1', { b: 2, a: 1 });
      expect(k1).toBe(k2);
    });
  });

  describe('extractTenantId', () => {
    it('extracts tenantId from doc id', () => {
      const id = TenantKeyGenerator.generateDocId('acme');
      expect(TenantKeyGenerator.extractTenantId(id)).toBe('acme');
    });
    it('extracts tenantId from idempotency key', () => {
      const key = TenantKeyGenerator.generateIdempotencyKey('acme', 'op1', {});
      expect(TenantKeyGenerator.extractTenantId(key)).toBe('acme');
    });
    it('returns undefined for non-namespaced key', () => {
      expect(TenantKeyGenerator.extractTenantId('plain-key')).toBeUndefined();
    });
  });
});
