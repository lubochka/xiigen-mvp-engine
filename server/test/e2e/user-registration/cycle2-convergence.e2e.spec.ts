/**
 * E2E tests for ConvergenceHandler — Cycle 2 Self-Judge Teaching Round NODE Generation
 * Tests the new handler that delegates N-round loop to TeachingRoundService.
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { ConvergenceHandler } from '../../../src/engine/node-handlers/convergence.handler';
import { NodeHandlerContext } from '../../../src/engine/node-handlers/node-handler.types';

const TENANT = 'flow01-convergence-e2e-tenant';
const OTHER_TENANT = 'flow01-convergence-e2e-other-tenant';

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

const NODE_JSON = JSON.stringify({
  structure: {
    inputShape: ['email'],
    outputShape: ['uniquenessStatus'],
    triggers: ['registration-requested'],
    emits: ['uniqueness-checked'],
    dependencies: [],
  },
  intent: {
    purpose: 'Confirm the email address is not already registered',
    invariants: ['No duplicate emails'],
    failureModes: ['email already exists', 'lookup service unavailable'],
    domainConcepts: ['email uniqueness'],
  },
  constraints: ['No typed models', 'No throw for business logic'],
  quality: {
    scoringCriteria: ['email uniqueness check passes', 'error returned for duplicate'],
    acceptanceThreshold: 0.85,
    degradationAcceptable: false,
  },
});

const ARBITER_PASS = JSON.stringify({
  verdict: 'PASS',
  criterion: 'IronRules',
  detail: 'NODE is domain-correct',
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
    runId: `run-e2e-conv-${Date.now()}`,
    flowId: 'FLOW-01',
    taskTypeId: 'T47',
    tenantId,
    inputs: {
      stepText: 'Confirm the email address is not already registered',
      constraints: ['No typed models', 'No throw for business logic'],
      stepType: 'REGISTRATION',
      ...extraInputs,
    },
    priorOutputs: [],
    nodeConfig: {},
  };
}

function makeMockTeachingRound(nodeOutput = NODE_JSON, score = 9.0, fail = false) {
  return {
    run: jest.fn().mockResolvedValue(
      fail
        ? DataProcessResult.failure('NO_ROUNDS', 'no rounds completed')
        : DataProcessResult.success({
            bestOutput: nodeOutput,
            bestModel: 'mock-gemini',
            bestScore: score,
            triples: [
              {
                round: 1,
                chosen: { text: nodeOutput, model: 'mock-gemini', score },
                rejected: { text: nodeOutput, model: 'mock-openai', score: score - 2 },
                discarded: null,
                totalCost: 0.002,
              },
            ],
          }),
    ),
  };
}

function makeArbiterAi(allPass = true) {
  return {
    generate: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        text: allPass
          ? ARBITER_PASS
          : JSON.stringify({ verdict: 'BLOCK', criterion: 'IronRules', detail: 'violation found' }),
        model: 'claude-3',
        tokens_used: 50,
      }),
    ),
    generateStructured: jest.fn(),
    getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
  };
}

describe('Cycle 2 — ConvergenceHandler E2E', () => {
  it('produces verified NODE for T47 registration step', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi();
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    const result = await handler.handle(makeCtx());
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['winningNode']).toBeDefined();
  });

  it('winning NODE is technology-neutral', async () => {
    const db = makeInMemoryDb();
    const techRegex =
      /\b(nestjs|express|fastify|typeorm|prisma|sequelize|redis|elasticsearch|postgres|mysql|mongodb|kafka|rabbitmq|bull|react|vue|angular|graphql|grpc)\b/i;
    const ai = makeArbiterAi();
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    const result = await handler.handle(makeCtx());
    const node = result.data?.data?.['winningNode'] as Record<string, unknown>;
    const nodeText = JSON.stringify(node);
    expect(techRegex.test(nodeText)).toBe(false);
  });

  it('winning NODE has at least 2 step-specific failure modes in quality', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi();
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    const result = await handler.handle(makeCtx());
    const node = result.data?.data?.['winningNode'] as Record<string, unknown>;
    const intent = node['intent'] as Record<string, unknown> | undefined;
    const failureModes = (intent?.['failureModes'] as string[]) ?? [];
    expect(failureModes.length).toBeGreaterThanOrEqual(2);
  });

  it('returns CONVERGENCE_ROUNDS_FAILED when teaching round fails', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi();
    const tr = makeMockTeachingRound(NODE_JSON, 9.0, true); // fail=true

    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);
    const result = await handler.handle(makeCtx());
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONVERGENCE_ROUNDS_FAILED');
  });

  it('winning NODE stored under tenantId scope', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi();
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    await handler.handle(makeCtx(TENANT));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const tenantRecords = records.filter((r) => r['tenantId'] === TENANT);
    expect(tenantRecords.length).toBeGreaterThan(0);
  });

  it('BLOCK from arbiter sets accepted=false', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi(false); // returns BLOCK
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    const ctx = makeCtx(TENANT, { challengerRoles: ['IronRules'] });
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(false);
    expect(result.data?.data?.['grade']).toBe(0);
  });

  it('grade = bestScore/10 when all arbiters PASS', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi(true);
    const tr = makeMockTeachingRound(NODE_JSON, 9.5);
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    const ctx = makeCtx(TENANT, { challengerRoles: ['IronRules'] });
    const result = await handler.handle(ctx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['grade']).toBeCloseTo(0.95, 5);
    expect(result.data?.data?.['accepted']).toBe(true);
  });

  it('DNA-8: CYCLE-4 record stored in xiigen-training-data', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi();
    const tr = makeMockTeachingRound();
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    await handler.handle(makeCtx());

    const trainingRecords = db._store.get('xiigen-training-data') ?? [];
    const cycle4 = trainingRecords.find((r) => r['station'] === 'CYCLE-4');
    expect(cycle4).toBeDefined();
    expect(cycle4!['status']).toBe('PENDING_IMPLEMENTATION');
    expect(cycle4!['bestTeachingModel']).toBe('mock-gemini');
  });

  it('accepted NODE persisted to xiigen-node-definitions', async () => {
    const db = makeInMemoryDb();
    const ai = makeArbiterAi(true);
    const tr = makeMockTeachingRound(NODE_JSON, 9.0);
    const handler = new ConvergenceHandler(ai as any, tr as any, db as any);

    const ctx = makeCtx(TENANT, { challengerRoles: ['IronRules'] });
    const result = await handler.handle(ctx);
    expect(result.data?.data?.['accepted']).toBe(true);

    const nodeRecords = db._store.get('xiigen-node-definitions') ?? [];
    expect(nodeRecords.length).toBeGreaterThan(0);
    expect(nodeRecords[0]!['winningNode']).toBeDefined();
  });

  it('GAP-4: parentNode in challengerContext reaches arbiter prompt but not teachingRound nodePrompt', async () => {
    const db = makeInMemoryDb();
    const generatorNodePrompts: string[] = [];
    const arbiterPrompts: string[] = [];

    const captureAi = {
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        arbiterPrompts.push(prompt);
        return DataProcessResult.success({
          text: ARBITER_PASS,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const captureTr = {
      run: jest.fn().mockImplementation(async (opts: any) => {
        generatorNodePrompts.push(opts.nodePrompt ?? '');
        return DataProcessResult.success({
          bestOutput: NODE_JSON,
          bestModel: 'mock-gemini',
          bestScore: 9.0,
          triples: [],
        });
      }),
    };

    const parentNode = {
      structure: { inputShape: ['userId'], outputShape: ['token'] },
      intent: { purpose: 'Establish user identity in the system' },
      constraints: ['No typed models'],
      quality: { scoringCriteria: ['identity created'] },
    };

    const ctx: NodeHandlerContext = {
      ...makeCtx(TENANT),
      inputs: {
        stepText: 'Assign a unique identifier to the new profile',
        constraints: ['No typed models'],
        stepType: 'REGISTRATION',
        challengerRoles: ['IronRules'],
        challengerContext: {
          parentNode,
          parentDepth: 1,
          delegatedScope: 'profile identifier assignment',
        },
      },
    };

    const handler = new ConvergenceHandler(captureAi as any, captureTr as any, db as any);
    await handler.handle(ctx);

    // Teaching round nodePrompt must NOT contain parent node content
    expect(generatorNodePrompts.length).toBeGreaterThan(0);
    expect(generatorNodePrompts[0]).not.toContain('PARENT NODE');
    expect(generatorNodePrompts[0]).not.toContain('Establish user identity');

    // Arbiter prompts MUST contain parent node reference
    expect(arbiterPrompts.length).toBeGreaterThan(0);
    expect(arbiterPrompts[0]).toContain('PARENT NODE');
    expect(arbiterPrompts[0]).toContain('Establish user identity');
  });
});
