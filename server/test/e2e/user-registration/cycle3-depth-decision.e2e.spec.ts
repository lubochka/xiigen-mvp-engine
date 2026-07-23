/**
 * E2E tests for DepthDecisionHandler — Cycle 3 Depth Decision
 * 8 tests using in-memory providers
 */

import 'reflect-metadata';
import { DataProcessResult } from '../../../src/kernel/data-process-result';
import { DepthDecisionHandler } from '../../../src/engine/node-handlers/depth-decision.handler';
import { NodeHandlerContext } from '../../../src/engine/node-handlers/node-handler.types';

const TENANT = 'flow01-depth-e2e-tenant';

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

const T47_REGISTRATION_NODE = {
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
  constraints: ['No typed models'],
  quality: {
    scoringCriteria: ['check passes'],
    acceptanceThreshold: 0.85,
    degradationAcceptable: false,
  },
};

const ONBOARDING_NODE = {
  structure: {
    inputShape: ['userId'],
    outputShape: ['onboardingStatus'],
    triggers: ['registration-completed'],
    emits: ['onboarding-completed'],
    dependencies: [],
  },
  intent: {
    purpose:
      'Send welcome email, set up workspace, deliver first tutorial, configure notifications, and create profile',
    invariants: ['All steps complete'],
    failureModes: ['email delivery fails', 'workspace setup fails'],
    domainConcepts: ['onboarding', 'workspace', 'profile'],
  },
  constraints: ['No typed models'],
  quality: {
    scoringCriteria: ['all steps complete'],
    acceptanceThreshold: 0.85,
    degradationAcceptable: false,
  },
};

const LEAF_RESPONSE = JSON.stringify({
  verdict: 'LEAF',
  justification: 'Single-responsibility node — only email uniqueness check, S1 not triggered',
  signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
  signalsTriggered: [],
  subFlowDecomposition: null,
});

const EXPAND_RESPONSE = JSON.stringify({
  verdict: 'EXPAND',
  justification: 'Multiple independent clauses in intent.purpose — S1 triggered',
  signalsEvaluated: ['S1', 'S2', 'S3', 'S4', 'S5'],
  signalsTriggered: ['S1'],
  subFlowDecomposition: [
    { name: 'send-welcome-email', intClause: 'Send welcome email', isDistinct: true },
    { name: 'setup-workspace', intClause: 'set up workspace', isDistinct: true },
    { name: 'deliver-tutorial', intClause: 'deliver first tutorial', isDistinct: true },
  ],
});

const baseContract: any = {
  taskTypeId: 'T47',
  archetype: 'SERVICE',
  ironRules: [],
  handlers: [],
  machineConstants: [],
};

function makeCtx(
  verifiedNode: Record<string, unknown>,
  currentDepth = 1,
  terminationDepth = 3,
): NodeHandlerContext {
  return {
    contract: baseContract,
    runId: `run-e2e-depth-${Date.now()}`,
    flowId: 'FLOW-01',
    taskTypeId: 'T47',
    tenantId: TENANT,
    inputs: { verifiedNode, currentDepth, terminationDepth },
    priorOutputs: [],
    nodeConfig: {},
  };
}

describe('Cycle 3 — DepthDecisionHandler E2E', () => {
  it('returns LEAF for T47 registration step (single responsibility)', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: LEAF_RESPONSE, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new DepthDecisionHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx(T47_REGISTRATION_NODE));
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['verdict']).toBe('LEAF');
    expect(result.data?.data?.['signalsEvaluated']).toContain('S1');
  });

  it('returns EXPAND for onboarding step with 3 sub-items in intent.purpose', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: EXPAND_RESPONSE, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new DepthDecisionHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx(ONBOARDING_NODE));
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['verdict']).toBe('EXPAND');
    const decomp = result.data?.data?.['subFlowDecomposition'] as any[];
    expect(decomp.length).toBeGreaterThanOrEqual(2);
  });

  it('returns LEAF at depth=3 regardless of NODE content — bound enforced', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest.fn(),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new DepthDecisionHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx(T47_REGISTRATION_NODE, 3, 3));
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['verdict']).toBe('LEAF');
    expect(mockAi.generate).not.toHaveBeenCalled();
  });

  it('returns LEAF at depth=3 even for multi-responsibility onboarding NODE', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest.fn(),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new DepthDecisionHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx(ONBOARDING_NODE, 3, 3));
    expect(result.isSuccess).toBe(true);
    expect(result.data?.data?.['verdict']).toBe('LEAF');
    expect(result.data?.data?.['terminationBoundApplied']).toBe(true);
  });

  it('same NODE at depth=1 produces same verdict on two independent runs', async () => {
    const db = makeInMemoryDb();
    const ai1 = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: LEAF_RESPONSE, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };
    const ai2 = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: LEAF_RESPONSE, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler1 = new DepthDecisionHandler(ai1 as any, db as any);
    const handler2 = new DepthDecisionHandler(ai2 as any, db as any);

    const result1 = await handler1.handle(makeCtx(T47_REGISTRATION_NODE));
    const result2 = await handler2.handle(makeCtx(T47_REGISTRATION_NODE));

    expect(result1.data?.data?.['verdict']).toBe(result2.data?.data?.['verdict']);
  });

  it('sub-flow decomposition is valid INTENT input for new Cycle 1 context package', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: EXPAND_RESPONSE, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new DepthDecisionHandler(mockAi as any, db as any);
    const result = await handler.handle(makeCtx(ONBOARDING_NODE));

    const decomp = result.data?.data?.['subFlowDecomposition'] as any[];
    expect(decomp).toBeDefined();
    // Each sub-flow node should have a name and intClause — valid for Cycle 1 input
    for (const node of decomp) {
      expect(node.name).toBeDefined();
      expect(node.intClause).toBeDefined();
    }
  });

  it('DECIDED contains signal evidence when LEAF via signals', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ text: LEAF_RESPONSE, model: 'claude-3', tokens_used: 100 }),
        ),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new DepthDecisionHandler(mockAi as any, db as any);
    await handler.handle(makeCtx(T47_REGISTRATION_NODE));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const record = records[0];
    const decided = record?.['decided'] as Record<string, unknown>;
    expect(decided).toHaveProperty('grade');
    expect(decided?.['terminationBoundApplied']).toBe(false);
  });

  it('DECIDED contains "bound enforced" when LEAF via termination depth', async () => {
    const db = makeInMemoryDb();
    const mockAi = {
      generate: jest.fn(),
      generateStructured: jest.fn(),
      getModelInfo: jest.fn().mockReturnValue({ model: 'claude-3' }),
    };

    const handler = new DepthDecisionHandler(mockAi as any, db as any);
    await handler.handle(makeCtx(T47_REGISTRATION_NODE, 3, 3));

    const records = db._store.get('xiigen-cycle-visibility') ?? [];
    const record = records[0];
    const justification = record?.['received'] as Record<string, unknown>;
    expect(String(justification?.['justification'] ?? '')).toContain('bound enforced');
  });
});
