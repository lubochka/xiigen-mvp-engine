/**
 * Unit tests for RagQueryHandler — 9 tests
 *
 * Tests:
 *   1. reformulate: returns original stepText when stepText is empty
 *   2. reformulate: returns original stepText when stepText is whitespace-only
 *   3. reformulate: calls judgeAi.generate with systemPrompt and user content containing step
 *   4. reformulate: includes constraints in AI prompt when provided
 *   5. reformulate: includes prevCycleSummaries in AI prompt when provided
 *   6. reformulate: uses reformulatedQuery from AI JSON response
 *   7. reformulate: graceful degradation — returns original stepText when AI parse fails
 *   8. reformulate: graceful degradation — returns original stepText when AI returns failure
 *   9. reformulate: DNA-8 stores to xiigen-rag-queries before returning
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { RagQueryHandler } from './rag-query.handler';
import { IAiProvider } from '../../fabrics/interfaces/ai-provider.interface';
import { IDatabaseService } from '../../fabrics/interfaces/database.interface';

function makeMockAi(responseText?: string, success = true): IAiProvider {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(
        success
          ? DataProcessResult.success({ text: responseText ?? '{}' })
          : DataProcessResult.failure('AI_ERROR', 'AI failed'),
      ),
  } as unknown as IAiProvider;
}

function makeMockDb(): IDatabaseService {
  return {
    storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
    deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
    createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
  } as unknown as IDatabaseService;
}

describe('RagQueryHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('reformulate: returns original stepText when stepText is empty', async () => {
    const ai = makeMockAi();
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    const result = await handler.reformulate({ stepText: '', constraints: [] }, 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.reformulatedQuery).toBe('');
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('reformulate: returns original stepText when stepText is whitespace-only', async () => {
    const ai = makeMockAi();
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    const result = await handler.reformulate({ stepText: '   ', constraints: [] }, 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.reformulatedQuery).toBe('   ');
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('reformulate: calls judgeAi.generate with systemPrompt and user content containing step', async () => {
    const ai = makeMockAi(
      '{"reformulatedQuery":"pattern-level query","queryRationale":"rationale"}',
    );
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    await handler.reformulate({ stepText: 'Build email service', constraints: [] }, 'tenant-acme');

    expect(ai.generate).toHaveBeenCalledWith(
      expect.stringContaining('Build email service'),
      expect.objectContaining({ systemPrompt: expect.any(String) }),
    );
  });

  it('reformulate: includes constraints in AI prompt when provided', async () => {
    const ai = makeMockAi('{"reformulatedQuery":"query","queryRationale":"rationale"}');
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    await handler.reformulate(
      { stepText: 'Build service', constraints: ['must be idempotent', 'max 3 retries'] },
      'tenant-acme',
    );

    const promptArg = (ai.generate as jest.Mock).mock.calls[0]?.[0] as string;
    expect(promptArg).toContain('must be idempotent');
    expect(promptArg).toContain('max 3 retries');
  });

  it('reformulate: includes prevCycleSummaries in AI prompt when provided', async () => {
    const ai = makeMockAi('{"reformulatedQuery":"query","queryRationale":"rationale"}');
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    await handler.reformulate(
      {
        stepText: 'Build service',
        constraints: [],
        prevCycleSummaries: ['Step 1 decided to use event sourcing', 'Step 2 chose CQRS'],
      },
      'tenant-acme',
    );

    const promptArg = (ai.generate as jest.Mock).mock.calls[0]?.[0] as string;
    expect(promptArg).toContain('event sourcing');
    expect(promptArg).toContain('CQRS');
  });

  it('reformulate: uses reformulatedQuery from AI JSON response', async () => {
    const ai = makeMockAi(
      '{"reformulatedQuery":"idempotent write-back pattern with at-least-once delivery","queryRationale":"captures failure modes"}',
    );
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    const result = await handler.reformulate(
      { stepText: 'Build service', constraints: [] },
      'tenant-acme',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data?.reformulatedQuery).toBe(
      'idempotent write-back pattern with at-least-once delivery',
    );
    expect(result.data?.queryRationale).toBe('captures failure modes');
    expect(result.data?.originalStepText).toBe('Build service');
  });

  it('reformulate: graceful degradation — returns original stepText when AI parse fails', async () => {
    const ai = makeMockAi('not valid json at all');
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    const result = await handler.reformulate(
      { stepText: 'Build service', constraints: [] },
      'tenant-acme',
    );

    expect(result.isSuccess).toBe(true);
    // Falls back to original step text
    expect(result.data?.reformulatedQuery).toBe('Build service');
  });

  it('reformulate: graceful degradation — returns original stepText when AI returns failure', async () => {
    const ai = makeMockAi(undefined, false);
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    const result = await handler.reformulate(
      { stepText: 'Build service', constraints: [] },
      'tenant-acme',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data?.reformulatedQuery).toBe('Build service');
  });

  it('reformulate: DNA-8 stores to xiigen-rag-queries before returning', async () => {
    const ai = makeMockAi('{"reformulatedQuery":"pattern query","queryRationale":"r"}');
    const db = makeMockDb();
    const handler = new RagQueryHandler(ai, db);

    await handler.reformulate({ stepText: 'Build service', constraints: [] }, 'tenant-acme');

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-rag-queries',
      expect.objectContaining({
        stepText: 'Build service',
        reformulatedQuery: 'pattern query',
        tenantId: 'tenant-acme',
      }),
      expect.any(String),
    );
  });
});
