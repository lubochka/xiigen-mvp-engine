// T67 ParticipationInviter [ORCHESTRATION] + SUBFLOW-08-RATE
//
// Bootstraps event participation by batching invitation dispatch.
// Iron rules:
//   audienceSize=0 is VALID bootstrap — emit immediately with 0 batches
//   Batch fanout: N/batchSize queue messages (not N individual)
//   storeDocument BEFORE InvitationBatchQueued emit (DNA-8)
//   Rate key: participation-invite:{tenantId}:{eventId} (PER-TENANT-COUNTER-001)
//   ParticipationBootstrapCompleted gates on batch queuing only (not T68/T69/T70)
//   FREEDOM: flow08_invitation_batch_size (default 100), flow08_invite_rate_limit_window_minutes
//   knowledgeScope: 'PRIVATE'
//
// Factories:
//   F234: IDatabaseService — invitation bootstrap records
//   F236: IQueueService — InvitationBatchQueued CloudEvent
//   RATE: IRateLimitService — key = tenantId+eventId
//   FREEDOM: batch size config

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IRateLimitService {
  check(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
  increment(params: Record<string, unknown>): Promise<void>;
}

interface IFreedomConfigService {
  getConfig(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface ParticipationInviterInput {
  eventId: string;
  tenantId: string;
  audienceSize: number;
  eventName?: string;
}

export interface ParticipationInviterResult {
  eventId: string;
  batchCount: number;
  audienceSize: number;
  status: 'QUEUED' | 'RATE_LIMITED';
}

export class ParticipationInviterService {
  constructor(
    /** F234: IDatabaseService — invitation bootstrap records */
    private readonly db: IDatabaseService,
    /** F236: IQueueService — InvitationBatchQueued CloudEvent */
    private readonly queue: IQueueService,
    /** RATE: IRateLimitService — key = tenantId+eventId */
    private readonly rateLimit: IRateLimitService,
    /** FREEDOM config service */
    private readonly freedomConfigService: IFreedomConfigService,
  ) {}

  async inviteParticipants(
    input: ParticipationInviterInput,
  ): Promise<DataProcessResult<ParticipationInviterResult>> {
    // Rate limit check — key = participation-invite:{tenantId}:{eventId}
    const rateLimitKey = `participation-invite:${input.tenantId}:${input.eventId}`;
    const rateLimitResult = await this.rateLimit.check({
      key: rateLimitKey,
      tenantId: input.tenantId,
    });
    if (rateLimitResult.isSuccess && rateLimitResult.data?.['allowed'] === false) {
      return DataProcessResult.success({
        eventId: input.eventId,
        batchCount: 0,
        audienceSize: input.audienceSize,
        status: 'RATE_LIMITED',
      });
    }

    // Read FREEDOM config for batch size
    const batchConfigResult = await this.freedomConfigService.getConfig({
      key: 'flow08_invitation_batch_size',
      tenantId: input.tenantId,
    });
    const batchSize =
      batchConfigResult.isSuccess &&
      typeof batchConfigResult.data?.['flow08_invitation_batch_size'] === 'number'
        ? batchConfigResult.data['flow08_invitation_batch_size']
        : 100;

    // Batch fanout: ceil(audienceSize / batchSize) queue messages
    // audienceSize=0 is VALID — 0 batches, emit immediately
    const batchCount = input.audienceSize === 0 ? 0 : Math.ceil(input.audienceSize / batchSize);
    const queuedAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE InvitationBatchQueued emit
    const storeResult = await this.db.storeDocument(
      'xiigen-participation-bootstrap',
      {
        eventId: input.eventId,
        tenantId: input.tenantId,
        audienceSize: input.audienceSize,
        batchCount,
        batchSize,
        status: 'QUEUED',
        queuedAt,
        knowledgeScope: 'PRIVATE',
      },
      `bootstrap-${input.eventId}-${input.tenantId}`,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store bootstrap: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Enqueue N batch messages (after store — DNA-8)
    // Gates on broker ACK — not on delivery confirmation
    for (let i = 0; i < batchCount; i++) {
      await this.queue.enqueue('participation.invitation.batch.queued', {
        eventId: input.eventId,
        tenantId: input.tenantId,
        batchIndex: i,
        batchSize,
        audienceSize: input.audienceSize,
        queuedAt,
      });
    }

    // Also enqueue bootstrap completion (gates on batch queuing — time-decoupled from T68/T69/T70)
    await this.queue.enqueue('participation.bootstrap.completed', {
      eventId: input.eventId,
      tenantId: input.tenantId,
      batchCount,
      audienceSize: input.audienceSize,
      queuedAt,
    });

    // Increment rate limit after success
    await this.rateLimit.increment({ key: rateLimitKey, tenantId: input.tenantId });

    return DataProcessResult.success({
      eventId: input.eventId,
      batchCount,
      audienceSize: input.audienceSize,
      status: 'QUEUED',
    });
  }
}
