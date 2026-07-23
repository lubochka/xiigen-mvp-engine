/**
 * Tests for EsProjectTrackerProvider.
 * Uses a mock IDatabaseService to verify ES delegation and tenant isolation.
 */

import { EsProjectTrackerProvider } from '../../src/fabrics/project-tracker/es-tracker.provider';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import { DataProcessResult } from '../../src/kernel/data-process-result';

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

function makeMockDb() {
  const store = new Map<string, Record<string, unknown>>();
  return {
    storeDocument: jest
      .fn()
      .mockImplementation(async (index: string, doc: Record<string, unknown>, id?: string) => {
        const docId = (id ?? doc['card_id']) as string;
        store.set(docId, structuredClone(doc));
        return DataProcessResult.success(doc);
      }),
    getDocument: jest.fn().mockImplementation(async (_index: string, id: string) => {
      const doc = store.get(id);
      return doc
        ? DataProcessResult.success(structuredClone(doc))
        : DataProcessResult.failure('NOT_FOUND', `Doc '${id}' not found`);
    }),
    searchDocuments: jest
      .fn()
      .mockImplementation(async (_index: string, filter: Record<string, unknown>) => {
        const results = Array.from(store.values()).filter((doc) =>
          Object.entries(filter).every(([k, v]) => doc[k] === v),
        );
        return DataProcessResult.success(results);
      }),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    _store: store,
  } as any;
}

describe('EsProjectTrackerProvider', () => {
  describe('createCard()', () => {
    it('stores a card in database and returns it with card_id', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('t1'));

      const result = await svc.createCard({ title: 'FLOW-0 Phase A' });
      expect(result.isSuccess).toBe(true);
      expect(result.data!['card_id']).toBeDefined();
      expect(result.data!['title']).toBe('FLOW-0 Phase A');
      expect(result.data!['status']).toBe('todo');
      expect(result.data!['connection_type']).toBe('TENANT_PRIVATE');
      expect(db.storeDocument).toHaveBeenCalledWith(
        'xiigen-project-cards',
        expect.objectContaining({ title: 'FLOW-0 Phase A' }),
        expect.any(String),
      );
    });

    it('fails when no tenant context', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockClsEmpty());
      const result = await svc.createCard({ title: 'test' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NO_TENANT');
    });

    it('stamps tenant_id on the card', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('acme'));
      const result = await svc.createCard({ title: 'test' });
      expect(result.data!['tenant_id']).toBe('acme');
    });
  });

  describe('getCard()', () => {
    it('retrieves a stored card', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('t1'));
      const created = await svc.createCard({ title: 'my card' });
      const cardId = created.data!['card_id'] as string;

      const result = await svc.getCard(cardId);
      expect(result.isSuccess).toBe(true);
      expect(result.data!['title']).toBe('my card');
    });

    it('returns NOT_FOUND for unknown card', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('t1'));
      const result = await svc.getCard('nonexistent');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });
  });

  describe('Tenant isolation (DNA-5)', () => {
    it('cannot retrieve another tenant card via getCard', async () => {
      const db = makeMockDb();
      const svcA = new EsProjectTrackerProvider(db, mockCls('tenant-a'));
      const created = await svcA.createCard({ title: 'A card' });
      const cardId = created.data!['card_id'] as string;

      const svcB = new EsProjectTrackerProvider(db, mockCls('tenant-b'));
      const result = await svcB.getCard(cardId);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('NOT_FOUND');
    });

    it('listCards always includes tenant_id in ES filter', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('t1'));
      await svc.listCards({ status: 'todo' });

      expect(db.searchDocuments).toHaveBeenCalledWith(
        'xiigen-project-cards',
        expect.objectContaining({ tenant_id: 't1' }),
      );
    });
  });

  describe('logTime()', () => {
    it('appends time entry to card', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('t1'));
      const created = await svc.createCard({ title: 'task' });
      const cardId = created.data!['card_id'] as string;

      const result = await svc.logTime(cardId, 60);
      expect(result.isSuccess).toBe(true);

      // Verify card was updated with time_log
      expect(db.storeDocument).toHaveBeenLastCalledWith(
        'xiigen-project-cards',
        expect.objectContaining({
          time_log: expect.arrayContaining([expect.objectContaining({ minutes: 60 })]),
        }),
        cardId,
      );
    });

    it('rejects invalid minutes', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('t1'));
      const created = await svc.createCard({ title: 'task' });
      const cardId = created.data!['card_id'] as string;

      expect((await svc.logTime(cardId, 0)).errorCode).toBe('INVALID_MINUTES');
      expect((await svc.logTime(cardId, -5)).errorCode).toBe('INVALID_MINUTES');
    });
  });

  describe('connectionType compliance', () => {
    it('sets connection_type to TENANT_PRIVATE', async () => {
      const db = makeMockDb();
      const svc = new EsProjectTrackerProvider(db, mockCls('t1'));
      const result = await svc.createCard({ title: 'test' });
      expect(result.data!['connection_type']).toBe('TENANT_PRIVATE');
    });
  });
});
