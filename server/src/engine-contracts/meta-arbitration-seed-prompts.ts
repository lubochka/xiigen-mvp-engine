/**
 * FLOW-35 Genesis Seed Prompts — Meta-Arbitration Engine.
 * T565–T566 — 2 prompts, all FLOW_SCOPED.
 *
 * Critical iron rules encoded in prompts:
 *   - CF-789: spend limit from FREEDOM config (never hardcoded)
 *   - CF-790: security circuit breaker fires before downstream
 *   - CF-791: all 5 meta-arbiters evaluated (no short-circuit)
 *   - CF-792: decision log append-only (never update/delete)
 *   - CF-793: HALT/ESCALATE always produce EscalationBriefing
 *   - D-VIS-4: flow lifecycle status updated at Phase A and Phase E
 */

export interface MetaArbitrationGenesisPrompt {
  taskType: string;
  promptText: string;
  connection_type: 'FLOW_SCOPED';
  flow_id: 'FLOW-35';
  version: string;
}

// Backward-compat alias for any code that references the old name
export type Flow35GenesisPrompt = MetaArbitrationGenesisPrompt;

const BASE = {
  connection_type: 'FLOW_SCOPED' as const,
  flow_id: 'FLOW-35' as const,
  version: '1.0.0',
};

export const GENERATION_LOOP_SEED_PROMPTS: MetaArbitrationGenesisPrompt[] = [
  {
    ...BASE,
    taskType: 'T565',
    promptText:
      'Generate a NestJS RoundSummaryProcessor service (T565) that listens for ArbitersComplete events and assembles a structured RoundSummary. Collect ALL arbiter scores for the current generation round from IDatabaseService via DATABASE FABRIC. Enrich summary with cost_usd, token counts, model metadata, round number, and sessionId. CRITICAL: storeDocument() to the decision_log index MUST happen BEFORE emitting RoundSummaryReady event (DNA-8 outbox pattern). Decision log is append-only — NEVER update or delete existing entries (CF-792 decision-log-immutable). Use IMetaArbiterRegistryService (F1484) via DATABASE FABRIC to validate all expected meta-arbiter slots are registered. Use IDecisionLogService (F1489) via DATABASE FABRIC for append-only writes. Extend MicroserviceBase. Return DataProcessResult<RoundSummary> with arbiterId, score, verdict, cost_usd fields.',
  },
  {
    ...BASE,
    taskType: 'T566',
    promptText:
      'Generate a NestJS MetaDecisionEngine service (T566) that applies 5 meta-arbiter policies to a RoundSummary and produces a final RoundDecision. Apply ALL 5 policies in order — NEVER short-circuit on first failure (CF-791 meta-arbiters-skipped): (1) SpendGovernor (F1485): read spend_limit from FREEDOM config key "flow35_spend_limit_per_session_usd" — NEVER hardcode (CF-789); (2) SecurityCircuitBreaker (F1486): pattern match for credential leaks, forbidden imports, hardcoded secrets — HALT immediately if triggered (CF-790); (3) ImprovementDetector (F1487): detect IMPROVING/PLATEAUED/REGRESSING trend; (4) ModelFitness (F1488): check per-model fitness score vs FREEDOM threshold; (5) RoundController: combine verdicts → CONTINUE | ESCALATE | HALT | ACCEPT. CRITICAL: HALT or ESCALATE decision MUST produce EscalationBriefing with options A/B/C via IEscalationBriefingService (F1490) — never emit halt/escalate without briefing (CF-793). Update flow-lifecycle status via IFlowLifecycleService (F1491): GENERATED on Phase A DRY_RUN pass, ACTIVE on Phase E promotion (D-VIS-4). storeDocument() BEFORE emitting round.decision.made event (DNA-8). Export DPO triple on ACCEPT decision. Extend MicroserviceBase. Return DataProcessResult<RoundDecision>.',
  },
];
