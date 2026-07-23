/**
 * AIDrivenSignalRouter — unit tests (Phase 3)
 * 8 tests covering CF-SIGNAL-1, confidence gate, AI pipeline, context-driven signals.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenSignalRouter } from './ai-driven-signal-router';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function edgeResult(toEntity: string, confidence = 0.95) {
  return {
    edges: [
      {
        fromEntity: 'generate',
        fromType: 'FlowPurpose',
        relationship: 'REQUIRES_SIGNAL',
        toEntity,
        toType: 'SignalType',
        confidence,
        observationCount: 3,
        immutable: false,
      },
    ],
    formatted: () => '',
  };
}

const baseContext = {
  flowId: 'FLOW-01',
  purpose: 'generate',
  isMultiCycle: false,
  capabilityMissing: false,
  genesisPromptChanged: false,
  topologyWasWrong: false,
  multiGenerateRan: false,
  shadowRunActive: false,
  arbiterPanelRan: false,
};

describe('AIDrivenSignalRouter', () => {
  let router: AIDrivenSignalRouter;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: ['DPO_TRIPLE'],
        reasoning: 'AI signals',
        confidence: 0.72,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenSignalRouter,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    router = module.get(AIDrivenSignalRouter);
  });

  it('1. High-confidence graph edges → bootstrap path (no AI pipeline call)', async () => {
    graphRag.query.mockResolvedValueOnce(edgeResult('DPO_TRIPLE', 0.95));

    const result = await router.computeRequired(baseContext);

    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.required).toContain('DPO_TRIPLE');
  });

  it('2. Below-threshold edges → AI pipeline called', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await router.computeRequired(baseContext);

    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        decisionType: 'SIGNAL_SELECTION',
      }),
    );
  });

  it('3. Empty graph → AI pipeline called with empty graphContext', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await router.computeRequired(baseContext);

    expect(pipeline.decide).toHaveBeenCalledWith(expect.objectContaining({ graphContext: [] }));
  });

  it('4. AI result stored via learning.addDiscoveredEdge', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    await router.computeRequired(baseContext);

    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'REQUIRES_SIGNAL',
      }),
    );
  });

  it('5. CF-SIGNAL-1: OUTCOME always in required even when AI omits it', async () => {
    graphRag.query.mockResolvedValue(emptyResult());
    pipeline.decide.mockResolvedValueOnce({
      decision: ['DPO_TRIPLE'], // no OUTCOME in AI result
      reasoning: 'test',
      confidence: 0.7,
      modelUsed: 'claude',
      alternatives: [],
    });

    const result = await router.computeRequired(baseContext);

    expect(result.required).toContain('OUTCOME');
  });

  it('6. Context-driven signals added regardless of AI (MODEL_COMPARISON, SHADOW_RUN, ARBITER_VERDICT)', async () => {
    graphRag.query.mockResolvedValue(emptyResult());

    const result = await router.computeRequired({
      ...baseContext,
      multiGenerateRan: true,
      shadowRunActive: true,
      arbiterPanelRan: true,
    });

    expect(result.required).toContain('MODEL_COMPARISON');
    expect(result.required).toContain('SHADOW_RUN');
    expect(result.required).toContain('ARBITER_VERDICT');
  });

  it('7. verifyEmitted: passed when all required signals present', () => {
    const result = router.verifyEmitted(
      ['OUTCOME', 'DPO_TRIPLE'],
      ['OUTCOME', 'DPO_TRIPLE', 'CALIBRATION'],
    );
    expect(result.passed).toBe(true);
    expect(result.missing).toHaveLength(0);
  });

  it('8. verifyEmitted: failed with missing list when signal absent', () => {
    const result = router.verifyEmitted(['OUTCOME', 'DPO_TRIPLE'], ['OUTCOME']);
    expect(result.passed).toBe(false);
    expect(result.missing).toContain('DPO_TRIPLE');
  });
});
