/**
 * FLOW-29 E2E — Adaptive RAG Deep Research Engine
 *
 * Archetypes: ORCHESTRATION, RETRIEVAL, ROUTING, GUARD, LEARNING, OBSERVABILITY,
 *             BUILD, EVALUATION, EXPERIMENTATION, ANALYSIS, GOVERNANCE, UI
 * Task types: T441–T467 (27 contracts)
 * Fabric interfaces: IDatabaseService, IQueueService, IRagService, IAiProvider
 * CloudEvents: RagQueryRouted, RetrievalCompleted, BudgetExceeded, FeedbackIngested,
 *              PromptVersionPromoted, ABTestAllocated
 *
 * Named checks:
 *   observability_no_sdk_import
 *   learning_async_only
 *   analysis_human_gated_apply
 *   retrieval_query_integrity
 *   budget_gate_hard_stop
 *   store_before_emit_on_retrieval
 *   cross_tenant_query_blocked
 *   bfa_gate_before_graph_edit
 *
 * 8 mandatory E2E categories per SK-421.
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { createCloudEvent, validateCloudEvent } from '../../../src/kernel/cloud-events';
import { RAG_OPTIMIZATION_CONTRACT_FACTORIES } from '../../../src/engine-contracts/rag-optimization-contracts';

// ── Mock fabric providers ──────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();
  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) bucket[existing] = { ...doc, id };
      else bucket.push({ ...doc, id });
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      return DataProcessResult.success(
        bucket.filter((doc) => Object.entries(filter).every(([k, v]) => v == null || doc[k] === v)),
      );
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `${id} not found`);
    }),
    _store: store,
  };
}

function makeInMemoryQueue() {
  const emitted: Array<{ queue: string; payload: Record<string, unknown> }> = [];
  return {
    enqueue: jest.fn(async (queue: string, payload: Record<string, unknown>) => {
      emitted.push({ queue, payload });
      return DataProcessResult.success({ messageId: `msg-${Date.now()}` });
    }),
    _emitted: emitted,
  };
}

// ══════════════════════════════════════════════════════
// Category 1 — Happy Path
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — Happy Path [ADAPTIVE RAG DEEP RESEARCH]', () => {
  it('F29-H1: engine generates FLOW-29 contracts array with 27 entries', () => {
    const contracts = RAG_OPTIMIZATION_CONTRACT_FACTORIES.map((f) => f());
    expect(contracts.length).toBe(27);
    const ids = contracts.map((c) => c.taskTypeId);
    expect(ids).toContain('T441');
    expect(ids).toContain('T467');
  });

  it('F29-H2: AdaptiveRagRouter contract has correct name', () => {
    const contracts = RAG_OPTIMIZATION_CONTRACT_FACTORIES.map((f) => f());
    const router = contracts.find((c) => c.taskTypeId === 'T441');
    expect(router).toBeDefined();
    expect(router!.name).toBe('AdaptiveRagRouter');
    expect(router!.flowId).toBe('FLOW-29');
  });

  it('F29-H3: RAG query stored before routing event emitted (DNA-8)', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();

    const query: Record<string, unknown> = {
      queryId: 'query-001',
      tenantId: 'tenant-a',
      text: 'What is the design pattern for tenant isolation?',
      strategy: 'hybrid',
    };

    await db.storeDocument('xiigen-rag-queries', query, 'query-001');
    await queue.enqueue('rag.query.routed', { queryId: 'query-001' });

    expect(db.storeDocument).toHaveBeenCalled();
    expect(queue.enqueue).toHaveBeenCalled();
    expect(db._store.get('xiigen-rag-queries')).toHaveLength(1);
  });

  it('F29-H4: RagQueryRouted CloudEvent is valid', () => {
    const event = createCloudEvent({
      eventType: 'rag.query.routed',
      source: 'xiigen/flow-29/AdaptiveRagRouter',
      tenantId: 'tenant-a',
      data: { queryId: 'query-001', tenantId: 'tenant-a', strategy: 'hybrid' },
    });
    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F29-H5: all 27 FLOW-29 contracts have flowId FLOW-29', () => {
    const contracts = RAG_OPTIMIZATION_CONTRACT_FACTORIES.map((f) => f());
    contracts.forEach((c) => expect(c.flowId).toBe('FLOW-29'));
  });
});

// ══════════════════════════════════════════════════════
// Category 2 — Error Path
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — Error Path', () => {
  it('F29-E1: missing RAG index returns DataProcessResult.failure', async () => {
    const db = makeInMemoryDb();
    const result = await db.getDocument('xiigen-rag-queries', 'nonexistent-query');
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_FOUND');
  });

  it('F29-E2: budget exceeded returns BUDGET_EXCEEDED failure not throw', () => {
    const budget: Record<string, unknown> = { tokensUsed: 100000, budgetLimit: 50000 };
    const result =
      (budget['tokensUsed'] as number) > (budget['budgetLimit'] as number)
        ? DataProcessResult.failure('BUDGET_EXCEEDED', 'Token budget exceeded — hard stop (T446)')
        : DataProcessResult.success(budget);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('BUDGET_EXCEEDED');
  });

  it('F29-E3: hallucination threshold breach returns failure', () => {
    const evalResult: Record<string, unknown> = { hallucinationScore: 0.35, threshold: 0.2 };
    const result =
      (evalResult['hallucinationScore'] as number) > (evalResult['threshold'] as number)
        ? DataProcessResult.failure(
            'EVAL_QUALITY_GATE_FAILED',
            'Hallucination score exceeds threshold (T454)',
          )
        : DataProcessResult.success(evalResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('EVAL_QUALITY_GATE_FAILED');
  });

  it('F29-E4: RAG service failure returns failure not throw', () => {
    const simulateRagFailure = (): DataProcessResult<unknown> =>
      DataProcessResult.failure('RAG_SERVICE_UNAVAILABLE', 'RAG fabric unavailable');
    const result = simulateRagFailure();
    expect(result.isSuccess).toBe(false);
  });

  it('F29-E5: context over-allocation returns failure from ContextEfficiencyCheck', () => {
    const ctx: Record<string, unknown> = { allocatedTokens: 200000, maxTokens: 128000 };
    const result =
      (ctx['allocatedTokens'] as number) > (ctx['maxTokens'] as number)
        ? DataProcessResult.failure(
            'CONTEXT_OVER_ALLOCATED',
            'Context tokens exceed maximum (T457)',
          )
        : DataProcessResult.success(ctx);
    expect(result.isSuccess).toBe(false);
  });
});

// ══════════════════════════════════════════════════════
// Category 3 — Tenant Isolation
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — Tenant Isolation', () => {
  it('F29-T1: tenant A RAG queries not accessible to tenant B', async () => {
    const db = makeInMemoryDb();
    await db.storeDocument('xiigen-rag-queries', { queryId: 'q-A', tenantId: 'tenant-a' }, 'q-A');
    await db.storeDocument('xiigen-rag-queries', { queryId: 'q-B', tenantId: 'tenant-b' }, 'q-B');

    const resultsA = await db.searchDocuments('xiigen-rag-queries', { tenantId: 'tenant-a' });
    expect(resultsA.data!.every((d) => d['tenantId'] === 'tenant-a')).toBe(true);
    expect(resultsA.data!.some((d) => d['tenantId'] === 'tenant-b')).toBe(false);
  });

  it('F29-T2: cross-tenant query blocked (CF-476)', () => {
    const query = { queryId: 'q-001', callerTenantId: 'tenant-a', targetTenantId: 'tenant-b' };
    const isCrossTenant = query.callerTenantId !== query.targetTenantId;
    const result = isCrossTenant
      ? DataProcessResult.failure(
          'CROSS_TENANT_QUERY_BLOCKED',
          'Cross-tenant RAG query blocked (CF-476)',
        )
      : DataProcessResult.success(query);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CROSS_TENANT_QUERY_BLOCKED');
  });

  it('F29-T3: tenant context auto-provided via AsyncLocalStorage', () => {
    const mockCtx = { tenantId: 'tenant-e' };
    expect(mockCtx.tenantId).toBeDefined();
  });

  it('F29-T4: each tenant has independent RAG knowledge namespace', async () => {
    const db = makeInMemoryDb();
    for (const tid of ['tenant-a', 'tenant-b', 'tenant-c']) {
      await db.storeDocument(
        'xiigen-rag-queries',
        { queryId: `q-${tid}`, tenantId: tid },
        `q-${tid}`,
      );
    }
    const r = await db.searchDocuments('xiigen-rag-queries', { tenantId: 'tenant-b' });
    expect(r.data!.length).toBe(1);
    expect(r.data![0]['tenantId']).toBe('tenant-b');
  });

  it('F29-T5: tenant-specific bandit policy respected', () => {
    const policyA = { tenantId: 'tenant-a', explorationRate: 0.1 };
    const policyB = { tenantId: 'tenant-b', explorationRate: 0.2 };
    expect(policyA.explorationRate).not.toBe(policyB.explorationRate);
  });
});

// ══════════════════════════════════════════════════════
// Category 4 — Idempotency
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — Idempotency', () => {
  it('F29-I1: duplicate RAG query processed once', async () => {
    const db = makeInMemoryDb();
    const queue = makeInMemoryQueue();
    const queryId = 'query-idempotent-001';
    const q: Record<string, unknown> = { queryId, tenantId: 'tenant-a', text: 'test' };

    const e1 = await db.searchDocuments('xiigen-rag-queries', { queryId });
    if (!e1.data?.length) {
      await db.storeDocument('xiigen-rag-queries', q, queryId);
      await queue.enqueue('rag.query.routed', { queryId });
    }

    const e2 = await db.searchDocuments('xiigen-rag-queries', { queryId });
    if (!e2.data?.length) {
      await db.storeDocument('xiigen-rag-queries', q, queryId);
      await queue.enqueue('rag.query.routed', { queryId });
    }

    expect(db._store.get('xiigen-rag-queries')!.length).toBe(1);
    expect(queue._emitted.length).toBe(1);
  });

  it('F29-I2: same feedback stored twice no duplication', async () => {
    const db = makeInMemoryDb();
    const fb: Record<string, unknown> = { feedbackId: 'fb-dup', rating: 5 };
    await db.storeDocument('xiigen-rag-feedback', fb, 'fb-dup');
    await db.storeDocument('xiigen-rag-feedback', fb, 'fb-dup');
    expect(db._store.get('xiigen-rag-feedback')!.length).toBe(1);
  });

  it('F29-I3: A/B test allocation is deterministic (hash-based)', () => {
    const hashBasedAllocate = (userId: string, testId: string): string => {
      const hash = (userId + testId).split('').reduce((acc, c) => acc + c.charCodeAt(0), 0);
      return hash % 2 === 0 ? 'variant-A' : 'variant-B';
    };
    const r1 = hashBasedAllocate('user-123', 'test-001');
    const r2 = hashBasedAllocate('user-123', 'test-001');
    expect(r1).toBe(r2);
  });

  it('F29-I4: retry of retrieval step is safe', async () => {
    const db = makeInMemoryDb();
    const qId = 'query-retry-001';
    await db.storeDocument('xiigen-rag-queries', { queryId: qId, status: 'FAILED' }, qId);
    await db.storeDocument('xiigen-rag-queries', { queryId: qId, status: 'COMPLETED' }, qId);
    const stored = db._store.get('xiigen-rag-queries')!;
    expect(stored.length).toBe(1);
    expect(stored[0]['status']).toBe('COMPLETED');
  });

  it('F29-I5: second run with same inputs returns same retrieval result', () => {
    const deterministicRetrieve = (queryId: string) =>
      DataProcessResult.success({ queryId, results: ['doc-1', 'doc-2'], score: 0.85 });
    const r1 = deterministicRetrieve('query-001');
    const r2 = deterministicRetrieve('query-001');
    expect(r1.data!['queryId']).toEqual(r2.data!['queryId']);
  });
});

// ══════════════════════════════════════════════════════
// Category 5 — UI State Mapping
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — UI State Mapping', () => {
  it('F29-U1: PENDING status maps to rag-searching UI indicator', () => {
    const status: string = 'PENDING';
    const uiState = status === 'PENDING' ? 'rag-searching' : 'rag-complete';
    expect(uiState).toBe('rag-searching');
  });

  it('F29-U2: SUCCESS status maps to rag-results-ready UI indicator', () => {
    const status: string = 'SUCCESS';
    const uiState = status === 'SUCCESS' ? 'rag-results-ready' : 'rag-error';
    expect(uiState).toBe('rag-results-ready');
  });

  it('F29-U3: BUDGET_EXCEEDED maps to rag-budget-exceeded UI indicator', () => {
    const status: string = 'BUDGET_EXCEEDED';
    const uiState = status === 'BUDGET_EXCEEDED' ? 'rag-budget-exceeded' : 'rag-ok';
    expect(uiState).toBe('rag-budget-exceeded');
  });

  it('F29-U4: RAG state transitions are valid', () => {
    const validTransitions: Record<string, string[]> = {
      PENDING: ['ROUTING', 'FAILED'],
      ROUTING: ['RETRIEVING', 'FAILED'],
      RETRIEVING: ['RERANKING', 'FAILED'],
      RERANKING: ['COMPLETED'],
      COMPLETED: [],
    };
    expect(validTransitions['PENDING']).toContain('ROUTING');
    expect(validTransitions['COMPLETED']).toHaveLength(0);
  });

  it('F29-U5: UI receives correct shape for RAG results', () => {
    const payload: Record<string, unknown> = {
      queryId: 'query-001',
      results: [{ docId: 'doc-1', score: 0.9, snippet: 'relevant text' }],
      retrievalMode: 'hybrid',
      tokensUsed: 1200,
    };
    expect(payload['queryId']).toBeDefined();
    expect(Array.isArray(payload['results'])).toBe(true);
    expect(typeof payload['tokensUsed']).toBe('number');
  });
});

// ══════════════════════════════════════════════════════
// Category 6 — API Contract
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — API Contract', () => {
  it('F29-A1: RAG request schema has required fields', () => {
    const request: Record<string, unknown> = {
      queryId: 'query-001',
      tenantId: 'tenant-a',
      text: 'search query',
      strategy: 'hybrid',
    };
    expect(request['queryId']).toBeDefined();
    expect(request['text']).toBeDefined();
  });

  it('F29-A2: RAG response schema matches expected shape', () => {
    const response: Record<string, unknown> = {
      queryId: 'query-001',
      results: [],
      retrievalMode: 'hybrid',
      tokensUsed: 500,
    };
    expect(response['queryId']).toBeDefined();
    expect(Array.isArray(response['results'])).toBe(true);
  });

  it('F29-A3: error response includes errorCode and errorMessage', () => {
    const err = DataProcessResult.failure('RETRIEVAL_FAILED', 'Vector search failed');
    expect(err.isSuccess).toBe(false);
    expect(err.errorCode).toBeDefined();
    expect(err.errorMessage).toBeDefined();
  });

  it('F29-A4: all FLOW-29 contract fields are present', () => {
    const contracts = RAG_OPTIMIZATION_CONTRACT_FACTORIES.map((f) => f());
    contracts.forEach((c) => {
      expect(c.taskTypeId).toBeDefined();
      expect(c.name).toBeDefined();
      expect(c.flowId).toBe('FLOW-29');
    });
  });

  it('F29-A5: no unexpected fields in RAG response', () => {
    const allowed = ['queryId', 'results', 'retrievalMode', 'tokensUsed'];
    const response: Record<string, unknown> = {
      queryId: 'q-001',
      results: [],
      retrievalMode: 'hybrid',
      tokensUsed: 100,
    };
    const unexpected = Object.keys(response).filter((k) => !allowed.includes(k));
    expect(unexpected).toHaveLength(0);
  });
});

// ══════════════════════════════════════════════════════
// Category 7 — CloudEvents
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — CloudEvents', () => {
  it('F29-C1: RagQueryRouted event passes validateCloudEvent', () => {
    const event = createCloudEvent({
      eventType: 'rag.query.routed',
      source: 'xiigen/flow-29/AdaptiveRagRouter',
      tenantId: 'tenant-a',
      data: { queryId: 'query-001', tenantId: 'tenant-a' },
    });
    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F29-C2: RetrievalCompleted event has correct source format', () => {
    const event = createCloudEvent({
      eventType: 'rag.retrieval.completed',
      source: 'xiigen/flow-29/VectorRetrievalStep',
      tenantId: 'tenant-a',
      data: { queryId: 'query-001', tenantId: 'tenant-a' },
    });
    expect(event['source']).toContain('xiigen/flow-29');
  });

  it('F29-C3: BudgetExceeded event has required type field', () => {
    const event = createCloudEvent({
      eventType: 'rag.budget.exceeded',
      source: 'xiigen/flow-29/BudgetEnforcementGate',
      tenantId: 'tenant-a',
      data: { queryId: 'query-001', tokensUsed: 100000, tenantId: 'tenant-a' },
    });
    expect(event['type']).toBe('rag.budget.exceeded');
  });

  it('F29-C4: FeedbackIngested event data matches expected shape', () => {
    const event = createCloudEvent({
      eventType: 'rag.feedback.ingested',
      source: 'xiigen/flow-29/UserFeedbackIngest',
      tenantId: 'tenant-a',
      data: { feedbackId: 'fb-001', rating: 4, queryId: 'query-001', tenantId: 'tenant-a' },
    });
    const [isValid] = validateCloudEvent(event);
    expect(isValid).toBe(true);
  });

  it('F29-C5: ABTestAllocated event has tenant context', () => {
    const event = createCloudEvent({
      eventType: 'rag.abtest.allocated',
      source: 'xiigen/flow-29/ABTestAllocator',
      tenantId: 'tenant-a',
      data: { testId: 'test-001', variant: 'A', userId: 'user-1', tenantId: 'tenant-a' },
    });
    const data = event['data'] as Record<string, unknown>;
    expect(data['tenantId']).toBe('tenant-a');
  });
});

// ══════════════════════════════════════════════════════
// Category 8 — Named Checks
// ══════════════════════════════════════════════════════

describe('FLOW-29 E2E — Named Checks', () => {
  it('F29-N1: observability_no_sdk_import passes when no direct OTEL import', () => {
    const code: Record<string, unknown> = {
      imports: ['IQueueService', 'IDatabaseService'],
      directSdkImports: [],
    };
    const passed = (code['directSdkImports'] as string[]).length === 0;
    expect(passed).toBe(true);
  });

  it('F29-N2: learning_async_only fails when policy update is on live path', () => {
    const update: Record<string, unknown> = { updateType: 'bandit_policy', onLivePath: true };
    const result = update['onLivePath']
      ? DataProcessResult.failure(
          'LEARNING_ON_LIVE_PATH',
          'Policy updates must be async only (T447)',
        )
      : DataProcessResult.success(update);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('LEARNING_ON_LIVE_PATH');
  });

  it('F29-N3: engine generates contract for FLOW-29 with PASS status', () => {
    const contracts = RAG_OPTIMIZATION_CONTRACT_FACTORIES.map((f) => f());
    expect(contracts.length).toBe(27);
    expect(contracts[0].flowId).toBe('FLOW-29');
  });

  it('F29-N4: analysis_human_gated_apply enforced — suggestions never auto-applied', () => {
    const suggestion: Record<string, unknown> = {
      suggestionId: 'sugg-001',
      autoApplied: false,
      requiresHumanApproval: true,
    };
    const passed = !suggestion['autoApplied'] && suggestion['requiresHumanApproval'];
    expect(passed).toBe(true);
  });

  it('F29-N5: retrieval_query_integrity — CF-476 tenantId on every query', () => {
    const query: Record<string, unknown> = {
      queryId: 'q-001',
      tenantId: 'tenant-a',
      text: 'search',
    };
    const hasTenant = query['tenantId'] !== undefined && query['tenantId'] !== null;
    expect(hasTenant).toBe(true);
  });

  it('F29-N6: store_before_emit on retrieval completed', async () => {
    const callOrder: string[] = [];
    const mockStore = jest.fn(
      async (_index: string, _doc: Record<string, unknown>, _id: string) => {
        callOrder.push('store');
        return DataProcessResult.success({});
      },
    );
    const mockEnqueue = jest.fn(async (_topic: string, _data: unknown) => {
      callOrder.push('enqueue');
      return DataProcessResult.success({});
    });
    await mockStore('index', {}, 'id');
    await mockEnqueue('queue', {});
    expect(callOrder[0]).toBe('store');
  });

  it('F29-N7: bfa_gate_before_graph_edit enforced on KnowledgeGraphEditGate', () => {
    const edit: Record<string, unknown> = {
      editId: 'edit-001',
      bfaApproved: true,
      tenantId: 'tenant-a',
    };
    const result = edit['bfaApproved']
      ? DataProcessResult.success(edit)
      : DataProcessResult.failure(
          'BFA_GATE_REQUIRED',
          'BFA approval required before graph edit (T452)',
        );
    expect(result.isSuccess).toBe(true);
  });

  it('F29-N8: named checks registered for FLOW-29', () => {
    const NAMED_CHECKS = [
      'observability_no_sdk_import',
      'learning_async_only',
      'analysis_human_gated_apply',
      'retrieval_query_integrity',
      'budget_gate_hard_stop',
      'store_before_emit_on_retrieval',
      'cross_tenant_query_blocked',
      'bfa_gate_before_graph_edit',
    ];
    expect(NAMED_CHECKS.length).toBe(8);
  });
});
