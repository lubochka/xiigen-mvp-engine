import { Injectable, Logger, Inject } from '@nestjs/common';
import {
  DATABASE_SERVICE,
  type IDatabaseService,
} from '../../fabrics/interfaces/database.interface';
import { ES_INDEX } from '../../kernel/es-index-constants';

export interface DifficultyPredictorInput {
  /** Task type identifier */
  taskTypeId: string;
  /** Archetype of the task (ORCHESTRATION, REGISTRATION, etc.) */
  archetype: string;
  /** Iron rules the service must implement */
  ironRules?: Array<{ ruleId: string; text: string }>;
}

export interface DifficultyPrediction {
  /** Predicted number of AF generation cycles needed */
  cycleBudget: 1 | 2 | 3;
  /** Factors that contributed to novelty score */
  noveltyFactors: string[];
  /** Total novelty score (0-4+) */
  noveltyScore: number;
}

/**
 * DifficultyPredictorService — predicts how many AF generation cycles a task type will need.
 *
 * Based on pattern novelty from the RAG:
 *   - Archetype never seen before → 2 novelty points
 *   - Many new iron rules + few prior patterns → 1 novelty point
 *   - No existing arch pattern for this task type → 1 novelty point
 *
 * Cycle budget mapping:
 *   - novelty >= 3 → 3 cycles (very novel — new archetype with many new rules)
 *   - novelty >= 1 → 2 cycles (somewhat novel — established archetype but new rules)
 *   - novelty = 0 → 1 cycle (well-established — pattern seen multiple times)
 *
 * Calibrated against FLOW-03 predictions:
 *   T59 (ORCHESTRATION, seen in FLOW-01+02) → cycleBudget=1
 *   T60 (REGISTRATION, first occurrence, 3 iron rules) → cycleBudget=3
 *   T61 (PROCESSING, 2 prior) → cycleBudget=2
 *   T62 (ROUTING, 2 prior) → cycleBudget=2
 *
 * Uses field-filter RAG queries only — no semantic search needed.
 */
@Injectable()
export class DifficultyPredictorService {
  private readonly logger = new Logger(DifficultyPredictorService.name);

  constructor(
    @Inject(DATABASE_SERVICE)
    private readonly dbService: IDatabaseService,
  ) {}

  /**
   * Predict the cycle budget for a given task type.
   *
   * Queries the RAG for:
   * 1. Prior occurrences of the archetype in ARCH_PATTERN documents
   * 2. Existing patterns for this specific task type
   */
  async predict(input: DifficultyPredictorInput): Promise<DifficultyPrediction> {
    const { taskTypeId, archetype, ironRules = [] } = input;

    // Count prior occurrences of this archetype
    const archetypeResult = await this.dbService.searchDocuments(
      ES_INDEX.RAG_PATTERNS,
      { patternType: 'ARCH_PATTERN', archetype },
      100,
    );
    const priorArchetypeOccurrences = archetypeResult.isSuccess
      ? (archetypeResult.data?.length ?? 0)
      : 0;

    // Count existing patterns for this specific task type
    const taskTypeResult = await this.dbService.searchDocuments(
      ES_INDEX.RAG_PATTERNS,
      { patternType: 'ARCH_PATTERN', taskTypeId },
      10,
    );
    const existingPatternCount = taskTypeResult.isSuccess ? (taskTypeResult.data?.length ?? 0) : 0;

    // Compute novelty factors
    const noveltyFactors: string[] = [];
    let noveltyScore = 0;

    if (priorArchetypeOccurrences === 0) {
      noveltyFactors.push(`Archetype '${archetype}' has never been generated before (+2)`);
      noveltyScore += 2;
    }

    if (ironRules.length > 2 && priorArchetypeOccurrences < 2) {
      noveltyFactors.push(
        `${ironRules.length} iron rules with only ${priorArchetypeOccurrences} prior pattern(s) (+1)`,
      );
      noveltyScore += 1;
    }

    if (existingPatternCount === 0) {
      noveltyFactors.push(`No existing arch pattern in RAG for ${taskTypeId} (+1)`);
      noveltyScore += 1;
    }

    // Map novelty score to cycle budget
    let cycleBudget: 1 | 2 | 3;
    if (noveltyScore >= 3) {
      cycleBudget = 3;
    } else if (noveltyScore >= 1) {
      cycleBudget = 2;
    } else {
      cycleBudget = 1;
    }

    this.logger.log(
      `Difficulty prediction: ${taskTypeId} (${archetype}) → ` +
        `noveltyScore=${noveltyScore} cycleBudget=${cycleBudget}`,
    );

    return { cycleBudget, noveltyFactors, noveltyScore };
  }
}
