/**
 * learning-capture.integration.spec.ts — SESSION-9
 *
 * Tests the AF-11 → training pair capture pipeline.
 * Does NOT train a model — proves the CAPTURE INFRASTRUCTURE works.
 *
 * Tests the PersistentFeedbackStore + FeedbackRecord schema:
 *   - generation with quality_score ≥ threshold stores training pair
 *   - training pair has correct fields for SFT dataset format
 *   - low quality_score does NOT store training pair
 *   - tenant isolation: tenant-A pairs not visible in tenant-B query
 *   - cost tracking: Ollama cost = 0, cloud cost > 0
 *
 * Infrastructure: PersistentFeedbackStore (in-memory).
 * All tests run without any Docker or API keys (zero dependencies).
 */

import 'reflect-metadata';
import { PersistentFeedbackStore } from '../../src/learning/feedback-store';
import { MockAiProvider } from '../../src/fabrics/ai-engine/mock.provider';
import { DataProcessResult } from '../../src/kernel/data-process-result';
import { TenantContext, TENANT_CONTEXT_KEY, DEFAULT_PLAN } from '../../src/kernel';
import {
  createFeedbackRecord,
  createQualityScore,
  feedbackRecordToDict,
} from '../../src/learning/feedback-types';

// ── Config ─────────────────────────────────────────────

const QUALITY_THRESHOLD = 0.7;
const TENANT_A = 'capture-tenant-A';
const TENANT_B = 'capture-tenant-B';

// ── Helpers ────────────────────────────────────────────

function mockCls(tenantId: string = TENANT_A): any {
  const tenant = new TenantContext({
    id: tenantId,
    name: `Tenant ${tenantId}`,
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
  };
}

function makeHighQualityScore() {
  return createQualityScore([
    { name: 'dna_compliance', score: 0.9, weight: 0.4 },
    { name: 'fabric_usage', score: 0.85, weight: 0.3 },
    { name: 'code_correctness', score: 0.8, weight: 0.3 },
  ]);
}

function makeLowQualityScore() {
  return createQualityScore([
    { name: 'dna_compliance', score: 0.5, weight: 0.4 },
    { name: 'fabric_usage', score: 0.4, weight: 0.3 },
    { name: 'code_correctness', score: 0.3, weight: 0.3 },
  ]);
}

// ══════════════════════════════════════════════════════
// AF-11 Feedback — training pair capture
// ══════════════════════════════════════════════════════

describe('AF-11 Feedback — training pair capture', () => {
  let store: PersistentFeedbackStore;

  beforeEach(() => {
    store = new PersistentFeedbackStore();
  });

  it('generation with quality_score ≥ threshold stores training pair', () => {
    const score = makeHighQualityScore();
    expect(score.total).toBeGreaterThanOrEqual(QUALITY_THRESHOLD);

    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'claude-haiku-4-5-20251001',
      qualityScore: score,
      passed: score.total >= QUALITY_THRESHOLD,
      generatedCodeLength: 512,
    });

    const result = store.record(record);
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
  });

  it('training pair contains: id, tenant_id, task_type, model_id, quality_score, passed', () => {
    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'claude-haiku-4-5-20251001',
      qualityScore: makeHighQualityScore(),
      passed: true,
    });
    store.record(record);

    const dict = feedbackRecordToDict(record);
    expect(dict['id']).toBeDefined();
    expect(dict['tenant_id']).toBe(TENANT_A);
    expect(dict['task_type']).toBe('T44');
    expect(dict['model_id']).toBe('claude-haiku-4-5-20251001');
    expect(dict['quality_score']).toBeDefined();
    expect(dict['passed']).toBe(true);
    expect(dict['created_at']).toBeDefined();
  });

  it('training pair stored in feedback store under correct tenantId', () => {
    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-model',
      qualityScore: makeHighQualityScore(),
      passed: true,
    });
    store.record(record);

    const queryResult = store.query({ tenantId: TENANT_A });
    expect(queryResult.isSuccess).toBe(true);
    expect(queryResult.data!.length).toBeGreaterThanOrEqual(1);
    expect(queryResult.data![0].tenantId).toBe(TENANT_A);
  });

  it('low quality_score (< threshold) — passed=false, can still store but filter excludes it', () => {
    const score = makeLowQualityScore();
    expect(score.total).toBeLessThan(QUALITY_THRESHOLD);

    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-model',
      qualityScore: score,
      passed: score.total >= QUALITY_THRESHOLD, // false
    });
    store.record(record);

    // Filtering by passed=true excludes it
    const passedQuery = store.query({ tenantId: TENANT_A, passed: true });
    expect(passedQuery.isSuccess).toBe(true);
    const foundPassed = passedQuery.data!.find((r) => r.id === record.id);
    expect(foundPassed).toBeUndefined();
  });

  it('tenant-A pairs not visible in tenant-B query', () => {
    store.record(
      createFeedbackRecord({
        tenantId: TENANT_A,
        taskType: 'T44',
        modelId: 'mock-model-a',
        qualityScore: makeHighQualityScore(),
        passed: true,
      }),
    );

    const queryB = store.query({ tenantId: TENANT_B });
    expect(queryB.isSuccess).toBe(true);
    expect(queryB.data!.length).toBe(0);
  });
});

// ══════════════════════════════════════════════════════
// Training data — cloud vs local comparison
// ══════════════════════════════════════════════════════

describe('Training data — cloud vs local comparison (mock mode)', () => {
  let store: PersistentFeedbackStore;

  beforeEach(() => {
    store = new PersistentFeedbackStore();
  });

  it('mock cloud generation → quality measured → pair captured if above threshold', async () => {
    const cls = mockCls();
    const mock = new MockAiProvider(cls, {
      defaultResponse: '@Injectable() class MyService implements IDatabaseService {}',
      tokensPerResponse: 80,
      costPerCall: 0.0002,
    });

    const genResult = await mock.generate('Generate a NestJS service');
    expect(genResult.isSuccess).toBe(true);

    const score = makeHighQualityScore();
    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-anthropic',
      qualityScore: score,
      passed: score.total >= QUALITY_THRESHOLD,
      generatedCodeLength: (genResult.data!['text'] as string).length,
      metadata: {
        cost_usd: genResult.data!['cost'] ?? 0.0002,
        provider: genResult.data!['provider'] ?? 'mock',
      },
    });

    const storeResult = store.record(record);
    expect(storeResult.isSuccess).toBe(true);
  });

  it('mock Ollama generation → cost=0 in training pair', async () => {
    const cls = mockCls();
    const mock = new MockAiProvider(cls, {
      defaultResponse: 'function add(a: number, b: number): number { return a + b; }',
      tokensPerResponse: 30,
      costPerCall: 0,
    });

    const genResult = await mock.generate('Write TypeScript function');
    expect(genResult.isSuccess).toBe(true);
    expect(genResult.data!['cost']).toBe(0);

    const score = createQualityScore([{ name: 'code_correctness', score: 0.75, weight: 1.0 }]);
    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-ollama',
      qualityScore: score,
      passed: score.total >= QUALITY_THRESHOLD,
      metadata: { cost_usd: 0, provider: 'ollama' },
    });

    store.record(record);
    const query = store.query({ tenantId: TENANT_A, modelId: 'mock-ollama' });
    expect(query.isSuccess).toBe(true);
    expect(query.data![0].metadata['cost_usd']).toBe(0);
  });

  it('same prompt, both providers → both pairs stored with different models', async () => {
    const cls = mockCls();
    const cloudMock = new MockAiProvider(cls, {
      modelId: 'mock-anthropic',
      defaultResponse: 'cloud response',
      tokensPerResponse: 50,
      costPerCall: 0.0002,
    });
    const localMock = new MockAiProvider(cls, {
      modelId: 'mock-ollama',
      defaultResponse: 'local response',
      tokensPerResponse: 50,
      costPerCall: 0,
    });

    const [cloudResult, localResult] = await Promise.all([
      cloudMock.generate('Write TypeScript interface'),
      localMock.generate('Write TypeScript interface'),
    ]);

    const cloudRecord = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-anthropic',
      qualityScore: makeHighQualityScore(),
      passed: true,
      metadata: { cost_usd: cloudResult.data!['cost'] },
    });

    const localRecord = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-ollama',
      qualityScore: createQualityScore([{ name: 'code_correctness', score: 0.72, weight: 1.0 }]),
      passed: true,
      metadata: { cost_usd: localResult.data!['cost'] },
    });

    store.record(cloudRecord);
    store.record(localRecord);

    const query = store.query({ tenantId: TENANT_A, taskType: 'T44' });
    expect(query.isSuccess).toBe(true);
    expect(query.data!.length).toBe(2);

    const modelIds = query.data!.map((r) => r.modelId);
    expect(modelIds).toContain('mock-anthropic');
    expect(modelIds).toContain('mock-ollama');
  });
});

// ══════════════════════════════════════════════════════
// Training data retrieval — what Unsloth would consume
// ══════════════════════════════════════════════════════

describe('Training data retrieval — SFT dataset format', () => {
  let store: PersistentFeedbackStore;

  beforeEach(() => {
    store = new PersistentFeedbackStore();
    // Pre-populate with 5 records
    for (let i = 0; i < 5; i++) {
      store.record(
        createFeedbackRecord({
          tenantId: TENANT_A,
          taskType: i % 2 === 0 ? 'T44' : 'T45',
          modelId: i < 3 ? 'mock-anthropic' : 'mock-ollama',
          qualityScore: createQualityScore([
            { name: 'code_correctness', score: 0.7 + i * 0.05, weight: 1.0 },
          ]),
          passed: true,
          generatedCodeLength: 200 + i * 50,
        }),
      );
    }
  });

  it('query training pairs returns all captured pairs for tenant', () => {
    const result = store.query({ tenantId: TENANT_A });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(5);
  });

  it('filter by model_used returns only that model pairs', () => {
    const result = store.query({ tenantId: TENANT_A, modelId: 'mock-anthropic' });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.length).toBe(3);
    expect(result.data!.every((r) => r.modelId === 'mock-anthropic')).toBe(true);
  });

  it('filter by quality_score >= threshold returns curated set', () => {
    const threshold = 0.75;
    const result = store.query({ tenantId: TENANT_A, minScore: threshold });
    expect(result.isSuccess).toBe(true);
    expect(result.data!.every((r) => r.qualityScore.total >= threshold)).toBe(true);
  });

  it('training pairs have correct schema for SFT dataset format', () => {
    const result = store.query({ tenantId: TENANT_A });
    expect(result.isSuccess).toBe(true);
    for (const record of result.data!) {
      const dict = feedbackRecordToDict(record);
      // Required SFT fields
      expect(dict['id']).toBeDefined();
      expect(dict['tenant_id']).toBeDefined();
      expect(dict['task_type']).toBeDefined();
      expect(dict['model_id']).toBeDefined();
      expect(dict['quality_score']).toBeDefined();
      expect(dict['passed']).toBeDefined();
      expect(dict['created_at']).toBeDefined();
      expect(dict['generated_code_length']).toBeDefined();
    }
  });
});

// ══════════════════════════════════════════════════════
// Cost tracking — the optimization signal
// ══════════════════════════════════════════════════════

describe('Cost tracking — the optimization signal', () => {
  let store: PersistentFeedbackStore;

  beforeEach(() => {
    store = new PersistentFeedbackStore();
  });

  it('Ollama training pair has cost_usd = 0', () => {
    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'qwen2.5-coder:7b',
      qualityScore: createQualityScore([{ name: 'code_correctness', score: 0.72, weight: 1.0 }]),
      passed: true,
      metadata: { cost_usd: 0, provider: 'ollama' },
    });
    store.record(record);

    const result = store.query({ tenantId: TENANT_A, modelId: 'qwen2.5-coder:7b' });
    expect(result.isSuccess).toBe(true);
    expect(result.data![0].metadata['cost_usd']).toBe(0);
  });

  it('Anthropic training pair has cost_usd > 0', () => {
    const record = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'claude-haiku-4-5-20251001',
      qualityScore: makeHighQualityScore(),
      passed: true,
      metadata: { cost_usd: 0.0002, provider: 'anthropic' },
    });
    store.record(record);

    const result = store.query({ tenantId: TENANT_A, modelId: 'claude-haiku-4-5-20251001' });
    expect(result.isSuccess).toBe(true);
    expect(result.data![0].metadata['cost_usd'] as number).toBeGreaterThan(0);
  });

  it('cost-per-quality ratio computable (cost_usd / quality_score)', () => {
    const ollamaRecord = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-ollama',
      qualityScore: createQualityScore([{ name: 'code_correctness', score: 0.72, weight: 1.0 }]),
      passed: true,
      metadata: { cost_usd: 0 },
    });
    const anthropicRecord = createFeedbackRecord({
      tenantId: TENANT_A,
      taskType: 'T44',
      modelId: 'mock-anthropic',
      qualityScore: makeHighQualityScore(),
      passed: true,
      metadata: { cost_usd: 0.0002 },
    });
    store.record(ollamaRecord);
    store.record(anthropicRecord);

    const result = store.query({ tenantId: TENANT_A });
    expect(result.isSuccess).toBe(true);

    for (const record of result.data!) {
      const cost = record.metadata['cost_usd'] as number;
      const quality = record.qualityScore.total;
      // cost-per-quality = 0 for local, > 0 for cloud
      const costPerQuality = quality > 0 ? cost / quality : 0;
      expect(typeof costPerQuality).toBe('number');
      expect(isFinite(costPerQuality)).toBe(true);
    }
    console.log('Cost/quality ratio computable for all pairs ✓');
  });

  it('missing tenantId returns MISSING_TENANT failure', () => {
    const record = createFeedbackRecord({
      tenantId: '', // missing
      taskType: 'T44',
      modelId: 'mock-model',
      qualityScore: makeHighQualityScore(),
      passed: true,
    });
    // Force the ID but empty tenantId
    const result = store.record({ ...record, tenantId: '' });
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_TENANT');
  });
});
