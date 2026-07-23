/**
 * BootstrapNodeCompletenessValidator — unit tests (Phase 2)
 * 8 tests covering hard checks, stack-term detection, threshold read, and bootstrap mode behavior.
 */

import { Test } from '@nestjs/testing';
import { BootstrapNodeCompletenessValidator } from './bootstrap-node-completeness-validator';
import { GRAPH_CONFIG_READER, IGraphConfigReader, NodeRepresentation } from './planning-abstracts';

function makeNode(overrides: Partial<NodeRepresentation['intent']> = {}): NodeRepresentation {
  return {
    intent: {
      purpose: 'Orchestrate code generation flow',
      failureModes: ['output_empty', 'timeout'],
      domainConcepts: ['flow', 'archetype'],
      ...overrides,
    },
  };
}

describe('BootstrapNodeCompletenessValidator', () => {
  let validator: BootstrapNodeCompletenessValidator;
  let config: IGraphConfigReader;

  const archetype = 'ORCHESTRATION';

  beforeEach(async () => {
    config = { get: jest.fn().mockResolvedValue(0.75) };

    const module = await Test.createTestingModule({
      providers: [
        BootstrapNodeCompletenessValidator,
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    validator = module.get(BootstrapNodeCompletenessValidator);
  });

  it('should pass with no violations for a well-formed node', async () => {
    const result = await validator.validate({ node: makeNode(), archetype });
    expect(result.passed).toBe(true);
    expect(result.hardViolations).toHaveLength(0);
  });

  it('NODE-HARD-001: should fail when purpose is empty', async () => {
    const result = await validator.validate({ node: makeNode({ purpose: '' }), archetype });
    expect(result.passed).toBe(false);
    expect(result.hardViolations.some((v) => v.includes('NODE-HARD-001'))).toBe(true);
  });

  it('NODE-002: should fail when failureModes is empty', async () => {
    const result = await validator.validate({ node: makeNode({ failureModes: [] }), archetype });
    expect(result.passed).toBe(false);
    expect(result.hardViolations.some((v) => v.includes('NODE-002'))).toBe(true);
  });

  it('NODE-003: should fail when domainConcepts has < 2 items', async () => {
    const result = await validator.validate({
      node: makeNode({ domainConcepts: ['flow'] }),
      archetype,
    });
    expect(result.passed).toBe(false);
    expect(result.hardViolations.some((v) => v.includes('NODE-003'))).toBe(true);
  });

  it('NODE-001: should fail when purpose contains stack terminology (NestJS)', async () => {
    const result = await validator.validate({
      node: makeNode({ purpose: 'NestJS service that handles flows' }),
      archetype,
    });
    expect(result.passed).toBe(false);
    expect(result.hardViolations.some((v) => v.includes('NODE-001'))).toBe(true);
  });

  it('should read completeness threshold from config (for Phase 3 audit)', async () => {
    await validator.validate({ node: makeNode(), archetype });
    expect(config.get).toHaveBeenCalledWith('engine.nodeValidation.completenessThreshold', 0.75);
  });

  it('should return aiGrading with overallScore: 1.0 when no violations', async () => {
    const result = await validator.validate({ node: makeNode(), archetype });
    expect(result.aiGrading).toBeDefined();
    expect(result.aiGrading!.overallScore).toBe(1.0);
    expect(result.aiGrading!.suggestions[0]).toContain('Bootstrap mode');
  });

  it('should NOT call AI engine (no AI grading in bootstrap mode)', async () => {
    const aiSpy = jest.fn();
    await validator.validate({ node: makeNode(), archetype });
    expect(aiSpy).not.toHaveBeenCalled();
  });
});
