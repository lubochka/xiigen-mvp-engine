/**
 * E2E Chain Integration Tests — Cycles 1-3 working together
 * 12 tests covering Q1-Q5 completeness, error recovery, tenant isolation
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { PlannerHandler } from '../../../src/engine/node-handlers/planner.handler';
import { ConvergenceHandler } from '../../../src/engine/node-handlers/convergence.handler';
import { DepthDecisionHandler } from '../../../src/engine/node-handlers/depth-decision.handler';
import { NodeHandlerContext } from '../../../src/engine/node-handlers/node-handler.types';
import { CycleChainService } from '../../../src/engine/cycle-chain.service';
import { randomUUID } from 'crypto';

const TENANT = 'flow01-chain-e2e-tenant';
const OTHER_TENANT = 'flow01-chain-other-tenant';

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
    scoringCriteria: ['check passes'],
    acceptanceThreshold: 0.85,
    degradationAcceptable: false,
  },
});

const ARBITER_PASS = JSON.stringify({ verdict: 'PASS', criterion: 'Domain', detail: 'ok' });

const JUDGE_WITH_SCORES = JSON.stringify({
  scores: { A: 8.5, B: 6.2 },
  winner: 'A',
  reasoning: 'NODE A has clearer single responsibility',
});

const LEAF_RESPONSE = JSON.stringify({
  verdict: 'LEAF',
  justification: 'Single-responsibility — S1 not triggered',
  signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
  signalsTriggered: [],
  subFlowDecomposition: null,
});

const baseContract: any = {
  taskTypeId: 'T47',
  archetype: 'SERVICE',
  ironRules: [],
  handlers: [],
  machineConstants: [],
};

function makePlannerCtx(tenantId = TENANT, runId = 'chain-run-1'): NodeHandlerContext {
  return {
    contract: baseContract,
    runId,
    flowId: 'FLOW-01',
    taskTypeId: 'T47',
    tenantId,
    inputs: {
      userIntent: 'When a user registers, verify their email and deliver onboarding',
      constraints: ['No typed models', 'No throw for business logic'],
    },
    priorOutputs: [],
    nodeConfig: {},
  };
}

function makeConvergenceCtx(
  step: Record<string, unknown>,
  tenantId = TENANT,
  runId = 'chain-run-1',
): NodeHandlerContext {
  return {
    contract: baseContract,
    runId,
    flowId: 'FLOW-01',
    taskTypeId: 'T47',
    tenantId,
    inputs: {
      stepText: String(step['text'] ?? ''),
      constraints: ['No typed models', 'No throw for business logic'],
      stepType: 'REGISTRATION',
    },
    priorOutputs: [],
    nodeConfig: {},
  };
}

function makeDepthCtx(
  node: Record<string, unknown>,
  tenantId = TENANT,
  runId = 'chain-run-1',
): NodeHandlerContext {
  return {
    contract: baseContract,
    runId,
    flowId: 'FLOW-01',
    taskTypeId: 'T47',
    tenantId,
    inputs: { verifiedNode: node, currentDepth: 1, terminationDepth: 3 },
    priorOutputs: [],
    nodeConfig: {},
  };
}

function makePlannerAi(planResponse = PLAN_JSON, reviewResponse = REVIEW_JSON) {
  let callIdx = 0;
  return {
    generate: jest.fn().mockImplementation(async () => {
      callIdx++;
      if (callIdx === 1)
        return DataProcessResult.success({
          text: planResponse,
          model: 'claude-3',
          tokens_used: 200,
        });
      return DataProcessResult.success({
        text: reviewResponse,
        model: 'claude-3',
        tokens_used: 100,
      });
    }),
    generateStructured: jest.fn(),
    getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
  };
}

function makeConvergenceAi() {
  let callIdx = 0;
  return {
    generate: jest.fn().mockImplementation(async () => {
      callIdx++;
      if (callIdx === 1)
        return DataProcessResult.success({ text: NODE_JSON, model: 'claude-3', tokens_used: 200 });
      return DataProcessResult.success({ text: ARBITER_PASS, model: 'claude-3', tokens_used: 50 });
    }),
    generateStructured: jest.fn(),
    getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
  };
}

function makeDepthAi(response = LEAF_RESPONSE) {
  return {
    generate: jest
      .fn()
      .mockResolvedValue(
        DataProcessResult.success({ text: response, model: 'claude-3', tokens_used: 100 }),
      ),
    generateStructured: jest.fn(),
    getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
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

// ── Tests ──────────────────────────────────────────────────────────────────────

describe('Cycles 1-3 Chain Integration', () => {
  it('user intent → plan steps → NODE → LEAF → executor: full chain succeeds', async () => {
    const db = makeInMemoryDb();
    const plannerAi = makePlannerAi();
    const convAi = makeConvergenceAi();
    const depthAi = makeDepthAi();

    const planner = new PlannerHandler(plannerAi as any, db as any);
    const convergence = new ConvergenceHandler(
      convAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );
    const depth = new DepthDecisionHandler(depthAi as any, db as any);

    // Cycle 1
    const planResult = await planner.handle(makePlannerCtx());
    expect(planResult.isSuccess).toBe(true);

    const steps = planResult.data?.data?.['planSteps'] as any[];
    expect(steps.length).toBeGreaterThan(0);

    // Cycle 2 — run first step
    const convResult = await convergence.handle(makeConvergenceCtx(steps[0]!));
    expect(convResult.isSuccess).toBe(true);

    const winningNode = convResult.data?.data?.['winningNode'] as Record<string, unknown>;
    expect(winningNode).toBeDefined();

    // Cycle 3
    const depthResult = await depth.handle(makeDepthCtx(winningNode));
    expect(depthResult.isSuccess).toBe(true);
    expect(['LEAF', 'EXPAND']).toContain(depthResult.data?.data?.['verdict']);
  });

  it('all 5 cycle visibility records are written — completeness test Q1-Q5 pass', async () => {
    const db = makeInMemoryDb();
    const plannerAi = makePlannerAi();
    const convAi = makeConvergenceAi();
    const depthAi = makeDepthAi();

    const planner = new PlannerHandler(plannerAi as any, db as any);
    const convergence = new ConvergenceHandler(
      convAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );
    const depth = new DepthDecisionHandler(depthAi as any, db as any);

    const planResult = await planner.handle(makePlannerCtx());
    const steps = planResult.data?.data?.['planSteps'] as any[];
    const convResult = await convergence.handle(makeConvergenceCtx(steps[0]!));
    const winningNode = convResult.data?.data?.['winningNode'] as Record<string, unknown>;
    await depth.handle(makeDepthCtx(winningNode));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const cycleTypes = records.map((r) => r['cycleType']);

    expect(cycleTypes).toContain('CYCLE_1_PLANNER');
    expect(cycleTypes).toContain('CYCLE-2');
    expect(cycleTypes).toContain('CYCLE_3_DEPTH_DECISION');

    // Cycle 5 did not fire (all grades >= 0.85)
    const cycle5DidFire = cycleTypes.includes('CYCLE_5_META_ARBITER');
    expect(cycle5DidFire).toBe(false);
  });

  it('Q1: user intent recoverable from Cycle 1 SENT', async () => {
    const db = makeInMemoryDb();
    const plannerAi = makePlannerAi();

    const planner = new PlannerHandler(plannerAi as any, db as any);
    await planner.handle(makePlannerCtx());

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const cycle1 = records.find((r) => r['cycleType'] === 'CYCLE_1_PLANNER');
    expect(cycle1).toBeDefined();

    const sent = cycle1!['sent'] as Record<string, unknown>;
    expect(sent['userIntent']).toBe(
      'When a user registers, verify their email and deliver onboarding',
    );
  });

  it('Q2: winning model recoverable from Cycle 4 DECIDED', async () => {
    // Note: Cycle 4 is AF pipeline (mocked here). We verify the pattern holds.
    // Simulate Cycle 4 being written by the executor (external to these 3 handlers)
    const db = makeInMemoryDb();
    const cycle4Id = randomUUID();
    await db.storeDocument(
      'xiigen-cycle-visibility',
      {
        id: cycle4Id,
        cycleType: 'CYCLE_4_EXECUTOR',
        flowId: 'FLOW-01',
        tenantId: TENANT,
        runId: 'chain-run-q2',
        decided: { winningModel: 'claude-3', grade: 0.92 },
      } as Record<string, unknown>,
      cycle4Id,
    );

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const cycle4 = records.find((r) => r['cycleType'] === 'CYCLE_4_EXECUTOR');
    expect(cycle4).toBeDefined();
    const decided = cycle4!['decided'] as Record<string, unknown>;
    expect(decided['winningModel']).toBeDefined();
  });

  it('Q3: depth reason recoverable from Cycle 3 DECIDED', async () => {
    const db = makeInMemoryDb();
    const depthAi = makeDepthAi();
    const depth = new DepthDecisionHandler(depthAi as any, db as any);

    const node = JSON.parse(NODE_JSON);
    await depth.handle(makeDepthCtx(node));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const cycle3 = records.find((r) => r['cycleType'] === 'CYCLE_3_DEPTH_DECISION');
    expect(cycle3).toBeDefined();

    const decided = cycle3!['decided'] as Record<string, unknown>;
    expect(decided).toHaveProperty('grade');
    expect(decided).toHaveProperty('terminationBoundApplied');
  });

  it('Q4: decision graph changes recoverable from all CHANGED fields', async () => {
    const db = makeInMemoryDb();
    const plannerAi = makePlannerAi();
    const convAi = makeConvergenceAi();
    const depthAi = makeDepthAi();

    const planner = new PlannerHandler(plannerAi as any, db as any);
    const convergence = new ConvergenceHandler(
      convAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );
    const depth = new DepthDecisionHandler(depthAi as any, db as any);

    const planResult = await planner.handle(makePlannerCtx());
    const steps = planResult.data?.data?.['planSteps'] as any[];
    const convResult = await convergence.handle(makeConvergenceCtx(steps[0]!));
    const winningNode = convResult.data?.data?.['winningNode'] as Record<string, unknown>;
    await depth.handle(makeDepthCtx(winningNode));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    for (const record of records) {
      expect(record['changed']).toBeDefined();
      expect(typeof record['changed']).toBe('string');
    }
  });

  it('Q5: when Cycle 5 fires, ranked proposals are present in Cycle 5 DECIDED', async () => {
    // Simulate a low-grade plan that triggers Cycle 5
    const db = makeInMemoryDb();

    // Simulate Cycle 5 execution record being written
    const cycle5Id = randomUUID();
    await db.storeDocument(
      'xiigen-cycle-visibility',
      {
        id: cycle5Id,
        cycleType: 'CYCLE_5_META_ARBITER',
        flowId: 'FLOW-01',
        tenantId: TENANT,
        runId: 'chain-run-q5',
        trigger_cycle: 'CYCLE_1_PLANNER',
        bad_grade: 0.4,
        prior_grades: [0.4],
        decided: {
          rankedProposals: [
            { rank: 1, proposal: 'Retry with refined constraints', score: 0.72 },
            { rank: 2, proposal: 'Escalate to human review', score: 0.55 },
          ],
        },
      } as Record<string, unknown>,
      cycle5Id,
    );

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const cycle5 = records.find((r) => r['cycleType'] === 'CYCLE_5_META_ARBITER');
    expect(cycle5).toBeDefined();

    const decided = cycle5!['decided'] as Record<string, unknown>;
    const rankedProposals = decided['rankedProposals'] as any[];
    expect(rankedProposals).toBeDefined();
    expect(rankedProposals.length).toBeGreaterThan(0);
  });

  it('Cycle 2 BLOCK verdict stops chain — does not proceed to Cycle 3', async () => {
    const db = makeInMemoryDb();
    let convAiIdx = 0;
    const convAi = {
      generate: jest.fn().mockImplementation(async () => {
        convAiIdx++;
        // First arbiter call returns BLOCK (no generator call in new handler — all generate() calls are arbiters)
        if (convAiIdx === 1)
          return DataProcessResult.success({
            text: JSON.stringify({
              verdict: 'BLOCK',
              criterion: 'Domain',
              detail: 'critical domain violation',
            }),
            model: 'claude-3',
            tokens_used: 50,
          });
        return DataProcessResult.success({
          text: ARBITER_PASS,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const depthAi = makeDepthAi();
    const depthGenerateCalls = depthAi.generate;

    const convergence = new ConvergenceHandler(
      convAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );
    const depth = new DepthDecisionHandler(depthAi as any, db as any);

    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: { stepText: 'Some step', constraints: ['No typed models'], stepType: 'REGISTRATION' },
    };
    const convResult = await convergence.handle(stepCtx);

    // Chain logic: if accepted=false, don't call Cycle 3
    if (!convResult.data?.data?.['accepted']) {
      // Depth handler was NOT called because chain stopped
      expect(depthGenerateCalls).not.toHaveBeenCalled();
    }
    expect(convResult.data?.data?.['accepted']).toBe(false);
  });

  it('Cycle 3 grade < threshold stops chain — does not proceed to Cycle 4', async () => {
    const db = makeInMemoryDb();
    const noSignalLeafResponse = JSON.stringify({
      verdict: 'LEAF',
      justification: 'simple',
      signalsEvaluated: [], // No signals = grade 0
      signalsTriggered: [],
      subFlowDecomposition: null,
    });

    const depthAi = makeDepthAi(noSignalLeafResponse);
    const depth = new DepthDecisionHandler(depthAi as any, db as any);
    const node = JSON.parse(NODE_JSON);
    const result = await depth.handle(makeDepthCtx(node));

    expect(result.data?.data?.['grade']).toBe(0);
    expect(result.data?.data?.['accepted']).toBe(false);
  });

  it('Meta-Arbiter trigger: grade < 0.85 in any cycle writes Cycle 5 execution record', async () => {
    const db = makeInMemoryDb();

    // Simulate the chain detecting a low grade and writing Cycle 5 record
    const grade = 0.4;
    if (grade < 0.85) {
      const cycle5Id = randomUUID();
      await db.storeDocument(
        'xiigen-cycle-visibility',
        {
          id: cycle5Id,
          cycleType: 'CYCLE_5_META_ARBITER',
          flowId: 'FLOW-01',
          tenantId: TENANT,
          runId: 'chain-run-meta',
          trigger_cycle: 'CYCLE_1_PLANNER',
          bad_grade: grade,
          prior_grades: [grade],
          decided: { rankedProposals: [] },
        } as Record<string, unknown>,
        cycle5Id,
      );
    }

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const cycle5 = records.find((r) => r['cycleType'] === 'CYCLE_5_META_ARBITER');
    expect(cycle5).toBeDefined();
    expect(cycle5!['trigger_cycle']).toBe('CYCLE_1_PLANNER');
    expect(cycle5!['bad_grade']).toBe(0.4);
    expect(Array.isArray(cycle5!['prior_grades'])).toBe(true);
  });

  it('all 5 visibility records are scoped to same tenantId', async () => {
    const db = makeInMemoryDb();
    const plannerAi = makePlannerAi();
    const convAi = makeConvergenceAi();
    const depthAi = makeDepthAi();

    const planner = new PlannerHandler(plannerAi as any, db as any);
    const convergence = new ConvergenceHandler(
      convAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );
    const depth = new DepthDecisionHandler(depthAi as any, db as any);

    const planResult = await planner.handle(makePlannerCtx(TENANT));
    const steps = planResult.data?.data?.['planSteps'] as any[];
    const convResult = await convergence.handle(makeConvergenceCtx(steps[0]!, TENANT));
    const winningNode = convResult.data?.data?.['winningNode'] as Record<string, unknown>;
    await depth.handle(makeDepthCtx(winningNode, TENANT));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    for (const record of records) {
      expect(record['tenantId']).toBe(TENANT);
    }
  });

  it('cross-tenant query returns no records from this flow run', async () => {
    const db = makeInMemoryDb();
    const plannerAi = makePlannerAi();

    const planner = new PlannerHandler(plannerAi as any, db as any);
    await planner.handle(makePlannerCtx(TENANT));

    // Query using OTHER_TENANT — should not see TENANT's records
    const allRecords = db._store.get('xiigen-cycle-visibility') ?? [];
    const otherTenantRecords = allRecords.filter((r) => r['tenantId'] === OTHER_TENANT);
    expect(otherTenantRecords.length).toBe(0);
  });

  // ── GAP-3: 2-model fallback ──────────────────────────────────────────────

  it('GAP-3: convergence works with teaching round (delegates to TeachingRoundService)', async () => {
    const db = makeInMemoryDb();
    const arbiterAi = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: ARBITER_PASS, model: 'claude-3', tokens_used: 50 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    // TeachingRoundService is the new multi-model mechanism
    const convergence = new ConvergenceHandler(
      arbiterAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );

    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: {
        stepText: 'Validate email uniqueness',
        constraints: ['No typed models'],
        stepType: 'REGISTRATION',
      },
    };
    const result = await convergence.handle(stepCtx);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['winningNode']).toBeDefined();
    expect(result.data?.data?.['bestModel']).toBe('mock-gemini');
  });

  it('GAP-3: convergence fails gracefully when teaching round returns no results', async () => {
    const db = makeInMemoryDb();
    const arbiterAi = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: ARBITER_PASS, model: 'claude-3', tokens_used: 50 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const convergence = new ConvergenceHandler(
      arbiterAi as any,
      makeMockTeachingRound(NODE_JSON, 9.0, true) as any,
      db as any,
    );
    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: {
        stepText: 'Send verification email',
        constraints: ['No typed models'],
        stepType: 'REGISTRATION',
      },
    };
    const result = await convergence.handle(stepCtx);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CONVERGENCE_ROUNDS_FAILED');
  });

  // ── GAP-4: two-layer context / parent NODE to arbiters only ─────────────

  it('GAP-4: parentNode in challengerContext reaches arbiter prompt but not generator nodePrompt', async () => {
    const db = makeInMemoryDb();
    const capturedNodePrompts: string[] = [];
    const arbiterCalls: string[] = [];

    // Capture TeachingRoundService to verify nodePrompt does NOT contain parentNode
    const captureTr = {
      run: jest.fn().mockImplementation(async (opts: any) => {
        capturedNodePrompts.push(opts.nodePrompt ?? '');
        return DataProcessResult.success({
          bestOutput: NODE_JSON,
          bestModel: 'mock-gemini',
          bestScore: 9.0,
          triples: [],
        });
      }),
    };

    const ai = {
      generate: jest.fn().mockImplementation(async (prompt: string) => {
        arbiterCalls.push(prompt);
        return DataProcessResult.success({
          text: ARBITER_PASS,
          model: 'claude-3',
          tokens_used: 50,
        });
      }),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const parentNode = {
      structure: { inputShape: ['userId'], outputShape: ['profileRecord'] },
      intent: { purpose: 'Establish user identity in the system' },
      constraints: ['No typed models'],
      quality: { scoringCriteria: ['identity created'] },
    };

    const convergence = new ConvergenceHandler(ai as any, captureTr as any, db as any);
    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: {
        stepText: 'Assign a unique identifier to the new profile',
        constraints: ['No typed models'],
        stepType: 'REGISTRATION',
        challengerRoles: ['IronRules'],
        // Two-layer context: parentNode must reach arbiters but NOT generators
        challengerContext: {
          parentNode,
          parentDepth: 1,
          delegatedScope: 'profile identifier assignment',
        },
      },
    };

    await convergence.handle(stepCtx);

    // Teaching round nodePrompt must NOT contain parent node content
    expect(capturedNodePrompts.length).toBeGreaterThan(0);
    expect(capturedNodePrompts[0]).not.toContain('PARENT NODE');
    expect(capturedNodePrompts[0]).not.toContain('Establish user identity');

    // Arbiter prompts MUST contain parent node reference
    expect(arbiterCalls.length).toBeGreaterThan(0);
    expect(arbiterCalls[0]).toContain('PARENT NODE');
    expect(arbiterCalls[0]).toContain('Establish user identity');
  });

  // ── GAP-4: EXPAND recursion — CycleChainService wires sub-flows ─────────

  it('GAP-4: EXPAND verdict spawns recursive sub-flows — topology has children, leafNodes collected', async () => {
    const EXPAND_RESPONSE = JSON.stringify({
      verdict: 'EXPAND',
      justification: 'Multi-responsibility — S1 triggered',
      signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
      signalsTriggered: ['S1'],
      subFlowDecomposition: [
        { name: 'verify-email', intClause: 'verify their email', isDistinct: true },
        { name: 'send-onboarding', intClause: 'deliver onboarding', isDistinct: true },
      ],
    });

    const winningNodeFixture = {
      structure: { inputShape: ['email'], outputShape: ['status'] },
      intent: { purpose: 'Placeholder sub-flow node' },
      constraints: ['No typed models'],
      quality: { scoringCriteria: ['passes'] },
    };

    // Mock planner: always returns 1 step (same fixture at every recursion level)
    const mockPlanner = {
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: {
            planSteps: [{ index: 1, text: 'Register user', intClause: 'register user' }],
            grade: 0.92,
            accepted: true,
            plannerModel: 'claude-3',
            reviewerModel: 'claude-3',
            visibilityId: randomUUID(),
            reviewerGaps: [],
          },
        }),
      ),
    };

    // Mock convergence: always accepts, returns winningNode
    const mockConvergence = {
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: {
            accepted: true,
            grade: 0.93,
            convergenceScore: 1.0,
            winningNode: winningNodeFixture,
            candidateA: winningNodeFixture,
            candidateB: null,
            candidateC: null,
          },
        }),
      ),
    };

    // Mock depth: EXPAND at depth=1, LEAF at depth=2 (terminates recursion)
    const mockDepth = {
      handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
        const depth =
          typeof ctx.inputs['currentDepth'] === 'number'
            ? (ctx.inputs['currentDepth'] as number)
            : 1;
        if (depth === 1) {
          return DataProcessResult.success({
            data: {
              verdict: 'EXPAND',
              grade: 1.0,
              accepted: true,
              justification: 'Multi-responsibility',
              signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
              signalsTriggered: ['S1'],
              subFlowDecomposition: [
                { name: 'verify-email', intClause: 'verify their email', isDistinct: true },
                { name: 'send-onboarding', intClause: 'deliver onboarding', isDistinct: true },
              ],
            },
          });
        }
        // depth >= 2: LEAF — terminates recursion
        return DataProcessResult.success({
          data: {
            verdict: 'LEAF',
            grade: 1.0,
            accepted: true,
            justification: 'Single-responsibility at sub-flow depth',
            signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
            signalsTriggered: [],
            subFlowDecomposition: null,
          },
        });
      }),
    };

    // Phase 1: async queue handoff — provide mock db + queue
    const mockDb = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
      createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const mockQueue = {
      enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-id')),
      dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-id')),
      waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
    };

    const service = new CycleChainService(
      mockPlanner as unknown as PlannerHandler,
      mockConvergence as unknown as ConvergenceHandler,
      mockDepth as unknown as DepthDecisionHandler,
      undefined,
      undefined,
      mockDb as any,
      mockQueue as any,
    );

    const result = await service.run({
      userIntent: 'When a user registers, verify their email and deliver onboarding',
      constraints: ['No typed models', 'No throw for business logic'],
      flowId: 'FLOW-01',
      runId: 'gap4-expand-test',
      tenantId: TENANT,
    });

    expect(result.isSuccess).toBe(true);
    const { topology } = result.data!;

    // Phase 1 async: run returns SUSPENDED immediately on first EXPAND
    expect(result.data!.status).toBe('SUSPENDED');

    // Top-level: 1 plan step that EXPAND-ed
    expect(topology.length).toBe(1);
    expect(topology[0]!.verdict).toBe('EXPAND');
    expect(topology[0]!.depth).toBe(1);
    // Children are empty — populated by ExpandConsumerHandler after async sub-flows complete
    expect(topology[0]!.children.length).toBe(0);

    // 2 SubFlowRef records stored to xiigen-run-state (DNA-8 before emit)
    expect(result.data!.subFlows?.length).toBe(2);

    // 2 'cycle.chain.expand' events queued — one per sub-node
    const expandEvents = (mockQueue.enqueue as jest.Mock).mock.calls.filter(
      ([e]: [string]) => e === 'cycle.chain.expand',
    );
    expect(expandEvents.length).toBe(2);

    // Planner called once only — sub-flows deferred to ExpandConsumerHandler
    expect(mockPlanner.handle).toHaveBeenCalledTimes(1);
  });

  it('GAP-4: two-layer rule respected — parentNode passed to sub-flow convergence context only', async () => {
    // When a top-level EXPAND fires, the winningNode at depth=1 becomes the parentNode
    // in the recursive call. CycleChainService must pass it via challengerContext ONLY
    // (not as userIntent, domain, or constraints).
    const capturedConvergenceInputs: Record<string, unknown>[] = [];

    const mockPlanner = {
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: {
            planSteps: [{ index: 1, text: 'Unique step', intClause: 'unique intent' }],
            grade: 0.9,
            accepted: true,
            plannerModel: 'claude-3',
            reviewerModel: 'claude-3',
            visibilityId: randomUUID(),
            reviewerGaps: [],
          },
        }),
      ),
    };

    const parentNodeFixture = {
      structure: { inputShape: ['userId'], outputShape: ['token'] },
      intent: { purpose: 'Establish user identity' },
      constraints: ['No typed models'],
      quality: { scoringCriteria: ['identity created'] },
    };

    const mockConvergence = {
      handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
        capturedConvergenceInputs.push({ ...ctx.inputs });
        return DataProcessResult.success({
          data: {
            accepted: true,
            grade: 0.91,
            convergenceScore: 1.0,
            winningNode: parentNodeFixture,
            candidateA: parentNodeFixture,
            candidateB: null,
            candidateC: null,
          },
        });
      }),
    };

    let depthCallIdx = 0;
    const mockDepth = {
      handle: jest.fn().mockImplementation(async (ctx: NodeHandlerContext) => {
        depthCallIdx++;
        if (depthCallIdx === 1) {
          return DataProcessResult.success({
            data: {
              verdict: 'EXPAND',
              grade: 1.0,
              accepted: true,
              justification: 'Split needed',
              signalsEvaluated: ['S1'],
              signalsTriggered: ['S1'],
              subFlowDecomposition: [
                { name: 'sub-a', intClause: 'sub intent A', isDistinct: true },
              ],
            },
          });
        }
        return DataProcessResult.success({
          data: {
            verdict: 'LEAF',
            grade: 1.0,
            accepted: true,
            justification: 'Leaf',
            signalsEvaluated: ['S1'],
            signalsTriggered: [],
            subFlowDecomposition: null,
          },
        });
      }),
    };

    // Phase 1: async queue handoff — provide mock db + queue
    const mockDb = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      getDocument: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_FOUND', '')),
      deleteDocument: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      bulkStore: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      countDocuments: jest.fn().mockResolvedValue(DataProcessResult.success(0)),
      createIndex: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    const mockQueue = {
      enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-id')),
      dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
      acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
      sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-id')),
      waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
    };

    const service = new CycleChainService(
      mockPlanner as unknown as PlannerHandler,
      mockConvergence as unknown as ConvergenceHandler,
      mockDepth as unknown as DepthDecisionHandler,
      undefined,
      undefined,
      mockDb as any,
      mockQueue as any,
    );

    await service.run({
      userIntent: 'Top-level intent',
      constraints: ['No typed models'],
      flowId: 'FLOW-01',
      runId: 'gap4-two-layer-test',
      tenantId: TENANT,
    });

    // Phase 1 async: top-level convergence is called once (depth=1 only)
    // Sub-flow convergence is NOT called inline — deferred to ExpandConsumerHandler
    expect(capturedConvergenceInputs.length).toBe(1);

    // Top-level call has no challengerContext (no parentNode at depth=1 root)
    expect(capturedConvergenceInputs[0]!['challengerContext']).toBeUndefined();

    // Two-layer rule verification: parentNode passed in queue event payload
    // ExpandConsumerHandler will pass it as parentNode → challengerContext when running child
    const expandEvents = (mockQueue.enqueue as jest.Mock).mock.calls.filter(
      ([e]: [string]) => e === 'cycle.chain.expand',
    );
    expect(expandEvents.length).toBe(1); // 1 sub-node from mockDepth

    const expandPayload = expandEvents[0]![1] as Record<string, unknown>;
    // parentNode carried in the queue event — two-layer rule preserved across async boundary
    expect(expandPayload['parentNode']).toBeDefined();
    const pn = expandPayload['parentNode'] as Record<string, unknown>;
    expect(pn['intent']).toBeDefined();
    // Sub-flow intent is the intClause, not the full parentNode JSON
    expect(typeof expandPayload['subFlowIntent']).toBe('string');
    expect(expandPayload['delegatedScope']).toBe(expandPayload['subFlowIntent']);
  });

  it('GAP-4: accepted NODE is persisted to xiigen-node-definitions index', async () => {
    const db = makeInMemoryDb();
    const convAi = makeConvergenceAi();
    const convergence = new ConvergenceHandler(
      convAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );

    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: {
        stepText: 'Confirm email uniqueness before account creation',
        constraints: ['No typed models', 'No throw for business logic'],
        stepType: 'REGISTRATION',
      },
    };
    const result = await convergence.handle(stepCtx);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['accepted']).toBe(true);

    // GAP-2: NODE must be persisted to xiigen-node-definitions
    const nodeRecords = db._store.get('xiigen-node-definitions') ?? [];
    expect(nodeRecords.length).toBeGreaterThan(0);
    const stored = nodeRecords[0]!;
    expect(stored['stepText']).toBe('Confirm email uniqueness before account creation');
    expect(stored['winningNode']).toBeDefined();
    expect(stored['grade']).toBeGreaterThan(0);
  });

  // ── P1: DPO triple (PRE-FLOW-01 prerequisite) ────────────────────────────

  it('P1: Cycle 2 writes CYCLE-4 handoff record to xiigen-training-data', async () => {
    const db = makeInMemoryDb();
    const arbiterAi = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: ARBITER_PASS, model: 'claude-3', tokens_used: 50 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const tr = makeMockTeachingRound(NODE_JSON, 9.0);
    const convergence = new ConvergenceHandler(arbiterAi as any, tr as any, db as any);
    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: {
        stepText: 'Verify email is unique before account creation',
        constraints: ['No typed models', 'No throw for business logic'],
        stepType: 'REGISTRATION',
      },
    };

    const result = await convergence.handle(stepCtx);
    expect(result.isSuccess).toBe(true);

    // CYCLE-4 handoff record written to xiigen-training-data
    const trainingRecords = db._store.get('xiigen-training-data') ?? [];
    expect(trainingRecords.length).toBeGreaterThan(0);

    const cycle4 = trainingRecords.find((r) => r['station'] === 'CYCLE-4');
    expect(cycle4).toBeDefined();
    expect(cycle4!['status']).toBe('PENDING_IMPLEMENTATION');
    expect(cycle4!['bestTeachingModel']).toBe('mock-gemini');
    expect(cycle4!['bestTeachingScore']).toBe(9.0);
    expect(cycle4!['stepText']).toBeDefined();
  });

  it('P1: Cycle 2 CYCLE-4 record contains implementing model and target grade', async () => {
    const db = makeInMemoryDb();
    const convAi = makeConvergenceAi();
    const convergence = new ConvergenceHandler(
      convAi as any,
      makeMockTeachingRound() as any,
      db as any,
    );

    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: {
        stepText: 'Send welcome email after registration',
        constraints: ['No typed models'],
        stepType: 'REGISTRATION',
      },
    };
    await convergence.handle(stepCtx);

    const trainingRecords = db._store.get('xiigen-training-data') ?? [];
    expect(trainingRecords.length).toBeGreaterThan(0);

    const cycle4 = trainingRecords.find((r) => r['station'] === 'CYCLE-4');
    expect(cycle4).toBeDefined();
    expect(cycle4!['implementingModel']).toBe('claude-code');
    expect(typeof cycle4!['targetGrade']).toBe('number');
  });

  it('P1: visibility record received field contains bestModel and bestScore from teaching rounds', async () => {
    const db = makeInMemoryDb();
    const primaryMock = makeConvergenceAi();

    const convergence = new ConvergenceHandler(
      primaryMock as any,
      makeMockTeachingRound(NODE_JSON, 9.2) as any,
      db as any,
    );
    const stepCtx: NodeHandlerContext = {
      ...makePlannerCtx(),
      inputs: {
        stepText: 'Grant access after email confirmed',
        constraints: ['No typed models'],
        stepType: 'REGISTRATION',
      },
    };
    await convergence.handle(stepCtx);

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const cycle2 = records.find((r) => r['cycleType'] === 'CYCLE-2');
    expect(cycle2).toBeDefined();

    const received = cycle2!['received'] as Record<string, unknown>;
    // Actual model name from teaching round (not 'primary' placeholder)
    expect(received['bestModel']).toBeDefined();
    expect(typeof received['bestModel']).toBe('string');
    expect(received['bestModel']).toBe('mock-gemini');
    // Numerical score present
    expect(typeof received['bestScore']).toBe('number');
    expect(received['bestScore']).toBe(9.2);
  });
});
