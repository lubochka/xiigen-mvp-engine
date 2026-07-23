/**
 * AIDrivenAssumptionRegistryLinter — unit tests (Phase 4)
 * 6 tests covering structural checks, graph path, AI path.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenAssumptionRegistryLinter } from './ai-driven-assumption-registry-linter';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}

describe('AIDrivenAssumptionRegistryLinter', () => {
  let linter: AIDrivenAssumptionRegistryLinter;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: [],
        reasoning: 'clean',
        confidence: 0.9,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenAssumptionRegistryLinter,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    linter = module.get(AIDrivenAssumptionRegistryLinter);
  });

  it('1. CF-ASSUME-1: ASSUMPTION without VERIFY → structural violation, no AI call', async () => {
    const result = await linter.lint('ASSUMPTION: Redis is available');
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('CF-ASSUME-1'))).toBe(true);
    expect(pipeline.decide).not.toHaveBeenCalled();
  });

  it('2. CF-ASSUME-2: NON-BLOCKING assumption without FALLBACK → structural violation', async () => {
    const result = await linter.lint('NON-BLOCKING: Redis might timeout\nNo fallback here');
    expect(result.passed).toBe(false);
    expect(result.violations.some((v) => v.includes('CF-ASSUME-2'))).toBe(true);
    expect(pipeline.decide).not.toHaveBeenCalled();
  });

  it('3. Clean content → AI pipeline called', async () => {
    const result = await linter.lint('# Session file\nNo assumptions here');
    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({ decisionType: 'ASSUMPTION_LINT' }),
    );
    expect(result.passed).toBe(true);
  });

  it('4. AI returns violations → stored via learning.addDiscoveredEdge', async () => {
    pipeline.decide.mockResolvedValueOnce({
      decision: ['Violation found'],
      reasoning: 'bad assumption',
      confidence: 0.8,
      modelUsed: 'claude',
      alternatives: [],
    });
    const result = await linter.lint('# Session\nSomething AI detects');
    expect(result.passed).toBe(false);
    expect(learning.addDiscoveredEdge).toHaveBeenCalled();
  });

  it('5. Graph path: high-confidence violation pattern → returned without AI', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'ASSUMPTION_PATTERN:VIOLATION',
          relationship: 'DETECTED_IN',
          toEntity: 'prev-session',
          confidence: 0.95,
          observationCount: 2,
          reasoning: 'Pattern detected previously',
          fromType: 'Pattern',
          toType: 'Session',
          immutable: false,
        },
      ],
      formatted: () => '',
    });
    const result = await linter.lint('# Session');
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.passed).toBe(false);
  });

  it('6. Valid content with VERIFY tag → no structural violation', async () => {
    const result = await linter.lint('ASSUMPTION: Redis is available VERIFY: redis-cli ping');
    // No CF-ASSUME-1 violation since VERIFY is present
    const cfViolations = result.violations.filter((v) => v.includes('CF-ASSUME-1'));
    expect(cfViolations).toHaveLength(0);
  });
});
