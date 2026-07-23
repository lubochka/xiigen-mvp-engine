// file: server/src/guardrails/bfa/rules/cf-265.rule.ts
// CF-265: Payout held → seller notification (synchronous).

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  TwoActorArbiterRule,
  TwoActorContext,
  TwoActorRuleResult,
  ActorRole,
} from '../two-actor-arbiter.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import { QUEUE_SERVICE, IQueueService } from '../../../fabrics/interfaces/queue.interface';
import { createCloudEvent } from '../../../kernel/cloud-events';

/**
 * CF-265: When a seller payout is held (payout.seller.held), the seller notification
 * (PayoutHoldNotified) MUST fire SYNCHRONOUSLY in the same handler.
 *
 * SYNCHRONOUS REQUIREMENT:
 *   There must be NO async gap between PayoutHeld and PayoutHoldNotified.
 *   Both actions must execute within the same handler invocation.
 *
 *   Rationale: Seller must be informed immediately when their payout is held.
 *   A delayed notification creates a window where the seller may act on funds
 *   they believe are available but are actually frozen.
 *
 * NOTE: The notification is enqueued via the queue fabric. The enqueue itself
 * is synchronous in the handler (outbox write); delivery is async via worker.
 */
@Injectable()
export class Cf265PayoutHoldNotificationRule implements TwoActorArbiterRule {
  private readonly logger = new Logger(Cf265PayoutHoldNotificationRule.name);

  readonly cfRule = 'CF-265';
  readonly triggeringEventType = 'payout.seller.held';
  readonly triggeringActorRole: ActorRole = 'PLATFORM';
  readonly constrainedActorRole: ActorRole = 'SELLER';
  readonly synchronous = true;
  readonly description =
    'When payout is held, seller notification (PayoutHoldNotified) fires synchronously in same handler.';

  constructor(@Inject(QUEUE_SERVICE) private readonly queue: IQueueService) {}

  applies(ctx: TwoActorContext): boolean {
    return (
      ctx.triggeringEvent.type === 'payout.seller.held' && ctx.constrainedActor.role === 'SELLER'
    );
  }

  async applyConstraint(ctx: TwoActorContext): Promise<DataProcessResult<TwoActorRuleResult>> {
    if (!this.applies(ctx)) {
      return DataProcessResult.failure(
        'CF265_NOT_APPLICABLE',
        'Rule CF-265 does not apply to this context',
      );
    }

    const payoutId = ctx.triggeringEvent.payload['payoutId'] as string;
    const holdReason = ctx.triggeringEvent.payload['holdReason'] as string;
    const sellerId = ctx.constrainedActor.id;
    const notifiedAt = new Date().toISOString();

    // PayoutHoldNotified fires synchronously — same handler execution
    const notificationEvent = createCloudEvent({
      eventType: 'payout.seller.hold.notified',
      tenantId: ctx.tenantId,
      source: `flow-16/t225`,
      data: {
        payoutId, // reference only — no amount
        sellerId,
        holdReason,
        notifiedAt,
        correlationId: ctx.triggeringEvent.correlationId,
      },
    });

    await this.queue.enqueue('payout.seller.hold.notified', notificationEvent);

    this.logger.log(
      `CF-265: PayoutHoldNotified enqueued synchronously for seller ${sellerId}, payout ${payoutId}`,
    );

    return DataProcessResult.success({
      cfRule: this.cfRule,
      triggeringActor: this.triggeringActorRole,
      constrainedActor: this.constrainedActorRole,
      constraintApplied: `PayoutHoldNotified published for payoutId=${payoutId}`,
      synchronous: true,
      appliedAt: notifiedAt,
    });
  }
}
