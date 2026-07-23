/**
 * BfaCrossFlowValidator — unit tests.
 * S11: Cross-flow BFA validation + registration persistence.
 */
import { BfaCrossFlowValidator } from './bfa-cross-flow-validator';
import { DataProcessResult } from '../kernel/data-process-result';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

const makeRegistration = (
  entities: string[] = [],
  events: string[] = [],
  apiRoutes: string[] = [],
) => ({
  entities,
  events,
  apiRoutes,
});

describe('BfaCrossFlowValidator', () => {
  let validator: BfaCrossFlowValidator;

  beforeEach(() => {
    jest.clearAllMocks();
    validator = new BfaCrossFlowValidator(mockDb as any);
  });

  // ─── validate ────────────────────────────────────────────────────────────

  describe('validate', () => {
    it('returns failure for missing flowId', async () => {
      const result = await validator.validate('', makeRegistration());
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('passes when no existing flows registered', async () => {
      // searchDocuments returns [] (no ACTIVE flows)
      const result = await validator.validate('FLOW-NEW', makeRegistration(['Order']));
      expect(result.isSuccess).toBe(true);
      expect(result.data?.passed).toBe(true);
      expect(result.data?.checkedAgainst).toBe(0);
      expect(result.data?.errors).toBe(0);
    });

    it('passes when existing flow has no conflicting entities', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([{ flowId: 'FLOW-01', status: 'ACTIVE' }]),
      );
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success(makeRegistration(['Product'], [], [])),
      );
      const result = await validator.validate('FLOW-NEW', makeRegistration(['Order']));
      expect(result.isSuccess).toBe(true);
      expect(result.data?.passed).toBe(true);
      expect(result.data?.checkedAgainst).toBe(1);
      expect(result.data?.errors).toBe(0);
    });

    it('fails with error when entity conflict detected', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([{ flowId: 'FLOW-01', status: 'ACTIVE' }]),
      );
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success(makeRegistration(['Order'], [], [])),
      );
      const result = await validator.validate('FLOW-NEW', makeRegistration(['Order']));
      expect(result.isSuccess).toBe(true);
      expect(result.data?.passed).toBe(false);
      expect(result.data?.errors).toBe(1);
      expect(result.data?.conflicts[0].conflictType).toBe('entity');
      expect(result.data?.conflicts[0].severity).toBe('error');
    });

    it('warns (not fails) on duplicate event publisher', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([{ flowId: 'FLOW-01', status: 'ACTIVE' }]),
      );
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success(makeRegistration([], ['order.created'], [])),
      );
      const result = await validator.validate('FLOW-NEW', makeRegistration([], ['order.created']));
      expect(result.isSuccess).toBe(true);
      expect(result.data?.passed).toBe(true); // warnings don't block
      expect(result.data?.warnings).toBe(1);
      expect(result.data?.errors).toBe(0);
    });

    it('fails with error on API route collision', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([{ flowId: 'FLOW-01', status: 'ACTIVE' }]),
      );
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success(makeRegistration([], [], ['/api/orders'])),
      );
      const result = await validator.validate(
        'FLOW-NEW',
        makeRegistration([], [], ['/api/orders']),
      );
      expect(result.isSuccess).toBe(true);
      expect(result.data?.passed).toBe(false);
      expect(result.data?.errors).toBe(1);
      expect(result.data?.conflicts[0].conflictType).toBe('api_route');
    });

    it('skips flows missing a BFA registration in xiigen-bfa-registrations', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([
          { flowId: 'FLOW-01', status: 'ACTIVE' },
          { flowId: 'FLOW-02', status: 'ACTIVE' },
        ]),
      );
      // FLOW-01: has registration; FLOW-02: missing
      mockDb.getDocument
        .mockResolvedValueOnce(DataProcessResult.success(makeRegistration(['Foo'])))
        .mockResolvedValueOnce(DataProcessResult.failure('NOT_FOUND', 'missing'));

      const result = await validator.validate('FLOW-NEW', makeRegistration(['Bar']));
      expect(result.isSuccess).toBe(true);
      expect(result.data?.checkedAgainst).toBe(1); // only FLOW-01 counted
    });

    it('skips self when flowId appears in existing flows', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([
          { flowId: 'FLOW-NEW', status: 'ACTIVE' }, // self — should be skipped
          { flowId: 'FLOW-01', status: 'ACTIVE' },
        ]),
      );
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success(makeRegistration(['Widget'])),
      );
      const result = await validator.validate('FLOW-NEW', makeRegistration(['Widget']));
      // FLOW-NEW is skipped, FLOW-01 has Widget — conflict
      expect(result.data?.passed).toBe(false);
      expect(result.data?.checkedAgainst).toBe(1);
    });

    it('includes validatedAt timestamp in report', async () => {
      const result = await validator.validate('FLOW-NEW', makeRegistration());
      expect(result.data?.validatedAt).toBeDefined();
      expect(new Date(result.data!.validatedAt).getTime()).not.toBeNaN();
    });
  });

  // ─── storeBfaRegistration ─────────────────────────────────────────────────

  describe('storeBfaRegistration', () => {
    it('returns failure for missing flowId', async () => {
      const result = await validator.storeBfaRegistration('', makeRegistration());
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_FLOW_ID');
    });

    it('stores registration in xiigen-bfa-registrations', async () => {
      const result = await validator.storeBfaRegistration('FLOW-01', makeRegistration(['Order']));
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(true);
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-bfa-registrations',
        expect.objectContaining({ flowId: 'FLOW-01', entities: ['Order'] }),
        'FLOW-01',
      );
    });

    it('returns failure when db write fails', async () => {
      mockDb.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'write failed'),
      );
      const result = await validator.storeBfaRegistration('FLOW-01', makeRegistration());
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DB_ERROR');
    });
  });
});
