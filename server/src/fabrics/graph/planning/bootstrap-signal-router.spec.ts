/**
 * BootstrapSignalRouter — unit tests (Phase 2)
 * 8 tests covering OUTCOME invariant + context rules + verifyEmitted.
 */

import { Test } from '@nestjs/testing';
import { BootstrapSignalRouter } from './bootstrap-signal-router';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { SignalType } from './planning-abstracts';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function signalEdgeResult(signal: SignalType) {
  return {
    edges: [
      {
        fromEntity: 'FLOW_PURPOSE:test',
        relationship: 'REQUIRES_SIGNAL',
        toEntity: signal,
        confidence: 0.95,
        observationCount: 1,
        immutable: false,
        source: 'seeded',
        reasoning: '',
        fromType: '',
        toType: '',
        lastUpdated: '',
      },
    ],
    formatted: () => '',
  };
}

const baseContext = {
  flowId: 'FLOW-01',
  purpose: 'test',
  isMultiCycle: false,
  capabilityMissing: false,
  genesisPromptChanged: false,
  topologyWasWrong: false,
  multiGenerateRan: false,
  shadowRunActive: false,
  arbiterPanelRan: false,
};

describe('BootstrapSignalRouter', () => {
  let router: BootstrapSignalRouter;
  let graphRag: { query: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };

    const module = await Test.createTestingModule({
      providers: [BootstrapSignalRouter, { provide: GRAPH_RAG_SERVICE, useValue: graphRag }],
    }).compile();

    router = module.get(BootstrapSignalRouter);
  });

  it('should always include OUTCOME in required signals (CF-SIGNAL-1)', async () => {
    const result = await router.computeRequired(baseContext);
    expect(result.required).toContain('OUTCOME');
  });

  it('should include graph signals when REQUIRES_SIGNAL edges exist', async () => {
    graphRag.query.mockResolvedValueOnce(signalEdgeResult('CALIBRATION'));
    const result = await router.computeRequired(baseContext);
    expect(result.required).toContain('CALIBRATION');
  });

  it('should add MODEL_COMPARISON when multiGenerateRan is true', async () => {
    const result = await router.computeRequired({ ...baseContext, multiGenerateRan: true });
    expect(result.required).toContain('MODEL_COMPARISON');
  });

  it('should add SHADOW_RUN when shadowRunActive is true', async () => {
    const result = await router.computeRequired({ ...baseContext, shadowRunActive: true });
    expect(result.required).toContain('SHADOW_RUN');
  });

  it('should add DPO_TRIPLE when isMultiCycle is true', async () => {
    const result = await router.computeRequired({ ...baseContext, isMultiCycle: true });
    expect(result.required).toContain('DPO_TRIPLE');
  });

  it('should add DESIGN_FLAW when topologyWasWrong is true', async () => {
    const result = await router.computeRequired({ ...baseContext, topologyWasWrong: true });
    expect(result.required).toContain('DESIGN_FLAW');
  });

  // ── verifyEmitted ──────────────────────────────────────────────────────────

  describe('verifyEmitted', () => {
    it('should pass when all required signals are emitted', () => {
      const result = router.verifyEmitted(
        ['OUTCOME', 'DPO_TRIPLE'],
        ['OUTCOME', 'DPO_TRIPLE', 'CALIBRATION'],
      );
      expect(result.passed).toBe(true);
      expect(result.missing).toHaveLength(0);
    });

    it('should fail with CF-SIGNAL-2 violation when required signal is missing', () => {
      const result = router.verifyEmitted(['OUTCOME', 'DPO_TRIPLE'], ['OUTCOME']);
      expect(result.passed).toBe(false);
      expect(result.missing).toContain('DPO_TRIPLE');
      expect(result.message).toContain('CF-SIGNAL-2');
    });
  });
});
