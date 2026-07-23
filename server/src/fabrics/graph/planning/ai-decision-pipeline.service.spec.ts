/**
 * AiDecisionPipelineService — unit tests (Phase 3)
 * 12 tests covering 4-role protocol, V9-002, DPO storage, iron rules.
 */

import { Test } from '@nestjs/testing';
import { AiDecisionPipelineService } from './ai-decision-pipeline.service';
import { AI_PROVIDER } from '../../interfaces';
import { DATABASE_SERVICE } from '../../interfaces';
import { GRAPH_CONFIG_READER } from './planning-abstracts';

function makeAiMock() {
  return {
    generate: jest.fn().mockResolvedValue({
      isSuccess: true,
      data: { text: 'CYCLE_WITH_PATCH' },
    }),
  };
}

function makeDbMock() {
  return { storeDocument: jest.fn().mockResolvedValue({ isSuccess: true }) };
}

function makeConfigMock(threshold = 0.9) {
  return { get: jest.fn().mockResolvedValue(threshold) };
}

describe('AiDecisionPipelineService', () => {
  let service: AiDecisionPipelineService;
  let ai: ReturnType<typeof makeAiMock>;
  let db: ReturnType<typeof makeDbMock>;
  let config: ReturnType<typeof makeConfigMock>;

  beforeEach(async () => {
    ai = makeAiMock();
    db = makeDbMock();
    config = makeConfigMock();

    const module = await Test.createTestingModule({
      providers: [
        AiDecisionPipelineService,
        { provide: AI_PROVIDER, useValue: ai },
        { provide: DATABASE_SERVICE, useValue: db },
        { provide: GRAPH_CONFIG_READER, useValue: config },
      ],
    }).compile();

    service = module.get(AiDecisionPipelineService);
  });

  it('1. decide() calls implementor models with shuffled candidate labels', async () => {
    // Two models → two AI calls (implementors)
    const originalEnv = process.env['PLANNING_IMPLEMENTOR_MODELS'];
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a,model-b';

    // Arbiter returns PASS, manager picks first
    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'CYCLE_WITH_PATCH' } }) // implementor A
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'CYCLE_WITH_PATCH' } }) // implementor B
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } }) // arbiter A
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } }); // arbiter B

    await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r1',
    });

    // At least 2 implementor calls + 2 arbiter calls
    expect(ai.generate.mock.calls.length).toBeGreaterThanOrEqual(4);
    // Labels A/B used in prompts
    const labels = ai.generate.mock.calls
      .slice(0, 2)
      .map((c) => c[0])
      .join('');
    expect(labels).toMatch(/Candidate [AB]/);

    process.env['PLANNING_IMPLEMENTOR_MODELS'] = originalEnv ?? '';
  });

  it('2. arbiters evaluate each candidate against iron rules', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a,model-b';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });

    await service.decide({
      decisionType: 'PANEL_ASSEMBLY',
      inputs: { archetype: 'ORCHESTRATION', contextDescription: 'test' },
      graphContext: [],
      runId: 'r2',
    });

    // Arbiter calls contain iron-rule text
    const arbiterCall = ai.generate.mock.calls[2][0] as string;
    expect(arbiterCall).toContain('iron rules');
    expect(arbiterCall).toContain('CF-PANEL');

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('3. BLOCK candidate is removed from pool before manager step', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a,model-b';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'bad-decision' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'BLOCK: violates CF-CYCLE-1' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });

    const result = await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r3',
    });

    // Winner must be the PASS candidate, not the BLOCKed one
    expect(result.decision).toBe('ACCEPT');

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('4. V9-002: chosen.model and rejected.model stored from different models', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a,model-b';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'CYCLE_WITH_PATCH' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'Option 1' } });

    await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r4',
    });

    const stored = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    // models are different (model-a and model-b shuffled)
    const chosen = (stored['chosen'] as Record<string, unknown>)?.['model'];
    const rejected = (stored['rejected'] as Record<string, unknown>)?.['model'];
    expect(chosen).not.toBe(rejected);
    expect((stored as Record<string, unknown>)['countsTowardThreshold']).toBe(true);

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('5. V9-002 violation: countsTowardThreshold=false when same model', async () => {
    // Only one model → chosen.model === rejected.model
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });

    await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r5',
    });

    const stored = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect((stored as Record<string, unknown>)['countsTowardThreshold']).toBe(false);

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('6. upper manager called when multiple candidates survive arbiters', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a,model-b';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'CYCLE_WITH_PATCH' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'Option 1' } }); // manager

    await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r6',
    });

    // 2 implementors + 2 arbiters + 1 manager = 5 calls
    expect(ai.generate.mock.calls.length).toBe(5);

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('7. DPO triple written to xiigen-planning-decisions (not xiigen-training-data)', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });

    await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r7',
    });

    expect(db.storeDocument).toHaveBeenCalledWith(
      'xiigen-planning-decisions',
      expect.objectContaining({ decisionType: 'CYCLE_ROUTING' }),
      expect.any(String),
    );

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('8. DPO triple trainingDataQuality = OUTCOME_PENDING', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });

    await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r8',
    });

    const stored = db.storeDocument.mock.calls[0][1] as Record<string, unknown>;
    expect(stored['trainingDataQuality']).toBe('OUTCOME_PENDING');

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('9. throws AI_PIPELINE_ALL_BLOCKED when all candidates blocked', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'bad' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'BLOCK: CF-CYCLE-1' } });

    await expect(
      service.decide({
        decisionType: 'CYCLE_ROUTING',
        inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
        graphContext: [],
        runId: 'r9',
      }),
    ).rejects.toThrow('AI_PIPELINE_ALL_BLOCKED:CYCLE_ROUTING');

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('10. non-fatal: storeDpoTriple failure is logged and does not reject decision', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'ACCEPT' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });
    db.storeDocument.mockRejectedValueOnce(new Error('ES down'));

    const result = await service.decide({
      decisionType: 'CYCLE_ROUTING',
      inputs: { score: 0.75, archetype: 'ORCHESTRATION', cycle: 1, budget: 3 },
      graphContext: [],
      runId: 'r10',
    });

    // Decision still returned despite storage failure
    expect(result).toBeDefined();
    expect(result.decision).toBe('ACCEPT');

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('11. PANEL_ASSEMBLY prompt contains key_principles always required text', async () => {
    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a';

    ai.generate
      .mockResolvedValueOnce({ isSuccess: true, data: { text: '["key_principles"]' } })
      .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });

    await service.decide({
      decisionType: 'PANEL_ASSEMBLY',
      inputs: { archetype: 'ORCHESTRATION', contextDescription: 'context' },
      graphContext: [],
      runId: 'r11',
    });

    const implementorPrompt = ai.generate.mock.calls[0][0] as string;
    expect(implementorPrompt).toContain('key_principles is always required');

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });

  it('12. buildDecisionPrompt returns non-empty string for all 10 PlanningDecisionType values', async () => {
    // Access via decide() calls with each type — ensures the fallback path is NOT taken
    // (fallback returns generic "Make a X decision" — check for type-specific content)
    const types = [
      'PANEL_ASSEMBLY',
      'CYCLE_ROUTING',
      'ESCALATION',
      'SIGNAL_SELECTION',
      'BUDGET_PREDICTION',
      'SCOPE_CLASSIFICATION',
      'NODE_COMPLETENESS',
      'SCHEMA_CHAIN',
      'BLAST_RADIUS',
      'ASSUMPTION_LINT',
    ] as const;

    process.env['PLANNING_IMPLEMENTOR_MODELS'] = 'model-a';

    for (const type of types) {
      ai.generate.mockClear();
      ai.generate
        .mockResolvedValueOnce({ isSuccess: true, data: { text: 'result' } })
        .mockResolvedValueOnce({ isSuccess: true, data: { text: 'PASS' } });
      db.storeDocument.mockClear();

      await service
        .decide({
          decisionType: type,
          inputs: {
            archetype: 'ORCHESTRATION',
            contextDescription: 'ctx',
            score: 0.75,
            cycle: 1,
            budget: 3,
            bottleneck: 'X',
            cyclesUsed: 1,
            cycleBudget: 3,
            survivingCount: 1,
            maxChallenges: 0,
            purpose: 'generate',
            multiGenerateRan: false,
            shadowRunActive: false,
            arbiterPanelRan: false,
            novelPatterns: [],
            hasClarityNote: false,
            isInversionCase: false,
            gapType: 'MISSING',
            serviceCategory: 'core',
            description: 'desc',
            nodeIntent: {},
            flowId: 'F1',
            changeType: 'UPDATE',
            artifactId: 'A-1',
            excerpt: 'A-1: test',
          },
          graphContext: [],
          runId: `r-${type}`,
        })
        .catch(() => {}); // some may throw ALL_BLOCKED — that's fine

      // The prompt passed to the first implementor call should not be the fallback
      if (ai.generate.mock.calls.length > 0) {
        const prompt = ai.generate.mock.calls[0][0] as string;
        expect(prompt.length).toBeGreaterThan(0);
        // Generic fallback starts with "Make a " — type-specific prompts do not
        expect(prompt).not.toMatch(/^Make a /);
      }
    }

    delete process.env['PLANNING_IMPLEMENTOR_MODELS'];
  });
});
