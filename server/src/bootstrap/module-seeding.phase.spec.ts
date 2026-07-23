/**
 * Unit tests for ModuleSeedingPhase — Bootstrap Phase 8.
 * P21 + P22: RAG seeding and prompt seeding orchestration.
 *
 * DNA-3: Verifies that individual failures never abort the entire phase.
 */

import { ModuleSeedingPhase } from './module-seeding.phase';
import { DataProcessResult } from '../kernel/data-process-result';
import { IFlowRagSeed } from '../rag-init/flow-rag-seed.interface';
import { IFlowPromptSeed } from '../rag-init/flow-prompt-seed.interface';

// ── Mock factories ────────────────────────────────────────────────────────────

function makeRagSeed(domainId: string, result: DataProcessResult<number>): IFlowRagSeed {
  return {
    domainId,
    seedAll: jest.fn().mockResolvedValue(result),
    indexPatterns: jest.fn(),
    indexBfaRules: jest.fn(),
    indexDesignRecords: jest.fn(),
  };
}

function makePromptSeed(domainId: string, result: DataProcessResult<number>): IFlowPromptSeed {
  return {
    domainId,
    seedPrompts: jest.fn().mockResolvedValue(result),
  };
}

// ── Tests ─────────────────────────────────────────────────────────────────────

describe('ModuleSeedingPhase', () => {
  it('execute() calls seedAll() on all registered ragSeeds', async () => {
    const ragSeed1 = makeRagSeed('domain-a', DataProcessResult.success(10));
    const ragSeed2 = makeRagSeed('domain-b', DataProcessResult.success(5));
    const phase = new ModuleSeedingPhase([ragSeed1, ragSeed2], []);

    await phase.execute();

    expect(ragSeed1.seedAll).toHaveBeenCalledTimes(1);
    expect(ragSeed2.seedAll).toHaveBeenCalledTimes(1);
  });

  it('execute() calls seedPrompts() on all registered promptSeeds', async () => {
    const promptSeed1 = makePromptSeed('domain-a', DataProcessResult.success(3));
    const promptSeed2 = makePromptSeed('domain-b', DataProcessResult.success(7));
    const phase = new ModuleSeedingPhase([], [promptSeed1, promptSeed2]);

    await phase.execute();

    expect(promptSeed1.seedPrompts).toHaveBeenCalledTimes(1);
    expect(promptSeed2.seedPrompts).toHaveBeenCalledTimes(1);
  });

  it('execute() continues on individual seed failure (DNA-3)', async () => {
    const failingSeed = makeRagSeed(
      'domain-fail',
      DataProcessResult.failure('SEED_ERROR', 'DB down'),
    );
    const succeedingSeed = makeRagSeed('domain-ok', DataProcessResult.success(5));
    const phase = new ModuleSeedingPhase([failingSeed, succeedingSeed], []);

    const result = await phase.execute();

    // DNA-3: overall phase still succeeds
    expect(result.isSuccess).toBe(true);
    // Failed domain recorded as -1
    const ragResults = (result.data as Record<string, unknown>)['ragResults'] as Record<
      string,
      number
    >;
    expect(ragResults['domain-fail']).toBe(-1);
    // Succeeding domain recorded correctly
    expect(ragResults['domain-ok']).toBe(5);
    // Second seed still called despite first failure
    expect(succeedingSeed.seedAll).toHaveBeenCalledTimes(1);
  });

  it('execute() returns DataProcessResult.success with ragResults and promptResults', async () => {
    const ragSeed = makeRagSeed('domain-rag', DataProcessResult.success(8));
    const promptSeed = makePromptSeed('domain-prompt', DataProcessResult.success(4));
    const phase = new ModuleSeedingPhase([ragSeed], [promptSeed]);

    const result = await phase.execute();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);
    expect(result.data).toHaveProperty('ragResults');
    expect(result.data).toHaveProperty('promptResults');

    const data = result.data as Record<string, unknown>;
    const ragResults = data['ragResults'] as Record<string, number>;
    const promptResults = data['promptResults'] as Record<string, number>;

    expect(ragResults['domain-rag']).toBe(8);
    expect(promptResults['domain-prompt']).toBe(4);
  });

  it('execute() works with empty seed arrays (no seeds registered)', async () => {
    const phase = new ModuleSeedingPhase([], []);

    const result = await phase.execute();

    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result.isSuccess).toBe(true);

    const data = result.data as Record<string, unknown>;
    expect(data['ragResults']).toEqual({});
    expect(data['promptResults']).toEqual({});
  });

  it('execute() handles thrown exceptions from seeds without crashing (DNA-3)', async () => {
    const throwingSeed: IFlowRagSeed = {
      domainId: 'domain-throws',
      seedAll: jest.fn().mockRejectedValue(new Error('Unexpected crash')),
      indexPatterns: jest.fn(),
      indexBfaRules: jest.fn(),
      indexDesignRecords: jest.fn(),
    };
    const phase = new ModuleSeedingPhase([throwingSeed], []);

    let caughtError: unknown = null;
    let result: DataProcessResult<Record<string, unknown>> | null = null;

    try {
      result = await phase.execute();
    } catch (e) {
      caughtError = e;
    }

    // DNA-3: must NOT propagate the thrown exception
    expect(caughtError).toBeNull();
    expect(result).toBeInstanceOf(DataProcessResult);
    expect(result!.isSuccess).toBe(true);

    const ragResults = (result!.data as Record<string, unknown>)['ragResults'] as Record<
      string,
      number
    >;
    expect(ragResults['domain-throws']).toBe(-1);
  });
});
