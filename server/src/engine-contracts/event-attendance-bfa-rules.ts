/**
 * FLOW-04: Event Attendance & Management
 * BFA rules: CF-04-1, CF-04-2, CF-04-3, CF-04-4
 *
 * CF-04-1: decrementAndCreate() is ONE atomic operation (CF-802).
 *          Separate read-check-write creates race condition: two concurrent reads of
 *          capacity=1 both proceed → capacity=-1 (oversell). No atomic wrapper = BUILD_FAILURE.
 * CF-04-2: Waitlist promotion order is FIFO by joinTimestamp (MACHINE, CF-804).
 *          Priority overrides only via flow04_waitlist_priority_rules FREEDOM key.
 *          Hardcoded priority logic violates fairness invariant silently.
 * CF-04-3: T66 FeedbackWindowController triggers on event.ended CloudEvent ONLY — no timer (CF-807).
 *          A timer fires at a pre-configured time regardless of whether the event actually ended.
 *          Timer-based feedback windows arrive mid-event if the event runs long.
 * CF-04-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32)
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_04_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-04-1',
    flowId: 'FLOW-04',
    type: 'ATOMICITY_CONSTRAINT',
    description:
      'T63 RSVP creation MUST use one atomic decrementAndCreate() operation — not a separate read-check-write sequence. Separate steps create a race condition at the capacity boundary: two concurrent reads of capacity=1 → two writes → capacity=-1 (oversell).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-04-2',
    flowId: 'FLOW-04',
    type: 'MACHINE_CONSTANT',
    description:
      'T64 waitlist promotion order is FIFO by joinTimestamp (MACHINE). Priority overrides require flow04_waitlist_priority_rules FREEDOM key. Hardcoded priority logic (VIP first, etc.) violates the fairness invariant and is a CF-804 violation.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-04-3',
    flowId: 'FLOW-04',
    type: 'ORDERING_CONSTRAINT',
    description:
      'T66 FeedbackWindowController MUST trigger on event.ended CloudEvent — never on a timer or scheduler (CF-807). A timer fires at a pre-configured time regardless of actual event status. Timer-based feedback arrives mid-event if the event runs long.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-863..CF-866) — edge-case coverage from docs/flow-coverage/event-attendance/P10-server-specs.md
  {
    ruleId: 'CF-863',
    flowId: 'FLOW-04',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/event-attendance — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-864',
    flowId: 'FLOW-04',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-865',
    flowId: 'FLOW-04',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-866',
    flowId: 'FLOW-04',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-04-4 is always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-04-4',
    flowId: 'FLOW-04',
    type: 'SCOPE_ISOLATION',
    description: 'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526)',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
