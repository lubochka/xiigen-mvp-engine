/**
 * FLOW-08: Event Participation & Purchase History
 * BFA rules: CF-08-1, CF-08-2, CF-08-3, CF-08-4
 *
 * CF-08-1: BROKER_ACK_GATE — T67 ParticipationInviter MUST emit InvitationBatchQueued
 *          after broker ACK — not after delivery confirmation. Delivery to individual
 *          users may be async/partial. Gate on definite state (broker ACK = committed
 *          to queue), not probabilistic delivery.
 *
 * CF-08-2: BUSINESS_KEY_IDEMPOTENCY — T68 RegistrationProcessor idempotency key MUST
 *          be hash(userId + eventId + tenantId). requestId is not a valid idempotency
 *          key — it changes on retry. Business key (userId+eventId+tenantId) is stable
 *          across retries.
 *
 * CF-08-3: DATABASE_FABRIC_FOR_COUNTER — Bootstrap gate batch-ack counter MUST use
 *          DATABASE FABRIC — not SCOPED_MEMORY. SCOPED_MEMORY resets on process
 *          restart, causing bootstrap gate to never fire after a crash. DATABASE
 *          FABRIC persists across restarts. (R2 correction.)
 *
 * CF-08-4: scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526).
 *          Participation, registration, purchase, and batch queue records are PRIVATE
 *          per-tenant.
 */

import { MASTER_TENANT_ID } from '../bootstrap/bootstrap-seeder.service';

export const FLOW_08_BFA_RULES: Array<Record<string, unknown>> = [
  {
    ruleId: 'CF-08-1',
    flowId: 'FLOW-08',
    type: 'BROKER_ACK_GATE',
    description:
      'T67 ParticipationInviter MUST emit InvitationBatchQueued after broker ACK — not after delivery confirmation. ' +
      'Delivery to individual users may be async/partial. ' +
      'Gate on definite state (broker ACK = committed to queue), not probabilistic delivery.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-08-2',
    flowId: 'FLOW-08',
    type: 'BUSINESS_KEY_IDEMPOTENCY',
    description:
      'T68 RegistrationProcessor idempotency key MUST be hash(userId + eventId + tenantId). ' +
      'requestId is not a valid idempotency key — it changes on retry. ' +
      'Business key (userId+eventId+tenantId) is stable across retries.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-08-3',
    flowId: 'FLOW-08',
    type: 'DATABASE_FABRIC_FOR_COUNTER',
    description:
      'Bootstrap gate batch-ack counter MUST use DATABASE FABRIC — not SCOPED_MEMORY. ' +
      'SCOPED_MEMORY resets on process restart, causing bootstrap gate to never fire after a crash. ' +
      'DATABASE FABRIC persists across restarts.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // P11 (CF-895..CF-902) — edge-case coverage from docs/flow-coverage/marketplace/P10-server-specs.md
  {
    ruleId: 'CF-895',
    flowId: 'FLOW-08',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-5 Optimistic concurrency on POST /api/dynamic/marketplace — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-896',
    flowId: 'FLOW-08',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-6 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-897',
    flowId: 'FLOW-08',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-8 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-898',
    flowId: 'FLOW-08',
    type: 'DNA8_ORDERING',
    description:
      'EC-9 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-899',
    flowId: 'FLOW-08',
    type: 'CONCURRENCY_CONSTRAINT',
    description:
      'EC-10 Optimistic concurrency on POST /api/dynamic/marketplace — winner 201, loser 409 {code:CONCURRENT_UPDATE}. Client retries (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-900',
    flowId: 'FLOW-08',
    type: 'IDEMPOTENCY_CONSTRAINT',
    description:
      'EC-11 X-Idempotency-Key replay — first call 201+stores; retries return 200 cached response; no duplicate side effects (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-901',
    flowId: 'FLOW-08',
    type: 'ORDERING_CONSTRAINT',
    description:
      'EC-13 Boundary validation — empty/null/zero primary field → 400 {code:VALIDATION_FAILED, details:[{field,reason}]}; no partial write (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  {
    ruleId: 'CF-902',
    flowId: 'FLOW-08',
    type: 'DNA8_ORDERING',
    description:
      'EC-14 Fabric timeout — 504 {code:TIMEOUT, retryAfterMs}; outbox row retained; queue consumer retries deduplicatively (DNA-8) (P11).',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
  // CF-08-4: always scope_isolation — FC-32 — do not omit
  {
    ruleId: 'CF-08-4',
    flowId: 'FLOW-08',
    type: 'SCOPE_ISOLATION',
    description:
      'scope_isolation arbiter present in all arbiterConfig blocks (FC-32 / SK-526). ' +
      'Participation records PRIVATE. Purchase history PRIVATE. ' +
      'Registration records PRIVATE. Batch queue records PRIVATE per-tenant.',
    violationSeverity: 'BUILD_FAILURE',
    connectionType: 'FLOW_SCOPED',
    knowledgeScope: 'GLOBAL',
    tenantId: MASTER_TENANT_ID,
  },
];
