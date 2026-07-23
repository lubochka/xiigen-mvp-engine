/**
 * Tests for InMemoryProjectTrackerProvider.
 * Verifies CRUD, time logging, tenant isolation, and DNA compliance.
 */

import { InMemoryProjectTrackerProvider } from '../../src/fabrics/project-tracker/in-memory-tracker.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';

function mockCls(tenantId: string) {
  const tenant = new TenantContext({
    id: tenantId,
    name: `T-${tenantId}`,
    status: 'active',
    plan: { ...DEFAULT_PLAN },
    configOverrides: {},
    apiKeys: {},
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });
  return {
    get: jest
      .fn()
      .mockImplementation((key: string) => (key === TENANT_CONTEXT_KEY ? tenant : undefined)),
  } as any;
}

function mockClsEmpty() {
  return { get: jest.fn().mockReturnValue(undefined) } as any;
}

describe('InMemoryProjectTrackerProvider', () => {
  describe('createCard()', () => {
    it('creates a card and returns card_id', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const result = await svc.createCard({ title: 'FLOW-0 Phase A', description: 'Bootstrap' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!['card_id']).toBeDefined();
      expect(result.data!['title']).toBe('FLOW-0 Phase A');
      expect(result.data!['status']).toBe('todo');
      expect(result.data!['connection_type']).toBe('TENANT_PRIVATE');
    });

    it('uses provided status when given', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const result = await svc.createCard({ title: 'Done task', status: 'done' });
      expect(result.data!['status']).toBe('done');
    });

    it('fails when no tenant context', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockClsEmpty());
      const result = await svc.createCard({ title: 'test' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });

    it('stamps tenant_id on the card', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('acme'));
      const result = await svc.createCard({ title: 'test' });
      expect(result.data!['tenant_id']).toBe('acme');
    });
  });

  describe('getCard()', () => {
    it('retrieves a created card', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const created = await svc.createCard({ title: 'My card' });
      const cardId = created.data!['card_id'] as string;

      const fetched = await svc.getCard(cardId);
      expect(fetched.isSuccess).toBe(true);
      expect(fetched.data!['title']).toBe('My card');
    });

    it('returns NOT_FOUND for unknown card', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const result = await svc.getCard('nonexistent-id');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('fails with INVALID_ID for empty cardId', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const result = await svc.getCard('');
      expect(result.errorCode).toBe('INVALID_ID');
    });
  });

  describe('updateCard()', () => {
    it('updates card fields', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const created = await svc.createCard({ title: 'Original' });
      const cardId = created.data!['card_id'] as string;

      const updated = await svc.updateCard(cardId, { status: 'in_progress', title: 'Updated' });
      expect(updated.isSuccess).toBe(true);
      expect(updated.data!['status']).toBe('in_progress');
      expect(updated.data!['title']).toBe('Updated');
    });

    it('preserves card_id and tenant_id on update', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const created = await svc.createCard({ title: 'test' });
      const cardId = created.data!['card_id'] as string;

      const updated = await svc.updateCard(cardId, { card_id: 'hacked', tenant_id: 'evil' });
      expect(updated.data!['card_id']).toBe(cardId);
      expect(updated.data!['tenant_id']).toBe('t1');
    });

    it('returns NOT_FOUND for missing card', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const result = await svc.updateCard('missing', { status: 'done' });
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('logTime()', () => {
    it('logs time on a card', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const created = await svc.createCard({ title: 'task' });
      const cardId = created.data!['card_id'] as string;

      const result = await svc.logTime(cardId, 90);
      expect(result.isSuccess).toBe(true);
    });

    it('rejects zero minutes', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const created = await svc.createCard({ title: 'task' });
      const cardId = created.data!['card_id'] as string;

      const result = await svc.logTime(cardId, 0);
      expect(result.errorCode).toBe('INVALID_MINUTES');
    });

    it('rejects negative minutes', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const created = await svc.createCard({ title: 'task' });
      const cardId = created.data!['card_id'] as string;

      const result = await svc.logTime(cardId, -10);
      expect(result.errorCode).toBe('INVALID_MINUTES');
    });

    it('fails on missing card', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const result = await svc.logTime('nonexistent', 30);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('listCards()', () => {
    it('returns all tenant cards when filter is empty', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      await svc.createCard({ title: 'Card 1' });
      await svc.createCard({ title: 'Card 2' });

      const result = await svc.listCards({});
      expect(result.isSuccess).toBe(true);
      expect(result.data!.length).toBe(2);
    });

    it('filters by status', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      await svc.createCard({ title: 'Todo card', status: 'todo' });
      await svc.createCard({ title: 'Done card', status: 'done' });

      const result = await svc.listCards({ status: 'done' });
      expect(result.data!.length).toBe(1);
      expect(result.data![0]['title']).toBe('Done card');
    });
  });

  describe('Tenant isolation (DNA-5)', () => {
    it('tenant A cannot see tenant B cards via getCard', async () => {
      const svcA = new InMemoryProjectTrackerProvider(mockCls('tenant-a'));
      const created = await svcA.createCard({ title: 'A card' });
      const cardId = created.data!['card_id'] as string;

      const svcB = new InMemoryProjectTrackerProvider(mockCls('tenant-b'));
      const result = await svcB.getCard(cardId);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('tenant A cannot see tenant B cards via listCards', async () => {
      const svcA = new InMemoryProjectTrackerProvider(mockCls('tenant-a'));
      await svcA.createCard({ title: 'A card' });

      const svcB = new InMemoryProjectTrackerProvider(mockCls('tenant-b'));
      const result = await svcB.listCards({});
      expect(result.data!.length).toBe(0);
    });

    it('tenant B cannot update tenant A cards', async () => {
      const svcA = new InMemoryProjectTrackerProvider(mockCls('tenant-a'));
      const created = await svcA.createCard({ title: 'A card' });
      const cardId = created.data!['card_id'] as string;

      const svcB = new InMemoryProjectTrackerProvider(mockCls('tenant-b'));
      const result = await svcB.updateCard(cardId, { status: 'done' });
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('connectionType compliance', () => {
    it('sets connection_type to TENANT_PRIVATE on every card', async () => {
      const svc = new InMemoryProjectTrackerProvider(mockCls('t1'));
      const result = await svc.createCard({ title: 'test' });
      expect(result.data!['connection_type']).toBe('TENANT_PRIVATE');
    });
  });
});
