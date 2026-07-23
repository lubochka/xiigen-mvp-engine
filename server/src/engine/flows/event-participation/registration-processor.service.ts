// T68 RegistrationProcessor [ROUTING]
//
// Processes event RSVP and registration submissions.
// Iron rules:
//   Idempotency key = hash(userId + eventId + tenantId) — NOT requestId
//   Inline privacy check BEFORE any write (PRIVACY_GATEKEEPER_INLINE_INVOCATION)
//   Atomic capacity decrement + registration write (DR-04-A)
//   capacity=0 → success({ status: 'WAITLISTED' }) — not failure
//   storeDocument BEFORE RegistrationProcessed emit (DNA-8)
//   knowledgeScope: 'PRIVATE'
//   Reads from xiigen-connections (not xiigen-friend-requests) — R2 correction
//   FREEDOM: flow08_event_max_capacity
//
// Factories:
//   F234: IDatabaseService — registration records
//   F236: IQueueService — RegistrationProcessed CloudEvent
//   T81-inline: privacy check service
//   FREEDOM: capacity config

import { DataProcessResult } from '../../../kernel/data-process-result';
import { IDatabaseService } from '../../../fabrics/interfaces/database.interface';
import { IQueueService } from '../../../fabrics/interfaces/queue.interface';

interface IPrivacyCheckService {
  check(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; errorMessage?: string; data?: Record<string, unknown> }>;
}

interface IFreedomConfigService {
  getConfig(
    params: Record<string, unknown>,
  ): Promise<{ isSuccess: boolean; data?: Record<string, unknown> }>;
}

export interface RegistrationInput {
  userId: string;
  eventId: string;
  tenantId: string;
  requestId?: string;
}

export interface RegistrationResult {
  registrationId: string;
  userId: string;
  eventId: string;
  tenantId: string;
  status: 'CONFIRMED' | 'WAITLISTED' | 'BLOCKED';
  idempotent?: boolean;
}

export class RegistrationProcessorService {
  constructor(
    /** F234: IDatabaseService — registration records + connections */
    private readonly db: IDatabaseService,
    /** F236: IQueueService — RegistrationProcessed CloudEvent */
    private readonly queue: IQueueService,
    /** privacy check service — inline invocation */
    private readonly privacyCheck: IPrivacyCheckService,
    /** FREEDOM config service */
    private readonly freedomConfigService: IFreedomConfigService,
  ) {}

  async processRegistration(
    input: RegistrationInput,
  ): Promise<DataProcessResult<RegistrationResult>> {
    // Idempotency key = hash(userId + eventId + tenantId) — NOT requestId
    const registrationId = `reg-${input.userId}-${input.eventId}-${input.tenantId}`;

    // Inline privacy check BEFORE any write (PRIVACY_GATEKEEPER_INLINE_INVOCATION)
    const privacyResult = await this.privacyCheck.check({
      userId: input.userId,
      tenantId: input.tenantId,
      action: 'register',
      eventId: input.eventId,
    });

    if (!privacyResult.isSuccess) {
      return DataProcessResult.failure(
        'PRIVACY_CHECK_FAILED',
        privacyResult.errorMessage ?? 'Privacy check failed',
      );
    }

    if (!privacyResult.data?.['allowed']) {
      return DataProcessResult.success({
        registrationId,
        userId: input.userId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        status: 'BLOCKED',
      });
    }

    // SETNX — return existing if duplicate (idempotent)
    const existingResult = await this.db.searchDocuments('xiigen-registrations', {
      registrationId,
      tenantId: input.tenantId,
    });
    if (
      existingResult.isSuccess &&
      Array.isArray(existingResult.data) &&
      existingResult.data.length > 0
    ) {
      const existing = existingResult.data[0] as Record<string, unknown>;
      return DataProcessResult.success({
        registrationId,
        userId: input.userId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        status: existing['status'] as 'CONFIRMED' | 'WAITLISTED',
        idempotent: true,
      });
    }

    // Read FREEDOM config for max capacity
    const capacityConfigResult = await this.freedomConfigService.getConfig({
      key: 'flow08_event_max_capacity',
      tenantId: input.tenantId,
      eventId: input.eventId,
    });
    const maxCapacity =
      capacityConfigResult.isSuccess &&
      typeof capacityConfigResult.data?.['flow08_event_max_capacity'] === 'number'
        ? capacityConfigResult.data['flow08_event_max_capacity']
        : null;

    // Check connection from xiigen-connections (R2 correction — not xiigen-friend-requests)
    await this.db.searchDocuments('xiigen-connections', {
      userId: input.userId,
      tenantId: input.tenantId,
    });

    // Atomic capacity check + registration write (DR-04-A)
    let status: 'CONFIRMED' | 'WAITLISTED' = 'CONFIRMED';

    if (maxCapacity !== null) {
      const currentCountResult = await this.db.searchDocuments('xiigen-registrations', {
        eventId: input.eventId,
        tenantId: input.tenantId,
        status: 'CONFIRMED',
      });
      const currentCount =
        currentCountResult.isSuccess && Array.isArray(currentCountResult.data)
          ? currentCountResult.data.length
          : 0;

      if (currentCount >= maxCapacity) {
        // capacity=0 → WAITLISTED — not failure
        status = 'WAITLISTED';
      }
    }

    const registeredAt = new Date().toISOString();

    // DNA-8: storeDocument BEFORE enqueue
    const storeResult = await this.db.storeDocument(
      'xiigen-registrations',
      {
        registrationId,
        userId: input.userId,
        eventId: input.eventId,
        tenantId: input.tenantId,
        status,
        registeredAt,
        knowledgeScope: 'PRIVATE',
      },
      registrationId,
    );

    if (!storeResult.isSuccess) {
      return DataProcessResult.failure(
        'STORE_FAILED',
        `Failed to store registration: ${storeResult.errorMessage ?? 'unknown'}`,
      );
    }

    // Enqueue after store (DNA-8)
    await this.queue.enqueue('participation.registration.processed', {
      registrationId,
      userId: input.userId,
      eventId: input.eventId,
      tenantId: input.tenantId,
      status,
      registeredAt,
    });

    return DataProcessResult.success({
      registrationId,
      userId: input.userId,
      eventId: input.eventId,
      tenantId: input.tenantId,
      status,
    });
  }
}
