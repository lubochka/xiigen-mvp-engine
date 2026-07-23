// ImprovementDetectorPattern (SK-404)
// Compares arbiter score trends across rounds.
// Detects IMPROVING / PLATEAUED / REGRESSING patterns.

import { DataProcessResult } from '../../../kernel/data-process-result';

export type ImprovementSignal = 'IMPROVING' | 'PLATEAUED' | 'REGRESSING';

export interface RoundScore {
  roundNumber: number;
  averageArbiterScore: number; // 0–100
  passingArbiters: number;
  totalArbiters: number;
}

export interface ImprovementAnalysis {
  signal: ImprovementSignal;
  trend: number; // delta between latest and previous window average
  windowSize: number;
  rounds: RoundScore[];
}

export class ImprovementDetectorService {
  constructor(
    private readonly freedomConfig: { getConfig(key: string): Promise<DataProcessResult<number>> },
  ) {}

  async detectImprovement(rounds: RoundScore[]): Promise<DataProcessResult<ImprovementAnalysis>> {
    if (rounds.length === 0)
      return DataProcessResult.failure('NO_ROUNDS', 'At least one round required');

    const windowResult = await this.freedomConfig.getConfig('improvement_window_rounds');
    const window = (windowResult.isSuccess ? windowResult.data : undefined) ?? 3;

    if (rounds.length === 1) {
      return DataProcessResult.success({
        signal: 'IMPROVING',
        trend: 0,
        windowSize: window,
        rounds,
      });
    }

    const sorted = [...rounds].sort((a, b) => a.roundNumber - b.roundNumber);
    const recent = sorted.slice(-window);
    const previous = sorted.slice(-window * 2, -window);

    const avgRecent = recent.reduce((s, r) => s + r.averageArbiterScore, 0) / recent.length;

    if (previous.length === 0) {
      // Not enough history — assume improving
      return DataProcessResult.success({
        signal: 'IMPROVING',
        trend: 0,
        windowSize: window,
        rounds,
      });
    }

    const avgPrevious = previous.reduce((s, r) => s + r.averageArbiterScore, 0) / previous.length;
    const trend = avgRecent - avgPrevious;

    let signal: ImprovementSignal;
    if (trend > 2) signal = 'IMPROVING';
    else if (trend < -2) signal = 'REGRESSING';
    else signal = 'PLATEAUED';

    return DataProcessResult.success({ signal, trend, windowSize: window, rounds });
  }
}
