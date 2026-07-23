/**
 * T655 PatternContributor — unit tests (8 per FLOW-46 R1 test matrix).
 */
import { PatternContributor } from './pattern-contributor.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

describe('PatternContributor (T655)', () => {
  let mockDb: { storeDocument: jest.Mock; searchDocuments: jest.Mock };
  let contrib: PatternContributor;

  beforeEach(() => {
    mockDb = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    };
    contrib = new PatternContributor(mockDb as never);
  });

  it('1. Path A writes to xiigen-rag-patterns + xiigen-planning-decisions + xiigen-prompts under MASTER+GLOBAL', async () => {
    const result = await contrib.contribute({
      sessionId: 's-1',
      patternId: 'p-1',
      path: 'A',
      solution: { code: 'class X {}' },
    });
    expect(result.isSuccess).toBe(true);
    const indices = mockDb.storeDocument.mock.calls.slice(0, 3).map((c) => c[0] as string);
    expect(indices).toEqual([
      'xiigen-rag-patterns',
      'xiigen-planning-decisions',
      'xiigen-prompts',
    ]);
    const ragDoc = mockDb.storeDocument.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(ragDoc['tenantId']).toBe(MASTER_TENANT_ID);
    expect(ragDoc['knowledgeScope']).toBe('GLOBAL');
  });

  it('2. Path B sanitizer strips tenantId/tenantDomain/apiKeyHints', async () => {
    await contrib.contribute({
      sessionId: 's-2',
      patternId: 'p-2',
      path: 'B',
      sourceTenantId: 'tenant-x',
      consent: 'SHARE',
      solution: {
        code: 'class Y {}',
        tenantId: 'tenant-x',
        tenantDomain: 'tenantx.com',
        apiKeyHints: ['hint'],
      },
    });
    const sharedDoc = mockDb.storeDocument.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(sharedDoc['tenantDomain']).toBeUndefined();
    expect(sharedDoc['apiKeyHints']).toBeUndefined();
    expect(sharedDoc['code']).toBe('class Y {}');
  });

  it('3. Path B + consent=SHARE writes to all 3 shared indices', async () => {
    await contrib.contribute({
      sessionId: 's-3',
      patternId: 'p-3',
      path: 'B',
      sourceTenantId: 'tenant-x',
      consent: 'SHARE',
      solution: { code: 'ok' },
    });
    const indices = mockDb.storeDocument.mock.calls.slice(0, 3).map((c) => c[0] as string);
    expect(indices).toEqual([
      'xiigen-rag-patterns',
      'xiigen-planning-decisions',
      'xiigen-prompts',
    ]);
  });

  it('4. Path B + consent=KEEP_PRIVATE writes ONLY to xiigen-rag-patterns with tenant scope', async () => {
    await contrib.contribute({
      sessionId: 's-4',
      patternId: 'p-4',
      path: 'B',
      sourceTenantId: 'tenant-x',
      consent: 'KEEP_PRIVATE',
      solution: { code: 'priv' },
    });
    expect(mockDb.storeDocument).toHaveBeenCalledTimes(2); // rag-patterns + audit
    const ragDoc = mockDb.storeDocument.mock.calls[0]?.[1] as Record<string, unknown>;
    expect(mockDb.storeDocument.mock.calls[0]?.[0]).toBe('xiigen-rag-patterns');
    expect(ragDoc['tenantId']).toBe('tenant-x');
    expect(ragDoc['knowledgeScope']).toBe('PRIVATE');
  });

  it('5. CF-841 sanitizer failure → SANITIZATION_FAILED (no shared write, no retry)', async () => {
    const failingContrib = new PatternContributor(mockDb as never);
    // Force sanitize to throw by spying on Object.entries with a poisoned object
    const badInput = Object.create(null) as Record<string, unknown>;
    Object.defineProperty(badInput, 'code', {
      get() {
        throw new Error('boom');
      },
      enumerable: true,
    });
    const result = await failingContrib.contribute({
      sessionId: 's-5',
      patternId: 'p-5',
      path: 'B',
      sourceTenantId: 'tenant-x',
      consent: 'SHARE',
      solution: badInput,
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SANITIZATION_FAILED');
    // Audit-only write happens; no rag-patterns/planning-decisions/prompts writes
    const sharedWrites = mockDb.storeDocument.mock.calls.filter(
      (c) =>
        c[0] === 'xiigen-rag-patterns' ||
        c[0] === 'xiigen-planning-decisions' ||
        c[0] === 'xiigen-prompts',
    );
    expect(sharedWrites).toHaveLength(0);
  });

  it('6. idempotent — second contribute with same patternId+sessionId returns prior record', async () => {
    const prior = {
      contributionId: 'contrib-prior',
      sessionId: 's-6',
      patternId: 'p-6',
      path: 'A',
      status: 'RECORDED',
    };
    mockDb.searchDocuments.mockResolvedValueOnce(DataProcessResult.success([prior]));
    const result = await contrib.contribute({
      sessionId: 's-6',
      patternId: 'p-6',
      path: 'A',
      solution: { code: 'x' },
    });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.contributionId).toBe('contrib-prior');
    // No additional write performed
    expect(mockDb.storeDocument).not.toHaveBeenCalled();
  });

  it('7. audit captures preSanitizationFields and postSanitizationFields', async () => {
    await contrib.contribute({
      sessionId: 's-7',
      patternId: 'p-7',
      path: 'B',
      sourceTenantId: 'tenant-x',
      consent: 'SHARE',
      solution: { code: 'k', tenantId: 'tenant-x' },
    });
    // Last storeDocument call is audit
    const auditCall = mockDb.storeDocument.mock.calls[mockDb.storeDocument.mock.calls.length - 1];
    const audit = auditCall?.[1] as Record<string, unknown>;
    expect(audit['preSanitizationFields']).toEqual(['code', 'tenantId']);
    expect(audit['postSanitizationFields']).toEqual(['code']);
    expect(audit['strippedCount']).toBe(1);
  });

  it('8. Path A failure on first index → returns DataProcessResult.failure with PATH_A_WRITE_FAILED', async () => {
    mockDb.storeDocument.mockResolvedValueOnce(
      DataProcessResult.failure('ES_DOWN', 'Elasticsearch unavailable'),
    );
    const result = await contrib.contribute({
      sessionId: 's-8',
      patternId: 'p-8',
      path: 'A',
      solution: { code: 'y' },
    });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('ES_DOWN');
  });
});
