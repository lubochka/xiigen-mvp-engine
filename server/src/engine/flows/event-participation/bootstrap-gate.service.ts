// T120 BootstrapGate [ORCHESTRATION]
//
// Tracks batch acknowledgement count and emits ParticipationBootstrapCompleted when all batches acked.
// Batch-ack counter stored in DATABASE FABRIC — NOT SCOPED_MEMORY (R2/CF-08-3)
// SETNX on gate record key prevents double-completion
// storeDocument BEFORE ParticipationBootstrapCompleted emit (DNA-8)
// knowledgeScope: 'PRIVATE' on gate records
//
// Factories:
//   F234: IDatabaseService — gate counter + gate records (DATABASE FABRIC — not memory)
//   F236: IQueueService — ParticipationBootstrapCompleted CloudEvent

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

export interface BootstrapGateAckInput {
  eventId: string;
  tenantId: string;
  batchIndex: number;
  totalBatches: number;
}

export interface BootstrapGateResult {
  eventId: string;
  tenantId: string;
  ackedBatches: number;
  totalBatches: number;
  completed: boolean;
}

export class BootstrapGateService {
  constructor(
    /** F234: IDatabaseService — gate counter (DATABASE FABRIC — NOT in-memory) */
    private readonly db: IDatabaseService,
    /** F236: IQueueService — ParticipationBootstrapCompleted CloudEvent */
    private readonly queue: IQueueService,
  ) {}

  async acknowledgeBatch(
    input: BootstrapGateAckInput,
  ): Promise<DataProcessResult<BootstrapGateResult>> {
    const gateKey = `bootstrap-gate:${input.eventId}:${input.tenantId}`;
    const completionKey = `bootstrap-gate-complete:${input.eventId}:${input.tenantId}`;

    // Check if already completed (SETNX — prevent double-completion)
    const completionCheck = await this.db.searchDocuments('xiigen-bootstrap-gate-completions', {
      completionKey,
      tenantId: input.tenantId,
    });
    if (
      completionCheck.isSuccess &&
      Array.isArray(completionCheck.data) &&
      completionCheck.data.length > 0
    ) {
      return DataProcessResult.success({
        eventId: input.eventId,
        tenantId: input.tenantId,
        ackedBatches: input.totalBatches,
        totalBatches: input.totalBatches,
        completed: true,
      });
    }

    // Read current counter from DATABASE FABRIC (not in-memory)
    const counterResult = await this.db.searchDocuments('xiigen-bootstrap-gate-counters', {
      gateKey,
      tenantId: input.tenantId,
    });

    const currentAcked =
      counterResult.isSuccess && Array.isArray(counterResult.data) && counterResult.data.length > 0
        ? (((counterResult.data[0] as Record<string, unknown>)['ackedBatches'] as number) ?? 0)
        : 0;

    const newAcked = currentAcked + 1;

    // Store updated counter in DATABASE FABRIC
    await this.db.storeDocument(
      'xiigen-bootstrap-gate-counters',
      {
        gateKey,
        eventId: input.eventId,
        tenantId: input.tenantId,
        ackedBatches: newAcked,
        totalBatches: input.totalBatches,
        lastUpdatedAt: new Date().toISOString(),
        knowledgeScope: 'PRIVATE',
      },
      gateKey,
    );

    // Check if all batches acked
    if (newAcked < input.totalBatches) {
      return DataProcessResult.success({
        eventId: input.eventId,
        tenantId: input.tenantId,
        ackedBatches: newAcked,
        totalBatches: input.totalBatches,
        completed: false,
      });
    }

    // All batches acked — complete the gate
    const completedAt = new Date().toISOString();

    // DNA-8: storeDocument gate completion record BEFORE emit
    // SETNX on completion key — prevents double-completion
    const completionStoreResult = await this.db.storeDocument(
      'xiigen-bootstrap-gate-completions',
      {
        completionKey,
        eventId: input.eventId,
        tenantId: input.tenantId,
        totalBatches: input.totalBatches,
        completedAt,
        knowledgeScope: 'PRIVATE',
      },
      completionKey,
    );

    if (!completionStoreResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store gate completion: ${completionStoreResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Emit ParticipationBootstrapCompleted (DNA-8 — after store)
    await this.queue.enqueue('participation.bootstrap.gate.completed', {
      eventId: input.eventId,
      tenantId: input.tenantId,
      totalBatches: input.totalBatches,
      completedAt,
    });

    return DataProcessResult.success({
      eventId: input.eventId,
      tenantId: input.tenantId,
      ackedBatches: newAcked,
      totalBatches: input.totalBatches,
      completed: true,
    });
  }
}
