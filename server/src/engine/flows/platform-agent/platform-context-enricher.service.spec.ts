/**
 * T652 PlatformContextEnricher — unit tests (8 per FLOW-46 R1 test matrix).
 */
import { PlatformContextEnricher } from './platform-context-enricher.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

describe('PlatformContextEnricher (T652)', () => {
  let mockDb: { searchDocuments: jest.Mock };
  let enricher: PlatformContextEnricher;

  beforeEach(() => {
    mockDb = {
      searchDocuments: jest
        .fn()
        .mockImplementation(async () => DataProcessResult.success([{ patternId: 'p1' }])),
    };
    enricher = new PlatformContextEnricher(mockDb as never);
  });

  it('1. reads xiigen-rag-patterns with knowledgeScope=GLOBAL + MASTER_TENANT_ID', async () => {
    await enricher.execute({ userIntent: 'add tenant marketplace flow' });
    const [index, filter] = mockDb.searchDocuments.mock.calls[0] as [string, Record<string, unknown>];
    expect(index).toBe('xiigen-rag-patterns');
    expect(filter['knowledgeScope']).toBe('GLOBAL');
    expect(filter['tenantId']).toBe(MASTER_TENANT_ID);
  });

  it('2. filters by keywords extracted from userIntent', async () => {
    await enricher.execute({ userIntent: 'add tenant marketplace flow' });
    const filter = mockDb.searchDocuments.mock.calls[0]?.[1] as Record<string, unknown>;
    const tags = filter['tags'] as string[];
    expect(tags).toContain('tenant');
    expect(tags).toContain('marketplace');
    expect(tags).not.toContain('the');
  });

  it('3. returns platformPatternsMatched count', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.success([{ patternId: 'p1' }, { patternId: 'p2' }]),
    );
    const result = await enricher.execute({ userIntent: 'flow rag' });
    expect(result.data!.platformPatternsMatched).toBe(2);
  });

  it('4. AF-4 patterns[] preserved non-destructively', async () => {
    const af4Patterns = [{ patternId: 'af4-1' }];
    const result = await enricher.execute({ userIntent: 'q', patterns: af4Patterns });
    expect(result.data!.patterns).toBe(af4Patterns);
  });

  it('5. AF-4 linkedModules[] preserved', async () => {
    const af4Modules = [{ moduleId: 'm-1' }];
    const result = await enricher.execute({ userIntent: 'q', linkedModules: af4Modules });
    expect(result.data!.linkedModules).toBe(af4Modules);
  });

  it('6. zero results → platformPatternsMatched:0 (no throw)', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([]));
    const result = await enricher.execute({ userIntent: 'unknown' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.platformPatternsMatched).toBe(0);
    expect(result.data!.platformPatterns).toEqual([]);
  });

  it('7. ES timeout → DataProcessResult.failure(SEARCH_FAILED)', async () => {
    mockDb.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.failure('TIMEOUT', 'request timed out'),
    );
    const result = await enricher.execute({ userIntent: 'q' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SEARCH_FAILED');
  });

  it('8. ranking preserved (pattern order stable)', async () => {
    const ordered = [{ patternId: 'a' }, { patternId: 'b' }, { patternId: 'c' }];
    mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success(ordered));
    const result = await enricher.execute({ userIntent: 'q' });
    expect(result.data!.platformPatterns.map((p) => p['patternId'])).toEqual(['a', 'b', 'c']);
  });
});
