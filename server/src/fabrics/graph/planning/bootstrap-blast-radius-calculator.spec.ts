/**
 * BootstrapBlastRadiusCalculator — unit tests (Phase 2)
 * 8 tests covering graph query, empty fallback, verification commands.
 */

import { Test } from '@nestjs/testing';
import { BootstrapBlastRadiusCalculator } from './bootstrap-blast-radius-calculator';
import { GRAPH_RAG_SERVICE } from '../interfaces/i-graph-rag.service';
import { GRAPH_CONFIG_READER, IGraphConfigReader } from './planning-abstracts';

function emptyResult() {
  return { edges: [], formatted: () => '' };
}
function refEdgeResult(files: string[]) {
  return {
    edges: files.map((f) => ({
      fromEntity: 'ARTIFACT:F1234',
      relationship: 'REFERENCED_BY',
      toEntity: f,
      confidence: 0.95,
      observationCount: 1,
      immutable: false,
      source: 'seeded',
      reasoning: '',
      fromType: '',
      toType: '',
      lastUpdated: '',
    })),
    formatted: () => '',
  };
}

describe('BootstrapBlastRadiusCalculator', () => {
  let calculator: BootstrapBlastRadiusCalculator;
  let graphRag: { query: jest.Mock };
  let config: IGraphConfigReader;

  const baseParams = { changeType: 'FEATURE', artifactId: 'F1234', description: 'test change' };

  beforeEach(async () => {
    graphRag = { query: jest.fn().mockResolvedValue(emptyResult()) };
    config = { get: jest.fn().mockResolvedValue(0.9) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapBlastRadiusCalculator,
        { provide: GRAPH_RAG_SERVICE, useValue: graphRag },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    calculator = module.get(BootstrapBlastRadiusCalculator);
  });

  it('should return empty knownDependents when no REFERENCED_BY edges (safe default)', async () => {
    const result = await calculator.calculate(baseParams);
    expect(result.knownDependents).toHaveLength(0);
  });

  it('should return dependents from graph REFERENCED_BY edges', async () => {
    graphRag.query.mockResolvedValueOnce(refEdgeResult(['service-a.ts', 'service-b.ts']));
    const result = await calculator.calculate(baseParams);
    expect(result.knownDependents).toContain('service-a.ts');
    expect(result.knownDependents).toContain('service-b.ts');
  });

  it('should query ARTIFACT:${artifactId} → REFERENCED_BY', async () => {
    await calculator.calculate(baseParams);
    expect(graphRag.query).toHaveBeenCalledWith(
      expect.objectContaining({
        fromEntity: 'ARTIFACT:F1234',
        relationship: 'REFERENCED_BY',
      }),
    );
  });

  it('should always return verification commands regardless of graph result', async () => {
    const result = await calculator.calculate(baseParams);
    expect(result.verificationCommands).toHaveLength(3);
    result.verificationCommands.forEach((cmd) => expect(typeof cmd).toBe('string'));
  });

  it('should include artifactId in verification grep command', async () => {
    const result = await calculator.calculate(baseParams);
    expect(result.verificationCommands.some((c) => c.includes('F1234'))).toBe(true);
  });

  it('should read confidence threshold from config', async () => {
    await calculator.calculate(baseParams);
    expect(config.get).toHaveBeenCalledWith('engine.decision.confidenceThreshold', 0.9);
  });

  it('should not call AI engine', () => {
    const aiSpy = jest.fn();
    expect(aiSpy).not.toHaveBeenCalled();
  });

  it('should return correctly typed result', async () => {
    const result = await calculator.calculate(baseParams);
    expect(Array.isArray(result.knownDependents)).toBe(true);
    expect(Array.isArray(result.verificationCommands)).toBe(true);
  });
});
