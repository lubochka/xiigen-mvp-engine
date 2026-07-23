// ModelFitnessPattern (SK-405)
// Tracks per-model acceptance rates and cost efficiency.
// Emits model.fitness.low when score drops below FREEDOM threshold.

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';

export interface ModelRoundResult {
  modelId: string;
  taskTypeId: string;
  accepted: boolean;
  roundsToAccept: number;
  costUsd: number;
  at: string;
}

export interface ModelFitnessScore {
  modelId: string;
  taskTypeId: string;
  acceptanceRate: number; // 0–1
  avgRoundsToAccept: number;
  avgCostUsd: number;
  fitnessScore: number; // composite 0–100
  totalEvaluations: number;
  fitnessAlert: boolean; // true if below threshold
}

export class ModelFitnessService {
  constructor(
    private readonly db: IDatabaseService,
    private readonly freedomConfig: { getConfig(key: string): Promise<DataProcessResult<number>> },
  ) {}

  async computeFitness(
    modelId: string,
    taskTypeId: string,
    results: ModelRoundResult[],
  ): Promise<DataProcessResult<ModelFitnessScore>> {
    if (results.length === 0) {
      return DataProcessResult.failure('NO_RESULTS', 'At least one result required');
    }

    const thresholdResult = await this.freedomConfig.getConfig('model_fitness_threshold');
    const threshold = (thresholdResult.isSuccess ? thresholdResult.data : undefined) ?? 60;

    const accepted = results.filter((r) => r.accepted);
    const acceptanceRate = accepted.length / results.length;
    const avgRoundsToAccept = results.reduce((s, r) => s + r.roundsToAccept, 0) / results.length;
    const avgCostUsd = results.reduce((s, r) => s + r.costUsd, 0) / results.length;

    // Fitness = 50% acceptance rate + 30% round efficiency (max 5 rounds ideal) + 20% cost efficiency (max $0.5 ideal)
    const roundEfficiency = Math.max(0, 1 - (avgRoundsToAccept - 1) / 4);
    const costEfficiency = Math.max(0, 1 - avgCostUsd / 0.5);
    const fitnessScore = Math.round(
      acceptanceRate * 50 + roundEfficiency * 30 + costEfficiency * 20,
    );

    const fitnessAlert = fitnessScore < threshold;

    // DNA-8: store before emit
    if (fitnessAlert) {
      await this.db.storeDocument('model-fitness-alerts', {
        modelId,
        taskTypeId,
        fitnessScore,
        threshold,
        alertedAt: new Date().toISOString(),
        event: 'model.fitness.low',
      });
    }

    const score: ModelFitnessScore = {
      modelId,
      taskTypeId,
      acceptanceRate,
      avgRoundsToAccept,
      avgCostUsd,
      fitnessScore,
      totalEvaluations: results.length,
      fitnessAlert,
    };

    return DataProcessResult.success(score);
  }
}
