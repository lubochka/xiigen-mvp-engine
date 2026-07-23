/**
 * Unit tests for RagEvaluateHandler — 10 tests
 *
 * Tests:
 *   1. returns empty applicablePatterns immediately when input patterns is empty — no AI call
 *   2. calls AI judge with structured applicability prompt
 *   3. applicable patterns from AI response returned in applicablePatterns[]
 *   4. non-applicable patterns appear in filteredOut[] with reason from AI
 *   5. scope violation: cross-tenant PRIVATE pattern moves to filteredOut
 *   6. GLOBAL pattern passes scope check regardless of tenantId
 *   7. DNA-8: storeDocument to xiigen-rag-evaluations before returning result
 *   8. AI judge failure: returns DataProcessResult.failure without throwing
 *   9. all patterns applicable: filteredOut is empty array not omitted
 *  10. evaluationSummary reflects applicableCount / total count ratio
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../kernel/data-process-result';
import { RagEvaluateHandler, RagEvaluatorInput } from './rag-evaluate.handler';
import { IDatabaseService } from '../../fabrics/interfaces/database.interface';
import { IAiProvider } from '../../fabrics/interfaces/ai-provider.interface';

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

function makeMockAi(responseText?: string): IAiProvider {
  const defaultResponse = JSON.stringify({
    evaluations: [
      { patternId: 'p1', applicable: true, reason: 'Directly relevant' },
      { patternId: 'p2', applicable: false, reason: 'Unrelated domain' },
    ],
  });
  return {
    generate: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        text: responseText ?? defaultResponse,
        model: 'claude-3',
        tokens_used: 50,
      }),
    ),
    generateStructured: jest.fn(),
    getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
  } as unknown as IAiProvider;
}

const PATTERN_P1: Record<string, unknown> = {
  id: 'p1',
  patternId: 'p1',
  tenantId: 'tenant-acme',
  knowledgeScope: 'PRIVATE',
  archetype: 'REGISTRATION',
  codeSnippet: 'email validation pattern',
};

const PATTERN_P2: Record<string, unknown> = {
  id: 'p2',
  patternId: 'p2',
  tenantId: 'tenant-acme',
  knowledgeScope: 'PRIVATE',
  archetype: 'DATA_PIPELINE',
  codeSnippet: 'etl pattern',
};

const BASE_INPUT: RagEvaluatorInput = {
  patterns: [PATTERN_P1, PATTERN_P2],
  stepText: 'Validate the user email address',
  stepContext: 'user registration flow',
};

describe('RagEvaluateHandler', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('returns empty applicablePatterns immediately when input patterns is empty — no AI call', async () => {
    const db = makeMockDb();
    const ai = makeMockAi();
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(
      { patterns: [], stepText: 'validate email', stepContext: '' },
      'tenant-acme',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data?.applicablePatterns).toEqual([]);
    expect(result.data?.filteredOut).toEqual([]);
    expect(result.data?.evaluationSummary).toBe('No patterns to evaluate');
    expect(result.data?.patternCount).toBe(0);
    expect(result.data?.applicableCount).toBe(0);
    expect(ai.generate).not.toHaveBeenCalled();
  });

  it('calls AI judge with structured applicability prompt', async () => {
    const db = makeMockDb();
    const ai = makeMockAi();
    const handler = new RagEvaluateHandler(ai, db);

    await handler.evaluate(BASE_INPUT, 'tenant-acme');

    expect(ai.generate).toHaveBeenCalledTimes(1);
    const [userPrompt, opts] = (ai.generate as jest.Mock).mock.calls[0]!;
    expect(userPrompt).toContain('Validate the user email address');
    expect(userPrompt).toContain('user registration flow');
    expect(opts?.systemPrompt).toContain('Evaluate which patterns are applicable');
  });

  it('applicable patterns from AI response returned in applicablePatterns[]', async () => {
    const db = makeMockDb();
    const ai = makeMockAi(); // p1 applicable, p2 not applicable
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(BASE_INPUT, 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.applicablePatterns.length).toBe(1);
    expect(result.data?.applicablePatterns[0]!['id']).toBe('p1');
  });

  it('non-applicable patterns appear in filteredOut[] with reason from AI', async () => {
    const db = makeMockDb();
    const ai = makeMockAi(); // p2 not applicable with reason 'Unrelated domain'
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(BASE_INPUT, 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.filteredOut.length).toBe(1);
    expect(result.data?.filteredOut[0]!.patternId).toBe('p2');
    expect(result.data?.filteredOut[0]!.reason).toBe('Unrelated domain');
  });

  it('scope violation: cross-tenant PRIVATE pattern moves to filteredOut', async () => {
    const crossTenantPattern: Record<string, unknown> = {
      id: 'p1',
      patternId: 'p1',
      tenantId: 'tenant-other', // different tenant
      knowledgeScope: 'PRIVATE',
    };
    const db = makeMockDb();
    const ai = makeMockAi(
      JSON.stringify({
        evaluations: [{ patternId: 'p1', applicable: true, reason: 'Relevant' }],
      }),
    );
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(
      { patterns: [crossTenantPattern], stepText: 'validate', stepContext: '' },
      'tenant-acme', // caller's tenantId differs
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data?.applicablePatterns.length).toBe(0);
    expect(result.data?.filteredOut.length).toBe(1);
    expect(result.data?.filteredOut[0]!.reason).toBe('SCOPE_VIOLATION');
  });

  it('GLOBAL pattern passes scope check regardless of tenantId', async () => {
    const globalPattern: Record<string, unknown> = {
      id: 'p1',
      patternId: 'p1',
      tenantId: 'tenant-other',
      knowledgeScope: 'GLOBAL', // global — passes scope check
    };
    const db = makeMockDb();
    const ai = makeMockAi(
      JSON.stringify({
        evaluations: [{ patternId: 'p1', applicable: true, reason: 'Relevant' }],
      }),
    );
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(
      { patterns: [globalPattern], stepText: 'validate', stepContext: '' },
      'tenant-acme',
    );

    expect(result.isSuccess).toBe(true);
    expect(result.data?.applicablePatterns.length).toBe(1);
    expect(result.data?.filteredOut.length).toBe(0);
  });

  it('DNA-8: storeDocument to xiigen-rag-evaluations before returning result', async () => {
    const db = makeMockDb();
    const ai = makeMockAi();
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(BASE_INPUT, 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-rag-evaluations',
      expect.objectContaining({
        tenantId: 'tenant-acme',
        patternCount: 2,
        connectionType: 'FLOW_SCOPED',
        knowledgeScope: 'PRIVATE',
      }),
      expect.any(String),
    );
  });

  it('AI judge failure: returns DataProcessResult.failure without throwing', async () => {
    const db = makeMockDb();
    const ai = {
      generate: jest.fn().mockRejectedValue(new Error('AI service unavailable')),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn(),
    } as unknown as IAiProvider;
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(BASE_INPUT, 'tenant-acme');

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('RAG_EVALUATE_ERROR');
  });

  it('all patterns applicable: filteredOut is empty array not omitted', async () => {
    const aiResponse = JSON.stringify({
      evaluations: [
        { patternId: 'p1', applicable: true, reason: 'Relevant' },
        { patternId: 'p2', applicable: true, reason: 'Also relevant' },
      ],
    });
    const db = makeMockDb();
    const ai = makeMockAi(aiResponse);
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(BASE_INPUT, 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.applicablePatterns.length).toBe(2);
    expect(result.data?.filteredOut).toBeDefined();
    expect(result.data?.filteredOut).toEqual([]);
  });

  it('evaluationSummary reflects applicableCount / total count ratio', async () => {
    const db = makeMockDb();
    const ai = makeMockAi(); // p1 applicable, p2 not — 1/2
    const handler = new RagEvaluateHandler(ai, db);

    const result = await handler.evaluate(BASE_INPUT, 'tenant-acme');

    expect(result.isSuccess).toBe(true);
    expect(result.data?.evaluationSummary).toBe('1/2 patterns applicable');
  });
});
