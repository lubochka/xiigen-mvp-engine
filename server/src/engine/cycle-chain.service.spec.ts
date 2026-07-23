/**
 * CycleChainService unit tests
 *
 * Tests:
 *   1. Full LEAF chain: Cycle 1 → 2 → 3(LEAF) → leafNodes returned
 *   2. EXPAND chain: Cycle 3 returns EXPAND → sub-flow Cycle 1 called recursively
 *   3. Plan rejected (grade < threshold) → DataProcessResult.failure returned
 *   4. Convergence rejected → step skipped, chain continues with remaining steps
 *   5. Two-layer context: parentNode is in convergenceCtx.challengerContext, not in plannerCtx
 *   6. Termination bound: sub-flow at depth === terminationDepth gets LEAF (no further recursion)
 *
 * DNA-3: CycleChainService never throws — all failures are DataProcessResult.failure
 */

import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { CycleChainService, CycleChainInput } from './cycle-chain.service';
import { PlannerHandler } from './node-handlers/planner.handler';
import { ConvergenceHandler } from './node-handlers/convergence.handler';
import { DepthDecisionHandler } from './node-handlers/depth-decision.handler';
import { IDatabaseService } from '../fabrics/interfaces/database.interface';
import { IQueueService } from '../fabrics/interfaces/queue.interface';
import { CycleHistoryService } from './cycle-history.service';
import { RagEvaluateHandler } from './node-handlers/rag-evaluate.handler';
import { RagQueryHandler } from './node-handlers/rag-query.handler';
import { IFreedomConfigService } from '../freedom/freedom-config.interface';

// ── Fixtures ──────────────────────────────────────────────────────────────────

const PLAN_JSON = JSON.stringify({
  steps: [
    {
      index: 1,
      text: 'Validate the user email uniqueness',
      intClause: 'validate email',
      dependencies: [],
    },
    {
      index: 2,
      text: 'Grant access after email is confirmed',
      intClause: 'grant access',
      dependencies: [1],
    },
  ],
});

const PLAN_REVIEW_JSON = JSON.stringify({
  coverage: [
    { clause: 'validate email', verdict: 'COVERED', step: 1 },
    { clause: 'grant access', verdict: 'COVERED', step: 2 },
  ],
  abstractionViolations: [],
  responsibilityFlags: [],
  dependencyGaps: [],
});

const PLAN_REJECTED_REVIEW = JSON.stringify({
  coverage: [{ clause: 'validate email', verdict: 'MISSING', step: 0 }],
  abstractionViolations: ['step 1: uses "email" which is a tech term'],
  responsibilityFlags: [],
  dependencyGaps: ['step 1 missing dependency'],
});

const NODE_JSON = JSON.stringify({
  structure: {
    inputShape: ['email'],
    outputShape: ['uniquenessStatus'],
    triggers: [],
    emits: [],
    dependencies: [],
  },
  intent: {
    purpose: 'Validate uniqueness of the provided address',
    invariants: [],
    failureModes: ['duplicate found'],
    domainConcepts: [],
  },
  constraints: ['No typed models'],
  quality: {
    scoringCriteria: ['uniqueness confirmed'],
    acceptanceThreshold: 0.85,
    degradationAcceptable: false,
  },
});

const ARBITER_BLOCK = JSON.stringify({
  verdict: 'BLOCK',
  criterion: 'Domain',
  detail: 'critical violation',
});

const LEAF_RESPONSE = JSON.stringify({
  verdict: 'LEAF',
  justification: 'Single-responsibility — no signals triggered',
  signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
  signalsTriggered: [],
  subFlowDecomposition: null,
});

const EXPAND_RESPONSE = JSON.stringify({
  verdict: 'EXPAND',
  justification: 'S1: intent contains two distinct responsibilities',
  signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
  signalsTriggered: ['S1'],
  subFlowDecomposition: [
    {
      name: 'email-validate',
      intClause: 'Validate the address format and uniqueness',
      isDistinct: true,
    },
    { name: 'access-grant', intClause: 'Grant system access after confirmation', isDistinct: true },
  ],
});

// ── Mock factories ─────────────────────────────────────────────────────────────

function makePlannerMock(planJson = PLAN_JSON, reviewJson = PLAN_REVIEW_JSON): PlannerHandler {
  let callCount = 0;
  return {
    nodeType: 'planner',
    handle: jest.fn().mockImplementation(async (_ctx: any) => {
      callCount++;
      // Planner produces planJson, reviewer produces reviewJson
      const plannerOutput = JSON.parse(planJson);
      const reviewerOutput = JSON.parse(reviewJson);
      const coverage = reviewerOutput.coverage ?? [];
      const abstractionViolations = reviewerOutput.abstractionViolations ?? [];
      const responsibilityFlags = reviewerOutput.responsibilityFlags ?? [];
      const dependencyGaps = reviewerOutput.dependencyGaps ?? [];
      const coverageScore =
        coverage.reduce((sum: number, c: any) => {
          if (c.verdict === 'COVERED') return sum + 1;
          if (c.verdict === 'PARTIAL') return sum + 0.5;
          return sum;
        }, 0) / Math.max(coverage.length, 1);
      const abstractionScore = abstractionViolations.length === 0 ? 1.0 : 0.0;
      const responsibilityScore =
        plannerOutput.steps.length === 0
          ? 0
          : 1 - responsibilityFlags.length / plannerOutput.steps.length;
      const dependencyScore = dependencyGaps.length === 0 ? 1.0 : 0.0;
      const grade =
        coverageScore * abstractionScore * (0.5 + 0.5 * responsibilityScore) * dependencyScore;
      return DataProcessResult.success({
        data: {
          planSteps: plannerOutput.steps,
          grade,
          accepted: grade >= 0.85,
          reviewerGaps: [...abstractionViolations, ...dependencyGaps],
          plannerModel: 'mock-planner',
          reviewerModel: 'mock-reviewer',
          visibilityId: `vis-plan-${callCount}`,
          plannerSystemPrompt: 'system-prompt-from-planner',
          plannerUserPrompt: 'user-prompt-from-planner',
        },
      });
    }),
  } as unknown as PlannerHandler;
}

function makeConvergenceMock(pass = true): ConvergenceHandler {
  return {
    nodeType: 'convergence',
    handle: jest.fn().mockImplementation(async (_ctx: any) => {
      if (!pass) {
        return DataProcessResult.success({
          data: {
            accepted: false,
            grade: 0,
            convergenceScore: 0,
            winningNode: null,
            arbiterVerdicts: [{ arbiter: 'Domain', verdict: 'BLOCK' }],
            visibilityId: 'vis-conv-block',
          },
        });
      }
      const node = JSON.parse(NODE_JSON);
      return DataProcessResult.success({
        data: {
          winningNode: node,
          accepted: true,
          grade: 1.0,
          bestScore: 9.0,
          bestModel: 'mock-gemini',
          convergenceScore: 1.0,
          roundsCompleted: 1,
          stagnationFired: false,
          arbiterVerdicts: [{ arbiter: 'Domain', verdict: 'PASS', detail: 'ok' }],
          visibilityId: 'vis-conv-pass',
          cycle4Id: 'mock-cycle4-uuid',
          nodePrompt: 'node-generation-prompt',
          judgeSystemPrompt: 'judge-system-prompt',
          triples: [
            {
              round: 1,
              chosen: { model: 'mock-gemini', score: 9.0, text: NODE_JSON },
              rejected: { model: 'mock-openai', score: 7.0, text: NODE_JSON },
              discarded: null,
              totalCost: 0.001,
            },
          ],
        },
      });
    }),
  } as unknown as ConvergenceHandler;
}

function makeDepthMock(verdict: 'LEAF' | 'EXPAND' = 'LEAF'): DepthDecisionHandler {
  return {
    nodeType: 'depth-decision',
    handle: jest.fn().mockImplementation(async (_ctx: any) => {
      const response = verdict === 'LEAF' ? JSON.parse(LEAF_RESPONSE) : JSON.parse(EXPAND_RESPONSE);
      return DataProcessResult.success({
        data: {
          verdict: response.verdict,
          justification: response.justification,
          signalsTriggered: response.signalsTriggered,
          signalsEvaluated: response.signalsEvaluated,
          subFlowDecomposition: response.subFlowDecomposition,
          grade: response.signalsEvaluated.length > 0 ? 1.0 : 0.0,
          accepted: true,
          terminationBoundApplied: false,
          visibilityId: 'vis-depth',
          promptSent: 'depth-decision-prompt',
        },
      });
    }),
  } as unknown as DepthDecisionHandler;
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

function makeMockQueue(): IQueueService {
  return {
    enqueue: jest.fn().mockResolvedValue(DataProcessResult.success('msg-id')),
    dequeue: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    acknowledge: jest.fn().mockResolvedValue(DataProcessResult.success(true)),
    sendToDlq: jest.fn().mockResolvedValue(DataProcessResult.success('dlq-id')),
    waitFor: jest.fn().mockResolvedValue(DataProcessResult.failure('TIMEOUT', '')),
  } as unknown as IQueueService;
}

function makeMockCycleHistory(): CycleHistoryService {
  return {
    record: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    getSummariesForRun: jest.fn().mockResolvedValue(DataProcessResult.success([])),
  } as unknown as CycleHistoryService;
}

function makeMockRagEvaluate(applicableIds: string[] = []): RagEvaluateHandler {
  return {
    evaluate: jest.fn().mockImplementation(async (params: any) => {
      const applicable =
        applicableIds.length > 0
          ? params.patterns.filter((p: any) => applicableIds.includes(p.id ?? p.patternId))
          : params.patterns;
      return DataProcessResult.success({
        applicablePatterns: applicable,
        filteredOut: [],
        evaluationSummary: `${applicable.length}/${params.patterns.length} patterns applicable`,
        patternCount: params.patterns.length,
        applicableCount: applicable.length,
      });
    }),
  } as unknown as RagEvaluateHandler;
}

function makeMockRagQuery(reformulated = 'mock reformulated query'): RagQueryHandler {
  return {
    reformulate: jest.fn().mockResolvedValue(
      DataProcessResult.success({
        reformulatedQuery: reformulated,
        queryRationale: 'test rationale',
        originalStepText: 'original',
      }),
    ),
  } as unknown as RagQueryHandler;
}

function makeMockFreedomConfig(overrides: Record<string, unknown> = {}): IFreedomConfigService {
  return {
    get: jest.fn().mockImplementation(async (key: string) => {
      if (key in overrides) return { value: overrides[key] };
      return null;
    }),
  } as unknown as IFreedomConfigService;
}

function makeService(
  planner: PlannerHandler,
  convergence: ConvergenceHandler,
  depth: DepthDecisionHandler,
  db?: IDatabaseService,
  queue?: IQueueService,
  cycleHistory?: CycleHistoryService,
  ragEvaluate?: RagEvaluateHandler | null,
  ragQuery?: RagQueryHandler | null,
  freedomConfig?: IFreedomConfigService,
): CycleChainService {
  const ch = cycleHistory ?? makeMockCycleHistory();
  const svc = new CycleChainService(
    planner,
    convergence,
    depth,
    undefined,
    undefined,
    db,
    queue,
    ch,
    ragEvaluate,
    ragQuery,
    freedomConfig,
  );
  return svc;
}

// ── Tests ──────────────────────────────────────────────────────────────────────

const BASE_INPUT: CycleChainInput = {
  userIntent: 'When a user registers, verify their email and grant access',
  constraints: ['No typed models', 'No throw for business logic'],
  flowId: 'FLOW-01',
  runId: 'test-run-1',
  tenantId: 'test-tenant',
};

describe('CycleChainService', () => {
  it('full LEAF chain: returns leafNodes for each plan step', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const svc = makeService(planner, convergence, depth);

    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.leafNodes.length).toBe(2); // 2 plan steps → 2 leaf NODEs
    expect(result.data?.topology.length).toBe(2);
    expect(result.data?.topology.every((t) => t.verdict === 'LEAF')).toBe(true);
  });

  it('EXPAND: async queue handoff — returns SUSPENDED with SubFlowRefs + queue events per sub-node', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    // First step returns EXPAND
    const depth = makeDepthMock('EXPAND');
    const db = makeMockDb();
    const queue = makeMockQueue();

    const svc = makeService(planner, convergence, depth, db, queue);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    // Run returns SUSPENDED — no sub-flows executed inline
    expect(result.data?.status).toBe('SUSPENDED');

    // SubFlowRef stored per sub-node (EXPAND_RESPONSE has 2 sub-nodes)
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const refRecords = storeCalls.filter(([idx]) => idx === 'xiigen-run-state');
    // At least 2 SubFlowRef records + 1 RunSuspension = 3 total to xiigen-run-state
    expect(refRecords.length).toBeGreaterThanOrEqual(3);

    // One 'cycle.chain.expand' queue event per sub-node
    const enqueueCalls = (queue.enqueue as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>]
    >;
    const expandEvents = enqueueCalls.filter(([evType]) => evType === 'cycle.chain.expand');
    expect(expandEvents.length).toBe(2); // 2 sub-nodes in EXPAND_RESPONSE

    // Each expand event has correct parentRunId
    for (const [, payload] of expandEvents) {
      expect(payload['parentRunId']).toBe('test-run-1');
    }

    // subFlows populated with one ref per sub-node
    expect(result.data?.subFlows?.length).toBe(2);
    expect(result.data?.suspensions?.length).toBeGreaterThanOrEqual(1);

    // Topology records EXPAND node
    expect(result.data?.topology.some((t) => t.verdict === 'EXPAND')).toBe(true);

    // Planner called once only (for root run — sub-flows are NOT run inline)
    expect((planner.handle as jest.Mock).mock.calls.length).toBe(1);
  });

  it('plan rejected: returns failure when grade < 0.85', async () => {
    const planner = makePlannerMock(PLAN_JSON, PLAN_REJECTED_REVIEW);
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const svc = makeService(planner, convergence, depth);

    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CYCLE_CHAIN_PLAN_BELOW_THRESHOLD');
  });

  it('convergence rejected: skips step, continues chain with remaining steps', async () => {
    const planner = makePlannerMock();
    const depth = makeDepthMock('LEAF');

    // First step fails convergence, second passes
    let convCallCount = 0;
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (_ctx: any) => {
        convCallCount++;
        if (convCallCount === 1) {
          return DataProcessResult.success({
            data: {
              accepted: false,
              grade: 0,
              convergenceScore: 0,
              winningNode: null,
              arbiterVerdicts: [],
              visibilityId: 'v1',
            },
          });
        }
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 1.0,
            convergenceScore: 1.0,
            arbiterVerdicts: [],
            visibilityId: 'v2',
          },
        });
      }),
    } as unknown as ConvergenceHandler;

    const svc = makeService(planner, convergence, depth);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    // Only 1 leaf (step 1 skipped, step 2 passed)
    expect(result.data?.leafNodes.length).toBe(1);
  });

  it('two-layer context: parentNode appears in convergenceCtx challengerContext, not in plannerCtx', async () => {
    const plannerCtxs: any[] = [];
    const convergenceCtxs: any[] = [];

    const planner = {
      nodeType: 'planner',
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        plannerCtxs.push(ctx);
        return DataProcessResult.success({
          data: {
            planSteps: [
              { index: 1, text: 'Assign unique ID', intClause: 'assign id', dependencies: [] },
            ],
            grade: 0.95,
            accepted: true,
            reviewerGaps: [],
            plannerModel: 'mock',
            reviewerModel: 'mock',
            visibilityId: 'vp',
          },
        });
      }),
    } as unknown as PlannerHandler;

    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        convergenceCtxs.push(ctx);
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 1.0,
            convergenceScore: 1.0,
            arbiterVerdicts: [],
            visibilityId: 'vc',
          },
        });
      }),
    } as unknown as ConvergenceHandler;

    const depth = makeDepthMock('LEAF');

    const parentNode = {
      structure: {},
      intent: { purpose: 'Parent intent' },
      constraints: [],
      quality: {},
    };

    const svc = makeService(planner, convergence, depth);
    await svc.run({ ...BASE_INPUT, parentNode });

    // plannerCtx must NOT contain parentNode
    expect(plannerCtxs.length).toBeGreaterThan(0);
    const plannerInputs = plannerCtxs[0].inputs as Record<string, unknown>;
    expect(plannerInputs['parentNode']).toBeUndefined();
    expect(plannerInputs['challengerContext']).toBeUndefined();

    // convergenceCtx MUST contain parentNode in challengerContext (not top-level inputs)
    expect(convergenceCtxs.length).toBeGreaterThan(0);
    const convInputs = convergenceCtxs[0].inputs as Record<string, unknown>;
    expect(convInputs['parentNode']).toBeUndefined(); // NOT at top level
    const challengerCtx = convInputs['challengerContext'] as Record<string, unknown> | undefined;
    expect(challengerCtx).toBeDefined();
    expect((challengerCtx?.['parentNode'] as Record<string, unknown>)?.['intent']).toBeDefined();
  });

  // ── Observability tests ────────────────────────────────────────────────────

  it('response includes cycle1 with promptSent and grade', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const svc = makeService(planner, convergence, depth);

    const result = await svc.run(BASE_INPUT);
    expect(result.isSuccess).toBe(true);
    const out = result.data!;
    expect(out.cycles.cycle1).toBeDefined();
    expect(out.cycles.cycle1.grade).toBeGreaterThan(0);
    expect(out.cycles.cycle1.promptSent.system).toBeTruthy();
    expect(out.cycles.cycle1.promptSent.user).toBeTruthy();
  });

  it('response includes cycle2 with rounds, winner model, and arbiter verdicts', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const svc = makeService(planner, convergence, depth);

    const result = await svc.run(BASE_INPUT);
    const c2 = result.data!.cycles.cycle2;
    expect(c2.length).toBeGreaterThan(0);
    expect(c2[0]!.rounds.length).toBeGreaterThan(0);
    expect(c2[0]!.winnerModel).toBeTruthy();
    expect(Array.isArray(c2[0]!.arbiters)).toBe(true);
  });

  it('response includes pendingImplementations with cycle4Id and nodeSpec', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const svc = makeService(planner, convergence, depth);

    const result = await svc.run(BASE_INPUT);
    const pi = result.data!.pendingImplementations;
    expect(pi.length).toBeGreaterThan(0);
    expect(pi[0]!.cycle4Id).toBeTruthy();
    expect(pi[0]!.nodeSpec).toBeDefined();
    expect(pi[0]!.targetGrade).toBe(0.95);
  });

  it('DNA-3: never throws — returns DataProcessResult.failure on planner AI failure', async () => {
    const planner = {
      nodeType: 'planner',
      handle: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('PLAN_AI_FAILED', 'AI unavailable')),
    } as unknown as PlannerHandler;
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const svc = makeService(planner, convergence, depth);

    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('CYCLE_CHAIN_PLAN_FAILED');
  });

  // ── cycle2Traces observability ─────────────────────────────────────────────

  it('cycle2Traces: records entry for rejected step (not silently dropped)', async () => {
    const planner = makePlannerMock(); // 2 steps
    const depth = makeDepthMock('LEAF');

    let convCallCount = 0;
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (_ctx: any) => {
        convCallCount++;
        if (convCallCount === 1) {
          // Step 1 rejected by arbiter
          return DataProcessResult.success({
            data: {
              accepted: false,
              grade: 0.2,
              roundsCompleted: 3,
              bestModel: 'mock-gemini',
              bestScore: 2.0,
              stagnationFired: false,
              arbiterVerdicts: [{ arbiter: 'IronRules', verdict: 'BLOCK', detail: 'violation' }],
              visibilityId: 'v1',
              cycle4Id: 'c4-1',
              nodePrompt: 'np',
              judgeSystemPrompt: 'js',
              triples: [],
            },
          });
        }
        // Step 2 accepted
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 0.9,
            bestScore: 9.0,
            bestModel: 'mock-openai',
            roundsCompleted: 2,
            stagnationFired: false,
            arbiterVerdicts: [],
            visibilityId: 'v2',
            cycle4Id: 'c4-2',
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [
              {
                round: 1,
                chosen: { model: 'mock-gemini', score: 9.0, text: 'n' },
                rejected: { model: 'mock-openai', score: 7.0, text: 'n' },
                discarded: null,
                totalCost: 0,
              },
            ],
          },
        });
      }),
    } as unknown as ConvergenceHandler;

    const svc = makeService(planner, convergence, depth);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    const c2 = result.data!.cycles.cycle2;
    // Both steps must appear — rejected step must NOT be silently dropped
    expect(c2.length).toBe(2);
    expect(c2[0]!.accepted).toBe(false);
    expect(c2[0]!.grade).toBeCloseTo(0.2, 5);
    expect(c2[1]!.accepted).toBe(true);
  });

  it('cycle2Traces.length equals total steps processed regardless of acceptance', async () => {
    const planner = makePlannerMock(); // 2 steps
    const depth = makeDepthMock('LEAF');
    // All convergence calls return rejected (accepted: false)
    const convergence = makeConvergenceMock(false);

    const svc = makeService(planner, convergence, depth);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    // 2 steps, both rejected — still 2 entries (not 0)
    expect(result.data!.cycles.cycle2.length).toBe(2);
    // All entries must be rejected
    expect(result.data!.cycles.cycle2.every((t) => !t.accepted)).toBe(true);
  });

  // ── Phase 1: recursive orchestration tests ────────────────────────────────

  it('EXPAND: SubFlowRef records stored for each sub-node (DNA-8 before emit)', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('EXPAND');
    const db = makeMockDb();
    const queue = makeMockQueue();

    const svc = makeService(planner, convergence, depth, db, queue);
    await svc.run(BASE_INPUT);

    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const runStateWrites = storeCalls.filter(([idx]) => idx === 'xiigen-run-state');
    // 2 SubFlowRefs + 1 RunSuspension (EXPAND_RESPONSE: 2 sub-nodes, 1 step EXPANDs before suspend)
    const refWrites = runStateWrites.filter(([, doc]) => doc['subFlowIntent'] !== undefined);
    expect(refWrites.length).toBe(2);
    for (const [, doc] of refWrites) {
      expect(doc['status']).toBe('PENDING');
      expect(doc['parentRunId']).toBe('test-run-1');
      expect(typeof doc['subFlowIntent']).toBe('string');
    }
  });

  it('terminationDepth: EXPAND at max depth stores no SubFlowRefs (treated as depth gate — terminationBoundApplied=true)', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    // Depth handler returns terminationBoundApplied=true → LEAF (not EXPAND)
    const depth = {
      nodeType: 'depth-decision',
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: {
            verdict: 'LEAF',
            justification: 'terminationDepth reached',
            signalsEvaluated: ['S1'],
            signalsTriggered: [],
            subFlowDecomposition: null,
            terminationBoundApplied: true,
            grade: 1.0,
            accepted: true,
            visibilityId: 'vis-term',
            promptSent: '',
          },
        }),
      ),
    } as unknown as DepthDecisionHandler;
    const db = makeMockDb();
    const queue = makeMockQueue();

    const svc = makeService(planner, convergence, depth, db, queue);
    const result = await svc.run({ ...BASE_INPUT, currentDepth: 3, terminationDepth: 3 });

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('COMPLETE');
    // No SubFlowRef records — LEAF, not EXPAND
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const runStateWrites = storeCalls.filter(([idx]) => idx === 'xiigen-run-state');
    expect(runStateWrites.length).toBe(0);
    // No expand queue events
    const enqueueCalls = (queue.enqueue as jest.Mock).mock.calls as Array<[string]>;
    expect(enqueueCalls.filter(([e]) => e === 'cycle.chain.expand').length).toBe(0);
  });

  it('CONTEXT_INSUFFICIENT: convergence CI signal stores RunSuspension and continues to next step', async () => {
    const planner = makePlannerMock(); // 2 steps
    const depth = makeDepthMock('LEAF');
    const db = makeMockDb();
    const queue = makeMockQueue();

    // Step 1 returns CI, step 2 passes
    let callCount = 0;
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (_ctx: any) => {
        callCount++;
        if (callCount === 1) {
          return DataProcessResult.failure(
            'CONTEXT_INSUFFICIENT',
            'BUNDLED_RESPONSIBILITIES: "validate email" and "grant access" appear to be two distinct actions',
            {
              questions: [
                'Is "validate email" a separate concern from "grant access"?',
                'Can one succeed while the other fails?',
                'Should these be two separate steps?',
              ],
            },
          );
        }
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 1.0,
            convergenceScore: 1.0,
            arbiterVerdicts: [],
            visibilityId: 'vc',
            cycle4Id: 'c4-ok',
            bestScore: 9.0,
            bestModel: 'mock',
            roundsCompleted: 1,
            stagnationFired: false,
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [],
          },
        });
      }),
    } as unknown as ConvergenceHandler;

    const svc = makeService(planner, convergence, depth, db, queue);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    // Run completes (CI on step 1, step 2 passes — not suspended entirely)
    expect(result.data?.status).toBe('COMPLETE');

    // RunSuspension stored for the CI step (DNA-8)
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const ciSuspension = storeCalls.find(
      ([idx, doc]) =>
        idx === 'xiigen-run-state' && doc['suspensionReason'] === 'CONTEXT_INSUFFICIENT',
    );
    expect(ciSuspension).toBeDefined();
    expect(ciSuspension![1]['gapDescription']).toContain('BUNDLED_RESPONSIBILITIES');

    // 'cycle.chain.suspended' event emitted
    const enqueueCalls = (queue.enqueue as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>]
    >;
    const suspendedEvent = enqueueCalls.find(([e]) => e === 'cycle.chain.suspended');
    expect(suspendedEvent).toBeDefined();

    // Suspensions array in output — gapRequest carries the questions (not [])
    expect(result.data?.suspensions?.length).toBe(1);
    expect(result.data?.suspensions![0]?.suspensionReason).toBe('CONTEXT_INSUFFICIENT');
    expect(result.data?.suspensions![0]?.gapRequest.length).toBeGreaterThan(0);

    // CI step still recorded in cycle2Traces (grade=0, accepted=false)
    expect(result.data?.cycles.cycle2.length).toBe(2);
    expect(result.data?.cycles.cycle2[0]!.accepted).toBe(false);
    expect(result.data?.cycles.cycle2[1]!.accepted).toBe(true);

    // Step 2 leaf node still collected
    expect(result.data?.leafNodes.length).toBe(1);
  });

  it('EXPAND: run with no queue still stores SubFlowRefs (db only) but returns SUSPENDED', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('EXPAND');
    const db = makeMockDb();
    // No queue injected

    const svc = makeService(planner, convergence, depth, db, undefined);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('SUSPENDED');
    // SubFlowRefs stored to xiigen-run-state (db available)
    const storeCalls = (db.storeDocument as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>, string]
    >;
    const runStateWrites = storeCalls.filter(([idx]) => idx === 'xiigen-run-state');
    expect(runStateWrites.length).toBeGreaterThanOrEqual(2); // SubFlowRefs + RunSuspension
  });

  it('COMPLETE run: status=COMPLETE, subFlows=[], suspensions=[] when no EXPAND or CI', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');

    const svc = makeService(planner, convergence, depth);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    expect(result.data?.status).toBe('COMPLETE');
    expect(result.data?.subFlows).toEqual([]);
    expect(result.data?.suspensions).toEqual([]);
  });

  // ── Gap 3: rejectionReason in cycle2Traces ────────────────────────────────

  it('Gap 3: CI-rejected step in cycle2Traces has accepted=false and rejectionReason=CONTEXT_INSUFFICIENT', async () => {
    const planner = makePlannerMock(); // 2 steps
    const depth = makeDepthMock('LEAF');
    const db = makeMockDb();
    const queue = makeMockQueue();

    // Step 1 returns CONTEXT_INSUFFICIENT, step 2 passes
    let callCount = 0;
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (_ctx: any) => {
        callCount++;
        if (callCount === 1) {
          return DataProcessResult.failure(
            'CONTEXT_INSUFFICIENT',
            'BUNDLED_RESPONSIBILITIES: steps must be split',
            { questions: ['Is this two concerns?'] },
          );
        }
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 0.9,
            bestScore: 9.0,
            bestModel: 'mock',
            roundsCompleted: 2,
            stagnationFired: false,
            arbiterVerdicts: [],
            visibilityId: 'v2',
            cycle4Id: 'c4-2',
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [],
          },
        });
      }),
    } as unknown as ConvergenceHandler;

    const svc = makeService(planner, convergence, depth, db, queue);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    const c2 = result.data!.cycles.cycle2;
    expect(c2.length).toBe(2);
    expect(c2[0]!.accepted).toBe(false);
    expect(c2[0]!.rejectionReason).toBe('CONTEXT_INSUFFICIENT');
    expect(c2[1]!.accepted).toBe(true);
    expect(c2[1]!.rejectionReason).toBeUndefined();
  });

  it('Gap 3: arbiter-blocked step in cycle2Traces has accepted=false and rejectionReason containing ARBITER_BLOCK', async () => {
    const planner = makePlannerMock(); // 2 steps
    const depth = makeDepthMock('LEAF');

    // Both steps return arbiter BLOCK (accepted: false) with rejectionReason from convergence
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: {
            accepted: false,
            grade: 0.3,
            roundsCompleted: 2,
            bestModel: 'mock-gemini',
            bestScore: 3.0,
            stagnationFired: false,
            arbiterVerdicts: [
              { arbiter: 'IronRules', verdict: 'BLOCK', detail: 'DNA-1 violation' },
            ],
            rejectionReason: 'ARBITER_BLOCK: IronRules — DNA-1 violation',
            visibilityId: 'v-block',
            cycle4Id: '',
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [],
          },
        }),
      ),
    } as unknown as ConvergenceHandler;

    const svc = makeService(planner, convergence, depth);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    const c2 = result.data!.cycles.cycle2;
    expect(c2.length).toBe(2);
    for (const trace of c2) {
      expect(trace.accepted).toBe(false);
      expect(trace.rejectionReason).toMatch(/ARBITER_BLOCK/);
    }
  });

  it('Gap 3: accepted steps have rejectionReason=undefined', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');

    const svc = makeService(planner, convergence, depth);
    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    const c2 = result.data!.cycles.cycle2;
    expect(c2.every((t) => t.accepted)).toBe(true);
    expect(c2.every((t) => t.rejectionReason === undefined)).toBe(true);
  });

  it('EXPAND: cycle.chain.suspended event carries subFlowCount', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('EXPAND');
    const db = makeMockDb();
    const queue = makeMockQueue();

    const svc = makeService(planner, convergence, depth, db, queue);
    await svc.run(BASE_INPUT);

    const enqueueCalls = (queue.enqueue as jest.Mock).mock.calls as Array<
      [string, Record<string, unknown>]
    >;
    const suspendedEvent = enqueueCalls.find(([e]) => e === 'cycle.chain.suspended');
    expect(suspendedEvent).toBeDefined();
    expect(suspendedEvent![1]['suspensionReason']).toBe('EXPAND_PENDING');
    expect(suspendedEvent![1]['subFlowCount']).toBe(2); // EXPAND_RESPONSE has 2 sub-nodes
  });

  // ── G2: CycleHistoryService integration tests ─────────────────────────────

  it('G2: reads prev cycle summaries before each convergence call', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const cycleHistory = makeMockCycleHistory();

    const svc = makeService(planner, convergence, depth, undefined, undefined, cycleHistory);
    await svc.run(BASE_INPUT);

    // getSummariesForRun called once per plan step (2 steps)
    expect((cycleHistory.getSummariesForRun as jest.Mock).mock.calls.length).toBe(2);
    expect((cycleHistory.getSummariesForRun as jest.Mock).mock.calls[0]![0]).toBe('test-run-1');
    expect((cycleHistory.getSummariesForRun as jest.Mock).mock.calls[0]![1]).toBe('test-tenant');
  });

  it('G2: records winning NODE summary to CycleHistoryService after accepted=true convergence', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');
    const cycleHistory = makeMockCycleHistory();

    const svc = makeService(planner, convergence, depth, undefined, undefined, cycleHistory);
    await svc.run(BASE_INPUT);

    // 2 accepted steps → 2 records
    expect((cycleHistory.record as jest.Mock).mock.calls.length).toBe(2);
    const firstCall = (cycleHistory.record as jest.Mock).mock.calls[0]![0];
    expect(firstCall.runId).toBe('test-run-1');
    expect(firstCall.tenantId).toBe('test-tenant');
    expect(typeof firstCall.winningNodeSummary).toBe('string');
  });

  it('G2: does NOT record to CycleHistoryService when convergence accepted=false', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(false); // all steps rejected
    const depth = makeDepthMock('LEAF');
    const cycleHistory = makeMockCycleHistory();

    const svc = makeService(planner, convergence, depth, undefined, undefined, cycleHistory);
    await svc.run(BASE_INPUT);

    expect((cycleHistory.record as jest.Mock).mock.calls.length).toBe(0);
  });

  // ── G3: RAG evaluation integration tests ──────────────────────────────────

  it('G3: when RAG_EVALUATION_ENABLED=true: passes evaluated patterns to convergence not raw', async () => {
    const planner = makePlannerMock();
    const capturedCtxs: any[] = [];
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        capturedCtxs.push(ctx);
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 1.0,
            bestScore: 9.0,
            bestModel: 'mock',
            convergenceScore: 1.0,
            roundsCompleted: 1,
            stagnationFired: false,
            arbiterVerdicts: [],
            visibilityId: 'vc',
            cycle4Id: 'c4',
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [],
          },
        });
      }),
    } as unknown as ConvergenceHandler;
    const depth = makeDepthMock('LEAF');

    const mockRag = {
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: {
            ragPatterns: [
              { id: 'p1', patternId: 'p1', tenantId: 'test-tenant', knowledgeScope: 'PRIVATE' },
              { id: 'p2', patternId: 'p2', tenantId: 'test-tenant', knowledgeScope: 'PRIVATE' },
            ],
          },
        }),
      ),
    } as unknown as import('./node-handlers/rag-retrieve.handler').RagRetrieveHandler;

    // Evaluator returns only p1 as applicable
    const ragEvaluate = makeMockRagEvaluate(['p1']);
    const freedomConfig = makeMockFreedomConfig({
      'xiigen.rag.evaluationEnabled': true,
    });

    // Need to wire ragRetrieve — use private constructor with ragRetrieve (5th param)
    const svc = new CycleChainService(
      planner,
      convergence,
      depth,
      undefined,
      mockRag as any,
      undefined,
      undefined,
      makeMockCycleHistory(),
      ragEvaluate,
      null,
      freedomConfig,
    );

    await svc.run(BASE_INPUT);

    // Convergence should receive only p1 (the evaluated/applicable pattern)
    expect(capturedCtxs.length).toBeGreaterThan(0);
    const ragResults = capturedCtxs[0].inputs['ragResults'] as string;
    const parsedRag = JSON.parse(ragResults) as Array<{ id: string }>;
    expect(parsedRag.length).toBe(1);
    expect(parsedRag[0]!.id).toBe('p1');
  });

  it('G3: when RAG_EVALUATION_ENABLED=false (default): passes raw ragResultsStr unchanged', async () => {
    const planner = makePlannerMock();
    const capturedCtxs: any[] = [];
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        capturedCtxs.push(ctx);
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 1.0,
            bestScore: 9.0,
            bestModel: 'mock',
            convergenceScore: 1.0,
            roundsCompleted: 1,
            stagnationFired: false,
            arbiterVerdicts: [],
            visibilityId: 'vc',
            cycle4Id: 'c4',
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [],
          },
        });
      }),
    } as unknown as ConvergenceHandler;
    const depth = makeDepthMock('LEAF');

    const mockRag = {
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: {
            ragPatterns: [{ id: 'p1' }, { id: 'p2' }],
          },
        }),
      ),
    } as unknown as import('./node-handlers/rag-retrieve.handler').RagRetrieveHandler;

    const ragEvaluate = makeMockRagEvaluate(['p1']); // would filter but shouldn't be called
    // No FREEDOM config → disabled
    const svc = new CycleChainService(
      planner,
      convergence,
      depth,
      undefined,
      mockRag as any,
      undefined,
      undefined,
      makeMockCycleHistory(),
      ragEvaluate,
      null,
      undefined,
    );

    await svc.run(BASE_INPUT);

    // ragEvaluate should NOT be called when disabled
    expect((ragEvaluate.evaluate as jest.Mock).mock.calls.length).toBe(0);
    // Both patterns should be in ragResults
    const ragResults = capturedCtxs[0].inputs['ragResults'] as string;
    const parsedRag = JSON.parse(ragResults) as Array<{ id: string }>;
    expect(parsedRag.length).toBe(2);
  });

  it('G3: when rag-evaluate fails: falls back to raw ragResultsStr (non-blocking)', async () => {
    const planner = makePlannerMock();
    const capturedCtxs: any[] = [];
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        capturedCtxs.push(ctx);
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 1.0,
            bestScore: 9.0,
            bestModel: 'mock',
            convergenceScore: 1.0,
            roundsCompleted: 1,
            stagnationFired: false,
            arbiterVerdicts: [],
            visibilityId: 'vc',
            cycle4Id: 'c4',
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [],
          },
        });
      }),
    } as unknown as ConvergenceHandler;
    const depth = makeDepthMock('LEAF');

    const mockRag = {
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: { ragPatterns: [{ id: 'p1' }, { id: 'p2' }] },
        }),
      ),
    } as unknown as import('./node-handlers/rag-retrieve.handler').RagRetrieveHandler;

    const failingRagEvaluate = {
      evaluate: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('RAG_EVALUATE_ERROR', 'AI down')),
    } as unknown as RagEvaluateHandler;

    const freedomConfig = makeMockFreedomConfig({ 'xiigen.rag.evaluationEnabled': true });
    const svc = new CycleChainService(
      planner,
      convergence,
      depth,
      undefined,
      mockRag as any,
      undefined,
      undefined,
      makeMockCycleHistory(),
      failingRagEvaluate,
      null,
      freedomConfig,
    );

    const result = await svc.run(BASE_INPUT);

    // Run still succeeds — rag evaluate failure is non-blocking
    expect(result.isSuccess).toBe(true);
    // Both raw patterns passed through (evaluation failed, fall back to raw)
    const ragResults = capturedCtxs[0].inputs['ragResults'] as string;
    const parsedRag = JSON.parse(ragResults) as Array<{ id: string }>;
    expect(parsedRag.length).toBe(2);
  });

  it('G3: when ragResultsStr is not valid JSON: falls back to raw without throwing (DNA-3)', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');

    const mockRag = {
      handle: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          data: { ragPatterns: [] }, // empty patterns → ragResultsStr = JSON.stringify([]) = '[]'
        }),
      ),
    } as unknown as import('./node-handlers/rag-retrieve.handler').RagRetrieveHandler;

    const ragEvaluate = makeMockRagEvaluate();
    const freedomConfig = makeMockFreedomConfig({ 'xiigen.rag.evaluationEnabled': true });

    const svc = new CycleChainService(
      planner,
      convergence,
      depth,
      undefined,
      mockRag as any,
      undefined,
      undefined,
      makeMockCycleHistory(),
      ragEvaluate,
      null,
      freedomConfig,
    );

    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    // No throw — DNA-3 satisfied
  });

  it('G2: passes prevCycleSummaries from cycle history to convergence inputs', async () => {
    const planner = makePlannerMock();
    const capturedCtxs: any[] = [];
    const convergence = {
      nodeType: 'convergence',
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        capturedCtxs.push(ctx);
        return DataProcessResult.success({
          data: {
            winningNode: JSON.parse(NODE_JSON),
            accepted: true,
            grade: 1.0,
            bestScore: 9.0,
            bestModel: 'mock',
            convergenceScore: 1.0,
            roundsCompleted: 1,
            stagnationFired: false,
            arbiterVerdicts: [],
            visibilityId: 'vc',
            cycle4Id: 'c4',
            nodePrompt: 'np',
            judgeSystemPrompt: 'js',
            triples: [],
          },
        });
      }),
    } as unknown as ConvergenceHandler;
    const depth = makeDepthMock('LEAF');

    // Return different summaries on first vs second call to simulate accumulation
    const cycleHistory = {
      record: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      getSummariesForRun: jest
        .fn()
        .mockResolvedValueOnce(DataProcessResult.success([]))
        .mockResolvedValueOnce(DataProcessResult.success(['Step 1: Email validation node'])),
    } as unknown as CycleHistoryService;

    const svc = makeService(planner, convergence, depth, undefined, undefined, cycleHistory);
    await svc.run(BASE_INPUT);

    expect(capturedCtxs.length).toBe(2);
    // First call: no summaries yet
    expect(capturedCtxs[0].inputs['prevCycleSummaries']).toEqual([]);
    // Second call: has summary from step 1
    expect(capturedCtxs[1].inputs['prevCycleSummaries']).toEqual(['Step 1: Email validation node']);
  });

  // ── G6: RAG query reformulation integration tests ─────────────────────────

  it('G6: when RAG_QUERY_REFORMULATION_ENABLED=true: passes reformulatedQuery to rag-retrieve, not raw stepText', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');

    const capturedRagQueries: string[] = [];
    const mockRag = {
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        capturedRagQueries.push(ctx.nodeConfig?.query ?? '');
        return DataProcessResult.success({ data: { ragPatterns: [] } });
      }),
    } as unknown as import('./node-handlers/rag-retrieve.handler').RagRetrieveHandler;

    const ragQuery = makeMockRagQuery('architectural pattern for email uniqueness validation');
    const freedomConfig = makeMockFreedomConfig({
      'xiigen.rag.queryReformulationEnabled': true,
    });

    const svc = new CycleChainService(
      planner,
      convergence,
      depth,
      undefined,
      mockRag as any,
      undefined,
      undefined,
      makeMockCycleHistory(),
      null,
      ragQuery,
      freedomConfig,
    );

    await svc.run(BASE_INPUT);

    // RAG was called with the reformulated query, not original stepText
    expect(capturedRagQueries.length).toBeGreaterThan(0);
    expect(capturedRagQueries[0]).toBe('architectural pattern for email uniqueness validation');
  });

  it('G6: when RAG_QUERY_REFORMULATION_ENABLED=false (default): passes original stepText to rag-retrieve unchanged', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');

    const capturedRagQueries: string[] = [];
    const mockRag = {
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        capturedRagQueries.push(ctx.nodeConfig?.query ?? '');
        return DataProcessResult.success({ data: { ragPatterns: [] } });
      }),
    } as unknown as import('./node-handlers/rag-retrieve.handler').RagRetrieveHandler;

    const ragQuery = makeMockRagQuery('should not be used');
    // No FREEDOM config → disabled
    const svc = new CycleChainService(
      planner,
      convergence,
      depth,
      undefined,
      mockRag as any,
      undefined,
      undefined,
      makeMockCycleHistory(),
      null,
      ragQuery,
      undefined,
    );

    await svc.run(BASE_INPUT);

    // ragQuery.reformulate should NOT be called when disabled
    expect((ragQuery.reformulate as jest.Mock).mock.calls.length).toBe(0);
    // RAG called with original step text
    expect(capturedRagQueries[0]).toContain('Validate the user email');
  });

  it('G6: when rag-query reformulation fails: falls back to stepText for rag-retrieve (non-blocking)', async () => {
    const planner = makePlannerMock();
    const convergence = makeConvergenceMock(true);
    const depth = makeDepthMock('LEAF');

    const capturedRagQueries: string[] = [];
    const mockRag = {
      handle: jest.fn().mockImplementation(async (ctx: any) => {
        capturedRagQueries.push(ctx.nodeConfig?.query ?? '');
        return DataProcessResult.success({ data: { ragPatterns: [] } });
      }),
    } as unknown as import('./node-handlers/rag-retrieve.handler').RagRetrieveHandler;

    const failingRagQuery = {
      reformulate: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('RAG_QUERY_ERROR', 'AI down')),
    } as unknown as RagQueryHandler;

    const freedomConfig = makeMockFreedomConfig({
      'xiigen.rag.queryReformulationEnabled': true,
    });

    const svc = new CycleChainService(
      planner,
      convergence,
      depth,
      undefined,
      mockRag as any,
      undefined,
      undefined,
      makeMockCycleHistory(),
      null,
      failingRagQuery,
      freedomConfig,
    );

    const result = await svc.run(BASE_INPUT);

    expect(result.isSuccess).toBe(true);
    // Falls back to original step text (contains 'Validate the user email')
    expect(capturedRagQueries[0]).toContain('Validate the user email');
  });
});
