import { DpoTrainingDataService } from './dpo-training-data.service';
import { DataProcessResult } from '../kernel/data-process-result';

describe('DpoTrainingDataService', () => {
  let service: DpoTrainingDataService;

  const mockDb = {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  };

  /** Minimal valid DpoTripleInput with all required P18 fields. */
  const baseInput = {
    runId: 'r1',
    flowId: 'FLOW-01',
    taskTypeId: 'T47',
    tenantId: 'acme',
    prompt: { system: null, user: 'Generate a user registration service' },
    chosen: 'class UserRegistrationService extends MicroserviceBase {}',
    rejected: 'class UserRegistrationService {}',
    score: 0.85,
    modelComparison: null,
    tripleStatus: 'ACCEPTED' as const,
    // P18 teaching fields
    curriculumTier: 1 as const,
    targetModelFamily: 'deepseek-coder-v2',
    instructionFormat: 'deepseek-coder',
    distillationReadiness: 'READY' as const,
    shadowRunId: null,
    domain: null,
    entityType: null,
    conflictType: null,
    ftId: null,
    productScope: null,
  };

  beforeEach(() => {
    jest.clearAllMocks();
    service = new DpoTrainingDataService(mockDb as any);
  });

  describe('storeTriple', () => {
    it('assigns tripleId and createdAt', async () => {
      const result = await service.storeTriple(baseInput);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.tripleId).toBeDefined();
      expect(result.data?.createdAt).toBeDefined();
    });

    it('all 5 domain-context fields default to null', async () => {
      const result = await service.storeTriple(baseInput);
      expect(result.data?.domain).toBeNull();
      expect(result.data?.entityType).toBeNull();
      expect(result.data?.conflictType).toBeNull();
      expect(result.data?.ftId).toBeNull();
      expect(result.data?.productScope).toBeNull();
    });

    it('preserves domain-context fields when provided', async () => {
      const result = await service.storeTriple({
        ...baseInput,
        domain: 'financial_saga',
        conflictType: 'audit_first_vs_eligibility',
        ftId: 'ft-run-001',
        productScope: 'xiigen-wave-3',
      });
      expect(result.data?.domain).toBe('financial_saga');
      expect(result.data?.conflictType).toBe('audit_first_vs_eligibility');
      expect(result.data?.ftId).toBe('ft-run-001');
      expect(result.data?.productScope).toBe('xiigen-wave-3');
    });

    it('P18: triple includes curriculumTier', async () => {
      const result = await service.storeTriple(baseInput);
      expect(result.data?.curriculumTier).toBe(1);
    });

    it('P18: triple includes distillationReadiness', async () => {
      const result = await service.storeTriple(baseInput);
      expect(result.data?.distillationReadiness).toBe('READY');
    });
  });

  describe('getTripleCount (legacy — no scope filter)', () => {
    it('returns 0 when no triples', async () => {
      const result = await service.getTripleCount('FLOW-01', 'acme');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(0);
    });

    it('returns count of matching-tenant triples', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([
          { tripleId: '1', knowledgeScope: 'PRIVATE', tenantId: 'acme' },
          { tripleId: '2', knowledgeScope: 'PRIVATE', tenantId: 'acme' },
        ]),
      );
      const result = await service.getTripleCount('FLOW-01', 'acme');
      expect(result.data).toBe(2);
    });
  });

  describe('getTriplesByFlow', () => {
    it('returns empty array when no triples', async () => {
      const result = await service.getTriplesByFlow('FLOW-01', 'acme');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('SCOPE-1: PRIVATE triples filtered to caller tenant only', async () => {
      const ownTriple = {
        ...baseInput,
        tripleId: 't1',
        knowledgeScope: 'PRIVATE',
        tenantId: 'acme',
        createdAt: '',
      };
      const otherTriple = {
        ...baseInput,
        tripleId: 't2',
        knowledgeScope: 'PRIVATE',
        tenantId: 'other-tenant',
        createdAt: '',
      };
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([ownTriple, otherTriple]),
      );
      const result = await service.getTriplesByFlow('FLOW-01', 'acme', 'PRIVATE');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0]?.tenantId).toBe('acme');
    });

    it('SCOPE-2: MODULE triples visible to any tenant', async () => {
      const moduleTriple = {
        ...baseInput,
        tripleId: 't3',
        knowledgeScope: 'MODULE',
        tenantId: 'original-owner',
        createdAt: '',
      };
      mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([moduleTriple]));
      const result = await service.getTriplesByFlow('FLOW-01', 'any-tenant', 'MODULE');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.length).toBe(1);
    });

    it('SCOPE-3: default scope (no filter) returns only PRIVATE records for caller tenant', async () => {
      const ownPrivate = {
        ...baseInput,
        tripleId: 't4',
        knowledgeScope: 'PRIVATE',
        tenantId: 'acme',
        createdAt: '',
      };
      const otherPrivate = {
        ...baseInput,
        tripleId: 't5',
        knowledgeScope: 'PRIVATE',
        tenantId: 'other',
        createdAt: '',
      };
      const moduleTriple = {
        ...baseInput,
        tripleId: 't6',
        knowledgeScope: 'MODULE',
        tenantId: 'module-owner',
        createdAt: '',
      };
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([ownPrivate, otherPrivate, moduleTriple]),
      );
      // Default scopeFilter = ['PRIVATE'] — MODULE triple excluded
      const result = await service.getTriplesByFlow('FLOW-01', 'acme');
      expect(result.data?.length).toBe(1);
      expect(result.data?.[0]?.tripleId).toBe('t4');
    });
  });

  describe('getTripleCount', () => {
    it('SCOPE-4: count delegates to getTriplesByFlow scope filter', async () => {
      const ownTriple = {
        ...baseInput,
        tripleId: 'c1',
        knowledgeScope: 'PRIVATE',
        tenantId: 'acme',
        createdAt: '',
      };
      const otherTriple = {
        ...baseInput,
        tripleId: 'c2',
        knowledgeScope: 'PRIVATE',
        tenantId: 'other',
        createdAt: '',
      };
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([ownTriple, otherTriple]),
      );
      const result = await service.getTripleCount('FLOW-01', 'acme', 'PRIVATE');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBe(1);
    });
  });
});
