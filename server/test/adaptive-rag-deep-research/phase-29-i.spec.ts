/**
 * FLOW-29-I — Integration Tests.
 *
 * Verifies cross-service integration and FLOW-25 gate interactions.
 *
 * Tests:
 *   F29I-1:  All 27 FLOW-29 service classes importable
 *   F29I-2:  AdaptiveRagRouter → BanditModelSelector pipeline (routing chain)
 *   F29I-3:  HybridRetrievalFusion → RerankerStep pipeline (CF-606 shape)
 *   F29I-4:  KnowledgeGraphEditGate blocks edit when BFA config disallows (FLOW-25 gate)
 *   F29I-5:  KnowledgeGraphEditGate → ControlPlaneGraphEdit (gate-then-edit chain)
 *   F29I-6:  PromotionPipelineGate blocks promotion when BFA config disallows
 *   F29I-7:  UserFeedbackIngest → FeedbackAggregationWindow → RoutingPolicyUpdater (learning chain)
 *   F29I-8:  DomainProfileCompiler + CommunitySummaryGenerator + DomainGraphIndexRebuild (build chain)
 *   F29I-9:  ImprovementSuggestionEngine → queue only (never ControlPlaneGraphEdit directly)
 *   F29I-10: ABTestAllocator deterministic across all services in same test run
 *   F29I-11: TraceSpanCapture never blocks (fire-and-forget integration)
 *   F29I-12: EvalQualityGate thresholds from FREEDOM config (not hardcoded) integration
 *   F29I-13: BudgetEnforcementGate hard-stop propagates (halts pipeline)
 *   F29I-14: All FLOW-29 services return DataProcessResult (never throw)
 */

import { AdaptiveRagRouter } from '../../src/engine/flows/rag-optimization/adaptive-rag-router.service';
import { BanditModelSelector } from '../../src/engine/flows/rag-optimization/bandit-model-selector.service';
import { HybridRetrievalFusion } from '../../src/engine/flows/rag-optimization/hybrid-retrieval-fusion.service';
import { RerankerStep } from '../../src/engine/flows/rag-optimization/reranker-step.service';
import { KnowledgeGraphEditGate } from '../../src/engine/flows/rag-optimization/knowledge-graph-edit-gate.service';
import { ControlPlaneGraphEdit } from '../../src/engine/flows/rag-optimization/control-plane-graph-edit.service';
import { PromotionPipelineGate } from '../../src/engine/flows/rag-optimization/promotion-pipeline-gate.service';
import { UserFeedbackIngest } from '../../src/engine/flows/rag-optimization/user-feedback-ingest.service';
import { FeedbackAggregationWindow } from '../../src/engine/flows/rag-optimization/feedback-aggregation-window.service';
import { RoutingPolicyUpdater } from '../../src/engine/flows/rag-optimization/routing-policy-updater.service';
import { DomainProfileCompiler } from '../../src/engine/flows/rag-optimization/domain-profile-compiler.service';
import { CommunitySummaryGenerator } from '../../src/engine/flows/rag-optimization/community-summary-generator.service';
import { DomainGraphIndexRebuild } from '../../src/engine/flows/rag-optimization/domain-graph-index-rebuild.service';
import { ImprovementSuggestionEngine } from '../../src/engine/flows/rag-optimization/improvement-suggestion-engine.service';
import { ABTestAllocator } from '../../src/engine/flows/rag-optimization/ab-test-allocator.service';
import { TraceSpanCapture } from '../../src/engine/flows/rag-optimization/trace-span-capture.service';
import { EvalQualityGate } from '../../src/engine/flows/rag-optimization/eval-quality-gate.service';
import { BudgetEnforcementGate } from '../../src/engine/flows/rag-optimization/budget-enforcement-gate.service';
import { VectorRetrievalStep } from '../../src/engine/flows/rag-optimization/vector-retrieval-step.service';
import { GraphRAGCommunityQuery } from '../../src/engine/flows/rag-optimization/graph-rag-community-query.service';
import { MultiHopGraphTraversal } from '../../src/engine/flows/rag-optimization/multi-hop-graph-traversal.service';
import { ContextEfficiencyCheck } from '../../src/engine/flows/rag-optimization/context-efficiency-check.service';
import { SelfReflectionGuard } from '../../src/engine/flows/rag-optimization/self-reflection-guard.service';
import { PromptVersionPromoter } from '../../src/engine/flows/rag-optimization/prompt-version-promoter.service';
import { RAGAssetVersionCompare } from '../../src/engine/flows/rag-optimization/rag-asset-version-compare.service';
import { RAGStrategyRollback } from '../../src/engine/flows/rag-optimization/rag-strategy-rollback.service';
import { DomainGraphIndexRebuild as DomainGraphIndexRebuildSvc } from '../../src/engine/flows/rag-optimization/domain-graph-index-rebuild.service';
import { ControlPlaneNodeRenderer } from '../../src/engine/flows/rag-optimization/control-plane-node-renderer.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

// ── Shared mock factories ────────────────────────────────────────────────────

const TENANT = 'tenant-f29i-integration';
const SESSION = 'session-f29i-001';

function makeDb(docs: Record<string, unknown>[] = []) {
  return {
    searchDocuments: jest.fn(async () => DataProcessResult.success(docs)),
    storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
      DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
    ),
  } as any;
}

function makeQueue() {
  const events: any[] = [];
  return {
    enqueue: jest.fn(async (evt: string, data: any) => {
      events.push({ evt, data });
      return DataProcessResult.success('m');
    }),
    _events: events,
  } as any;
}

function makeAi(response = '[]') {
  return {
    generate: jest.fn(async () => DataProcessResult.success(response)),
  } as any;
}

function makeRag(items: any[] = []) {
  return {
    search: jest.fn(async () => DataProcessResult.success(items)),
  } as any;
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('FLOW-29-I — Integration Tests', () => {
  it('F29I-1: all 27 FLOW-29 service classes importable', () => {
    expect(AdaptiveRagRouter).toBeDefined();
    expect(BanditModelSelector).toBeDefined();
    expect(HybridRetrievalFusion).toBeDefined();
    expect(RerankerStep).toBeDefined();
    expect(KnowledgeGraphEditGate).toBeDefined();
    expect(ControlPlaneGraphEdit).toBeDefined();
    expect(PromotionPipelineGate).toBeDefined();
    expect(UserFeedbackIngest).toBeDefined();
    expect(FeedbackAggregationWindow).toBeDefined();
    expect(RoutingPolicyUpdater).toBeDefined();
    expect(DomainProfileCompiler).toBeDefined();
    expect(CommunitySummaryGenerator).toBeDefined();
    expect(DomainGraphIndexRebuild).toBeDefined();
    expect(ImprovementSuggestionEngine).toBeDefined();
    expect(ABTestAllocator).toBeDefined();
    expect(TraceSpanCapture).toBeDefined();
    expect(EvalQualityGate).toBeDefined();
    expect(BudgetEnforcementGate).toBeDefined();
    expect(VectorRetrievalStep).toBeDefined();
    expect(GraphRAGCommunityQuery).toBeDefined();
    expect(MultiHopGraphTraversal).toBeDefined();
    expect(ContextEfficiencyCheck).toBeDefined();
    expect(SelfReflectionGuard).toBeDefined();
    expect(PromptVersionPromoter).toBeDefined();
    expect(RAGAssetVersionCompare).toBeDefined();
    expect(RAGStrategyRollback).toBeDefined();
    expect(ControlPlaneNodeRenderer).toBeDefined();
  });

  it('F29I-2: AdaptiveRagRouter → BanditModelSelector routing chain', async () => {
    const queue = makeQueue();
    const router = new AdaptiveRagRouter(
      makeDb([{ strategy: 'hybrid-rag', weight: 0.8, greedy_threshold: 0.0 }]),
      queue,
    );
    const bandit = new BanditModelSelector(makeDb([{ arm_id: 'hybrid-rag', weight: 0.8 }]), queue);

    const routeResult = await router.routeQuery(SESSION, TENANT, 'What is RAG?', {
      domain: 'tech',
    });
    expect(routeResult.isSuccess).toBe(true);

    const banditResult = await bandit.selectArm(SESSION, TENANT, { domain: 'tech' });
    expect(banditResult.isSuccess).toBe(true);
    expect(banditResult.data!.selectedArm).toBeDefined();
  });

  it('F29I-3: HybridRetrievalFusion → RerankerStep CF-606 shape compatibility', async () => {
    // VectorRetrievalStep returns RetrievalItem (content, score, source_type)
    const vectorItems = [{ content: 'VectorResult', score: 0.9, source_type: 'vector' as const }];
    // GraphRAGCommunityQuery returns CommunityResult (communityId, relevanceScore, summaryExcerpt)
    const graphItems = [{ communityId: 'c1', relevanceScore: 0.8, summaryExcerpt: 'GraphResult' }];

    const fusion = new HybridRetrievalFusion(makeDb());
    const fuseResult = await fusion.fuse(TENANT, vectorItems as any, graphItems as any, 60);
    expect(fuseResult.isSuccess).toBe(true);

    // Fused items go to RerankerStep — CF-606: items must have {content, score, source_type}
    const fusedItems = fuseResult.data!.items;
    const reranker = new RerankerStep(makeDb(), makeAi('[{"rank":0,"score":0.95}]'));
    const rerankResult = await reranker.rerank(TENANT, 'What is RAG?', fusedItems, 5);
    expect(rerankResult.isSuccess).toBe(true);
  });

  it('F29I-4: KnowledgeGraphEditGate blocks edit when BFA config disallows (FLOW-25 gate)', async () => {
    const blockedDb = {
      searchDocuments: jest.fn(async () => DataProcessResult.success([{ allowed: false }])),
      storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
      ),
    } as any;
    const gate = new KnowledgeGraphEditGate(blockedDb, makeQueue());
    const r = await gate.checkEditApproval(TENANT, 'NODE_DELETE', ['node-1'], 'user-admin');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('GRAPH_EDIT_BLOCKED');
  });

  it('F29I-5: KnowledgeGraphEditGate → ControlPlaneGraphEdit (gate-then-edit chain)', async () => {
    const db = makeDb([{ allowed: true }]);
    const queue = makeQueue();
    const gate = new KnowledgeGraphEditGate(db, queue);
    const editor = new ControlPlaneGraphEdit(makeDb(), queue);

    const gateResult = await gate.checkEditApproval(TENANT, 'NODE_ADD', ['node-1'], 'user-admin');
    expect(gateResult.isSuccess).toBe(true);

    const editResult = await editor.applyEdit(
      TENANT,
      gateResult.data!.gateRef,
      'NODE_ADD',
      ['node-1'],
      { prop: 'val' },
    );
    expect(editResult.isSuccess).toBe(true);
    expect(editResult.data!.gateRef).toBe(gateResult.data!.gateRef);
  });

  it('F29I-6: PromotionPipelineGate blocks promotion when BFA config disallows', async () => {
    const blockedDb = {
      searchDocuments: jest.fn(async () => DataProcessResult.success([{ allowed: false }])),
      storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
      ),
    } as any;
    const gate = new PromotionPipelineGate(blockedDb, makeQueue());
    const r = await gate.checkPromotion(TENANT, 'rag-asset-v2', 'user-admin');
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('PROMOTION_BLOCKED');
  });

  it('F29I-7: UserFeedbackIngest → FeedbackAggregationWindow → RoutingPolicyUpdater (learning chain)', async () => {
    const queue = makeQueue();
    const ingest = new UserFeedbackIngest(makeDb(), queue);
    const runCtx = {
      sessionId: 's1',
      queryId: 'q1',
      model: 'm1',
      strategy: 'hybrid-rag',
      runTimestamp: '2026-01-01T00:00:00Z',
    };

    const ingestResult = await ingest.ingest(TENANT, runCtx, 4);
    expect(ingestResult.isSuccess).toBe(true);

    const feedback = [{ strategy: 'hybrid-rag', rating: 4 }];
    const aggDb = {
      searchDocuments: jest.fn(async () => DataProcessResult.success(feedback)),
      storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
      ),
    } as any;
    const aggregator = new FeedbackAggregationWindow(aggDb, queue);
    const aggResult = await aggregator.aggregate(TENANT, '2026-01-01T00:00:00Z');
    expect(aggResult.isSuccess).toBe(true);

    const policyDb = {
      searchDocuments: jest.fn(async () =>
        DataProcessResult.success([{ mode_weights: { 'hybrid-rag': 0.5 }, active: true }]),
      ),
      storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
      ),
    } as any;
    const updater = new RoutingPolicyUpdater(policyDb, queue);
    const updateResult = await updater.applyFeedback(TENANT, 'hybrid-rag', 0.8, SESSION);
    expect(updateResult.isSuccess).toBe(true);
    expect(updateResult.data!.newWeights['hybrid-rag']).toBeCloseTo(0.5 + 0.1 * (0.8 - 0.5), 5);
  });

  it('F29I-8: DomainProfileCompiler + CommunitySummaryGenerator + DomainGraphIndexRebuild (build chain)', async () => {
    const queue = makeQueue();
    const compiler = new DomainProfileCompiler(makeDb(), queue);
    const summarizer = new CommunitySummaryGenerator(makeDb(), queue);
    const rebuilder = new DomainGraphIndexRebuild(makeDb(), queue);

    const compileResult = await compiler.compile(TENANT, 'domain-1', [{ key: 'val' }]);
    expect(compileResult.isSuccess).toBe(true);
    expect(compileResult.data!.status).toBe('QUEUED');

    const summaryResult = await summarizer.generateSummary(TENANT, 'community-1', ['n1', 'n2']);
    expect(summaryResult.isSuccess).toBe(true);
    expect(summaryResult.data!.status).toBe('QUEUED');

    const rebuildResult = await rebuilder.rebuild(TENANT, 'domain-1', 'v2');
    expect(rebuildResult.isSuccess).toBe(true);
    expect(rebuildResult.data!.status).toBe('QUEUED');

    // All 3 queued — none block the caller
    expect(compileResult.data!.status).toBe('QUEUED');
  });

  it('F29I-9: ImprovementSuggestionEngine emits to queue — never calls ControlPlaneGraphEdit directly', async () => {
    const queue = makeQueue();
    const ai = makeAi(
      JSON.stringify([
        {
          suggestion_text: 'Improve retrieval',
          affected_component: 'vector-retrieval',
          confidence: 0.9,
          evidence: ['low coverage'],
        },
      ]),
    );

    const engine = new ImprovementSuggestionEngine(makeDb(), queue, ai);
    const result = await engine.analyze(TENANT, { hallucinationRate: 0.15 });
    expect(result.isSuccess).toBe(true);

    // Verify: event to queue, NOT a direct service call
    const suggestionEvents = queue._events.filter((e: any) => e.evt === 'rag.suggestion.queued');
    expect(suggestionEvents.length).toBeGreaterThan(0);

    // ControlPlaneGraphEdit not instantiated — human gate required
    expect(result.data!.suggestionsQueued).toBeGreaterThan(0);
  });

  it('F29I-10: ABTestAllocator deterministic across allocations in same test run', async () => {
    const variants = ['control', 'treatment'];
    const svcA = new ABTestAllocator(makeDb(), makeQueue());
    const svcB = new ABTestAllocator(makeDb(), makeQueue());
    const rA = await svcA.allocate(TENANT, 'user-xyz', 'exp-001', variants);
    const rB = await svcB.allocate(TENANT, 'user-xyz', 'exp-001', variants);
    expect(rA.data!.variant).toBe(rB.data!.variant);
  });

  it('F29I-11: TraceSpanCapture never blocks — fire-and-forget', async () => {
    const failingQueue = {
      enqueue: jest.fn(async () => DataProcessResult.failure('QUEUE_FAILED', 'queue down')),
    } as any;
    const tracer = new TraceSpanCapture(failingQueue);
    const r = await tracer.captureSpan(TENANT, 'trace-1', 'router.select', 42, { key: 'val' });
    // TraceSpanCapture swallows queue failures — always succeeds
    expect(r.isSuccess).toBe(true);
  });

  it('F29I-12: EvalQualityGate thresholds from FREEDOM config (not hardcoded)', async () => {
    const configDb = {
      searchDocuments: jest.fn(async () =>
        DataProcessResult.success([{ max_hallucination_rate: 0.05, min_coverage_score: 0.9 }]),
      ),
      storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
      ),
    } as any;
    const gate = new EvalQualityGate(configDb, makeQueue());
    // Values that pass strict thresholds from config
    const pass = await gate.evaluate(TENANT, 0.04, 0.95, SESSION);
    expect(pass.isSuccess).toBe(true);

    // Values that fail strict thresholds
    const fail = await gate.evaluate(TENANT, 0.2, 0.5, SESSION);
    expect(fail.isSuccess).toBe(false);
    expect(fail.errorCode).toBe('QUALITY_GATE_FAILED');
  });

  it('F29I-13: BudgetEnforcementGate hard-stop propagates (halts pipeline)', async () => {
    const configDb = {
      searchDocuments: jest.fn(async (index: string) => {
        if (index === 'flow29-budget-config') {
          return DataProcessResult.success([{ token_limit: 1000, cost_limit: 0.1, active: true }]);
        }
        // No existing usage → starts at 0
        return DataProcessResult.success([]);
      }),
      storeDocument: jest.fn(async (_i: string, doc: any, id?: string) =>
        DataProcessResult.success({ ...doc, _id: id ?? 'x' }),
      ),
    } as any;
    const gate = new BudgetEnforcementGate(configDb);
    const r = await gate.checkBudget(TENANT, 5000, 0.5); // exceeds token_limit=1000
    expect(r.isSuccess).toBe(false);
    expect(r.errorCode).toBe('BUDGET_EXCEEDED');
  });

  it('F29I-14: all FLOW-29 services return DataProcessResult (never throw)', async () => {
    const services: Array<() => Promise<any>> = [
      () => new AdaptiveRagRouter(makeDb(), makeQueue()).routeQuery('', '', '', {}),
      () => new BanditModelSelector(makeDb(), makeQueue()).selectArm('', '', {}),
      () => new RoutingPolicyUpdater(makeDb(), makeQueue()).applyFeedback('', '', 0, ''),
      () => new VectorRetrievalStep(makeDb(), makeQueue(), makeRag()).retrieve('', '', [], {}, 10),
      () => new GraphRAGCommunityQuery(makeDb(), makeQueue(), makeRag()).query('', '', '', {}),
      () => new HybridRetrievalFusion(makeDb()).fuse('', [], [], 60),
      () => new BudgetEnforcementGate(makeDb()).checkBudget('', 0, 0),
      () => new ContextEfficiencyCheck(makeDb()).checkAllocation('', {}),
      () => new RerankerStep(makeDb(), makeAi('[]')).rerank('', '', [], 5),
      () => new SelfReflectionGuard(makeDb(), makeQueue(), makeAi('')).reflect('', '', '', {}),
      () => new EvalQualityGate(makeDb(), makeQueue()).evaluate('', 0, 0),
      () => new TraceSpanCapture(makeQueue()).captureSpan('', '', '', 0, {}),
      () =>
        new UserFeedbackIngest(makeDb(), makeQueue()).ingest(
          '',
          { sessionId: 's', queryId: 'q', model: 'm', strategy: 'st', runTimestamp: 't' },
          0,
        ),
      () => new MultiHopGraphTraversal(makeDb(), makeQueue(), makeRag()).traverse('', '', 3),
      () => new FeedbackAggregationWindow(makeDb(), makeQueue()).aggregate('', ''),
      () => new DomainProfileCompiler(makeDb(), makeQueue()).compile('', '', []),
      () => new KnowledgeGraphEditGate(makeDb(), makeQueue()).checkEditApproval('', '', [], ''),
      () => new CommunitySummaryGenerator(makeDb(), makeQueue()).generateSummary('', '', []),
      () => new DomainGraphIndexRebuildSvc(makeDb(), makeQueue()).rebuild('', '', ''),
      () => new PromptVersionPromoter(makeDb(), makeQueue()).promote('', '', 'DRAFT'),
      () =>
        new RAGAssetVersionCompare(
          makeDb(),
          makeAi('{"score_a":0.7,"score_b":0.8,"confidence":0.9}'),
        ).compare('', '', ''),
      () => new PromotionPipelineGate(makeDb(), makeQueue()).checkPromotion('', '', ''),
      () => new ABTestAllocator(makeDb(), makeQueue()).allocate('', '', '', []),
      () => new RAGStrategyRollback(makeDb(), makeQueue()).rollback('', ''),
      () => new ImprovementSuggestionEngine(makeDb(), makeQueue(), makeAi('[]')).analyze('', {}),
      () => new ControlPlaneGraphEdit(makeDb(), makeQueue()).applyEdit('', '', '', [], {}),
      () => new ControlPlaneNodeRenderer(makeDb()).renderNodes('', {}),
    ];

    for (const call of services) {
      const result = await call();
      expect(result).toHaveProperty('isSuccess');
      // Result is DataProcessResult — has isSuccess property
    }
  });
});
