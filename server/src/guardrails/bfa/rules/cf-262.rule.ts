// file: server/src/guardrails/bfa/rules/cf-262.rule.ts
// CF-262: Buyer dispute → seller payout freeze (synchronous).

import { Injectable, Inject, Logger } from '@nestjs/common';
import {
  TwoActorArbiterRule,
  TwoActorContext,
  TwoActorRuleResult,
  ActorRole,
} from '../two-actor-arbiter.interface';
import { DataProcessResult } from '../../../kernel/data-process-result';
import {
  PLATFORM_PAYOUT_SERVICE,
  IPayoutReleaseService,
} from '../../../factories/platform/payout-release-service.interface';

/**
 * CF-262: Buyer dispute initiation MUST synchronously freeze all pending seller payouts.
 *
 * SYNCHRONOUS REQUIREMENT:
 *   When the buyer initiates a dispute (event: dispute.buyer.initiated), the seller's
 *   pending payouts MUST be frozen in the SAME handler invocation. This cannot be
 *   deferred to an async event — the freeze must be atomic with the dispute creation.
 *
 *   Rationale: If payout is released after dispute is filed but before freeze is applied,
 *   the platform loses recourse for buyer refund. Synchronous enforcement prevents this race.
 */
@Injectable()
export class Cf262DisputePayoutFreezeRule implements TwoActorArbiterRule {
  private readonly logger = new Logger(Cf262DisputePayoutFreezeRule.name);

  readonly cfRule = 'CF-262';
  readonly triggeringEventType = 'dispute.buyer.initiated';
  readonly triggeringActorRole: ActorRole = 'BUYER';
  readonly constrainedActorRole: ActorRole = 'SELLER';
  readonly synchronous = true;
  readonly description =
    'Buyer dispute initiation synchronously freezes all pending seller payouts.';

  constructor(
    @Inject(PLATFORM_PAYOUT_SERVICE)
    private readonly payoutService: IPayoutReleaseService,
  ) {}

  applies(ctx: TwoActorContext): boolean {
    return (
      ctx.triggeringEvent.type === this.triggeringEventType &&
      ctx.triggeringActor.role === 'BUYER' &&
      ctx.constrainedActor.role === 'SELLER'
    );
  }

  async applyConstraint(ctx: TwoActorContext): Promise<DataProcessResult<TwoActorRuleResult>> {
    if (!this.applies(ctx)) {
      return DataProcessResult.failure(
        'CF262_NOT_APPLICABLE',
        'Rule CF-262 does not apply to this context',
      );
    }

    const disputeRef = ctx.triggeringEvent.payload['disputeId'] as string;
    const sellerId = ctx.constrainedActor.id;

    this.logger.log(`CF-262: Freezing payouts for seller ${sellerId} due to dispute ${disputeRef}`);

    const freezeResult = await this.payoutService.freezeSellerPayouts({
      sellerId,
      reason: `Dispute initiated by buyer — dispute ref: ${disputeRef}`,
      disputeRef,
      frozenBy: 'DISPUTE',
    });

    if (!freezeResult.frozenPayoutIds) {
      return DataProcessResult.failure(
        'CF262_FREEZE_FAILED',
        `Failed to freeze payouts for seller ${sellerId}`,
      );
    }

    this.logger.log(
      `CF-262: Frozen ${freezeResult.frozenPayoutIds.length} payouts for seller ${sellerId}`,
    );

    return DataProcessResult.success({
      cfRule: this.cfRule,
      triggeringActor: this.triggeringActorRole,
      constrainedActor: this.constrainedActorRole,
      constraintApplied: `Froze ${freezeResult.frozenPayoutIds.length} payouts`,
      synchronous: true,
      appliedAt: freezeResult.frozenAt,
    });
  }
}
