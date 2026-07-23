/**
 * Cycle4Controller unit tests — GAP-V-03
 *
 * Covers:
 *   - GET /api/cycle-4/pending — happy path, missing flowId, db failure
 *   - GET with depth filter
 *   - PATCH /api/cycle-4/:id — happy path, not found, missing status
 *   - DNA-3: never throws, always returns { error, code } on failure
 */

import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { Cycle4Controller } from './cycle4.controller';

const PENDING_RECORD: Record<string, unknown> = {
  id: 'abc-123',
  station: 'CYCLE-4',
  flowId: 'FLOW-01',
  status: 'PENDING_IMPLEMENTATION',
  nodeSpec: '{ "structure": {} }',
  implementingModel: 'claude-code',
  targetGrade: 0.95,
  depth: 0,
  stepText: 'verify email before granting access',
  timestamp: '2026-04-06T00:00:00.000Z',
};

function makeMockDb(
  overrides: Partial<{
    searchDocuments: jest.Mock;
    getDocument: jest.Mock;
    storeDocument: jest.Mock;
  }> = {},
) {
  return {
    searchDocuments:
      overrides.searchDocuments ??
      jest.fn().mockResolvedValue(DataProcessResult.success([PENDING_RECORD])),
    getDocument:
      overrides.getDocument ??
      jest.fn().mockResolvedValue(DataProcessResult.success(PENDING_RECORD)),
    storeDocument:
      overrides.storeDocument ??
      jest
        .fn()
        .mockResolvedValue(DataProcessResult.success({ ...PENDING_RECORD, status: 'COMPLETE' })),
  };
}

describe('Cycle4Controller', () => {
  // ── GET /api/cycle-4/pending ──────────────────────────────────────────────

  describe('getPending', () => {
    it('returns records for a valid flowId', async () => {
      const db = makeMockDb();
      const ctrl = new Cycle4Controller(db as any);

      const result = await ctrl.getPending('FLOW-01');

      expect(result).toMatchObject({ flowId: 'FLOW-01', count: 1 });
      expect((result as any).records[0]).toMatchObject({ station: 'CYCLE-4', flowId: 'FLOW-01' });
      expect(db.searchDocuments).toHaveBeenCalledWith(
        'xiigen-training-data',
        expect.objectContaining({
          station: 'CYCLE-4',
          flowId: 'FLOW-01',
          status: 'PENDING_IMPLEMENTATION',
        }),
      );
    });

    it('returns count:0 when no records match', async () => {
      const db = makeMockDb({
        searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      });
      const ctrl = new Cycle4Controller(db as any);

      const result = await ctrl.getPending('FLOW-99');
      expect((result as any).count).toBe(0);
      expect((result as any).records).toHaveLength(0);
    });

    it('returns error when flowId is missing', async () => {
      const ctrl = new Cycle4Controller(makeMockDb() as any);
      const result = await ctrl.getPending('');
      expect((result as any).code).toBe('MISSING_FLOW_ID');
    });

    it('applies depth filter when provided', async () => {
      const db = makeMockDb();
      const ctrl = new Cycle4Controller(db as any);

      await ctrl.getPending('FLOW-01', '0');

      expect(db.searchDocuments).toHaveBeenCalledWith(
        'xiigen-training-data',
        expect.objectContaining({ depth: 0 }),
      );
    });

    it('applies custom status filter when provided', async () => {
      const db = makeMockDb();
      const ctrl = new Cycle4Controller(db as any);

      await ctrl.getPending('FLOW-01', undefined, 'COMPLETE');

      expect(db.searchDocuments).toHaveBeenCalledWith(
        'xiigen-training-data',
        expect.objectContaining({ status: 'COMPLETE' }),
      );
    });

    it('DNA-3: returns error object — never throws — when db.searchDocuments fails', async () => {
      const db = makeMockDb({
        searchDocuments: jest
          .fn()
          .mockResolvedValue(DataProcessResult.failure('DB_ERROR', 'Connection refused')),
      });
      const ctrl = new Cycle4Controller(db as any);

      const result = await ctrl.getPending('FLOW-01');
      expect((result as any).code).toBe('DB_ERROR');
      expect((result as any).error).toBeDefined();
    });
  });

  // ── PATCH /api/cycle-4/:id ────────────────────────────────────────────────

  describe('patch', () => {
    it('updates status and grade for a valid id', async () => {
      const db = makeMockDb();
      const ctrl = new Cycle4Controller(db as any);

      const result = await ctrl.patch('abc-123', { status: 'COMPLETE', grade: 0.92 });

      expect((result as any).updated).toBe(true);
      expect((result as any).status).toBe('COMPLETE');
      expect(db.storeDocument).toHaveBeenCalledWith(
        'xiigen-training-data',
        expect.objectContaining({ status: 'COMPLETE', grade: 0.92 }),
        'abc-123',
      );
    });

    it('stores implementationSummary when provided', async () => {
      const db = makeMockDb();
      const ctrl = new Cycle4Controller(db as any);

      await ctrl.patch('abc-123', {
        status: 'COMPLETE',
        grade: 0.88,
        implementationSummary: 'T47SsoAndEmailAuthService generated',
      });

      expect(db.storeDocument).toHaveBeenCalledWith(
        'xiigen-training-data',
        expect.objectContaining({
          implementationSummary: 'T47SsoAndEmailAuthService generated',
        }),
        'abc-123',
      );
    });

    it('DNA-8: reads existing record BEFORE writing update (getDocument before storeDocument)', async () => {
      const order: string[] = [];
      const db = makeMockDb({
        getDocument: jest.fn().mockImplementationOnce(async () => {
          order.push('get');
          return DataProcessResult.success(PENDING_RECORD);
        }),
        storeDocument: jest.fn().mockImplementationOnce(async () => {
          order.push('store');
          return DataProcessResult.success({});
        }),
      });
      const ctrl = new Cycle4Controller(db as any);

      await ctrl.patch('abc-123', { status: 'COMPLETE' });

      expect(order).toEqual(['get', 'store']);
    });

    it('returns NOT_FOUND when record does not exist', async () => {
      const db = makeMockDb({
        getDocument: jest
          .fn()
          .mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'Record not found')),
      });
      const ctrl = new Cycle4Controller(db as any);

      const result = await ctrl.patch('missing-id', { status: 'COMPLETE' });
      expect((result as any).code).toBe('NOT_FOUND');
    });

    it('returns error when id is empty', async () => {
      const ctrl = new Cycle4Controller(makeMockDb() as any);
      const result = await ctrl.patch('', { status: 'COMPLETE' });
      expect((result as any).code).toBe('MISSING_ID');
    });

    it('returns error when status is missing', async () => {
      const ctrl = new Cycle4Controller(makeMockDb() as any);
      const result = await ctrl.patch('abc-123', { status: '' });
      expect((result as any).code).toBe('MISSING_STATUS');
    });

    it('DNA-3: returns error object — never throws — when db.storeDocument fails', async () => {
      const db = makeMockDb({
        storeDocument: jest
          .fn()
          .mockResolvedValue(DataProcessResult.failure('STORE_FAIL', 'Write error')),
      });
      const ctrl = new Cycle4Controller(db as any);

      const result = await ctrl.patch('abc-123', { status: 'COMPLETE' });
      expect((result as any).error).toBeDefined();
      expect((result as any).code).toBe('STORE_FAIL');
    });
  });
});
