/**
 * T650 AgentRunOrchestrator — unit tests (8 per FLOW-46 R1 test matrix).
 */
import { AgentRunOrchestrator } from './agent-run-orchestrator.service';
import { PlatformContextEnricher } from './platform-context-enricher.service';
import { SuperJudgeArbiter } from './super-judge-arbiter.service';
import { AgentActionPublisher } from './agent-action-publisher.service';
import { PatternContributor } from './pattern-contributor.service';
import { TenantScopeGateway } from './tenant-scope-gateway.service';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { TenantContext } from '../../../kernel/multi-tenant/tenant-context';
import { MASTER_TENANT_ID } from '../../../bootstrap/bootstrap-seeder.service';

function masterContext(): TenantContext {
  return new TenantContext({
    id: MASTER_TENANT_ID,
    name: 'master',
    status: 'active',
    plan: { name: 'free', maxApiCallsPerMinute: 60, maxTokensPerDay: 100_000, maxStorageMb: 500 },
    configOverrides: {},
    apiKeys: {},
    createdAt: '2026-04-17T00:00:00Z',
    updatedAt: '2026-04-17T00:00:00Z',
  });
}

function tenantContext(id: string): TenantContext {
  return new TenantContext({
    id,
    name: id,
    status: 'active',
    plan: { name: 'free', maxApiCallsPerMinute: 60, maxTokensPerDay: 100_000, maxStorageMb: 500 },
    configOverrides: {},
    apiKeys: {},
    createdAt: '2026-04-17T00:00:00Z',
    updatedAt: '2026-04-17T00:00:00Z',
  });
}

interface MockCls {
  store: Map<string, unknown>;
  get: jest.Mock;
  runWith: jest.Mock;
}

function makeCls(initial: TenantContext | undefined): MockCls {
  const store = new Map<string, unknown>();
  if (initial) store.set('tenant', initial);
  return {
    store,
    get: jest.fn((key?: string) => (key ? store.get(key) : undefined)),
    runWith: jest.fn(async (overrides: Record<string, unknown>, fn: () => Promise<unknown>) => {
      const prior = new Map(store);
      for (const [k, v] of Object.entries(overrides)) store.set(k, v);
      try {
        return await fn();
      } finally {
        store.clear();
        for (const [k, v] of prior) store.set(k, v);
      }
    }),
  };
}

describe('AgentRunOrchestrator (T650)', () => {
  let mockDb: { storeDocument: jest.Mock; searchDocuments: jest.Mock };
  let mockQueue: { enqueue: jest.Mock };
  let cls: MockCls;
  let mockEnricher: { execute: jest.Mock };
  let mockJudge: { evaluate: jest.Mock };
  let mockPublisher: { publish: jest.Mock };
  let mockContributor: { contribute: jest.Mock };
  let orch: AgentRunOrchestrator;

  beforeEach(() => {
    mockDb = {
      storeDocument: jest.fn().mockResolvedValue(DataProcessResult.success({})),
      searchDocuments: jest.fn().mockResolvedValue(DataProcessResult.success([])),
    };
    mockQueue = {
      enqueue: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    cls = makeCls(masterContext());
    mockEnricher = {
      execute: jest.fn().mockResolvedValue(
        DataProcessResult.success({
          patterns: [],
          linkedModules: [],
          platformPatterns: [],
          platformPatternsMatched: 0,
        }),
      ),
    };
    mockJudge = {
      evaluate: jest.fn().mockResolvedValue(
        DataProcessResult.success({ verdict: 'DEFER_TO_AF9', cost: 0, llmCalls: 0 }),
      ),
    };
    mockPublisher = {
      publish: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    mockContributor = {
      contribute: jest.fn().mockResolvedValue(DataProcessResult.success({})),
    };
    orch = new AgentRunOrchestrator(
      mockDb as never,
      mockQueue as never,
      new TenantScopeGateway(mockDb as never, cls as never),
      mockEnricher as unknown as PlatformContextEnricher,
      mockJudge as unknown as SuperJudgeArbiter,
      mockPublisher as unknown as AgentActionPublisher,
      mockContributor as unknown as PatternContributor,
    );
  });

  it('1. empty userIntent → MISSING_INTENT', async () => {
    const result = await orch.run({ sessionId: 's-1', userIntent: '   ' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('MISSING_INTENT');
  });

  it('2. CLS != MASTER_TENANT_ID → NOT_ADMIN', async () => {
    cls = makeCls(tenantContext('tenant-y'));
    orch = new AgentRunOrchestrator(
      mockDb as never,
      mockQueue as never,
      new TenantScopeGateway(mockDb as never, cls as never),
      mockEnricher as unknown as PlatformContextEnricher,
      mockJudge as unknown as SuperJudgeArbiter,
      mockPublisher as unknown as AgentActionPublisher,
      mockContributor as unknown as PatternContributor,
    );
    const result = await orch.run({ sessionId: 's-2', userIntent: 'do thing' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NOT_ADMIN');
  });

  it('3. AF-1..AF-4 logged in order before T652 enricher', async () => {
    await orch.run({ sessionId: 's-3', userIntent: 'do thing' });
    const enrichIdx = orch.stages.indexOf('T652_ENRICH');
    expect(orch.stages.slice(0, enrichIdx)).toEqual(['AF-1', 'AF-2', 'AF-3', 'AF-4']);
  });

  it('4. T652 enricher invoked between AF-4 and AF-5', async () => {
    await orch.run({ sessionId: 's-4', userIntent: 'do thing' });
    const af4Idx = orch.stages.indexOf('AF-4');
    const enrichIdx = orch.stages.indexOf('T652_ENRICH');
    const af5Idx = orch.stages.indexOf('AF-5');
    expect(af4Idx).toBeLessThan(enrichIdx);
    expect(enrichIdx).toBeLessThan(af5Idx);
    expect(mockEnricher.execute).toHaveBeenCalledTimes(1);
  });

  it('5. T653 super-judge invoked after AF-9', async () => {
    await orch.run({ sessionId: 's-5', userIntent: 'do thing' });
    const af9Idx = orch.stages.indexOf('AF-9');
    const judgeIdx = orch.stages.indexOf('T653_SUPER_JUDGE');
    expect(af9Idx).toBeLessThan(judgeIdx);
    expect(mockJudge.evaluate).toHaveBeenCalledTimes(1);
  });

  it('6. proposed actions are dispatched via T654 publisher', async () => {
    await orch.run({
      sessionId: 's-6',
      userIntent: 'do thing',
      proposedActions: [
        {
          actionId: 'a-1',
          sessionId: 's-6',
          actionType: 'ADVISE',
          adminTenantId: MASTER_TENANT_ID,
          payload: {},
        },
        {
          actionId: 'a-2',
          sessionId: 's-6',
          actionType: 'APPLY_GLOBAL',
          adminTenantId: MASTER_TENANT_ID,
          payload: {},
        },
      ],
    });
    expect(mockPublisher.publish).toHaveBeenCalledTimes(2);
  });

  it('7. AgentSessionCompleted emitted EXACTLY once + idempotent on sessionId', async () => {
    await orch.run({ sessionId: 's-7', userIntent: 'do thing' });
    expect(mockQueue.enqueue).toHaveBeenCalledWith(
      'platform-agent.AgentSessionCompleted',
      expect.any(Object),
    );
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1);

    // Second run — searchDocuments returns prior session → returns success without re-emitting
    mockDb.searchDocuments.mockResolvedValueOnce(
      DataProcessResult.success([{ sessionId: 's-7', userIntent: 'do thing' }]),
    );
    await orch.run({ sessionId: 's-7', userIntent: 'do thing' });
    expect(mockQueue.enqueue).toHaveBeenCalledTimes(1); // still only 1
  });

  it('8. enricher failure → ENRICH_FAILED bubbles up', async () => {
    mockEnricher.execute.mockResolvedValueOnce(
      DataProcessResult.failure('SEARCH_FAILED', 'es timeout'),
    );
    const result = await orch.run({ sessionId: 's-8', userIntent: 'do thing' });
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('SEARCH_FAILED');
  });
});
