/**
 * validate.handler — Node handler for code validation.
 *
 * Loads named checks from xiigen-arbiters and runs them against
 * generated code. Evaluates ironRulesStructured when present,
 * falls back to ironRules string[] pattern matching.
 *
 * DNA-3: returns DataProcessResult, never throws
 * GAP-01: xiigen-arbiters index + NAMED_CHECKS registry
 *
 * Z-3.1: CheckFn replaced by CheckDefinition (provider-keyed variants).
 *         selectCheckVariant() dispatches to the correct variant based on
 *         ctx.resolvedProviders — NOT on a stack label. Never reads
 *         stackCoupling by stack-label key (no 'node-nestjs' hardcoding).
 */
import { Injectable, Inject, Logger } from '@nestjs/common';
import { IDatabaseService, DATABASE_SERVICE } from '../../fabrics/interfaces/database.interface';
import { DataProcessResult } from '../../kernel/data-process-result';
import { INodeHandler, NodeHandlerContext, NodeHandlerResult } from './node-handler.types';
import { TaskTypeStackCoupling, PRIORITY_SERVER_KEY } from '../../engine-contracts/stack-coupling';
import { NAMED_CHECK_CONVERGENCE_THRESHOLD } from '../../engine-contracts/profile-enrichment-matching-contracts';
import { ES_INDEX } from '../../kernel/es-index-constants';
import { NamedCheckRegistry } from './named-check.registry';

/** Result of a single named check. */
export interface CheckResult {
  checkId: string;
  passed: boolean;
  message?: string;
}

/**
 * A check variant — either a RegExp tested against generated code,
 * or a function for complex positional / contextual checks.
 */
export type CheckVariant = RegExp | ((code: string, taskTypeId: string) => boolean);

/**
 * Provider-keyed check definition (Z-3.1).
 *
 * `default` is used when no resolved provider has a specific variant.
 * Additional keys (e.g. 'action-scheduler', 'hangfire', 'bull') are
 * provider IDs that appear in ctx.resolvedProviders values.
 *
 * The index signature allows arbitrary provider keys alongside named
 * fields — all values must be CheckVariant (RegExp | fn) or string
 * (for the `message` field).
 */
export interface CheckDefinition {
  default: CheckVariant;
  message: string;
  [providerKey: string]: CheckVariant | string;
}

/**
 * Built-in named checks registry (Z-3.1 — provider-keyed CheckDefinition).
 *
 * Each check has:
 *   default — concept-neutral pattern (works for NestJS/Bull baseline)
 *   message — human-readable failure message
 *   <providerKey> — provider-specific variant (e.g. 'action-scheduler' for WP)
 *
 * Checks keyed by WHAT ACTUALLY RAN (resolved provider id), not by stack label.
 */
export const NAMED_CHECKS: Record<string, CheckDefinition> = {
  // ── Scheduling / throttle ──────────────────────────────────────────────────

  throttle_decorator_present: {
    default: /Throttle\s*\(|@Throttle/,
    'action-scheduler': /wp_schedule_event|as_schedule_single_action|add_action\s*\(/i,
    hangfire: /DisableConcurrentExecution|EnabledByDefault|AutoRetry|BackgroundJob/i,
    message: 'Throttle/rate-limit decoration must be present — mechanism varies by provider',
  },

  delayed_job_scheduled: {
    default: /schedule|delayed|BullMQ|addJob|scheduleDelayed/i,
    'action-scheduler': /as_schedule_single_action|wp_schedule_single_event/i,
    hangfire: /BackgroundJob\.Schedule|RecurringJob\.AddOrUpdate/i,
    message: 'Delayed job must be scheduled via ISchedulerService — no inline setTimeout/sleep',
  },

  // ── Idempotency ────────────────────────────────────────────────────────────

  setnx_before_operation: {
    default: /setnx|SETNX|setNx|setIfAbsent|idempotency/i,
    'action-scheduler': /INSERT IGNORE|ON DUPLICATE KEY UPDATE|\$wpdb.*query.*INSERT/i,
    hangfire: /IDistributedCache|GetSetAsync|compare.*exchange/i,
    message: 'IR-2: Atomic set-if-not-exists check before any write — mechanism varies by provider',
  },

  // ── Event / queue ordering ─────────────────────────────────────────────────

  completedSteps_guard_before_emit: {
    default: (code) => /completedSteps/.test(code) && /emit|enqueue/.test(code),
    message: 'completedSteps guard must appear before any emit/enqueue call',
  },

  store_before_enqueue: {
    default: (code) => {
      const storeIdx = code.search(/storeDocument/);
      const enqueueIdx = code.search(/enqueue|emit/);
      if (storeIdx === -1 || enqueueIdx === -1) return true;
      return storeIdx < enqueueIdx;
    },
    'action-scheduler': (code) => {
      // WordPress: $wpdb->insert before as_schedule_single_action
      const insertIdx = code.search(/\$wpdb.*insert|\$wpdb.*query.*INSERT/i);
      const scheduleIdx = code.search(/as_schedule_single_action|wp_schedule_event/i);
      if (insertIdx === -1 || scheduleIdx === -1) return true;
      return insertIdx < scheduleIdx;
    },
    message: 'DNA-8: storeDocument() MUST come before enqueue/emit — outbox pattern enforced',
  },

  event_listener_order: {
    // @EventPattern is NestJS — other runtimes use add_action / Subscribe / EventHandler
    default: /^(?![\s\S]*@EventPattern[\s\S]*@EventPattern)[\s\S]*$/,
    'action-scheduler': /^(?![\s\S]*add_action[\s\S]*add_action[\s\S]*same[\s\S]*)[\s\S]*$/,
    message: 'Duplicate event listener registration for same event — only one listener per event',
  },

  // ── Security / PII ─────────────────────────────────────────────────────────

  property_type_scan: {
    default: (code) => !/(email|phone|ssn|password|secret)\s*:\s*string/.test(code),
    message: 'PII field typed as plain string — use encrypted type or remove from generated code',
  },

  // ── Error handling ─────────────────────────────────────────────────────────

  try_catch_around_f178_call: {
    default: (code) =>
      /try\s*\{[\s\S]*?f178|F178[\s\S]*?catch/.test(code) ||
      (/try\s*\{/.test(code) && /catch/.test(code)),
    message: 'F178 call must be wrapped in try/catch — F178 can throw',
  },

  // ── Config vs hardcode ─────────────────────────────────────────────────────

  config_over_hardcode: {
    default: (code) =>
      !(
        /const\s+\w+\s*=\s*\d{2,}/.test(code) &&
        !/config\.get|configService|get_option|getenv/i.test(code)
      ),
    'action-scheduler': (code) =>
      !(/\$\w+\s*=\s*\d{2,}/.test(code) && !/get_option|apply_filters|FREEDOM/i.test(code)),
    message:
      'IR-3/6: Threshold/limit/TTL values must come from FREEDOM config — not hardcoded constants',
  },

  // ── Tenant isolation ───────────────────────────────────────────────────────

  tenant_id_on_writes: {
    default: (code) => !(/storeDocument/.test(code) && !/tenantId/.test(code)),
    'action-scheduler': (code) =>
      !(/\$wpdb.*insert|\$wpdb.*query/i.test(code) && !/tenant_id|scope_id/i.test(code)),
    message: 'DNA-5: All writes must include tenantId/tenant_id — cross-tenant data leak',
  },

  // ── FLOW-02: Profile Enrichment & Matching ─────────────────────────────────

  convergence_threshold_from_freedom_config: {
    default: (code: string) => NAMED_CHECK_CONVERGENCE_THRESHOLD.check(code),
    message: NAMED_CHECK_CONVERGENCE_THRESHOLD.teachingPoint,
  },

  fan_in_pattern: {
    default: /Promise\.allSettled\s*\(/,
    message:
      'FAN_IN archetype: Promise.allSettled() is mandatory — Promise.all() aborts on first failure, breaking partial-source-failure tolerance',
  },

  degraded_terminal: {
    default: (code: string) => {
      const degradedFailure =
        /DataProcessResult\.failure\s*\(.*(?:SCORE|THRESHOLD|CONFIDENCE|LOW)/i;
      const pendingSuccess = /matchStatus.*pending|DataProcessResult\.success.*pending/i;
      if (degradedFailure.test(code) && !pendingSuccess.test(code)) return false;
      return true;
    },
    message:
      'CONVERGENCE: score below threshold is a business outcome, not an error. Use DataProcessResult.success({ matchStatus: "pending" }) — never failure()',
  },

  // ── FLOW-03: Event Management Platform ────────────────────────────────────

  atomic_capacity_operation: {
    default: (code: string) =>
      /registerAtomically|atomicRegist|db\.transaction.*capacity/i.test(code) &&
      !/getCapacity[\s\S]{0,80}register|checkCapacity[\s\S]{0,80}write/i.test(code),
    pg: (code: string) =>
      /pg_query[\s\S]{0,80}BEGIN|pg_query[\s\S]{0,80}COMMIT|FOR UPDATE/i.test(code) &&
      !/SELECT[\s\S]{0,80}capacity[\s\S]{0,200}INSERT/i.test(code),
    message:
      'T60 IR-1: Registration must be ONE atomic operation — separate check+write is a race condition',
  },

  null_capacity_is_unlimited: {
    default: (code: string) =>
      /capacity\s*!==\s*null|capacity\s*===\s*null/i.test(code) &&
      !/!capacity\s*\|\||!capacity\s*&&/i.test(code),
    message: 'T59 IR-2: capacity null means unlimited — use strict null check, not falsy check',
  },

  content_safety_before_promotion: {
    default: (code: string) => {
      const safetyIdx = code.search(/safety|contentCheck|moderat/i);
      const promoteIdx = code.search(/promote|distribute|broadcast.*event/i);
      return safetyIdx >= 0 && promoteIdx >= 0 && safetyIdx < promoteIdx;
    },
    message: 'T61 IR-2: Content safety check MUST run BEFORE promotion/distribution',
  },

  best_effort_try_catch_entire_handler: {
    default: (code: string) =>
      /try\s*\{[\s\S]*\}\s*catch\s*\([^)]*\)\s*\{[\s\S]*return\s+.*success/i.test(code),
    message:
      'T62 IR-4: Entire handler body must be in try/catch, catch returns DataProcessResult.success({ tracked: false })',
  },

  ttl_windowed_counter_pattern: {
    default: (code: string) =>
      /increment\s*\(|incr\s*\(/i.test(code) && /ttl|expire|TTL/i.test(code),
    message: 'T62 IR-1: Counter must use increment()+TTL — unbounded counters are not allowed',
  },

  freedom_config_threshold_scan: {
    default: (code: string) =>
      !/const\s+\w*(threshold|limit|ttl|rate|max)\w*\s*=\s*\d+/i.test(code) ||
      /config\.get|configService|freedomConfig|get_option/i.test(code),
    php: (code: string) =>
      !/\$\w*(threshold|limit|ttl|rate|max)\w*\s*=\s*\d+/i.test(code) ||
      /ini_get|get_option|apply_filters/i.test(code),
    message:
      'IR-3/IR-6: Threshold/limit/TTL values must come from FREEDOM config — not hardcoded constants',
  },

  // ── FLOW-05: Achievements & Gamification ──────────────────────────────────

  lifo_compensation_order: {
    default: (code: string) => {
      const revokePointsIdx = code.search(/revokePoints|deductPoints|removePoints/i);
      const revokeBadgesIdx = code.search(/revokeBadge|removeBadge|stripBadge/i);
      if (revokePointsIdx === -1 || revokeBadgesIdx === -1) return true;
      return revokePointsIdx < revokeBadgesIdx;
    },
    message:
      'COMPLETION compensation: revoke points BEFORE revoking badges (LIFO order — badge revocation depends on point state)',
  },

  evidence_payload_not_logged: {
    default: (code: string) =>
      !/logger\.(log|debug|warn|info)[\s\S]{0,50}evidencePayload/i.test(code),
    message: 'Evidence payload MUST NOT be logged — may contain PII; store reference only',
  },

  evidence_type_validation: {
    default: /VALID_EVIDENCE_TYPES|evidenceType[\s\S]{0,50}includes/i,
    message:
      'T67 IR-3: evidence type must be validated against VALID_EVIDENCE_TYPES before processing',
  },

  idempotent_completion: {
    default: /setIfAbsent|setnx|SETNX|idempotency/i,
    message:
      'COMPLETION archetype: duplicate completion with same userId+achievementId must return existing — SETNX pattern required',
  },

  config_driven_award: {
    default: (code: string) =>
      !/const\s+\w*(points|streak|badge|award|threshold)\w*\s*=\s*\d+/i.test(code) ||
      /config\.get|configService|freedomConfig/i.test(code),
    message:
      'T68/T69 IR-6: Award amounts, streak lengths, and thresholds must come from FREEDOM config — no hardcoded values',
  },

  broadcast_social_exact_match: {
    default: (code: string) =>
      /achievementType\s*===\s*|achievementType\s*switch|achievementType\s*includes/i.test(code) &&
      !/(any|unknown|Record<string)/i.test(code),
    message:
      'BROADCAST-SOCIAL: achievement type must be an exact discriminated match — no wildcard/catch-all dispatch',
  },

  typed_discriminated_payload: {
    default: /achievementType\s*:/,
    message:
      'T70 IR-1: Achievement payload must include discriminator field achievementType — flat untyped payload rejected',
  },

  // ── FLOW-06: Community Groups & Membership ────────────────────────────────

  dual_scope_isolation_tenant_and_group: {
    default: (code: string) => /tenantId/.test(code) && /groupId/.test(code),
    message:
      'MEMBERSHIP: data must be scoped by BOTH tenantId AND groupId — tenant-only scope leaks cross-group data',
  },

  role_hierarchy_no_self_promotion: {
    default: (code: string) => {
      const assignerRole = code.search(/assignerRole|requestingRole|callerRole/i);
      const targetRole = code.search(/targetRole|newRole|promoteTo/i);
      return !(assignerRole === -1 && targetRole !== -1);
    },
    message:
      'T71 IR-2: Role assignment must validate assignerRole >= targetRole — no self-promotion or lateral upgrade without admin',
  },

  admin_only_escalation: {
    default: /role.*admin|admin.*role|isAdmin|ADMIN/i,
    message:
      'T71: escalation to admin-tier roles requires an admin-level assignerRole — enforce before write',
  },

  invite_only_not_discoverable: {
    default: (code: string) =>
      !/discoverable.*true|isPublic.*true/i.test(code) || !/inviteOnly.*true/i.test(code),
    message:
      'T72 IR-3: invite-only groups must have discoverable=false — an invite-only group that is discoverable is a privacy violation',
  },

  engagement_score_clamped_0_to_1: {
    default: (code: string) =>
      /Math\.min\s*\(\s*1|Math\.max\s*\(\s*0|clamp\s*\(/i.test(code) ||
      /score\s*>=\s*0[\s\S]{0,20}score\s*<=\s*1/i.test(code),
    message: 'T73 IR-1: Engagement score must be clamped to [0,1] — raw sums can exceed 1.0',
  },

  engagement_weights_from_freedom_config: {
    default: (code: string) =>
      !/const\s+\w*(weight|coefficient|multiplier)\w*\s*=\s*0\.\d+/i.test(code) ||
      /config\.get|configService|freedomConfig/i.test(code),
    message:
      'T73 IR-2: Engagement weights/coefficients must come from FREEDOM config — no hardcoded 0.x constants',
  },

  conditional_side_effect_skip: {
    default: (code: string) =>
      /if\s*\([\s\S]{0,50}\)\s*\{[\s\S]{0,200}(return|skip|continue)/i.test(code) ||
      /sideEffect.*guard|guard.*sideEffect/i.test(code),
    message:
      'T74 IR-4: Side effects (notifications, external calls) must be conditionally guarded — always check gate condition before triggering',
  },

  // ── FLOW-04: Event Attendance & Management ─────────────────────────────────

  'attendance::capacity-atomicity': {
    default: /decrementAndCreate/,
    message:
      'T63 CF-802: atomic capacity decrement + create must be ONE operation — separate check-then-write creates oversell race condition',
  },

  'attendance::idempotent-rsvp': {
    default: /setnx|setIfAbsent/i,
    message:
      'T63: duplicate RSVP with same attendeeId must return existing RSVPConfirmed — no second write (SETNX pattern required)',
  },

  'attendance::waitlist-fairness': {
    default: (code: string) =>
      /joinTimestamp/.test(code) || /zadd.*score/i.test(code) || /sortedSet/i.test(code),
    message:
      'T64 CF-804: waitlist promotion order is FIFO by join timestamp — no priority override without tenant config',
  },

  'attendance::feedback-window-gate': {
    default: (code: string) => /EventEnded/.test(code) && /FeedbackWindowOpened/.test(code),
    message:
      'T66 CF-807: FeedbackWindowOpened must only emit after EventEnded is received — timer-based trigger is wrong',
  },

  // ── FLOW-07: Friend Request & Social Feed ─────────────────────────────────

  privacy_gate_before_emit: {
    default: (code: string) => {
      const privacyIdx = code.search(/privacyGatekeeper|PrivacyGatekeeper|T81|privacyCheck/i);
      const emitIdx = code.search(/enqueue|emit|FeedItemGenerated|FriendRequestSent/i);
      if (privacyIdx === -1) return true; // No explicit privacy gate needed — pass unless detected
      return privacyIdx < emitIdx;
    },
    message:
      'T73/T76: PrivacyGatekeeper (T81) must be invoked BEFORE emitting any social feed event',
  },

  two_phase_privacy_independent: {
    default: (code: string) =>
      !/T76.*already.*checked|skip.*T81.*T76.*passed|privacyAlreadyChecked/i.test(code),
    message:
      'T78 IR-3: T81 must be invoked independently at delivery — cannot skip because T76 already checked (privacy settings can change)',
  },

  social_graph_bidirectional_atomic: {
    default: (code: string) => {
      const transactionIdx = code.search(/transaction|atomically|ORM.*transaction/i);
      const bothEdges = /A.*B[\s\S]{0,200}B.*A|adjacency.*both|bidirectional.*atomic/i.test(code);
      return transactionIdx !== -1 || bothEdges;
    },
    message:
      'T75 IR-1: Both A→B and B→A adjacency edges must be written in ONE atomic ORM transaction — partial write is graph corruption',
  },

  connection_id_direction_independent: {
    default: /sort.*userIdA.*userIdB|sorted.*\[userIdA|hash.*sort|connectionId.*sorted/i,
    message:
      'T75 IR-2: connectionId must be hash(sorted([userIdA, userIdB]) + tenantId) — direction-independent to prevent duplicate connections',
  },

  feed_score_zero_passthrough: {
    default: (code: string) =>
      !/filter.*score\s*===\s*0|score\s*==\s*0.*filter|score\s*<=\s*0.*skip|drop.*score.*0/i.test(
        code,
      ),
    message:
      'T77 IR-1: score=0 items MUST pass through — zero score is lowest relevance, not filtered. T78 decides delivery.',
  },

  mutual_count_full_recompute: {
    default: (code: string) =>
      !/mutualCount\+\+|mutualCount--|incrementMutual|decrementMutual/i.test(code),
    message:
      'T80 IR-1: mutual connection count must be full recompute from graph — delta increment/decrement drifts under retries (BUILD_FAILURE)',
  },

  inline_only_no_event_pattern: {
    default: (code: string) => {
      const isT81 = /PrivacyGatekeeper|T81/i.test(code);
      if (!isT81) return true;
      return !/@EventPattern|@MessagePattern/i.test(code);
    },
    message:
      'T81 IR-1: PrivacyGatekeeper is INLINE_ONLY — must not have @EventPattern or @MessagePattern decorators',
  },

  // ── FLOW-08: Marketplace Listings & Catalog ───────────────────────────────

  audit_write_before_any_business_logic: {
    default: (code: string) => {
      const auditIdx = code.search(/audit.*write|auditSvc|F251|auditOutbox|IListingAuditService/i);
      const moderationIdx = code.search(/moderat|F249|IModerationService/i);
      const priceIdx = code.search(/price.*check|priceValid|F247/i);
      if (auditIdx === -1) return true; // No audit — pass (may not be T83)
      if (moderationIdx !== -1 && auditIdx > moderationIdx) return false;
      if (priceIdx !== -1 && auditIdx > priceIdx) return false;
      return true;
    },
    message:
      'T83 IR-1: Audit write (F251) must be FIRST — before moderation, price check, everything. Moderation before audit = BUILD_FAILURE',
  },

  moderation_failure_to_draft_not_failure: {
    default: (code: string) => {
      const hasModerationFail = /moderat.*fail|moderat.*reject|REJECTED.*moderat/i.test(code);
      if (!hasModerationFail) return true;
      const hasFailureReturn = /DataProcessResult\.failure[\s\S]{0,200}moderat/i.test(code);
      return !hasFailureReturn;
    },
    message:
      'T83 IR-2: Moderation failure must return DataProcessResult.success({ status: "DRAFT" }) — never failure(). Seller corrects and resubmits.',
  },

  zero_price_listing_valid: {
    default: (code: string) => {
      const hasPriceCheck = /price\s*[<>]=?\s*0|price\s*===?\s*0/i.test(code);
      if (!hasPriceCheck) return true;
      // reject on price <= 0 is wrong; only price < 0 should reject
      return !/price\s*<=\s*0.*reject|price\s*==\s*0.*reject|price\s*===\s*0.*fail/i.test(code);
    },
    message:
      'T83 IR-3: price=0 is a FREE listing — must be accepted. Only price < 0 should be rejected.',
  },

  listing_feed_count_only_payload: {
    default: (code: string) => {
      const hasFeedEvent = /ListingFeedGenerated|listing.*feed.*generated/i.test(code);
      if (!hasFeedEvent) return true;
      return !/listingId.*payload|ids.*ListingFeed|referenceId.*feed/i.test(code);
    },
    message:
      'T85 IR-1: ListingFeedGenerated payload must be { count: N } only — no listing IDs or reference IDs (PII boundary)',
  },

  conversion_rate_machine_formula: {
    default: (code: string) => {
      const hasConversionRate = /conversionRate/i.test(code);
      if (!hasConversionRate) return true;
      const hasFormula = /inquiries\s*\/\s*\(\s*views\s*\|\|\s*1\s*\)/i.test(code);
      const hasConfigLookup = /config\.get.*conversion|configService.*formula/i.test(code);
      return hasFormula && !hasConfigLookup;
    },
    message:
      'T86 IR-1: conversionRate = inquiries / (views || 1) — MACHINE formula, must be literal code. config.get("conversion_formula") = score-0.',
  },

  listing_analytics_aggregate_only: {
    default: (code: string) =>
      !/viewerIds\s*:|viewerIds\s*=\s*\[|userIds.*analytics|perUserHistory/i.test(code),
    message:
      'T86 IR-2: analytics must be aggregate counters only — no viewerIds array or per-user view history (data-retention violation)',
  },

  // ── FLOW-10: Reviews + Reputation ─────────────────────────────────────────

  cross_flow_eligibility_read_only: {
    default: (code: string) =>
      /eligibility.*GET_ONLY|accessPattern.*GET_ONLY|read.*only.*eligib/i.test(code),
    message:
      'Cross-flow eligibility check must be read-only GET; no side effects on ineligible path',
  },

  cross_flow_eligibility_before_audit: {
    default: (code: string) => {
      const auditIdx = code.search(/audit.*write|auditSvc\.write|storeDocument.*audit/i);
      const eligIdx = code.search(/eligib.*check|eligibilitySvc\.check|IReviewEligibilityService/i);
      // Pass if: eligibility reference not found, audit reference not found, OR eligibility appears before audit
      return eligIdx === -1 || auditIdx === -1 || eligIdx < auditIdx;
    },
    message:
      'Eligibility check must run BEFORE audit write; IR-1 violation if audit precedes eligibility',
  },

  uncertain_routes_to_human_not_rejected: {
    default: (code: string) => {
      const hasUncertain = /UNCERTAIN|uncertain/i.test(code);
      const hasHumanQueue = /humanQueue|PENDING_HUMAN_REVIEW|flagged.*human|human.*queue/i.test(
        code,
      );
      // Pass if no UNCERTAIN handling present, or if UNCERTAIN is paired with human-queue routing
      return !hasUncertain || hasHumanQueue;
    },
    message: 'UNCERTAIN moderation outcome must route to human queue, never auto-reject',
  },

  reputation_score_clamped_1_to_5: {
    default: (code: string) =>
      /clamp.*1.*5|Math\.min.*5.*Math\.max.*1|scoreRange.*1.*5/i.test(code),
    message: 'Reputation score must be clamped to [1.0, 5.0]; not normalized to [0, 1]',
  },

  retracted_review_excluded_from_aggregate: {
    default: (code: string) => /ReviewRetracted|retract.*remove|removeEvents/i.test(code),
    message: 'ReviewRetracted events must remove review from aggregate and trigger recalculation',
  },

  only_published_reviews_in_aggregate: {
    default: (code: string) => /status.*PUBLISHED|PUBLISHED.*filter|filterCondition/i.test(code),
    message: 'Only reviews with status PUBLISHED may contribute to reputation score',
  },

  conditional_revision_on_content_policy_only: {
    default: (code: string) =>
      /content_policy.*revision|revision.*content_policy|allowedFor.*content_policy/i.test(code),
    message:
      'One revision allowed for content_policy rejection only; not for not_owner or already_responded',
  },

  review_text_never_logged: {
    default: (code: string) =>
      !/console\.log.*review\.text|logger.*reviewText|log.*body\.text/i.test(code),
    message:
      'Review text content must not appear in logs; only reviewId, tenantId, rating may be logged',
  },

  // ── FLOW-12: Billing & Subscription Lifecycle ─────────────────────────────

  financial_op_idempotency: {
    default: (code: string): boolean => {
      // Detect financial operations
      const chargePattern = /\bcharge\b|\bpaymentFabric\b|\bprocessPayment\b|\bpay\b/;
      const chargeIdx = code.search(chargePattern);
      if (chargeIdx === -1) return true; // No charge call — check passes

      // Detect idempotency deduplication
      const idempotencyPattern = /setIfAbsent|setnx|SETNX/i;
      const idempotencyIdx = code.search(idempotencyPattern);
      if (idempotencyIdx === -1) return false; // Charge present but no idempotency

      return idempotencyIdx < chargeIdx; // Idempotency must precede charge
    },
    message:
      'Financial charge operations must be preceded by a setIfAbsent idempotency check (DNA-7). ' +
      'Distributed lock alone does not prevent re-execution on message retry.',
  },

  // ── FLOW-22: CMS Publishing Platform ──────────────────────────────────────

  pg_first_before_es_write: {
    default: (code: string) => {
      const pgIdx = code.search(/postRepository\.upsertPost|pgWrite|pgFirst/i);
      const esIdx = code.search(/esIndex|postSearchIndex\.indexPost/i);
      if (pgIdx === -1 || esIdx === -1) return true;
      return pgIdx < esIdx;
    },
    message:
      'CF-405, E3: PG write must precede ES index — use pgFirstSequential() pattern. ES is eventual consistency, never atomic with PG.',
  },

  etag_conflict_dataprocessresult_not_throw: {
    default: (code: string) =>
      !/throw\s+new\s+\w*Error[\s\S]{0,80}[Ee][Tt]ag|throw\s+new\s+\w*Exception[\s\S]{0,80}[Ee][Tt]ag/i.test(
        code,
      ),
    message:
      'CF-404, E7: ETag conflict must return DataProcessResult.failure, never throw an exception (DNA-3).',
  },

  schema_additive_only_no_removal: {
    default: /schemaAdditiveValidator|SCHEMA_ADDITIVE_VALIDATOR|validateChange\s*\(/i,
    message:
      'CF-407, CF-420, DD-192: T331 must call ISchemaAdditiveValidator.validateChange() before storing schema. Removal of fields is a breaking change and must be rejected.',
  },

  css_build_time_not_request_time: {
    default: (code: string) =>
      !/router\.(get|post|put|patch)\s*\([\s\S]{0,200}cssBuildService\.compile|cssBuildService\.compile[\s\S]{0,200}res\.(json|send)/i.test(
        code,
      ),
    message:
      'CF-411, DD-198: CSS must only be compiled in publish-pipeline context. Never call CssBuildService.compile() from HTTP request handlers.',
  },

  component_registry_append_only: {
    default: (code: string) => !/componentRegistry\.(update|delete|patch|put)\s*\(/i.test(code),
    message:
      'CF-403, DD-199: Component registry is append-only. Use registerVersion() — never update/delete/patch existing entries.',
  },

  ai_advisory_fire_and_suggest_only: {
    default: (code: string) => {
      const hasAiAdvisory = /aiAdvisory|AI_ADVISORY|advisoryService/i.test(code);
      if (!hasAiAdvisory) return true;
      // If there's an await on the AI advisory AND the response comes after it, it's blocking
      return !/await\s+[\w.]*[Aa]dvisory[\s\S]{0,100}return\s+DataProcessResult/i.test(code);
    },
    message:
      'CF-406, DD-200: AI advisory must be fire-and-suggest — do not await in response path. Response must return before AI completes.',
  },

  media_transform_from_original_only: {
    default: /isOriginal\s*===\s*true|sourceAsset\.isOriginal|originalAssetId/i,
    message:
      'CF-427, DD-201: Image transform source must be the original asset. Deriving variants from variants is forbidden.',
  },

  bfa_registration_before_activation: {
    default: (code: string) => {
      const bfaRegIdx = code.search(/bfaRegistration|BFA_REGISTRATION|registerWithBfa/i);
      const activateIdx = code.search(/activate|ACTIVATE|workspace.*active/i);
      if (bfaRegIdx === -1 || activateIdx === -1) return true;
      return bfaRegIdx < activateIdx;
    },
    message: 'CF-429, DD-203: BFA registration must complete before workspace activation attempt.',
  },

  publish_saga_compensation_dual_entry: {
    default: /executeCompensation[\s\S]{0,500}executeUserRollback|PUBLISH_ROLLBACK_EXECUTOR/i,
    message:
      'CF-412, E2: T338 PublishRollback must have BOTH executeCompensation (Entry A) and executeUserRollback (Entry B) paths.',
  },

  durable_timer_cancellable: {
    default: /DURABLE_TIMER_SERVICE|IDurableTimer|durableTimer\.cancel/i,
    message:
      'CF-409, E4: Scheduled publish must use IDurableTimer. cancel() must return success with alreadyFired:true for already-fired timers — never throw.',
  },

  ssg_immutable_build_artifacts: {
    default: (code: string) => !/publishArtifactStore\.(update|overwrite|put)\s*\(/i.test(code),
    message:
      'CF-428, CF-413: Publish artifact store is write-once (immutable). Never update or overwrite existing artifacts.',
  },

  design_token_deferral_queue: {
    default: /TOKEN_DEFERRAL_QUEUE|tokenDeferralQueue\.enqueueUpdate|ITokenDeferralQueue/i,
    message:
      'CF-402, E5: T341 must write token updates to ITokenDeferralQueue. Direct propagation is forbidden — drain happens exclusively in T336 Stage 5.',
  },

  workspace_id_equals_tenant_id: {
    default: (code: string) =>
      !/workspaceId\s*[!=]{1,2}=\s*tenantId\s*\|\||workspaceId\s*!==\s*['"]/i.test(code),
    message:
      'CF-415, DD-197: workspaceId in event data must equal tenantId from AsyncLocalStorage scope.',
  },

  sitemap_rss_build_artifact_only: {
    default: (code: string) =>
      !/router\.(get|post)\s*\([\s\S]{0,200}(sitemap|rss)[\s\S]{0,200}generate|(sitemap|rss).*generate[\s\S]{0,200}res\.(json|send)/i.test(
        code,
      ),
    message:
      'CF-414: Sitemap and RSS must only be generated in publish-pipeline context. Never generate on HTTP request.',
  },

  media_cdn_snapshot_required_before_rollback: {
    default: /CDN_SNAPSHOT_SERVICE|ICdnSnapshotService|captureCdnSnapshot|cdnSnapshotService/i,
    message:
      'CF-408: T336 Stage 2 must capture CDN snapshot before any build/deploy. Without snapshot, T338 rollback is permanently ineligible.',
  },

  // ── FLOW-23: Canvas Visual Editor ─────────────────────────────────────────

  step1_tenant_isolation: {
    default: (code: string, taskTypeId: string) => {
      // T360 must be the FIRST task type invoked in FLOW-23 DAG templates (70–75)
      if (taskTypeId === 'T360') return true; // T360 itself always passes
      // Other FLOW-23 tasks must not appear without T360 being declared first
      const flow23Tasks = [
        'T347',
        'T348',
        'T349',
        'T350',
        'T351',
        'T352',
        'T353',
        'T354',
        'T355',
        'T356',
        'T357',
        'T358',
        'T359',
        'T360',
        'T361',
        'T362',
        'T363',
        'T364',
        'T365',
        'T366',
      ];
      if (!flow23Tasks.includes(taskTypeId)) return true;
      return /TenantIsolationEnforcer|T360|tenantIsolation/i.test(code);
    },
    message:
      'CF-447: T360 (TenantIsolationEnforcer) must be nodes[0] in all FLOW-23 DAG templates (70–75). BUILD_FAILURE if violated.',
  },

  template_mode_readonly: {
    default: (code: string) => {
      const hasTemplateModeCtx = /templateCtx|ITemplateModeContext|TEMPLATE_MODE_CONTEXT/i.test(
        code,
      );
      if (!hasTemplateModeCtx) return true;
      // Must call verifyReadOnly — and must NOT inject write services
      const verifyReadOnly = /verifyReadOnly\s*\(/i.test(code);
      const hasWriter = /ICmsWriter|ICmsDataWriter|IDatabaseWriter|cmsWriter\./i.test(code);
      return verifyReadOnly && !hasWriter;
    },
    message:
      'CF-444: T357 must call verifyReadOnly() after entering template context. No write operations (ICmsWriter, storeDocument) permitted in READ-ONLY mode. DD-209.',
  },

  pure_computation_no_ai: {
    default: (code: string) => {
      // T349 and T354 must NOT inject AI_PROVIDER or call storeDocument
      const hasAi = /AI_PROVIDER|IAiProvider|ai\.generate|ai\.complete|ai\.enhance/i.test(code);
      const hasSideEffect = /storeDocument\s*\(|queue\.enqueue\s*\(/i.test(code);
      return !hasAi && !hasSideEffect;
    },
    message:
      'CF-433, CF-445: T349 (LayoutSolverInvoke) and T354 (GridColumnReflow) are PURE COMPUTATION. No AI injection. No storeDocument side effects.',
  },

  jsonpath_dynamic_binding: {
    default: (code: string) => {
      // No typed binding classes (DNA-1), and JSONPath must be validated
      const hasTypedModel =
        /class\s+CmsBindingTarget|interface\s+CmsBindingTarget|class\s+DataSlotDefinition|interface\s+DataSlotDefinition/i.test(
          code,
        );
      if (hasTypedModel) return false;
      // If binding service is used, validator must also be used
      const hasBindingService = /ICmsDataBindingService|setBinding\s*\(/i.test(code);
      if (!hasBindingService) return true;
      return /IDataBindingValidator|validator\.validate\s*\(/i.test(code);
    },
    message:
      'DNA-1, CF-435: T353/T356/T359 must use Record<string,unknown> — no typed binding models. JSONPath expressions must be validated via IDataBindingValidator before storing.',
  },

  cloudevents_mandatory: {
    default: (code: string) => {
      // Must not use direct queue.enqueue or EventEmitter2 for async events
      const hasDirectEmit =
        /queue\.enqueue\s*\(|eventEmitter\.emit\s*\(|new\s+EventEmitter\s*\(|this\.eventBus\.publish\s*\(/i.test(
          code,
        );
      if (hasDirectEmit) return false;
      // If async events present, must use cloudEvents.emit(createCloudEvent(
      const hasAsyncEvent = /async\s+.*emit|event.*type.*com\.xiigen/i.test(code);
      if (!hasAsyncEvent) return true;
      return /cloudEvents\.emit\s*\(\s*createCloudEvent\s*\(/i.test(code);
    },
    message:
      'CF-448: All FLOW-23 async events must use F969 ICloudEventsEnvelopeService via cloudEvents.emit(createCloudEvent(...)). Direct queue.enqueue() or EventEmitter2 is forbidden.',
  },

  code_export_af9_gate: {
    default: (code: string) => {
      // T363 must use EXPORT_QUALITY_THRESHOLD (0.8 fractional) — never integer 80
      const hasIntegerThreshold =
        /threshold\s*[>=!]{1,2}=?\s*80\b|80\s*[>=!]{1,2}=?\s*threshold/i.test(code);
      if (hasIntegerThreshold) return false;
      // quality.failed event must have deficit field
      const hasQualityFailed = /com\.xiigen\.code\.export\.quality\.failed/i.test(code);
      if (!hasQualityFailed) return true; // T363 may not have failed yet
      return /deficit\s*:/i.test(code);
    },
    message:
      'CF-446: T363 AF-9 quality threshold must be 0.8 fractional (EXPORT_QUALITY_THRESHOLD), never 80 integer. quality.failed event must include deficit field.',
  },

  ietf_idempotency_key: {
    default: (code: string) => {
      // Queue consumer services must inject and call idempotency.check() first
      const hasIdempotency =
        /IETF_IDEMPOTENCY_KEY_SERVICE|IIETFIdempotencyKeyService|idempotency\.check\s*\(/i.test(
          code,
        );
      // If the service handles queue messages, it must have idempotency
      const isQueueConsumer = /@EventPattern|onMessage\s*\(|processMessage\s*\(/i.test(code);
      if (!isQueueConsumer) return true;
      return hasIdempotency;
    },
    message:
      'CF-449, DNA-7: Queue consumers T361/T362/T363/T366 must inject F970 IETF_IDEMPOTENCY_KEY_SERVICE and call idempotency.check() before processing.',
  },

  role_from_auth_context_only: {
    default: (code: string) => {
      // T364 must not read role from request body/params/query
      const hasRoleInjection =
        /req\.body\.role|req\.params\.role|req\.query\.role|body\.role\b|params\.role\b/i.test(
          code,
        );
      if (hasRoleInjection) return false;
      // enforce() method must not accept role parameter
      const hasRoleParam = /enforce\s*\([^)]*,\s*[^)]*,\s*role[^)]*\)/i.test(code);
      return !hasRoleParam;
    },
    message:
      'DD-216, OWASP API1: T364 role MUST come from IPermissionContextReader.getRole() only. Never from req.body.role, params, query, or method parameter (privilege escalation vector).',
  },

  // ── FLOW-13: Data Warehouse & Retention ───────────────────────────────────

  irreversible_purge_requires_approval_token: {
    default: (code: string) =>
      !/purge|delete.*permanent|hardDelete/i.test(code) ||
      /approvalToken|APPROVAL_TOKEN|purgeApproval/i.test(code),
    message:
      'FLOW-13: Irreversible purge operations must carry an approval token — no purge without explicit approval gate.',
  },

  cross_flow_join_always_tenant_scoped: {
    default: (code: string) => !/join|JOIN/i.test(code) || /tenantId/.test(code),
    message:
      'FLOW-13: Cross-flow joins must always be tenant-scoped — cross-tenant data leak prevention.',
  },

  pii_masking_platform_only_before_serialization: {
    default: (code: string) => {
      const hasPii = /pii|PII|maskField|personalData/i.test(code);
      if (!hasPii) return true;
      const maskIdx = code.search(/mask|PII_MASK|piiMask/i);
      const serializeIdx = code.search(/serialize|JSON\.stringify|toJson|toDTO/i);
      return maskIdx === -1 || serializeIdx === -1 || maskIdx < serializeIdx;
    },
    message:
      'FLOW-13: PII masking must be applied by the platform layer before any serialization — never mask in application code after serialization.',
  },

  rls_platform_only_cannot_be_disabled: {
    default: (code: string) =>
      !/rls.*disable|disableRls|RLS.*false|rowLevelSecurity.*false/i.test(code),
    message:
      'FLOW-13: Row-level security is platform-enforced and must never be disabled — no RLS bypass in generated code.',
  },

  quota_check_before_warehouse_read: {
    default: (code: string) => {
      const quotaIdx = code.search(/quota|QUOTA|quotaCheck/i);
      const readIdx = code.search(/warehouseRead|warehouse\.read|queryWarehouse|executeQuery/i);
      return quotaIdx === -1 || readIdx === -1 || quotaIdx < readIdx;
    },
    message:
      'FLOW-13: Quota check must run before warehouse read — enforce quota gate before executing any warehouse query.',
  },

  backpressure_reject_on_queue_depth_exceeded: {
    default: (code: string) =>
      !/queueDepth|QUEUE_DEPTH|queue.*depth/i.test(code) ||
      /reject|REJECT|backpressure|BACKPRESSURE/i.test(code),
    message:
      'FLOW-13: Queue depth exceeded must result in explicit rejection — no silent drop or unbounded growth.',
  },

  schema_evolution_additive_auto_approved_breaking_needs_approval: {
    default: (code: string) => {
      const hasBreaking = /breakingChange|BREAKING|removeField|dropColumn/i.test(code);
      if (!hasBreaking) return true;
      return /approval|APPROVAL|approvalRequired/i.test(code);
    },
    message:
      'FLOW-13: Additive schema changes are auto-approved; breaking changes require explicit approval — enforce before schema store.',
  },

  legal_hold_cross_flow_blocks_purge: {
    default: (code: string) => {
      const purgeIdx = code.search(/purge|hardDelete|permanentDelete/i);
      if (purgeIdx === -1) return true;
      return /legalHold|LEGAL_HOLD|holdCheck/i.test(code);
    },
    message:
      'FLOW-13: Legal hold status must be checked across flows before any purge — active legal hold blocks purge unconditionally.',
  },

  tombstone_reference_not_raw_data_in_purge_event: {
    default: (code: string) => {
      const hasPurgeEvent = /purgeEvent|PURGE_EVENT|PurgeCompleted|purge.*emit|emit.*purge/i.test(
        code,
      );
      if (!hasPurgeEvent) return true;
      return !/rawData|originalData|fullRecord/i.test(code);
    },
    message:
      'FLOW-13: Purge events must carry tombstone references only — never include raw data in purge event payloads.',
  },

  batch_id_includes_time_window: {
    default: (code: string) =>
      !/batchId|BATCH_ID|batch_id/i.test(code) ||
      /timeWindow|TIME_WINDOW|startTime.*endTime|window.*start.*end/i.test(code),
    message:
      'FLOW-13: Batch IDs must include a time-window component — batchId must encode the processing window for idempotent replay.',
  },

  // ── FLOW-14: ETL / Data Integration ───────────────────────────────────────

  raw_zone_append_only_enforced: {
    default: (code: string) =>
      !/rawZone.*update|rawZone.*delete|update.*rawZone|delete.*rawZone/i.test(code),
    message:
      'FLOW-14: Raw zone is append-only — no update or delete operations permitted in the raw ingestion layer.',
  },

  rate_limit_check_before_external_call: {
    default: (code: string) => {
      const rateLimitIdx = code.search(/rateLimit|RATE_LIMIT|rateLimiter/i);
      const externalCallIdx = code.search(/fetch\s*\(|axios\.|http\.get|http\.post|externalApi/i);
      return rateLimitIdx === -1 || externalCallIdx === -1 || rateLimitIdx < externalCallIdx;
    },
    message:
      'FLOW-14: Rate limit check must precede any external API call — enforce throttle gate before outbound requests.',
  },

  hmac_timing_safe_comparison: {
    default: (code: string) =>
      !/hmac|HMAC|signature.*verify|verifySignature/i.test(code) ||
      /timingSafe|crypto\.timingSafeEqual|timingAttack/i.test(code),
    message:
      'FLOW-14: HMAC/signature verification must use timing-safe comparison — timing attack vector.',
  },

  cursor_monotonically_increasing: {
    default: (code: string) =>
      !/cursor|CURSOR|checkpoint/i.test(code) ||
      /monotonic|lastSeen|maxCursor|cursor.*>|cursor.*>=|advance.*cursor/i.test(code),
    message:
      'FLOW-14: ETL cursors must be monotonically increasing — no backward cursor advancement or cursor reset without explicit recovery flow.',
  },

  scd2_no_dimension_update: {
    default: (code: string) =>
      !/dimension.*update|UPDATE.*dimension|scd2.*update|update.*scd/i.test(code) ||
      /closeRecord|openNewVersion|validTo|effective.*date/i.test(code),
    message:
      'FLOW-14: SCD2 dimensions must never be updated in place — close the current record and insert a new version.',
  },

  pii_gate_before_mart_write: {
    default: (code: string) => {
      const piiIdx = code.search(/piiGate|PII_GATE|piiCheck|maskPii/i);
      const martIdx = code.search(/mart.*write|writeMart|datamart|data_mart/i);
      return piiIdx === -1 || martIdx === -1 || piiIdx < martIdx;
    },
    message:
      'FLOW-14: PII gate must run before any data mart write — enforce masking/exclusion before persistence in mart layer.',
  },

  reverse_etl_queue_fabric_only: {
    default: (code: string) =>
      !/reverseEtl|reverse_etl|REVERSE_ETL/i.test(code) ||
      /queueFabric|QUEUE_SERVICE|IQueueService|enqueue/i.test(code),
    message:
      'FLOW-14: Reverse ETL activation must use queue fabric only — no direct HTTP calls for reverse ETL delivery.',
  },

  cross_tenant_join_blocked: {
    default: (code: string) =>
      !/crossTenant|cross_tenant|CROSS_TENANT/i.test(code) ||
      /blocked|BLOCKED|reject|forbidden/i.test(code),
    message:
      'FLOW-14: Cross-tenant joins are unconditionally blocked — no data sharing across tenant boundaries.',
  },

  zone_promotion_order_enforced: {
    default: (code: string) => {
      const rawIdx = code.search(/rawZone|RAW_ZONE|raw_zone/i);
      const stageIdx = code.search(/stageZone|STAGE_ZONE|stage_zone|staging/i);
      const martIdx = code.search(/martZone|MART_ZONE|mart_zone|datamart/i);
      if (rawIdx === -1 || stageIdx === -1 || martIdx === -1) return true;
      return rawIdx < stageIdx && stageIdx < martIdx;
    },
    message:
      'FLOW-14: Zone promotion order must be raw → stage → mart — no skipping zones or promoting out of order.',
  },

  credentials_not_in_event_payload: {
    default: (code: string) =>
      !/password|secret|apiKey|api_key|token.*payload|payload.*token/i.test(code) ||
      /secretsFabric|SECRETS_SERVICE|ISecretsService/i.test(code),
    message:
      'FLOW-14: Credentials must not appear in event payloads — use secrets fabric reference only.',
  },

  // ── FLOW-15: Marketplace Extensions & Add-ons ─────────────────────────────

  oauth_pkce_per_exchange_verifier: {
    default: (code: string) =>
      !/oauth|OAuth|authorizationCode/i.test(code) ||
      /pkce|PKCE|codeVerifier|code_verifier/i.test(code),
    message:
      'FLOW-15: OAuth flows must use PKCE with a per-exchange code verifier — shared or static verifiers are a security violation.',
  },

  timing_safe_hmac_comparison: {
    default: (code: string) =>
      !/hmac|HMAC|webhook.*sign|sign.*webhook/i.test(code) ||
      /timingSafe|crypto\.timingSafeEqual/i.test(code),
    message:
      'FLOW-15: HMAC comparison must use timing-safe equality — prevents timing attack on webhook signature validation.',
  },

  circuit_breaker_state_from_event_log: {
    default: (code: string) =>
      !/circuitBreaker|circuit_breaker|CIRCUIT_BREAKER/i.test(code) ||
      /eventLog|EVENT_LOG|storeDocument|appendEvent/i.test(code),
    message:
      'FLOW-15: Circuit breaker state must be derived from event log — no in-memory-only circuit breaker state.',
  },

  dns_before_ssl_ordering: {
    default: (code: string) => {
      const dnsIdx = code.search(/dns|DNS|dnsRecord|customDomain/i);
      const sslIdx = code.search(/ssl|SSL|tls|TLS|certificate/i);
      return dnsIdx === -1 || sslIdx === -1 || dnsIdx < sslIdx;
    },
    message:
      'FLOW-15: DNS record provisioning must precede SSL certificate issuance — enforce ordering in domain activation flow.',
  },

  github_sync_cursor_postgresql_not_redis: {
    default: (code: string) =>
      !/githubSync|github_sync|GITHUB_SYNC/i.test(code) || !/redis|REDIS|RedisService/i.test(code),
    message:
      'FLOW-15: GitHub sync cursor must be stored in PostgreSQL, not Redis — Redis is ephemeral and cursor loss causes duplicate ingestion.',
  },

  byok_rotation_creates_new_version_not_overwrites: {
    default: (code: string) =>
      !/byok|BYOK|keyRotat|rotateKey/i.test(code) ||
      /newVersion|createVersion|versionId|keyVersion/i.test(code),
    message:
      'FLOW-15: BYOK key rotation must create a new key version — never overwrite the existing key.',
  },

  vault_isolation_flow15: {
    default: (code: string) =>
      !/vault|VAULT|secretVault/i.test(code) || /tenantId|tenant_id|tenantScope/i.test(code),
    message: 'FLOW-15: Vault access must be tenant-isolated — no cross-tenant secret access.',
  },

  silo_graduation_one_way: {
    default: (code: string) =>
      !/siloGraduate|silo.*graduate|SILO_GRADUATE/i.test(code) ||
      !/downgrade|DOWNGRADE|revert.*silo|silo.*revert/i.test(code),
    message:
      'FLOW-15: Silo graduation is a one-way promotion — no downgrade or reversion back to non-silo tier.',
  },

  // ── FLOW-16: Payments & Escrow ─────────────────────────────────────────────

  kyc_gating_required: {
    default: (code: string) => /kyc|KYC|kycCheck|kycGate/i.test(code),
    message:
      'FLOW-16: KYC gating is required for all payment flows — KYC check must be present before any money movement.',
  },

  buyer_kyc_no_bypass: {
    default: (code: string) => !/bypassBuyerKyc|skipBuyerKyc|buyerKyc.*false/i.test(code),
    message: 'FLOW-16: Buyer KYC must not be bypassed — no skip or disable of buyer KYC check.',
  },

  seller_kyc_no_bypass: {
    default: (code: string) => !/bypassSellerKyc|skipSellerKyc|sellerKyc.*false/i.test(code),
    message: 'FLOW-16: Seller KYC must not be bypassed — no skip or disable of seller KYC check.',
  },

  t221_requires_ep5_and_dna9: {
    default: (code: string) =>
      !/T221|escrowRelease/i.test(code) ||
      (/EP5|ep5/.test(code) && /createCloudEvent|DNA9|CloudEvent/i.test(code)),
    message:
      'FLOW-16: T221 escrow release requires EP5 event pattern and DNA-9 CloudEvents envelope — both must be present.',
  },

  t221_compensation_lifo: {
    default: (code: string) => {
      const hasT221 = /T221|escrowRelease/i.test(code);
      if (!hasT221) return true;
      const releaseIdx = code.search(/releaseFunds|releaseEscrow/i);
      const notifyIdx = code.search(/notifyBuyer|notifySeller/i);
      return releaseIdx === -1 || notifyIdx === -1 || releaseIdx < notifyIdx;
    },
    message:
      'FLOW-16: T221 compensation must follow LIFO order — fund release before notification on rollback.',
  },

  t221_s5_no_compensation: {
    default: (code: string) => !/T221.*S5.*compensat|S5.*T221.*compensat/i.test(code),
    message:
      'FLOW-16: T221 stage S5 has no compensation path — once S5 completes, rollback is not possible.',
  },

  dispute_triggers_synchronous_payout_freeze: {
    default: (code: string) => {
      const disputeIdx = code.search(/dispute|DISPUTE|DisputeOpened/i);
      const freezeIdx = code.search(/freeze|FREEZE|payoutFreeze|freezePayout/i);
      return (
        disputeIdx === -1 ||
        freezeIdx === -1 ||
        (disputeIdx < freezeIdx && /await/.test(code.slice(disputeIdx, freezeIdx + 50)))
      );
    },
    message:
      'FLOW-16: Dispute opening must synchronously freeze payout — payout freeze must be awaited before dispute confirmation.',
  },

  dispute_no_auto_resolve: {
    default: (code: string) =>
      !/autoResolve|auto_resolve|AUTO_RESOLVE|dispute.*autoClose/i.test(code),
    message:
      'FLOW-16: Disputes must not be auto-resolved — human review is required for all dispute resolution.',
  },

  payment_capture_requires_auth: {
    default: (code: string) => {
      const captureIdx = code.search(/capturePayment|CAPTURE|paymentCapture/i);
      if (captureIdx === -1) return true;
      return /auth|AUTH|authorization|authorizePayment/i.test(code.slice(0, captureIdx + 50));
    },
    message:
      'FLOW-16: Payment capture must be preceded by authorization — no capture without prior auth step.',
  },

  payout_hold_notification_synchronous: {
    default: (code: string) => {
      const holdIdx = code.search(/payoutHold|holdPayout|PAYOUT_HOLD/i);
      const notifyIdx = code.search(/notifySeller|sellerNotif|notify.*hold/i);
      if (holdIdx === -1 || notifyIdx === -1) return true;
      return holdIdx < notifyIdx && /await/.test(code.slice(holdIdx, notifyIdx + 50));
    },
    message:
      'FLOW-16: Payout hold notification must be synchronous — seller must be notified synchronously when payout is held.',
  },

  payout_requires_seller_kyc: {
    default: (code: string) => {
      const payoutIdx = code.search(/payout|PAYOUT|disbursement/i);
      if (payoutIdx === -1) return true;
      return /sellerKyc|KYC.*seller|kycStatus/i.test(code);
    },
    message:
      'FLOW-16: Payout requires verified seller KYC — no disbursement without confirmed seller KYC status.',
  },

  t226_no_published_filter: {
    default: (code: string) =>
      !/T226/i.test(code) || !/published.*filter|filterPublished|status.*published/i.test(code),
    message:
      'FLOW-16: T226 must not apply published filter — T226 operates on all records regardless of published status.',
  },

  t226_no_f234_import: {
    default: (code: string) => !/T226/i.test(code) || !/F234|import.*F234/i.test(code),
    message:
      'FLOW-16: T226 must not import from F234 — circular dependency between T226 and F234 is forbidden.',
  },

  t226_read_only_topology: {
    default: (code: string) => !/T226/i.test(code) || !/storeDocument|enqueue|emit/i.test(code),
    message:
      'FLOW-16: T226 is read-only topology — no writes or event emissions permitted from T226.',
  },

  // ── FLOW-17: Contract & IP Management ─────────────────────────────────────

  ep2_server_triggered: {
    default: (code: string) =>
      !/EP2|ep2/i.test(code) || !/client.*trigger|trigger.*client|userAction.*trigger/i.test(code),
    message: 'FLOW-17: EP2 events must be server-triggered only — no client-initiated EP2 events.',
  },

  screenshot_external_ref_only: {
    default: (code: string) =>
      !/screenshot|SCREENSHOT/i.test(code) ||
      !/inline|base64|Buffer.*screenshot|screenshot.*Buffer/i.test(code),
    message:
      'FLOW-17: Screenshots must be stored as external references only — no inline base64 or buffer in event payloads.',
  },

  activity_counts_numeric_only: {
    default: (code: string) =>
      !/activityCount|activity_count|ACTIVITY_COUNT/i.test(code) ||
      !/string.*count|count.*string|toString.*count/i.test(code),
    message: 'FLOW-17: Activity counts must be numeric only — no string coercion of count fields.',
  },

  escrow_lifo_order: {
    default: (code: string) => {
      const hasEscrow = /escrow|ESCROW/i.test(code);
      if (!hasEscrow) return true;
      const releaseIdx = code.search(/releaseEscrow|escrowRelease/i);
      const closeIdx = code.search(/closeContract|contractClose/i);
      return releaseIdx === -1 || closeIdx === -1 || releaseIdx < closeIdx;
    },
    message:
      'FLOW-17: Escrow operations must follow LIFO order — release funds before closing contract on compensation.',
  },

  append_only_ledger: {
    default: (code: string) =>
      !/ledger.*update|update.*ledger|ledger.*delete|delete.*ledger/i.test(code),
    message: 'FLOW-17: Ledger is append-only — no updates or deletes on ledger records.',
  },

  atomic_pg_transaction: {
    default: (code: string) =>
      !/pgTransaction|pg.*transaction|db\.transaction/i.test(code) ||
      /BEGIN|COMMIT|ROLLBACK|transaction\s*\(/i.test(code),
    message:
      'FLOW-17: PostgreSQL operations that must be atomic must use explicit transactions — no implicit auto-commit for multi-step writes.',
  },

  escrow_idempotency_key_on_all_money_ops: {
    default: (code: string) => {
      const hasMoneyOp = /escrow|payout|charge|transfer|ESCROW|PAYOUT/i.test(code);
      if (!hasMoneyOp) return true;
      return /idempotencyKey|idempotency_key|IDEMPOTENCY_KEY/i.test(code);
    },
    message:
      'FLOW-17: All money operations must carry an idempotency key — prevents duplicate financial transactions on retry.',
  },

  db_unique_idempotency: {
    default: (code: string) =>
      !/idempotencyKey|idempotency_key/i.test(code) ||
      /UNIQUE|uniqueConstraint|unique.*index|ON CONFLICT/i.test(code),
    message:
      'FLOW-17: Idempotency key uniqueness must be enforced at the database level — application-layer check alone is insufficient.',
  },

  immutable_after_submit: {
    default: (code: string) => !/submitted.*update|update.*submitted|SUBMITTED.*write/i.test(code),
    message:
      'FLOW-17: Records become immutable after submission — no updates permitted once status is SUBMITTED.',
  },

  ip_transfer_immutable_after_certified: {
    default: (code: string) => !/certified.*update|update.*certified|CERTIFIED.*write/i.test(code),
    message:
      'FLOW-17: IP transfer records are immutable after certification — no modifications after CERTIFIED status.',
  },

  derived_never_stored: {
    default: (code: string) =>
      !/storeDocument.*derived|derived.*storeDocument|store.*derivedField/i.test(code),
    message: 'FLOW-17: Derived fields must never be stored — compute on read, not on write.',
  },

  // ── FLOW-20: Real-time & Streaming ────────────────────────────────────────

  consent_blocking_pipeline_gate: {
    default: (code: string) => {
      const consentIdx = code.search(/consent|CONSENT|consentGate/i);
      const pipelineIdx = code.search(/pipeline|PIPELINE|processStream/i);
      return consentIdx === -1 || pipelineIdx === -1 || consentIdx < pipelineIdx;
    },
    message:
      'FLOW-20: Consent check must gate pipeline entry — no data processing without verified consent.',
  },

  redis_only_no_pg: {
    default: (code: string) =>
      !/realtime|REALTIME|streamState/i.test(code) ||
      !/pg\.|postgres|PostgreSQL|storeDocument/i.test(code),
    message:
      'FLOW-20: Real-time stream state must use Redis only — no PostgreSQL writes in the hot path.',
  },

  pci_no_raw_pan: {
    default: (code: string) =>
      !/pan\b|PAN\b|cardNumber|card_number|rawCard/i.test(code) ||
      /token|TOKEN|vaultToken|panToken/i.test(code),
    message:
      'FLOW-20: Raw PAN must never appear in code — use tokenized PAN reference only (PCI DSS).',
  },

  political_dual_gate_both_ai_and_human: {
    default: (code: string) =>
      !/political|POLITICAL|sensitiveContent/i.test(code) ||
      (/ai.*gate|AI.*gate|aiCheck/i.test(code) &&
        /human.*gate|human.*review|humanQueue/i.test(code)),
    message:
      'FLOW-20: Political content requires dual gate — both AI and human review must be present.',
  },

  fraud_before_billing_ordering: {
    default: (code: string) => {
      const fraudIdx = code.search(/fraud|FRAUD|fraudCheck/i);
      const billingIdx = code.search(/billing|BILLING|charge|processPayment/i);
      return fraudIdx === -1 || billingIdx === -1 || fraudIdx < billingIdx;
    },
    message:
      'FLOW-20: Fraud check must precede billing — enforce fraud gate before any charge operation.',
  },

  spend_ledger_append_only: {
    default: (code: string) =>
      !/spendLedger.*update|update.*spendLedger|spendLedger.*delete/i.test(code),
    message:
      'FLOW-20: Spend ledger is append-only — no updates or deletes on spend ledger entries.',
  },

  webhook_hmac_mandatory: {
    default: (code: string) =>
      !/webhook|WEBHOOK/i.test(code) || /hmac|HMAC|webhookSecret|signature/i.test(code),
    message:
      'FLOW-20: Webhook delivery must include HMAC signature — no unsigned webhook payloads.',
  },

  per_field_auth_every_request: {
    default: (code: string) =>
      !/fieldAuth|field.*auth|perField/i.test(code) ||
      /everyRequest|perRequest|request.*auth|authCheck/i.test(code),
    message:
      'FLOW-20: Per-field authorization must be checked on every request — no caching of field-level auth decisions.',
  },

  tenant_edge_resolver_no_user_header: {
    default: (code: string) =>
      !/tenantEdge|TENANT_EDGE|edgeResolver/i.test(code) ||
      !/req\.headers.*tenant|header.*tenantId|x-tenant-id/i.test(code),
    message:
      'FLOW-20: Tenant edge resolver must not read tenant from user-supplied header — resolve from auth context only.',
  },

  conservative_multi_model_take_lower: {
    default: (code: string) =>
      !/multiModel|MULTI_MODEL|modelEnsemble/i.test(code) ||
      /Math\.min|lowerScore|takeLower|conservative/i.test(code),
    message:
      'FLOW-20: Multi-model scoring must use the conservative (lower) score — never average or take the higher score.',
  },

  // ── FLOW-24: Learning & Content Delivery ──────────────────────────────────

  safety_gate_token_protocol: {
    default: (code: string) =>
      !/safetyGate|SAFETY_GATE|safetyToken/i.test(code) ||
      /token.*protocol|safetyToken|SAFETY_TOKEN/i.test(code),
    message:
      'FLOW-24: Safety gate must use token protocol — no safety gate bypass without valid safety token.',
  },

  content_safety_scan_mandatory: {
    default: (code: string) => /contentSafety|CONTENT_SAFETY|safetyScan|scanContent/i.test(code),
    message:
      'FLOW-24: Content safety scan is mandatory — every content item must pass safety scan before delivery.',
  },

  consent_blocks_all_downstream: {
    default: (code: string) => {
      const consentIdx = code.search(/consent|CONSENT/i);
      const downstreamIdx = code.search(/downstream|publish|deliver|emit/i);
      return consentIdx === -1 || downstreamIdx === -1 || consentIdx < downstreamIdx;
    },
    message:
      'FLOW-24: Consent check must block all downstream processing — no content delivery without confirmed consent.',
  },

  safety_compose_gate_publish_order: {
    default: (code: string) => {
      const safetyIdx = code.search(/safetyGate|SAFETY_GATE|safetyCheck/i);
      const composeIdx = code.search(/compose|COMPOSE|assemble/i);
      const publishIdx = code.search(/publish|PUBLISH|deliver/i);
      if (safetyIdx === -1 || composeIdx === -1 || publishIdx === -1) return true;
      return safetyIdx < composeIdx && composeIdx < publishIdx;
    },
    message:
      'FLOW-24: Execution order must be safety gate → compose → publish — no deviation from this ordering.',
  },

  server_side_only_grading: {
    default: (code: string) =>
      !/client.*grade|grade.*client|frontend.*grade|grade.*frontend/i.test(code),
    message:
      'FLOW-24: Grading must be server-side only — no client-side grade computation or submission.',
  },

  streak_timezone_from_profile_not_client: {
    default: (code: string) =>
      !/streak|STREAK/i.test(code) ||
      !/req\.body.*timezone|req\.query.*timezone|client.*timezone/i.test(code),
    message:
      'FLOW-24: Streak timezone must come from user profile — never accept timezone from client request.',
  },

  gamification_ledger_append_only: {
    default: (code: string) =>
      !/gamification.*ledger.*update|gamification.*ledger.*delete|update.*gamification.*ledger/i.test(
        code,
      ),
    message:
      'FLOW-24: Gamification ledger is append-only — no updates or deletes on gamification ledger entries.',
  },

  calendar_fabric_connectors_only: {
    default: (code: string) =>
      !/calendar|CALENDAR|calendarEvent/i.test(code) ||
      !/google.*calendar.*direct|outlook.*direct|ical.*fetch.*direct/i.test(code),
    message:
      'FLOW-24: Calendar integration must use fabric connectors only — no direct Google Calendar, Outlook, or iCal API calls.',
  },

  // ── FLOW-18: Visual Flow Creation & Code Injection Engine ─────────────────

  /** GAP-18-1 / CF-302: DNA 9/9 mandatory — any violation = score-0 */
  dna_9_of_9_mandatory: {
    default: (code: string) =>
      !/throw\s+new\s+\w*Error|throw\s+new\s+\w*Exception/i.test(code) &&
      /DataProcessResult\.(success|failure)/i.test(code) &&
      !/import\s+\{.*\}\s+from\s+['"]@elastic|import\s+\{.*\}\s+from\s+['"]elasticsearch/i.test(
        code,
      ),
    message:
      'CF-302: DNA mandatory — generated code must pass all 9 DNA patterns. Violations found.',
  },

  /** GAP-18-2a / CF-310 CRITICAL: Sandbox isolation — no production resource references */
  sandbox_isolation_check: {
    default: (code: string) =>
      !/production|prod_db|PRODUCTION|\.env\.prod/i.test(code) &&
      /sandbox|isolated|test_db|SANDBOX/i.test(code),
    message:
      'CF-310 CRITICAL: Sandbox code references production resources — complete isolation required.',
  },

  /** GAP-18-2b / CF-314: Sandbox cannot call external APIs */
  sandbox_no_external_apis: {
    default: (code: string) =>
      !/fetch\s*\(\s*['"]https?:\/\/(?!localhost|127\.0\.0\.1)/i.test(code),
    message:
      'CF-314: Sandbox cannot call external APIs — network access to external URLs is forbidden.',
  },

  /** GAP-18-2c / CF-312: Sandbox execution timeout enforced */
  sandbox_timeout_enforced: {
    default: (code: string) => /timeout|TIMEOUT|maxExecution|AbortController/i.test(code),
    message: 'CF-312: Sandbox execution timeout not enforced — timeout/AbortController required.',
  },

  /** GAP-18-3a / CF-307: Feature flag required for code injection */
  feature_flag_required: {
    default: (code: string) =>
      /featureFlag|feature_flag|isEnabled|FF_|IFeatureFlagService|FEATURE_FLAG_SERVICE/i.test(code),
    message: 'CF-307: Code injection must be behind a feature flag — IFeatureFlagService required.',
  },

  /** GAP-18-3b / CF-306: Rollback capability must be present */
  rollback_capability_present: {
    default: (code: string) =>
      /rollback|revert|previousVersion|IRollbackService|ICodeInjectorService|CODE_INJECTOR_SERVICE/i.test(
        code,
      ),
    message: 'CF-306/CF-318: Injection must be reversible — no rollback path found.',
  },

  /** GAP-18-4 / CF-321: CRDT determinism — no Math.random() or Date.now() near merge/resolve */
  crdt_deterministic: {
    default: (code: string) => {
      const hasDeterministicMarker =
        /deterministic|idempotent.*merge|vector.*clock|vectorClock|lamport/i.test(code);
      const mergeBlock =
        code
          .match(/merge|resolve|transform/gi)
          ?.map((m) => {
            const i = code.indexOf(m);
            return code.substring(i, i + 200);
          })
          .join('') ?? '';
      const hasNonDeterminism = /Math\.random|Date\.now\(\)|uuid\.generate/i.test(mergeBlock);
      return hasDeterministicMarker && !hasNonDeterminism;
    },
    message:
      'CF-321: OT/CRDT resolution must be deterministic — no Math.random/Date.now in merge/resolve path.',
  },

  /** GAP-18-5 / CF-315: Staged promotion order — sandbox→staging→production, no skip */
  staged_promotion_order: {
    default: (code: string) =>
      /sandbox.*staging.*production|STAGES\s*=\s*\[|promotion.*sequence|promotionStage/i.test(
        code,
      ) && !/skip.*stage|promote.*directly.*production|bypass.*staging/i.test(code),
    message: 'CF-315: Promotion must follow sandbox→staging→production — no stage skip allowed.',
  },

  /** GAP-18-6 / CF-328 CRITICAL: BFA import registration on fork */
  bfa_import_registration: {
    default: (code: string) =>
      /registerFactories|IBFAAutoRegistryService|BFA_AUTO_REGISTRY_SERVICE|registerAll.*bfa|bfaAutoReg/i.test(
        code,
      ),
    message:
      'CF-328 CRITICAL: ALL factories from imported flow must register in BFA — IBFAAutoRegistryService required.',
  },

  /** GAP-18-7 / V11: Optimistic rollback path for T248 node.add.failed */
  optimistic_rollback_on_fail: {
    default: (code: string) =>
      /node\.add\.failed|rollback|remove.*placeholder|optimistic.*undo|undoOptimistic/i.test(code),
    message:
      'V11: Optimistic NodeAddRequested must handle node.add.failed rollback — remove placeholder on failure.',
  },

  // ── FLOW-32: Sharable Flows & RAG Template Marketplace ────────────────────

  /** GAP-32-01 / CF-715 BUILD_FAILURE: T518 tripartite supply chain signing */
  supply_chain_tripartite_signing: {
    default: (code: string) =>
      /F1416|IArtifactSigningService|ARTIFACT_SIGNING_SERVICE/i.test(code) &&
      /F1417|ISBOMGeneratorService|SBOM_GENERATOR_SERVICE/i.test(code) &&
      /F1418|ISLSAAttestationService|SLSA_ATTESTATION_SERVICE/i.test(code),
    message:
      'CF-715 BUILD_FAILURE: T518 must reference all three supply chain factories: F1416 (signing), F1417 (SBOM), F1418 (SLSA). Missing any one blocks artifact.signed.',
  },

  /** GAP-32-03 / CF-718 / DD-323: Logic/data plane separation for T528/T529/T530 */
  logic_data_plane_separation: {
    default: (code: string) =>
      !/embedding|embeddings|indexedContent|rawData|vectorStore\.get|vectors\b|vectorPayload|tenantDocument|knowledgeBase\.export|indexSnapshot|bulkExportIndex/i.test(
        code,
      ),
    message:
      'CF-718 / DD-323: Data-plane term detected in blueprint sharing task type. RAG blueprints must contain logic only (DAGs, prompts, schemas) — no embeddings or tenant data.',
  },

  /** GAP-32-03 / CF-718 / DD-323: Logic/data plane separation for T522 install */
  logic_data_plane_install_only: {
    default: (code: string) =>
      !/copyDocuments|migrateData|copyEmbeddings|transferDocuments|bulkCopyIndex|indexMigration|copyIndex|replicateData|cloneIndex|syncDocuments/i.test(
        code,
      ),
    message:
      'CF-718 / DD-323: Data copy operation detected in T522 install. Logic transfer only (DAG, prompts, config, factory bindings).',
  },

  /** GAP-32-04 / CF-726 / DD-327: Secret-ref indirection for T523 binding documents */
  secret_ref_indirection: {
    default: (code: string) =>
      !/password\s*=|apiKey\s*=|token\s*=|secret\s*=|privateKey\s*=/i.test(code) &&
      /secretRef|vaultRef|ISecretsService|SECRETS_SERVICE/i.test(code),
    message:
      'CF-726 / DD-327: Literal secret value in T523 — must use secretRef/vaultRef via ISecretsService.',
  },

  /** GAP-32-05 / CF-734 / ST-451: Integer arithmetic for T532 settlement */
  integer_arithmetic_settlement: {
    default: (code: string) =>
      !/parseFloat\s*\(|\.toFixed\s*\(|Number\.parseFloat/i.test(code) &&
      /BigInt|bigint/i.test(code),
    message:
      'CF-734 / ST-451: Float arithmetic in T532 settlement — use BigInt integer cents. parseFloat/toFixed prohibited.',
  },

  /** GAP-32-06 / CF-736 / ST-454: Fraud signals require human review via F1403 */
  fraud_human_review_required: {
    default: (code: string) =>
      !/autoSuspend|auto_ban|autoBan|immediate_action|immediateAction|suspendAccount\s*\(|banTenant\s*\(|disableAccount\s*\(|revokeAccess\s*\(|terminateAccount\s*\(/i.test(
        code,
      ) &&
      /F1403|IHumanReviewService|HUMAN_REVIEW_SERVICE|humanReview|createReviewCase/i.test(code),
    message:
      'CF-736 / ST-454: Automated account action in T534 — route all fraud signals to human review via F1403 (IHumanReviewService).',
  },

  /** GAP-32-07 / CF-729: T526 must iterate ALL consumers, no sampling */
  bfa_revalidation_all_consumers: {
    default: (code: string) =>
      !/\.sample\s*\(|\.subset\s*\(|\.limit\s*\(|\.take\s*\(|getConsumers\s*\(\s*\{.*limit/i.test(
        code,
      ) &&
      /allConsumers|ALL_CONSUMERS|DEGRADED_LOCAL_FALLBACK|getAllFlows\s*\(|getAllConsumers\s*\(/i.test(
        code,
      ),
    message:
      'CF-729: Consumer iteration sampling in T526 — all-consumer iteration required. Use DEGRADED_LOCAL_FALLBACK when FLOW-25 is absent.',
  },

  // ── ATTENDANCE archetype checks (CHK-01, CHK-02) ──────────────────────────

  /**
   * CHK-01: dual_entry_routing_pattern
   *
   * ATTENDANCE services must have two distinct queue consumer entry points:
   *   1. Initial entry consumer — handles a new attendance/queue request.
   *      Writes the initial record via storeDocument() before enqueueing (Outbox, DNA-8).
   *   2. Re-entry consumer — handles a position re-check after a wait period.
   *      Must also use storeDocument() before any state transition enqueue.
   *
   * If BOTH consumers are absent: severity = 'score-0' (auto-fail, code unusable).
   * If only ONE is present: partial credit, but flag in validation result.
   *
   * Detection heuristic: two separate @EventPattern (or equivalent) decorators,
   * where one matches an "initial" event name and the other matches a "recheck"
   * or "position-check" event name.
   */
  dual_entry_routing_pattern: {
    default: (code: string, taskTypeId: string) => {
      // Only applies to ATTENDANCE task types — pass through for all others
      if (
        taskTypeId !== 'ATTENDANCE' &&
        !/attendance|queue.*position|position.*queue/i.test(code)
      ) {
        return true;
      }
      // Require two @EventPattern decorators (initial + re-entry)
      const eventPatterns = (code.match(/@EventPattern\s*\(/g) ?? []).length;
      if (eventPatterns >= 2) return true;
      // Also accept two MessagePattern / @On decorators as provider variants
      const messagePatterns = (code.match(/@MessagePattern\s*\(/g) ?? []).length;
      return messagePatterns >= 2;
    },
    'action-scheduler': (code: string, taskTypeId: string) => {
      if (taskTypeId !== 'ATTENDANCE' && !/attendance|queue.*position/i.test(code)) return true;
      // WordPress: two add_action() calls for initial + re-check hooks
      const actionHooks = (code.match(/add_action\s*\(/g) ?? []).length;
      return actionHooks >= 2;
    },
    message:
      'CHK-01: ATTENDANCE service missing dual entry points — needs both initial-request consumer and re-entry consumer (Outbox pattern on both)',
  },

  /**
   * CHK-02: fifo_sorted_set_pattern
   *
   * ATTENDANCE services must use IScopedMemoryService sorted-set operations for
   * FIFO queue ordering — NOT raw Redis/ioredis calls. Three specific method names
   * are required to confirm the fabric interface is used correctly:
   *
   *   sortedSetAdd        — (ZADD) enqueue a request with a score (timestamp or priority)
   *   sortedSetRangeByScore — (ZRANGEBYSCORE) fetch the next N members in FIFO order
   *   sortedSetRemove     — (ZREM) dequeue a processed member
   *
   * Presence of raw Redis commands (zadd, zrangebyscore, zrem) is a violation.
   * Raw commands indicate the service imported ioredis directly — Rule 1 violation (CF-791).
   *
   * Depends on R6: IScopedMemoryService must expose these three methods.
   */
  fifo_sorted_set_pattern: {
    default: (code: string, taskTypeId: string) => {
      // Only applies to ATTENDANCE task types
      if (
        taskTypeId !== 'ATTENDANCE' &&
        !/attendance|queue.*position|position.*queue/i.test(code)
      ) {
        return true;
      }
      // Must use IScopedMemoryService sorted-set methods
      const usesSortedSetAdd = /sortedSetAdd\s*\(/.test(code);
      const usesSortedSetRange = /sortedSetRangeByScore\s*\(/.test(code);
      const usesSortedSetRemove = /sortedSetRemove\s*\(/.test(code);
      // Must NOT use raw Redis commands
      const hasRawZadd = /\bthis\.\w*\.(zadd|ZADD)\s*\(/.test(code);
      const hasRawZrange = /\bthis\.\w*\.(zrangebyscore|ZRANGEBYSCORE)\s*\(/.test(code);
      const hasRawZrem = /\bthis\.\w*\.(zrem|ZREM)\s*\(/.test(code);

      if (hasRawZadd || hasRawZrange || hasRawZrem) return false; // raw Redis — violation

      return usesSortedSetAdd && usesSortedSetRange && usesSortedSetRemove;
    },
    'action-scheduler': (code: string, taskTypeId: string) => {
      if (taskTypeId !== 'ATTENDANCE' && !/attendance|queue.*position/i.test(code)) return true;
      // WordPress: no Redis sorted sets available — FIFO via DB table with ORDER BY
      // Accept if using $wpdb->insert with a position/order column
      return (
        /\$wpdb.*insert|\$wpdb.*query/i.test(code) && /position|queue_order|fifo_order/i.test(code)
      );
    },
    message:
      'CHK-02: ATTENDANCE service must use IScopedMemoryService.sortedSetAdd/RangeByScore/Remove — not raw Redis zadd/zrangebyscore/zrem (Fabric First, CF-791)',
  },

  // ── AGGREGATION archetype (CHK-03) ────────────────────────────────────────

  /**
   * CHK-03: time_window_bounded_aggregation
   *
   * AGGREGATION services must use a time-windowed range query to aggregate within
   * a bounded time window. Without time bounding, aggregation runs across all data —
   * producing unbounded queries that grow in cost and can return stale data permanently.
   * No error is thrown; the engine just produces wrong output (SILENT_FAILURE).
   */
  time_window_bounded_aggregation: {
    default: (code: string) =>
      /rangeByScore|zrangebyscore|range_by_score/i.test(code) &&
      /now\s*[-–]\s*\w*[Ww]indow|Date\.now\(\)\s*-|new Date\(\).*[-–]|startOf\s*\(/i.test(code),
    message:
      'AGGREGATION archetype requires a time-windowed range query ' +
      '(rangeByScore with min=now-window). ' +
      'Unbounded aggregation will read full dataset on every call.',
  },

  // ── FLOW-34 adapter checks (N3, N4) ──────────────────────────────────────

  /**
   * N3: queue_fabric_only_adapter
   *
   * IR-THIN-2: Adapter code must NOT make direct HTTP calls to Mode A (xiigen backend).
   * Platform SDK HTTP calls (Canva, Figma, etc.) are ALLOWED.
   * Direct calls to localhost:PORT/api/ or xiigen.*.com/api/ are PROHIBITED.
   *
   * Detection:
   *  - Mode A endpoint URL patterns (localhost/127.0.0.1/xiigen.*) → always violation
   *  - HTTP client usage (axios, fetch, HttpClient) without allowed SDK import → violation
   *  - HTTP client + allowed SDK import but Mode A URL inline → violation
   */
  queue_fabric_only_adapter: {
    default: (code: string) => {
      // Only applies to adapter task types — pass through for others
      if (
        !/adapter|T-ADAPTER|AdapterCode|AdapterValid|AdapterPackag/i.test(code) &&
        !/AdapterDataReady|AdapterGenerat|queue_fabric_only/i.test(code)
      ) {
        return true;
      }
      // Mode A endpoint patterns — always a violation regardless of SDK context
      const modeAPatterns = [
        /localhost:[0-9]+\/api\//i,
        /xiigen[.-].*\.com\/api\//i,
        /127\.0\.0\.1:[0-9]+\/api\//i,
      ];
      for (const pattern of modeAPatterns) {
        if (pattern.test(code)) return false;
      }
      // Allowed platform SDK packages — HTTP calls from these are OK
      const allowedPkgs = [
        '@canva',
        '@figma',
        'canva-sdk',
        'figma-sdk',
        'miro-web-sdk',
        'framer-motion',
        'webflow-sdk',
        'shopify-api',
        'wp-api',
        'chrome-extension',
        'vscode-extension',
        'notion-sdk',
        'slack-sdk',
        'n8n-nodes-base',
      ];
      const hasAllowedSDK = allowedPkgs.some((pkg) => {
        const escaped = pkg.replace('/', '\\/');
        return (
          new RegExp(`from ['"]${escaped}`, 'i').test(code) ||
          new RegExp(`require\\(['"]${escaped}`, 'i').test(code)
        );
      });
      if (hasAllowedSDK) return true; // SDK import present — Mode A checked above
      // No allowed SDK — any HTTP client usage is suspicious
      const httpClientPatterns = [
        /\baxios\.(get|post|put|patch|delete)\s*\(/,
        /\bfetch\s*\(\s*['"]/,
        /\bnew\s+XMLHttpRequest\s*\(/,
        /\bhttp\.(get|post|request)\s*\(/,
        /\bhttps\.(get|post|request)\s*\(/,
        /\bnew\s+HttpClient\s*\(/,
        /\bnew\s+HttpService\s*\(/,
      ];
      for (const pattern of httpClientPatterns) {
        if (pattern.test(code)) return false;
      }
      return true;
    },
    message:
      'N3 / IR-THIN-2: Adapter must not make direct HTTP calls to Mode A (xiigen backend). ' +
      'Use queue.publish() for inter-service communication. Platform SDK calls are allowed.',
  },

  /**
   * N4: no_secrets_in_adapter
   *
   * IR-THIN-3: No secret values (passwords, API keys, tokens, credentials) may appear
   * as literals in adapter code or manifests. Reference-only patterns (ISecretsService,
   * secretRef, secretKey, vaultRef) are ALLOWED.
   *
   * Detection: 6 secret literal patterns scanned. Score-0 on any violation.
   */
  no_secrets_in_adapter: {
    default: (code: string) => {
      // Only applies to adapter task types — pass through for others
      if (
        !/adapter|T-ADAPTER|AdapterCode|AdapterValid|AdapterPackag/i.test(code) &&
        !/no_secrets_in_adapter|IR-THIN-3/i.test(code)
      ) {
        return true;
      }
      const secretPatterns = [
        /password\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /apiKey\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /api_key\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /secret\s*[:=]\s*['"`][^'"`]+['"`]/gi,
        /token\s*[:=]\s*['"`][A-Za-z0-9\-_.]{8,}['"`]/gi,
        /Bearer\s+[A-Za-z0-9\-_.]{16,}/gi,
      ];
      for (const pattern of secretPatterns) {
        if (pattern.test(code)) return false;
      }
      return true;
    },
    message:
      'N4 / IR-THIN-3 (CF-[+7]): Adapter contains secret literal values. ' +
      'Replace with ISecretsService.get({ key }) calls at runtime. ' +
      'Use secretRef/secretKey/vaultRef for reference names only.',
  },

  // ── ADAPTATION archetype (GAP-ENG-02 / GAP-ARCH-01) ──────────────────────
  // Applied when generated code is for FLOW-41/42/43/44 platform adapters.
  // Enforced in addition to shared iron-rules checks above.

  adaptation_no_platform_calls: {
    default: (code) => !/figma\.|webflow\.\w+\(|framer\.\w+\(|miro\.\w+\(/.test(code),
    message:
      'CF-796: ADAPTATION adapter must not call non-target platform APIs (figma.*, webflow.*, framer.*, miro.*) — only the declared target SDK is allowed',
  },

  adaptation_pipeline_unchanged: {
    // Convention check: pipeline files must be copied unchanged.
    // We detect violation if pipeline file functions are re-declared in adapter code.
    default: (code) =>
      !/function\s+buildLayerParams|function\s+buildFills|function\s+buildStrokes/.test(code),
    message:
      'CF-797/CF-798: Pipeline files (styles.ts, element-code.ts) must be copied unchanged — do not re-implement pipeline functions in the adapter file',
  },
};

// ── FLOW-34 exported adapter validation utilities ───────────────────────────

/** 14 allowed platform SDK packages — HTTP calls from these do not trigger N3 violation. */
export const ALLOWED_PLATFORM_PACKAGES = [
  'canva-sdk',
  'figma-sdk',
  '@canva',
  '@figma',
  'miro-web-sdk',
  'framer-motion',
  'webflow-sdk',
  'shopify-api',
  'wp-api',
  'chrome-extension',
  'vscode-extension',
  'notion-sdk',
  'slack-sdk',
  'n8n-nodes-base',
] as const;

/** Mode A (xiigen backend) endpoint detection patterns. */
export const MODE_A_ENDPOINT_PATTERNS: RegExp[] = [
  /localhost:[0-9]+\/api\//i,
  /xiigen[.-].*\.com\/api\//i,
  /127\.0\.0\.1:[0-9]+\/api\//i,
];

/** HTTP client usage patterns that are suspicious without an allowed SDK import. */
export const HTTP_CLIENT_PATTERNS: RegExp[] = [
  /\baxios\.(get|post|put|patch|delete)\s*\(/,
  /\bfetch\s*\(\s*['"]/,
  /\bnew\s+XMLHttpRequest\s*\(/,
  /\bhttp\.(get|post|request)\s*\(/,
  /\bhttps\.(get|post|request)\s*\(/,
  /\bnew\s+HttpClient\s*\(/,
  /\bnew\s+HttpService\s*\(/,
];

/**
 * N3 (IR-THIN-2): Check that adapter code does not make direct HTTP calls to Mode A.
 * Platform SDK HTTP calls are ALLOWED. Mode A backend calls are PROHIBITED.
 *
 * @param adapterCode - The TypeScript source code of the generated adapter
 * @returns Object with passed flag and list of violations found
 */
export function checkQueueFabricOnly(adapterCode: string): {
  passed: boolean;
  violations: string[];
} {
  const violations: string[] = [];

  // Step 1: Check for Mode A endpoint URLs directly in code
  for (const pattern of MODE_A_ENDPOINT_PATTERNS) {
    if (pattern.test(adapterCode)) {
      violations.push(`Mode A endpoint URL found: pattern ${pattern}`);
    }
  }

  // Step 2: Check for HTTP client usage WITHOUT allowed platform SDK context
  const hasAllowedSDKImport = ALLOWED_PLATFORM_PACKAGES.some((pkg) => {
    const escaped = pkg.replace('/', '\\/');
    return (
      new RegExp(`from ['"]${escaped}`, 'i').test(adapterCode) ||
      new RegExp(`require\\(['"]${escaped}`, 'i').test(adapterCode)
    );
  });

  if (!hasAllowedSDKImport) {
    for (const pattern of HTTP_CLIENT_PATTERNS) {
      if (pattern.test(adapterCode)) {
        violations.push(
          `HTTP client usage found without allowed platform SDK import: ${pattern}. ` +
            `Use queue.publish() for inter-service communication.`,
        );
      }
    }
  }

  // Step 3: Even with allowed SDK import, direct Mode A calls are violations
  if (hasAllowedSDKImport) {
    const combinedModeACheck = new RegExp(
      MODE_A_ENDPOINT_PATTERNS.map((p) => p.source).join('|'),
      'gi',
    );
    if (combinedModeACheck.test(adapterCode)) {
      violations.push(
        `Mode A endpoint URL found even within allowed SDK context. ` +
          `Platform SDK adapters must not call xiigen backend directly.`,
      );
    }
  }

  return { passed: violations.length === 0, violations };
}

/**
 * N4 (IR-THIN-3): Scan adapter manifest JSON for secret literal values.
 *
 * @param manifest - The parsed adapter manifest object
 * @returns List of violation strings found (empty = no violations)
 */
export function scanManifestForSecrets(manifest: Record<string, unknown>): string[] {
  const violations: string[] = [];
  const manifestStr = JSON.stringify(manifest);

  const manifestSecretPatterns = [
    /["']password["']\s*:\s*["'][^"']{4,}["']/gi,
    /["']apiKey["']\s*:\s*["'][^"']{8,}["']/gi,
    /["']secret["']\s*:\s*["'][^"']{4,}["']/gi,
    /["']token["']\s*:\s*["'][A-Za-z0-9\-_.]{8,}["']/gi,
  ];

  for (const pattern of manifestSecretPatterns) {
    const matches = manifestStr.match(pattern);
    if (matches) violations.push(...matches.slice(0, 2));
  }

  return violations;
}

@Injectable()
export class ValidateHandler implements INodeHandler {
  readonly nodeType = 'validate';
  private readonly logger = new Logger(ValidateHandler.name);

  constructor(
    @Inject(DATABASE_SERVICE) private readonly db: IDatabaseService,
    private readonly namedCheckRegistry: NamedCheckRegistry,
  ) {}

  /**
   * Z-3.1: Select the best check variant for the current run context.
   *
   * Iterates ctx.resolvedProviders values and returns the first provider
   * variant that exists on the CheckDefinition. Falls back to `default`.
   *
   * NEVER reads by stack label — only by resolved provider id.
   */
  private selectCheckVariant(checkId: string, ctx: NodeHandlerContext): CheckVariant | null {
    const def = NAMED_CHECKS[checkId];
    if (!def) return null;

    const resolvedProviders = ctx.resolvedProviders ?? {};

    // Walk resolved providers — first match wins
    for (const providerKey of Object.values(resolvedProviders)) {
      if (
        providerKey &&
        typeof def[providerKey] !== 'undefined' &&
        providerKey !== 'default' &&
        providerKey !== 'message'
      ) {
        const variant = def[providerKey] as CheckVariant;
        this.logger.debug(`Check '${checkId}' using provider variant '${providerKey}'`);
        return variant;
      }
    }

    this.logger.debug(`Check '${checkId}' using default variant`);
    return def.default;
  }

  /**
   * Run a CheckVariant against generated code.
   */
  private runVariant(variant: CheckVariant, code: string, taskTypeId: string): boolean {
    if (variant instanceof RegExp) return variant.test(code);
    return variant(code, taskTypeId);
  }

  /**
   * Z-1.3: Pre-generation gate — check mechanism compatibility.
   *
   * Blocks generation when the priority server entry is INCOMPATIBLE.
   * If an INCOMPATIBLE entry has implementationNotes (suggests a fabric interface
   * could abstract this), logs a warning to reclassify to IMPL_VARIES.
   *
   * CF-790: INCOMPATIBLE tier blocks generation without mitigation path.
   */
  private checkMechanismCompatibility(sc: TaskTypeStackCoupling | undefined): {
    blocked: boolean;
    reason?: string;
    suggestedInterface?: string;
  } {
    if (!sc?.entries) return { blocked: false };

    const serverEntry = sc.entries[PRIORITY_SERVER_KEY];
    if (!serverEntry) return { blocked: false };

    if (serverEntry.tier === 'INCOMPATIBLE' || serverEntry.incompatible === true) {
      const suggestedInterface = serverEntry.mitigation;
      if (serverEntry.implementationNotes) {
        // Has implementation notes — may be misclassified
        this.logger.warn(
          `INCOMPATIBLE verdict on priority server entry but implementationNotes exists. ` +
            `Consider reclassifying to IMPL_VARIES. Notes: ${serverEntry.implementationNotes}`,
        );
      }
      return {
        blocked: true,
        reason:
          `Mechanism is INCOMPATIBLE with the current runtime. ` +
          (serverEntry.incompatibleReason ??
            'No fabric interface provides a compatible implementation.'),
        suggestedInterface,
      };
    }

    return { blocked: false };
  }

  /**
   * K7 — Cross-task-type validation (GAP-NEW-24 / R6).
   *
   * Validates that a target task type's generated code satisfies a cross-task
   * named check registered on the source contract. Used for T280/T281 sole-gate
   * enforcement (DR-112). Called from Phase D AF-9 with allGeneratedCode map.
   *
   * @param contract  The engine contract that declares crossTaskValidations[]
   * @param allGeneratedCode  Map of taskTypeId → generated code string
   */
  async validateCrossTask(
    contract: Record<string, unknown>,
    allGeneratedCode: Map<string, string>,
  ): Promise<{ pass: boolean; reason?: string; checkId?: string; targetTaskId?: string }> {
    const crossChecks =
      (contract['crossTaskValidations'] as Array<Record<string, string>> | undefined) ?? [];

    if (crossChecks.length === 0) {
      return { pass: true };
    }

    for (const check of crossChecks) {
      const targetTaskId = check['targetTaskId'];
      const evaluatorName = check['evaluator'];
      const targetCode = allGeneratedCode.get(targetTaskId);

      if (!targetCode) {
        // Target task type not yet generated — defer this check
        this.logger.warn(`Cross-task check deferred: ${targetTaskId} not in allGeneratedCode`);
        continue;
      }

      const evaluator = this.namedCheckRegistry.get(evaluatorName);
      if (!evaluator) {
        this.logger.warn(`Cross-task evaluator not found: ${evaluatorName}`);
        continue;
      }

      const result = evaluator(targetCode, contract);
      if (!result.pass) {
        return {
          pass: false,
          reason: `Cross-task check '${evaluatorName}' failed for ${targetTaskId}: ${result.reason}`,
          checkId: evaluatorName,
          targetTaskId,
        };
      }
    }

    return { pass: true };
  }

  async handle(ctx: NodeHandlerContext): Promise<DataProcessResult<NodeHandlerResult>> {
    const { contract, taskTypeId, priorOutputs } = ctx;

    // Z-1.3: INCOMPATIBLE gate — runs before named checks (CF-790)
    const compatCheck = this.checkMechanismCompatibility(
      contract.stackCoupling as unknown as TaskTypeStackCoupling | undefined,
    );
    if (compatCheck.blocked) {
      this.logger.warn(`GENERATION_BLOCKED for ${taskTypeId}: ${compatCheck.reason}`);
      return DataProcessResult.failure(
        'GENERATION_BLOCKED',
        JSON.stringify({
          reason: compatCheck.reason,
          suggestedInterface: compatCheck.suggestedInterface ?? null,
        }),
      );
    }

    const generateOutput = priorOutputs.find((o) => o.nodeType === 'ai-generate');
    const generatedCode = String(generateOutput?.data?.['generatedCode'] ?? '');

    if (!generatedCode) {
      return DataProcessResult.failure('VALIDATE_NO_CODE', 'No generated code to validate');
    }

    const results: CheckResult[] = [];

    // Load arbiter check IDs for this task type from xiigen-arbiters
    const arbiterResult = await this.db.searchDocuments(ES_INDEX.ARBITERS, { taskTypeId });
    const arbiters = arbiterResult.isSuccess ? (arbiterResult.data ?? []) : [];

    // Run named checks referenced by arbiters
    for (const arbiter of arbiters) {
      const checkId = String(arbiter['checkId'] ?? '');
      const def = NAMED_CHECKS[checkId];
      if (def) {
        const variant = this.selectCheckVariant(checkId, ctx);
        if (variant) {
          const passed = this.runVariant(variant, generatedCode, taskTypeId);
          results.push({
            checkId,
            passed,
            message: passed ? undefined : (def.message ?? `${checkId} failed`),
          });
          this.logger.debug(`Check ${checkId}: ${passed ? 'PASS' : 'FAIL'}`);
        }
      } else {
        // GAP-NEW-24: Fall through to NamedCheckRegistry for flow-specific checks
        const evaluator = this.namedCheckRegistry.get(checkId);
        if (evaluator) {
          const result = evaluator(generatedCode, contract as unknown as Record<string, unknown>);
          results.push({
            checkId,
            passed: result.pass,
            message: result.pass ? undefined : (result.reason ?? `${checkId} failed`),
          });
          this.logger.debug(`Registry check ${checkId}: ${result.pass ? 'PASS' : 'FAIL'}`);
        }
      }
    }

    // Also run checks from ironRulesStructured if present
    if (contract.ironRulesStructured) {
      for (const rule of contract.ironRulesStructured) {
        const already = results.find((r) => r.checkId === rule.check);
        if (already) continue;

        if (rule.check && NAMED_CHECKS[rule.check]) {
          const def = NAMED_CHECKS[rule.check];
          const variant = this.selectCheckVariant(rule.check, ctx);
          if (variant) {
            const passed = this.runVariant(variant, generatedCode, taskTypeId);
            results.push({
              checkId: rule.check,
              passed,
              message: passed ? undefined : def.message,
            });
          }
        } else if (rule.check && this.namedCheckRegistry.has(rule.check)) {
          // GAP-NEW-24: Also check NamedCheckRegistry for ironRulesStructured checks
          const evaluator = this.namedCheckRegistry.get(rule.check);
          if (evaluator) {
            const result = evaluator(generatedCode, contract as unknown as Record<string, unknown>);
            results.push({
              checkId: rule.check,
              passed: result.pass,
              message: result.pass ? undefined : (result.reason ?? `${rule.check} failed`),
            });
          }
        }
      }
    }

    const failures = results.filter((r) => !r.passed);
    const passed = failures.length === 0;

    this.logger.debug(
      `Validate ${taskTypeId}: ${results.length} checks, ${failures.length} failures`,
    );

    return DataProcessResult.success({
      data: {
        passed,
        checkResults: results,
        failureCount: failures.length,
        failures: failures.map((f) => f.checkId),
      },
    });
  }
}
