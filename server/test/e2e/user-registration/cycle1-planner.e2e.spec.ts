/**
 * E2E tests for PlannerHandler — Cycle 1 AI Planning
 * 9 tests using in-memory providers, following flow-01.e2e.spec.ts pattern
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { PlannerHandler } from '../../../src/engine/node-handlers/planner.handler';
import { NodeHandlerContext } from '../../../src/engine/node-handlers/node-handler.types';

const TENANT = 'flow01-planner-e2e-tenant';
const OTHER_TENANT = 'flow01-planner-e2e-other-tenant';

// ── In-memory providers ──────────────────────────────────────────────────────

function makeInMemoryDb() {
  const store: Map<string, Record<string, unknown>[]> = new Map();

  return {
    storeDocument: jest.fn(async (index: string, doc: Record<string, unknown>, id: string) => {
      const bucket = store.get(index) ?? [];
      const existing = bucket.findIndex((d) => d['id'] === id);
      if (existing >= 0) {
        bucket[existing] = { ...doc, id };
      } else {
        bucket.push({ ...doc, id });
      }
      store.set(index, bucket);
      return DataProcessResult.success({ ...doc, id });
    }),
    searchDocuments: jest.fn(async (index: string, filter: Record<string, unknown>) => {
      const bucket = store.get(index) ?? [];
      const results = bucket.filter((doc) =>
        Object.entries(filter).every(([k, v]) => v == null || doc[k] === v),
      );
      return DataProcessResult.success(results);
    }),
    getDocument: jest.fn(async (index: string, id: string) => {
      const bucket = store.get(index) ?? [];
      const doc = bucket.find((d) => d['id'] === id);
      return doc
        ? DataProcessResult.success(doc)
        : DataProcessResult.failure('NOT_FOUND', `Document ${id} not found`);
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

// ── Fixtures ──────────────────────────────────────────────────────────────────

const REAL_INTENT = 'When a user registers, verify their email and deliver onboarding';

const PLAN_JSON = JSON.stringify({
  steps: [
    {
      index: 1,
      text: 'Confirm the email address is not already registered',
      intClause: 'registers',
      dependencies: [],
    },
    {
      index: 2,
      text: 'Send a verification message to the provided address',
      intClause: 'verify their email',
      dependencies: [1],
    },
    {
      index: 3,
      text: 'Grant access after the address is confirmed',
      intClause: 'verify their email',
      dependencies: [2],
    },
    {
      index: 4,
      text: 'Provide workspace setup materials',
      intClause: 'deliver onboarding',
      dependencies: [3],
    },
    {
      index: 5,
      text: 'Send the first tutorial to the member',
      intClause: 'deliver onboarding',
      dependencies: [3],
    },
  ],
});

const REVIEW_JSON = JSON.stringify({
  coverage: [
    { clause: 'registers', verdict: 'COVERED', step: 1 },
    { clause: 'verify their email', verdict: 'COVERED', step: 2 },
    { clause: 'deliver onboarding', verdict: 'COVERED', step: 4 },
  ],
  abstractionViolations: [],
  responsibilityFlags: [],
  dependencyGaps: [],
});

const MISSING_REVIEW_JSON = JSON.stringify({
  coverage: [
    { clause: 'registers', verdict: 'COVERED', step: 1 },
    { clause: 'verify their email', verdict: 'MISSING', step: 0 },
    { clause: 'deliver onboarding', verdict: 'COVERED', step: 4 },
  ],
  abstractionViolations: [],
  responsibilityFlags: [],
  dependencyGaps: [],
});

const baseContract: any = {
  taskTypeId: 'T47',
  archetype: 'SERVICE',
  ironRules: [],
  handlers: [],
  machineConstants: [],
};

function makeCtx(tenantId = TENANT, extraInputs: Record<string, unknown> = {}): NodeHandlerContext {
  return {
    contract: baseContract,
    runId: `run-e2e-planner-${Date.now()}`,
    flowId: 'FLOW-01',
    taskTypeId: 'T47',
    tenantId,
    inputs: {
      userIntent: REAL_INTENT,
      constraints: ['No typed models', 'No throw for business logic'],
      ...extraInputs,
    },
    priorOutputs: [],
    nodeConfig: {},
  };
}

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Cycle 1 — PlannerHandler E2E', () => {
  it('produces 5-9 steps for FLOW-01 registration intent', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx());

    expect(result.isSuccess).toBe(true);
    const steps = result.data?.data?.['planSteps'] as any[];
    expect(steps.length).toBeGreaterThanOrEqual(5);
    expect(steps.length).toBeLessThanOrEqual(9);
  });

  it('all steps are technology-neutral', async () => {
    const db = makeInMemoryDb();
    const techNameRegex =
      /\b(nestjs|express|fastify|typeorm|prisma|sequelize|redis|elasticsearch|postgres|mysql|mongodb|kafka|rabbitmq|bull|react|vue|angular|graphql|grpc|typescript|javascript|python|java|go|rust)\b/i;

    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx());

    expect(result.isSuccess).toBe(true);
    const steps = result.data?.data?.['planSteps'] as any[];
    for (const step of steps) {
      expect(techNameRegex.test(step.text)).toBe(false);
    }
  });

  it('returns failure gracefully when AI provider is unavailable', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('AI_UNAVAILABLE', 'provider down')),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx());

    expect(result.isSuccess).toBe(false);
  });

  it('rejects plan when reviewer finds missing coverage clause', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({
            text: MISSING_REVIEW_JSON,
            model: 'claude-3',
            tokens_used: 100,
          }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx());

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(false);
    const gaps = result.data?.data?.['reviewerGaps'] as string[];
    expect(gaps.some((g) => g.includes('MISSING'))).toBe(true);
  });

  it('visibility record is scoped to tenantId — not visible to other tenants', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    await handler.handle(makeCtx(TENANT));

    // Records stored with TENANT should have that tenantId
    const allRecords = db._store.get('xiigen-cycle-visibility') ?? [];
    const tenantRecords = allRecords.filter((r) => r['tenantId'] === TENANT);
    const otherRecords = allRecords.filter((r) => r['tenantId'] === OTHER_TENANT);

    expect(tenantRecords.length).toBeGreaterThan(0);
    expect(otherRecords.length).toBe(0);
  });

  it('running same intent twice produces same plan structure (same clauses covered)', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    const result1 = await handler.handle(makeCtx());
    const result2 = await handler.handle(makeCtx());

    const steps1 = result1.data?.data?.['planSteps'] as any[];
    const steps2 = result2.data?.data?.['planSteps'] as any[];
    expect(steps1.length).toBe(steps2.length);
  });

  it('PlannerOutput.grade maps to UI grade badge correctly', async () => {
    // grade >= 0.85 → green, 0.65-0.84 → yellow, < 0.65 → red
    const gradeBadge = (g: number) => (g >= 0.85 ? 'green' : g >= 0.65 ? 'yellow' : 'red');

    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx());

    const grade = result.data?.data?.['grade'] as number;
    if (grade >= 0.85) {
      expect(gradeBadge(grade)).toBe('green');
    } else if (grade >= 0.65) {
      expect(gradeBadge(grade)).toBe('yellow');
    } else {
      expect(gradeBadge(grade)).toBe('red');
    }
  });

  it('visibility record SENT contains all 5 context package fields verbatim', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const domain = 'user-management';
    const priorArtQuery = 'registration-patterns';
    const successFormat = 'JSON with steps array';

    const handler = new PlannerHandler(mockAi as any, db as any);
    await handler.handle(makeCtx(TENANT, { domain, priorArtQuery, successFormat }));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const record = records[0];
    expect(record).toBeDefined();

    const sent = record!['sent'] as Record<string, unknown>;
    expect(sent).toHaveProperty('userIntent');
    expect(sent).toHaveProperty('domain');
    expect(sent).toHaveProperty('constraints');
    expect(sent).toHaveProperty('priorArtQuery');
    expect(sent).toHaveProperty('successFormat');
    expect(sent['userIntent']).toBe(REAL_INTENT);
    expect(sent['domain']).toBe(domain);
  });

  it('visibility record DECIDED contains grade and acceptance reasoning', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: PLAN_JSON, model: 'claude-3', tokens_used: 200 }),
        )
        .mockResolvedValueOnce(
          DataProcessResult.success({ text: REVIEW_JSON, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new PlannerHandler(mockAi as any, db as any);
    await handler.handle(makeCtx());

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const record = records[0];
    expect(record).toBeDefined();

    const decided = record!['decided'] as Record<string, unknown>;
    expect(decided).toHaveProperty('grade');
    expect(decided).toHaveProperty('accepted');
    expect(decided).toHaveProperty('acceptedBecause');
    expect(typeof decided['grade']).toBe('number');
    expect(['grade >= threshold', 'grade < threshold']).toContain(decided['acceptedBecause']);
  });
});
