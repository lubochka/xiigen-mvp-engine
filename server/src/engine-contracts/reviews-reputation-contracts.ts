export const REVIEWS_REPUTATION_TASK_TYPES = ['T169', 'T170', 'T171', 'T172'] as const;

/**
 * FLOW-10 Engine Contracts — Reviews + Reputation
 *
 * T-[+0]  ReviewSubmissionGateway       archetype: SUBMISSION_GATEWAY
 * T-[+1]  ReviewModerationEngine        archetype: MODERATION
 * T-[+2]  ReputationScoreAggregator     archetype: AGGREGATION
 * T-[+3]  ReviewResponseOrchestrator    archetype: ORCHESTRATION  ← STUB ONLY; blocked by P1-1_F10
 *
 * Task type IDs use placeholder strings until Wave 3 pre-allocation assigns confirmed IDs.
 * Replace __T_PLUS_N_CONFIRMED__ with the confirmed task type ID from the artifact registry.
 *
 * DNA-1: All toDict() produce Record<string, unknown> with snake_case keys.
 * DNA-3: validate() returns DataProcessResult.
 */

import { FabricType } from '../factories/fabric-type';
import { ContractArchetype } from './archetypes';
import { EngineContract } from './contract-schema';

// ── T-[+0] ReviewSubmissionGateway ────────────────────────────────────────────

export function createReviewSubmissionGatewayContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T169',
    flowId: 'FLOW-10',
    flowName: 'Reviews + Reputation',
    name: 'ReviewSubmissionGateway',
    archetype: ContractArchetype.SUBMISSION_GATEWAY,
    entry: 'Triggered by review.submission.received CloudEvent',
    purpose:
      'Accepts an inbound review submission. Verifies reviewer eligibility via cross-flow ' +
      'GET_ONLY read from FLOW-04/09 before writing any audit record. Emits ReviewSubmitted ' +
      'on success, ReviewRejected (ineligible) on failure.',
    distinctFrom:
      'T-[+1] ReviewModerationEngine (T-[+0] gates submission entry; T-[+1] evaluates content)',

    ironRules: [
      'IR-1: Eligibility check must complete before any audit record is written. ' +
        'No side effects on peer flows on the ineligible path.',
    ],

    executionOrder: {
      steps: [
        {
          order: 1,
          name: 'EligibilityCheck',
          description: 'GET_ONLY read from FLOW-04/09 to verify reviewer eligibility',
          ironRuleRef: 'IR-1',
        },
        {
          order: 2,
          name: 'AuditWrite',
          description: 'Write submission audit record — only reached if eligibility passes',
          ironRuleRef: 'IR-1',
        },
        {
          order: 3,
          name: 'EventEmit',
          description: 'Emit ReviewSubmitted CloudEvent',
        },
      ],
    },

    crossFlowReadDependencies: [
      {
        flowId: 'FLOW-04',
        dataType: 'purchase_attendance_record',
        accessPattern: 'GET_ONLY',
        trigger: 'on_submission_received',
        serviceInterface: 'IReviewEligibilityService',
        failureBehavior: 'REJECT_SUBMISSION',
        peerFlowMustBeActive: true,
      },
      {
        flowId: 'FLOW-09',
        dataType: 'reviewer_standing',
        accessPattern: 'GET_ONLY',
        trigger: 'on_submission_received',
        serviceInterface: 'IReviewEligibilityService',
        failureBehavior: 'REJECT_SUBMISSION',
        peerFlowMustBeActive: true,
      },
    ],

    factoryDependencies: [
      {
        factoryId: 'F_REVIEW_ELIGIBILITY',
        interfaceName: 'IReviewEligibilityService',
        fabricType: FabricType.DATABASE,
        description: 'Cross-flow GET_ONLY eligibility check from FLOW-04/09',
      },
      {
        factoryId: 'F_DATABASE',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Audit record persistence',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent emission for ReviewSubmitted / ReviewRejected',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-10-01',
        description: 'Eligibility check runs before audit write (IR-1)',
        severity: 'error',
        checkType: 'cross_flow_eligibility_before_audit',
      },
      {
        gateId: 'QG-10-02',
        description: 'Eligibility read is GET_ONLY — no side effects on peer flows',
        severity: 'error',
        checkType: 'cross_flow_eligibility_read_only',
      },
      {
        gateId: 'QG-10-03',
        description: 'Review text must not appear in logs (privacy)',
        severity: 'error',
        checkType: 'review_text_never_logged',
      },
    ],

    bfaRegistration: {
      entities: ['review_submission', 'review_audit'],
      events: ['review.submitted', 'review.rejected.ineligible'],
      apiRoutes: [],
    },

    machineComponents: [
      'Eligibility-before-audit order enforcement (IR-1)',
      'Cross-flow GET_ONLY read pattern',
      'Outbox: audit write before event emit (DNA-8)',
    ],

    freedomComponents: [
      'flow10_submission_max_retries — max eligibility check retries before rejection',
      'flow10_supported_entity_types — which entity types accept reviews',
    ],
  });
}

// ── T-[+1] ReviewModerationEngine ─────────────────────────────────────────────

export function createReviewModerationEngineContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T170',
    flowId: 'FLOW-10',
    flowName: 'Reviews + Reputation',
    name: 'ReviewModerationEngine',
    archetype: ContractArchetype.MODERATION,
    entry: 'Triggered by review.submitted CloudEvent',
    purpose:
      'Moderates a submitted review. Produces three outcomes: PASS (publish), REJECT ' +
      '(policy violation), UNCERTAIN (route to human queue). UNCERTAIN must never auto-reject.',
    distinctFrom:
      'T-[+0] ReviewSubmissionGateway (T-[+1] evaluates content; T-[+0] gates submission entry)',

    ironRules: [
      'IR-2: UNCERTAIN moderation outcome must route to PENDING_HUMAN_REVIEW state. ' +
        'Auto-rejection of UNCERTAIN reviews is prohibited.',
    ],

    uncertaintyBehavior: 'HUMAN_QUEUE',

    moderationPaths: [
      {
        outcome: 'PASS',
        emit: 'review.moderation.approved',
        terminal: false,
        note: 'Review is clean; proceed to publication',
      },
      {
        outcome: 'REJECT',
        emit: 'review.moderation.rejected',
        terminal: true,
        compensation: true,
        note: 'Policy violation confirmed; emit rejection and trigger compensation',
      },
      {
        outcome: 'UNCERTAIN',
        emit: 'review.flagged_for_human',
        terminal: false,
        humanQueue: true,
        note: 'AI confidence too low; route to human moderation queue',
      },
    ],

    factoryDependencies: [
      {
        factoryId: 'F_AI_PROVIDER',
        interfaceName: 'IAiProvider',
        fabricType: FabricType.AI_ENGINE,
        description: 'AI moderation verdict generation',
      },
      {
        factoryId: 'F_DATABASE',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Review record persistence',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'CloudEvent emission for moderation outcomes',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-10-10',
        description: 'UNCERTAIN routes to human queue, not auto-rejected (IR-2)',
        severity: 'error',
        checkType: 'uncertain_routes_to_human_not_rejected',
      },
      {
        gateId: 'QG-10-11',
        description: 'Review text must not appear in logs (privacy)',
        severity: 'error',
        checkType: 'review_text_never_logged',
      },
    ],

    bfaRegistration: {
      entities: ['moderation_decision', 'review_status'],
      events: [
        'review.moderation.approved',
        'review.moderation.rejected',
        'review.flagged_for_human',
      ],
      apiRoutes: [],
    },

    machineComponents: [
      'Three-path moderation routing (PASS/REJECT/UNCERTAIN)',
      'UNCERTAIN → PENDING_HUMAN_REVIEW state transition',
      'Outbox: status write before event emit (DNA-8)',
    ],

    freedomComponents: [
      'flow10_moderation_confidence_threshold — AI confidence below which UNCERTAIN is declared',
      'flow10_human_queue_name — name of the human moderation queue',
    ],
  });
}

// ── T-[+2] ReputationScoreAggregator ──────────────────────────────────────────

export function createReputationScoreAggregatorContract(): EngineContract {
  return new EngineContract({
    taskTypeId: 'T171',
    flowId: 'FLOW-10',
    flowName: 'Reviews + Reputation',
    name: 'ReputationScoreAggregator',
    archetype: ContractArchetype.AGGREGATION,
    entry: 'Triggered by review.published or review.retracted CloudEvent',
    purpose:
      'Maintains the running reputation score for a target entity. Handles both additive ' +
      '(ReviewPublished) and retractive (ReviewRetracted) events. Score is clamped to [1.0, 5.0]. ' +
      'Only PUBLISHED reviews contribute to the aggregate.',
    distinctFrom:
      'T-[+1] ReviewModerationEngine (T-[+2] aggregates scores; T-[+1] makes moderation decisions)',

    ironRules: [
      'IR-7: Only reviews with status PUBLISHED may contribute to the reputation score. ' +
        'PENDING, FLAGGED, and REJECTED reviews must be excluded from aggregation.',
      'IR-8: Reputation score must be clamped to [1.0, 5.0]. Normalized [0,1] scores are prohibited.',
    ],

    aggregation: {
      addEvents: ['review.published'],
      removeEvents: ['review.retracted'],
      recalculateOnRemove: true,
      filterCondition: "status === 'PUBLISHED'",
      scoreRange: [1.0, 5.0],
    },

    factoryDependencies: [
      {
        factoryId: 'F_DATABASE',
        interfaceName: 'IDatabaseService',
        fabricType: FabricType.DATABASE,
        description: 'Aggregate document persistence and review fetch',
      },
      {
        factoryId: 'F_QUEUE',
        interfaceName: 'IQueueService',
        fabricType: FabricType.QUEUE,
        description: 'reputation.score.updated CloudEvent emission',
      },
    ],

    afStations: [
      { stationId: 'AF-1', role: 'generate', config: {} },
      { stationId: 'AF-4', role: 'review', config: {} },
      { stationId: 'AF-9', role: 'judge', config: { enforceQualityGates: true } },
    ],

    qualityGates: [
      {
        gateId: 'QG-10-20',
        description: 'Score clamped to [1.0, 5.0] — not normalized to [0,1] (IR-8)',
        severity: 'error',
        checkType: 'reputation_score_clamped_1_to_5',
      },
      {
        gateId: 'QG-10-21',
        description: 'Retracted reviews excluded from aggregate (IR-7)',
        severity: 'error',
        checkType: 'retracted_review_excluded_from_aggregate',
      },
      {
        gateId: 'QG-10-22',
        description: 'Only PUBLISHED reviews contribute to aggregate (IR-7)',
        severity: 'error',
        checkType: 'only_published_reviews_in_aggregate',
      },
    ],

    bfaRegistration: {
      entities: ['reputation_score', 'review_aggregate'],
      events: ['reputation.score.updated'],
      apiRoutes: [],
    },

    machineComponents: [
      'Add/remove event dual-path aggregation',
      'filterCondition: only PUBLISHED reviews',
      'Score clamping to scoreRange [1.0, 5.0]',
      'recalculateOnRemove: full recompute on retraction',
      'Outbox: aggregate write before event emit (DNA-8)',
    ],

    freedomComponents: [
      'flow10_score_range_min — minimum reputation score (default: 1.0)',
      'flow10_score_range_max — maximum reputation score (default: 5.0)',
    ],
  });
}

// ── T-[+3] ReviewResponseOrchestrator — STUB ONLY ─────────────────────────────
// Full contract blocked by P1-1_F10 product decision (revision_strategy not confirmed).
// Do not register this in ENGINE_CONTRACTS until P1-1_F10 is resolved (see R22).

export const ReviewResponseOrchestratorContractSTUB: Partial<{
  taskTypeId: string;
  name: string;
  flowId: string;
  version: string;
  archetype: string;
  description: string;
}> = {
  taskTypeId: 'T172',
  name: 'ReviewResponseOrchestrator',
  flowId: 'FLOW-10',
  version: 'v0.0.0-stub',
  archetype: ContractArchetype.ORCHESTRATION,
  description:
    'STUB — awaiting P1-1_F10 product decision on revision_strategy before contract is finalized.',
};
