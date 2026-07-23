/**
 * OutcomeTimeoutConsumer — auto-validates stale OUTCOME_PENDING planning decisions.
 *
 * B-6 Fix: Handles OUTCOME_TIMEOUT_CHECK messages from OutcomeTimeoutScheduler.
 *   - Searches xiigen-planning-decisions for OUTCOME_PENDING triples older than
 *     OUTCOME_PENDING_TIMEOUT_HOURS (default 48h, from FREEDOM config)
 *   - Auto-validates stale triples with countsTowardThreshold=false
 *   - timeoutHours=0 disables auto-validation entirely
 *
 * DNA-3: returns DataProcessResult, never throws
 * DNA-8: storeDocument first (no enqueue after triple update)
 */

import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../fabrics/interfaces/database.interface';
import { IFreedomConfigService, FREEDOM_CONFIG_SERVICE } from '../freedom/freedom-config.interface';
import { DataProcessResult } from '../kernel/data-process-result';

const DEFAULT_TIMEOUT_HOURS = 48;

@Injectable()
export class OutcomeTimeoutConsumer {
  private readonly logger = new Logger(OutcomeTimeoutConsumer.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    @Inject(FREEDOM_CONFIG_SERVICE) private readonly freedom: IFreedomConfigService,
  ) {}

  async handle(message: Record<string, unknown>): Promise<DataProcessResult<void>> {
    const messageData = (message['data'] as Record<string, unknown> | undefined) ?? message;
    if (messageData['type'] !== 'OUTCOME_TIMEOUT_CHECK') {
      return DataProcessResult.success(undefined);
    }

    // Read timeout hours from FREEDOM config — 0 = disabled
    let timeoutHours = DEFAULT_TIMEOUT_HOURS;
    try {
      const configDoc = await this.freedom.get('OUTCOME_PENDING_TIMEOUT_HOURS');
      if (configDoc && typeof configDoc['value'] === 'number') {
        timeoutHours = configDoc['value'] as number;
      }
    } catch {
      // Swallow — use default 48h
    }

    if (timeoutHours === 0) {
      // Auto-validation disabled by FREEDOM config
      return DataProcessResult.success(undefined);
    }

    const cutoffTime = new Date(Date.now() - timeoutHours * 60 * 60 * 1000).toISOString();

    // Find OUTCOME_PENDING triples
    const staleResult = await this.db.searchDocuments(
      'xiigen-planning-decisions',
      {
        outcomeStatus: 'OUTCOME_PENDING',
      },
      200,
    );

    if (!staleResult.isSuccess) {
      this.logger.warn(`OutcomeTimeoutConsumer: query failed — ${staleResult.errorMessage}`);
      return DataProcessResult.failure(
        'QUERY_FAILED',
        staleResult.errorMessage ?? 'Failed to query planning decisions',
      );
    }

    const allPending = staleResult.data ?? [];

    // Filter to only those older than the cutoff
    const staleFiltered = allPending.filter(
      (t: Record<string, unknown>) =>
        typeof t['pendingSince'] === 'string' && t['pendingSince'] < cutoffTime,
    );

    if (staleFiltered.length === 0) {
      return DataProcessResult.success(undefined);
    }

    this.logger.log(
      `OutcomeTimeoutConsumer: auto-validating ${staleFiltered.length} stale OUTCOME_PENDING triples (>${timeoutHours}h)`,
    );

    let failureCount = 0;
    for (const triple of staleFiltered) {
      const tripleId = triple['tripleId'] as string;
      if (!tripleId) continue;

      // DNA-8: storeDocument first (no enqueue after this)
      const storeResult = await this.db.storeDocument(
        'xiigen-planning-decisions',
        {
          ...triple,
          outcomeStatus: 'AUTO_VALIDATED',
          autoValidatedAt: new Date().toISOString(),
          autoValidatedReason: `TIMEOUT_${timeoutHours}H`,
          countsTowardThreshold: false, // AUTO_VALIDATED does NOT count toward graduation
        },
        tripleId,
      );

      if (!storeResult.isSuccess) {
        this.logger.warn(
          `OutcomeTimeoutConsumer: failed to auto-validate ${tripleId}: ${storeResult.errorMessage}`,
        );
        failureCount++;
      }
    }

    if (failureCount > 0) {
      this.logger.warn(`OutcomeTimeoutConsumer: ${failureCount} triples failed to auto-validate`);
    }

    return DataProcessResult.success(undefined);
  }
}
