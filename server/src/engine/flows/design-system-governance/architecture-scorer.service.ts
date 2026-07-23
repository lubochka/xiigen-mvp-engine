/**
 * ArchitectureScorer — T503 [EVALUATION].
 *
 * Scores overall design system architecture quality: consistency, reusability,
 * accessibility compliance, pattern adherence.
 * Produces architecture score 0.0–1.0 with STRONG/ADEQUATE/WEAK classification.
 *
 * DNA-8: storeDocument() BEFORE enqueue().
 * DNA-3: All methods return DataProcessResult — never throw.
 * CF-476: tenantId required — UNSCOPED_QUERY on missing.
 */

import { DataProcessResult } from '../../../kernel/data-process-result';
import { randomUUID } from 'crypto';

interface IDb {
  storeDocument(
    index: string,
    doc: Record<string, unknown>,
    id?: string,
  ): Promise<DataProcessResult<Record<string, unknown>>>;
}

interface IQueue {
  enqueue(event: string, data: Record<string, unknown>): Promise<DataProcessResult<string>>;
}

export interface ArchitectureScoreResult {
  scoreId: string;
  specId: string;
  architectureScore: number;
  classification: 'STRONG' | 'ADEQUATE' | 'WEAK';
  scoredAt: string;
}

export class ArchitectureScorer {
  constructor(
    private readonly db: IDb,
    private readonly queue: IQueue,
  ) {}

  async score(
    tenantId: string,
    specId: string,
    dimensions: {
      consistencyScore: number; // 0.0–1.0
      reusabilityScore: number; // 0.0–1.0
      accessibilityScore: number; // 0.0–1.0
      patternAdherence: number; // 0.0–1.0
    },
  ): Promise<DataProcessResult<ArchitectureScoreResult>> {
    if (!tenantId) return DataProcessResult.failure('UNSCOPED_QUERY', 'tenantId is required');
    if (!specId) return DataProcessResult.failure('MISSING_SPEC_ID', 'specId is required');

    // Equal-weighted average of 4 dimensions
    const architectureScore =
      (dimensions.consistencyScore +
        dimensions.reusabilityScore +
        dimensions.accessibilityScore +
        dimensions.patternAdherence) /
      4;

    const classification: 'STRONG' | 'ADEQUATE' | 'WEAK' =
      architectureScore >= 0.8 ? 'STRONG' : architectureScore >= 0.5 ? 'ADEQUATE' : 'WEAK';

    const scoreId = randomUUID();
    const scoredAt = new Date().toISOString();
    const doc: Record<string, unknown> = {
      scoreId,
      tenantId,
      specId,
      architectureScore,
      classification,
      dimensions,
      scoredAt,
    };

    const stored = await this.db.storeDocument('flow31-architecture-scores', doc, scoreId);
    if (!stored.isSuccess)
      return DataProcessResult.failure(stored.errorCode!, stored.errorMessage!);

    await this.queue.enqueue('design.architecture.scored', {
      scoreId,
      tenantId,
      specId,
      architectureScore,
      classification,
      scoredAt,
    });

    return DataProcessResult.success({
      scoreId,
      specId,
      architectureScore,
      classification,
      scoredAt,
    });
  }
}
