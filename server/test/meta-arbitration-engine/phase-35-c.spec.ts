/**
 * FLOW-35 Phase C — ImprovementDetector
 *
 * SK-404 ImprovementDetectorPattern: detects IMPROVING / PLATEAUED / REGRESSING
 */

import {
  ImprovementDetectorService,
  RoundScore,
} from '../../src/engine/flows/generation-loop/improvement-detector.service';
import { DataProcessResult } from '../../src/kernel/data-process-result';

function makeConfig(value: number) {
  return { getConfig: jest.fn(async () => DataProcessResult.success(value)) } as any;
}

function round(n: number, score: number): RoundScore {
  return {
    roundNumber: n,
    averageArbiterScore: score,
    passingArbiters: Math.round(score / 10),
    totalArbiters: 10,
  };
}

describe('FLOW-35 Phase C — ImprovementDetector', () => {
  it('F35C-1: single round returns IMPROVING with trend=0', async () => {
    const svc = new ImprovementDetectorService(makeConfig(3));
    const result = await svc.detectImprovement([round(1, 70)]);
    expect(result.isSuccess).toBe(true);
    expect(result.data?.signal).toBe('IMPROVING');
    expect(result.data?.trend).toBe(0);
  });

  it('F35C-2: rising scores produce IMPROVING signal', async () => {
    const svc = new ImprovementDetectorService(makeConfig(2));
    const rounds = [round(1, 60), round(2, 65), round(3, 70), round(4, 75), round(5, 80)];
    const result = await svc.detectImprovement(rounds);
    expect(result.data?.signal).toBe('IMPROVING');
    expect(result.data?.trend).toBeGreaterThan(2);
  });

  it('F35C-3: flat scores within ±2 produce PLATEAUED signal', async () => {
    const svc = new ImprovementDetectorService(makeConfig(2));
    const rounds = [round(1, 70), round(2, 71), round(3, 70), round(4, 71), round(5, 70)];
    const result = await svc.detectImprovement(rounds);
    expect(result.data?.signal).toBe('PLATEAUED');
  });

  it('F35C-4: falling scores produce REGRESSING signal', async () => {
    const svc = new ImprovementDetectorService(makeConfig(2));
    const rounds = [round(1, 85), round(2, 80), round(3, 75), round(4, 70), round(5, 65)];
    const result = await svc.detectImprovement(rounds);
    expect(result.data?.signal).toBe('REGRESSING');
    expect(result.data?.trend).toBeLessThan(-2);
  });

  it('F35C-5: empty rounds returns failure', async () => {
    const svc = new ImprovementDetectorService(makeConfig(3));
    const result = await svc.detectImprovement([]);
    expect(result.isSuccess).toBe(false);
    expect(result.errorCode).toBe('NO_ROUNDS');
  });

  it('F35C-6: window size comes from FREEDOM config', async () => {
    const config = makeConfig(2);
    const svc = new ImprovementDetectorService(config);
    await svc.detectImprovement([round(1, 70), round(2, 80)]);
    expect(config.getConfig).toHaveBeenCalledWith('improvement_window_rounds');
  });

  it('F35C-7: insufficient history for windowed comparison returns IMPROVING', async () => {
    const svc = new ImprovementDetectorService(makeConfig(5));
    // Only 3 rounds, window=5, no previous window available
    const rounds = [round(1, 70), round(2, 72), round(3, 74)];
    const result = await svc.detectImprovement(rounds);
    expect(result.data?.signal).toBe('IMPROVING');
  });

  it('F35C-8: result includes round history and windowSize', async () => {
    const svc = new ImprovementDetectorService(makeConfig(3));
    const rounds = [round(1, 70), round(2, 75)];
    const result = await svc.detectImprovement(rounds);
    expect(result.data?.rounds).toHaveLength(2);
    expect(result.data?.windowSize).toBe(3);
  });
});
