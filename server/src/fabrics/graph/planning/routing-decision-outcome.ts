/**
 * RoutingDecisionOutcome — types for tracking cycle routing decisions.
 *
 * Carried on FlowExecutionContext — accumulated during AF-7/AF-9 cycles.
 * CYCLE_ROUTER pushes during execution; RetrospectiveService fills Phase F fields.
 */

import { CycleAction } from './planning-abstracts';

export type RoutingOutcomeClass =
  | 'SUCCESS_WITHIN_BUDGET' // flow reached ACCEPT at or before budget → outcomeWasPositive: true
  | 'WASTED_CYCLE' // cycle ran but score delta < 0.05 → outcomeWasPositive: false
  | 'ESCALATION_REQUIRED'; // budget exhausted without ACCEPT → outcomeWasPositive: false

export interface RoutingDecisionOutcome {
  decisionId: string; // links to the ROUTING_DECISION DPO triple stored by AI pipeline
  archetype: string;
  scoreAtDecision: number;
  actionTaken: CycleAction;
  cyclesUsed: number;
  cycleBudget: number;
  // Populated at Phase F by RetrospectiveService:
  finalScore?: number;
  totalCyclesUsed?: number;
  outcome?: RoutingOutcomeClass;
}

/** Carried on FlowExecutionContext — accumulated during AF-7/AF-9 cycles. */
export interface FlowDecisionOutcomeStore {
  flowId: string;
  outcomes: RoutingDecisionOutcome[];
}

/**
 * Classification logic used by RetrospectiveService at Phase F.
 * Determines whether a routing decision was successful, wasted, or required escalation.
 */
export function classifyRoutingOutcome(
  finalScore: number,
  totalCyclesUsed: number,
  cycleBudget: number,
  scoreAtDecision: number,
): RoutingOutcomeClass {
  if (finalScore >= 0.85 && totalCyclesUsed <= cycleBudget) {
    return 'SUCCESS_WITHIN_BUDGET';
  }
  if (totalCyclesUsed > cycleBudget) {
    return 'ESCALATION_REQUIRED';
  }
  // Score didn't improve meaningfully
  const delta = finalScore - scoreAtDecision;
  return delta < 0.05 ? 'WASTED_CYCLE' : 'SUCCESS_WITHIN_BUDGET';
}
