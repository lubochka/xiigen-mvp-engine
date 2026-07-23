/**
 * CycleChainController unit tests
 *
 * Gap 1 tests: PATCH /api/cycle-chain/:runId/resume endpoint
 *   - Returns 200 with { cycle2Trace, suspensionStatus: 'RESOLVED' } when suspension is CONTEXT_INSUFFICIENT
 *   - Returns SUSPENSION_NOT_FOUND for unknown suspensionId
 *   - Returns SUSPENSION_RUN_MISMATCH when runId does not match suspension.runId
 */

import 'reflect-metadata';
import { DataProcessResult } from '../kernel/data-process-result';
import { CycleChainController } from './cycle-chain.controller';
import { CycleChainService } from '../engine/cycle-chain.service';
import { RunAnalysisFormatter } from '../engine/run-analysis-formatter.service';

// ── Mock factories ─────────────────────────────────────────────────────────────

function makeMockChain(
  overrides: Partial<Pick<CycleChainService, 'run' | 'resumeSuspendedStep'>> = {},
): CycleChainService {
  return {
    run: jest.fn().mockResolvedValue(DataProcessResult.failure('NOT_MOCKED', 'use overrides')),
    resumeSuspendedStep: jest
      .fn()
      .mockResolvedValue(DataProcessResult.failure('NOT_MOCKED', 'use overrides')),
    ...overrides,
  } as unknown as CycleChainService;
}

function makeMockFormatter(): RunAnalysisFormatter {
  return {
    format: jest.fn().mockReturnValue({ summary: 'mock-analysis' }),
  } as unknown as RunAnalysisFormatter;
}

function makeController(
  chain: CycleChainService,
  formatter: RunAnalysisFormatter,
): CycleChainController {
  return new CycleChainController(chain, formatter);
}

// ── POST /run tests ────────────────────────────────────────────────────────────

describe('CycleChainController — POST /run', () => {
  it('returns MISSING_INTENT when userIntent is absent', async () => {
    const chain = makeMockChain();
    const formatter = makeMockFormatter();
    const ctrl = makeController(chain, formatter);

    const result = await ctrl.run({ userIntent: '   ' });
    expect(result).toMatchObject({ error: 'userIntent is required', code: 'MISSING_INTENT' });
  });

  it('delegates to chain.run and returns output with analysis on success', async () => {
    const mockOutput = {
      runId: 'test-run',
      flowId: 'FLOW-01',
      grade: 0.9,
      totalCostUsd: 0.05,
      planSteps: [],
      leafNodes: [],
      topology: [],
      cycles: { cycle1: {}, cycle2: [], cycle3: [] },
      pendingImplementations: [],
      status: 'COMPLETE',
      subFlows: [],
      suspensions: [],
    };

    const chain = makeMockChain({
      run: jest
        .fn()
        .mockResolvedValue(DataProcessResult.success(mockOutput as Record<string, unknown>)),
    });
    const formatter = makeMockFormatter();
    const ctrl = makeController(chain, formatter);

    const result = (await ctrl.run({ userIntent: 'build a registration flow' })) as Record<
      string,
      unknown
    >;
    expect(result.runId).toBe('test-run');
    expect(result.analysis).toBeDefined();
  });

  it('returns error object when chain.run fails', async () => {
    const chain = makeMockChain({
      run: jest
        .fn()
        .mockResolvedValue(DataProcessResult.failure('CYCLE_CHAIN_PLAN_FAILED', 'plan AI failed')),
    });
    const ctrl = makeController(chain, makeMockFormatter());

    const result = (await ctrl.run({ userIntent: 'build a flow' })) as Record<string, unknown>;
    expect(result.error).toBe('plan AI failed');
    expect(result.code).toBe('CYCLE_CHAIN_PLAN_FAILED');
  });
});

// ── PATCH :runId/resume tests (Gap 1) ─────────────────────────────────────────

describe('CycleChainController — PATCH :runId/resume', () => {
  const SUSPENSION_ID = 'susp-uuid-001';
  const RUN_ID = 'run-uuid-001';

  it('Gap 1: returns 200 with cycle2Trace and suspensionStatus=RESOLVED when suspension is CONTEXT_INSUFFICIENT', async () => {
    const mockTrace = {
      stepText: 'Validate email uniqueness',
      depth: 0,
      nodeIntent: 'Validate email uniqueness',
      grade: 0.9,
      accepted: true,
      rejectionReason: undefined,
      roundsCompleted: 0,
      stagnationFired: false,
      cycle4Id: 'c4-resume',
      winnerModel: 'mock-gemini',
      winnerSelfScore: 9.0,
      arbiters: [],
      promptSent: { nodePrompt: '', judgeSystemPrompt: '' },
      rounds: [],
    };

    const chain = makeMockChain({
      resumeSuspendedStep: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.success({ cycle2Trace: mockTrace, suspensionStatus: 'RESOLVED' }),
        ),
    });
    const ctrl = makeController(chain, makeMockFormatter());

    const result = (await ctrl.resume(RUN_ID, {
      suspensionId: SUSPENSION_ID,
      answers: ['Yes, two separate steps'],
    })) as Record<string, unknown>;

    expect(result.suspensionStatus).toBe('RESOLVED');
    expect(result.cycle2Trace).toBeDefined();
    expect((result.cycle2Trace as Record<string, unknown>).stepText).toBe(
      'Validate email uniqueness',
    );
    expect(chain.resumeSuspendedStep as jest.Mock).toHaveBeenCalledWith(RUN_ID, SUSPENSION_ID, [
      'Yes, two separate steps',
    ]);
  });

  it('Gap 1: returns SUSPENSION_NOT_FOUND when suspensionId is unknown', async () => {
    const chain = makeMockChain({
      resumeSuspendedStep: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.failure('SUSPENSION_NOT_FOUND', 'No suspension found: bad-id'),
        ),
    });
    const ctrl = makeController(chain, makeMockFormatter());

    const result = (await ctrl.resume(RUN_ID, { suspensionId: 'bad-id', answers: [] })) as Record<
      string,
      unknown
    >;

    expect(result.code).toBe('SUSPENSION_NOT_FOUND');
    expect(result.error).toMatch(/No suspension found/);
  });

  it('Gap 1: returns SUSPENSION_RUN_MISMATCH when runId does not match suspension.runId', async () => {
    const chain = makeMockChain({
      resumeSuspendedStep: jest
        .fn()
        .mockResolvedValue(
          DataProcessResult.failure(
            'SUSPENSION_RUN_MISMATCH',
            'suspensionId does not belong to this runId',
          ),
        ),
    });
    const ctrl = makeController(chain, makeMockFormatter());

    const result = (await ctrl.resume('different-run-id', {
      suspensionId: SUSPENSION_ID,
      answers: ['answer'],
    })) as Record<string, unknown>;

    expect(result.code).toBe('SUSPENSION_RUN_MISMATCH');
  });

  it('returns INVALID_RESUME_BODY when answers is not an array', async () => {
    const chain = makeMockChain();
    const ctrl = makeController(chain, makeMockFormatter());

    const result = (await ctrl.resume(RUN_ID, {
      suspensionId: SUSPENSION_ID,
      answers: 'not-array' as unknown as string[],
    })) as Record<string, unknown>;

    expect(result.code).toBe('INVALID_RESUME_BODY');
    expect(chain.resumeSuspendedStep as jest.Mock).not.toHaveBeenCalled();
  });

  it('returns MISSING_RUN_ID when runId is empty', async () => {
    const chain = makeMockChain();
    const ctrl = makeController(chain, makeMockFormatter());

    const result = (await ctrl.resume('', { suspensionId: SUSPENSION_ID, answers: [] })) as Record<
      string,
      unknown
    >;

    expect(result.code).toBe('MISSING_RUN_ID');
  });
});
