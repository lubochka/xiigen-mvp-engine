/**
 * FLOW-35 Phase D — ModelFitness
 *
 * SK-405 ModelFitnessPattern: tracks per-model acceptance rates, fitness scoring
 */

import {
  ModelFitnessService,
  ModelRoundResult,
} from '../../src/engine/flows/generation-loop/model-fitness.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeDb() {
  const stored: any[] = [];
  return {
    storeDocument: jest.fn(async (_i: string, doc: any) => {
      stored.push(doc);
      return DataProcessResult.success(doc);
    }),
    _stored: stored,
  } as any;
}
function makeConfig(value: number) {
  return { getConfig: jest.fn(async () => DataProcessResult.success(value)) } as any;
}
function mkResult(accepted: boolean, rounds = 2, cost = 0.1): ModelRoundResult {
  return {
    modelId: 'claude-sonnet',
    taskTypeId: 'T47',
    accepted,
    roundsToAccept: rounds,
    costUsd: cost,
    at: '2026-01-01T00:00:00Z',
  };
}

describe('FLOW-35 Phase D — ModelFitness', () => {
  it('F35D-1: 100% acceptance rate produces high fitness score', async () => {
    const svc = new ModelFitnessService(makeDb(), makeConfig(60));
    const results = [mkResult(true, 1, 0.05), mkResult(true, 1, 0.05), mkResult(true, 1, 0.05)];
    const result = await svc.computeFitness('claude-sonnet', 'T47', results);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.fitnessScore).toBeGreaterThan(80);
    expect(result.data?.fitnessAlert).toBe(false);
  });

  it('F35D-2: 0% acceptance rate produces low fitness score and alert', async () => {
    const svc = new ModelFitnessService(makeDb(), makeConfig(60));
    const results = [mkResult(false, 5, 0.5), mkResult(false, 5, 0.5)];
    const result = await svc.computeFitness('claude-sonnet', 'T47', results);
    expect(result.data?.fitnessAlert).toBe(true);
    expect(result.data?.fitnessScore).toBeLessThan(60);
  });

  it('F35D-3: fitnessAlert=true stores model.fitness.low event (DNA-8)', async () => {
    const db = makeDb();
    const svc = new ModelFitnessService(db, makeConfig(60));
    await svc.computeFitness('gpt-4o', 'T47', [mkResult(false, 5, 1.0), mkResult(false, 5, 1.0)]);
    expect(db.storeDocument).toHaveBeenCalledWith(
      'model-fitness-alerts',
      expect.objectContaining({ event: 'model.fitness.low' }),
    );
  });

  it('F35D-4: fitnessAlert=false does not store alert document', async () => {
    const db = makeDb();
    const svc = new ModelFitnessService(db, makeConfig(60));
    await svc.computeFitness('claude-sonnet', 'T47', [mkResult(true, 1, 0.02)]);
    expect(db.storeDocument).not.toHaveBeenCalled();
  });

  it('F35D-5: empty results returns failure', async () => {
    const svc = new ModelFitnessService(makeDb(), makeConfig(60));
    const result = await svc.computeFitness('model-x', 'T47', []);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_RESULTS');
  });

  it('F35D-6: acceptanceRate correct (3 accepted of 5)', async () => {
    const svc = new ModelFitnessService(makeDb(), makeConfig(10));
    const results = [
      mkResult(true),
      mkResult(true),
      mkResult(true),
      mkResult(false),
      mkResult(false),
    ];
    const result = await svc.computeFitness('m', 'T', results);
    expect(result.data?.acceptanceRate).toBeCloseTo(0.6);
    expect(result.data?.totalEvaluations).toBe(5);
  });

  it('F35D-7: threshold comes from FREEDOM config', async () => {
    const config = makeConfig(80);
    const svc = new ModelFitnessService(makeDb(), config);
    await svc.computeFitness('m', 'T', [mkResult(true, 1, 0.01)]);
    expect(config.getConfig).toHaveBeenCalledWith('model_fitness_threshold');
  });

  it('F35D-8: fitness score components sum correctly', async () => {
    const svc = new ModelFitnessService(makeDb(), makeConfig(60));
    const results = [mkResult(true, 1, 0)]; // 100% accept, 1 round, $0 cost → perfect
    const result = await svc.computeFitness('m', 'T', results);
    expect(result.data?.fitnessScore).toBe(100);
  });

  it('F35D-9: modelId and taskTypeId preserved in result', async () => {
    const svc = new ModelFitnessService(makeDb(), makeConfig(60));
    const result = await svc.computeFitness('model-xyz', 'T999', [mkResult(true)]);
    expect(result.data?.modelId).toBe('model-xyz');
    expect(result.data?.taskTypeId).toBe('T999');
  });

  it('F35D-10: avgCostUsd averages correctly', async () => {
    const svc = new ModelFitnessService(makeDb(), makeConfig(60));
    const results = [mkResult(true, 2, 0.2), mkResult(true, 2, 0.4)];
    const result = await svc.computeFitness('m', 'T', results);
    expect(result.data?.avgCostUsd).toBeCloseTo(0.3);
  });
});
