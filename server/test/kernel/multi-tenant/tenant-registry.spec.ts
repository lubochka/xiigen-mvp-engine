/**
 * Tests for TenantRegistry — CRUD service for tenants.
 */

import { TenantRegistry } from '../../../src/kernel';

describe('TenantRegistry', () => {
  let registry: TenantRegistry;

  beforeEach(() => {
    registry = new TenantRegistry();
  });

  describe('create', () => {
    it('should create a tenant with defaults', async () => {
      const result = await registry.create({ name: 'Acme Corp' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.name).toBe('Acme Corp');
      expect(result.data!.status).toBe('active');
      expect(result.data!.plan.name).toBe('free');
      expect(result.data!.id).toBeDefined();
      expect(result.data!.createdAt).toBeDefined();
    });

    it('should create with custom plan', async () => {
      const result = await registry.create({
        name: 'Big Corp',
        plan: { name: 'enterprise', maxTokensPerDay: 10_000_000 },
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.plan.name).toBe('enterprise');
      expect(result.data!.plan.maxTokensPerDay).toBe(10_000_000);
      // Default values should be preserved for non-overridden fields
      expect(result.data!.plan.maxApiCallsPerMinute).toBe(60);
    });

    it('should create with config overrides and API keys', async () => {
      const result = await registry.create({
        name: 'Custom Corp',
        configOverrides: { 'ai.model': 'gpt-4o' },
        apiKeys: { openai: 'sk-xxx' },
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.configOverrides['ai.model']).toBe('gpt-4o');
      expect(result.data!.apiKeys['openai']).toBe('sk-xxx');
    });

    it('should reject empty name', async () => {
      const result = await registry.create({ name: '' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_INPUT');
    });

    it('should reject whitespace-only name', async () => {
      const result = await registry.create({ name: '   ' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('INVALID_INPUT');
    });

    it('should reject duplicate name', async () => {
      await registry.create({ name: 'Unique Corp' });
      const result = await registry.create({ name: 'Unique Corp' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DUPLICATE_NAME');
    });

    it('should trim name', async () => {
      const result = await registry.create({ name: '  Trimmed Corp  ' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.name).toBe('Trimmed Corp');
    });

    it('should generate unique IDs', async () => {
      const r1 = await registry.create({ name: 'A' });
      const r2 = await registry.create({ name: 'B' });
      expect(r1.data!.id).not.toBe(r2.data!.id);
    });
  });

  describe('findById', () => {
    it('should find existing tenant', async () => {
      const created = await registry.create({ name: 'Find Me' });
      const result = await registry.findById(created.data!.id);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.name).toBe('Find Me');
    });

    it('should return NOT_FOUND for unknown ID', async () => {
      const result = await registry.findById('nonexistent-id');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('findByName', () => {
    it('should find existing tenant by name', async () => {
      await registry.create({ name: 'Named Corp' });
      const result = await registry.findByName('Named Corp');
      expect(result.isSuccess).toBe(true);
      expect(result.data!.name).toBe('Named Corp');
    });

    it('should return NOT_FOUND for unknown name', async () => {
      const result = await registry.findByName('Ghost Corp');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('list', () => {
    it('should list all tenants', async () => {
      await registry.create({ name: 'A' });
      await registry.create({ name: 'B' });
      await registry.create({ name: 'C' });
      const result = await registry.list();
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(3);
    });

    it('should filter by status', async () => {
      const t = await registry.create({ name: 'Active' });
      await registry.create({ name: 'Also Active' });
      await registry.deactivate(t.data!.id);

      const active = await registry.list('active');
      expect(active.data!.length).toBe(1);
      expect(active.data![0].name).toBe('Also Active');

      const inactive = await registry.list('inactive');
      expect(inactive.data!.length).toBe(1);
      expect(inactive.data![0].name).toBe('Active');
    });

    it('should return empty for no matches', async () => {
      const result = await registry.list('suspended');
      expect(result.data!.length).toBe(0);
    });
  });

  describe('update', () => {
    it('should update name', async () => {
      const created = await registry.create({ name: 'Old Name' });
      const result = await registry.update(created.data!.id, { name: 'New Name' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.name).toBe('New Name');
    });

    it('should update status', async () => {
      const created = await registry.create({ name: 'Corp' });
      const result = await registry.update(created.data!.id, { status: 'suspended' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.status).toBe('suspended');
    });

    it('should merge plan overrides', async () => {
      const created = await registry.create({ name: 'Corp' });
      const result = await registry.update(created.data!.id, {
        plan: { name: 'pro', maxTokensPerDay: 500_000 },
      });
      expect(result.isSuccess).toBe(true);
      expect(result.data!.plan.name).toBe('pro');
      expect(result.data!.plan.maxTokensPerDay).toBe(500_000);
      // Non-overridden fields preserved
      expect(result.data!.plan.maxApiCallsPerMinute).toBe(60);
    });

    it('should merge config overrides additively', async () => {
      const created = await registry.create({
        name: 'Corp',
        configOverrides: { a: 1 },
      });
      const result = await registry.update(created.data!.id, {
        configOverrides: { b: 2 },
      });
      expect(result.data!.configOverrides['a']).toBe(1);
      expect(result.data!.configOverrides['b']).toBe(2);
    });

    it('should merge API keys additively', async () => {
      const created = await registry.create({
        name: 'Corp',
        apiKeys: { anthropic: 'key-a' },
      });
      const result = await registry.update(created.data!.id, {
        apiKeys: { openai: 'key-o' },
      });
      expect(result.data!.apiKeys['anthropic']).toBe('key-a');
      expect(result.data!.apiKeys['openai']).toBe('key-o');
    });

    it('should update updatedAt timestamp', async () => {
      const created = await registry.create({ name: 'Corp' });
      const original = created.data!.updatedAt;
      // Small delay to ensure different timestamp
      await new Promise((r) => setTimeout(r, 10));
      const result = await registry.update(created.data!.id, { name: 'Updated' });
      expect(result.data!.updatedAt).not.toBe(original);
    });

    it('should return NOT_FOUND for unknown ID', async () => {
      const result = await registry.update('nonexistent', { name: 'Nope' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('deactivate', () => {
    it('should set status to inactive', async () => {
      const created = await registry.create({ name: 'Corp' });
      const result = await registry.deactivate(created.data!.id);
      expect(result.isSuccess).toBe(true);
      expect(result.data!.status).toBe('inactive');
    });

    it('should return NOT_FOUND for unknown ID', async () => {
      const result = await registry.deactivate('nonexistent');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('count', () => {
    it('should count all tenants', async () => {
      await registry.create({ name: 'A' });
      await registry.create({ name: 'B' });
      expect(await registry.count()).toBe(2);
    });

    it('should count by status', async () => {
      const t = await registry.create({ name: 'A' });
      await registry.create({ name: 'B' });
      await registry.deactivate(t.data!.id);
      expect(await registry.count('active')).toBe(1);
      expect(await registry.count('inactive')).toBe(1);
    });

    it('should return 0 for empty registry', async () => {
      expect(await registry.count()).toBe(0);
    });
  });

  describe('clear', () => {
    it('should remove all tenants', async () => {
      await registry.create({ name: 'A' });
      await registry.create({ name: 'B' });
      registry.clear();
      expect(await registry.count()).toBe(0);
    });
  });
});
