// file: server/src/guardrails/bfa/two-actor-arbiter.interface.ts
// Two-Actor BFA Arbiter Pattern — buyer action → seller constraint.
// Introduced in FLOW-16. Reusable for FLOW-17+.

import { DataProcessResult } from '../../kernel/data-process-result';

export type ActorRole = 'BUYER' | 'SELLER' | 'PLATFORM' | 'ADMIN';

export interface TwoActorContext {
  /**
   * The actor whose action triggered this rule.
   */
  triggeringActor: {
    role: ActorRole;
    id: string;
  };
  /**
   * The actor who is affected by the constraint.
   */
  constrainedActor: {
    role: ActorRole;
    id: string;
  };
  /**
   * The event that triggered this rule evaluation.
   */
  triggeringEvent: {
    type: string;
    payload: Record<string, unknown>;
    correlationId: string;
  };
  tenantId: string;
  flowId: string;
}

export interface TwoActorRuleResult {
  cfRule: string;
  triggeringActor: ActorRole;
  constrainedActor: ActorRole;
  constraintApplied: string;
  synchronous: boolean;
  appliedAt: string;
}

/**
 * TwoActorArbiterRule — base interface for buyer-action → seller-constraint patterns.
 *
 * REUSE GUIDANCE (FLOW-17+):
 *   1. Extend this interface for new two-actor rules.
 *   2. If synchronous:true, the constraint MUST be applied in the same handler invocation.
 *      Do not defer to a queue event.
 *   3. If synchronous:false, emit a CloudEvent for async constraint application.
 *   4. Register the rule in BfaArbiterRuleRegistry with two-actor:true metadata.
 *
 * EXAMPLES IN FLOW-16:
 *   CF-262: buyer dispute → seller payout freeze (synchronous)
 *   CF-265: payout held → seller notification (synchronous)
 */
export interface TwoActorArbiterRule {
  cfRule: string;
  triggeringEventType: string;
  triggeringActorRole: ActorRole;
  constrainedActorRole: ActorRole;
  /**
   * True: constraint MUST be applied in the same synchronous handler execution.
   * False: constraint may be applied asynchronously via event.
   */
  synchronous: boolean;
  description: string;

  /**
   * Evaluate whether this rule applies to the given context.
   * Returns true if the context matches this rule's trigger conditions.
   */
  applies(ctx: TwoActorContext): boolean;

  /**
   * Apply the constraint to the constrained actor.
   * If synchronous:true, this runs in the same handler as the triggering event.
   */
  applyConstraint(ctx: TwoActorContext): Promise<DataProcessResult<TwoActorRuleResult>>;
}
