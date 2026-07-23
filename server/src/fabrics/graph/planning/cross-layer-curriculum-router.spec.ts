/**
 * CrossLayerCurriculumRouter — unit tests (Phase 3)
 * 8 tests covering bidirectional routing, fire-and-forget, guard patterns.
 */

import { Test } from '@nestjs/testing';
import { CrossLayerCurriculumRouter } from './cross-layer-curriculum-router';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { DATABASE_SERVICE } from '../../interfaces';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function namedCheckResult(correctExample: string, wrongExample: string) {
  return {
    edges: [
      {
        fromEntity: 'NAMED_CHECK:CH-001',
        fromType: 'NamedCheck',
        relationship: 'DEFINES_PATTERN',
        toEntity: 'pattern-node',
        toType: 'PatternNode',
        confidence: 0.95,
        observationCount: 3,
        immutable: false,
        to: { correctExample, wrongExample, consequence: 'stack coupling' },
      },
    ],
    formatted: () => '',
  };
}

function makeDpoTriple(overrides: Partial<Record<string, unknown>> = {}): Record<string, unknown> {
  return {
    decisionType: 'ESCALATION',
    category: 'PLANNING_ESCALATION',
    trainingCategory: 'GENERATED',
    curriculumTier: 1,
    runId: 'r1',
    chosen: { decision: { checkId: 'CH-001' }, model: 'claude', reasoning: 'test' },
    rejected: { decision: null, model: 'none', reasoning: 'no alt' },
    teachingPoint: 'test',
    confidence: 0.8,
    trainingDataQuality: 'OUTCOME_PENDING',
    countsTowardThreshold: true,
    createdAt: new Date().toISOString(),
    ...overrides,
  };
}

describe('CrossLayerCurriculumRouter', () => {
  let router: CrossLayerCurriculumRouter;
  let graphRag: { query: jest.Mock };
  let learning: { updateEdge: jest.Mock };
  let db: { storeDocument: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { updateEdge: jest.fn().mockResolvedValue(undefined) };
    db = { storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }) };

    const module = await Test.createTestingModule({
      providers: [
        CrossLayerCurriculumRouter,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: DATABASE_SERVICE, useValue: db },
      ],
    }).compile();

    router = module.get(CrossLayerCurriculumRouter);
  });

  it('1. routePlanningToCodeGen: REINFORCEMENT triple not re-routed', async () => {
    const triple = makeDpoTriple({ trainingCategory: 'REINFORCEMENT' });

    await router.routePlanningToCodeGen(triple);

    expect(graphRag.query).not.toHaveBeenCalled();
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('2. routePlanningToCodeGen: PLANNING_ESCALATION → stores NAMED_CHECK_REINFORCEMENT', async () => {
    graphRag.query.mockResolvedValueOnce(namedCheckResult('✅ good pattern', '❌ bad pattern'));

    await router.routePlanningToCodeGen(makeDpoTriple());

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.objectContaining({ category: 'NAMED_CHECK_REINFORCEMENT' }),
      expect.any(String),
    );
  });

  it('3. routePlanningToCodeGen: patterns fetched FROM GRAPH not from triple', async () => {
    graphRag.query.mockResolvedValueOnce(namedCheckResult('correct', 'wrong'));

    await router.routePlanningToCodeGen(makeDpoTriple());

    // graphRag.query was called — patterns came from graph
    expect(graphRag.query).toHaveBeenCalledWith(
      expect.objectContaining({
        fromEntity: 'NAMED_CHECK:CH-001',
      }),
    );
  });

  it('4. routeCodeGenBlockToPlanning: updates AVOID edge via learning.updateEdge', async () => {
    graphRag.query.mockResolvedValueOnce(namedCheckResult('✅ correct', '❌ wrong'));

    await router.routeCodeGenBlockToPlanning({
      checkId: 'CH-001',
      archetype: 'ORCHESTRATION',
      arbiterRole: 'iron_rules',
      runId: 'r1',
    });

    expect(learning.updateEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        fromEntity: 'ORCHESTRATION',
        relationship: 'AVOID',
        toEntity: 'ANTI_PATTERN:CH-001',
        confidence_delta: 0.06,
      }),
    );
  });

  it('5. routeCodeGenBlockToPlanning: fires-and-forgets — error does not propagate', async () => {
    graphRag.query.mockRejectedValueOnce(new Error('ES down'));

    // Should resolve cleanly despite error
    await expect(
      router.routeCodeGenBlockToPlanning({
        checkId: 'CH-001',
        archetype: 'ORCHESTRATION',
        arbiterRole: 'iron_rules',
        runId: 'r5',
      }),
    ).resolves.toBeUndefined();
  });

  it('6. routeCodeGenBlockToPlanning: skips silently when checkId not in graph', async () => {
    // No .to field on edge — check not in graph
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'NAMED_CHECK:CH-999',
          relationship: 'DEFINES_PATTERN',
          toEntity: 'node',
          confidence: 0.95,
          observationCount: 1,
          // no .to field
          fromType: 'NamedCheck',
          toType: 'Node',
          immutable: false,
        },
      ],
      formatted: () => '',
    });

    await router.routeCodeGenBlockToPlanning({
      checkId: 'CH-999',
      archetype: 'ORCHESTRATION',
      arbiterRole: 'iron_rules',
      runId: 'r6',
    });

    expect(learning.updateEdge).not.toHaveBeenCalled();
  });

  it('7. derived triple: trainingCategory=REINFORCEMENT, countsTowardThreshold=false', async () => {
    graphRag.query.mockResolvedValueOnce(namedCheckResult('correct', 'wrong'));

    await router.routePlanningToCodeGen(makeDpoTriple());

    const stored = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(stored['trainingCategory']).toBe('REINFORCEMENT');
    expect(stored['countsTowardThreshold']).toBe(false);
  });

  it('8. derived triple: stored in xiigen-training-data not xiigen-planning-decisions', async () => {
    graphRag.query.mockResolvedValueOnce(namedCheckResult('correct', 'wrong'));

    await router.routePlanningToCodeGen(makeDpoTriple());

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-training-data',
      expect.anything(),
      expect.any(String),
    );
  });
});
