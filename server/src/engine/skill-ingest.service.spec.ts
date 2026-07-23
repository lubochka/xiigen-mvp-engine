/**
 * SkillIngestService — unit tests.
 * S7: Skill block persistence to xiigen-skills.
 */
import { SkillIngestService } from './skill-ingest.service';
import { DataProcessResult } from '../kernel/data-process-result';

const mockDb = {
  storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', 'not found')),
  searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
  bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({ indexed: 2, failed: 0 })),
  countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
};

const validBlock = {
  skillId: 'SK-01',
  name: 'DataProcessResult Pattern',
  description: 'Use DataProcessResult for all service returns',
  tags: ['dna', 'result'],
  namespace: 'engine',
  content: 'return DataProcessResult.success(data)',
  version: '1.0.0',
};

describe('SkillIngestService', () => {
  let svc: SkillIngestService;

  beforeEach(() => {
    jest.clearAllMocks();
    svc = new SkillIngestService(mockDb as any);
  });

  // ─── indexSkillBlock ─────────────────────────────────────────────────────

  describe('indexSkillBlock', () => {
    it('returns failure for missing required fields', async () => {
      const result = await svc.indexSkillBlock({ ...validBlock, skillId: '' });
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_PARAMS');
    });

    it('returns failure when db write fails', async () => {
      mockDb.storeDocument.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'write failed'),
      );
      const result = await svc.indexSkillBlock(validBlock);
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('DB_ERROR');
    });

    it('stores skill in xiigen-skills and returns record', async () => {
      const result = await svc.indexSkillBlock(validBlock);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.skillId).toBe('SK-01');
      expect(result.data?.createdAt).toBeDefined();
      expect(mockDb.storeDocument).toHaveBeenCalledWith(
        'xiigen-skills',
        expect.objectContaining({ skillId: 'SK-01' }),
        'SK-01',
      );
    });
  });

  // ─── bulkIndexSkills ─────────────────────────────────────────────────────

  describe('bulkIndexSkills', () => {
    it('returns indexed=0 for empty array', async () => {
      const result = await svc.bulkIndexSkills([]);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.indexed).toBe(0);
    });

    it('returns failure when bulkStore fails', async () => {
      mockDb.bulkStore.mockResolvedValueOnce(DataProcessResult.failure('DB_ERROR', 'bulk failed'));
      const result = await svc.bulkIndexSkills([validBlock, validBlock]);
      expect(result.isSuccess).toBe(false);
    });

    it('returns indexed/failed counts on success', async () => {
      const result = await svc.bulkIndexSkills([validBlock, validBlock]);
      expect(result.isSuccess).toBe(true);
      expect(result.data?.indexed).toBe(2);
      expect(result.data?.failed).toBe(0);
    });
  });

  // ─── searchSkills ─────────────────────────────────────────────────────────

  describe('searchSkills', () => {
    it('returns empty array when db fails', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.failure('DB_ERROR', 'search failed'),
      );
      const result = await svc.searchSkills({ namespace: 'engine' });
      expect(result.isSuccess).toBe(true);
      expect(result.data).toEqual([]);
    });

    it('passes namespace and tags as filters', async () => {
      mockDb.searchDocuments.mockResolvedValueOnce(
        DataProcessResult.success([{ skillId: 'SK-01' }]),
      );
      const result = await svc.searchSkills({ namespace: 'engine', tags: ['dna'] });
      expect(result.isSuccess).toBe(true);
      expect(mockDb.searchDocuments).toHaveBeenCalledWith(
        'xiigen-skills',
        { namespace: 'engine', tags: ['dna'] },
        20,
      );
    });
  });

  // ─── getSkill ─────────────────────────────────────────────────────────────

  describe('getSkill', () => {
    it('returns failure for missing skillId', async () => {
      const result = await svc.getSkill('');
      expect(result.isSuccess).toBe(false);
      expect(result.errorCode).toBe('MISSING_SKILL_ID');
    });

    it('returns null when not found', async () => {
      const result = await svc.getSkill('SK-99');
      expect(result.isSuccess).toBe(true);
      expect(result.data).toBeNull();
    });

    it('returns skill block when found', async () => {
      mockDb.getDocument.mockResolvedValueOnce(
        DataProcessResult.success({ skillId: 'SK-01', name: 'test' }),
      );
      const result = await svc.getSkill('SK-01');
      expect(result.isSuccess).toBe(true);
      expect(result.data?.skillId).toBe('SK-01');
    });
  });
});
