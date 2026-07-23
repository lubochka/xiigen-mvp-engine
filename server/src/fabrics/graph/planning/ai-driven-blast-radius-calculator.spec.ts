/**
 * AIDrivenBlastRadiusCalculator — unit tests (Phase 4)
 * 6 tests covering graph path, AI path, verification commands.
 */

import { Test } from '@nestjs/testing';
import { AIDrivenBlastRadiusCalculator } from './ai-driven-blast-radius-calculator';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_LEARNING_SERVICE } from '../interfaces/i-graph-learning.service';
import { GRAPH_CONFIG_READER } from './planning-abstracts';
import { AI_DECISION_PIPELINE } from '../interfaces/planning-tokens';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
const baseParams = { changeType: 'UPDATE', artifactId: 'SK-416', description: 'update skill' };

describe('AIDrivenBlastRadiusCalculator', () => {
  let calculator: AIDrivenBlastRadiusCalculator;
  let graphRag: { query: jest.Mock };
  let learning: { addDiscoveredEdge: jest.Mock };
  let pipeline: { decide: jest.Mock };
  let config: { get: jest.Mock };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    learning = { addDiscoveredEdge: jest.fn().mockResolvedValue(undefined) };
    pipeline = {
      decide: jest.fn().mockResolvedValue({
        decision: ['file-a.ts', 'file-b.ts'],
        reasoning: 'found deps',
        confidence: 0.8,
        modelUsed: 'claude',
        alternatives: [],
      }),
    };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        AIDrivenBlastRadiusCalculator,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_LEARNING_SERVICE, useValue: learning },
        { provide: AI_DECISION_PIPELINE, useValue: pipeline },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    calculator = module.get(AIDrivenBlastRadiusCalculator);
  });

  it('1. Graph path: high-confidence REFERENCED_BY edges → no AI call', async () => {
    graphRag.query.mockResolvedValueOnce({
      edges: [
        {
          fromEntity: 'ARTIFACT:SK-416',
          relationship: 'REFERENCED_BY',
          toEntity: 'service-a.ts',
          confidence: 0.95,
          observationCount: 3,
          fromType: 'Artifact',
          toType: 'File',
          immutable: false,
        },
      ],
      formatted: () => '',
    });
    const result = await calculator.calculate(baseParams);
    expect(pipeline.decide).not.toHaveBeenCalled();
    expect(result.knownDependents).toContain('service-a.ts');
  });

  it('2. Empty graph → AI pipeline called', async () => {
    const result = await calculator.calculate(baseParams);
    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({ decisionType: 'BLAST_RADIUS' }),
    );
    expect(result.knownDependents).toContain('file-a.ts');
  });

  it('3. AI result stored via learning.addDiscoveredEdge', async () => {
    await calculator.calculate(baseParams);
    expect(learning.addDiscoveredEdge).toHaveBeenCalledWith(
      expect.objectContaining({
        relationship: 'REFERENCED_BY',
      }),
    );
  });

  it('4. verification commands always returned', async () => {
    const result = await calculator.calculate(baseParams);
    expect(result.verificationCommands.length).toBeGreaterThan(0);
    expect(result.verificationCommands[0]).toContain('SK-416');
  });

  it('5. AI returns multiple dependents → all stored in graph', async () => {
    await calculator.calculate(baseParams);
    // 2 files in decision → 2 addDiscoveredEdge calls
    expect(learning.addDiscoveredEdge).toHaveBeenCalledTimes(2);
  });

  it('6. AI path: inputs contain artifactId and changeType', async () => {
    await calculator.calculate(baseParams);
    expect(pipeline.decide).toHaveBeenCalledWith(
      expect.objectContaining({
        inputs: expect.objectContaining({ artifactId: 'SK-416', changeType: 'UPDATE' }),
      }),
    );
  });
});
